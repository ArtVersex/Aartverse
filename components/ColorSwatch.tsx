import { normalizeHex } from "@/lib/utils";

export default function ColorSwatch({
  hex,
  label,
  size = "md",
}: {
  hex: string | null | undefined;
  label?: string | null;
  size?: "sm" | "md";
}) {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const dimension = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`inline-block rounded-full border border-line/60 ${dimension}`}
        style={{ backgroundColor: normalized }}
        aria-hidden
      />
      {label && <span className="text-sm text-muted">{label}</span>}
    </span>
  );
}
