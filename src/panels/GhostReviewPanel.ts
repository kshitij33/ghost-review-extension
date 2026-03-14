import * as vscode from 'vscode';
import * as fs from 'fs';
import { getDiff, DiffOptions } from '../services/gitService';
import { streamReview } from '../services/groqService';
import { saveReview } from '../services/dashboardService';
import { PERSONA_PROMPTS, PERSONA_CONFIGS, Persona } from '../config/personas';

export class GhostReviewPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ghostreview-panel';
  private _view?: vscode.WebviewView;
  private _currentPersona: Persona = 'brutal';

  constructor(private readonly _extensionUri: vscode.Uri) {
    const config = vscode.workspace.getConfiguration('ghostreview');
    this._currentPersona = (config.get<string>('defaultPersona') || 'brutal') as Persona;
  }

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'index.html');
    webviewView.webview.html = fs.readFileSync(htmlPath.fsPath, 'utf8');

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'ready':
          this._sendInitState();
          break;

        case 'setPersona':
          this._currentPersona = message.persona as Persona;
          break;

        case 'startReview':
          await this._runReview({
            scope: message.scope || 'uncommitted',
            fileScope: message.fileScope || 'all'
          });
          break;

        case 'openSettings':
          vscode.commands.executeCommand('workbench.action.openSettings', 'ghostreview');
          break;

        case 'openDashboard':
          vscode.env.openExternal(vscode.Uri.parse('https://ghost-review-dashboard.vercel.app/dashboard/settings'));
          break;
      }
    });

    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('ghostreview.apiToken')) {
        this._sendTokenStatus();
      }
    });
  }

  public triggerReview() {
    this._runReview({ scope: 'uncommitted', fileScope: 'all' });
  }

  private _sendInitState() {
    if (!this._view) { return; }
    const config = vscode.workspace.getConfiguration('ghostreview');
    const apiKey = config.get<string>('groqApiKey') || '';
    const persona = config.get<string>('defaultPersona') || 'brutal';
    const apiToken = config.get<string>('apiToken') || '';
    this._currentPersona = persona as Persona;

    this._view.webview.postMessage({
      type: 'init',
      apiKeySet: !!apiKey.trim(),
      persona: this._currentPersona,
      apiTokenSet: !!apiToken.trim()
    });
  }

  private _sendTokenStatus() {
    if (!this._view) { return; }
    const config = vscode.workspace.getConfiguration('ghostreview');
    const apiToken = config.get<string>('apiToken') || '';
    this._view.webview.postMessage({
      type: 'tokenStatus',
      apiTokenSet: !!apiToken.trim()
    });
  }

  private _postMessage(message: object) {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  private async _runReview(options: DiffOptions) {
    if (!this._view) { return; }

    const config = vscode.workspace.getConfiguration('ghostreview');
    const apiKey = config.get<string>('groqApiKey') || '';

    if (!apiKey.trim()) {
      this._postMessage({
        type: 'error',
        message: 'No API key found. Add your Groq API key in GhostReview settings.'
      });
      return;
    }

    try {
      const diff = await getDiff(options);

      if (!diff) {
        this._postMessage({ type: 'noDiff' });
        return;
      }

      const lineCount = diff.split('\n').length;
      if (lineCount > 500) {
        this._postMessage({ type: 'diffWarning', lines: lineCount });
      }

      this._postMessage({
        type: 'reviewStart',
        persona: PERSONA_CONFIGS[this._currentPersona]
      });

      const stream = streamReview(diff, PERSONA_PROMPTS[this._currentPersona], apiKey);

      let reviewContent = '';
      for await (const chunk of stream) {
        reviewContent += chunk;
        this._postMessage({ type: 'chunk', content: chunk });
      }

      this._postMessage({ type: 'reviewComplete' });

      saveReview({
        persona: this._currentPersona,
        scope: options.scope,
        file_scope: options.fileScope,
        diff_content: diff,
        review_content: reviewContent
      });

    } catch (error: any) {
      this._postMessage({
        type: 'error',
        message: error.message || 'Something went wrong. Please try again.'
      });
    }
  }
}
