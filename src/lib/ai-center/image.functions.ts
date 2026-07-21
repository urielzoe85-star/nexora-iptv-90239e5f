import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";
import { logAiAction } from "./ai-provider.server";

export const generateBlogImage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      prompt: z.string().trim().min(4).max(600),
      style: z.enum(["photorealistic", "editorial", "3d_isometric", "minimal"]).default("photorealistic"),
      slot: z.enum(["cover", "inline", "custom"]).default("custom"),
      alt: z.string().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { generateNexoraImage } = await import("./image-gen.server");
    try {
      const r = await generateNexoraImage({
        prompt: data.prompt,
        style: data.style,
        slot: data.slot,
      });
      await logAiAction({
        actor: context.userId,
        kind: "image_gen",
        input: data,
        output: { url: r.url, path: r.path, model: r.model, slot: data.slot },
      });
      return { url: r.url, path: r.path, model: r.model, alt: data.alt ?? "" };
    } catch (e) {
      const msg = (e as Error).message;
      await logAiAction({ actor: context.userId, kind: "image_gen", input: data, error: msg });
      throw new Error(msg);
    }
  });