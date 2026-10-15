import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import useAuth from "../context/useAuth.js";

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function Account() {
  const { user, refreshUser } = useAuth();
  const [state, setState] = useState({ data: null, error: "" });

  useEffect(() => {
    let cancelled = false;

    Promise.all([api("/subscriptions/me"), api("/reading/quota")])
      .then(async ([sub, quota]) => {
        if (cancelled) return;
        setState({ data: { sub, quota }, error: "" });
        
        await refreshUser();
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const { data, error } = state;
  const loading = !data && !error;

  return (
    <section>
      <h1 className="text-2xl font-bold">My account</h1>

      <dl className="mt-6 grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
        <dt className="font-medium text-slate-500">Name</dt>
        <dd>{user.name}</dd>
        <dt className="font-medium text-slate-500">Email</dt>
        <dd>{user.email}</dd>
        <dt className="font-medium text-slate-500">Plan</dt>
        <dd className="capitalize">{data ? data.sub.role : user.role}</dd>
      </dl>

      {loading && <p className="mt-6 text-slate-500">Loading your plan...</p>}

      {error && (
        <p role="alert" className="mt-6 max-w-md rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {data && (
        <div className="mt-8 grid max-w-2xl gap-6 sm:grid-cols-2">
          {/* ----- Subscription ----- */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <h2 className="font-semibold">Subscription</h2>

            {data.sub.subscription ? (
              <p className="mt-2 text-sm">
                Active until <strong>{formatDate(data.sub.subscription.endsAt)}</strong>.
              </p>
            ) : data.sub.role === "subscriber" ? (
              <p className="mt-2 text-sm">Subscriber with no end date (test account).</p>
            ) : data.sub.role === "admin" ? (
              <p className="mt-2 text-sm">Admins have full access.</p>
            ) : (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                You're on the free plan.
              </p>
            )}

            {data.sub.role !== "admin" && (
              <Link to="/plans" className="mt-3 inline-block text-sm text-indigo-600 hover:underline">
                {data.sub.role === "subscriber" ? "Add another month" : "See plans"}
              </Link>
            )}
          </div>

          {/* ----- Free-book usage ----- */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <h2 className="font-semibold">Reading this month</h2>

            {data.quota.unlimited ? (
              <p className="mt-2 text-sm">Unlimited reading.</p>
            ) : (
              <>
                <p className="mt-2 text-sm">
                  {data.quota.used} of {data.quota.limit} free books opened
                </p>
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={data.quota.limit}
                  aria-valuenow={data.quota.used}
                >
                  <div
                    className="h-full bg-indigo-600"
                    style={{
                      width: `${Math.min((data.quota.used / data.quota.limit) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {data.quota.remaining} remaining. Resets each calendar month (UTC).
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}