import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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

        if (!response.ok) throw tokens;

        return {
          ...token,
          accessToken: tokens.access_token,
          expiresAt: Date.now() + tokens.expires_in * 1000,
          refreshToken: tokens.refresh_token ?? token.refreshToken,
        };
      } catch (err) {
        console.error("[auth] token refresh failed:", err);
        return { ...token, error: "RefreshAccessTokenError" };
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
};
