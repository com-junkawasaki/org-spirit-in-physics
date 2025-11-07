'use client';

import dynamic from 'next/dynamic';

export const runtime = 'nodejs';

const SignIn = dynamic(
  () => import('@clerk/nextjs').then(m => ({ default: m.SignIn })),
  { ssr: false }
);

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <SignIn afterSignInUrl="/admin" afterSignUpUrl="/admin" />
    </div>
  );
}


