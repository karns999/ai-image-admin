"use client";

import { Check, Plus, Sparkles } from "lucide-react";
import { useRef, useState } from "react";

const steps = ["白底图", "建议", "选方案", "生成", "确认"];

const DEFAULT_SYSTEM_PROMPT = `你是一名亚马逊设计者，请帮我生成契合品牌调性与产品卖点的亚马逊主图的设计列表方案，生成的图片尺寸为1000*1000的正方形图`;

export default function GeneratePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [processingStep, setProcessingStep] = useState<number | null>(null);
  const [whiteImage, setWhiteImage] = useState<string | null>(null);
  const [refImages, setRefImages] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [prompts, setPrompts] = useState<string[]>([""]);
  const whiteInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  function addPrompt() {
    setPrompts((prev) => [...prev, ""]);
  }

  function removePrompt(i: number) {
    setPrompts((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updatePrompt(i: number, val: string) {
    setPrompts((prev) => prev.map((p, idx) => (idx === i ? val : p)));
  }

  function handleWhiteImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setWhiteImage(URL.createObjectURL(file));
  }

  function handleRefImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const urls = files.map((f) => URL.createObjectURL(f));
    setRefImages((prev) => [...prev, ...urls].slice(0, 3));
  }

  return (
    <div className="border rounded-lg bg-white shadow-sm">
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
                {/* 节点 */}
                <button
                  onClick={() => isCompleted || isActive ? setCurrentStep(index) : undefined}
                  disabled={isPending || isProcessing}
                  className="flex flex-col items-center gap-1.5 disabled:cursor-not-allowed"
                >
                  <div
                    className={[
                      "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200",
                      isCompleted
                        ? "bg-green-500 shadow-sm shadow-green-300"
                        : isProcessing
                        ? "bg-white border-2 border-orange-400 shadow-sm shadow-orange-200"
                        : isActive
                        ? "bg-white border-2 border-blue-500 shadow-sm shadow-blue-200"
                        : "bg-white border border-gray-300",
                    ].join(" ")}
                  >
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
                  ].join(" ")}>
                    {step}
                  </span>
                </button>

                {/* 连接线 */}
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-1 mb-4 h-px rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{ width: index < maxStep ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 白底图阶段内容 */}
      {currentStep === 0 && (
        <div className="px-8 pb-8 space-y-6 border-t pt-6">
          <div className="flex gap-10">
            {/* 左：产品白底图 */}
            <div className="flex-1">
              <p className="text-sm font-medium mb-3">
                <span className="text-red-500 mr-0.5">*</span>产品白底图（必填）
              </p>
              <input ref={whiteInputRef} type="file" accept="image/*" className="hidden" onChange={handleWhiteImage} />
              {whiteImage ? (
                <div
                  className="w-36 h-36 rounded-lg overflow-hidden border cursor-pointer"
                  onClick={() => whiteInputRef.current?.click()}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={whiteImage} alt="白底图" className="w-full h-full object-contain" />
                </div>
              ) : (
                <button
                  onClick={() => whiteInputRef.current?.click()}
                  className="w-36 h-36 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors"
                >
                  <Plus className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* 右：参考图 */}
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
                    <button
                      onClick={() => refInputRef.current?.click()}
                      className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">参考图会用于增强方案生成效果，最多 3 张</p>
            </div>
          </div>

          {/* 产品标题 */}
          <div>
            <label className="text-sm font-medium block mb-1.5">产品标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入产品标题"
              className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* 角色指令 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">角色指令</label>
              <button
                onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
                className="text-xs text-gray-400 hover:text-blue-500 transition-colors"
              >
                恢复默认
              </button>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 resize-none text-gray-600 bg-gray-50"
            />
          </div>

          {/* Prompt 指令 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Prompt 指令</label>
              <span className="text-xs text-gray-400">共 {prompts.length} 套建议</span>
            </div>
            <div className="space-y-2">
              {prompts.map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs text-gray-400 mt-2.5 w-4 shrink-0">{i + 1}</span>
                  <input
                    type="text"
                    value={p}
                    onChange={(e) => updatePrompt(i, e.target.value)}
                    placeholder="输入 Prompt，或留空使用模板默认设置"
                    className="flex-1 border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  {prompts.length > 1 && (
                    <button
                      onClick={() => removePrompt(i)}
                      className="mt-2 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addPrompt}
              className="mt-2 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
            >
              <Plus className="w-3 h-3" /> 添加一套
            </button>
          </div>

          {/* 生成按钮 */}
          <div className="flex justify-center">
            <button
              onClick={() => { setProcessingStep(1); setTimeout(() => { setProcessingStep(null); setCurrentStep(1); setMaxStep(1); }, 2000); }}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-6 py-2 rounded-md flex items-center gap-2 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              生成建议（{prompts.length} 套）
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
