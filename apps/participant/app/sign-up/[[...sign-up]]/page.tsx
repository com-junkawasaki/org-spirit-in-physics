'use client';

import dynamic from 'next/dynamic';

export const runtime = 'nodejs';

const SignUp = dynamic(
  () => import('@clerk/nextjs').then(m => ({ default: m.SignUp })),
  { ssr: false }
);

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <SignUp afterSignInUrl="/admin" afterSignUpUrl="/admin" />
    </div>
  );
}


