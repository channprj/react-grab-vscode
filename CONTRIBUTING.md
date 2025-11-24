# Contributing to React Grab for VSCode

First off, thank you for considering contributing to React Grab for VSCode! It's people like you that make this tool better for everyone.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Process](#development-process)
- [Style Guidelines](#style-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please be respectful and considerate in all interactions.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/react-grab-vscode.git
   cd react-grab-vscode
   ```
3. **Install dependencies**:
   ```bash
   pnpm install
   ```
4. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 🤝 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **System information** (OS, VSCode version, browser)
- **Screenshots** if applicable
- **Error messages** from console/logs

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- **Use case** for the feature
- **Expected behavior**
- **Alternative solutions** you've considered
- **Additional context** or mockups

### Code Contributions

1. **Small fixes** (typos, small bugs) can be submitted directly
2. **Large features** should be discussed in an issue first
3. **Breaking changes** require thorough discussion

## 💻 Development Process

### Setting Up Development Environment

```bash
# Install dependencies
pnpm install

# Start development build
pnpm run watch

# In VSCode, press F5 to launch debug instance
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm run test:coverage

# Run specific test file
pnpm test -- path/to/test
```

### Building

```bash
# Development build
pnpm run compile

# Production build
pnpm run build

# Package extension
pnpm run package
```

## 🎨 Style Guidelines

### TypeScript Style Guide

```typescript
// Use interfaces for object types
interface IUserData {
  id: string;
  name: string;
}

// Use async/await over promises
async function fetchData(): Promise<IUserData> {
  const response = await fetch('/api/user');
  return response.json();
}

// Document public APIs
/**
 * Connects to the WebSocket server
 * @param port - Server port number
 * @returns Promise that resolves when connected
 */
public async connect(port: number): Promise<void> {
  // Implementation
}
```

### File Structure

- Use kebab-case for file names: `websocket-server.ts`
- Group related files in folders
- Keep files focused and < 300 lines
- Extract complex logic into separate files

### Code Quality

- No `console.log` in production code
- Handle all promise rejections
- Add error boundaries for user-facing features
- Write self-documenting code
- Add comments only for complex logic

## 📝 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Test additions or fixes
- **chore**: Build process or auxiliary tool changes

### Examples

```bash
# Feature
git commit -m "feat(websocket): add reconnection logic"

# Bug fix
git commit -m "fix(copilot): handle missing extension gracefully"

# Documentation
git commit -m "docs: update installation instructions"

# Multiple changes (use body)
git commit -m "feat(ui): add dark mode support

- Add theme detection
- Update CSS variables
- Store preference in settings"
```

## 🔄 Pull Request Process

### Before Submitting

1. **Update documentation** for any changed functionality
2. **Add tests** for new features
3. **Run the test suite** and ensure all pass
4. **Run linter** and fix any issues:
   ```bash
   pnpm run lint
   ```
5. **Update README.md** if needed

### PR Guidelines

1. **Title**: Use conventional commit format
2. **Description**:
   - Explain what changes you made
   - Why you made them
   - Link related issues with `Fixes #123`
3. **Screenshots**: Include for UI changes
4. **Breaking changes**: Clearly document

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings

## Screenshots
(if applicable)

## Related Issues
Fixes #(issue number)
```

### Review Process

1. **Automated checks** must pass
2. **Code review** from maintainer
3. **Address feedback** promptly
4. **Squash commits** if requested
5. **Celebrate** when merged! 🎉

## 🧪 Testing Guidelines

### Unit Tests

```typescript
describe('WebSocketServer', () => {
  it('should connect successfully', async () => {
    const server = new WebSocketServer(8765);
    await expect(server.connect()).resolves.toBeUndefined();
  });

  it('should handle connection errors', async () => {
    const server = new WebSocketServer(0); // Invalid port
    await expect(server.connect()).rejects.toThrow();
  });
});
```

### Integration Tests

Test interactions between components:

```typescript
it('should send prompt to Copilot', async () => {
  const message = { type: 'prompt', prompt: 'Test prompt' };
  await sendMessage(message);
  expect(copilotMock).toHaveBeenCalledWith('Test prompt');
});
```

## 📚 Resources

- [VSCode Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Chrome Extension Best Practices](https://developer.chrome.com/docs/extensions/mv3/best-practices/)

## 🤔 Questions?

Feel free to:
- Open an issue for discussion
- Join our Discord server (coming soon)
- Email maintainers

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🙏