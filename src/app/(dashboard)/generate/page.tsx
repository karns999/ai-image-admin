"use client";

import { Check, Plus, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { IMAGE_MODELS } from "@/lib/openrouter";

const steps = ["白底图", "建议&选方案", "生成", "确认"];

const DEFAULT_SYSTEM_PROMPT = `你是一名亚马逊设计者，请帮我生成契合品牌调性与产品卖点的亚马逊主图的设计列表方案，生成的图片尺寸为1000*1000的正方形图`;

interface PromptTemplate {
  id: string;
  title: string;
  prompt: string;
}

function TemplatePickerModal({
  templates,
  onSelect,
  onClose,
}: {
  templates: PromptTemplate[];
  onSelect: (t: PromptTemplate) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-gray-800">选择 Prompt 模板</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {templates.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">暂无模板，请先在「Prompt 模板」页面创建</p>
          )}
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => { onSelect(t); onClose(); }}
              className="w-full text-left px-4 py-3 rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600">{t.title}</p>
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{t.prompt}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

type GeneratedImage = {
  index: number;
  url: string | null;
  status: "generating" | "done" | "failed";
};

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [processingStep, setProcessingStep] = useState<number | null>(null);
  const [whiteImage, setWhiteImage] = useState<string | null>(null);
  const [refImages, setRefImages] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [prompts, setPrompts] = useState<{ title: string; prompt: string }[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [models, setModels] = useState<{ value: string; label: string }[]>([]);
  const [imageGenModels, setImageGenModels] = useState<{ value: string; label: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.0-flash-001");
  const [imageModel, setImageModel] = useState(IMAGE_MODELS[0].value);
  const [generating, setGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState("");
  const [suggestions, setSuggestions] = useState<{ id?: string; promptIndex: number; promptTitle: string; suggestion: string }[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const whiteInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const whiteFileRef = useRef<File | null>(null);
  const refFilesRef = useRef<File[]>([]);

  useEffect(() => {
    fetch("/api/prompts")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTemplates(data); });

    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setModels(data);
      });

    fetch("/api/models?type=image-gen")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length) {
          setImageGenModels(data);
          setImageModel(data[0].value);
        }
      });

    const urlTaskId = searchParams.get("task");
    if (urlTaskId) {
      setRestoring(true);
      fetch(`/api/tasks/${urlTaskId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            toast.error("任务不存在或已删除");
            window.history.replaceState({}, "", "/generate");
            return;
          }
          setTaskId(data.id);
          setTitle(data.product_title ?? "");
          setSystemPrompt(data.system_prompt ?? DEFAULT_SYSTEM_PROMPT);
          setPrompts(Array.isArray(data.prompt_items) ? data.prompt_items : []);
          const step = data.current_step ?? 0;
          setCurrentStep(step);
          setMaxStep(step);
          if (data.white_image_url) setWhiteImage(data.white_image_url);
          if (Array.isArray(data.ref_image_urls) && data.ref_image_urls.length) {
            setRefImages(data.ref_image_urls);
          }
          if (data.task_suggestions?.length) {
            setSuggestions(data.task_suggestions.map((s: { id: string; prompt_index: number; prompt_title: string; suggestion: string }) => ({
              id: s.id,
              promptIndex: s.prompt_index,
              promptTitle: s.prompt_title,
              suggestion: s.suggestion,
            })));
            // 恢复已生成的图片
            const done = data.task_suggestions.filter((s: { image_url: string | null; image_status: string }) => s.image_url);
            if (done.length) {
              setGeneratedImages(done.map((s: { prompt_index: number; image_url: string; image_status: string }) => ({
                index: s.prompt_index,
                url: s.image_url,
                status: s.image_status === "done" ? "done" : "failed",
              })));
            }
          }
          if (data.status === "suggesting") {
            toast.info("该任务正在生成建议中，请稍候...");
          }
        })
        .catch(() => toast.error("恢复任务失败"))
        .finally(() => setRestoring(false));
    }
  }, []);

  function handleSelectTemplate(t: PromptTemplate) {
    if (replacingIndex !== null) {
      setPrompts((prev) => prev.map((p, idx) => idx === replacingIndex ? { title: t.title, prompt: t.prompt } : p));
      setReplacingIndex(null);
    } else {
      setPrompts((prev) => [...prev, { title: t.title, prompt: t.prompt }]);
    }
  }

  function removePrompt(i: number) {
    setPrompts((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updatePrompt(i: number, val: string) {
    setPrompts((prev) => prev.map((p, idx) => (idx === i ? { ...p, prompt: val } : p)));
  }

  function handleWhiteImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      whiteFileRef.current = file;
      setWhiteImage(URL.createObjectURL(file));
    }
  }

  function handleRefImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    refFilesRef.current = [...refFilesRef.current, ...files].slice(0, 3);
    setRefImages(refFilesRef.current.map((f) => URL.createObjectURL(f)));
  }

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleGenerate() {
    if (!whiteFileRef.current && !whiteImage) { toast.error("请上传白底图"); return; }
    if (!prompts.length) { toast.error("请至少添加一套 Prompt 指令"); return; }

    setGenerating(true);
    setProcessingStep(0);
    setGeneratingStatus("正在分析产品图片...");
    const statusTimer = setTimeout(() => setGeneratingStatus("正在生成设计方案建议..."), 3000);

    try {
      // 优先用本地 File，恢复任务时用 URL（后端会 fetch 转 base64）
      const whiteImageBase64 = whiteFileRef.current ? await fileToBase64(whiteFileRef.current) : undefined;
      const whiteImageUrl = !whiteImageBase64 ? whiteImage : undefined;
      const refImageBase64s = await Promise.all(refFilesRef.current.map(fileToBase64));
      setGeneratingStatus("正在调用 AI 模型...");

      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          model: selectedModel,
          systemPrompt,
          productTitle: title,
          whiteImageBase64,
          whiteImageUrl,
          refImageBase64s,
          promptItems: prompts,
        }),
      });

      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "生成失败"); return; }

      setTaskId(data.taskId);
      setSuggestions(data.suggestions);
      setSelectedSuggestions(new Set());
      setGeneratedImages([]);
      setMaxStep(1);
      setCurrentStep(1);
      setMaxStep(1);
      toast.success("建议生成成功");
    } catch {
      toast.error("请求失败，请重试");
    } finally {
      clearTimeout(statusTimer);
      setGenerating(false);
      setGeneratingStatus("");
      setProcessingStep(null);
    }
  }

  async function handleStartGenerate() {
    const selected = suggestions.filter((_, i) => selectedSuggestions.has(i));
    if (!selected.length) return;

    const initial: GeneratedImage[] = selected.map((s) => ({ index: s.promptIndex, url: null, status: "generating" }));
    setGeneratedImages(initial);
    setCurrentStep(2);
    setMaxStep(2);
    setProcessingStep(2);

    // 更新任务状态为 generating
    if (taskId) {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: "generating", current_step: 2 }),
      });
    }

    // 优先用本地 File 转 base64，恢复任务时 File 为 null 则传 URL 让后端处理
    const whiteImageBase64 = whiteFileRef.current ? await fileToBase64(whiteFileRef.current) : undefined;
    const whiteImageUrl = !whiteImageBase64 ? whiteImage : undefined;
    const refImageBase64s = await Promise.all(refFilesRef.current.map(fileToBase64));

    await Promise.all(
      selected.map(async (s, i) => {
        try {
          const res = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: imageModel,
              prompt: s.suggestion,
              suggestionId: s.id,
              taskId,
              whiteImageBase64,
              whiteImageUrl,
              refImageBase64s,
            }),
          });
          const data = await res.json();
          setGeneratedImages((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, url: data.image_url ?? null, status: res.ok ? "done" : "failed" } : item
            )
          );
        } catch {
          setGeneratedImages((prev) =>
            prev.map((item, idx) => (idx === i ? { ...item, status: "failed" } : item))
          );
        }
      })
    );

    // 所有图片完成后更新任务状态
    if (taskId) {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: "done", current_step: 3 }),
      });
    }

    setProcessingStep(null);
    setMaxStep(3);
  }

  if (restoring) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-xs text-gray-400">正在恢复任务...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white shadow-sm">
      {showPicker && (
        <TemplatePickerModal
          templates={templates}
          onSelect={handleSelectTemplate}
          onClose={() => { setShowPicker(false); setReplacingIndex(null); }}
        />
      )}

      {/* 标题栏 */}
      <div className="flex items-center justify-between px-5 py-3 border-b">
        <span className="font-medium text-sm">AI 生成操作面板</span>
        <button className="flex items-center gap-1 text-xs text-muted-foreground border rounded px-2.5 py-1 hover:bg-muted transition-colors">
          ↻ 刷新数据
        </button>
      </div>

      {/* 步骤条 */}
      <div className="py-5 flex justify-center">
        <div className="flex items-center w-[560px]">
          {steps.map((step, index) => {
            const isCompleted = index < maxStep;
            const isActive = index === currentStep;
            const isProcessing = index === processingStep;
            const isPending = index > maxStep && index !== processingStep;
            return (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => (isCompleted || isActive || index <= maxStep) ? setCurrentStep(index) : undefined}
                  disabled={isPending || isProcessing}
                  className="flex flex-col items-center gap-1.5 disabled:cursor-not-allowed"
                >
                  <div className={[
                    "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200",
                    isCompleted ? "bg-green-500 shadow-sm shadow-green-300"
                      : isProcessing ? "bg-white border-2 border-orange-400 shadow-sm shadow-orange-200"
                      : isActive ? "bg-white border-2 border-blue-500 shadow-sm shadow-blue-200"
                      : "bg-white border border-gray-300",
                  ].join(" ")}>
                    {isCompleted ? (
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    ) : isProcessing ? (
                      <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                    ) : isActive ? (
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    )}
                  </div>
                  <span className={[
                    "text-[11px] whitespace-nowrap transition-colors",
                    isCompleted ? "text-green-600"
                      : isProcessing ? "text-orange-500 font-medium"
                      : isActive ? "text-blue-600 font-medium"
                      : "text-gray-400",
                  ].join(" ")}>{step}</span>
                </button>
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-1 mb-4 h-px rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={[
                        "h-full transition-all duration-500",
                        index < maxStep ? "bg-green-500" : "",
                        processingStep !== null && index === processingStep - 1
                          ? "bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300 animate-pulse"
                          : "",
                      ].join(" ")}
                      style={{ width: index < maxStep || (processingStep !== null && index === processingStep - 1) ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 步骤 0：白底图 */}
      {currentStep === 0 && (
        <div className="px-8 pb-8 space-y-6 border-t pt-6">
          <div className="flex gap-10">
            <div className="flex-1">
              <p className="text-sm font-medium mb-3"><span className="text-red-500 mr-0.5">*</span>产品白底图（必填）</p>
              <input ref={whiteInputRef} type="file" accept="image/*" className="hidden" onChange={handleWhiteImage} />
              {whiteImage ? (
                <div className="w-36 h-36 rounded-lg overflow-hidden border cursor-pointer" onClick={() => whiteInputRef.current?.click()}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={whiteImage} alt="白底图" className="w-full h-full object-contain" />
                </div>
              ) : (
                <button onClick={() => whiteInputRef.current?.click()} className="w-36 h-36 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors">
                  <Plus className="w-6 h-6" />
                </button>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium mb-3">参考图（可选，0-3张）</p>
              <div className="flex gap-2 flex-wrap">
                {refImages.map((src, i) => (
                  <div key={i} className="w-24 h-24 rounded-lg overflow-hidden border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`参考图${i + 1}`} className="w-full h-full object-contain" />
                  </div>
                ))}
                {refImages.length < 3 && (
                  <>
                    <input ref={refInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleRefImages} />
                    <button onClick={() => refInputRef.current?.click()} className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors">
                      <Plus className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">参考图会用于增强方案生成效果，最多 3 张</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">AI 模型</label>
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 bg-white">
              {!models.find((m) => m.value === "openai/gpt-4o-mini") && (
                <option value="openai/gpt-4o-mini">GPT-4o Mini (默认)</option>
              )}
              {models.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">产品标题</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="请输入产品标题" className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">角色指令</label>
              <button onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)} className="text-xs text-gray-400 hover:text-blue-500 transition-colors">恢复默认</button>
            </div>
            <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={3} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 resize-none text-gray-600 bg-gray-50" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Prompt 指令</label>
              <span className="text-xs text-gray-400">共 {prompts.length} 套</span>
            </div>
            <div className="space-y-2">
              {prompts.map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs text-gray-400 mt-2.5 w-24 shrink-0 leading-tight">图片{i + 1}</span>
                  <input type="text" value={p.prompt} onChange={(e) => updatePrompt(i, e.target.value)} placeholder="输入 Prompt，或留空使用模板默认设置" className="flex-1 border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300" />
                  <button onClick={() => { setReplacingIndex(i); setShowPicker(true); }} className="mt-2 text-xs text-blue-400 hover:text-blue-600 border border-blue-200 rounded px-2 py-0.5 transition-colors shrink-0">重选</button>
                  <button onClick={() => removePrompt(i)} className="mt-2 text-xs text-red-400 hover:text-red-600 border border-red-200 rounded px-2 py-0.5 transition-colors shrink-0">删除</button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowPicker(true)} className="mt-2 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors">
              <Plus className="w-3 h-3" /> 添加一套
            </button>
          </div>

          <div className="flex justify-center">
            <button onClick={handleGenerate} disabled={generating || prompts.length === 0} className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-6 py-2 rounded-md flex items-center gap-2 transition-colors disabled:opacity-60">
              {generating ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />{generatingStatus || "生成中..."}</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" />{`生成建议（${prompts.length} 套）`}</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 步骤 1：建议&选方案 */}
      {currentStep === 1 && (
        <div className="px-8 pb-8 border-t pt-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">AI 设计方案建议</h2>
              <p className="text-xs text-gray-400 mt-0.5">共 {suggestions.length} 套方案，勾选后进入下一步生成</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">生图模型</span>
              <select value={imageModel} onChange={(e) => setImageModel(e.target.value)} className="border rounded-md px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                {imageGenModels.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          {suggestions.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">暂无建议内容</div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {suggestions.map((s, i) => {
                const checked = selectedSuggestions.has(i);
                return (
                  <div key={i} onClick={() => setSelectedSuggestions((prev) => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next; })}
                    className={["border rounded-lg p-4 cursor-pointer transition-all", checked ? "border-blue-400 bg-blue-50 shadow-sm" : "bg-gray-50 hover:border-gray-300"].join(" ")}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded px-2 py-0.5">图片 {s.promptIndex + 1}</span>
                        <span className="text-xs font-medium text-gray-700">{s.promptTitle}</span>
                      </div>
                      <div className={["w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors", checked ? "bg-blue-500 border-blue-500" : "border-gray-300 bg-white"].join(" ")}>
                        {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{s.suggestion}</p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button onClick={() => setCurrentStep(0)} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-3 py-1.5 transition-colors">← 返回修改</button>
            <button onClick={handleStartGenerate} disabled={selectedSuggestions.size === 0} className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium px-4 py-1.5 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              下一步：生成 →
            </button>
          </div>
        </div>
      )}

      {/* 步骤 2：生成 */}
      {currentStep === 2 && (
        <div className="px-8 pb-8 border-t pt-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">图片生成中</h2>
            <p className="text-xs text-gray-400 mt-0.5">共 {generatedImages.length} 张，全部完成后可进入下一步确认</p>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {generatedImages.map((item, i) => {
              const s = suggestions.find((sg) => sg.promptIndex === item.index);
              return (
                <div key={i} className="space-y-1.5">
                  {item.status === "generating" ? (
                    <div className="w-full aspect-square rounded-lg bg-gray-100 overflow-hidden relative animate-pulse">
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <span className="w-5 h-5 border-2 border-gray-300 border-t-blue-400 rounded-full animate-spin" />
                        <span className="text-[10px] text-gray-400">生成中...</span>
                      </div>
                    </div>
                  ) : item.status === "done" && item.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt={`生成图${i + 1}`} className="w-full aspect-square object-cover rounded-lg border" />
                  ) : (
                    <div className="w-full aspect-square rounded-lg bg-red-50 border border-red-100 flex items-center justify-center">
                      <span className="text-[10px] text-red-400">生成失败</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">图{item.index + 1}</span>
                    {item.status === "done" && <span className="text-[10px] text-green-500">✓</span>}
                    {item.status === "failed" && <span className="text-[10px] text-red-400">✗</span>}
                  </div>
                  {s && <p className="text-[10px] text-gray-400 line-clamp-1">{s.promptTitle}</p>}
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={() => setCurrentStep(1)} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-3 py-1.5 transition-colors">← 返回选择</button>
            <button
              onClick={() => { setCurrentStep(3); setMaxStep(3); }}
              disabled={generatedImages.some((item) => item.status === "generating") || generatedImages.every((item) => item.status === "failed")}
              className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium px-4 py-1.5 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              下一步：确认 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
