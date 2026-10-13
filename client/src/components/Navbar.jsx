import { Link } from "react-router-dom";
import useAuth from "../context/useAuth.js";

export default function Navbar() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
          Novella
        </Link>

        <div className="flex items-center gap-4 text-sm font-medium">
          {loading ? null : user ? (
            <>
              <Link to="/account" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                {user.name}
              </Link>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs capitalize text-indigo-700">
                {user.role}
              </span>
              <button
                onClick={logout}
                className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}