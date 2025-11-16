import { SignIn } from '@clerk/nextjs';

/**
 * Merkle DAG: auth.signin_page
 * Clerk サインインページ
 */
export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}


