import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="card w-full max-w-md">
        <h1 className="page-title">Sign in</h1>
        <p className="caption mt-1 mb-6">
          Job Search Command Center
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
