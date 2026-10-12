import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
          Novella
        </Link>

        <div className="flex items-center gap-4 text-sm font-medium">
          <Link to="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400">
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700"
          >
            Sign up
          </Link>
        </div>
      </nav>
    </header>
  );
}