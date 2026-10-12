import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">This page doesn't exist.</p>
      <Link to="/" className="mt-4 inline-block text-indigo-600 hover:underline">
        Back to home
      </Link>
    </section>
  );
}