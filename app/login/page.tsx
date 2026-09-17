import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm p-6 pt-24">
      <h1 className="mb-2 text-2xl font-semibold">Worker Management</h1>
      <p className="mb-6 text-sm text-gray-500">Enter the password to continue.</p>
      <LoginForm />
    </main>
  );
}
