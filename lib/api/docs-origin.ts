/**
 * The origin the API docs page is built with (scripts/build-api-docs.ts) and
 * that app/api-docs/route.ts swaps for the request's own, so Try it calls the
 * deployment serving the page. `.invalid` can never resolve, so a page served
 * without the swap fails loudly instead of calling somewhere real.
 */
export const DOCS_ORIGIN = 'https://careers-docs.invalid';
