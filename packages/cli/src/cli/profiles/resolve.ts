import type { CommandModule } from '../types';
import { loadProfile, normalizeManifest, extractProfileInfo } from '@kb-labs/core-profiles';
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
          type: ANALYTICS_EVENTS.PROFILES_RESOLVE_STARTED,
          payload: {
            profileKey: (flags['profile-key'] as string) || 'default',
          },
        });
        const profile = await loadProfile({ 
          cwd,
          name: (flags['profile-key'] as string) || 'default'
        });
        
        const manifest = normalizeManifest(profile.profile);
        const profileInfo = extractProfileInfo(manifest, profile.meta.pathAbs);
        
        const totalTime = Date.now() - startTime;

        if (flags.json) {
          ctx.presenter.json({
            name: profileInfo.name,
            version: profileInfo.version,
            manifestPath: profileInfo.manifestPath,
            exports: profileInfo.exports,
            extends: profileInfo.extends,
          });
        } else {
          ctx.presenter.write(`Name: ${profileInfo.name}\n`);
          ctx.presenter.write(`Version: ${profileInfo.version}\n`);
          ctx.presenter.write(`Path: ${profileInfo.manifestPath}\n`);
          if (profileInfo.extends) {
            ctx.presenter.write(`Extends: ${profileInfo.extends.join(', ')}\n`);
          }
        }

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.PROFILES_RESOLVE_FINISHED,
          payload: {
            profileKey: (flags['profile-key'] as string) || 'default',
            profileName: profileInfo.name,
            profileVersion: profileInfo.version,
            exportsCount: Object.keys(profileInfo.exports || {}).length,
            extendsCount: profileInfo.extends?.length || 0,
            durationMs: totalTime,
            result: 'success',
          },
        });
        
        return 0;
      } catch (e: unknown) {
        const totalTime = Date.now() - startTime;

        // Track command failure
        await emit({
          type: ANALYTICS_EVENTS.PROFILES_RESOLVE_FINISHED,
          payload: {
            profileKey: (flags['profile-key'] as string) || 'default',
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

