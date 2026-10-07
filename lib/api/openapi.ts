import { z } from 'zod';
import type { Endpoint } from './contract';
import { ENDPOINTS, TAGS } from './contracts';
import { SESSION_COOKIE } from '@/lib/auth/session';

/**
 * /api/v1 as an OpenAPI 3.0 document, generated from the zod contracts in
 * lib/api/contracts.ts — never written by hand. Served at
 * /api/v1/openapi.json and turned into the /api-docs page by
 * scripts/build-api-docs.ts (APIDoc, as in shd_onelink).
 */

type JsonSchema = Record<string, unknown>;

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

function toSchema(schema: z.ZodType, io: 'input' | 'output'): JsonSchema {
  return z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io,
    unrepresentable: 'any',
    override: ({ jsonSchema }) => {
      // z.int() adds the safe-integer bounds to every integer; they are noise in docs.
      if (jsonSchema.maximum === MAX_SAFE) delete jsonSchema.maximum;
      if (jsonSchema.minimum === -MAX_SAFE) delete jsonSchema.minimum;
    },
  }) as JsonSchema;
}

/** `{ in: 'query', name, schema, required, description }` for every field of an object schema. */
function parameters(schema: z.ZodObject | undefined, location: 'path' | 'query') {
  if (!schema) return [];
  const json = toSchema(schema, 'input') as { properties?: Record<string, JsonSchema>; required?: string[] };
  const required = new Set(json.required ?? []);
  return Object.entries(json.properties ?? {}).map(([name, property]) => {
    const { description, ...rest } = property as { description?: string };
    return {
      name,
      in: location,
      required: location === 'path' || required.has(name),
      ...(description ? { description } : {}),
      schema: rest,
    };
  });
}

const ERROR = toSchema(
  z.object({
    error: z.object({
      code: z.string().meta({ example: 'not_found' }),
      message: z.string(),
      issues: z
        .array(z.object({ path: z.string(), message: z.string() }))
        .optional()
        .meta({ description: 'On a 400 from validation: each field and what is wrong with it.' }),
    }),
  }),
  'output',
);

/** The error responses every endpoint of a kind can give. */
function standardErrors(endpoint: Endpoint): Record<number, string> {
  const errors: Record<number, string> = {};
  if (endpoint.params || endpoint.query || endpoint.body) errors[400] = 'The input is not valid; `issues` says where.';
  if (endpoint.auth === 'admin') {
    errors[401] = 'Not signed in (no valid session cookie).';
    errors[403] = endpoint.permission
      ? `Signed in, without \`${endpoint.permission}\` permission.`
      : 'Signed in, without access to the admin.';
    errors[503] = 'The central permission system did not answer, or sign-in (SSO) is not set up in production.';
  }
  if (endpoint.auth === 'invitee') {
    errors[401] = 'Not signed in.';
    errors[403] = 'Signed in as someone who is not on this link.';
    errors[409] = 'Already sent through this link.';
    errors[410] = 'The link expired or was switched off.';
  }
  if (endpoint.params) errors[404] = 'Not found.';
  return errors;
}

function operation(endpoint: Endpoint) {
  const responses: Record<string, unknown> = {};
  for (const [code, response] of Object.entries(endpoint.responses)) {
    const content = response.schema
      ? { 'application/json': { schema: toSchema(response.schema, 'output') } }
      : response.contentType
        ? { [response.contentType]: { schema: { type: 'string', format: 'binary' } } }
        : undefined;
    responses[code] = {
      description: response.description,
      ...(content ? { content } : {}),
      ...(response.headers
        ? {
            headers: Object.fromEntries(
              Object.entries(response.headers).map(([name, description]) => [
                name,
                { description, schema: { type: 'string' } },
              ]),
            ),
          }
        : {}),
    };
  }
  for (const [code, description] of Object.entries(standardErrors(endpoint))) {
    responses[code] ??= { description, content: { 'application/json': { schema: ERROR } } };
  }
  // A declared error response (e.g. 409, 429) carries the error body too.
  for (const [code, response] of Object.entries(responses) as Array<[string, Record<string, unknown>]>) {
    if (Number(code) >= 400 && !response.content) response.content = { 'application/json': { schema: ERROR } };
  }

  return {
    tags: [endpoint.tag],
    summary: endpoint.summary,
    ...(endpoint.description || endpoint.permission
      ? {
          description: [
            endpoint.description,
            endpoint.permission && `Permission: \`${endpoint.permission}\` (central console).`,
          ]
            .filter(Boolean)
            .join('\n\n'),
        }
      : {}),
    security: endpoint.auth === 'public' ? [] : [{ session: [] }],
    parameters: [...parameters(endpoint.params, 'path'), ...parameters(endpoint.query, 'query')],
    ...(endpoint.body
      ? {
          requestBody: {
            required: true,
            content: { [endpoint.body.type]: { schema: toSchema(endpoint.body.schema, 'input') } },
          },
        }
      : {}),
    responses,
  };
}

export function buildOpenApi() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const endpoint of ENDPOINTS) {
    paths[endpoint.path] ??= {};
    paths[endpoint.path]![endpoint.method] = operation(endpoint);
  }
  return {
    openapi: '3.0.3',
    info: {
      title: 'SHD Careers API',
      version: '1.0.0',
      description: 'Jobs, applications and site text for the SHD careers site.',
    },
    servers: [{ url: '/api/v1' }],
    tags: TAGS,
    security: [],
    components: {
      schemas: {},
      securitySchemes: {
        // The admin's session cookie, set by signing in with SHD SSO
        // (/sso/login). Without SSO configured: open in development, 503 in production.
        session: {
          type: 'apiKey',
          in: 'cookie',
          name: SESSION_COOKIE,
          description: 'Sign in at /sso/login (SHD SSO); the browser then sends this cookie.',
        },
      },
    },
    paths,
  };
}

let cached: ReturnType<typeof buildOpenApi> | undefined;
export const openapi = () => (cached ??= buildOpenApi());
