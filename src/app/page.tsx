"use client";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";
import { clock, longDate, pct, timeAgo } from "@/lib/format";
import { useData, useNow } from "@/lib/hooks";

export default function Overview() {
  const { data: s, error } = useData(api.stats, [], 5000);
  const now = useNow(60000);
  const hour = now?.getHours() ?? 9;
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const total = s?.total_students ?? 0;
  const present = s?.present_today ?? 0;
  const rate = total ? present / total : 0;
  const ticks = 40;
  const lit = Math.round(rate * ticks);
  const weekMax = Math.max(1, ...(s?.week.map((w) => w.present) ?? [1]));

  return (
    <div className="rise">
      <div className="page-head">
        <div>
          <div className="eyebrow">{now ? longDate(now) : "Today"}</div>
          <h1 className="title">
            {greet}, <em>admin.</em>
          </h1>
          <p className="lede">Live attendance from the face scanner. Figures refresh every few seconds.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/enroll" className="btn ghost"><Icon name="plus" size={16} /> Enroll student</Link>
          <Link href="/scan" className="btn accent"><Icon name="scan" size={16} /> Open scanner</Link>
        </div>
      </div>

      {error && <div className="err" style={{ marginBottom: 18 }}><Icon name="alert" size={16} />{error}</div>}

      <div className="grid-over">
        <section className="card hero-att">
          <div className="k">Present today</div>
          <div className="hero-pct">
            <div className="v">{total ? pct(rate) : "—"}</div>
            <div className="mono muted" style={{ fontSize: 11, marginTop: 4 }}>attendance rate</div>
          </div>
          <div>
            <div className="hero-num">
              {s ? present : "–"}
              <small>/ {s ? total : "–"}</small>
            </div>
            <div className="ticks" aria-hidden>
              {Array.from({ length: ticks }).map((_, i) => (
                <i key={i} className={i < lit ? "on" : ""} style={{ height: `${55 + ((i * 37) % 45)}%` }} />
              ))}
            </div>
          </div>
        </section>

        <section className="card stat">
          <div className="k">Enrolled <Icon name="students" size={15} /></div>
          <div>
            <div className="v">{s?.total_students ?? "–"}</div>
            <div className="d">students on record</div>
          </div>
        </section>
        <section className="card stat">
          <div className="k">Scans <Icon name="scan" size={15} /></div>
          <div>
            <div className="v">{s?.scans_today ?? "–"}</div>
            <div className="d">events logged today</div>
          </div>
        </section>
        <section className="card stat dark">
          <div className="k">Unknown <Icon name="alert" size={15} /></div>
          <div>
            <div className="v" style={{ color: s?.unknown_today ? "var(--accent)" : undefined }}>{s?.unknown_today ?? "–"}</div>
            <div className="d">unmatched faces today</div>
          </div>
        </section>

        <section className="card week">
          <div className="card-head">
            <div className="card-title">Daily presence <span className="n">· last 7 days</span></div>
            <span className="mono muted" style={{ fontSize: 11 }}>unique students</span>
          </div>
          <div className="card-body">
            <div className="bars">
              {(s?.week ?? Array.from({ length: 7 }, (_, i) => ({ date: String(i), present: 0 }))).map((w, i, arr) => {
                const isToday = i === arr.length - 1;
                const d = s ? new Date(w.date + "T12:00:00") : null;
                return (
                  <div key={w.date} className={`bar ${isToday ? "today" : ""} ${w.present ? "" : "zero"}`}>
                    <span className="val">{s ? w.present : ""}</span>
                    <div className="col" style={{ height: `${(w.present / weekMax) * 78}%` }} />
                    <span className="day">{d ? (isToday ? "Today" : d.toLocaleDateString([], { weekday: "short" })) : "···"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="card depts">
          <div className="card-head">
            <div className="card-title">By department <span className="n">· today</span></div>
          </div>
          <div className="card-body" style={{ paddingTop: 6, paddingBottom: 8 }}>
            {s && s.departments.length === 0 && (
              <div className="empty" style={{ padding: "30px 0" }}>
                <div className="big">No departments yet</div>
                Enroll students to see the breakdown.
              </div>
            )}
            {s?.departments.slice(0, 6).map((d) => (
              <div className="dept-row" key={d.name}>
                <div className="dept-top">
                  <span className="name">{d.name}</span>
                  <span className="cnt">{d.present}<span className="muted"> / {d.total}</span></span>
                </div>
                <div className="track"><i style={{ width: `${d.total ? (d.present / d.total) * 100 : 0}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="card feed">
          <div className="card-head">
            <div className="card-title">Live feed <span className="n">· latest scans</span></div>
            <Link href="/logs" className="btn ghost sm">Full log <Icon name="arrow" size={14} /></Link>
          </div>
          {s && s.recent.length === 0 && (
            <div className="empty">
              <div className="big">Quiet so far</div>
              Scans will stream in here as students check in.
            </div>
          )}
          {s?.recent.map((r) => {
            const known = r.status === "recognized";
            const row = (
              <>
                <Avatar src={r.photo} name={known ? r.name : "?"} size={40} />
                <div className="who">
                  <b>{known ? r.name : "Unrecognised face"}</b>
                  <span>{known ? `${r.student_id} · ${r.department || "—"}` : `best match ${pct(r.score)}`}</span>
                </div>
                <span className={`pill ${known ? "ok" : "bad"}`}>{known ? `Checked in · ${pct(r.score)}` : "Unknown"}</span>
                <div className="t">{clock(r.ts)}<div className="muted" style={{ fontSize: 10.5 }}>{timeAgo(r.ts)}</div></div>
              </>
            );
            return known && r.student_ref ? (
              <Link key={r.id} href={`/students/${r.student_ref}`} className="feed-row">{row}</Link>
            ) : (
              <div key={r.id} className="feed-row">{row}</div>
            );
          })}
        </section>

        <section className="scan-cta">
          <svg className="reticle" viewBox="0 0 200 200" fill="none" stroke="#d2f35a" strokeWidth="1.5">
            <circle cx="100" cy="100" r="62" strokeDasharray="3 6" opacity=".5">
              <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="18s" repeatCount="indefinite" />
            </circle>
            <circle cx="100" cy="100" r="88" opacity=".2" />
            <path d="M60 40H40v20M140 40h20v20M60 160H40v-20M140 160h20v-20" strokeWidth="2.5" />
            <circle cx="100" cy="100" r="3" fill="#d2f35a" />
          </svg>
          <div className="mono" style={{ fontSize: 10.5, letterSpacing: ".14em", color: "#6f6c60", textTransform: "uppercase" }}>Station 01 · Webcam</div>
          <div>
            <h3>Point. Match. <em>Marked.</em></h3>
            <p>Start the live scanner. Students are identified in under a second and checked in automatically.</p>
            <Link href="/scan" className="btn">Launch scanner <Icon name="arrow" size={15} /></Link>
          </div>
        </section>
      </div>
    </div>
  );
}
