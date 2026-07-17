import { Link } from "@tanstack/react-router";

export function PostCard({ post }: { post: any }) {
  return (
    <Link to="/blog/$slug" params={{ slug: post.slug }} className="group block rounded-lg border overflow-hidden hover:shadow-md transition bg-card">
      {post.cover_image_url ? (
        <div className="aspect-video overflow-hidden bg-muted">
          <img src={post.cover_image_url} alt={post.cover_image_alt ?? post.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition" />
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5" />
      )}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-primary">{post.title}</h3>
        {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>}
        <div className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
          {post.published_at && <time>{new Date(post.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</time>}
          {post.reading_time_min && <span>· {post.reading_time_min} min</span>}
        </div>
      </div>
    </Link>
  );
}