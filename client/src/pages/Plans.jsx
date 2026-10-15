import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api/client.js";
import useAuth from "../context/useAuth.js";


const formatPrice = (amount, currency) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function Plans() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const location = useLocation();

  const [plansState, setPlansState] = useState({ plans: null, error: "" });
  const [order, setOrder] = useState(null); // an unpaid order waiting at the "terminal"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paidUntil, setPaidUntil] = useState("");

 
  useEffect(() => {
    let cancelled = false;

    api("/subscriptions/plans", { auth: false })
      .then((data) => {
        if (!cancelled) setPlansState({ plans: data.plans, error: "" });
      })
      .catch((err) => {
        if (!cancelled) setPlansState({ plans: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  
  const startCheckout = async (planKey) => {
    setError("");
    setPaidUntil("");
    setBusy(true);
    try {
      const data = await api("/subscriptions/checkout", {
        method: "POST",
        body: { plan: planKey },
      });
      setOrder(data.order);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  
  const pay = async () => {
    setError("");
    setBusy(true);
    try {
      
      const receipt = await api("/subscriptions/mock-pay", {
        method: "POST",
        body: { orderId: order.id },
      });
      const result = await api("/subscriptions/confirm", {
        method: "POST",
        body: receipt,
      });

      await refreshUser(); 
      setOrder(null);
      setPaidUntil(result.subscription.endsAt);
    } catch (err) {
      setError(
        err.message === "Route not found"
          ? "Test payments are switched off on the server (ALLOW_MOCK_PAYMENTS)."
          : err.message
      );
    } finally {
      setBusy(false);
    }
  };

  const { plans, error: plansError } = plansState;
  const isSubscriber = user?.role === "subscriber";

  const primaryButton =
    "inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60";

  
  const renderAction = (planKey) => {
    if (authLoading) return null;
    if (!user) {
      return (
        <Link to="/login" state={{ from: location }} className={primaryButton}>
          Log in to subscribe
        </Link>
      );
    }
    if (user.role === "admin") {
      return <p className="text-sm text-slate-500">Admins already have full access.</p>;
    }
    return (
      <button
        onClick={() => startCheckout(planKey)}
        disabled={busy || order !== null}
        className={primaryButton}
      >
        {isSubscriber ? "Add another month" : "Subscribe"}
      </button>
    );
  };

  return (
    <section>
      <h1 className="text-2xl font-bold">Plans</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Start free, or subscribe for unlimited reading.
      </p>

      {plansError && (
        <p role="alert" className="mt-6 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800">
          {plansError}
        </p>
      )}
      {!plans && !plansError && <p className="mt-6 text-slate-500">Loading plans...</p>}

      {plans && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {/* ----- Free plan (static text) ----- */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
            <h2 className="text-lg font-semibold">Free</h2>
            <p className="mt-1 text-3xl font-bold">₹0</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>Browse the whole catalogue</li>
              <li>Read a limited number of free books each month</li>
              <li>Reading progress saved</li>
            </ul>
          </div>

          {/* ----- Paid plans (from the server) ----- */}
          {Object.entries(plans).map(([key, plan]) => (
            <div
              key={key}
              className="rounded-xl border-2 border-indigo-500 bg-white p-6 dark:bg-slate-800"
            >
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="mt-1 text-3xl font-bold">
                {formatPrice(plan.amount, plan.currency)}
                <span className="text-base font-normal text-slate-500"> / {plan.days} days</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li>Unlimited reading, premium books included</li>
                <li>Extra months stack onto your current plan</li>
                <li>Recommendations based on what you read</li>
              </ul>
              <div className="mt-6">{renderAction(key)}</div>
            </div>
          ))}
        </div>
      )}

      {/* ----- The fake payment terminal ----- */}
      {order && (
        <div
          role="dialog"
          aria-label="Test payment"
          className="mt-8 max-w-md rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-5 text-amber-950"
        >
          <h2 className="font-semibold">Test payment (no real money)</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="font-medium">Order</dt>
            <dd className="break-all">{order.id}</dd>
            <dt className="font-medium">Amount</dt>
            <dd>{formatPrice(order.amount, order.currency)}</dd>
          </dl>
          <p className="mt-3 text-xs">
            This is a simulated gateway. Never enter real card details anywhere in this project.
          </p>
          <div className="mt-4 flex gap-3">
            <button onClick={pay} disabled={busy} className={primaryButton}>
              {busy ? "Processing..." : "Pay now"}
            </button>
            <button
              onClick={() => setOrder(null)}
              disabled={busy}
              className="rounded-lg border border-amber-500 px-4 py-2 text-sm hover:bg-amber-100 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-6 max-w-md rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {paidUntil && (
        <div role="status" className="mt-6 max-w-md rounded-lg bg-green-100 px-4 py-3 text-sm text-green-900">
          <p className="font-medium">You're subscribed.</p>
          <p className="mt-1">Your plan runs until {formatDate(paidUntil)}.</p>
          <Link to="/books" className="mt-2 inline-block text-green-900 underline">
            Start reading
          </Link>
        </div>
      )}
    </section>
  );
}