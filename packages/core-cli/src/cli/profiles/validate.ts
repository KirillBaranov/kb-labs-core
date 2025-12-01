import { defineCommand } from '@kb-labs/shared-command-kit';
import { readProfilesSection, resolveProfile, ProfileV2Schema } from '@kb-labs/core-config';
import { box, safeSymbols, safeColors } from '@kb-labs/shared-cli-ui';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events';
export const run = defineCommand({
  name: 'profiles:validate',
  flags: {
    profile: {
      type: 'string',
      description: 'Profile ID to validate',
    },
    cwd: {
      type: 'string',
      description: 'Working directory',
    },
    json: {
      type: 'boolean',
      description: 'Output in JSON format',
      default: false,
    },
  },
  analytics: {
    startEvent: ANALYTICS_EVENTS.PROFILES_VALIDATE_STARTED,
    finishEvent: ANALYTICS_EVENTS.PROFILES_VALIDATE_FINISHED,
    actor: ANALYTICS_ACTOR.id,
    includeFlags: true,
  },
  async handler(ctx: any, argv: any, flags: any) {
    const cwd = flags.cwd || ctx.cwd || process.cwd();
    ctx.tracker.checkpoint('load');
    const profilesSection = await readProfilesSection(cwd);
    const availableProfiles = profilesSection.profiles.map((p) => p.id);
    if (!flags.profile) {
      const msg = `No profile specified. Available profiles: ${availableProfiles.join(', ') || 'none'}`;
      if (flags.json) {
        ctx.output?.json({ ok: false, error: msg, available: availableProfiles });
      } else {
        ctx.output?.error(msg);
      }
      return 1;
    }
    if (!availableProfiles.includes(flags.profile)) {
      const msg = `Profile "${flags.profile}" not found. Available: ${availableProfiles.join(', ') || 'none'}`;
      if (flags.json) {
        ctx.output?.json({ ok: false, error: msg, available: availableProfiles });
      } else {
        ctx.output?.error(msg);
      }
      return 1;
    }
    // Find profile in section and validate with Zod
    const profile = profilesSection.profiles.find((p) => p.id === flags.profile);
    if (!profile) {
      const msg = `Profile "${flags.profile}" not found in profiles section`;
      if (flags.json) {
        ctx.output?.json({ ok: false, error: msg });
      } else {
        ctx.output?.error(msg);
      }
      return 1;
    }
    ctx.tracker.checkpoint('validate');
    // Validate with Zod schema
    const validation = ProfileV2Schema.safeParse(profile);
    const isValid = validation.success;
    const errors = !validation.success
      ? validation.error.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }))
      : null;
    ctx.tracker.checkpoint('complete');
    if (flags.json) {
      ctx.output?.json({
        ok: isValid,
        errors,
        profileId: profile.id,
        source: profilesSection.sourcePath,
      });
    } else {
      if (isValid) {
        ctx.output?.write(
          box('Profile Validation', [
            `${safeSymbols.success} ${safeColors.bold('Valid profile')} "${flags.profile}" (Profiles v2)`,
            `source: ${profilesSection.sourcePath || 'unknown'}`,
          ])
        );
      } else {
        const lines: string[] = [
          `${safeSymbols.error} ${safeColors.bold('Invalid profile')} "${flags.profile}" (Profiles v2)`,
          `source: ${profilesSection.sourcePath || 'unknown'}`,
        ];
        if (errors && errors.length > 0) {
          lines.push('', safeColors.bold('Errors:'));
          for (const e of errors) {
            lines.push(`  - ${e.path ? e.path + ': ' : ''}${e.message}`);
          }
        }
        ctx.output?.write(box('Profile Validation', lines));
      }
    }
    return isValid ? { ok: true, valid: true } : { ok: false, valid: false, errors };
  },
});
