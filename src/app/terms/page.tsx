import Link from "next/link";

const brand = "#1A7F5A";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-lg font-bold text-white shadow-sm"
              style={{ backgroundColor: brand }}
            >
              S
            </span>
            ShowUp
          </Link>
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold text-slate-900">Terms of Service</h1>
        <p className="mt-6 text-sm leading-relaxed text-slate-600">
          By using ShowUp, you agree to use the service responsibly and only for lawful purposes. You are
          responsible for the accuracy of client details you submit and for obtaining any consent required to
          send them communications through ShowUp.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          The service is provided &quot;as is&quot; without warranties to the extent permitted by law. We may
          update these terms from time to time; continued use after changes constitutes acceptance. For
          questions, contact{" "}
          <a href="mailto:isaac@showupapp.org" className="font-medium underline" style={{ color: brand }}>
            isaac@showupapp.org
          </a>
          .
        </p>
        <p className="mt-4 text-xs text-slate-500">Last updated: April 2026</p>
      </main>
    </div>
  );
}
