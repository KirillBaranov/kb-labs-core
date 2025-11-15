import type { CommandModule } from '../types';
import { readProfilesSection, resolveProfile } from '@kb-labs/core-config';
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
          type: ANALYTICS_EVENTS.PROFILES_RESOLVE_STARTED,
          payload: {
            profileId,
          },
        });

        if (!profileId) {
          const profilesSection = await readProfilesSection(cwd);
          const availableProfiles = profilesSection.profiles.map((p) => p.id);
          const msg = `No profile specified. Available profiles: ${availableProfiles.join(', ') || 'none'}`;
          ctx.presenter.error(msg);
          return 1;
        }

        const bundleProfile = await resolveProfile({ cwd, profileId });

        const totalTime = Date.now() - startTime;

        if (flags.json) {
          ctx.presenter.json({
            id: bundleProfile.id,
            label: bundleProfile.label,
            version: bundleProfile.version,
            source: bundleProfile.source,
            products: bundleProfile.products,
            scopes: bundleProfile.scopes.map((s) => ({
              id: s.id,
              label: s.label,
              include: s.include,
              exclude: s.exclude,
              isDefault: s.isDefault,
              products: s.products,
            })),
            trace: bundleProfile.trace,
            productsByScope: bundleProfile.productsByScope,
          });
        } else {
          ctx.presenter.write(`ID: ${bundleProfile.id}\n`);
          if (bundleProfile.label) {
            ctx.presenter.write(`Label: ${bundleProfile.label}\n`);
          }
          if (bundleProfile.version) {
            ctx.presenter.write(`Version: ${bundleProfile.version}\n`);
          }
          ctx.presenter.write(`Source: ${bundleProfile.source}\n`);
          if (bundleProfile.trace?.extends && bundleProfile.trace.extends.length > 0) {
            ctx.presenter.write(`Extends: ${bundleProfile.trace.extends.join(' → ')}\n`);
          }
          ctx.presenter.write(`Products: ${Object.keys(bundleProfile.products || {}).join(', ') || 'none'}\n`);
          ctx.presenter.write(`Scopes: ${bundleProfile.scopes.map((s) => s.id).join(', ') || 'none'}\n`);
        }

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.PROFILES_RESOLVE_FINISHED,
          payload: {
            profileId: bundleProfile.id,
            profileName: bundleProfile.label || bundleProfile.id,
            profileVersion: bundleProfile.version || 'unknown',
            productsCount: Object.keys(bundleProfile.products || {}).length,
            scopesCount: bundleProfile.scopes.length,
            extendsCount: bundleProfile.trace?.extends?.length || 0,
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
            profileId: profileId || undefined,
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

