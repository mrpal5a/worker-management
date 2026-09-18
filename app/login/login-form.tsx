'use client';

import { useState, useTransition } from 'react';
import { login } from '@/app/actions/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
    <form action={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-base">Email</span>
        <Input
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoFocus
          autoComplete="username"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-base">Password</span>
        <Input
          name="password"
          type="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </label>
      <Button type="submit" loading={pending} className="mt-1 w-full">
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
      {error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
