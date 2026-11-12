"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { api, type RecognizeResult, type RecognizedFace, type Student } from "@/lib/api";
import { clock, ordinalYear, pct } from "@/lib/format";
import { useCamera } from "@/lib/hooks";

type Ident = { face: RecognizedFace & { student: Student }; at: number; logged: boolean };
type SessionHit = { key: string; student: Student; ts: string; score: number };

const SCAN_GAP_MS = 450;
const HOLD_MS = 3500;

function chime() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.setValueAtTime(1320, ctx.currentTime + 0.09);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.34);
    setTimeout(() => ctx.close(), 500);
  } catch {}
}

export default function Scanner() {
  const cam = useCamera();
  const { ready, capture } = cam;
  const [running, setRunning] = useState(true);
  const [record, setRecord] = useState(true);
  const [sound, setSound] = useState(true);
  const [result, setResult] = useState<RecognizeResult | null>(null);
  const [ident, setIdent] = useState<Ident | null>(null);
  const [unknownAt, setUnknownAt] = useState(0);
  const [session, setSession] = useState<SessionHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [, force] = useState(0);

  const opts = useRef({ running, record, sound });
  opts.current = { running, record, sound };

  // recognition loop: one request in flight at a time
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    (async () => {
      while (alive) {
        if (opts.current.running) {
          const blob = await capture(640, 0.8);
          if (blob) {
            const t0 = performance.now();
            try {
              const r = await api.recognize(blob, opts.current.record);
              if (!alive) break;
              setLatency(Math.round(performance.now() - t0));
              setResult(r);
              setError(null);
              const match = r.faces.find((f) => f.student) as Ident["face"] | undefined;
              if (match) {
                setIdent((prev) => ({
                  face: match,
                  at: Date.now(),
                  logged: match.logged || (prev?.face.student.id === match.student.id && prev.logged),
                }));
                if (match.logged) {
                  if (opts.current.sound) chime();
                  setSession((s) =>
                    [
                      { key: `${match.student.id}-${Date.now()}`, student: match.student, ts: new Date().toISOString(), score: match.score },
                      ...s,
                    ].slice(0, 10)
                  );
                }
              } else if (r.faces.length) {
                setUnknownAt(Date.now());
              }
            } catch (e) {
              setError((e as Error).message);
              await new Promise((res) => setTimeout(res, 1500));
            }
          }
        }
        await new Promise((res) => setTimeout(res, SCAN_GAP_MS));
      }
    })();
    return () => {
      alive = false;
    };
  }, [ready, capture]);

  // tick so the identity card times out
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 500);
    return () => clearInterval(t);
  }, []);

  const now = Date.now();
  const showIdent = ident && now - ident.at < HOLD_MS ? ident : null;
  const showUnknown = !showIdent && now - unknownAt < 1500;
  const W = result?.width ?? 1;
  const H = result?.height ?? 1;
  const s = showIdent?.face.student;

  return (
    <div className="rise">
      <div className="page-head">
        <div>
          <div className="eyebrow">Live · Station 01</div>
          <h1 className="title">Face <em>scanner.</em></h1>
          <p className="lede">Students step into frame and are matched against the registry. Check-ins are recorded automatically.</p>
        </div>
      </div>

      <div className="scanner">
        <div>
          <div className="viewport" style={{ aspectRatio: `${cam.dims.w} / ${cam.dims.h}` }}>
            <video ref={cam.videoRef} muted playsInline />
            <div className="corners"><i /><i /><i /><i /></div>
            {running && ready && <div className="sweep" />}

            {running &&
              result?.faces.map((f, i) => {
                const [x, y, w, h] = f.box;
                const known = !!f.student;
                return (
                  <div
                    key={i}
                    className={`fbox ${known ? "match" : "unknown"}`}
                    style={{ left: `${((W - x - w) / W) * 100}%`, top: `${(y / H) * 100}%`, width: `${(w / W) * 100}%`, height: `${(h / H) * 100}%` }}
                  >
                    <span className="c1" />
                    <span className="c2" />
                    <span className="lab">{known ? `${f.student!.name.split(" ")[0]} · ${pct(f.score)}` : "UNKNOWN"}</span>
                  </div>
                );
              })}

            <div className="hud">
              <span className={`rec ${running ? "" : "paused"}`}>
                <i />
                {running ? (record ? "Scanning · recording" : "Scanning · preview") : "Paused"}
              </span>
              <span>{result ? `${result.faces.length} face${result.faces.length === 1 ? "" : "s"}` : "—"}</span>
            </div>
            <div className="bottom-hud">
              <span>YuNet → SFace · τ {result?.threshold ?? "0.40"}</span>
              <span>{latency !== null ? `${latency} ms` : ""}</span>
            </div>

            {!ready && (
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#9d9a8c", textAlign: "center", padding: 30 }}>
                {cam.error ? <div><Icon name="alert" size={22} /><p>{cam.error}</p></div> : "Starting camera…"}
              </div>
            )}
          </div>
          {error && <div className="err" style={{ marginTop: 12 }}><Icon name="alert" size={16} />{error}</div>}
        </div>

        <div className="side">
          <div className={`ident ${showUnknown ? "unknown" : ""}`}>
            <div className="k">
              <span>Identification</span>
              <span style={{ color: s ? "var(--lime)" : showUnknown ? "var(--accent)" : undefined }}>
                {s ? "● Match" : showUnknown ? "● No match" : "○ Waiting"}
              </span>
            </div>

            {s && showIdent && (
              <div className="who" key={s.id}>
                <div className="ph">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {s.photo && <img src={s.photo} alt={s.name} />}
                  <span className="score">{pct(showIdent.face.score)} match</span>
                </div>
                <div className="nm">{s.name}</div>
                <div className="sid">{s.student_id}</div>
                <div className="kv">
                  <div><span>Department</span><b>{s.department || "—"}</b></div>
                  <div><span>Year · Sec</span><b>{ordinalYear(s.year)}{s.section ? ` · ${s.section}` : ""}</b></div>
                  <div><span>Email</span><b>{s.email || "—"}</b></div>
                  <div><span>Check-ins</span><b>{s.scan_count}</b></div>
                </div>
                {record ? (
                  showIdent.logged ? (
                    <div className="status ok"><Icon name="check" size={17} /> Checked in at {s.last_seen ? clock(s.last_seen) : clock(new Date())}</div>
                  ) : (
                    <div className="status seen"><Icon name="shield" size={17} /> Verified · already checked in recently</div>
                  )
                ) : (
                  <div className="status seen"><Icon name="shield" size={17} /> Verified · preview mode, not recorded</div>
                )}
                <Link href={`/students/${s.id}`} className="mono" style={{ fontSize: 11, color: "#6f6c60", marginTop: 12, display: "inline-flex", gap: 6, alignItems: "center" }}>
                  Open profile <Icon name="arrow" size={12} />
                </Link>
              </div>
            )}

            {showUnknown && (
              <div className="unk">
                <div>
                  <div style={{ color: "var(--accent)", marginBottom: 14 }}><Icon name="alert" size={40} stroke={1.3} /></div>
                  <div className="big">Not recognised</div>
                  <p style={{ color: "#9d9a8c", maxWidth: 240, margin: "8px auto 18px" }}>
                    This face isn&apos;t in the registry. Enroll them first, or improve the lighting and try again.
                  </p>
                  <Link href="/enroll" className="btn sm" style={{ background: "transparent", borderColor: "#3a3d30", color: "#e8e6dc" }}>
                    Enroll new student
                  </Link>
                </div>
              </div>
            )}

            {!s && !showUnknown && (
              <div className="waiting">
                <div>
                  <div className="ring"><Icon name="scan" size={36} stroke={1.2} /></div>
                  <div className="big">Step into frame</div>
                  <p style={{ margin: "6px 0 0", fontSize: 13 }}>Face the camera, about an arm&apos;s length away.</p>
                </div>
              </div>
            )}
          </div>

          <div className="ctrls">
            <button className={`btn ${running ? "" : "on"}`} onClick={() => setRunning((r) => !r)}>
              <Icon name={running ? "pause" : "play"} size={15} /> {running ? "Pause" : "Resume"}
            </button>
            <button className={`btn ${record ? "on" : ""}`} onClick={() => setRecord((r) => !r)} title="Record check-ins to the attendance log">
              <Icon name="record" size={15} /> {record ? "Recording" : "Preview"}
            </button>
            <button className={`btn icon ${sound ? "on" : ""}`} onClick={() => setSound((v) => !v)} title="Chime on check-in" style={{ flex: "none" }}>
              ♪
            </button>
          </div>

          <div className="session">
            <div className="h">
              <span>This session</span>
              <span>{session.length} check-in{session.length === 1 ? "" : "s"}</span>
            </div>
            {session.length === 0 && <div style={{ padding: 18, color: "#6f6c60", fontSize: 13 }}>Check-ins from this screen will appear here.</div>}
            {session.map((h) => (
              <div className="r" key={h.key}>
                <Avatar src={h.student.photo} name={h.student.name} size={30} />
                <div>
                  <div style={{ color: "#e8e6dc" }}>{h.student.name}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: "#6f6c60" }}>{h.student.student_id}</div>
                </div>
                <span className="t">{clock(h.ts)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
