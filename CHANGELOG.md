## @kb-labs/core 0.6.0

**0.5.0 → 0.6.0** (minor: new features)

### ✨ New Features

- **core**: Enhances logger adapters and the IPC loader for better performance and reliability, ensuring a smoother experience during application execution.
- **core**: Introduces a configuration proxy and updates the jobs manager, allowing for more flexible and efficient job handling in your applications.
- **runtime**: Adds adaptive timeouts and transport configuration, which help optimize performance based on real-time conditions, improving overall responsiveness.
- **runtime**: Implements cross-process adapter transport and updates the license, enhancing the capability to communicate across different processes seamlessly.
- **runtime**: Exposes the configuration state for platform services, allowing users to easily verify and manage their service settings.
- **core**: Introduces a runtime monitoring hook and updates package versions, providing better insights and stability for your applications.
- **config**: Simplifies the migration of profiles and workspace initialization, making it easier for users to set up and manage their configurations.
- **state-daemon**: Adds a jobs manager and separates build processes, improving the handling of concurrent tasks and overall system efficiency.
- **sandbox**: Ensures platform configuration is propagated to workers, which enhances consistency and performance in multi-worker setups.
- **platform**: Introduces core platform and runtime packages, giving users essential tools for building robust applications.
- **core**: Adds a tenant package, enabling better multi-tenancy support for applications to serve different users or organizations effectively.
- **core**: Adds a state daemon package, enhancing the ability to manage application states consistently and reliably.
- **core**: Introduces a state broker package, which facilitates efficient communication and state management across various components.
- **core**: Adds a sandbox observability module, allowing users to monitor their applications more effectively and troubleshoot issues faster.
- **core**: Introduces a sandbox diagnostics module, providing users with tools to analyze and improve their sandboxed environments.
- **contracts**: Adds a contracts package and migrates the manifest to Level 2, enhancing the ability to manage agreements and interactions within applications.
- **logging**: Implements adapters for external log collection systems, making it easier for users to integrate with their preferred logging solutions.
- **logging**: Adds automatic initialization and configuration loading, simplifying the setup process for logging and reducing manual errors.
- **logging**: Introduces a metrics exporter for analytics integration, enabling users to gain insights into their application’s performance and usage.
- **logging**: Ensures graceful shutdown and backpressure handling, improving

### 🐛 Bug Fixes

- **logging**: Fixes build and type errors to ensure a smoother development experience and reduce potential issues during installation.
- **docs**: Updates the "Last Updated" date to November 2025, providing users with clarity on the recency of the documentation.
- **docs**: Corrects the ADR reference in the README for improved navigation, helping users find relevant architectural decisions easily.
- **docs**: Fixes a typo in the ADR filename, ensuring users can locate documents without confusion.
- **profile-toolkit**: Adds a rootDir setting to eliminate ambiguity around the project root, making it easier for users to manage their project structure.
- **config**: Removes a circular dependency with core-profiles, leading to a more stable and reliable configuration for users.
- **profiles**: Eliminates the profile-schemas dependency, simplifying the installation process and reducing potential conflicts for users.
- **general**: Updates development kit dependencies to ensure users benefit from the latest features and security improvements.
- **profiles**: Fixes build and tests for @kb-labs/core-profiles, enhancing reliability and ensuring a better experience for users relying on these profiles.
- **general**: Applies ESLint fixes for curly braces and code style, promoting cleaner code that is easier for users to read and maintain.

### ♻️ Code Refactoring

