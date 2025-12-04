'use client';

/**
 * Merkle DAG: auth.signin_page
 * Supabase サインインページ
 */

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  // Only create client on client-side to avoid build-time errors
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      return createClient();
    } catch (e) {
      return null;
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Supabase client not initialized');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push('/');
      router.refresh();
    } catch (error: any) {
      setError(error.message || 'サインインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
        <div>
          <h2 className="text-2xl font-bold">サインイン</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            アカウントにサインインしてください
          </p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border px-3 py-2"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border px-3 py-2"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          >
            {loading ? 'サインイン中...' : 'サインイン'}
          </button>
        </form>

        <div className="text-center text-sm">
          <a href="/auth/signup" className="text-primary hover:underline">
            アカウントをお持ちでない方はこちら
          </a>
        </div>
      </div>
    </div>
  );
}

