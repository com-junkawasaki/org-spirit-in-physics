'use client';

import { SignedIn, SignedOut, SignInButton, SignOutButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function HeaderUser() {
  return (
    <div className="flex items-center gap-3">
      <SignedOut>
        <SignInButton mode="modal" />
        <Link href="/sign-in" className="text-sm underline">サインイン</Link>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
        <SignOutButton>
          <span className="text-sm underline cursor-pointer">サインアウト</span>
        </SignOutButton>
      </SignedIn>
    </div>
  );
}


