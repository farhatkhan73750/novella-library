import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";
import BookCard from "../components/BookCard.jsx";
import Pagination from "../components/Pagination.jsx";


const GENRES = [
  "adventure",
  "children",
  "classic",
  "fantasy",
  "historical",
  "horror",
  "mystery",
  "romance",
  "science fiction",
];

const PAGE_SIZE = 6; 

export default function Catalogue() {
  const [searchParams, setSearchParams] = useSearchParams();

  
  const search = searchParams.get("search") || "";
  const genre = searchParams.get("genre") || "";
  const accessLevel = searchParams.get("accessLevel") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);

 
  const query = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page), sort });
  if (search) query.set("search", search);
  if (genre) query.set("genre", genre);
  if (accessLevel) query.set("accessLevel", accessLevel);
  const queryString = query.toString();

  
  const [result, setResult] = useState({ query: null, data: null, error: "" });
  const loading = result.query !== queryString;

  useEffect(() => {
    let cancelled = false;

    api(`/books?${queryString}`, { auth: false })
      .then((data) => {
        if (!cancelled) setResult({ query: queryString, data, error: "" });
      })
      .catch((err) => {
        if (!cancelled) setResult({ query: queryString, data: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [queryString]);

  
  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page"); 
    setSearchParams(next);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setParam("search", new FormData(e.currentTarget).get("search").trim());
  };

  const hasFilters = search || genre || accessLevel || sort !== "newest";
  const data = result.data;

  const selectClass =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none";

  return (
    <section>
      <h1 className="text-2xl font-bold">Browse books</h1>

      {/* ----- Filters ----- */}
      <div className="mt-6 flex flex-wrap items-end gap-3">
        {/* key= remounts the form if the URL changes (e.g. Back button), so the box stays in sync */}
        <form key={search} onSubmit={handleSearch} className="flex gap-2">
          <input
            name="search"
            type="search"
            defaultValue={search}
            placeholder="Search title, author, tag..."
            aria-label="Search books"
            className="w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Search
          </button>
        </form>

        <select
          aria-label="Genre"
          value={genre}
          onChange={(e) => setParam("genre", e.target.value)}
          className={`${selectClass} capitalize`}
        >
          <option value="">All genres</option>
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          aria-label="Access"
          value={accessLevel}
          onChange={(e) => setParam("accessLevel", e.target.value)}
          className={selectClass}
        >
          <option value="">Free and premium</option>
          <option value="free">Free only</option>
          <option value="premium">Premium only</option>
        </select>

        <select
          aria-label="Sort"
          value={sort}
          onChange={(e) => setParam("sort", e.target.value === "newest" ? "" : e.target.value)}
          disabled={Boolean(search)}
          title={search ? "Search results are sorted by relevance" : undefined}
          className={`${selectClass} disabled:opacity-50`}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A to Z</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => setSearchParams({})}
            className="text-sm text-indigo-600 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ----- Results ----- */}
      <div className="mt-8">
        {loading && <p className="text-slate-500">Loading books...</p>}

        {!loading && result.error && (
          <p role="alert" className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800">
            {result.error}
          </p>
        )}

        {!loading && data && (
          <>
            <p className="mb-4 text-sm text-slate-500">
              {data.total} {data.total === 1 ? "book" : "books"} found
            </p>

            {data.books.length === 0 ? (
              <p className="text-slate-600 dark:text-slate-300">
                No books to show here. Try different filters or go back to the first page.
              </p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {data.books.map((book) => (
                  <BookCard key={book._id} book={book} />
                ))}
              </div>
            )}

            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              onChange={(p) => setParam("page", String(p))}
            />
          </>
        )}
      </div>
    </section>
  );
}