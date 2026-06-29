import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="card w-full max-w-md">
        <h1 className="page-title">Create account</h1>
        <p className="caption mt-1 mb-6">
          Start tracking your job search
        </p>
        <SignupForm />
      </div>
    </div>
  );
}
