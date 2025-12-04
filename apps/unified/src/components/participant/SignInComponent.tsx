'use client';

import { SignIn } from '@clerk/astro/react';

export default function SignInComponent() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <SignIn afterSignInUrl="/admin" afterSignUpUrl="/admin" />
    </div>
  );
}

