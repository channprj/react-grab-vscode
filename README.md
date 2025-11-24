# React Grab for VSCode 🚀

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![VSCode](https://img.shields.io/badge/VSCode-%5E1.85.0-blue)
![pnpm](https://img.shields.io/badge/pnpm-10.22.0-orange)

Bridge between React element selection in the browser and AI assistants (GitHub Copilot & Claude Code) in VSCode.

## 🌟 Features

- **Visual Component Selection**: Hold `Cmd+C` (Mac) or `Ctrl+C` (Windows/Linux) and click to select React components with react-grab
- **AI Integration**: Seamlessly send prompts to GitHub Copilot Chat or Claude Code
- **Real-time Communication**: WebSocket-based real-time bridge between browser and VSCode
- **Smart Context**: Automatically extract component name, props, and JSX from react-grab
- **Copy Functionality**: Copy component info or JSX to clipboard for manual prompt creation
- **Status Indicators**: Visual feedback for connection status in both browser and VSCode
- **Per-Site Toggle**: Enable/disable the extension per website

## 📋 Prerequisites

- VSCode 1.85.0 or higher
- pnpm 10.22.0 or higher (for building from source)
- GitHub Copilot Chat extension (for Copilot features)
- Claude Code extension (for Claude features)
- Chrome or Edge browser
- React application with **react-grab** installed (`npm install react-grab`)

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

> 📘 **Detailed Guide**: For comprehensive installation and troubleshooting guide, see [CHROME_EXTENSION_GUIDE.md](CHROME_EXTENSION_GUIDE.md)

#### Option 1: Load from Source (Development)

1. **Clone or Download the Repository**

   ```bash
   git clone https://github.com/channprj/react-grab-vscode.git
   cd react-grab-vscode
   ```

2. **Open Chrome Extensions Page**

   - Open Chrome browser
   - Navigate to `chrome://extensions/`
   - Or use Menu: **⋮** → **More tools** → **Extensions**

3. **Enable Developer Mode**

   - Toggle the "Developer mode" switch in the top right corner
   - You'll see additional buttons appear

4. **Load the Extension**

   - Click **"Load unpacked"** button
   - Navigate to the cloned repository folder
   - Select the `browser-extension` folder specifically:
     ```
     react-grab-vscode/
     └── browser-extension/  ← Select this folder
         ├── manifest.json
         ├── content-script.js
         ├── inject.js
         ├── background.js
         ├── popup.html
         ├── popup.js
         └── styles.css
     ```
   - Click "Select Folder"

5. **Verify Installation**

   - The extension "React Grab to Copilot Bridge" should appear in your extensions list
   - You'll see an extension icon in the toolbar (puzzle piece icon area)
   - Pin it for easy access by clicking the pin icon

6. **Check Extension Status**
   - Click the extension icon to see connection status
   - It should show "Disconnected from VSCode" initially
   - Once VSCode extension is running, it will show "Connected"

#### Option 2: Load in Edge Browser

1. **For Microsoft Edge Users**
   - Navigate to `edge://extensions/`
   - Enable "Developer mode" (left sidebar)
   - Click "Load unpacked"
   - Select the `browser-extension` folder
   - Same process as Chrome

#### Updating the Extension

After making changes to the browser extension code:

1. Go to `chrome://extensions/`
2. Find "React Grab to Copilot Bridge"
3. Click the **refresh** icon (↻) on the extension card
4. Reload any open tabs to apply changes

#### Troubleshooting Chrome Extension

**Extension doesn't appear:**

- Ensure you selected the `browser-extension` folder, not the root folder
- Check for errors in the extension card (red error button)
- Click "Errors" to see detailed error messages

**Connection issues:**

- Verify VSCode extension is running (check status bar)
- Check if port 9765 is not blocked by firewall
- Open Chrome DevTools Console (F12) and look for `[React Grab Bridge]` messages
- Try reloading the extension and the web page

**Debugging the Extension:**

1. **Background Script (Service Worker)**

   - Go to `chrome://extensions/`
   - Click "Service Worker" link on the extension card
   - Opens DevTools for background script

2. **Content Script**

   - Open DevTools on any webpage (F12)
   - Check Console for content script logs
   - Look for `[React Grab Bridge]` prefixed messages

3. **Popup**
   - Right-click the extension icon
   - Select "Inspect popup"
   - Opens DevTools for the popup

#### File Permissions

If you encounter permission issues, ensure the files have proper permissions:

```bash
chmod -R 755 browser-extension/
```

## 📖 Usage

### Basic Workflow

1. **Install react-grab in Your React App**

   ```bash
   npm install react-grab
   # or
   pnpm add react-grab
   ```

   Then wrap your app with the `<Grab>` component:
   ```jsx
   import { Grab } from 'react-grab';

   function App() {
     return (
       <Grab>
         {/* Your app components */}
       </Grab>
     );
   }
   ```

2. **Start VSCode Extension**

   - The WebSocket server starts automatically (port 9765)
   - Check the status bar for connection indicator

3. **Open Your React App**

   - Navigate to your React application in Chrome/Edge
   - Ensure the browser extension is active (check extension icon)

4. **Select a Component with react-grab**

   - Hold `Cmd+C` (Mac) or `Ctrl+C` (Windows/Linux)
   - While holding, click on any React component
   - Your cursor will turn into a crosshair when hovering over selectable components
   - react-grab will capture the component's JSX
   - A dialog will appear with component information

5. **Choose Your Action**

   - **Copy Component Info**: Copy component details to clipboard for manual use
   - **Copy JSX**: Copy the raw JSX to clipboard
   - **Send to AI**: Choose between GitHub Copilot or Claude Code

6. **Get AI Response**
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

| Script             | Description                |
| ------------------ | -------------------------- |
| `pnpm run compile` | Build TypeScript files     |
| `pnpm run watch`   | Watch mode for development |
| `pnpm run package` | Create VSIX package        |
| `pnpm run lint`    | Run ESLint                 |
| `pnpm test`        | Run tests                  |

### Testing Locally

1. **VSCode Extension**

   - Press `F5` in VSCode to launch debug instance
   - The extension will be active in the new window

2. **Chrome Extension**
   - Load unpacked extension from `browser-extension` folder
   - Open any React application with react-grab installed
   - Test component selection by holding `Cmd+C` (Mac) or `Ctrl+C` (Windows/Linux) and clicking

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

- WebSocket connection may fail if port 9765 is in use
- react-grab must be installed and properly configured in your React app
- The extension monitors clipboard changes to detect react-grab selections
- Some React versions may have limited component name detection

## 🗺️ Roadmap

- [ ] Support for more AI assistants
- [ ] History and saved prompts

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/react-grab-vscode/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/react-grab-vscode/discussions)
- **Email**: support@example.com

## 🚨 Troubleshooting

### WebSocket Connection Failed

1. Check if port 9765 is available
2. Restart VSCode extension
3. Check firewall settings
4. Verify browser extension is installed

### Component Not Detected

1. Ensure react-grab is installed in your React app (`npm install react-grab`)
2. Verify your app is wrapped with the `<Grab>` component from react-grab
3. Hold Cmd+C (Mac) or Ctrl+C (Windows/Linux) and click on a component
4. Check browser console for `[React Grab Bridge]` messages
5. Try refreshing the page and trying again

### AI Assistant Not Responding

1. Check if Copilot/Claude extension is installed
2. Verify you're logged in to the service
3. Restart VSCode
4. Check extension logs (Output panel)

---

Made with ❤️ by the React Grab VSCode team
