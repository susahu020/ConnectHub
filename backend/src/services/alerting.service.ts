import { getOrganizationSettings } from './organization.service';
import type { CheckStatus } from './health.service';

/**
 * Fires a webhook when the overall System Health status changes, so an admin
 * doesn't have to be staring at the System Health tab to notice something
 * went down — this is the missing piece the enterprise readiness review
 * flagged: "System Health exists, but nothing pages anyone when it goes red."
 *
 * Kept deliberately simple: one webhook URL (Slack incoming-webhook compatible,
 * but works with any endpoint that accepts a JSON POST — e.g. a generic
 * Zapier/Make/PagerDuty Events API relay), in-memory state (this reflects
 * "is this process currently alerting," which is correctly scoped to one
 * running instance), alert on status change, and a re-alert every 30 minutes
 * if the problem persists so a real outage can't go silent after one message.
 */

let lastAlertedStatus: CheckStatus | null = null;
let lastAlertAt: number | null = null;
const RE_ALERT_INTERVAL_MS = 30 * 60 * 1000;

const STATUS_EMOJI: Record<CheckStatus, string> = {
  healthy: '✅',
  degraded: '🟡',
  down: '🔴',
};

const buildSummary = (health: { status: CheckStatus; checks: Record<string, any> }): string => {
  const problems = Object.entries(health.checks)
    .filter(([, check]: [string, any]) => check.status !== 'healthy')
    .map(([name, check]: [string, any]) => `• *${name}*: ${check.message}`);
  return problems.length > 0 ? problems.join('\n') : 'All checks passing.';
};

export const sendWebhookAlert = async (webhookUrl: string, health: { status: CheckStatus; checks: Record<string, any>; timestamp: string }, orgName: string): Promise<boolean> => {
  const emoji = STATUS_EMOJI[health.status];
  const title = `${emoji} ${orgName} System Health: ${health.status.toUpperCase()}`;
  const summary = buildSummary(health);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // "text" is read directly by Slack/Discord-compatible incoming
      // webhooks; the extra fields are there for any generic JSON receiver
      // that wants structured data instead.
      body: JSON.stringify({
        text: `${title}\n${summary}\n_Checked at ${health.timestamp}_`,
        status: health.status,
        orgName,
        checks: health.checks,
        timestamp: health.timestamp,
      }),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch (err) {
    console.error('Health alert webhook failed:', err);
    return false;
  }
};

/**
 * Call this after every health check run. Decides on its own whether an
 * alert is actually warranted (status changed, or persisting long enough to
 * re-alert) — callers don't need to track state themselves.
 */
export const checkAndAlert = async (health: { status: CheckStatus; checks: Record<string, any>; timestamp: string }): Promise<void> => {
  const orgSettings = await getOrganizationSettings();
  const webhookUrl = orgSettings.alertWebhookUrl;
  if (!webhookUrl) return;

  const statusChanged = health.status !== lastAlertedStatus;
  const dueForReAlert =
    health.status !== 'healthy' &&
    lastAlertAt !== null &&
    Date.now() - lastAlertAt > RE_ALERT_INTERVAL_MS;

  // Always worth telling someone the moment it recovers, even without the
  // re-alert interval having elapsed.
  const recovered = health.status === 'healthy' && lastAlertedStatus !== null && lastAlertedStatus !== 'healthy';

  if (statusChanged || dueForReAlert || recovered) {
    const sent = await sendWebhookAlert(webhookUrl, health, orgSettings.orgName || 'ConnectHub');
    if (sent) {
      lastAlertedStatus = health.status;
      lastAlertAt = Date.now();
    }
  }
};

// Exposed for the admin "Send Test Alert" button and for tests.
export const _resetAlertState = () => {
  lastAlertedStatus = null;
  lastAlertAt = null;
};
