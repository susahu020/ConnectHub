import jwt from 'jsonwebtoken';
import { getOrganizationSettings } from './organization.service';
import { ACCESS_SECRET } from '../config/jwtSecrets';

/**
 * Google OAuth 2.0 (OIDC) SSO — the first identity provider, per the
 * enterprise readiness review's recommendation to "start with one OIDC
 * provider (Google Workspace or Azure AD covers most of the market)."
 *
 * Deliberately uses the standard Authorization Code flow with a server-side
 * token exchange (never trusting an id_token handed to us by the browser),
 * and fetches identity via Google's userinfo endpoint with the access token
 * we obtained directly from Google — this avoids needing to independently
 * verify an id_token's JWT signature against Google's JWKS, since the
 * identity data comes from a direct authenticated HTTPS call to Google, not
 * from anything the client could have tampered with.
 *
 * Config: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI (e.g.
 * https://yourdomain.com/api/v1/auth/sso/google/callback — must exactly
 * match what's registered in Google Cloud Console) as environment variables.
 * The admin toggle in Organization Settings (ssoGoogleEnabled) is a separate,
 * additional on/off switch on top of these being configured at all.
 */

const STATE_SECRET = ACCESS_SECRET;

export const isGoogleSsoConfigured = (): boolean =>
  !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);

// The exact Client ID shipped in .env.example as a "fill in your own"
// placeholder. isGoogleSsoConfigured() alone can't tell a real credential
// from an unedited template — both are just non-empty strings — so without
// this, an org that hasn't swapped in their own OAuth credentials yet would
// see "Continue with Google" as if it's ready, click it, and hit a Google-
// side failure (this demo project's redirect URIs won't match their
// deployment). This is a courtesy warning, not a security control: it only
// catches the literal example value, not "some other misconfiguration."
const KNOWN_TEMPLATE_DEMO_CLIENT_ID = '589918863166-d0ggvv4vfr0q7ba3clnp8hr1tbmmmicn.apps.googleusercontent.com';
export const isUsingTemplateDemoGoogleCredentials = (): boolean =>
  process.env.GOOGLE_CLIENT_ID === KNOWN_TEMPLATE_DEMO_CLIENT_ID;

export const isGoogleSsoAvailable = async (): Promise<boolean> => {
  if (!isGoogleSsoConfigured()) return false;
  const orgSettings = await getOrganizationSettings();
  return orgSettings.ssoGoogleEnabled !== false;
};

/**
 * A short-lived signed token used as OAuth `state` — CSRF protection so a
 * callback request can't be forged/replayed from somewhere else, without
 * needing a server-side session/store to track pending logins.
 */
export const createSsoState = (): string =>
  jwt.sign({ purpose: 'sso-state', nonce: Math.random().toString(36).slice(2) }, STATE_SECRET, { expiresIn: '10m' });

export const verifySsoState = (state: string): boolean => {
  try {
    const decoded: any = jwt.verify(state, STATE_SECRET);
    return decoded?.purpose === 'sso-state';
  } catch {
    return false;
  }
};

export const getGoogleAuthUrl = (state: string): string => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

interface GoogleUserInfo {
  email: string;
  email_verified: boolean;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

/**
 * Exchanges the authorization code for tokens, then fetches the user's
 * identity. Throws on any failure — callers should catch and redirect to a
 * login-error page rather than let this bubble as a raw 500.
 */
export const exchangeGoogleCode = async (code: string): Promise<GoogleUserInfo> => {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!tokenResponse.ok) {
    const errBody = await tokenResponse.text().catch(() => '');
    throw new Error(`Google token exchange failed: ${tokenResponse.status} ${errBody}`);
  }

  const tokenData = await tokenResponse.json() as { access_token?: string };
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    throw new Error('Google token exchange did not return an access token.');
  }

  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(8000),
  });

  if (!userInfoResponse.ok) {
    throw new Error(`Google userinfo request failed: ${userInfoResponse.status}`);
  }

  const userInfo = await userInfoResponse.json() as GoogleUserInfo;
  if (!userInfo.email) {
    throw new Error('Google did not return an email address for this account.');
  }

  return userInfo;
};
