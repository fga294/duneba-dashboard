"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  // Each poll re-signs the session cookie with a fresh maxAge (sliding window)
  // and persists the refreshed Google access token — getServerSession() in
  // route handlers can't write cookies, so only this client fetch can.
  return (
    <SessionProvider refetchInterval={60 * 60}>
      {children}
    </SessionProvider>
  );
}
