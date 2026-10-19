import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";

export default function ContinueReading() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let cancelled = false;

    api("/reading/history")
      .then((data) => {
        
        if (!cancelled) setItems(data.history.filter((h) => !h.completed).slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setItems([]); 
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl font-bold">Continue reading</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {items.map((h) => (
          <Link
            key={h.book._id}
            to={`/books/${h.book._id}/read/${h.lastChapter}`}
            className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
          >
            <p className="font-semibold">{h.book.title}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{h.book.author}</p>
            <p className="mt-2 text-xs text-slate-500">
              Chapter {h.lastChapter} of {h.book.chapterCount}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}