# Contributing to KB Labs Core

Thanks for considering a contribution to **@kb-labs/core**!  
This project provides essential utilities and system interfaces for the KB Labs ecosystem.

---

## Development Setup

```bash
# Clone and install dependencies
git clone https://github.com/KirillBaranov/kb-labs-core.git
cd kb-labs-core
pnpm install

# Start development mode
pnpm dev

# Run tests
pnpm test
```

## Contribution Guidelines

### Code Quality
- **Coding style**: Follow ESLint + Prettier rules. Run `pnpm lint` before pushing.
- **TypeScript**: Use strict mode and proper type annotations.
- **Testing**: Cover all changes with Vitest tests. Run `pnpm test`.
- **Documentation**: Document all public APIs and complex logic.

### Commit Messages
Use conventional commit format:
- `feat: add new logging sink for Sentry`
- `fix: correct environment variable parsing`
- `docs: update API documentation`
- `refactor: simplify configuration validation`
- `test: add integration tests for filesystem module`

### Architecture Decisions

- For significant architectural changes, add an ADR in `docs/adr/`
- Follow the ADR template in `docs/adr/0000-template.md`
- Include required metadata (Date, Status, Deciders, **Last Reviewed**, **Tags**)
- **Last Reviewed** date is required and should be updated periodically
- **Tags** are mandatory (minimum 1, maximum 5 tags from approved list)
- See [Documentation Standard](./docs/DOCUMENTATION.md) for ADR format requirements

### Core Package Guidelines
- **API Stability**: Maintain backward compatibility for public APIs
- **Performance**: Consider performance implications of changes
- **Cross-platform**: Ensure compatibility across different operating systems
- **Error Handling**: Provide clear error messages and proper error types
- **Logging**: Use structured logging for debugging and monitoring

---

## Pull Request Process

1. **Fork** the repository and create a feature branch from `main`
2. **Make your changes** following the guidelines above
3. **Test thoroughly**:
   ```bash
   pnpm check  # Runs lint + type-check + tests
   ```
4. **Update documentation** if needed (README, API docs, ADRs)
5. **Submit a PR** with:
   - Clear description of changes
   - Reference to any related issues
   - Screenshots or examples if applicable

### PR Review Process
- All PRs require review from maintainers
- Address feedback promptly
- Keep PRs focused and reasonably sized
- Ensure CI passes before requesting review

---

## Adding New Core Packages

When adding a new core package:

1. **Create package structure**:
   ```bash
   cp -r packages/config packages/new-package-name
   ```

2. **Update package metadata**:
   - Update `package.json` with correct name and description
   - Update `tsconfig.json` if needed
   - Update build configuration

3. **Follow naming convention**:
   - Use `@kb-labs/core-*` namespace
   - Choose descriptive, clear names
   - Avoid abbreviations when possible

4. **Document the package**:
   - Add to main README.md
   - Create package-specific documentation
   - Include usage examples

---

## Questions?

- Open an issue for questions or discussions
- Check existing ADRs for architectural context
- Review existing code for patterns and conventions

---

**See [Documentation Standard](./docs/DOCUMENTATION.md) for complete documentation guidelines.**