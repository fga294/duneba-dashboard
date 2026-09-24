import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

/**
 * Decide whether a failed refresh means the refresh token is genuinely dead
 * (the user must sign in again) or was just a transient blip worth retrying.
 *
 * The test is whether Google gave us a definitive verdict:
 *   - 4xx — Google answered and rejected us (`invalid_grant` = refresh token
 *     revoked, expired, or already used). Retrying the identical request gets
 *     the identical rejection, so the session really is dead.
 *   - 5xx, a malformed body, or a TypeError thrown by `fetch` itself
 *     (`err.cause.code` = "ETIMEDOUT" / "ENOTFOUND") — we never got a verdict.
 *     The token is probably fine; the next request retries.
 *
 * Defaulting to `false` is the safe direction here: a wrong "transient" costs
 * one more retry, while a wrong "rejected" blanks the kiosk until someone
 * physically re-logs in.
 */
function isAuthRejection(err: unknown): boolean {
  const status = (err as { status?: unknown })?.status;
  return typeof status === "number" && status >= 400 && status < 500;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/tasks.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // NextAuth defaults to 30 days. The kiosk never re-fetches the session
    // (no focus changes, no reloads), so the cookie is only re-signed at page
    // load — a short window means a forced Google re-login every month.
    // 1 year sits under the 400-day browser cookie cap.
    maxAge: 365 * 24 * 60 * 60,
  },
  callbacks: {
    async signIn({ user }) {
      return user.email === process.env.ALLOWED_EMAIL;
    },
    async jwt({ token, account }) {
      // Initial sign-in: store tokens
      if (account) {
        return {
          ...token,
          accessToken: account.access_token!,
          refreshToken: account.refresh_token!,
          expiresAt: account.expires_at! * 1000,
        };
      }

      // Token still valid
      if (Date.now() < token.expiresAt) {
        return token;
      }

      // Token expired — refresh it
      try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: token.refreshToken,
          }),
        });

        const tokens = await response.json();

        if (!response.ok) {
          throw Object.assign(
            new Error(`token refresh failed: HTTP ${response.status}`),
            { status: response.status, oauth: tokens },
          );
        }

        return {
          ...token,
          accessToken: tokens.access_token,
          expiresAt: Date.now() + tokens.expires_in * 1000,
          refreshToken: tokens.refresh_token ?? token.refreshToken,
          // Clear any error left by an earlier failed attempt. Without this the
          // spread above carries `error` forward through every later success,
          // permanently 401-ing the routes that check `session.error`
          // (calendar, photos) until the user re-logs in.
          error: undefined,
        };
      } catch (err) {
        // A network blip must not blank the kiosk. Only a genuine rejection
        // from Google forces a re-login; transient failures leave the token
        // untouched (expiresAt stays in the past) so the next request retries.
        if (isAuthRejection(err)) {
          console.error("[auth] refresh token rejected by Google:", err);
          return { ...token, error: "RefreshAccessTokenError" };
        }

        console.warn("[auth] token refresh failed, will retry next request:", err);
        return { ...token };
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
};
