'use client';

import { SignUp } from '@clerk/astro/react';

export default function SignUpComponent() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <SignUp afterSignInUrl="/admin" afterSignUpUrl="/admin" />
    </div>
  );
}