- **runtime**: Improved the loader implementation for faster and more reliable application startup, enhancing user experience.
- **sandbox**: Removed the presenter loader and updated the subprocess runner to streamline the sandbox environment, making it more efficient for users.
- **sys**: Updated logging adapters and output to provide clearer and more actionable log information, helping users troubleshoot issues more effectively.
- **manifest**: Migrated to defineManifest, which simplifies the manifest definition process, making it easier for users to manage their configurations.
- **cli**: Removed the analytics telemetry wrapper to enhance user privacy and reduce unnecessary data collection.
- **adapters**: Eliminated telemetry adapter implementation, further prioritizing user privacy and focusing on essential features.
- **core**: Consolidated core-framework into core-cli-adapters, simplifying the architecture and improving overall performance for users.
- **core**: Updated CLI profiles, types, and configuration for more intuitive command line interactions, which enhances usability.
- **core**: Improved the profiles resolve command, enabling users to quickly find the information they need.
- **core**: Enhanced the profiles inspect command, making it easier for users to view and understand profile configurations.
- **core**: Updated the init workspace command to simplify workspace setup, saving users time during initial configuration.
- **core**: Improved the init setup command for a smoother onboarding experience for new users.
- **core**: Enhanced the init policy command, allowing users to set policies more efficiently.
- **core**: Updated the CLI index for better navigation and accessibility, improving user interaction with the command line.
- **core**: Improved the config validate command to ensure that user configurations are correct and reduce potential errors.
- **core**: Enhanced the config inspect command, making it easier for users to review their configurations.
- **core**: Updated the config get command to simplify accessing configuration settings for users.
- **core**: Improved various CLI commands for a more cohesive user experience and better command execution.
- **core**: Updated the CLI adapters and CLI package to ensure compatibility and improve overall performance for users.
- **general**: Updated remaining files to ensure consistency and maintainability across the project, enhancing overall stability.
- **core**: Removed outdated CLI architecture documentation, streamlining resources for users and focusing on current practices.
- **core**: Removed the old CLI README to avoid confusion and direct users to the updated documentation.
- **core**: Eliminated the old CLI core

---

