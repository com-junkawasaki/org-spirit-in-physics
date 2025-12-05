import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-8">
          <span className="bg-clip-text text-transparent bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
            Spirit in Physics
          </span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">
          Unified Platform
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          <Link
            href="/demo"
            className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-bold mb-2">Demo</h2>
            <p className="text-gray-600 dark:text-gray-400">Real-time Complex visualization demo</p>
          </Link>
          <Link
            href="/paper"
            className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-bold mb-2">Paper</h2>
            <p className="text-gray-600 dark:text-gray-400">Research paper and publications</p>
          </Link>
          <Link
            href="/participant"
            className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-bold mb-2">Participant</h2>
            <p className="text-gray-600 dark:text-gray-400">Participant interface and experiments</p>
          </Link>
          <Link
            href="/researcher"
            className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-bold mb-2">Researcher</h2>
            <p className="text-gray-600 dark:text-gray-400">Researcher dashboard and analysis</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
