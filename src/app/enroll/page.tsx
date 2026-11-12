"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { StudentFields, emptyForm, type StudentForm } from "@/components/StudentFields";
import { api, type Student } from "@/lib/api";
import { useCamera } from "@/lib/hooks";

type Shot = { blob: Blob; url: string };
const PROMPTS = ["Look straight at the camera", "Turn slightly to your left", "Turn slightly to your right"];

export default function Enroll() {
  const cam = useCamera();
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [shots, setShots] = useState<(Shot | null)[]>([null, null, null]);
  const [flash, setFlash] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<(Student & { rejected_images: number }) | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const nextSlot = shots.findIndex((s) => !s);
  const filled = shots.filter(Boolean) as Shot[];

  const snap = useCallback(async () => {
    if (nextSlot < 0 || !cam.ready) return;
    const blob = await cam.capture(1280, 0.92);
    if (!blob) return;
    setFlash((f) => f + 1);
    setShots((prev) => prev.map((s, i) => (i === nextSlot ? { blob, url: URL.createObjectURL(blob) } : s)));
  }, [nextSlot, cam]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.code === "Space" && tag !== "INPUT" && tag !== "SELECT" && tag !== "TEXTAREA") {
        e.preventDefault();
        snap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [snap]);

  const removeShot = (i: number) =>
    setShots((prev) => prev.map((s, j) => {
      if (j === i && s) URL.revokeObjectURL(s.url);
      return j === i ? null : s;
    }));

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files);
    setShots((prev) => {
      const next = [...prev];
      for (const f of list) {
        const slot = next.findIndex((s) => !s);
        if (slot < 0) break;
        next[slot] = { blob: f, url: URL.createObjectURL(f) };
      }
      return next;
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!filled.length) return setError("Capture at least one photo of the student's face.");
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    filled.forEach((s, i) => fd.append("images", s.blob, `face-${i}.jpg`));
    setBusy(true);
    try {
      setDone(await api.createStudent(fd));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    shots.forEach((s) => s && URL.revokeObjectURL(s.url));
    setShots([null, null, null]);
    setForm(emptyForm);
    setDone(null);
    setError(null);
  };

  if (done) {
    return (
      <div className="rise" style={{ maxWidth: 560, margin: "40px auto" }}>
        <div className="card success">
          <div className="portrait">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={done.photo} alt={done.name} />
          </div>
          <div className="eyebrow" style={{ justifyContent: "center" }}>Enrolled</div>
          <h1 className="title" style={{ fontSize: 46 }}>{done.name}</h1>
          <p className="mono" style={{ color: "var(--accent)", margin: "10px 0 6px" }}>{done.student_id}</p>
          <p className="muted" style={{ margin: "0 0 26px" }}>
            {done.samples} face sample{done.samples > 1 ? "s" : ""} stored
            {done.rejected_images ? ` · ${done.rejected_images} photo(s) skipped, no face found` : ""}. Ready to be recognised.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="btn ghost" onClick={reset}><Icon name="plus" size={15} /> Enroll another</button>
            <Link className="btn" href={`/students/${done.id}`}>View profile <Icon name="arrow" size={15} /></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className="rise" onSubmit={submit}>
      <div className="page-head">
        <div>
          <div className="eyebrow">New record</div>
          <h1 className="title">Enroll a <em>student.</em></h1>
          <p className="lede">Fill in the details, then capture up to three face samples. More angles make recognition more reliable.</p>
        </div>
      </div>

      <div className="enroll">
        <div className="card">
          <div className="card-head">
            <div className="card-title"><span className="step-n">01</span> Student details</div>
          </div>
          <div className="card-body">
            <StudentFields value={form} onChange={setForm} />
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title"><span className="step-n">02</span> Face samples <span className="n">· {filled.length}/3</span></div>
            <button type="button" className="btn ghost sm" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={14} /> Upload instead
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          </div>
          <div className="card-body">
            <div className="cam">
              <video ref={cam.videoRef} muted playsInline />
              {cam.ready && (
                <div className="guide"><div className="oval" /></div>
              )}
              {!cam.ready && (
                <div className="cam-msg">
                  {cam.error ? <span><Icon name="alert" /><br />{cam.error}<br /><br />You can still upload photos.</span> : "Starting camera…"}
                </div>
              )}
              {cam.ready && nextSlot >= 0 && (
                <div className="prompt"><b>{nextSlot + 1}/3</b> {PROMPTS[nextSlot]}</div>
              )}
              {cam.ready && nextSlot < 0 && (
                <div className="prompt"><b>✓</b> All samples captured</div>
              )}
              <div key={flash} className={`flash ${flash ? "go" : ""}`} />
            </div>

            <div className="slots">
              {shots.map((s, i) => (
                <div key={i} className={`slot ${i === nextSlot ? "active" : ""}`}>
                  {s ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.url} alt={`sample ${i + 1}`} style={{ transform: s.blob instanceof File ? undefined : "scaleX(-1)" }} />
                      <button type="button" className="x" onClick={() => removeShot(i)} aria-label="Remove"><Icon name="x" size={13} /></button>
                      <span className="no">0{i + 1}</span>
                    </>
                  ) : (
                    <span>0{i + 1}<br /><span style={{ fontSize: 10.5 }}>{["Front", "Left", "Right"][i]}</span></span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
              <button type="button" className="btn ghost" onClick={snap} disabled={!cam.ready || nextSlot < 0}>
                <Icon name="camera" size={16} /> Capture
              </button>
              <span className="mono muted" style={{ fontSize: 11 }}>or press <b style={{ color: "var(--ink)" }}>Space</b></span>
              <button type="submit" className="btn accent" style={{ marginLeft: "auto" }} disabled={busy || !form.name.trim() || !form.student_id.trim() || !filled.length}>
                {busy ? "Processing faces…" : <>Enroll student <Icon name="arrow" size={15} /></>}
              </button>
            </div>
            {error && <div className="err" style={{ marginTop: 14 }}><Icon name="alert" size={16} />{error}</div>}
          </div>
        </div>
      </div>
    </form>
  );
}
