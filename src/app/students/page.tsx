"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";
import { initials, isToday, ordinalYear, timeAgo } from "@/lib/format";
import { useData } from "@/lib/hooks";

export default function Students() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [dept, setDept] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 220);
    return () => clearTimeout(t);
  }, [q]);

  const all = useData(() => api.students(), []);
  const list = useData(() => api.students(debounced, dept), [debounced, dept]);
  const counts = (all.data ?? []).reduce<Record<string, number>>((m, s) => {
    const k = s.department || "Unassigned";
    m[k] = (m[k] ?? 0) + 1;
    return m;
  }, {});
  const depts = Object.keys(counts).filter((d) => d !== "Unassigned").sort();

  return (
    <div className="rise">
      <div className="page-head">
        <div>
          <div className="eyebrow">Directory</div>
          <h1 className="title">
            Students <em>({all.data?.length ?? "…"})</em>
          </h1>
          <p className="lede">Everyone enrolled in the face registry. Open a card for the full profile and check-in history.</p>
        </div>
        <Link href="/enroll" className="btn accent"><Icon name="plus" size={16} /> Enroll student</Link>
      </div>

      <div className="toolbar">
        <div className="chips">
          <button className={`chip ${dept === "" ? "on" : ""}`} onClick={() => setDept("")}>
            All <span className="c">{all.data?.length ?? 0}</span>
          </button>
          {depts.map((d) => (
            <button key={d} className={`chip ${dept === d ? "on" : ""}`} onClick={() => setDept(d)}>
              {d} <span className="c">{counts[d]}</span>
            </button>
          ))}
        </div>
        <div className="search">
          <Icon name="search" size={16} />
          <input className="input" placeholder="Search name, ID or email…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {list.error && <div className="err"><Icon name="alert" size={16} />{list.error}</div>}

      {list.loading && !list.data && (
        <div className="sgrid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card" style={{ overflow: "hidden" }}>
              <div className="skeleton" style={{ aspectRatio: "1", borderRadius: 0 }} />
              <div style={{ padding: 16 }}>
                <div className="skeleton" style={{ height: 22, width: "70%" }} />
                <div className="skeleton" style={{ height: 12, width: "40%", marginTop: 10 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {list.data && list.data.length === 0 && (
        <div className="card empty">
          <div className="big">{debounced || dept ? "No one matches that" : "The registry is empty"}</div>
          <p style={{ margin: "0 0 18px" }}>{debounced || dept ? "Try a different search or filter." : "Enroll your first student to get started."}</p>
          {!debounced && !dept && <Link href="/enroll" className="btn">Enroll a student <Icon name="arrow" size={15} /></Link>}
        </div>
      )}

      <div className="sgrid">
        {list.data?.map((s, i) => (
          <Link key={s.id} href={`/students/${s.id}`} className="card scard rise" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="ph">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {s.photo ? <img src={s.photo} alt={s.name} /> : <div className="initials">{initials(s.name)}</div>}
              <span className="tag">{s.student_id}</span>
              {isToday(s.last_seen) && <span className="pill ok seen"><span className="dot on" />Present</span>}
            </div>
            <div className="info">
              <div className="nm">{s.name}</div>
              <div className="meta">
                <span>{s.department || "—"} · {ordinalYear(s.year)}{s.section ? ` · ${s.section}` : ""}</span>
                <span>{timeAgo(s.last_seen)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
