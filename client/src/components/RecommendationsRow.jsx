import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import BookCard from "./BookCard.jsx";

export default function RecommendationsRow() {
  const [state, setState] = useState({ data: null, error: "" });

  useEffect(() => {
    let cancelled = false;

    api("/recommendations?limit=6")
      .then((data) => {
        if (!cancelled) setState({ data, error: "" });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const { data, error } = state;

  if (error) {
    return <p className="text-sm text-slate-500">Recommendations are unavailable right now.</p>;
  }
  if (!data) {
    return <p className="text-sm text-slate-500">Loading recommendations...</p>;
  }
  if (data.recommendations.length === 0) return null;

  
  const title = data.strategy === "popular" ? "Popular right now" : "Recommended for you";

  return (
    <section>
      <h2 className="text-xl font-bold">{title}</h2>

      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.recommendations.map((item) => (
          <div key={item.book._id} className="flex flex-col">
            <BookCard book={item.book} />
            <p className="mt-2 text-xs text-slate-500">{item.reason}</p>
          </div>
        ))}
      </div>
    </section>
  );
}