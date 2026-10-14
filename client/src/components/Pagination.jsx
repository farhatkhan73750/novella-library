export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const buttonClass =
    "rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:hover:bg-slate-700";

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-4">
      <button
        className={buttonClass}
        disabled={page <= 1}
        onClick={() => onChange(Math.min(page - 1, totalPages))}
      >
        Previous
      </button>

      <span className="text-sm">
        Page {page} of {totalPages}
      </span>

      <button
        className={buttonClass}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}