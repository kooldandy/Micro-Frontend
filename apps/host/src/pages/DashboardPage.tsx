export default function DashboardPage() {
  return (
    <div className="host-max-w-3xl host-mx-auto host-mt-10 host-p-6">
      <h1 className="host-text-2xl host-font-semibold host-text-slate-900">Dashboard</h1>
      <p className="host-text-slate-600 host-mt-2">
        This is the host shell. Use the nav above to load the Auth, Profile, and Product
        microfrontends — each is an independently built and deployed Vite app, federated into
        this page at runtime.
      </p>
    </div>
  );
}
