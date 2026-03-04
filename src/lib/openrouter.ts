const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

export interface GenerateImageParams {
  model: string;
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
}

export interface GenerateImageResult {
  image_url: string;
  model: string;
}

export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  const { model, prompt, negative_prompt, width = 1024, height = 1024 } = params;

  const response = await fetch(`${OPENROUTER_API_URL}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      negative_prompt,
      width,
      height,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "生图失败");
  }

  const data = await response.json();
  const image_url = data.data?.[0]?.url;

  if (!image_url) {
    throw new Error("未获取到图片地址");
  }

  return { image_url, model };
}

// 支持的生图模型列表
export const IMAGE_MODELS = [
  { value: "openai/dall-e-3", label: "DALL-E 3" },
  { value: "openai/dall-e-2", label: "DALL-E 2" },
  { value: "google/imagen-3", label: "Imagen 3" },
];
