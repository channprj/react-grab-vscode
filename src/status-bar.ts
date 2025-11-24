import * as vscode from 'vscode';

export class StatusBarManager implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private status: 'stopped' | 'running' | 'error' = 'stopped';
  private connectedClients = 0;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'react-grab-copilot.showStatus';
    this.updateDisplay();
    this.statusBarItem.show();
  }

  updateStatus(status: 'stopped' | 'running' | 'error', connectedClients: number): void {
    this.status = status;
    this.connectedClients = connectedClients;
    this.updateDisplay();
  }

  private updateDisplay(): void {
    const icon = this.getStatusIcon();
    const tooltip = this.getTooltip();

    this.statusBarItem.text = `${icon} React Grab${
      this.connectedClients > 0 ? ` (${this.connectedClients})` : ''
    }`;
    this.statusBarItem.tooltip = tooltip;

    // Set color based on status
    switch (this.status) {
      case 'running':
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.color = new vscode.ThemeColor('statusBar.foreground');
        break;
      case 'stopped':
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.color = new vscode.ThemeColor('statusBar.debuggingForeground');
        break;
      case 'error':
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
        break;
    }
  }

  private getStatusIcon(): string {
    switch (this.status) {
      case 'running':
        return '$(plug)';
      case 'stopped':
        return '$(debug-disconnect)';
      case 'error':
        return '$(error)';
      default:
        return '$(question)';
    }
  }

  private getTooltip(): string {
    switch (this.status) {
      case 'running':
        return `React Grab WebSocket Server Running\nConnected clients: ${this.connectedClients}\nClick for details`;
      case 'stopped':
        return 'React Grab WebSocket Server Stopped\nClick to start';
      case 'error':
        return 'React Grab WebSocket Server Error\nClick for details';
      default:
        return 'React Grab Status Unknown';
    }
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}