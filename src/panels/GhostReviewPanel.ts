import * as vscode from 'vscode';
import * as fs from 'fs';
import { getDiff, DiffOptions } from '../services/gitService';
import { streamReview } from '../services/groqService';
import { saveReview, callDashboardReview, callFreeReview } from '../services/dashboardService';
import { PERSONA_PROMPTS, PERSONA_CONFIGS, Persona } from '../config/personas';
import {
  trackReviewStarted,
  trackReviewCompleted,
  trackConnectBannerClicked,
} from '../services/analyticsService';
import {
  getJwt,
  clearJwt,
  openOAuthFlow,
  getFreeReviewCount,
  incrementFreeReviewCount,
  hasReachedFreeLimit,
  isBannerDismissed,
  dismissBanner,
} from '../services/authService';

export class GhostReviewPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ghostreview-panel';
  private _view?: vscode.WebviewView;
  private _currentPersona: Persona = 'brutal';

  constructor(private readonly _context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('ghostreview');
    this._currentPersona = (config.get<string>('defaultPersona') || 'brutal') as Persona;
  }

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri]
    };

    const htmlPath = vscode.Uri.joinPath(this._context.extensionUri, 'dist', 'webview', 'index.html');
    webviewView.webview.html = fs.readFileSync(htmlPath.fsPath, 'utf8');

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'ready':
          void this._sendInitState();
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

        case 'openGroqSetup':
          vscode.commands.executeCommand('workbench.action.openSettings', 'ghostreview.groqApiKey');
          break;

        case 'openDashboard':
          trackConnectBannerClicked();
          vscode.env.openExternal(
            vscode.Uri.parse('https://ghost-review-dashboard.vercel.app/dashboard/settings')
          );
          break;

        case 'openDashboardSettings':
          vscode.env.openExternal(
            vscode.Uri.parse('https://ghost-review-dashboard.vercel.app/dashboard/settings')
          );
          break;

        case 'openOAuthFlow':
          openOAuthFlow(this._context);
          break;

        case 'dismissBanner':
          dismissBanner(this._context);
          break;
      }
    });

    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('ghostreview.groqApiKey')) {
        void this._sendInitState();
      }
    });
  }

  public triggerReview() {
    void this._runReview({ scope: 'uncommitted', fileScope: 'all' });
  }

  public async sendTokenStatus(): Promise<void> {
    if (!this._view) { return; }
    const jwt = await getJwt(this._context);
    this._view.webview.postMessage({
      type: 'tokenStatus',
      hasJwt: !!jwt
    });
  }

  private async _sendInitState(): Promise<void> {
    if (!this._view) { return; }
    const config = vscode.workspace.getConfiguration('ghostreview');
    const apiKey = (config.get<string>('groqApiKey') || '').trim();
    const persona = config.get<string>('defaultPersona') || 'brutal';
    this._currentPersona = persona as Persona;

    const jwt = await getJwt(this._context);

    this._view.webview.postMessage({
      type: 'init',
      persona: this._currentPersona,
      hasJwt: !!jwt,
      hasGroqKey: !!apiKey,
      freeReviewCount: getFreeReviewCount(this._context),
      freeReviewLimit: 5,
      isBannerDismissed: isBannerDismissed(this._context)
    });
  }

  private _postMessage(message: object) {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  private async _runReview(options: DiffOptions): Promise<void> {
    if (!this._view) { return; }

    const config = vscode.workspace.getConfiguration('ghostreview');
    const groqKey = (config.get<string>('groqApiKey') || '').trim();
    const jwt = await getJwt(this._context);

    let diff: string;
    try {
      diff = await getDiff(options);
      if (!diff) {
        this._postMessage({ type: 'noDiff' });
        return;
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to get diff.';
      this._postMessage({ type: 'error', message: msg });
      return;
    }

    const lineCount = diff.split('\n').length;
    if (lineCount > 500) {
      this._postMessage({ type: 'diffWarning', lines: lineCount });
    }

    if (jwt) {
      await this._runDashboardReview(options, diff, jwt);
    } else if (groqKey) {
      await this._runGroqReview(options, diff, groqKey);
    } else {
      await this._runFreeReview(options, diff);
    }
  }

  private async _runDashboardReview(options: DiffOptions, diff: string, jwt: string): Promise<void> {
    this._postMessage({ type: 'reviewStart', persona: PERSONA_CONFIGS[this._currentPersona] });
    trackReviewStarted(this._currentPersona, options.scope, options.fileScope);

    try {
      const reviewContent = await callDashboardReview({
        jwt,
        persona: this._currentPersona,
        scope: options.scope,
        file_scope: options.fileScope,
        diff_content: diff
      });

      this._postMessage({ type: 'chunk', content: reviewContent });
      this._postMessage({ type: 'reviewComplete' });
      trackReviewCompleted(this._currentPersona, options.scope, true);

      saveReview({
        persona: this._currentPersona,
        scope: options.scope,
        file_scope: options.fileScope,
        diff_content: diff,
        review_content: reviewContent
      });
    } catch (error: unknown) {
      trackReviewCompleted(this._currentPersona, options.scope, false);

      if (error instanceof Error && error.message === 'INVALID_TOKEN') {
        await clearJwt(this._context);
        this._postMessage({
          type: 'error',
          message: 'Session expired. Please reconnect your dashboard account.'
        });
        void this._sendInitState();
      } else if (error instanceof Error && error.message === 'NO_GROQ_KEY') {
        vscode.env.openExternal(
          vscode.Uri.parse('https://ghost-review-dashboard.vercel.app/dashboard/settings')
        );
        this._postMessage({
          type: 'error',
          message: 'No Groq key found in your dashboard account. Please add one in dashboard settings.'
        });
      } else {
        const msg = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
        this._postMessage({ type: 'error', message: msg });
      }
    }
  }

  private async _runGroqReview(options: DiffOptions, diff: string, groqKey: string): Promise<void> {
    this._postMessage({ type: 'reviewStart', persona: PERSONA_CONFIGS[this._currentPersona] });
    trackReviewStarted(this._currentPersona, options.scope, options.fileScope);

    try {
      const stream = streamReview(diff, PERSONA_PROMPTS[this._currentPersona], groqKey);
      let reviewContent = '';
      for await (const chunk of stream) {
        reviewContent += chunk;
        this._postMessage({ type: 'chunk', content: chunk });
      }
      this._postMessage({ type: 'reviewComplete' });
      trackReviewCompleted(this._currentPersona, options.scope, true);

      saveReview({
        persona: this._currentPersona,
        scope: options.scope,
        file_scope: options.fileScope,
        diff_content: diff,
        review_content: reviewContent
      });
    } catch (error: unknown) {
      trackReviewCompleted(this._currentPersona, options.scope, false);
      const msg = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      this._postMessage({ type: 'error', message: msg });
    }
  }

  private async _runFreeReview(options: DiffOptions, diff: string): Promise<void> {
    if (hasReachedFreeLimit(this._context)) {
      this._postMessage({ type: 'showFreeLimitReached' });
      return;
    }

    this._postMessage({ type: 'reviewStart', persona: PERSONA_CONFIGS[this._currentPersona] });
    trackReviewStarted(this._currentPersona, options.scope, options.fileScope);

    try {
      const result = await callFreeReview({
        machine_id: vscode.env.machineId,
        persona: this._currentPersona,
        scope: options.scope,
        file_scope: options.fileScope,
        diff_content: diff
      });

      incrementFreeReviewCount(this._context);
      this._postMessage({ type: 'chunk', content: result.review_content });
      this._postMessage({ type: 'reviewComplete' });
      this._postMessage({ type: 'updateFreeCount', reviews_remaining: result.reviews_remaining });
      trackReviewCompleted(this._currentPersona, options.scope, true);
    } catch (error: unknown) {
      trackReviewCompleted(this._currentPersona, options.scope, false);

      if (error instanceof Error && error.message === 'FREE_LIMIT_REACHED') {
        this._postMessage({ type: 'showFreeLimitReached' });
      } else {
        const msg = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
        this._postMessage({ type: 'error', message: msg });
      }
    }
  }
}
