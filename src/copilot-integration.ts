import * as vscode from 'vscode';
import { Logger } from './utils/logger';

export class CopilotIntegration {
  constructor(private logger: Logger) {}

  /**
   * Execute a prompt in GitHub Copilot Chat or Claude Code
   * This opens the appropriate AI assistant and sends the prompt
   */
  async executePrompt(prompt: string, target: 'copilot' | 'claude' = 'copilot'): Promise<void> {
    try {
      // Validate prompt
      if (!prompt || prompt.trim().length === 0) {
        throw new Error('Prompt cannot be empty');
      }

      const config = vscode.workspace.getConfiguration('reactGrabCopilot');
      const autoExecute = config.get<boolean>('autoExecute', true);

      if (target === 'claude') {
        await this.executeClaude(prompt, autoExecute);
      } else {
        await this.executeCopilot(prompt, autoExecute);
      }

    } catch (error) {
      this.logger.error(`Failed to execute prompt in ${target}`, error);
      throw error;
    }
  }

  /**
   * Execute prompt in GitHub Copilot Chat
   */
  private async executeCopilot(prompt: string, autoExecute: boolean): Promise<void> {
    // Check if Copilot extension is installed
    const copilotExtension = vscode.extensions.getExtension('GitHub.copilot-chat');

    if (!copilotExtension) {
      throw new Error(
        'GitHub Copilot Chat extension is not installed. Please install it from the VSCode marketplace.'
      );
    }

    // Ensure Copilot extension is activated
    if (!copilotExtension.isActive) {
      await copilotExtension.activate();
      this.logger.info('GitHub Copilot Chat extension activated');
    }

    // Execute the command to open Copilot Chat with the prompt
    // The 'workbench.action.chat.open' command allows passing a query directly
    await vscode.commands.executeCommand('workbench.action.chat.open', {
      query: prompt,
    });

    this.logger.info('Prompt sent to Copilot Chat successfully');

    // If auto-execute is disabled, just insert the prompt without executing
    if (!autoExecute) {
      this.logger.info('Auto-execute disabled, prompt inserted but not executed');
    }
  }

  /**
   * Execute prompt in Claude Code
   */
  private async executeClaude(prompt: string, autoExecute: boolean): Promise<void> {
    // Check if Claude Code is available through various common commands
    const claudeCommands = [
      'claude.openChat',           // Claude Code official command
      'claude-code.chat',          // Alternative Claude Code command
      'workbench.action.chat.open' // Generic chat command that might work with Claude
    ];

    let commandExecuted = false;

    for (const command of claudeCommands) {
      try {
        // Check if command exists
        const commands = await vscode.commands.getCommands();
        if (commands.includes(command)) {
          // Try to execute with the prompt
          await vscode.commands.executeCommand(command, {
            query: prompt,
            prompt: prompt, // Some commands might use 'prompt' instead of 'query'
          });

          this.logger.info(`Prompt sent to Claude Code using command: ${command}`);
          commandExecuted = true;
          break;
        }
      } catch (error) {
        this.logger.warn(`Failed to execute command ${command}:`, error);
      }
    }

    if (!commandExecuted) {
      // If no Claude-specific command works, try opening the chat and inserting text
      try {
        // Open the chat panel
        await vscode.commands.executeCommand('workbench.action.chat.open');

        // Try to insert the prompt into the active editor (chat input)
        await vscode.commands.executeCommand('editor.action.insertLineAfter');
        await vscode.commands.executeCommand('type', { text: prompt });

        if (autoExecute) {
          // Try to submit the prompt
          await vscode.commands.executeCommand('workbench.action.chat.submit');
        }

        this.logger.info('Prompt inserted into chat (Claude Code fallback method)');
      } catch (error) {
        throw new Error(
          'Could not send prompt to Claude Code. Please ensure Claude Code is installed and active, or switch to Copilot.'
        );
      }
    }

    if (!autoExecute) {
      this.logger.info('Auto-execute disabled, prompt inserted but not executed');
    }
  }

  /**
   * Check if GitHub Copilot Chat is available
   */
  isCopilotAvailable(): boolean {
    const copilotExtension = vscode.extensions.getExtension('GitHub.copilot-chat');
    return copilotExtension !== undefined && copilotExtension.isActive;
  }

  /**
   * Get information about the Copilot Chat extension
   */
  getCopilotInfo(): { installed: boolean; active: boolean; version?: string } {
    const copilotExtension = vscode.extensions.getExtension('GitHub.copilot-chat');

    if (!copilotExtension) {
      return { installed: false, active: false };
    }

    return {
      installed: true,
      active: copilotExtension.isActive,
      version: copilotExtension.packageJSON.version,
    };
  }

  /**
   * Show a notification to install Copilot if not available
   */
  async promptInstallCopilot(): Promise<void> {
    const selection = await vscode.window.showErrorMessage(
      'GitHub Copilot Chat is not installed. Would you like to install it?',
      'Install',
      'Cancel'
    );

    if (selection === 'Install') {
      await vscode.commands.executeCommand(
        'workbench.extensions.search',
        'GitHub.copilot-chat'
      );
    }
  }

  /**
   * Add context to the prompt based on current editor state
   */
  async enrichPromptWithContext(prompt: string): Promise<string> {
    let enrichedPrompt = prompt;

    // Get active editor information
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const document = activeEditor.document;
      const selection = activeEditor.selection;

      // Add file context
      enrichedPrompt += `\n\nCurrent file: ${document.fileName}`;
      enrichedPrompt += `\nLanguage: ${document.languageId}`;

      // Add selected text if any
      if (!selection.isEmpty) {
        const selectedText = document.getText(selection);
        enrichedPrompt += `\n\nSelected code:\n\`\`\`${document.languageId}\n${selectedText}\n\`\`\``;
      }
    }

    // Add workspace context
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      enrichedPrompt += `\n\nWorkspace: ${workspaceFolders[0].name}`;
    }

    return enrichedPrompt;
  }
}