import type { CommandModule } from '../types';
import { readProfilesSection, resolveProfile } from '@kb-labs/core-config';
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
          type: ANALYTICS_EVENTS.PROFILES_INSPECT_STARTED,
          payload: {
            profileId,
          },
        });

        const profilesSection = await readProfilesSection(cwd);
        const availableProfiles = profilesSection.profiles.map((p) => p.id);

        if (!profileId) {
          const totalTime = Date.now() - startTime;
          await emit({
            type: ANALYTICS_EVENTS.PROFILES_INSPECT_FINISHED,
          payload: {
            profileId: undefined,
            durationMs: totalTime,
            result: 'failed',
            error: 'No profile specified. Use --profile=<id>',
          },
          });

          const msg = `No profile specified. Available profiles: ${availableProfiles.join(', ') || 'none'}`;
          return flags.json
            ? (ctx.presenter.json({ ok: false, error: msg, available: availableProfiles }), 1)
            : (ctx.presenter.error(msg), 1);
        }

        if (!availableProfiles.includes(profileId)) {
          const totalTime = Date.now() - startTime;
          await emit({
            type: ANALYTICS_EVENTS.PROFILES_INSPECT_FINISHED,
          payload: {
            profileId,
            durationMs: totalTime,
            result: 'failed',
            error: `Profile "${profileId}" not found`,
          },
          });

          const msg = `Profile "${profileId}" not found. Available: ${availableProfiles.join(', ') || 'none'}`;
          return flags.json
            ? (ctx.presenter.json({ ok: false, error: msg, available: availableProfiles }), 1)
            : (ctx.presenter.error(msg), 1);
        }

        const bundleProfile = await resolveProfile({ cwd, profileId });

        const totalTime = Date.now() - startTime;

        if (flags.json) {
          ctx.presenter.json({
            ok: true,
            profileId: bundleProfile.id,
            label: bundleProfile.label,
            source: bundleProfile.source,
            version: bundleProfile.version,
            products: Object.keys(bundleProfile.products || {}),
            scopes: bundleProfile.scopes.map((s) => ({
              id: s.id,
              label: s.label,
              isDefault: s.isDefault,
            })),
            trace: bundleProfile.trace,
          });
        } else {
          const lines: string[] = [
            `${safeSymbols.info} ${safeColors.bold(bundleProfile.label || bundleProfile.id)}${bundleProfile.version ? `@${bundleProfile.version}` : ''} (${bundleProfile.id})`,
            `source: ${bundleProfile.source}`,
            bundleProfile.version ? `version: ${bundleProfile.version}` : '',
            `products: ${Object.keys(bundleProfile.products || {}).join(', ') || 'none'}`,
            `scopes: ${bundleProfile.scopes.map((s) => s.id).join(', ') || 'none'}`,
            bundleProfile.trace?.extends
              ? `extends: ${bundleProfile.trace.extends.join(' → ')}`
              : '',
          ].filter(Boolean);

          ctx.presenter.write(box('Profile Inspect', lines));
        }

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.PROFILES_INSPECT_FINISHED,
          payload: {
            profileId: bundleProfile.id,
            profileName: bundleProfile.label || bundleProfile.id,
            profileVersion: bundleProfile.version || 'unknown',
            productsCount: Object.keys(bundleProfile.products || {}).length,
            scopesCount: bundleProfile.scopes.length,
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
            profileId: profileId || undefined,
            durationMs: totalTime,
            result: 'error',
            error: err?.message || String(err),
          },
        });

        return flags.json
          ? (ctx.presenter.json({ ok: false, error: err?.message || String(err) }), 1)
          : (ctx.presenter.error(err?.message || String(err)), 1);
      }
    }
  )) as number;
};


