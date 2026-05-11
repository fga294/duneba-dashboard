"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-white/[0.04] backdrop-blur-2xl backdrop-saturate-150 p-10 text-center ring-1 ring-white/[0.08] shadow-card-lg">
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            background:
              "radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.06), transparent 60%)",
          }}
          aria-hidden
        />
        <div className="relative">
          <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center">
            <div
              className="h-2.5 w-2.5 rounded-full bg-[color:var(--accent-1)]"
              style={{
                boxShadow: "0 0 24px 4px var(--glow-1)",
              }}
            />
          </div>
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[color:var(--accent-1)]">
            Duneba
          </p>
          <h1
            className="mt-4 text-3xl font-medium text-white"
            style={{ letterSpacing: "-0.025em" }}
          >
            Welcome back.
          </h1>
          <p className="mt-2 text-sm text-white/55">
            Sign in to access your personal dashboard.
          </p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="group relative mt-8 inline-flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-white px-6 py-3.5 text-sm font-medium text-black shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.5)] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:scale-[1.02] hover:shadow-[0_12px_48px_-8px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.5)]"
          >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>
        </div>
      </div>
    </div>
  );
}
