import { useEffect, useRef, useState, useMemo } from "react";

export interface ResponsiveImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  className?: string;
  srcSetWidths?: number[];
  loading?: "eager" | "lazy";
  fetchpriority?: "high" | "low" | "auto";
  decoding?: "async" | "sync" | "auto";
  rootMargin?: string;
}

export function ResponsiveImage({
  src,
  alt,
  width,
  height,
  sizes,
  className = "",
  srcSetWidths,
  loading = "lazy",
  fetchpriority = "low",
  decoding = "async",
  rootMargin = "200px 0px",
}: ResponsiveImageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin, threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  const srcSet = useMemo(() => {
    if (!srcSetWidths || srcSetWidths.length === 0) return undefined;
    // Les assets sont servis par le CDN Lovable sans redimensionnement dynamique.
    // On expose quand même les descripteurs de largeur pour que le navigateur
    // choisisse la source adaptée si le service évolue ou si un cache local
    // d'une autre taille existe déjà.
    return srcSetWidths.map((w) => `${src} ${w}w`).join(", ");
  }, [src, srcSetWidths]);

  const paddingBottom = `${(height / width) * 100}%`;

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={{ paddingBottom }}
    >
      {isVisible ? (
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          fetchPriority={fetchpriority}
          decoding={decoding}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 bg-muted/20 animate-pulse"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
