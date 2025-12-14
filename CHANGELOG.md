## @kb-labs/core 0.2.0

**0.1.0 → 0.2.0** (minor: new features)

### ✨ New Features

- **core**: Enhances logging capabilities and improves inter-process communication, resulting in a more robust and efficient system for handling logs.
- **core**: Introduces a configuration proxy and updates the jobs manager, streamlining the management of tasks and settings for better user experience.
- **runtime**: Implements adaptive timeouts and transport configurations, allowing the system to respond more effectively to varying workloads and network conditions.
- **runtime**: Adds cross-process adapter transport, enabling seamless communication between different processes and improving system integration.
- **runtime**: Exposes a configuration status indicator for platform services, making it easier for users to monitor system readiness.
- **core**: Introduces a runtime monitoring hook and updates dependencies, enhancing system stability and performance for users.
- **config**: Simplifies the migration of user profiles and workspace initialization, making it easier for users to transition to the latest version.
- **state-daemon**: Adds a jobs manager and splits builds, improving the efficiency and organization of background tasks for users.
- **sandbox**: Propagates platform configuration to worker processes, ensuring consistency across different parts of the system for a smoother user experience.
- **platform**: Introduces core platform and runtime packages, providing essential tools that enhance overall system functionality.
- **core**: Adds a tenant package, allowing users to manage their environments more effectively and securely.
- **core**: Introduces a state daemon package, enabling better management of application state and improving reliability for users.
- **core**: Adds a state broker package, facilitating communication between different parts of the application for improved performance.
- **core**: Introduces a sandbox observability module, allowing users to monitor the behavior of their applications in a controlled environment.
- **core**: Adds a sandbox diagnostics module, providing users with tools to troubleshoot and diagnose issues more effectively.
- **contracts**: Introduces a contracts package and migrates the manifest to Level 2, ensuring compliance and enhancing the reliability of user agreements.
- **logging**: Adds adapters for external log collection systems, enabling integration with popular logging services for enhanced data management.
- **logging**: Implements automatic initialization and configuration loading, simplifying setup and reducing the time needed for users to get started.
- **logging**: Introduces a metrics exporter for analytics integration, allowing users to gather insights on system performance effortlessly.
- **logging**: Adds graceful shutdown and backpressure handling, ensuring that the system operates smoothly under load and

### 🐛 Bug Fixes

- **logging**: Resolves build and type errors to ensure a smoother development experience and reduce potential issues during integration.
- **docs**: Updates the Last Updated date to November 2025, providing users with a clear reference for the most recent documentation changes.
- **docs**: Clarifies the reference in the README to a relevant Architectural Decision Record, helping users understand important design choices.
- **docs**: Corrects a typo in the ADR filename, ensuring users can easily locate and access the correct documentation.
- **profile-toolkit**: Adds rootDir to eliminate confusion regarding the project's root directory, making it easier for users to navigate the project structure.
- **config**: Removes a circular dependency with core-profiles, enhancing stability and preventing potential issues during project builds.
- **profiles**: Eliminates the dependency on profile-schemas, streamlining the project and reducing complexity for users.
- **general**: Updates development kit dependencies to ensure users benefit from the latest features and improvements available in the tools.
- **profiles**: Fixes build and tests for @kb-labs/core-profiles, ensuring that users experience a reliable and functional integration with this core component.
- **general**: Applies ESLint fixes for curly braces and code style, promoting a cleaner codebase that is easier for users to read and maintain.

### ♻️ Code Refactoring

- **sandbox**: Simplifies the process by removing the presenter loader and enhancing the subprocess runner for better performance.
- **sys**: Improves logging capabilities, ensuring users receive clearer and more informative output during operations.
- **manifest**: Streamlines the application setup by migrating to `defineManifest`, promoting a more standard approach.
- **cli**: Eliminates the analytics telemetry wrapper, reducing overhead and complexity for users.
- **adapters**: Removes the telemetry adapter implementation, simplifying the codebase and making it easier to maintain.
- **core**: Merges core-framework functionalities into the core-cli-adapters, providing a more cohesive and integrated experience.
- **core**: Updates CLI profiles, types, and configuration to enhance user customization and support.
- **core**: Refines the profiles resolve command for quicker and more accurate resolution of user-defined profiles.
- **core**: Enhances the profiles inspect command, allowing users to better understand their configurations.
- **core**: Improves the init workspace command, making the initial workspace setup more intuitive.
- **core**: Streamlines the init setup command for a smoother setup experience.
- **core**: Optimizes the init policy command, ensuring users can easily establish policies.
- **core**: Updates the CLI index for improved navigation and accessibility of commands.
- **core**: Enhances the config validate command, providing users with better feedback on configuration issues.
- **core**: Improves the config inspect command, making it easier for users to understand their settings.
- **core**: Streamlines the config get command for quicker access to configuration values.
- **core**: Updates various CLI commands to enhance overall user experience and consistency.
- **core**: Refines CLI adapters and the CLI package to provide a smoother interaction for users.
- **general**: Updates remaining files for consistency and clarity across the project.
- **core**: Removes outdated CLI architecture documentation to avoid confusion and maintain focus on current practices.
- **core**: Eliminates the CLI README to streamline documentation and direct users to more relevant resources.
- **core**: Removes the CLI core package, simplifying the overall structure and reducing maintenance efforts.
- **core**: Deletes the CLI adapters package, enhancing the clarity of the codebase.
- **core**: Removes the bundle package, focusing on core functionalities that matter most to users.
- **core**: Updates the output system and introduces observability features, allowing

---

*Generated automatically by [**@kb-labs/release-manager**](https://github.com/kb-labs/kb-labs)*
*Part of the **KB Labs Platform** — Professional developer tools ecosystem*

<sub>© 2025 KB Labs. Released under KB Public License v1.1</sub>
