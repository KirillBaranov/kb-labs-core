import type { CommandModule } from '../types';
import { readProfilesSection, resolveProfile, ProfileV2Schema } from '@kb-labs/core-config';
import { box, safeSymbols, safeColors } from '@kb-labs/shared-cli-ui';
import { runScope, type AnalyticsEventV1, type EmitResult } from '@kb-labs/analytics-sdk-node';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../analytics/events';

export const run: CommandModule['run'] = async (ctx, _argv, flags): Promise<number> => {
  const startTime = Date.now();
  const cwd = (flags.cwd as string) || process.cwd();
  const profileId = flags.profile as string | undefined;

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
            profileId,
          },
        });

        const profilesSection = await readProfilesSection(cwd);
        const availableProfiles = profilesSection.profiles.map((p) => p.id);

        if (!profileId) {
          const totalTime = Date.now() - startTime;
          await emit({
            type: ANALYTICS_EVENTS.PROFILES_VALIDATE_FINISHED,
          payload: {
            profileId: undefined,
            durationMs: totalTime,
            result: 'failed',
            error: 'No profile specified',
          },
          });

          const msg = `No profile specified. Available profiles: ${availableProfiles.join(', ') || 'none'}`;
          if (flags.json) {
            ctx.presenter.json({ ok: false, error: msg, available: availableProfiles });
            return 1;
          }
          ctx.presenter.error(msg);
          return 1;
        }

        if (!availableProfiles.includes(profileId)) {
          const totalTime = Date.now() - startTime;
          await emit({
            type: ANALYTICS_EVENTS.PROFILES_VALIDATE_FINISHED,
          payload: {
            profileId,
            durationMs: totalTime,
            result: 'failed',
            error: `Profile "${profileId}" not found`,
          },
          });

          const msg = `Profile "${profileId}" not found. Available: ${availableProfiles.join(', ') || 'none'}`;
          if (flags.json) {
            ctx.presenter.json({ ok: false, error: msg, available: availableProfiles });
            return 1;
          }
          ctx.presenter.error(msg);
          return 1;
        }

        // Find profile in section and validate with Zod
        const profile = profilesSection.profiles.find((p) => p.id === profileId);
        if (!profile) {
          const totalTime = Date.now() - startTime;
          await emit({
            type: ANALYTICS_EVENTS.PROFILES_VALIDATE_FINISHED,
            payload: {
              profileKey: profileId,
              durationMs: totalTime,
              result: 'failed',
              error: 'Profile not found in section',
            },
          });

          const msg = `Profile "${profileId}" not found in profiles section`;
          if (flags.json) {
            ctx.presenter.json({ ok: false, error: msg });
            return 1;
          }
          ctx.presenter.error(msg);
          return 1;
        }

        // Validate with Zod schema
        const validation = ProfileV2Schema.safeParse(profile);
        const isValid = validation.success;
        const errors = !validation.success
          ? validation.error.issues.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            }))
          : null;

        const totalTime = Date.now() - startTime;

        if (flags.json) {
          ctx.presenter.json({
            ok: isValid,
            errors,
            profileId: profile.id,
            source: profilesSection.sourcePath,
          });
        } else {
          if (isValid) {
            ctx.presenter.write(
              box('Profile Validation', [
                `${safeSymbols.success} ${safeColors.bold('Valid profile')} "${profileId}" (Profiles v2)`,
                `source: ${profilesSection.sourcePath || 'unknown'}`,
              ])
            );
          } else {
            const lines: string[] = [
              `${safeSymbols.error} ${safeColors.bold('Invalid profile')} "${profileId}" (Profiles v2)`,
              `source: ${profilesSection.sourcePath || 'unknown'}`,
            ];
            if (errors && errors.length > 0) {
              lines.push('', safeColors.bold('Errors:'));
              for (const e of errors) {
                lines.push(`  - ${e.path ? e.path + ': ' : ''}${e.message}`);
              }
            }
            ctx.presenter.write(box('Profile Validation', lines));
          }
        }

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.PROFILES_VALIDATE_FINISHED,
          payload: {
            profileId: profile.id,
            validationOk: isValid,
            errorsCount: errors?.length || 0,
            durationMs: totalTime,
            result: isValid ? 'success' : 'failed',
          },
        });

        return isValid ? 0 : 1;
      } catch (err: any) {
        const totalTime = Date.now() - startTime;

        // Track command failure
        await emit({
          type: ANALYTICS_EVENTS.PROFILES_VALIDATE_FINISHED,
          payload: {
            profileId: profileId || undefined,
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


