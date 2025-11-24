import * as vscode from 'vscode';

export class Logger {
  private outputChannel: vscode.OutputChannel;

  constructor(name: string) {
    this.outputChannel = vscode.window.createOutputChannel(name);
  }

  info(message: string, ...args: any[]): void {
    this.log('INFO', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log('WARN', message, ...args);
  }

  error(message: string, error?: any): void {
    if (error instanceof Error) {
      this.log('ERROR', `${message}: ${error.message}`, error.stack);
    } else if (error) {
      this.log('ERROR', message, error);
    } else {
      this.log('ERROR', message);
    }
  }

  debug(message: string, ...args: any[]): void {
    // Only log debug messages in development mode
    if (process.env.NODE_ENV === 'development') {
      this.log('DEBUG', message, ...args);
    }
  }

  private log(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;

    // Log to output channel
    this.outputChannel.appendLine(formattedMessage);

    // Log additional arguments if any
    if (args.length > 0) {
      args.forEach((arg) => {
        if (typeof arg === 'object') {
          this.outputChannel.appendLine(JSON.stringify(arg, null, 2));
        } else {
          this.outputChannel.appendLine(String(arg));
        }
      });
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(formattedMessage, ...args);
    }
  }

  show(): void {
    this.outputChannel.show();
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}