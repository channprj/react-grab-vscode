# React Grab for VSCode 🚀

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

Read this in other languages: [한국어](README.ko.md)

> This project is highly inspired by [@aidenybai](https://github.com/aidenybai) and his [react-grab](https://github.com/aidenybai/react-grab)

Bridge between React element selection in the browser and AI assistants (GitHub Copilot & Claude Code) in VSCode.

<video src="https://github.com/user-attachments/assets/ca4e3081-3c89-47e1-aabb-2e02b2a744f8" width="600"></video>

<video src="https://github.com/user-attachments/assets/61d34ceb-bc79-4d9c-91c5-1e1746039013" width="600"></video>

## Summary

- Select any React component visually in your browser using React fiber inspection
- Instantly send JSX, props, and context to GitHub Copilot or Claude Code in VSCode
- Real-time WebSocket connection between your browser and IDE
- Hold `opt` (Mac) or `alt` (Windows/Linux), click a component, and ask AI anything about it

## 🌟 Features

- **Visual Component Selection**: Hold `opt` (Mac) or `alt` (Windows/Linux) and click to select React components
- **AI Integration**: Seamlessly send prompts to GitHub Copilot Chat or Claude Code
- **Real-time Communication**: WebSocket-based real-time bridge between browser and VSCode
- **Smart Context**: Automatically extract component name, props, and JSX via React fiber inspection
- **Copy Functionality**: Copy component info or JSX to clipboard for manual prompt creation
- **Status Indicators**: Visual feedback for connection status in both browser and VSCode
- **Per-Site Toggle**: Enable/disable the extension per website

## 📋 Prerequisites

- VSCode 1.85.0 or higher
- pnpm 10.22.0 or higher (for building from source)
- GitHub Copilot Chat extension (for Copilot features)
- Claude Code extension (for Claude features)
- Chrome or Edge browser
- Any React application (no additional setup required)

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

#### Build and Install

1. **Build the Extension**

   ```bash
   # Install dependencies and build
   pnpm browser:install
   pnpm browser:build
   ```

2. **Load in Chrome**

   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select `browser-extension/dist` folder

3. **Load in Edge**
   - Navigate to `edge://extensions/`
   - Enable "Developer mode" (left sidebar)
   - Click "Load unpacked"
   - Select `browser-extension/dist` folder

#### Development Mode

For auto-rebuild during development:

```bash
pnpm browser:dev
```

#### Updating the Extension

After code changes:

1. Rebuild: `pnpm browser:build`
2. Go to `chrome://extensions/`
3. Click the refresh icon (↻) on the extension card
4. Reload any open tabs

#### Troubleshooting

**Extension doesn't appear:**

- Ensure you selected `browser-extension/dist` folder (not `browser-extension`)
- Check for errors in the extension card

**Connection issues:**

- Verify VSCode extension is running (check status bar)
- Check if port 9765 is not blocked by firewall
- Open Chrome DevTools Console (F12) and look for `[React Grab Bridge]` messages

## 📖 Usage

### Basic Workflow

1. **Start VSCode Extension**

   - The WebSocket server starts automatically (port 9765)
   - Check the status bar for connection indicator

2. **Open Your React App**

   - Navigate to your React application in Chrome/Edge
   - Ensure the browser extension is active (check extension icon)

3. **Select a Component**

   - Hold `option` (Mac) or `alt` (Windows/Linux)
   - While holding, click on any React component
   - Your cursor will turn into a crosshair when hovering over selectable components
   - The browser extension will capture the component's JSX via React fiber inspection
   - A dialog will appear with component information

4. **Choose Your Action**

   - **Copy Component Info**: Copy component details to clipboard for manual use
   - **Copy JSX**: Copy the raw JSX to clipboard
   - **Send to AI**: Choose between GitHub Copilot or Claude Code

5. **Get AI Response**
   - If sending to AI, enter your prompt about the component
   - The prompt is sent to VSCode
   - The selected AI assistant opens with your prompt and component context

### Configuration

Configure the extension in VSCode settings:

```json
{
  "reactGrabCopilot.websocketPort": 9765,
  "reactGrabCopilot.autoStart": true,
  "reactGrabCopilot.autoExecute": true,
  "reactGrabCopilot.includeElementContext": false,
  "reactGrabCopilot.showNotifications": true
}
```

| Setting                 | Description                       | Default |
| ----------------------- | --------------------------------- | ------- |
| `websocketPort`         | Port for WebSocket server         | 9765    |
| `autoStart`             | Start server automatically        | true    |
| `autoExecute`           | Auto-execute prompts in AI chat   | true    |
| `includeElementContext` | Include component props in prompt | false   |
| `showNotifications`     | Show notification messages        | true    |

## 🏗️ Architecture

### Clean Architecture Implementation

```
┌──────────────────┐     WebSocket       ┌──────────────────┐
│                  │◄───────────────────►│                  │
│ Chrome Extension │                     │ VSCode Extension │
│                  │                     │                  │
└────────┬─────────┘                     └───────┬──────────┘
         │                                       │
         │                                       │
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
├── src/                       # VSCode Extension source
│   ├── extension.ts           # Entry point
│   ├── websocket-server.ts    # WebSocket server
│   ├── copilot-integration.ts # AI integration
│   ├── status-bar.ts          # Status bar UI
│   └── utils/                 # Utilities
├── browser-extension/         # Chrome Extension
│   ├── src/                   # Source files (React + TypeScript)
│   ├── public/                # Static assets
│   ├── dist/                  # Build output (load this in Chrome)
│   └── vite.config.ts         # Vite configuration
├── package.json               # Node dependencies
└── README.md                  # This file
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

| Script                  | Description                          |
| ----------------------- | ------------------------------------ |
| `pnpm run compile`      | Build TypeScript files               |
| `pnpm run watch`        | Watch mode for development           |
| `pnpm run package`      | Create VSIX package                  |
| `pnpm run lint`         | Run ESLint                           |
| `pnpm test`             | Run tests                            |
| `pnpm browser:install`  | Install browser extension deps       |
| `pnpm browser:build`    | Build browser extension              |
| `pnpm browser:dev`      | Browser extension dev mode           |

### Testing Locally

1. **VSCode Extension**

   - Press `F5` in VSCode to launch debug instance
   - The extension will be active in the new window

2. **Chrome Extension**
   - Build with `pnpm browser:build`
   - Load unpacked extension from `browser-extension/dist` folder
   - Open any React application
   - Test component selection by holding `opt` (Mac) or `alt` (Windows/Linux) and clicking

### Development Guidelines

- Follow TypeScript best practices
- Maintain Clean Architecture principles
- Write tests for new features
- Update documentation as needed
- Follow conventional commit messages

## 📝 License

MIT License - see the [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [react-grab](https://github.com/aidenybai/react-grab) - Inspiration for React fiber inspection approach
- [GitHub Copilot](https://github.com/features/copilot) - AI pair programmer
- [Claude Code](https://claude.ai) - AI coding assistant
- VSCode Extension API documentation
- Open source community
