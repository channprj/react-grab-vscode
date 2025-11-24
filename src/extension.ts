import * as vscode from 'vscode';
import { WebSocketServer } from './websocket-server';
import { CopilotIntegration } from './copilot-integration';
import { StatusBarManager } from './status-bar';
import { Logger } from './utils/logger';

let websocketServer: WebSocketServer | undefined;
let copilotIntegration: CopilotIntegration | undefined;
let statusBarManager: StatusBarManager | undefined;
let logger: Logger | undefined;

export function activate(context: vscode.ExtensionContext): void {
  logger = new Logger('ReactGrabCopilot');
  logger.info('Extension activating...');

  // Initialize status bar
  statusBarManager = new StatusBarManager();
  context.subscriptions.push(statusBarManager);

  // Initialize Copilot integration
  copilotIntegration = new CopilotIntegration(logger);

  // Initialize WebSocket server
  const config = vscode.workspace.getConfiguration('reactGrabCopilot');
  const port = config.get<number>('websocketPort', 9765);
  const autoStart = config.get<boolean>('autoStart', true);

  websocketServer = new WebSocketServer(port, logger, copilotIntegration, statusBarManager);

  // Register commands
  const startServerCommand = vscode.commands.registerCommand(
    'react-grab-copilot.startServer',
    async () => {
      if (websocketServer && !websocketServer.isRunning()) {
        await websocketServer.start();
        vscode.window.showInformationMessage('React Grab WebSocket server started');
      } else {
        vscode.window.showWarningMessage('Server is already running');
      }
    }
  );

  const stopServerCommand = vscode.commands.registerCommand(
    'react-grab-copilot.stopServer',
    () => {
      if (websocketServer && websocketServer.isRunning()) {
        websocketServer.stop();
        vscode.window.showInformationMessage('React Grab WebSocket server stopped');
      } else {
        vscode.window.showWarningMessage('Server is not running');
      }
    }
  );

  const showStatusCommand = vscode.commands.registerCommand(
    'react-grab-copilot.showStatus',
    () => {
      if (websocketServer) {
        const status = websocketServer.isRunning() ? 'running' : 'stopped';
        const connectedClients = websocketServer.getConnectedClients();
        vscode.window.showInformationMessage(
          `Server Status: ${status} | Connected Clients: ${connectedClients}`
        );
      }
    }
  );

  context.subscriptions.push(startServerCommand, stopServerCommand, showStatusCommand);

  // Auto-start server if configured
  if (autoStart && websocketServer) {
    websocketServer.start().catch((error) => {
      logger?.error('Failed to auto-start server', error);
    });
  }

  // Handle configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('reactGrabCopilot')) {
        const newConfig = vscode.workspace.getConfiguration('reactGrabCopilot');
        const newPort = newConfig.get<number>('websocketPort', 9765);

        if (websocketServer && websocketServer.isRunning()) {
          vscode.window
            .showInformationMessage(
              'Configuration changed. Restart server to apply changes?',
              'Restart',
              'Cancel'
            )
            .then((selection) => {
              if (selection === 'Restart' && websocketServer) {
                websocketServer.stop();
                websocketServer = new WebSocketServer(
                  newPort,
                  logger!,
                  copilotIntegration!,
                  statusBarManager!
                );
                websocketServer.start().catch((error) => {
                  logger?.error('Failed to restart server', error);
                });
              }
            });
        }
      }
    })
  );

  logger.info('Extension activated successfully');
}

export function deactivate(): void {
  logger?.info('Extension deactivating...');

  if (websocketServer && websocketServer.isRunning()) {
    websocketServer.stop();
  }

  logger?.info('Extension deactivated');
}