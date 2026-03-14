import * as vscode from 'vscode';
import { PostHog } from 'posthog-node';

declare const process: { env: Record<string, string> };

const posthog = new PostHog(process.env.POSTHOG_KEY, {
  host: 'https://us.i.posthog.com',
  flushAt: 1,
  flushInterval: 0
});

function isEnabled(): boolean {
  return vscode.env.isTelemetryEnabled;
}

function id(): string {
  return vscode.env.machineId;
}

export function trackReviewStarted(persona: string, scope: string, fileScope: string): void {
  if (!isEnabled()) { return; }
  posthog.capture({
    distinctId: id(),
    event: 'review_started',
    properties: { persona, scope, file_scope: fileScope }
  });
}

export function trackReviewCompleted(persona: string, scope: string, success: boolean): void {
  if (!isEnabled()) { return; }
  posthog.capture({
    distinctId: id(),
    event: 'review_completed',
    properties: { persona, scope, success }
  });
}

export function trackDashboardConnected(): void {
  if (!isEnabled()) { return; }
  posthog.capture({
    distinctId: id(),
    event: 'dashboard_connected'
  });
}

export function trackConnectBannerClicked(): void {
  if (!isEnabled()) { return; }
  posthog.capture({
    distinctId: id(),
    event: 'connect_banner_clicked'
  });
}

export function trackConnectBannerDismissed(): void {
  if (!isEnabled()) { return; }
  posthog.capture({
    distinctId: id(),
    event: 'connect_banner_dismissed'
  });
}

export async function flush(): Promise<void> {
  await posthog.shutdown();
}
