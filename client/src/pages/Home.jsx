import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import useAuth from "../context/useAuth.js";
import ContinueReading from "../components/ContinueReading.jsx";
import RecommendationsRow from "../components/RecommendationsRow.jsx";

export default function Home() {
  const { user } = useAuth();

  // status can be: "checking", "online" or "offline"
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    api("/health", { auth: false })
      .then((data) => {
        if (cancelled) return;
        setStatus("online");
        setMessage(data.app);
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("offline");
        setMessage(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const badge = {
    checking: "bg-slate-200 text-slate-700",
    online: "bg-green-100 text-green-800",
    offline: "bg-red-100 text-red-800",
  }[status];

  return (
    <div>
      <section className="text-center">
        <h1 className="text-4xl font-bold">Welcome to Novella</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Read classic books and web novels, free or with a subscription.
        </p>
        <Link
          to="/books"
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
        >
          Browse books
        </Link>
      </section>

      {/* Members only: key= throws away old data if a different account logs in */}
      {user && (
        <div className="mt-12 space-y-12">
          <ContinueReading key={`continue-${user.id}`} />
          <RecommendationsRow key={`recs-${user.id}`} />
        </div>
      )}

      <p className="mt-12 text-center">
        <span className={`inline-block rounded-full px-4 py-1 text-sm font-medium ${badge}`}>
          {status === "checking" && "Checking server..."}
          {status === "online" && `Server connected: ${message}`}
          {status === "offline" && `Server offline: ${message}`}
        </span>
      </p>
    </div>
  );
}