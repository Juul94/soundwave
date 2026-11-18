import { LogoMark } from "@/components/Logo";

const HUES = [255, 220, 285, 200, 310, 240, 175, 330];

function hue(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

type CoverProps = {
  id: string;
  url: string | null;
  alt?: string;
  className?: string;
  priority?: boolean;
};

/** Square artwork with a deterministic gradient fallback when there is no cover. */
export function Cover({ id, url, alt = "", className = "", priority = false }: CoverProps) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={`aspect-square bg-surface-2 object-cover ${className}`}
      />
    );
  }
  const h = hue(id);
  return (
    <div
      aria-hidden="true"
      className={`flex aspect-square items-center justify-center ${className}`}
      style={{ background: `linear-gradient(135deg, hsl(${h} 70% 38%), hsl(${(h + 50) % 360} 70% 22%))` }}
    >
      <div className="opacity-70">
        <LogoMark size={40} />
      </div>
    </div>
  );
}
