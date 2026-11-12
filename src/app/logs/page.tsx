"use client";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { api, type Scan } from "@/lib/api";
import { clock, pct } from "@/lib/format";
import { useData } from "@/lib/hooks";

function toCsv(rows: Scan[]) {
  const head = ["timestamp", "status", "student_id", "name", "department", "score"];
  const lines = rows.map((r) =>
    [r.ts, r.status, r.student_id ?? "", r.name ?? "", r.department ?? "", r.score].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
  );
  return [head.join(","), ...lines].join("\n");
}

export default function Logs() {
  const [status, setStatus] = useState("");
  const [today, setToday] = useState(true);
  const { data, error, loading } = useData(() => api.scans(status, today, 300), [status, today], 5000);

  const exportCsv = () => {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([toCsv(data)], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rise">
      <div className="page-head">
        <div>
          <div className="eyebrow">Records</div>
          <h1 className="title">Attendance <em>log.</em></h1>
          <p className="lede">Every scan event from the scanner, newest first. Updates live.</p>
        </div>
        <button className="btn ghost" onClick={exportCsv} disabled={!data?.length}><Icon name="upload" size={15} /> Export CSV</button>
      </div>

      <div className="toolbar">
        <div className="seg">
          {[["", "All events"], ["recognized", "Recognised"], ["unknown", "Unknown"]].map(([v, l]) => (
            <button key={v} className={status === v ? "on" : ""} onClick={() => setStatus(v)}>{l}</button>
          ))}
        </div>
        <div className="seg">
          <button className={today ? "on" : ""} onClick={() => setToday(true)}>Today</button>
          <button className={!today ? "on" : ""} onClick={() => setToday(false)}>All time</button>
        </div>
      </div>

      {error && <div className="err" style={{ marginBottom: 16 }}><Icon name="alert" size={16} />{error}</div>}

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 130 }}>Time</th>
              <th>Student</th>
              <th>ID</th>
              <th>Department</th>
              <th>Confidence</th>
              <th style={{ textAlign: "right" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data && (
              <tr><td colSpan={6}><div className="skeleton" style={{ height: 120 }} /></td></tr>
            )}
            {data?.length === 0 && (
              <tr><td colSpan={6}><div className="empty"><div className="big">Nothing logged{today ? " today" : ""}</div>Open the scanner to start recording check-ins.</div></td></tr>
            )}
            {data?.map((r) => {
              const known = r.status === "recognized";
              return (
                <tr key={r.id}>
                  <td>
                    <div className="mono" style={{ fontSize: 12.5 }}>{clock(r.ts)}</div>
                    <div className="mono muted" style={{ fontSize: 10.5 }}>{new Date(r.ts).toLocaleDateString([], { day: "2-digit", month: "short" })}</div>
                  </td>
                  <td>
                    {known && r.student_ref ? (
                      <Link href={`/students/${r.student_ref}`} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <Avatar src={r.photo} name={r.name} size={32} />
                        <b style={{ fontWeight: 500 }}>{r.name}</b>
                      </Link>
                    ) : (
                      <span style={{ display: "flex", gap: 12, alignItems: "center", color: "var(--ink-3)" }}>
                        <Avatar name="?" size={32} /> <i className="serif" style={{ fontSize: 16 }}>Unrecognised face</i>
                      </span>
                    )}
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>{r.student_id ?? "—"}</td>
                  <td>{r.department || "—"}</td>
                  <td>
                    <div className="conf">
                      <div className="track"><i className={known ? "" : "bad"} style={{ width: `${Math.max(0, r.score) * 100}%` }} /></div>
                      {pct(r.score)}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span className={`pill ${known ? "ok" : "bad"}`}>{known ? "Checked in" : "Unknown"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
