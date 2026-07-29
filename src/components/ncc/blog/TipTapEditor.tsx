import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Strikethrough, List, ListOrdered, Quote, Heading1, Heading2, Heading3, Link as LinkIcon, Image as ImageIcon, Youtube as YoutubeIcon, Video as VideoIcon, Undo, Redo } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { adminUploadBlogImage, adminUploadBlogVideo } from "@/lib/blog.functions";
import { toast } from "sonner";
import { useEffect } from "react";
import { errorMessage } from "@/lib/error-message";

export function TipTapEditor({
  value, onChange, placeholder = "Écrivez votre article…",
}: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const upload = useServerFn(adminUploadBlogImage);
  const uploadVideo = useServerFn(adminUploadBlogVideo);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder }),
      Youtube.configure({ controls: true, nocookie: true, width: 640, height: 360 }),
    ],
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        class: "prose prose-slate dark:prose-invert max-w-none min-h-[300px] focus:outline-none px-4 py-3",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = r.result as string;
        resolve(s.split(",")[1] ?? "");
      };
      r.onerror = () => reject(r.error ?? new Error("Lecture du fichier impossible"));
      r.readAsDataURL(file);
    });
  }

  async function insertImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 8 * 1024 * 1024) return toast.error("Image trop lourde (max 8 Mo)");
      const tId = toast.loading("Envoi de l'image…");
      try {
        const b64 = await fileToBase64(file);
        const { url } = await upload({ data: { filename: file.name, content_type: file.type || "image/jpeg", data_base64: b64 } });
        editor?.chain().focus().setImage({ src: url, alt: file.name }).run();
        toast.success("Image insérée", { id: tId });
      } catch (e: unknown) { toast.error(errorMessage(e) ?? "Erreur d'upload", { id: tId }); }
    };
    input.click();
  }

  async function insertVideoFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/mp4,video/webm,video/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 50 * 1024 * 1024) return toast.error("Vidéo trop lourde (max 50 Mo)");
      const tId = toast.loading("Envoi de la vidéo… cela peut prendre un moment");
      try {
        const b64 = await fileToBase64(file);
        const { url } = await uploadVideo({ data: { filename: file.name, content_type: file.type || "video/mp4", data_base64: b64 } });
        const html = `<p><video controls preload="metadata" style="width:100%;max-width:100%;border-radius:8px" src="${url}"></video></p>`;
        editor?.chain().focus().insertContent(html).run();
        toast.success("Vidéo insérée", { id: tId });
      } catch (e: unknown) { toast.error(errorMessage(e) ?? "Erreur d'upload", { id: tId }); }
    };
    input.click();
  }

  function insertLink() {
    const url = window.prompt("URL du lien");
    if (!url) return;
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function insertYoutube() {
    const url = window.prompt("URL YouTube");
    if (!url) return;
    editor?.commands.setYoutubeVideo({ src: url });
  }

  return (
    <div className="border rounded-md overflow-hidden bg-background">
      <div className="flex flex-wrap gap-1 border-b p-2 bg-muted/30">
        <ToolbarBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={insertLink} active={editor.isActive("link")}><LinkIcon className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={insertImage}><ImageIcon className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={insertVideoFile}><VideoIcon className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={insertYoutube}><YoutubeIcon className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()}><Undo className="h-4 w-4" /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()}><Redo className="h-4 w-4" /></ToolbarBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarBtn({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" size="sm" variant={active ? "secondary" : "ghost"} onClick={onClick} className="h-8 w-8 p-0">
      {children}
    </Button>
  );
}