import type { CommandModule } from '../types';
import { readWorkspaceConfig } from '@kb-labs/core-config';
import { loadProfile, extractProfileInfo } from '@kb-labs/core-profiles';
import { box, safeSymbols, safeColors } from '@kb-labs/shared-cli-ui';
import { runScope, type AnalyticsEventV1, type EmitResult } from '@kb-labs/analytics-sdk-node';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../analytics/events';

export const run: CommandModule['run'] = async (ctx, _argv, flags): Promise<number> => {
  const startTime = Date.now();
  const cwd = (flags.cwd as string) || process.cwd();
  const profileKey = (flags['profile-key'] as string) || 'default';

  return (await runScope(
    {
      actor: ANALYTICS_ACTOR,
      ctx: { workspace: cwd },
    },
    async (emit: (event: Partial<AnalyticsEventV1>) => Promise<EmitResult>): Promise<number> => {
      try {
        // Track command start
        await emit({
          type: ANALYTICS_EVENTS.PROFILES_INSPECT_STARTED,
          payload: {
            profileKey,
          },
        });
        const ws = await readWorkspaceConfig(cwd);
        const profiles = (ws?.data as any)?.profiles || {};
        const profileRef = profiles[profileKey];
        if (!profileRef) {
          const totalTime = Date.now() - startTime;
          await emit({
            type: ANALYTICS_EVENTS.PROFILES_INSPECT_FINISHED,
            payload: {
              profileKey,
              durationMs: totalTime,
              result: 'failed',
              error: `Profile key "${profileKey}" not found`,
            },
          });

          const msg = `Profile key "${profileKey}" not found`;
          return flags.json ? (ctx.presenter.json({ ok: false, error: msg, available: Object.keys(profiles) }), 1)
                            : (ctx.presenter.error(msg), 1);
        }

        const loaded = await loadProfile({ cwd, name: profileRef });
        const info = extractProfileInfo(loaded.profile as any, loaded.meta.pathAbs);

        const totalTime = Date.now() - startTime;

        if (flags.json) {
          ctx.presenter.json({ ok: true, profileKey, profileRef, info });
        } else {
          const lines: string[] = [
            `${safeSymbols.info} ${safeColors.bold(`${info.name}@${info.version}`)} (${profileKey})`,
            `schema: v1.0`,
            `path: ${loaded.meta.pathAbs}`,
            `overlays: ${info.overlays?.length ? info.overlays.join(', ') : 'none'}`,
            `products: ${Object.keys(info.exports).join(', ') || 'none'}`,
          ];

          ctx.presenter.write(box('Profile Inspect', lines));
        }

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.PROFILES_INSPECT_FINISHED,
          payload: {
            profileKey,
            profileRef,
            profileName: info.name,
            profileVersion: info.version,
            overlaysCount: info.overlays?.length || 0,
            productsCount: Object.keys(info.exports || {}).length,
            durationMs: totalTime,
            result: 'success',
          },
        });

        return 0;
      } catch (err: any) {
        const totalTime = Date.now() - startTime;

        // Track command failure
        await emit({
          type: ANALYTICS_EVENTS.PROFILES_INSPECT_FINISHED,
          payload: {
            profileKey,
            durationMs: totalTime,
            result: 'error',
            error: err?.message || String(err),
          },
        });

        return flags.json ? (ctx.presenter.json({ ok: false, error: err?.message || String(err) }), 1)
                          : (ctx.presenter.error(err?.message || String(err)), 1);
      }
    }
  )) as number;
};


