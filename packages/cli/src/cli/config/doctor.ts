import type { CommandModule } from '../types';
import { detectConfigArtifacts } from '../../artifacts/config-artifacts';
import { generateConfigSuggestions } from '../../suggestions/config-suggestions';
import { box, safeSymbols, safeColors } from '@kb-labs/shared-cli-ui';

export const run: CommandModule['run'] = async (ctx, _argv, flags) => {
  const cwd = (flags.cwd as string) || process.cwd();
  
  try {
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
    
    if (flags.json) {
      ctx.presenter.json({ 
        artifacts, 
        suggestions, 
        healthy: issues.length === 0 
      });
      return issues.length === 0 ? 0 : 1;
    }
    
    // Pretty output с suggestions
    if (issues.length === 0) {
      ctx.presenter.write(box('Config Health', [
        `${safeSymbols.success} All checks passed`
      ]));
      return 0;
    }
    
    const output = [
      ...issues,
      '',
      safeColors.bold('Suggestions:'),
      ...suggestions.map(s => 
        `  ${s.command} ${s.args.join(' ')} - ${s.description}`
      )
    ];
    
    ctx.presenter.write(box('Config Health', output));
    return 1;
  } catch (e: unknown) {
    ctx.presenter.error(String(e));
    return 1;
  }
};

