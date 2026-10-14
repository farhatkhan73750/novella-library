import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import useAuth from "../context/useAuth.js";

export default function BookDetails() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();

 
  const [result, setResult] = useState({ id: null, book: null, error: "" });
  const loading = result.id !== id;

  useEffect(() => {
    let cancelled = false;

    api(`/books/${id}`, { auth: false })
      .then((data) => {
        if (!cancelled) setResult({ id, book: data.book, error: "" });
      })
      .catch((err) => {
        if (!cancelled) setResult({ id, book: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  
  const progressKey = user ? `${user.id}:${id}` : null;
  const [progress, setProgress] = useState({ key: null, lastChapter: null });

  useEffect(() => {
    if (!progressKey) return;
    let cancelled = false;

    api("/reading/history")
      .then((data) => {
        if (cancelled) return;
        const item = data.history.find((h) => h.book._id === id);
        setProgress({ key: progressKey, lastChapter: item ? item.lastChapter : null });
      })
      .catch(() => {
        if (!cancelled) setProgress({ key: progressKey, lastChapter: null });
      });

    return () => {
      cancelled = true;
    };
  }, [progressKey, id]);

  const lastChapter = progress.key === progressKey ? progress.lastChapter : null;

  
  if (loading) return <p className="text-slate-500">Loading book...</p>;

  if (result.error) {
    return (
      <section>
        <p role="alert" className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800">
          {result.error}
        </p>
        <Link to="/books" className="mt-4 inline-block text-indigo-600 hover:underline">
          Back to books
        </Link>
      </section>
    );
  }

  const book = result.book;
  const isPremium = book.accessLevel === "premium";
  const hasFullAccess = user && (user.role === "subscriber" || user.role === "admin");

  const primaryButton =
    "inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700";
  const secondaryButton =
    "inline-block rounded-lg border border-slate-300 px-5 py-2.5 font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700";

  
  let action;
  if (book.chapterCount === 0) {
    action = <p className="text-slate-500">This book has no chapters yet.</p>;
  } else if (authLoading) {
    action = null;
  } else if (!user) {
    action = (
      <Link to="/login" state={{ from: location }} className={primaryButton}>
        Log in to read
      </Link>
    );
  } else if (isPremium && !hasFullAccess) {
    action = (
      <p className="rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-900">
        This is a premium book. It's available to subscribers only.
      </p>
    );
  } else if (lastChapter) {
    action = (
      <div className="flex flex-wrap gap-3">
        <Link to={`/books/${book._id}/read/${lastChapter}`} className={primaryButton}>
          Continue from chapter {lastChapter}
        </Link>
        <Link to={`/books/${book._id}/read/1`} className={secondaryButton}>
          Start from the beginning
        </Link>
      </div>
    );
  } else {
    action = (
      <Link to={`/books/${book._id}/read/1`} className={primaryButton}>
        Start reading
      </Link>
    );
  }

  return (
    <section>
      <Link to="/books" className="text-sm text-indigo-600 hover:underline">
        ← Back to books
      </Link>

      <div className="mt-4 flex flex-col gap-6 sm:flex-row">
        <div className="flex h-48 w-full shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-7xl font-bold text-indigo-400 sm:w-40 dark:bg-slate-700 dark:text-slate-500">
          {book.title.charAt(0)}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">{book.title}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                isPremium ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
              }`}
            >
              {isPremium ? "Premium" : "Free"}
            </span>
          </div>

          <p className="mt-1 text-slate-600 dark:text-slate-300">by {book.author}</p>

          <p className="mt-2 text-sm capitalize text-slate-500">
            {book.type === "webnovel" ? "Web novel" : "Book"} · {book.status} ·{" "}
            {book.chapterCount} {book.chapterCount === 1 ? "chapter" : "chapters"}
          </p>

          {book.description && <p className="mt-4 max-w-2xl">{book.description}</p>}

          <div className="mt-4 flex flex-wrap gap-1">
            {book.genres.map((g) => (
              <span
                key={g}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-700 dark:bg-slate-700 dark:text-slate-200"
              >
                {g}
              </span>
            ))}
            {book.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300"
              >
                #{t}
              </span>
            ))}
          </div>

          <div className="mt-6">{action}</div>
        </div>
      </div>
    </section>
  );
}