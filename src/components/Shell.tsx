"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api, auth } from "@/lib/api";
import { useData, useNow } from "@/lib/hooks";
import { Icon } from "./Icon";

const NAV = [
  { href: "/", label: "Overview", icon: "overview" },
  { href: "/students", label: "Students", icon: "students" },
  { href: "/enroll", label: "Enroll", icon: "enroll" },
  { href: "/scan", label: "Scanner", icon: "scan", live: true },
  { href: "/logs", label: "Attendance log", icon: "logs" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path.startsWith("/login")) return <>{children}</>;
  return <AdminShell path={path}>{children}</AdminShell>;
}

function AdminShell({ children, path }: { children: React.ReactNode; path: string }) {
  // Gate: if the API requires auth and we have no token, go to /login before rendering pages.
  const [gate, setGate] = useState<"checking" | "ok">("checking");
  useEffect(() => {
    if (auth.get()) return setGate("ok");
    api
      .health()
      .then((h) => {
        if (h.auth_required) window.location.replace(`/login?next=${encodeURIComponent(path)}`);
        else setGate("ok");
      })
      .catch(() => setGate("ok"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = useNow();
  const health = useData(api.health, [], 10000);
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const current = NAV.find((n) => isActive(n.href));
  const consoleMode = path.startsWith("/scan");

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Icon name="scan" size={19} />
          </div>
          <div>
            <div className="brand-name">SFRS</div>
            <div className="brand-sub">Registry</div>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-label" style={{ marginTop: 8 }}>Workspace</div>
          {NAV.map((n, i) => (
            <Link key={n.href} href={n.href} className={isActive(n.href) ? "active" : ""}>
              <span className="idx">{String(i + 1).padStart(2, "0")}</span>
              <span className="lbl">{n.label}</span>
              {n.live ? <span className="live" /> : <span />}
            </Link>
          ))}
        </nav>

        <div className="sys">
          <div className="sys-title">System</div>
          <div className="sys-row">
            <span><span className={`dot ${health.data ? "on" : health.error ? "off" : ""}`} />API</span>
            <b>{health.data ? "online" : health.error ? "offline" : "…"}</b>
          </div>
          <div className="sys-row">
            <span><span className={`dot ${health.data?.mongo ? "on" : health.data ? "off" : ""}`} />MongoDB</span>
            <b>{health.data ? (health.data.mongo ? "connected" : "down") : "—"}</b>
          </div>
          <div className="sys-row">
            <span style={{ paddingLeft: 13 }}>Face vectors</span>
            <b>{health.data?.embeddings ?? "—"}</b>
          </div>
          <div className="sys-row">
            <span style={{ paddingLeft: 13 }}>Model</span>
            <b>SFace·128d</b>
          </div>
          {health.data?.auth_required && (
            <button
              className="btn ghost sm"
              style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
              onClick={() => { auth.clear(); window.location.replace("/login"); }}
            >
              Sign out
            </button>
          )}
        </div>
      </aside>

      <main className={`main ${consoleMode ? "console" : ""}`}>
        <div className="topbar">
          <div className="crumb">
            Admin / <b>{current?.label ?? "Student"}</b>
          </div>
          <div className="clock">
            <span>{now ? now.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short" }) : ""}</span>
            <span className="sep" />
            <span>{now ? now.toLocaleTimeString([], { hour12: false }) : ""}</span>
          </div>
        </div>
        {gate === "ok" ? children : <div className="skeleton" style={{ height: 320 }} />}
      </main>
    </div>
  );
}
