"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { StudentFields, type StudentForm } from "@/components/StudentFields";
import { api } from "@/lib/api";
import { clock, initials, ordinalYear, pct, shortDate, timeAgo } from "@/lib/format";
import { useData } from "@/lib/hooks";

function Barcode({ seed }: { seed: string }) {
  const bars = useMemo(() => {
    let h = 7;
    return Array.from({ length: 46 }, (_, i) => {
      h = (h * 31 + seed.charCodeAt(i % seed.length)) % 997;
      return 1 + (h % 4);
    });
  }, [seed]);
  return (
    <div className="barcode" aria-hidden>
      {bars.map((w, i) => <i key={i} style={{ width: w, opacity: i % 3 === 0 ? 0.35 : 1 }} />)}
    </div>
  );
}

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: s, error, reload, setData } = useData(() => api.student(id), [id]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<StudentForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const days = useMemo(() => {
    const seen = new Set((s?.history ?? []).map((h) => new Date(h.ts).toDateString()));
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return { d, on: seen.has(d.toDateString()), today: i === 13 };
    });
  }, [s]);

  if (error) {
    return (
      <div className="card empty">
        <div className="big">{error}</div>
        <Link href="/students" className="btn ghost" style={{ marginTop: 12 }}><Icon name="back" size={15} /> Back to students</Link>
      </div>
    );
  }
  if (!s) return <div className="skeleton" style={{ height: 480 }} />;

  const startEdit = () => {
    setForm({ name: s.name, student_id: s.student_id, email: s.email, phone: s.phone, department: s.department, year: s.year, section: s.section });
    setEditing(true);
    setMsg(null);
  };

  const save = async () => {
    if (!form) return;
    setBusy(true);
    try {
      const { student_id: _sid, ...rest } = form;
      const updated = await api.updateStudent(s.id, rest);
      setData(updated);
      setEditing(false);
      setMsg({ ok: true, text: "Profile updated." });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const addFaces = async (files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("images", f));
    setBusy(true);
    try {
      const r = await api.addFaces(s.id, fd);
      setMsg({ ok: true, text: `Added ${r.added} face sample${r.added > 1 ? "s" : ""}${r.rejected_images ? ` · ${r.rejected_images} skipped (no face)` : ""}.` });
      reload();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.deleteStudent(s.id);
      router.push("/students");
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
      setBusy(false);
    }
  };

  const presentDays = days.filter((d) => d.on).length;

  return (
    <div className="rise">
      <Link href="/students" className="crumb" style={{ display: "inline-flex", gap: 8, alignItems: "center", marginBottom: 18 }}>
        <Icon name="back" size={14} /> All students
      </Link>

      <div className="detail">
        <aside className="idcard">
          <div className="band"><span>SFRS · Student Identity</span><b>● Verified</b></div>
          <div className="portrait">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {s.photo ? <img src={s.photo} alt={s.name} /> : <div className="serif" style={{ display: "grid", placeItems: "center", height: "100%", fontSize: 90, color: "#6f6c60" }}>{initials(s.name)}</div>}
          </div>
          <div className="nm">{s.name}</div>
          <div className="sid">{s.student_id}</div>
          <div className="kv">
            <div><span>Department</span><b>{s.department || "—"}</b></div>
            <div><span>Year · Section</span><b>{ordinalYear(s.year)}{s.section ? ` · ${s.section}` : ""}</b></div>
            <div><span>Email</span><b>{s.email || "—"}</b></div>
            <div><span>Phone</span><b>{s.phone || "—"}</b></div>
          </div>
          <Barcode seed={s.student_id} />
        </aside>

        <div className="panel-grid">
          <div className="page-head" style={{ marginBottom: 0 }}>
            <div>
              <div className="eyebrow">Profile</div>
              <h1 className="title">{s.name.split(" ")[0]} <em>{s.name.split(" ").slice(1).join(" ")}</em></h1>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {!editing && <button className="btn ghost" onClick={startEdit}><Icon name="edit" size={15} /> Edit</button>}
              <button className="btn ghost" onClick={() => fileRef.current?.click()} disabled={busy}><Icon name="upload" size={15} /> Add face samples</button>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFaces(e.target.files)} />
              {confirmDel ? (
                <span className="confirm">
                  <span className="muted">Delete permanently?</span>
                  <button className="btn accent sm" onClick={remove} disabled={busy}>Delete</button>
                  <button className="btn ghost sm" onClick={() => setConfirmDel(false)}>Cancel</button>
                </span>
              ) : (
                <button className="btn danger icon" title="Delete student" onClick={() => setConfirmDel(true)}><Icon name="trash" size={16} /></button>
              )}
            </div>
          </div>

          {msg && (
            <div className={msg.ok ? "pill ok" : "err"} style={msg.ok ? { height: "auto", padding: "10px 14px", fontSize: 12, textTransform: "none", letterSpacing: 0 } : {}}>
              <Icon name={msg.ok ? "check" : "alert"} size={15} /> {msg.text}
            </div>
          )}

          <div className="card kpis">
            <div><div className="k">Check-ins</div><div className="v">{s.scan_count}</div></div>
            <div><div className="k">Present · 14d</div><div className="v">{presentDays}<span className="muted" style={{ fontSize: 20 }}>/14</span></div></div>
            <div><div className="k">Face samples</div><div className="v">{s.samples}</div></div>
            <div><div className="k">Last seen</div><div className="v sm">{timeAgo(s.last_seen)}</div></div>
          </div>

          {editing && form && (
            <div className="card">
              <div className="card-head"><div className="card-title">Edit details</div></div>
              <div className="card-body">
                <StudentFields value={form} onChange={setForm} lockId />
                <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
                  <button className="btn ghost" onClick={() => setEditing(false)}>Cancel</button>
                  <button className="btn" onClick={save} disabled={busy || !form.name.trim()}><Icon name="check" size={15} /> Save changes</button>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-head">
              <div className="card-title">Presence <span className="n">· last 14 days</span></div>
              <span className="mono muted" style={{ fontSize: 11 }}>Enrolled {s.created_at ? shortDate(s.created_at) : "—"}</span>
            </div>
            <div className="card-body">
              <div className="calendar">
                {days.map((d, i) => <div key={i} className={`c ${d.on ? "on" : ""} ${d.today ? "today" : ""}`} title={d.d.toDateString()} />)}
              </div>
              <div className="cal-labels">
                {days.map((d, i) => <span key={i}>{d.d.toLocaleDateString([], { weekday: "narrow" })}</span>)}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Check-in history <span className="n">· {s.history.length}</span></div>
            </div>
            {s.history.length === 0 && <div className="empty"><div className="big">No check-ins yet</div>Their first scan will appear here.</div>}
            {s.history.map((h) => (
              <div className="hist-row" key={h.id}>
                <span>
                  <b style={{ fontWeight: 500 }}>{new Date(h.ts).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}</b>
                  <span className="mono muted" style={{ marginLeft: 12, fontSize: 12 }}>{clock(h.ts)}</span>
                </span>
                <span className="pill ok">Match {pct(h.score)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
