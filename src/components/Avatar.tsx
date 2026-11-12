import { initials } from "@/lib/format";

export function Avatar({ src, name, size = 36 }: { src?: string | null; name?: string | null; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="avatar" src={src} alt={name ?? ""} width={size} height={size} style={{ width: size, height: size }} />;
  }
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {name ? initials(name) : "?"}
    </span>
  );
}
