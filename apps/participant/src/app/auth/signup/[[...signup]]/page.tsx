import { SignUp } from '@clerk/nextjs';

/**
 * Merkle DAG: auth.signup_page
 * Clerk サインアップページ
 */
export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  );
}



