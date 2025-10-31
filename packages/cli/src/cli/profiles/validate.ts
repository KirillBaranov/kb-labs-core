import type { CommandModule } from '../types';
import { readWorkspaceConfig } from '@kb-labs/core-config';
import { loadProfile, validateProfile as validateProfileApi } from '@kb-labs/core-profiles';
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
          type: ANALYTICS_EVENTS.PROFILES_VALIDATE_STARTED,
          payload: {
            profileKey,
          },
        });
        const ws = await readWorkspaceConfig(cwd);
        if (!ws?.data) {
          const totalTime = Date.now() - startTime;
          await emit({
            type: ANALYTICS_EVENTS.PROFILES_VALIDATE_FINISHED,
            payload: {
              profileKey,
              durationMs: totalTime,
              result: 'failed',
              error: 'No workspace configuration found',
            },
          });

          const msg = 'No workspace configuration found';
          if (flags.json) { ctx.presenter.json({ ok: false, error: msg }); return 1; }
          ctx.presenter.error(msg);
          return 1;
        }

        const profiles = (ws.data as any).profiles || {};
        const profileRef = profiles[profileKey];
        if (!profileRef) {
          const totalTime = Date.now() - startTime;
          await emit({
            type: ANALYTICS_EVENTS.PROFILES_VALIDATE_FINISHED,
            payload: {
              profileKey,
              durationMs: totalTime,
              result: 'failed',
              error: `Profile key "${profileKey}" not found`,
            },
          });

          const msg = `Profile key "${profileKey}" not found`;
          if (flags.json) { ctx.presenter.json({ ok: false, error: msg, available: Object.keys(profiles) }); return 1; }
          ctx.presenter.error(msg);
          return 1;
        }

        // Load profile manifest and validate
        const loaded = await loadProfile({ cwd, name: profileRef });
        const validation = validateProfileApi(loaded.profile as any);

        const totalTime = Date.now() - startTime;

        if (flags.json) {
          ctx.presenter.json({ ok: validation.ok, errors: validation.errors || null, profileKey, profileRef });
        } else {
          if (validation.ok) {
            ctx.presenter.write(
              box('Profile Validation', [
                `${safeSymbols.success} ${safeColors.bold('Valid profile')} for key ${profileKey} (${profileRef})`
              ])
            );
          } else {
            const lines: string[] = [
              `${safeSymbols.error} ${safeColors.bold('Invalid profile')} for key ${profileKey} (${profileRef})`,
            ];
            if (Array.isArray(validation.errors)) {
              lines.push('', safeColors.bold('Errors:'));
              for (const e of validation.errors) {
                const path = (e as any).instancePath || '';
                const msg = (e as any).message || 'Validation error';
                lines.push(`  - ${path ? path + ': ' : ''}${msg}`);
              }
            }
            ctx.presenter.write(box('Profile Validation', lines));
          }
        }

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.PROFILES_VALIDATE_FINISHED,
          payload: {
            profileKey,
            profileRef,
            validationOk: validation.ok,
            errorsCount: Array.isArray(validation.errors) ? validation.errors.length : 0,
            durationMs: totalTime,
            result: validation.ok ? 'success' : 'failed',
          },
        });

        return validation.ok ? 0 : 1;
      } catch (err: any) {
        const totalTime = Date.now() - startTime;

        // Track command failure
        await emit({
          type: ANALYTICS_EVENTS.PROFILES_VALIDATE_FINISHED,
          payload: {
            profileKey,
            durationMs: totalTime,
            result: 'error',
            error: err?.message || String(err),
          },
        });

        if (flags.json) {
          ctx.presenter.json({ ok: false, error: err?.message || String(err) });
        } else {
          ctx.presenter.error(err?.message || String(err));
        }
        return 1;
      }
    }
  )) as number;
};


