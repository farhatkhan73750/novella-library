import { Link } from "react-router-dom";

export default function BookCard({ book }) {
  const isPremium = book.accessLevel === "premium";

  return (
    <Link
      to={`/books/${book._id}`}
      className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
    >
      {/* No cover images yet, so show a coloured block with the first letter */}
      <div className="flex h-32 items-center justify-center bg-indigo-100 text-5xl font-bold text-indigo-400 dark:bg-slate-700 dark:text-slate-500">
        {book.title.charAt(0)}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold leading-snug">{book.title}</h2>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              isPremium ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
            }`}
          >
            {isPremium ? "Premium" : "Free"}
          </span>
        </div>

        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{book.author}</p>

        <div className="mt-3 flex flex-wrap gap-1">
          {book.genres.slice(0, 3).map((genre) => (
            <span
              key={genre}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-700 dark:bg-slate-700 dark:text-slate-200"
            >
              {genre}
            </span>
          ))}
        </div>

        <p className="mt-auto pt-3 text-xs text-slate-500">
          {book.chapterCount} {book.chapterCount === 1 ? "chapter" : "chapters"}
        </p>
      </div>
    </Link>
  );
}