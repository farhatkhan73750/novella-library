import useAuth from "../context/useAuth.js";

export default function Account() {
  const { user } = useAuth();

  return (
    <section>
      <h1 className="text-2xl font-bold">My account</h1>

      <dl className="mt-6 grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
        <dt className="font-medium text-slate-500">Name</dt>
        <dd>{user.name}</dd>
        <dt className="font-medium text-slate-500">Email</dt>
        <dd>{user.email}</dd>
        <dt className="font-medium text-slate-500">Plan</dt>
        <dd className="capitalize">{user.role}</dd>
      </dl>
    </section>
  );
}