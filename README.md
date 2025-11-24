# React Grab for VSCode 🚀

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![VSCode](https://img.shields.io/badge/VSCode-%5E1.85.0-blue)
![pnpm](https://img.shields.io/badge/pnpm-10.22.0-orange)

Bridge between React element selection in the browser and AI assistants (GitHub Copilot & Claude Code) in VSCode.

## 🌟 Features

- **Visual Component Selection**: Select any React component directly in your browser using `Cmd/Ctrl + Click`
- **AI Integration**: Seamlessly send prompts to GitHub Copilot Chat or Claude Code
- **Real-time Communication**: WebSocket-based real-time bridge between browser and VSCode
- **Smart Context**: Optionally include component props and metadata in your prompts
- **Status Indicators**: Visual feedback for connection status in both browser and VSCode

## 📋 Prerequisites

- VSCode 1.85.0 or higher
- pnpm 10.22.0 or higher (for building from source)
- GitHub Copilot Chat extension (for Copilot features)
- Claude Code extension (for Claude features)
- Chrome or Edge browser
- React application for testing

## 🚀 Quick Start

### Option 1: Install from VSIX (Recommended)

1. Download the latest `.vsix` file from releases
2. Open VSCode
3. Press `Cmd/Ctrl + Shift + P`
4. Run "Extensions: Install from VSIX..."
5. Select the downloaded `.vsix` file

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/react-grab-vscode.git
cd react-grab-vscode

# Install dependencies
pnpm install

# Build the extension
pnpm run compile

# Package the extension
pnpm run package
```

## 🔧 Installation

### VSCode Extension

1. **From Marketplace** (Coming Soon)
   - Search for "React Grab for Copilot" in VSCode Extensions
   - Click Install

2. **From Source**
   ```bash
   # Build and install locally
   pnpm install
   pnpm run compile

   # Open VSCode in the project directory
   code .

   # Press F5 to run the extension in debug mode
   ```

### Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `browser-extension` folder from this repository
5. The extension icon should appear in your toolbar

## 📖 Usage

### Basic Workflow

1. **Start VSCode Extension**
   - The WebSocket server starts automatically (port 8765)
   - Check the status bar for connection indicator

2. **Open Your React App**
   - Navigate to your React application in Chrome/Edge
   - Ensure the browser extension is active

3. **Select a Component**
   - Hold `Cmd` (Mac) or `Ctrl` (Windows/Linux)
   - Click on any React component in the page
   - A dialog will appear

4. **Choose AI Assistant**
   - Select between GitHub Copilot or Claude Code
   - Enter your prompt about the selected component

5. **Get AI Response**
   - The prompt is sent to VSCode
   - The selected AI assistant opens with your prompt
   - Get instant code suggestions and explanations

### Configuration

Configure the extension in VSCode settings:

```json
{
  "reactGrabCopilot.websocketPort": 8765,
  "reactGrabCopilot.autoStart": true,
  "reactGrabCopilot.autoExecute": true,
  "reactGrabCopilot.includeElementContext": false,
  "reactGrabCopilot.showNotifications": true
}
```

| Setting | Description | Default |
|---------|-------------|---------|
| `websocketPort` | Port for WebSocket server | 8765 |
| `autoStart` | Start server automatically | true |
| `autoExecute` | Auto-execute prompts in AI chat | true |
| `includeElementContext` | Include component props in prompt | false |
| `showNotifications` | Show notification messages | true |

## 🏗️ Architecture

### Clean Architecture Implementation

```
┌─────────────────┐     WebSocket      ┌──────────────────┐
│                 │◄───────────────────►│                  │
│  Chrome Extension│                    │  VSCode Extension │
│                 │                     │                  │
└────────┬────────┘                     └────────┬─────────┘
         │                                        │
         │                                        │
    ┌────▼────┐                            ┌─────▼──────┐
    │         │                            │            │
    │  React  │                            │  Copilot/  │
    │   App   │                            │   Claude   │
    │         │                            │            │
    └─────────┘                            └────────────┘
```

### Project Structure

```
react-grab-vscode/
├── src/                     # VSCode Extension source
│   ├── domain/             # Business logic
│   ├── application/        # Use cases
│   ├── infrastructure/     # External interfaces
│   └── extension.ts        # Entry point
├── browser-extension/      # Chrome Extension
│   ├── manifest.json       # Extension manifest
│   ├── content-script.js   # Page interaction
│   └── styles.css          # UI styles
├── test/                   # Test files
├── package.json            # Node dependencies
└── README.md              # This file
```

## 🛠️ Development

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/yourusername/react-grab-vscode.git
cd react-grab-vscode

# Install dependencies
pnpm install

# Start development
pnpm run watch

# Run tests
pnpm test

# Build for production
pnpm run compile

# Package extension
pnpm run package
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm run compile` | Build TypeScript files |
| `pnpm run watch` | Watch mode for development |
| `pnpm run package` | Create VSIX package |
| `pnpm run lint` | Run ESLint |
| `pnpm test` | Run tests |

### Testing Locally

1. **VSCode Extension**
   - Press `F5` in VSCode to launch debug instance
   - The extension will be active in the new window

2. **Chrome Extension**
   - Load unpacked extension from `browser-extension` folder
   - Open any React application
   - Test component selection with `Cmd/Ctrl + Click`

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Maintain Clean Architecture principles
- Write tests for new features
- Update documentation as needed
- Follow conventional commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [react-grab](https://github.com/aidenybai/react-grab) - React element selection library
- [GitHub Copilot](https://github.com/features/copilot) - AI pair programmer
- [Claude Code](https://claude.ai) - AI coding assistant
- VSCode Extension API documentation
- Open source community

## 🐛 Known Issues

- WebSocket connection may fail if port 8765 is in use
- React DevTools must be installed for optimal component detection
- Some React versions may have limited component name detection

## 🗺️ Roadmap

- [ ] Support for Vue.js components
- [ ] Multi-port configuration
- [ ] Secure WebSocket with authentication
- [ ] Browser DevTools panel integration
- [ ] Support for more AI assistants
- [ ] Component tree visualization
- [ ] Batch prompt processing
- [ ] History and saved prompts

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/react-grab-vscode/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/react-grab-vscode/discussions)
- **Email**: support@example.com

## 🚨 Troubleshooting

### WebSocket Connection Failed

1. Check if port 8765 is available
2. Restart VSCode extension
3. Check firewall settings
4. Verify browser extension is installed

### Component Not Detected

1. Ensure React DevTools is installed
2. Check if the app uses React 16.8+
3. Try refreshing the page
4. Verify element is a React component

### AI Assistant Not Responding

1. Check if Copilot/Claude extension is installed
2. Verify you're logged in to the service
3. Restart VSCode
4. Check extension logs (Output panel)

---

Made with ❤️ by the React Grab VSCode team