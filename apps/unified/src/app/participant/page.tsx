import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ParticipantPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-8">
          <span className="bg-clip-text text-transparent bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
            Spirit in Physics
          </span>
        </h1>
        <div className="flex flex-col space-y-4 items-center">
          <Link href="/participant/sign-in">
            <Button className="w-64 h-12 text-base">サインイン</Button>
          </Link>
          <Link href="/participant/admin">
            <Button variant="outline" className="w-64 h-16 text-lg font-semibold">管理者画面</Button>
          </Link>
          <Link href="/participant/steps/1">
            <Button className="w-64 h-16 text-lg font-semibold">被験者画面</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
