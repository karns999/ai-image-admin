import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return NextResponse.json({ error: "获取模型列表失败" }, { status: 500 });

  const data = await res.json();
  const type = req.nextUrl.searchParams.get("type");

  const ALLOWED = ["gpt", "gemini", "qwen", "deepseek", "glm", "moonshot", "ernie", "baidu", "zhipu"];

  type Model = { id: string; name: string; architecture?: { modality?: string; input_modalities?: string[]; output_modalities?: string[] } };

  const models = (data.data as Model[])
    .filter((m) => {
      const id = m.id.toLowerCase();
      const modality = m.architecture?.modality ?? "";
      const inputMods = m.architecture?.input_modalities ?? [];
      const outputMods = m.architecture?.output_modalities ?? [];

      if (type === "image-gen") {
        // 支持图片输入 + 图片输出的模型
        const hasImageInput = inputMods.includes("image") || modality.includes("image");
        const hasImageOutput = outputMods.includes("image") || modality.includes("image->image");
        return hasImageInput && hasImageOutput;
      }

      // 默认：视觉理解模型（支持图片输入）
      return ALLOWED.some((k) => id.includes(k)) && modality.includes("image");
    })
    .map((m) => ({ value: m.id, label: m.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return NextResponse.json(models);
}
