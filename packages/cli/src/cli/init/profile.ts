import type { CommandModule } from '../types';
import { initProfile } from '@kb-labs/core-profiles';
import { runScope, type AnalyticsEventV1, type EmitResult } from '@kb-labs/analytics-sdk-node';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../analytics/events';

export const run: CommandModule['run'] = async (ctx, _argv, flags): Promise<number> => {
  const startTime = Date.now();
  const cwd = (flags.cwd as string) || process.cwd();

  return (await runScope(
    {
      actor: ANALYTICS_ACTOR,
      ctx: { workspace: cwd },
    },
    async (emit: (event: Partial<AnalyticsEventV1>) => Promise<EmitResult>): Promise<number> => {
      try {
        // Track command start
        await emit({
          type: ANALYTICS_EVENTS.INIT_PROFILE_STARTED,
          payload: {
            profileKey: (flags['profile-key'] as string) || 'default',
            profileRef: flags['profile-ref'] as string | undefined,
            createLocalScaffold: !!flags['scaffold-local-profile'],
          },
        });
        const result = await initProfile({
          profileKey: (flags['profile-key'] as string) || 'default',
          profileRef: flags['profile-ref'] as string | undefined,
          cwd
        });
        
        const totalTime = Date.now() - startTime;

        if (flags.json) {
          ctx.presenter.json(result);
        } else {
          ctx.presenter.write('Profile initialized successfully.\n');
        }

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.INIT_PROFILE_FINISHED,
          payload: {
            profileKey: (flags['profile-key'] as string) || 'default',
            profileRef: flags['profile-ref'] as string | undefined,
            createLocalScaffold: !!flags['scaffold-local-profile'],
            durationMs: totalTime,
            result: 'success',
          },
        });
        
        return 0;
      } catch (e: unknown) {
        const totalTime = Date.now() - startTime;

        // Track command failure
        await emit({
          type: ANALYTICS_EVENTS.INIT_PROFILE_FINISHED,
          payload: {
            profileKey: (flags['profile-key'] as string) || 'default',
            profileRef: flags['profile-ref'] as string | undefined,
            createLocalScaffold: !!flags['scaffold-local-profile'],
            durationMs: totalTime,
            result: 'error',
            error: String(e),
          },
        });

        ctx.presenter.error(String(e));
        return 1;
      }
    }
  )) as number;
};

