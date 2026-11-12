export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Student = {
  id: string;
  student_id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  year: string;
  section: string;
  photo: string;
  samples: number;
  created_at: string | null;
  last_seen: string | null;
  scan_count: number;
};

export type Scan = {
  id: string;
  status: "recognized" | "unknown";
  student_ref: string | null;
  student_id: string | null;
  name: string | null;
  department: string | null;
  photo: string | null;
  score: number;
  ts: string;
};

export type StudentDetail = Student & { history: Scan[] };

export type Stats = {
  total_students: number;
  present_today: number;
  scans_today: number;
  unknown_today: number;
  week: { date: string; present: number }[];
  departments: { name: string; total: number; present: number }[];
  recent: Scan[];
};

export type Health = { ok: boolean; mongo: boolean; model: string; embeddings: number; threshold: number; auth_required: boolean };

export type RecognizedFace = {
  box: [number, number, number, number];
  score: number;
  student: Student | null;
  logged: boolean;
  first_today?: boolean;
};
export type RecognizeResult = { width: number; height: number; faces: RecognizedFace[]; threshold: number };

const TOKEN_KEY = "sfrs.token";
export const auth = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
  },
  set: (t: string) => {
    try { localStorage.setItem(TOKEN_KEY, t); } catch {}
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
  },
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  const token = auth.get();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  try {
    res = await fetch(API_URL + path, { cache: "no-store", ...init, headers });
  } catch {
    throw new Error(`Can't reach the API at ${API_URL}. Is the backend running? (Free hosting can take ~a minute to wake up.)`);
  }
  if (res.status === 401 && path !== "/api/login") {
    auth.clear();
    if (typeof window !== "undefined" && !location.pathname.startsWith("/login")) {
      location.href = `/login?next=${encodeURIComponent(location.pathname)}`;
    }
    throw new Error("Session expired. Please sign in again.");
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const qs = (o: Record<string, string | number | boolean | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => v !== undefined && v !== "" && v !== false && p.set(k, String(v)));
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const api = {
  health: () => req<Health>("/api/health"),
  login: (password: string) =>
    req<{ token: string; expires: number; auth_required: boolean }>("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }),
  stats: () => req<Stats>("/api/stats"),
  departments: () => req<string[]>("/api/departments"),
  students: (q = "", department = "") => req<Student[]>(`/api/students${qs({ q, department })}`),
  student: (id: string) => req<StudentDetail>(`/api/students/${id}`),
  createStudent: (fd: FormData) => req<Student & { rejected_images: number }>("/api/students", { method: "POST", body: fd }),
  updateStudent: (id: string, body: Partial<Student>) =>
    req<StudentDetail>(`/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  addFaces: (id: string, fd: FormData) => req<{ added: number; rejected_images: number }>(`/api/students/${id}/faces`, { method: "POST", body: fd }),
  deleteStudent: (id: string) => req<void>(`/api/students/${id}`, { method: "DELETE" }),
  scans: (status = "", today = false, limit = 200) => req<Scan[]>(`/api/scans${qs({ status, today, limit })}`),
  recognize: (blob: Blob, log = true) => {
    const fd = new FormData();
    fd.append("image", blob, "frame.jpg");
    return req<RecognizeResult>(`/api/recognize${qs({ log: String(log) })}`, { method: "POST", body: fd });
  },
};
