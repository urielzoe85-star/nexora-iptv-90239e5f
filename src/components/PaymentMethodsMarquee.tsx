const METHODS = [
  { src: "/payments/visa.svg", alt: "Visa" },
  { src: "/payments/mastercard.svg", alt: "Mastercard" },
  { src: "/payments/stripe.svg", alt: "Stripe" },
  { src: "/payments/paypal.svg", alt: "PayPal" },
  { src: "/payments/orange-money.svg", alt: "Orange Money" },
  { src: "/payments/mtn-momo.svg", alt: "MTN Mobile Money" },
  { src: "/payments/moov-money.svg", alt: "Moov Money" },
  { src: "/payments/airtel-money.svg", alt: "Airtel Money" },
  { src: "/payments/binance.svg", alt: "Binance Pay" },
];

export interface PaymentMethodsMarqueeProps {
  title?: string;
  compact?: boolean;
  className?: string;
}

export function PaymentMethodsMarquee({
  title = "Paiements sécurisés & acceptés",
  compact = false,
  className = "",
}: PaymentMethodsMarqueeProps) {
  const items = [...METHODS, ...METHODS];
  const height = compact ? "h-8 md:h-10" : "h-10 md:h-12";

  return (
    <section
      aria-label="Moyens de paiement acceptés"
      className={`w-full ${className}`}
    >
      {title && (
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
          {title}
        </p>
      )}
      <div className="relative overflow-hidden group">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10"
          style={{ background: "linear-gradient(to right, var(--background), transparent)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10"
          style={{ background: "linear-gradient(to left, var(--background), transparent)" }}
          aria-hidden="true"
        />
        <ul
          role="list"
          className="flex items-center gap-8 md:gap-12 animate-marquee w-max group-hover:[animation-play-state:paused]"
        >
          {items.map((m, i) => (
            <li key={`${m.alt}-${i}`} className="shrink-0" aria-hidden={i >= METHODS.length}>
              <img
                src={m.src}
                alt={i < METHODS.length ? m.alt : ""}
                loading="lazy"
                decoding="async"
                className={`${height} w-auto object-contain opacity-90 hover:opacity-100 transition-opacity`}
                draggable={false}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default PaymentMethodsMarquee;