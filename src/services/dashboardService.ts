import * as vscode from 'vscode';

const DASHBOARD_URL = 'https://ghost-review-dashboard.vercel.app';

interface SaveReviewPayload {
  persona: string;
  scope: string;
  file_scope: string;
  diff_content: string;
  review_content: string;
}

interface DashboardReviewPayload {
  jwt: string;
  persona: string;
  scope: string;
  file_scope: string;
  diff_content: string;
}

interface FreeReviewPayload {
  machine_id: string;
  persona: string;
  scope: string;
  file_scope: string;
  diff_content: string;
}

export interface FreeReviewResponse {
  review_content: string;
  reviews_remaining: number;
}

const PERSONA_MAP: Record<string, string> = {
  'brutal':   'brutal-architect',
  'velocity': 'startup-velocity',
  'security': 'security-paranoid'
};

const FILE_SCOPE_MAP: Record<string, string> = {
  'all':     'all-files',
  'current': 'current-file'
};

const SCOPE_MAP: Record<string, string> = {
  'uncommitted': 'uncommitted',
  'branch':      'vs-main'
};

export async function callDashboardReview(payload: DashboardReviewPayload): Promise<string> {
  const { jwt, ...rest } = payload;
  const mapped = {
    ...rest,
    persona:    PERSONA_MAP[rest.persona]       ?? rest.persona,
    file_scope: FILE_SCOPE_MAP[rest.file_scope] ?? rest.file_scope,
    scope:      SCOPE_MAP[rest.scope]           ?? rest.scope
  };
  const res = await fetch(`${DASHBOARD_URL}/api/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_token: jwt, ...mapped })
  });

  if (res.status === 401) { throw new Error('INVALID_TOKEN'); }
  if (res.status === 402) { throw new Error('NO_GROQ_KEY'); }
  if (!res.ok) { throw new Error(`Review request failed: ${res.status}`); }

  const parsed = await res.json() as { data: { review_content: string; review_id: string } };
  return parsed.data.review_content;
}

export async function callFreeReview(payload: FreeReviewPayload): Promise<FreeReviewResponse> {
  const mapped = {
    ...payload,
    persona:    PERSONA_MAP[payload.persona]       ?? payload.persona,
    file_scope: FILE_SCOPE_MAP[payload.file_scope] ?? payload.file_scope,
    scope:      SCOPE_MAP[payload.scope]           ?? payload.scope
  };

  const res = await fetch(`${DASHBOARD_URL}/api/free-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mapped)
  });

  const bodyText = await res.text();

  if (res.status === 403) {
    const data = JSON.parse(bodyText) as { error?: string };
    if (data.error === 'FREE_LIMIT_REACHED') {
      throw new Error('FREE_LIMIT_REACHED');
    }
  }

  if (!res.ok) { throw new Error(`Free review request failed: ${res.status}`); }

  const parsed = JSON.parse(bodyText) as { data: FreeReviewResponse };
  return parsed.data;
}

export async function saveReview(payload: SaveReviewPayload): Promise<void> {
  const config = vscode.workspace.getConfiguration('ghostreview');
  const token = config.get<string>('apiToken') || '';

  if (!token.trim()) { return; }

  const mappedPayload = {
    ...payload,
    persona:    PERSONA_MAP[payload.persona]       ?? payload.persona,
    file_scope: FILE_SCOPE_MAP[payload.file_scope] ?? payload.file_scope,
    scope:      SCOPE_MAP[payload.scope]           ?? payload.scope
  };

  try {
    await fetch(`${DASHBOARD_URL}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...mappedPayload })
    });
  } catch (_err) {
    // fail silently
  }
}
