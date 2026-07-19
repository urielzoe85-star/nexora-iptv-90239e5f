import { useState } from "react";
import { Link2, Mail, Check } from "lucide-react";
import { toast } from "sonner";

type Props = {
  url: string;
  title: string;
  excerpt?: string;
  className?: string;
  label?: string;
};

/**
 * Boutons de partage social pour les articles de blog.
 * Couleurs officielles de chaque réseau conservées.
 */
export function ShareButtons({ url, title, excerpt, className = "", label = "Partager :" }: Props) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(`${title}${excerpt ? " — " + excerpt : ""}`);

  const links: Array<{ name: string; href: string; bg: string; icon: React.ReactNode }> = [
    {
      name: "WhatsApp",
      bg: "#25D366",
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .17 5.33.17 11.9c0 2.1.55 4.14 1.6 5.94L0 24l6.32-1.66a11.9 11.9 0 0 0 5.74 1.46h.01c6.56 0 11.9-5.33 11.9-11.9 0-3.18-1.24-6.17-3.45-8.42ZM12.07 21.6h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.75.98 1-3.65-.24-.38a9.9 9.9 0 0 1-1.52-5.26c0-5.46 4.44-9.9 9.92-9.9 2.65 0 5.14 1.03 7.01 2.9a9.83 9.83 0 0 1 2.9 7 9.9 9.9 0 0 1-9.91 9.9Zm5.44-7.42c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17c-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
        </svg>
      ),
    },
    {
      name: "Facebook",
      bg: "#1877F2",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.5-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
        </svg>
      ),
    },
    {
      name: "X",
      bg: "#000000",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2H21.5l-7.5 8.57L22.5 22h-6.813l-5.34-6.98L4.24 22H.984l8.02-9.17L1.5 2h6.98l4.83 6.38L18.244 2Zm-1.194 18h1.87L7.02 4H5.05l12 16Z" />
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      bg: "#0A66C2",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05a3.75 3.75 0 0 1 3.38-1.86c3.62 0 4.28 2.38 4.28 5.47v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
        </svg>
      ),
    },
    {
      name: "Telegram",
      bg: "#26A5E4",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.56 8.16-1.86 8.77c-.14.62-.5.77-1.02.48l-2.82-2.08-1.36 1.31c-.15.15-.28.28-.57.28l.2-2.87 5.22-4.72c.23-.2-.05-.32-.35-.12L8.55 13.3l-2.78-.87c-.6-.19-.62-.6.13-.9l10.86-4.19c.5-.18.94.12.79.82Z" />
        </svg>
      ),
    },
    {
      name: "Email",
      bg: "#64748B",
      href: `mailto:?subject=${encodedTitle}&body=${encodedText}%20${encodedUrl}`,
      icon: <Mail className="h-4 w-4" aria-hidden="true" />,
    },
  ];

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {label && <span className="text-sm text-muted-foreground mr-1">{label}</span>}
      {links.map((l) => (
        <a
          key={l.name}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Partager sur ${l.name}`}
          title={`Partager sur ${l.name}`}
          style={{ backgroundColor: l.bg }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50"
        >
          {l.icon}
        </a>
      ))}
      <button
        type="button"
        onClick={onCopy}
        aria-label="Copier le lien"
        title="Copier le lien"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-transform hover:scale-110 hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50"
      >
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}