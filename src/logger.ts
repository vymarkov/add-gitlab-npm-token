import * as vscode from 'vscode';
import { ILogger } from './types';

class Logger implements ILogger {
  private readonly logger = vscode.window.createOutputChannel('GitLab NPM Registry')
  log (msg: string) {
    this.logger.appendLine(msg)
  }

  warn (msg: string) {
    this.logger.appendLine(msg)
  }
}

export const logger = new Logger()
