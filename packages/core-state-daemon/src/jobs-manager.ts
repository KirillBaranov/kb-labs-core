/**
 * Jobs manager - integrates CronManager with plugin job loading
 *
 * SECURITY: Uses executePlugin() with sandbox for job isolation
 */

import { CronManager } from '@kb-labs/core-runtime';
import type { ILogger } from '@kb-labs/core-platform';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { executePlugin, createPluginContextWithPlatform, createNoopUI } from '@kb-labs/plugin-runtime';
import { permissions } from '@kb-labs/shared-command-kit';

export interface JobsManagerConfig {
  logger: ILogger;
}

export class JobsManager {
  private cronManager: CronManager;
  private logger: ILogger;

  constructor(config: JobsManagerConfig) {
    this.logger = config.logger;
    this.cronManager = new CronManager(this.logger);
  }

  /**
   * Initialize jobs - discover plugins and load jobs from manifests
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing jobs manager...');

      // Load jobs from plugin manifests
      await this.loadPluginJobs();

      const totalJobs = this.cronManager.list().length;
      this.logger.info('Jobs manager initialized', { totalJobs });
    } catch (error) {
      this.logger.error(
        'Failed to initialize jobs manager',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Load jobs from plugin manifests (simplified MVP version)
   *
   * TODO: docs/tasks/TASK-002-state-daemon-plugin-discovery.md
   * Currently uses hardcoded path for plugin-template.
   * Should be refactored to use lightweight plugin discovery or env config.
   *
   * Environment variables:
   * - KB_PLUGIN_MANIFESTS: Comma-separated paths to manifest.v2.js files
   */
  private async loadPluginJobs(): Promise<void> {
    try {
      // Get plugin manifest paths from environment or use default
      const manifestPathsEnv = process.env.KB_PLUGIN_MANIFESTS;
      const manifestPaths = manifestPathsEnv
        ? manifestPathsEnv.split(',').map(p => p.trim())
        : [
            // Default: plugin-template for development
            'kb-labs-plugin-template/packages/plugin-template-core/dist/manifest.v2.js'
          ];

      this.logger.info(`Loading jobs from ${manifestPaths.length} plugin manifest(s)`);

      let totalJobsLoaded = 0;
      let totalJobsSkipped = 0;

      for (const manifestPath of manifestPaths) {
        try {
          // Resolve to absolute path and convert to file URL for dynamic import
          const absolutePath = path.resolve(process.cwd(), manifestPath);
          const fileUrl = pathToFileURL(absolutePath).href;

          // Dynamic import to load manifest
          const manifestModule = await import(fileUrl);
          const manifest = manifestModule.default || manifestModule.manifest;

          if (!manifest || !manifest.jobs || manifest.jobs.length === 0) {
            this.logger.debug(`No jobs found in manifest: ${manifestPath}`);
            continue;
          }

          this.logger.info(`Loading ${manifest.jobs.length} job(s) from ${manifest.id}`);

          // Get plugin root directory (parent of dist/)
          // absolutePath is like: /path/to/plugin/dist/manifest.v2.js
          // We need pluginRoot to be: /path/to/plugin (NOT /path/to/plugin/dist)
          // because execute() will add /dist automatically
          const manifestDir = path.dirname(absolutePath); // .../plugin/dist
          const pluginRoot = path.dirname(manifestDir); // .../plugin
          const pluginId = manifest.id;

          for (const job of manifest.jobs) {
            if (job.enabled === false) {
              this.logger.debug(`Skipping disabled job: ${job.id}`);
              totalJobsSkipped++;
              continue;
            }

            try {
              // Register job with CronManager
              const jobId = `${pluginId}:${job.id}`;

              // Parse handler reference
              // Handler in manifest is like: "./jobs/hello.js#run"
              // We need to remove .js extension because execute() adds it automatically
              let [handlerFile, handlerExport = 'run'] = job.handler.split('#');
              handlerFile = handlerFile.replace(/\.js$/, ''); // Remove .js extension

              // ✅ SECURITY: Create handler wrapper with execute() and sandbox
              const handler = async (ctx: any) => {
                this.logger.info(`Executing job: ${jobId}`);

                try {
                  // Build execution context (with sandbox!)
                  const isDebugMode = process.env.KB_LOG_LEVEL === 'debug' || process.env.KB_JOBS_DEBUG === 'true';
                  const requestId = `job-${jobId}-${Date.now()}`;

                  // Create PluginContextV2 for job execution
                  const pluginContext = createPluginContextWithPlatform({
                    host: 'cli', // Jobs are CLI-like execution
                    requestId,
                    pluginId,
                    pluginVersion: manifest.version,
                    cwd: process.cwd(),      // V2: promoted to top-level
                    outdir: path.join('.kb', pluginId.replace('@kb-labs/', '')),  // V2: promoted
                    config: {},
                    ui: createNoopUI(), // Jobs don't have UI
                    metadata: {
                      // Job-specific fields
                      scheduledJob: true,  // Mark as scheduled job (not interactive CLI)
                      jobId: ctx.jobId,
                      executedAt: ctx.executedAt,
                      runCount: ctx.runCount,
                      schedule: job.schedule,
                      routeOrCommand: jobId,
                      debug: isDebugMode,
                    },
                  });

                  // Get permissions from manifest or use readonly default
                  const jobPermissions = job.permissions ?? permissions.presets.pluginWorkspace(
                    pluginId.replace('@kb-labs/', '')
                  );

                  // Execute via new executePlugin architecture
                  const result = await executePlugin({
                    context: pluginContext,
                    handlerRef: { file: handlerFile, export: handlerExport },
                    argv: [], // Jobs don't use argv
                    flags: {
                      jobId: ctx.jobId,
                      executedAt: ctx.executedAt,
                      runCount: ctx.runCount,
                    },
                    manifest,
                    permissions: jobPermissions,
                    grantedCapabilities: manifest.capabilities || [],
                    pluginRoot: path.join(pluginRoot, 'dist'),
                    registry: undefined, // Jobs don't need registry
                  });

                  if (!result.ok) {
                    // Log detailed error information
                    const errorDetails = JSON.stringify({
                      errorMessage: result.error?.message,
                      errorCode: result.error?.code,
                      handler: `${handlerFile}#${handlerExport}`,
                      requestId: pluginContext.requestId,
                    }, null, 2);

                    this.logger.error(
                      `Job execution failed: ${jobId}\n${errorDetails}`,
                      new Error(result.error?.message ?? 'Job execution failed')
                    );
                    throw new Error(result.error?.message ?? 'Job execution failed');
                  }

                  this.logger.info(`Job completed: ${jobId}`, { result: result.data });
                } catch (error) {
                  this.logger.error(
                    `Job execution failed: ${jobId}`,
                    error instanceof Error ? error : new Error(String(error))
                  );
                  throw error;
                }
              };

              this.cronManager.register(jobId, job.schedule, handler);
              this.logger.info(`Registered job: ${jobId} with schedule ${job.schedule}`);
              totalJobsLoaded++;
            } catch (error) {
              this.logger.error(`Failed to register job ${job.id}`, error instanceof Error ? error : new Error(String(error)));
              totalJobsSkipped++;
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to load manifest: ${manifestPath}`, {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      this.logger.info('Job loading completed', {
        manifestsProcessed: manifestPaths.length,
        jobsLoaded: totalJobsLoaded,
        jobsSkipped: totalJobsSkipped,
      });
    } catch (error) {
      // Non-fatal - jobs are optional
      this.logger.warn('Failed to load plugin jobs', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get all registered jobs
   */
  listJobs() {
    return this.cronManager.list();
  }

  /**
   * Manually trigger a job
   */
  async triggerJob(id: string): Promise<void> {
    return this.cronManager.trigger(id);
  }

  /**
   * Pause a job
   */
  pauseJob(id: string): void {
    this.cronManager.pause(id);
  }

  /**
   * Resume a paused job
   */
  resumeJob(id: string): void {
    this.cronManager.resume(id);
  }

  /**
   * Get statistics about jobs
   */
  getStats() {
    return this.cronManager.getStats();
  }

  /**
   * Cleanup on shutdown
   */
  async dispose(): Promise<void> {
    this.logger.info('Disposing jobs manager...');
    this.cronManager.dispose();
  }
}
