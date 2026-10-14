import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import useReaderSettings from "../hooks/useReaderSettings.js";
import { FONT_SIZES } from "../hooks/useReaderSettings.js";

export default function Reader() {
  const { id, chapter } = useParams();
  const key = `${id}/${chapter}`;
  const settings = useReaderSettings();

  const [result, setResult] = useState({ key: null, data: null, error: "" });
  const loading = result.key !== key;

  useEffect(() => {
    let cancelled = false;

    api(`/reading/${id}/chapters/${chapter}`)
      .then((data) => {
        if (!cancelled) setResult({ key, data, error: "" });
      })
      .catch((err) => {
        if (!cancelled) setResult({ key, data: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [id, chapter, key]);

  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);

  const data = result.data;
  const dark = settings.theme === "dark";

  const smallButton =
    "rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:hover:bg-slate-800";

  
  if (!loading && result.error) {
    return (
      <section className="mx-auto max-w-2xl">
        <p role="alert" className="rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-900">
          {result.error}
        </p>
        <Link to={`/books/${id}`} className="mt-4 inline-block text-indigo-600 hover:underline">
          Back to the book
        </Link>
      </section>
    );
  }

  if (loading) return <p className="text-slate-500">Loading chapter...</p>;

  
  const paragraphs = data.chapter.content.split(/\n{2,}/);

  return (
    <article
      className={`${dark ? "dark" : ""} mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100`}
    >
      {/* ----- Top bar ----- */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
        <Link to={`/books/${id}`} className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          ← {data.book.title}
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={settings.smaller}
            disabled={!settings.canShrink}
            aria-label="Smaller text"
            className={smallButton}
          >
            A−
          </button>
          <button
            onClick={settings.larger}
            disabled={!settings.canGrow}
            aria-label="Larger text"
            className={smallButton}
          >
            A+
          </button>
          <button
            onClick={settings.toggleTheme}
            aria-label="Toggle dark mode"
            className={smallButton}
          >
            {dark ? "Light" : "Dark"}
          </button>
        </div>
      </div>

      {/* ----- Chapter ----- */}
      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
        Chapter {data.chapter.number} of {data.book.totalChapters}
      </p>
      <h1 className="mt-1 text-2xl font-bold">{data.chapter.title}</h1>

      <div className={`mt-6 space-y-4 leading-relaxed ${FONT_SIZES[settings.size]}`}>
        {paragraphs.map((text, i) => (
          <p key={i}>{text}</p>
        ))}
      </div>

      {/* ----- Previous / Next ----- */}
      <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-700">
        {data.hasPrevious ? (
          <Link to={`/books/${id}/read/${data.chapter.number - 1}`} className={smallButton}>
            ← Previous
          </Link>
        ) : (
          <span />
        )}

        {data.hasNext ? (
          <Link to={`/books/${id}/read/${data.chapter.number + 1}`} className={smallButton}>
            Next →
          </Link>
        ) : (
          <Link to={`/books/${id}`} className={smallButton}>
            Finished: back to book
          </Link>
        )}
      </div>

      {/* ----- Free-tier quota ----- */}
      {data.quota && (
        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Free books opened this month: {data.quota.used} of {data.quota.limit}
        </p>
      )}
    </article>
  );
}