/**
 * @module @kb-labs/core-platform/core
 * Core feature interfaces (built-in, not replaceable).
 */

// Workflow Engine
export type {
  IWorkflowEngine,
  WorkflowOptions,
  WorkflowRun,
  WorkflowStepRun,
  WorkflowFilter,
  RetryPolicy,
} from './workflow.js';

// Job Scheduler
export type {
  IJobScheduler,
  JobDefinition,
  JobHandle,
  JobStatus,
  JobFilter,
  CronExpression,
} from './jobs.js';

// Cron Manager
export type {
  ICronManager,
  CronJob,
  CronContext,
  CronHandler,
} from './cron.js';

// Resource Manager
export type {
  IResourceManager,
  ResourceType,
  ResourceSlot,
  ResourceAvailability,
  TenantQuotas,
} from './resources.js';
