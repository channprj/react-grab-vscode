# Chrome Extension Installation & Usage Guide 🌐

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Installation Steps](#installation-steps)
- [Visual Installation Guide](#visual-installation-guide)
- [Usage Instructions](#usage-instructions)
- [Testing the Extension](#testing-the-extension)
- [Development & Debugging](#development--debugging)
- [Common Issues & Solutions](#common-issues--solutions)
- [Extension Architecture](#extension-architecture)

## 📋 Prerequisites

Before installing the Chrome Extension, ensure you have:

1. **Chrome Browser** (version 88 or higher) or **Microsoft Edge** (Chromium-based)
2. **Git** (to clone the repository) or download the ZIP file
3. **VSCode Extension** installed and running
4. A **React application** for testing

## 📥 Installation Steps

### Step 1: Get the Source Code

#### Option A: Clone with Git
```bash
git clone https://github.com/channprj/react-grab-vscode.git
cd react-grab-vscode
```

#### Option B: Download ZIP
1. Go to https://github.com/channprj/react-grab-vscode
2. Click "Code" → "Download ZIP"
3. Extract the ZIP file to your desired location

### Step 2: Locate the Browser Extension Folder

The browser extension is located in:
```
react-grab-vscode/
├── src/                    # VSCode extension source
├── browser-extension/      # ← THIS FOLDER
│   ├── manifest.json       # Extension configuration
│   ├── content-script.js   # Main functionality
│   ├── inject.js          # React DevTools integration
│   ├── background.js      # Service worker
│   ├── popup.html         # Popup UI
│   ├── popup.js           # Popup logic
│   └── styles.css         # Styling
└── ...
```

### Step 3: Open Chrome Extensions Page

There are three ways to access the extensions page:

1. **Direct URL**: Type `chrome://extensions/` in the address bar
2. **Menu Navigation**: Click **⋮** (three dots) → **More tools** → **Extensions**
3. **Keyboard Shortcut**: Type `chrome://extensions` and press Enter

### Step 4: Enable Developer Mode

Look for the **Developer mode** toggle in the top-right corner:

```
Extensions                                          Developer mode [ON]
```

Toggle it ON. You'll see three new buttons appear:
- Load unpacked
- Pack extension
- Update

### Step 5: Load the Extension

1. Click the **"Load unpacked"** button
2. In the file dialog, navigate to your `react-grab-vscode` folder
3. **IMPORTANT**: Select the `browser-extension` subfolder
4. Click "Select Folder" (Windows) or "Select" (Mac)

### Step 6: Verify Installation

After successful installation, you should see:

```
React Grab to Copilot Bridge
Version 0.1.0
Bridge between React Grab element selection and VSCode Copilot Chat

[Details] [Remove] [Errors]            Enabled ✓
```

### Step 7: Pin the Extension

1. Click the puzzle piece icon (🧩) in Chrome toolbar
2. Find "React Grab to Copilot Bridge"
3. Click the pin icon (📌) to keep it visible

## 🎨 Visual Installation Guide

### Chrome Extensions Page Layout
```
┌─────────────────────────────────────────────────────┐
│ Extensions                        Developer mode [✓] │
├─────────────────────────────────────────────────────┤
│ [Load unpacked] [Pack extension] [Update]          │
├─────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────┐  │
│ │ 🔗 React Grab to Copilot Bridge              │  │
│ │    Bridge between React Grab and VSCode      │  │
│ │    ID: abcdefghijklmnopqrstuvwxyz...        │  │
│ │    [Details] [Remove] [Errors]    Enabled ✓  │  │
│ └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Extension Popup Interface
```
┌──────────────────────────────┐
│ React Grab → AI Bridge       │
├──────────────────────────────┤
│ 🟢 Connected to VSCode       │
├──────────────────────────────┤
│ How to use:                  │
│ 1. Start VSCode extension    │
│ 2. Open React app            │
│ 3. Cmd/Ctrl + Click element  │
│ 4. Enter prompt              │
│ 5. Get AI response           │
├──────────────────────────────┤
│ WebSocket Port: 8765         │
└──────────────────────────────┘
```

## 🎯 Usage Instructions

### Basic Workflow

1. **Ensure VSCode Extension is Running**
   - Open VSCode with the React Grab extension
   - Check status bar shows "React Grab (connected)"

2. **Open Your React Application**
   - Navigate to any React website/app in Chrome
   - The extension works on any webpage with React components

3. **Select a React Component**
   ```
   Hold Cmd (Mac) or Ctrl (Windows/Linux) + Click on any element
   ```

4. **Use the Dialog**
   ```
   ┌─────────────────────────────────────┐
   │ Send to AI Assistant          [X]  │
   ├─────────────────────────────────────┤
   │ Selected: div.user-card             │
   ├─────────────────────────────────────┤
   │ [🤖 GitHub Copilot] [🧠 Claude]    │
   ├─────────────────────────────────────┤
   │ ┌─────────────────────────────────┐ │
   │ │ Ask about this component...     │ │
   │ │                                 │ │
   │ └─────────────────────────────────┘ │
   ├─────────────────────────────────────┤
   │        [Cancel] [Send to Copilot]   │
   └─────────────────────────────────────┘
   ```

5. **Get AI Response in VSCode**
   - The prompt is sent to VSCode
   - Copilot Chat or Claude Code opens automatically
   - AI provides response based on the component context

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Select Element | `Cmd/Ctrl + Click` |
| Send Prompt | `Cmd/Ctrl + Enter` (in dialog) |
| Cancel Dialog | `Esc` |

## 🧪 Testing the Extension

### Quick Test

1. **Test Connection**
   - Click the extension icon
   - Should show connection status

2. **Test on a Simple React Page**
   ```html
   <!-- Save as test.html and open in Chrome -->
   <div id="root"></div>
   <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
   <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
   <script>
     const App = () => React.createElement('div', {className: 'test'}, 'Hello React!');
     ReactDOM.render(React.createElement(App), document.getElementById('root'));
   </script>
   ```

3. **Verify Component Selection**
   - Hold Cmd/Ctrl and click "Hello React!"
   - Dialog should appear

### Testing with Real React Apps

Good testing sites:
- Your local React development server (`localhost:3000`)
- https://react.dev (React documentation)
- Any Create React App project
- Next.js applications
- Gatsby sites

## 🔧 Development & Debugging

### Viewing Console Logs

#### Content Script Logs
1. Open any webpage
2. Open DevTools (`F12`)
3. Go to Console tab
4. Filter by `[React Grab Bridge]`

#### Background Script Logs
1. Go to `chrome://extensions/`
2. Find the extension
3. Click "service worker" link
4. DevTools opens for background script

#### Popup Logs
1. Right-click extension icon
2. Select "Inspect popup"
3. DevTools opens for popup

### Making Changes

After modifying extension files:

1. Save your changes
2. Go to `chrome://extensions/`
3. Click the refresh icon (↻) on the extension card
4. Reload any tabs using the extension

### Development Tips

```javascript
// Add debug logging in content-script.js
console.log('[React Grab Bridge] Debug:', variable);

// Check connection status
if (ws.readyState === WebSocket.OPEN) {
  console.log('[React Grab Bridge] Connected');
}

// Monitor messages
ws.onmessage = (event) => {
  console.log('[React Grab Bridge] Received:', event.data);
};
```

## ❗ Common Issues & Solutions

### Issue: Extension Not Appearing

**Problem**: After loading, extension doesn't show up

**Solutions**:
```bash
# Check you selected the right folder
browser-extension/  ← Correct
react-grab-vscode/  ← Wrong

# Check for syntax errors in manifest.json
cat browser-extension/manifest.json | python -m json.tool

# Ensure all files exist
ls -la browser-extension/
```

### Issue: "Disconnected from VSCode"

**Problem**: Extension can't connect to VSCode

**Solutions**:
1. Start VSCode extension first
2. Check port 8765 is not in use:
   ```bash
   lsof -i :8765  # Mac/Linux
   netstat -an | findstr :8765  # Windows
   ```
3. Check firewall settings
4. Restart both extensions

### Issue: Component Selection Not Working

**Problem**: Cmd/Ctrl + Click doesn't open dialog

**Solutions**:
1. Ensure page has React components
2. Check if React DevTools can see components
3. Reload the page
4. Check console for errors
5. Verify content script is injected:
   ```javascript
   // In DevTools Console
   window.hasReactGrabExtension = true;
   ```

### Issue: Permission Errors

**Problem**: Extension shows permission errors

**Solutions**:
```bash
# Fix file permissions
chmod -R 755 browser-extension/

# Check manifest.json permissions
"permissions": ["activeTab", "storage"],
"host_permissions": ["<all_urls>"]
```

## 🏗️ Extension Architecture

### File Structure & Responsibilities

```
browser-extension/
├── manifest.json         # Extension configuration & permissions
├── content-script.js     # Runs in webpage context
│   ├── Element selection detection
│   ├── Dialog UI creation
│   ├── WebSocket client
│   └── Message handling
├── inject.js            # Injected into page DOM
│   ├── React DevTools access
│   ├── Component info extraction
│   └── Props/state reading
├── background.js        # Service worker (always running)
│   ├── Extension state management
│   ├── Badge updates
│   └── Cross-tab communication
├── popup.html/js        # Extension popup UI
│   ├── Connection status display
│   ├── Quick settings
│   └── Instructions
└── styles.css          # All UI styling
    ├── Dialog styles
    ├── Dark mode support
    └── Animations
```

### Data Flow

```
User clicks element
    ↓
content-script.js captures event
    ↓
inject.js extracts React info
    ↓
Dialog shows with AI options
    ↓
User enters prompt
    ↓
WebSocket sends to VSCode
    ↓
VSCode opens Copilot/Claude
    ↓
AI responds
```

### Security Model

- **Content Security**: Runs in isolated world
- **Permissions**: Minimal required (activeTab only)
- **Communication**: Localhost WebSocket only
- **Data**: No external data transmission

## 📚 Additional Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- [WebSocket API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [React DevTools Integration](https://github.com/facebook/react-devtools)
- [Project Repository](https://github.com/channprj/react-grab-vscode)

## 🆘 Need Help?

- Check the [main README](README.md)
- Open an [issue on GitHub](https://github.com/channprj/react-grab-vscode/issues)
- Review [closed issues](https://github.com/channprj/react-grab-vscode/issues?q=is%3Aissue+is%3Aclosed) for solutions

---

Last updated: November 2024