import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return NextResponse.json({ error: "获取模型列表失败" }, { status: 500 });

  const data = await res.json();

  // 过滤图片生成模型：output modality 包含 image
  const models = (data.data as { id: string; name: string; architecture?: { output_modalities?: string[]; modality?: string } }[])
    .filter((m) => {
      const out = m.architecture?.output_modalities ?? [];
      return out.includes("image");
    })
    .map((m) => ({ value: m.id, label: m.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return NextResponse.json(models);
}
