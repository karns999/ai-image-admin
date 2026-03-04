import { createClient } from "@/lib/supabase/server";
import { generateImage } from "@/lib/openrouter";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await req.json();
  const { model, prompt, negative_prompt, width, height } = body;

  if (!model || !prompt) {
    return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
  }

  // 先插入 pending 记录
  const { data: record, error: insertError } = await supabase
    .from("generation_records")
    .insert({
      user_id: user.id,
      model,
      prompt,
      negative_prompt,
      parameters: { width, height },
      status: "pending",
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: "记录创建失败" }, { status: 500 });
  }

  try {
    const result = await generateImage({ model, prompt, negative_prompt, width, height });

    // 下载图片并上传到 Supabase Storage
    const imageResponse = await fetch(result.image_url);
    const imageBuffer = await imageResponse.arrayBuffer();
    const fileName = `${user.id}/${record.id}.png`;

    const { data: uploadData } = await supabase.storage
      .from("generated-images")
      .upload(fileName, imageBuffer, { contentType: "image/png", upsert: true });

    const { data: publicUrl } = supabase.storage
      .from("generated-images")
      .getPublicUrl(fileName);

    // 更新记录为成功
    await supabase
      .from("generation_records")
      .update({
        status: "success",
        image_url: publicUrl.publicUrl,
        completed_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    return NextResponse.json({ id: record.id, status: "success", image_url: publicUrl.publicUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "生图失败";

    await supabase
      .from("generation_records")
      .update({ status: "failed", error_message: message })
      .eq("id", record.id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
