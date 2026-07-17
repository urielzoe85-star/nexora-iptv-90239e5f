// Server-only utilities for the blog module (sanitisation, slug, reading time).
import sanitizeHtml from "sanitize-html";
import slugifyLib from "slugify";
import readingTime from "reading-time";

const ALLOWED_TAGS = [
  "h1","h2","h3","h4","h5","h6","p","a","ul","ol","li","blockquote","hr","br",
  "strong","em","u","s","code","pre","img","figure","figcaption",
  "table","thead","tbody","tr","th","td","iframe","span","div",
];

const ALLOWED_ATTR: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href","name","target","rel","title"],
  img: ["src","alt","title","width","height","loading","decoding"],
  iframe: ["src","width","height","allow","allowfullscreen","frameborder","title"],
  "*": ["class","style","id"],
};

export function sanitizeBlogHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTR,
    allowedSchemes: ["http","https","mailto","tel"],
    allowedIframeHostnames: ["www.youtube.com","youtube.com","player.vimeo.com"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: attribs.target === "_blank" ? "noopener noreferrer nofollow" : (attribs.rel ?? ""),
        },
      }),
    },
  });
}

export function slugify(input: string): string {
  return slugifyLib(input, { lower: true, strict: true, trim: true }).slice(0, 120) || "post";
}

export function computeReadingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ");
  const r = readingTime(text);
  return Math.max(1, Math.round(r.minutes));
}

export function excerptFromHtml(html: string, max = 200): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}