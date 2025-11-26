import { WebSocketServer as WSServer, WebSocket } from 'ws';
import * as vscode from 'vscode';
import { CopilotIntegration } from './copilot-integration';
import { StatusBarManager } from './status-bar';
import { Logger } from './utils/logger';

interface MessageFromBrowser {
  type: 'prompt' | 'ping' | 'element-context';
  prompt?: string;
  target?: 'copilot' | 'claude'; // Which AI assistant to use
  elementInfo?: {
    tagName: string;
    className: string;
    id: string;
    props?: Record<string, unknown>;
    componentName?: string;
    path?: string;
    jsx?: string;
    filePath?: string;
    markdownContext?: string; // Full markdown context from react-grab
  };
  timestamp: number;
}

interface MessageToBrowser {
  type: 'success' | 'error' | 'pong' | 'status';
  message?: string;
  timestamp: number;
}

export class WebSocketServer {
  private wss: WSServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private running = false;

  constructor(
    private port: number,
    private logger: Logger,
    private copilotIntegration: CopilotIntegration,
    private statusBar: StatusBarManager
  ) {}

  async start(): Promise<void> {
    if (this.running) {
      this.logger.warn('WebSocket server is already running');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.wss = new WSServer({ port: this.port });

        this.wss.on('connection', (ws: WebSocket) => {
          this.handleConnection(ws);
        });

        this.wss.on('listening', () => {
          this.running = true;
          this.logger.info(`WebSocket server listening on port ${this.port}`);
          this.statusBar.updateStatus('running', this.clients.size);
          resolve();
        });

        this.wss.on('error', (error) => {
          this.logger.error('WebSocket server error', error);
          this.statusBar.updateStatus('error', 0);
          reject(error);
        });

      } catch (error) {
        this.logger.error('Failed to create WebSocket server', error);
        reject(error);
      }
    });
  }

  stop(): void {
    if (!this.running || !this.wss) {
      return;
    }

    this.clients.forEach((ws) => {
      ws.close();
    });
    this.clients.clear();

    this.wss.close(() => {
      this.logger.info('WebSocket server stopped');
      this.running = false;
      this.statusBar.updateStatus('stopped', 0);
    });

    this.wss = null;
  }

  isRunning(): boolean {
    return this.running;
  }

  getConnectedClients(): number {
    return this.clients.size;
  }

  private handleConnection(ws: WebSocket): void {
    this.clients.add(ws);
    this.logger.info('New client connected');
    this.statusBar.updateStatus('running', this.clients.size);

    // Send initial status
    this.sendMessage(ws, {
      type: 'status',
      message: 'Connected to React Grab VSCode Extension',
      timestamp: Date.now(),
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as MessageFromBrowser;
        await this.handleMessage(ws, message);
      } catch (error) {
        this.logger.error('Failed to handle message', error);
        this.sendMessage(ws, {
          type: 'error',
          message: 'Failed to process message',
          timestamp: Date.now(),
        });
      }
    });

    ws.on('close', () => {
      this.clients.delete(ws);
      this.logger.info('Client disconnected');
      this.statusBar.updateStatus('running', this.clients.size);
    });

    ws.on('error', (error) => {
      this.logger.error('WebSocket client error', error);
      this.clients.delete(ws);
      this.statusBar.updateStatus('running', this.clients.size);
    });

    // Set up ping/pong for connection health check
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // Ping every 30 seconds
  }

  private async handleMessage(ws: WebSocket, message: MessageFromBrowser): Promise<void> {
    this.logger.info(`Received message type: ${message.type}`);

    switch (message.type) {
      case 'prompt':
        await this.handlePromptMessage(ws, message);
        break;

      case 'ping':
        this.sendMessage(ws, {
          type: 'pong',
          timestamp: Date.now(),
        });
        break;

      case 'element-context':
        await this.handleElementContextMessage(ws, message);
        break;

      default:
        this.logger.warn(`Unknown message type: ${message.type}`);
        this.sendMessage(ws, {
          type: 'error',
          message: `Unknown message type: ${message.type}`,
          timestamp: Date.now(),
        });
    }
  }

  private async handlePromptMessage(ws: WebSocket, message: MessageFromBrowser): Promise<void> {
    if (!message.prompt) {
      this.sendMessage(ws, {
        type: 'error',
        message: 'No prompt provided',
        timestamp: Date.now(),
      });
      return;
    }

    const config = vscode.workspace.getConfiguration('reactGrabCopilot');
    const includeContext = config.get<boolean>('includeElementContext', false);
    const showNotifications = config.get<boolean>('showNotifications', true);

    let finalPrompt = message.prompt;

    // Include element context if configured and available
    if (includeContext && message.elementInfo) {
      const context = this.formatElementContext(message.elementInfo);
      finalPrompt = `${message.prompt}\n\nContext:\n${context}`;
    }

    // Determine which AI assistant to use
    const target = message.target || 'copilot';
    const targetName = target === 'claude' ? 'Claude Code' : 'Copilot Chat';

    try {
      // Execute prompt in the selected AI assistant
      await this.copilotIntegration.executePrompt(finalPrompt, target);

      if (showNotifications) {
        vscode.window.showInformationMessage(`Prompt sent to ${targetName}`);
      }

      this.sendMessage(ws, {
        type: 'success',
        message: 'Prompt executed successfully',
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error(`Failed to execute prompt in ${targetName}`, error);

      this.sendMessage(ws, {
        type: 'error',
        message: `Failed to execute prompt in ${targetName}`,
        timestamp: Date.now(),
      });

      if (showNotifications) {
        vscode.window.showErrorMessage(`Failed to send prompt to ${targetName}`);
      }
    }
  }

  private async handleElementContextMessage(
    ws: WebSocket,
    message: MessageFromBrowser
  ): Promise<void> {
    if (!message.elementInfo) {
      this.sendMessage(ws, {
        type: 'error',
        message: 'No element context provided',
        timestamp: Date.now(),
      });
      return;
    }

    // Store element context for potential use
    this.logger.info('Received element context', message.elementInfo);

    this.sendMessage(ws, {
      type: 'success',
      message: 'Element context received',
      timestamp: Date.now(),
    });
  }

  private formatElementContext(elementInfo: MessageFromBrowser['elementInfo']): string {
    if (!elementInfo) return '';

    // If markdown context is provided from react-grab, use it directly
    if (elementInfo.markdownContext) {
      return elementInfo.markdownContext;
    }

    // Fallback to constructing context manually
    let context = `## ${elementInfo.componentName || 'Unknown'}\n\n`;

    if (elementInfo.filePath) {
      context += `**Source:** \`${elementInfo.filePath}\`\n\n`;
    }

    if (elementInfo.jsx) {
      context += `### JSX\n\`\`\`jsx\n${elementInfo.jsx}\n\`\`\`\n\n`;
    }

    if (elementInfo.path) {
      context += `**Element Path:** \`${elementInfo.path}\`\n\n`;
    }

    if (elementInfo.props && Object.keys(elementInfo.props).length > 0) {
      context += `### Props\n\`\`\`json\n${JSON.stringify(elementInfo.props, null, 2)}\n\`\`\`\n\n`;
    }

    context += `### Element Info\n`;
    context += `- **Tag:** \`${elementInfo.tagName}\`\n`;

    if (elementInfo.id) {
      context += `- **ID:** \`${elementInfo.id}\`\n`;
    }
    if (elementInfo.className) {
      context += `- **Classes:** \`${elementInfo.className}\`\n`;
    }

    return context;
  }

  private sendMessage(ws: WebSocket, message: MessageToBrowser): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}