*Generated automatically by [**@kb-labs/release-manager**](https://github.com/kb-labs/kb-labs)*
*Part of the **KB Labs Platform** — Professional developer tools ecosystem*

<sub>© 2025 KB Labs. Released under KB Public License v1.1</sub>
## @kb-labs/core 0.5.0

**0.4.0 → 0.5.0** (minor: new features)

### ✨ New Features

- **core**: Enhances logger adapters and the IPC loader, improving the overall logging performance and reliability for better monitoring.
- **core**: Introduces a configuration proxy and updates the jobs manager, allowing for more flexible job management and configuration handling.
- **runtime**: Adds adaptive timeouts and transport configuration, ensuring that the system can better respond to varying workloads and conditions.
- **runtime**: Implements cross-process adapter transport and updates the license, facilitating smoother communication between different processes and ensuring compliance.
- **runtime**: Exposes the isConfigured property for platform services, giving users better visibility into the operational state of their services.
- **core**: Introduces a runtime monitoring hook and updates packages, enabling more effective tracking of system performance and health.
- **config**: Simplifies the migration of profiles and workspace initialization, making it easier for users to set up and manage their environments.
- **state-daemon**: Adds a jobs manager and splits builds, enhancing the efficiency of job processing and build management.
- **sandbox**: Propagates platform configuration to workers, ensuring that all components are operating under the same configuration for consistency.
- **platform**: Introduces core platform and runtime packages, providing essential tools and functionalities to enhance the overall user experience.
- **core**: Adds a tenant package to support multi-tenancy, allowing users to manage multiple client environments seamlessly.
- **core**: Introduces a state daemon package, improving state management and monitoring capabilities for better reliability.
- **core**: Adds a state broker package, enhancing communication and data sharing between different components of the system.
- **core**: Implements a sandbox observability module, allowing users to monitor the performance of sandboxed environments more effectively.
- **core**: Introduces a sandbox diagnostics module, helping users quickly identify and resolve issues within sandboxed applications.
- **contracts**: Adds a contracts package and migrates the manifest to Level 2, improving the clarity and structure of contract management.
- **logging**: Introduces adapters for external log collection systems, making it easier to integrate with third-party logging solutions.
- **logging**: Adds automatic initialization and config loading, simplifying the setup process for logging configurations.
- **logging**: Implements a metrics exporter for analytics integration, providing insights into system performance and usage.
- **logging**: Introduces graceful shutdown and backpressure handling, ensuring that logging operations can be managed smoothly under load.
- **logging**:

### 🐛 Bug Fixes

- **logging**: Resolves build and type errors, ensuring a smoother development experience and reducing potential issues during integration.
- **docs**: Updates the Last Updated date to November 2025, providing users with clear visibility on the currency of the documentation.
- **docs**: Updates the ADR reference in the README, helping users to better understand the architectural decisions.
- **docs**: Corrects a typo in the ADR filename, ensuring users can easily locate the relevant documents without confusion.
- **profile-toolkit**: Adds rootDir to resolve ambiguous project root, simplifying project structure and enhancing usability for developers.
- **config**: Removes circular dependency with core-profiles, improving system stability and preventing potential conflicts.
- **profiles**: Removes profile-schemas dependency, streamlining the project's architecture for easier maintenance and better performance.
- **general**: Updates development kit dependencies, ensuring users benefit from the latest improvements and features.
- **profiles**: Fixes build and tests for @kb-labs/core-profiles, enhancing reliability and ensuring a successful setup for developers.
- **general**: Applies ESLint fixes for curly braces and code style, promoting cleaner code and improving readability for all contributors.

### ♻️ Code Refactoring

- **runtime**: Enhances the loader implementation for improved performance and reliability during runtime operations.
- **sandbox**: Removes the presenter loader and updates the subprocess runner, streamlining the sandbox environment for better efficiency.
- **sys**: Updates logging adapters and output, providing clearer insights into system operations and enhancing troubleshooting capabilities.
- **manifest**: Migrates to defineManifest, ensuring a more standardized approach to manifest definitions for better compatibility.
- **cli**: Removes the analytics telemetry wrapper, simplifying the CLI and reducing unnecessary overhead for users.
- **adapters**: Eliminates the telemetry adapter implementation, focusing on core functionalities without the distractions of telemetry data.
- **core**: Consolidates core-framework into core-cli-adapters, creating a more cohesive codebase that enhances maintainability and performance.
- **core**: Updates CLI profiles, types, and configuration, ensuring that users have the latest options and settings available for customization.
- **core**: Improves the profiles resolve command for faster and more accurate profile resolution, enhancing user experience.
- **core**: Enhances the profiles inspect command, making it easier for users to view and understand their profile configurations.
- **core**: Updates the init workspace command, simplifying workspace setup for new users and improving onboarding.
- **core**: Refines the init setup command to streamline initial configurations and reduce setup time for users.
- **core**: Updates the init policy command, ensuring that users can easily apply and manage policies during setup.
- **core**: Revamps the CLI index for better organization, making it easier for users to find and access commands.
- **core**: Enhances the config validate command, allowing users to quickly check their configurations for errors before deployment.
- **core**: Improves the config inspect command, giving users clearer visibility into their configurations and settings.
- **core**: Updates the config get command for easier access to configuration values, enhancing user convenience.
- **core**: Refines CLI commands for improved usability, ensuring that users can interact with the system more intuitively.
- **core**: Updates CLI adapters and the CLI package, ensuring compatibility and improved functionality across all command-line interactions.
- **general**: Updates remaining files to ensure consistency and alignment across the codebase, enhancing overall quality.
- **core**: Removes outdated CLI architecture documentation, simplifying resources for users and reducing confusion.
- **core**: Deletes the old CLI README, focusing on more relevant and

---

*Generated automatically by [**@kb-labs/release-manager**](https://github.com/kb-labs/kb-labs)*
*Part of the **KB Labs Platform** — Professional developer tools ecosystem*

<sub>© 2025 KB Labs. Released under KB Public License v1.1</sub>
