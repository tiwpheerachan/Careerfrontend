import type { Database } from '@/lib/db/client';
import { createApplicationFormRepository } from './application-forms';
import { createApplicationRepository } from './applications';
import { createInterviewEvaluationRepository } from './interview-evaluations';
import { createInterviewInvitationRepository } from './interview-invitations';
import { createJobRepository } from './jobs';
import { createRateLimitRepository } from './rate-limits';
import { createSiteContentRepository } from './site-content';

/**
 * Every repository, over one database handle. Repositories are the only code
 * that touches the database; route handlers and pages go through store().
 */
export function createRepositories(db: Database) {
  return {
    jobs: createJobRepository(db),
    applications: createApplicationRepository(db),
    applicationForms: createApplicationFormRepository(db),
    interviewEvaluations: createInterviewEvaluationRepository(db),
    interviewInvitations: createInterviewInvitationRepository(db),
    siteContent: createSiteContentRepository(db),
    rateLimits: createRateLimitRepository(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
