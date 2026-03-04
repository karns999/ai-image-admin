"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IMAGE_MODELS } from "@/lib/openrouter";
import { toast } from "sonner";

export default function GenerateForm() {
  const [model, setModel] = useState(IMAGE_MODELS[0].value);
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [width, setWidth] = useState("1024");
  const [height, setHeight] = useState("1024");
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setResultUrl(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          negative_prompt: negativePrompt,
          width: parseInt(width),
          height: parseInt(height),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "生图失败");
      } else {
        setResultUrl(data.image_url);
        toast.success("生图成功");
      }
    } catch {
      toast.error("请求失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">生成设置</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>模型</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>宽度</Label>
                <Input type="number" value={width} onChange={(e) => setWidth(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>高度</Label>
                <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>提示词</Label>
            <Textarea
              placeholder="描述你想生成的图片..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>负向提示词（可选）</Label>
            <Textarea
              placeholder="不想出现的内容..."
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              rows={2}
            />
          </div>

          <Button type="submit" disabled={loading || !prompt.trim()}>
            {loading ? "生成中..." : "开始生成"}
          </Button>
        </form>

        {resultUrl && (
          <div className="mt-6 space-y-2">
            <p className="text-sm font-medium">生成结果</p>
            <img src={resultUrl} alt="生成结果" className="rounded-lg max-w-md w-full" />
            <a href={resultUrl} download target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">下载图片</Button>
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
