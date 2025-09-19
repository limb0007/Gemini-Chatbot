"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { signIn } from "next-auth/react";

import { AuthForm } from "@/components/custom/auth-form";
import { SubmitButton } from "@/components/custom/submit-button";
import { login, LoginActionState } from "../actions";

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    { status: "idle" },
  );

  useEffect(() => {
    if (state.status === "failed") toast.error("Invalid credentials!");
    else if (state.status === "invalid_data") toast.error("Failed validating your submission!");
    else if (state.status === "success") router.refresh();
  }, [state.status, router]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    formAction(formData);
  };

  const handleGoogle = async () => {
    await signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-6">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">Sign In</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Use your email and password to sign in
          </p>
        </div>

        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton>Sign in</SubmitButton>
        </AuthForm>

        <div className="flex items-center gap-3 px-4 sm:px-16">
          <div className="h-px w-full bg-zinc-800" />
          <span className="text-xs text-zinc-400">or</span>
          <div className="h-px w-full bg-zinc-800" />
        </div>

        <div className="px-4 sm:px-16">
          <button
            onClick={handleGoogle}
            className="w-full rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-600"
          >
            Continue with Google
          </button>

          <a
            href="/api/auth/signin/google"
            className="mt-2 block text-center text-xs text-zinc-400 underline"
          >
            Having trouble? Use the Google sign-in link
          </a>
        </div>

        <p className="text-center text-sm text-gray-600 mt-2 dark:text-zinc-400">
          {"Don't have an account? "}
          <Link href="/register" className="font-semibold text-gray-800 hover:underline dark:text-zinc-200">
            Sign up
          </Link>
          {" for free."}
        </p>
      </div>
    </div>
  );
}
