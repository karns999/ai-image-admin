const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

export interface GenerateImageParams {
  model: string;
  prompt: string;
  whiteImageBase64: string;       // 白底图 base64，必填
  refImageBase64s?: string[];     // 参考图 base64，可选
}

export interface GenerateImageResult {
  image_url: string;
  model: string;
}

// 阶段二：图文生图，把白底图 + 参考图 + prompt 发给模型生成图片
export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  const { model, prompt, whiteImageBase64, refImageBase64s = [] } = params;

  type ContentPart = { type: string; text?: string; image_url?: { url: string } };
  const userContent: ContentPart[] = [
    { type: "image_url", image_url: { url: whiteImageBase64 } },
    ...refImageBase64s.map((url) => ({ type: "image_url", image_url: { url } })),
    { type: "text", text: prompt },
  ];

  const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    let message = "生图失败";
    try { message = JSON.parse(text)?.error?.message || message; } catch { /* ignore */ }
    throw new Error(`${response.status} ${message}`);
  }

  const data = await response.json();
  const msg = data.choices?.[0]?.message;
  let image_url: string | undefined;

  // Gemini 图片在 message.images 里，其他模型在 content 数组里
  if (Array.isArray(msg?.images) && msg.images.length > 0) {
    image_url = msg.images[0]?.image_url?.url;
  } else if (Array.isArray(msg?.content)) {
    const imgPart = msg.content.find((p: { type: string; image_url?: { url: string } }) => p.type === "image_url");
    image_url = imgPart?.image_url?.url;
  }

  if (!image_url) throw new Error("未获取到图片数据");
  return { image_url, model };
}

// 支持的生图模型列表（OpenRouter /images/generations 端点）
export const IMAGE_MODELS = [
  { value: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash Image（免费）" },
  { value: "black-forest-labs/flux-1.1-pro", label: "FLUX 1.1 Pro" },
  { value: "black-forest-labs/flux-schnell", label: "FLUX Schnell（快速）" },
  { value: "openai/dall-e-3", label: "DALL-E 3" },
  { value: "stabilityai/stable-diffusion-3-5-large", label: "SD 3.5 Large" },
];

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | { type: string; text?: string; image_url?: { url: string } }[];
}

export interface GenerateSuggestionsParams {
  model: string;
  systemPrompt: string;
  productTitle: string;
  whiteImageBase64: string;       // data:image/...;base64,...
  refImageBase64s?: string[];
  promptItems: { title: string; prompt: string }[];
}

export interface SuggestionResult {
  promptIndex: number;
  promptTitle: string;
  suggestion: string;
}

export async function generateSuggestions(
  params: GenerateSuggestionsParams
): Promise<SuggestionResult[]> {
  const { model, systemPrompt, productTitle, whiteImageBase64, refImageBase64s = [], promptItems } = params;

  // 构建用户消息内容（图片 + 文字）
  const userContent: ChatMessage["content"] = [
    {
      type: "image_url",
      image_url: { url: whiteImageBase64 },
    },
    ...refImageBase64s.map((url) => ({
      type: "image_url",
      image_url: { url },
    })),
    {
      type: "text",
      text: `产品标题：${productTitle || "未提供"}

请根据以上产品图片和标题，针对以下每套 Prompt 指令，分别生成一段详细的亚马逊主图设计方案描述。
每套方案用 [方案N] 开头，描述图片的构图、色调、文字排版、视觉重点等细节。

${promptItems.map((p, i) => `[方案${i + 1}] ${p.title}\nPrompt：${p.prompt}`).join("\n\n")}`,
    },
  ];

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];

  const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "生成建议失败");
  }

  const data = await response.json();
  const text: string = data.choices?.[0]?.message?.content ?? "";

  // 解析每套方案
  const results: SuggestionResult[] = promptItems.map((p, i) => {
    const marker = `[方案${i + 1}]`;
    const nextMarker = `[方案${i + 2}]`;
    const start = text.indexOf(marker);
    const end = i < promptItems.length - 1 ? text.indexOf(nextMarker) : text.length;
    const suggestion = start !== -1
      ? text.slice(start + marker.length, end !== -1 ? end : undefined).trim()
      : "";
    return { promptIndex: i, promptTitle: p.title, suggestion };
  });

  return results;
}
