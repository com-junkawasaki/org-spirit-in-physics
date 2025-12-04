'use client';

import { SignUp } from '@clerk/nextjs';

export const runtime = 'nodejs';

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <SignUp afterSignInUrl="/admin" afterSignUpUrl="/admin" />
    </div>
  );
}


