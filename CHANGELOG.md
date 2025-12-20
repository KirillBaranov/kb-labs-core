## @kb-labs/core 0.9.0

**0.8.0 → 0.9.0** (minor: new features)

### ✨ New Features

- **core-runtime**: Introduces TypeScript configuration for project paths, enhancing code maintainability and developer experience by ensuring consistent path resolutions across the project.
- **core-runtime**: Initializes the core runtime index and configuration, providing a foundational setup that simplifies the integration of new features and improves overall system organization.
- **core-runtime**: Adds core runtime loader and transport functionality, allowing for more efficient data handling and communication, which ultimately speeds up application performance.
- **core-runtime**: Implements Unix socket server functionality, enabling seamless inter-process communication that enhances the system's responsiveness and reliability.
- **core-platform**: Introduces a new `getDimensions` method to embeddings interfaces and implementations, allowing users to easily retrieve relevant size metrics, improving usability in managing data structures.
- **core-runtime**: Integrates the resource broker into the core runtime, streamlining resource management and allocation, which enhances the system's efficiency and reduces potential resource conflicts.
- **core-resource-broker**: Launches the core resource broker package with its initial implementation, empowering users with better control over resource distribution and improving overall resource utilization.
- **core-config**: Refactors workspace configuration handling to new paths, improving clarity and organization, which simplifies the configuration process for users.
- **core-cli**: Updates configuration artifact detection to new paths, ensuring that users can easily locate and manage their configuration files, enhancing the overall user experience.

### 🐛 Bug Fixes

- **core-resource-broker**: Enhances the reliability of the in-memory rate limit backend by fixing condition checks, ensuring a smoother user experience without unexpected request denials.

### ♻️ Code Refactoring

- **state-daemon**: Enhances the jobs manager and server, leading to improved stability and performance during task execution, which means users can rely on the system to handle jobs more efficiently.
- **sandbox**: Refines execution handlers and IPC messaging, resulting in faster and more reliable communication between processes, ensuring a smoother user experience when running sandboxed applications.

### 📝 Documentation

- **adr**: Updates to the platform and IPC (Inter-Process Communication) architecture ensure better compatibility and performance, allowing users to enjoy a more reliable and efficient experience.
- **changelog**: The changelog has been updated to clearly reflect all recent changes, helping users easily track improvements and new features in the software.

---

*Generated automatically by [**@kb-labs/release-manager**](https://github.com/kb-labs/kb-labs)*
*Part of the **KB Labs Platform** — Professional developer tools ecosystem*

<sub>© 2025 KB Labs. Released under KB Public License v1.1</sub>
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
