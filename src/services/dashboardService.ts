import * as vscode from 'vscode';

interface SaveReviewPayload {
  persona: string;
  scope: string;
  file_scope: string;
  diff_content: string;
  review_content: string;
}

export async function saveReview(payload: SaveReviewPayload): Promise<void> {
  console.log('[GhostReview] saveReview called');

  const config = vscode.workspace.getConfiguration('ghostreview');
  const token = config.get<string>('apiToken') || '';

  if (!token.trim()) {
    console.log('[GhostReview] apiToken is empty — skipping dashboard save');
    return;
  }

  const personaMap: Record<string, string> = {
    'brutal':   'brutal-architect',
    'velocity': 'startup-velocity',
    'security': 'security-paranoid'
  };
  const fileScopeMap: Record<string, string> = {
    'all':     'all-files',
    'current': 'current-file'
  };
  const scopeMap: Record<string, string> = {
    'uncommitted': 'uncommitted',
    'branch':      'vs-main'
  };

  const mappedPayload = {
    ...payload,
    persona:    personaMap[payload.persona]    ?? payload.persona,
    file_scope: fileScopeMap[payload.file_scope] ?? payload.file_scope,
    scope:      scopeMap[payload.scope]        ?? payload.scope
  };

  console.log('[GhostReview] apiToken is set, sending mapped payload:', mappedPayload);

  try {
    const res = await fetch('https://ghost-review-dashboard.vercel.app/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...mappedPayload })
    });
    const body = await res.text();
    console.log('[GhostReview] dashboard response:', res.status, body);
  } catch (err) {
    console.log('[GhostReview] dashboard save error:', err);
  }
}
