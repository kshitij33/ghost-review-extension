import * as vscode from 'vscode';

const JWT_SECRET_KEY = 'ghostreview.jwt';
const FREE_REVIEW_COUNT_KEY = 'ghostreview.freeReviewCount';
const FREE_REVIEW_LIMIT = 5;
const BANNER_DISMISS_KEY = 'ghostreview.bannerDismissedAt';

export async function getJwt(context: vscode.ExtensionContext): Promise<string | undefined> {
  return context.secrets.get(JWT_SECRET_KEY);
}

export async function saveJwt(context: vscode.ExtensionContext, token: string): Promise<void> {
  await context.secrets.store(JWT_SECRET_KEY, token);
}

export async function clearJwt(context: vscode.ExtensionContext): Promise<void> {
  await context.secrets.delete(JWT_SECRET_KEY);
}

export function openOAuthFlow(_context: vscode.ExtensionContext): void {
  vscode.env.openExternal(
    vscode.Uri.parse('https://ghost-review-dashboard.vercel.app/login?redirect=extension')
  );
}

export function getFreeReviewCount(context: vscode.ExtensionContext): number {
  return context.globalState.get<number>(FREE_REVIEW_COUNT_KEY, 0);
}

export function incrementFreeReviewCount(context: vscode.ExtensionContext): void {
  const count = getFreeReviewCount(context);
  void context.globalState.update(FREE_REVIEW_COUNT_KEY, count + 1);
}

export function hasReachedFreeLimit(context: vscode.ExtensionContext): boolean {
  return getFreeReviewCount(context) >= FREE_REVIEW_LIMIT;
}

export function isBannerDismissed(context: vscode.ExtensionContext): boolean {
  const dismissedAt = context.globalState.get<number>(BANNER_DISMISS_KEY);
  if (!dismissedAt) { return false; }
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return (Date.now() - dismissedAt) < sevenDaysMs;
}

export function dismissBanner(context: vscode.ExtensionContext): void {
  void context.globalState.update(BANNER_DISMISS_KEY, Date.now());
}
