export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "Just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  const d = Math.round(s / 86400);
  return d === 1 ? "Yesterday" : `${d}d ago`;
}

export const clock = (iso: string | Date) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

export const shortDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString([], { day: "2-digit", month: "short" });

export const longDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export const isToday = (iso: string | null | undefined) =>
  !!iso && new Date(iso).toDateString() === new Date().toDateString();

export const initials = (name?: string | null) =>
  (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export const ordinalYear = (y: string) => {
  const n = parseInt(y, 10);
  if (!n) return y || "—";
  const suf = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return `${n}${suf} year`;
};

export const pct = (score: number) => `${Math.round(score * 100)}%`;
