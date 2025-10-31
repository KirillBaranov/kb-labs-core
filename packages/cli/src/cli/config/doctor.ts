import type { CommandModule } from '../types';
import { detectConfigArtifacts } from '../../artifacts/config-artifacts';
import { generateConfigSuggestions } from '../../suggestions/config-suggestions';
import { box, safeSymbols, safeColors } from '@kb-labs/shared-cli-ui';
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
          type: ANALYTICS_EVENTS.CONFIG_DOCTOR_STARTED,
          payload: {
            fix: !!flags.fix,
          },
        });
        const artifacts = await detectConfigArtifacts(cwd);
        const suggestions = generateConfigSuggestions(artifacts, {});
        
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

        const totalTime = Date.now() - startTime;
        const healthy = issues.length === 0;
        
        if (flags.json) {
          ctx.presenter.json({ 
            artifacts, 
            suggestions, 
            healthy 
          });
        } else {
          // Pretty output с suggestions
          if (issues.length === 0) {
            ctx.presenter.write(box('Config Health', [
              `${safeSymbols.success} All checks passed`
            ]));
          } else {
            const output = [
              ...issues,
              '',
              safeColors.bold('Suggestions:'),
              ...suggestions.map(s => 
                `  ${s.command} ${s.args.join(' ')} - ${s.description}`
              )
            ];
            
            ctx.presenter.write(box('Config Health', output));
          }
        }

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.CONFIG_DOCTOR_FINISHED,
          payload: {
            fix: !!flags.fix,
            healthy,
            issuesCount: issues.length,
            suggestionsCount: suggestions.length,
            durationMs: totalTime,
            result: healthy ? 'success' : 'failed',
          },
        });

        return healthy ? 0 : 1;
      } catch (e: unknown) {
        const totalTime = Date.now() - startTime;

        // Track command failure
        await emit({
          type: ANALYTICS_EVENTS.CONFIG_DOCTOR_FINISHED,
          payload: {
            fix: !!flags.fix,
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

