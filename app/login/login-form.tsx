'use client';

import { useState, useTransition } from 'react';
import { login } from '@/app/actions/auth';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      // On success the action redirects and never returns.
      const result = await login(formData);
      if (result && 'error' in result) setError(result.error);
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-3">
      <input
        name="email"
        type="email"
        placeholder="Email"
        required
        autoFocus
        autoComplete="username"
        className="w-full min-h-9 rounded-md border border-border-strong bg-surface px-2 text-sm sm:min-h-8"
      />
      <input
        name="password"
        type="password"
        placeholder="Password"
        required
        autoComplete="current-password"
        className="w-full min-h-9 rounded-md border border-border-strong bg-surface px-2 text-sm sm:min-h-8"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-3 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:opacity-50 sm:min-h-9"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
