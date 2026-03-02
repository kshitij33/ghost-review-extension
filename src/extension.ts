import * as vscode from 'vscode';
import { GhostReviewPanel } from './panels/GhostReviewPanel';

export function activate(context: vscode.ExtensionContext) {
  const provider = new GhostReviewPanel(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('ghostreview-panel', provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('ghostreview.startReview', () => {
      vscode.commands.executeCommand('ghostreview-panel.focus');
      provider.triggerReview();
    })
  );
}

export function deactivate() {}
