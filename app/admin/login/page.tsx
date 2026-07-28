"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.replace("/admin");
      router.refresh();
    } else {
      const { error } = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      setError(error || "Login failed.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-24 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold text-ink">
        Editor login
      </h1>
      <form onSubmit={submit} className="mt-6">
        <label className="block font-mono text-xs uppercase tracking-wider text-ink-faint">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          className="mt-2 w-full rounded-xl border border-ink/15 bg-canvas px-4 py-3 text-ink focus:border-ink focus:outline-none"
        />
        {error && <p className="mt-2 text-sm text-signal">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-4 w-full rounded-xl bg-signal px-6 py-3 font-mono text-sm font-semibold uppercase tracking-wider text-canvas transition-colors hover:bg-signal-hover disabled:opacity-40"
        >
          {busy ? "…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
