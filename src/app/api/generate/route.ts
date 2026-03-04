import { createClient } from "@/lib/supabase/server";
import { generateImage } from "@/lib/openrouter";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await req.json();
    const { model, prompt, suggestionId, whiteImageBase64: rawBase64, whiteImageUrl, refImageBase64s } = body;

    // 如果没有 base64 但有 URL（恢复任务场景），fetch 转 base64
    let whiteImageBase64 = rawBase64;
    if (!whiteImageBase64 && whiteImageUrl) {
      const imgRes = await fetch(whiteImageUrl);
      if (imgRes.ok) {
        const buf = await imgRes.arrayBuffer();
        const mime = imgRes.headers.get("content-type") || "image/png";
        whiteImageBase64 = `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
      }
    }

    if (!model || !prompt || !whiteImageBase64) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    if (suggestionId) {
      await supabase.from("task_suggestions").update({ image_status: "generating" }).eq("id", suggestionId);
    }

    const result = await generateImage({ model, prompt, whiteImageBase64, refImageBase64s });
    let imageUrl = result.image_url;

    // 尝试上传到 Storage，失败则直接用原始 URL
    try {
      const imageResponse = await fetch(result.image_url);
      if (imageResponse.ok) {
        const imageBuffer = await imageResponse.arrayBuffer();
        const fileName = `${user.id}/${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from("generated-images")
          .upload(fileName, imageBuffer, { contentType: "image/png", upsert: true });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from("generated-images")
            .getPublicUrl(fileName);
          imageUrl = publicUrlData.publicUrl;
        }
      }
    } catch {
      // 上传失败不影响主流程，继续用原始 URL
    }

    // 只有成功才写库
    if (suggestionId) {
      await supabase.from("task_suggestions")
        .update({ image_url: imageUrl, image_status: "done" })
        .eq("id", suggestionId);
    }

    return NextResponse.json({ status: "success", image_url: imageUrl });

    if (suggestionId) {
      await supabase.from("task_suggestions")
        .update({ image_url: imageUrl, image_status: "done" })
        .eq("id", suggestionId);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "生图失败";
    console.error("[generate] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
