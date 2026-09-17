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
        className="min-h-11 w-full rounded border px-3 py-2"
      />
      <input
        name="password"
        type="password"
        placeholder="Password"
        required
        autoComplete="current-password"
        className="min-h-11 w-full rounded border px-3 py-2"
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
