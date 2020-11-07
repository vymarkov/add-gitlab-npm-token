import * as vscode from 'vscode';

class Logger {
  private readonly logger = vscode.window.createOutputChannel('GitLab NPM Registry')
  log (msg: string) {
    this.logger.appendLine(msg)
  }

  warn (msg: string) {
    this.logger.appendLine(msg)
  }
}

export const logger = new Logger()
