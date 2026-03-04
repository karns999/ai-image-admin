import { createClient } from "@/lib/supabase/server";
import { generateSuggestions } from "@/lib/openrouter";
import { NextRequest, NextResponse } from "next/server";

// base64 转 Buffer 并上传到 Storage，返回公开 URL
async function uploadBase64Image(
  supabase: Awaited<ReturnType<typeof createClient>>,
  base64: string,
  path: string
): Promise<string> {
  const matches = base64.match(/^data:(.+);base64,(.+)$/);
  if (!matches) throw new Error("无效的图片格式");
  const contentType = matches[1];
  const buffer = Buffer.from(matches[2], "base64");

  const { error } = await supabase.storage
    .from("generated-images")
    .upload(path, buffer, { contentType, upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("generated-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { taskId, model, systemPrompt, productTitle, whiteImageBase64: rawBase64, whiteImageUrl: inputWhiteImageUrl, refImageBase64s, promptItems } = await req.json();

  // 恢复任务时没有 base64，从 URL fetch 转换
  let whiteImageBase64 = rawBase64;
  if (!whiteImageBase64 && inputWhiteImageUrl) {
    const imgRes = await fetch(inputWhiteImageUrl);
    if (imgRes.ok) {
      const buf = await imgRes.arrayBuffer();
      const mime = imgRes.headers.get("content-type") || "image/png";
      whiteImageBase64 = `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
    }
  }

  if (!whiteImageBase64) return NextResponse.json({ error: "请上传白底图" }, { status: 400 });
  if (!promptItems?.length) return NextResponse.json({ error: "请至少添加一套 Prompt 指令" }, { status: 400 });

  // 上传图片到 Storage
  const imageId = taskId ?? `${user.id}/${Date.now()}`;
  const whiteImageUrl = await uploadBase64Image(
    supabase, whiteImageBase64, `${user.id}/white_${imageId}.png`
  ).catch(() => null);

  const refImageUrls: string[] = [];
  for (let i = 0; i < (refImageBase64s ?? []).length; i++) {
    const url = await uploadBase64Image(
      supabase, refImageBase64s[i], `${user.id}/ref_${imageId}_${i}.png`
    ).catch(() => null);
    if (url) refImageUrls.push(url);
  }

  // 有 taskId 说明是重试，直接更新；否则新建
  let task: { id: string };
  if (taskId) {
    const { data, error } = await supabase
      .from("generation_tasks")
      .update({
        product_title: productTitle,
        system_prompt: systemPrompt,
        prompt_items: promptItems,
        white_image_url: whiteImageUrl,
        ref_image_urls: refImageUrls,
        status: "suggesting",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabase.from("task_suggestions").delete().eq("task_id", taskId);
    task = data;
  } else {
    const { data, error } = await supabase
      .from("generation_tasks")
      .insert({
        user_id: user.id,
        product_title: productTitle,
        system_prompt: systemPrompt,
        prompt_items: promptItems,
        white_image_url: whiteImageUrl,
        ref_image_urls: refImageUrls,
        status: "suggesting",
        current_step: 0,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    task = data;
  }

  try {
    const results = await generateSuggestions({
      model, systemPrompt, productTitle, whiteImageBase64, refImageBase64s, promptItems,
    });

    const { data: insertedSuggestions } = await supabase.from("task_suggestions").insert(
      results.map((r) => ({
        task_id: task.id,
        prompt_index: r.promptIndex,
        prompt_title: r.promptTitle,
        prompt_content: promptItems[r.promptIndex]?.prompt,
        suggestion: r.suggestion,
      }))
    ).select();

    await supabase
      .from("generation_tasks")
      .update({ status: "suggested", current_step: 1 })
      .eq("id", task.id);

    const suggestionsWithId = results.map((r, i) => ({
      ...r,
      id: insertedSuggestions?.[i]?.id,
    }));

    return NextResponse.json({ taskId: task.id, suggestions: suggestionsWithId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "生成失败";
    await supabase
      .from("generation_tasks")
      .update({ status: "failed", error_message: message })
      .eq("id", task.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
