import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-brand-50 px-4">
      <div className="max-w-md text-center">
        <p className="font-display text-6xl font-bold text-brand-600">404</p>
        <h1 className="mt-4 font-display text-3xl font-bold text-ink-900">Page not found</h1>
        <p className="mt-3 text-ink-600">The page you're looking for doesn't exist or has moved.</p>
        <Link to="/" className="mt-8 inline-flex rounded-full bg-black px-6 py-3 font-semibold text-white hover:bg-zinc-800">
          Go to the home page
        </Link>
      </div>
    </main>
  );
}
