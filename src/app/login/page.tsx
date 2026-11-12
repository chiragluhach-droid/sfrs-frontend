"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { api, auth } from "@/lib/api";

export default function Login() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.login(password);
      if (r.token) auth.set(r.token);
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login card rise" onSubmit={submit}>
        <div className="brand" style={{ borderBottom: 0, padding: 0, marginBottom: 28 }}>
          <div className="brand-mark"><Icon name="scan" size={19} /></div>
          <div>
            <div className="brand-name">SFRS</div>
            <div className="brand-sub">Registry</div>
          </div>
        </div>
        <div className="eyebrow">Restricted</div>
        <h1 className="title" style={{ fontSize: 44 }}>Admin <em>sign in.</em></h1>
        <p className="lede" style={{ marginBottom: 26 }}>Student records and the face scanner are only available to administrators.</p>
        <div className="field">
          <label htmlFor="pw">Password</label>
          <input id="pw" className="input" type="password" autoFocus autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div className="err" style={{ marginTop: 14 }}><Icon name="alert" size={16} />{error}</div>}
        <button className="btn accent" type="submit" disabled={busy || !password} style={{ width: "100%", justifyContent: "center", marginTop: 20, height: 46 }}>
          {busy ? "Signing in…" : <>Sign in <Icon name="arrow" size={15} /></>}
        </button>
      </form>
    </div>
  );
}
