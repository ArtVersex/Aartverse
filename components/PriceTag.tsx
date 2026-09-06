import { formatPrice, isInStock } from "@/lib/utils";

export default function PriceTag({
  price,
  inStock,
  className = "",
}: {
  price: number | null;
  inStock: number | null;
  className?: string;
}) {
  const available = isInStock(inStock);
  return (
    <div className={`flex items-center gap-2 font-sans text-sm ${className}`}>
      <span className={available ? "text-ink" : "text-muted line-through"}>
        {formatPrice(price)}
      </span>
      {!available && (
        <span className="eyebrow rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">
          Sold
        </span>
      )}
    </div>
  );
}
