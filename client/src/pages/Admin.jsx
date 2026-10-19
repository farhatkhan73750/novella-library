import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";

const emptyForm = {
  title: "",
  author: "",
  description: "",
  type: "book",
  status: "completed",
  accessLevel: "free",
  genres: "",
  tags: "",
};

const emptyChapter = () => ({ title: "", content: "" });

// "Horror, Gothic" -> ["Horror", "Gothic"]
const toList = (text) =>
  text
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none";

export default function Admin() {
  // ----- The book list -----
  const [reloadKey, setReloadKey] = useState(0);
  const [list, setList] = useState({ data: null, error: "" });

  useEffect(() => {
    let cancelled = false;

    api("/books?limit=50&sort=newest", { auth: false })
      .then((data) => {
        if (!cancelled) setList({ data, error: "" });
      })
      .catch((err) => {
        if (!cancelled) setList({ data: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  // ----- The "add a book" form -----
  const [form, setForm] = useState(emptyForm);
  const [chapters, setChapters] = useState([emptyChapter()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const updateChapter = (index, key, value) =>
    setChapters((list) => list.map((c, i) => (i === index ? { ...c, [key]: value } : c)));

  const addChapter = () => setChapters((list) => [...list, emptyChapter()]);

  const removeChapter = (index) =>
    setChapters((list) => (list.length > 1 ? list.filter((_, i) => i !== index) : list));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);

    try {
      await api("/books", {
        method: "POST",
        body: {
          title: form.title.trim(),
          author: form.author.trim(),
          description: form.description.trim(),
          type: form.type,
          status: form.status,
          accessLevel: form.accessLevel,
          genres: toList(form.genres),
          tags: toList(form.tags),
          // Skip chapter boxes the admin left empty
          chapters: chapters.filter((c) => c.title.trim() && c.content.trim()),
        },
      });
      setNotice(`Added "${form.title.trim()}".`);
      setForm(emptyForm);
      setChapters([emptyChapter()]);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Delete -----
  const handleDelete = async (book) => {
    const ok = window.confirm(
      `Delete "${book.title}"? Readers' progress for this book is deleted too.`
    );
    if (!ok) return;

    setError("");
    setNotice("");
    try {
      await api(`/books/${book._id}`, { method: "DELETE" });
      setNotice(`Deleted "${book.title}".`);
      reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const { data, error: listError } = list;

  return (
    <section>
      <h1 className="text-2xl font-bold">Admin</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Add and remove books. The server checks that you are an admin on every request.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-4 rounded-lg bg-green-100 px-3 py-2 text-sm text-green-900">
          {notice}
        </p>
      )}

      {/* ----- Add a book ----- */}
      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
      >
        <h2 className="font-semibold">Add a book</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="title" className="block text-sm font-medium">Title</label>
            <input
              id="title"
              required
              maxLength={200}
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="author" className="block text-sm font-medium">Author</label>
            <input
              id="author"
              required
              maxLength={100}
              value={form.author}
              onChange={(e) => update("author", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium">Description</label>
          <textarea
            id="description"
            rows={3}
            maxLength={2000}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="type" className="block text-sm font-medium">Type</label>
            <select id="type" value={form.type} onChange={(e) => update("type", e.target.value)} className={inputClass}>
              <option value="book">Book</option>
              <option value="webnovel">Web novel</option>
            </select>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium">Status</label>
            <select id="status" value={form.status} onChange={(e) => update("status", e.target.value)} className={inputClass}>
              <option value="completed">Completed</option>
              <option value="ongoing">Ongoing</option>
            </select>
          </div>
          <div>
            <label htmlFor="accessLevel" className="block text-sm font-medium">Access</label>
            <select id="accessLevel" value={form.accessLevel} onChange={(e) => update("accessLevel", e.target.value)} className={inputClass}>
              <option value="free">Free</option>
              <option value="premium">Premium</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="genres" className="block text-sm font-medium">Genres (comma separated)</label>
            <input
              id="genres"
              placeholder="horror, classic"
              value={form.genres}
              onChange={(e) => update("genres", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="tags" className="block text-sm font-medium">Tags (comma separated)</label>
            <input
              id="tags"
              placeholder="gothic, vampire"
              value={form.tags}
              onChange={(e) => update("tags", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Chapters (empty ones are skipped)</p>
          {chapters.map((chapter, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3 dark:border-slate-600">
              <div className="flex items-center gap-2">
                <input
                  aria-label={`Chapter ${i + 1} title`}
                  placeholder={`Chapter ${i + 1} title`}
                  value={chapter.title}
                  onChange={(e) => updateChapter(i, "title", e.target.value)}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => removeChapter(i)}
                  disabled={chapters.length === 1}
                  className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-40 dark:border-slate-600 dark:hover:bg-slate-700"
                >
                  Remove
                </button>
              </div>
              <textarea
                aria-label={`Chapter ${i + 1} text`}
                placeholder="Chapter text. Leave a blank line between paragraphs."
                rows={4}
                value={chapter.content}
                onChange={(e) => updateChapter(i, "content", e.target.value)}
                className={inputClass}
              />
            </div>
          ))}
          <button type="button" onClick={addChapter} className="text-sm text-indigo-600 hover:underline">
            + Add another chapter
          </button>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? "Adding..." : "Add book"}
        </button>
      </form>

      {/* ----- Existing books ----- */}
      <h2 className="mt-10 text-lg font-semibold">Books in the library</h2>

      {listError && (
        <p role="alert" className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800">
          {listError}
        </p>
      )}
      {!data && !listError && <p className="mt-3 text-slate-500">Loading books...</p>}

      {data && (
        <>
          <p className="mt-1 text-sm text-slate-500">
            Showing {data.books.length} of {data.total}, newest first.
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                <tr>
                  <th className="py-2 pr-4 font-medium">Title</th>
                  <th className="py-2 pr-4 font-medium">Author</th>
                  <th className="py-2 pr-4 font-medium">Access</th>
                  <th className="py-2 pr-4 font-medium">Chapters</th>
                  <th className="py-2 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {data.books.map((book) => (
                  <tr key={book._id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 pr-4">
                      <Link to={`/books/${book._id}`} className="text-indigo-600 hover:underline">
                        {book.title}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{book.author}</td>
                    <td className="py-2 pr-4 capitalize">{book.accessLevel}</td>
                    <td className="py-2 pr-4">{book.chapterCount}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleDelete(book)}
                        className="rounded-lg border border-red-300 px-3 py-1 text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}