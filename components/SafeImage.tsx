import Image from "next/image";
import { isOptimizableImageSrc } from "@/lib/images";

interface SafeImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
}

/**
 * Drop-in replacement for next/image for any photo whose URL comes straight
 * from the database (artwork, artist, category images). next/image throws a
 * hard runtime error — and crashes the whole page — for any hostname that
 * isn't explicitly listed in next.config.mjs's remotePatterns. Since this
 * database grows over time and isn't guaranteed to only ever contain one
 * image host, this component checks the URL first: known/allow-listed hosts
 * get the normal optimized <Image>, and anything else falls back to a plain
 * <img> tag (unoptimized, but it always renders instead of crashing).
 */
export default function SafeImage({ src, alt, fill, priority, sizes, className }: SafeImageProps) {
  if (isOptimizableImageSrc(src)) {
    return (
      <Image src={src} alt={alt} fill={fill} priority={priority} sizes={sizes} className={className} />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      className={fill ? `absolute inset-0 h-full w-full ${className ?? ""}`.trim() : className}
    />
  );
}
