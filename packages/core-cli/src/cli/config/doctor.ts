// @ts-expect-error - types will be available after command-kit types are generated
import { defineCommand } from '@kb-labs/shared-command-kit';
import { detectConfigArtifacts } from '../../artifacts/config-artifacts';
import { generateConfigSuggestions } from '../../application/suggestions/config-suggestions';
import { box, safeSymbols } from '@kb-labs/shared-cli-ui';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events';

export const run = defineCommand({
  name: 'config:doctor',
  flags: {
    fix: {
      type: 'boolean',
      description: 'Auto-fix issues',
      default: false,
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
    startEvent: ANALYTICS_EVENTS.CONFIG_DOCTOR_STARTED,
    finishEvent: ANALYTICS_EVENTS.CONFIG_DOCTOR_FINISHED,
    actor: ANALYTICS_ACTOR.id,
    includeFlags: true,
  },
  // @ts-expect-error - types will be inferred from schema after types are generated
  async handler(ctx: any, argv: any, flags: any) {
    const cwd = flags.cwd || ctx.cwd || process.cwd();
    
    ctx.tracker.checkpoint('detect');

    const artifacts = await detectConfigArtifacts(cwd);
    const suggestions = generateConfigSuggestions(artifacts, {});
    
    ctx.tracker.checkpoint('complete');
    
    // Build health report
    const issues: string[] = [];
    
    if (artifacts.missingWorkspaceConfig) {
      issues.push(`${safeSymbols.error} Workspace config missing`);
    }
    
    if (artifacts.missingProfiles.length > 0) {
      issues.push(`${safeSymbols.warning} Missing profiles: ${artifacts.missingProfiles.join(', ')}`);
    }
    
    if (artifacts.invalidProfiles.length > 0) {
      issues.push(`${safeSymbols.error} Invalid profiles: ${artifacts.invalidProfiles.join(', ')}`);
    }
    
    if (artifacts.missingLockfile) {
      issues.push(`${safeSymbols.warning} Lockfile missing`);
    }

    const healthy = issues.length === 0;
    
    ctx.logger?.info('Config doctor check completed', {
      healthy,
      issuesCount: issues.length,
      suggestionsCount: suggestions.length,
    });
    
    if (flags.json) {
      ctx.output?.json({ 
        artifacts, 
        suggestions, 
        healthy 
      });
    } else {
      // Pretty output с suggestions
      if (issues.length === 0) {
        ctx.output?.write(box('Config Health', [
          `${ctx.output?.ui.symbols.success ?? '✓'} All checks passed`
        ]));
      } else {
        const outputLines = [
          ...issues,
          '',
          `${ctx.output?.ui.colors.bold('Suggestions:') ?? 'Suggestions:'}`,
          ...suggestions.map(s => 
            `  ${s.command} ${s.args.join(' ')} - ${s.description}`
          )
        ];
        
        ctx.output?.write(box('Config Health', outputLines));
      }
    }

    return healthy ? { ok: true, healthy } : { ok: false, healthy, issues };
  },
});
