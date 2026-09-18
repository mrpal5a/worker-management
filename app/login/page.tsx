import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="auth-backdrop flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="brand-gradient mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold text-accent-fg shadow-md">
            W
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Worker Management</h1>
          <p className="mt-1 text-sm text-text-muted">Sign in to track attendance and payroll.</p>
        </div>

        <div className="rounded-2xl border border-border-base bg-surface-raised p-6 shadow-lg">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          Accounts are created by an admin. Ask yours if you need one.
        </p>
      </div>
    </main>
  );
}
