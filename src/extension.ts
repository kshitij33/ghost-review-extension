import * as vscode from 'vscode';
import { GhostReviewPanel } from './panels/GhostReviewPanel';
import { flush } from './services/analyticsService';
import { saveJwt } from './services/authService';

export function activate(context: vscode.ExtensionContext) {
  const provider = new GhostReviewPanel(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('ghostreview-panel', provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('ghostreview.startReview', () => {
      vscode.commands.executeCommand('ghostreview-panel.focus');
      provider.triggerReview();
    })
  );

  context.subscriptions.push(
    vscode.window.registerUriHandler({
      handleUri(uri: vscode.Uri) {
        if (uri.path === '/auth') {
          const params = new URLSearchParams(uri.query);
          const token = params.get('token');
          if (token) {
            saveJwt(context, token).then(() => {
              vscode.window.showInformationMessage('GhostReview dashboard connected ✓');
              void provider.sendTokenStatus();
            }).catch(() => {
              // fail silently
            });
          }
        }
      }
    })
  );
}

export function deactivate() {
  flush();
}
