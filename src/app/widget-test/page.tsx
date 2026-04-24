"use client";

import Script from "next/script";
import { useMemo } from "react";

const TEST_WIDGET_KEY = process.env.NEXT_PUBLIC_WIDGET_TEST_KEY ?? "";

export default function WidgetTestPage() {
  const scriptSnippet = useMemo(
    () =>
      `<script src="${typeof window === "undefined" ? "https://www.showupapp.org" : window.location.origin}/widget.js" data-key="${TEST_WIDGET_KEY}"></script>`,
    []
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Widget test page</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This is a test page. The widget below simulates how it appears on a client&apos;s
          website.
        </p>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Instructions</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            <li>Set `NEXT_PUBLIC_WIDGET_TEST_KEY` in your environment with a real widget key.</li>
            <li>Refresh this page and click the green chat button.</li>
            <li>Send a message to test the full widget + API flow.</li>
          </ol>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-slate-900">Embed snippet used here</h2>
          <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
            {scriptSnippet}
          </pre>
        </section>
      </div>

      {TEST_WIDGET_KEY ? (
        <Script src="/widget.js" data-key={TEST_WIDGET_KEY} strategy="afterInteractive" />
      ) : (
        <p className="mx-auto mt-4 max-w-3xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Missing <code>NEXT_PUBLIC_WIDGET_TEST_KEY</code>. Add it to your environment to load
          the widget on this page.
        </p>
      )}
    </main>
  );
}
