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
   * Tries multiple methods: VSCode Chat with @claude, Claude extension commands, and CLI fallback
   */
  private async executeClaude(prompt: string, _autoExecute: boolean): Promise<void> {
    const config = vscode.workspace.getConfiguration('reactGrabCopilot');
    const preferCli = config.get<boolean>('preferClaudeCli', false);

    // If user prefers CLI, try that first
    if (preferCli) {
      const cliSuccess = await this.executeClaudeCli(prompt);
      if (cliSuccess) {
        return;
      }
      this.logger.warn('Claude CLI failed, falling back to VSCode methods');
    }

    // Method 1: Try VSCode Chat with @claude participant
    const chatSuccess = await this.tryVSCodeChatWithClaude(prompt);
    if (chatSuccess) {
      this.logger.info('Prompt sent to Claude via VSCode Chat');
      return;
    }

    // Method 2: Try Claude extension specific commands
    const extensionSuccess = await this.tryClaudeExtensionCommands(prompt);
    if (extensionSuccess) {
      this.logger.info('Prompt sent via Claude extension command');
      return;
    }

    // Method 3: Fallback to Claude CLI in terminal
    if (!preferCli) {
      const cliSuccess = await this.executeClaudeCli(prompt);
      if (cliSuccess) {
        return;
      }
    }

    // All methods failed
    throw new Error(
      'Could not send prompt to Claude Code. Please ensure Claude Code CLI or VSCode extension is installed.'
    );
  }

  /**
   * Try sending prompt via VSCode Chat with @claude participant
   */
  private async tryVSCodeChatWithClaude(prompt: string): Promise<boolean> {
    try {
      const commands = await vscode.commands.getCommands();

      // Try using the chat open command with @claude prefix
      if (commands.includes('workbench.action.chat.open')) {
        // Prefix the prompt with @claude to direct it to Claude
        const claudePrompt = `@claude ${prompt}`;

        await vscode.commands.executeCommand('workbench.action.chat.open', {
          query: claudePrompt,
        });

        return true;
      }
    } catch (error) {
      this.logger.warn('Failed to use VSCode Chat with @claude:', error);
    }
    return false;
  }

  /**
   * Try Claude extension specific commands
   */
  private async tryClaudeExtensionCommands(prompt: string): Promise<boolean> {
    const claudeCommands = [
      'claude.newSession',           // Anthropic Claude Code extension
      'claude.openPanel',            // Alternative command
      'anthropic.claude.chat',       // Another possible command
      'claude-dev.openChat',         // Cline (formerly Claude Dev)
    ];

    const commands = await vscode.commands.getCommands();

    for (const command of claudeCommands) {
      if (commands.includes(command)) {
        try {
          await vscode.commands.executeCommand(command, {
            query: prompt,
            prompt: prompt,
            message: prompt,
          });
          return true;
        } catch (error) {
          this.logger.warn(`Failed to execute ${command}:`, error);
        }
      }
    }

    return false;
  }

  /**
   * Execute prompt using Claude Code CLI in the integrated terminal
   */
  private async executeClaudeCli(prompt: string): Promise<boolean> {
    try {
      // Escape the prompt for shell
      const escapedPrompt = prompt.replace(/'/g, "'\\''");

      // Create or reuse a terminal for Claude
      let terminal = vscode.window.terminals.find(t => t.name === 'Claude Code');

      if (!terminal) {
        terminal = vscode.window.createTerminal({
          name: 'Claude Code',
          hideFromUser: false,
        });
      }

      terminal.show();

      // Send the prompt to Claude CLI
      // Using the interactive mode (without -p) so user can see and interact
      terminal.sendText(`claude '${escapedPrompt}'`);

      this.logger.info('Prompt sent to Claude Code CLI');
      return true;
    } catch (error) {
      this.logger.error('Failed to execute Claude CLI:', error);
      return false;
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