"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

interface PromptTemplate {
  id: string;
  title: string;
  prompt: string;
  sort_order: number;
  created_at: string;
  user_email: string;
}

function AddModal({ onClose, onSaved }: { onClose: () => void; onSaved: (t: PromptTemplate) => void }) {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) { toast.error("Prompt 内容不能为空"); return; }
    if (!title.trim()) { toast.error("标题不能为空"); return; }
    setSaving(true);
    const res = await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, prompt, sort_order: 0 }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(data.error); return; }
    toast.success("添加成功");
    onSaved(data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-800">添加 Prompt 模板</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">标题 <span className="text-red-400">*</span></label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给这套 Prompt 起个名字"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50 outline-none focus:bg-white focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all placeholder:text-gray-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">
              Prompt 内容 <span className="text-red-400">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              placeholder="输入 Prompt 内容..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50 outline-none focus:bg-white focus:ring-2 focus:ring-blue-300 focus:border-transparent resize-none transition-all placeholder:text-gray-300"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-md text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-md text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PromptsPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch("/api/prompts")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTemplates(data);
        } else {
          toast.error("加载模板失败");
        }
        setLoading(false);
      })
      .catch(() => {
        toast.error("加载模板失败");
        setLoading(false);
      });
  }, []);

  async function handleDelete(id: string) {
    setDeleting(id);
    const res = await fetch("/api/prompts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleting(null);
    if (!res.ok) { toast.error("删除失败"); return; }
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast.success("已删除");
  }

  async function handleSave(t: PromptTemplate) {
    setSaving(t.id);
    const res = await fetch("/api/prompts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, title: t.title, prompt: t.prompt, sort_order: t.sort_order }),
    });
    setSaving(null);
    if (!res.ok) { toast.error((await res.json()).error || "保存失败"); return; }
    toast.success("已保存");
  }

  function updateField(id: string, field: "title" | "prompt", val: string) {
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, [field]: val } : t));
  }

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-sm text-gray-400">加载中...</div>;
  }

  return (
    <div className="w-full">
      {showModal && (
        <AddModal
          onClose={() => setShowModal(false)}
          onSaved={(t) => setTemplates((prev) => [...prev, t])}
        />
      )}

      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-base font-semibold text-gray-800">Prompt 模板</h1>
          <p className="text-xs text-gray-400 mt-0.5">Prompt 模块。供 AI 生图白底图预设使用</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
        >
          <Plus size={13} /> 添加模板
        </button>
      </div>

      {/* 空状态 */}
      {templates.length === 0 && (
        <div className="border rounded-lg bg-white py-16 text-center">
          <p className="text-sm text-gray-400">还没有模板</p>
        </div>
      )}

      {/* 列表 */}
      {templates.length > 0 && (
        <div className="border rounded-lg bg-white overflow-hidden">
          <div className="grid grid-cols-[280px_160px_1fr_140px_140px_72px] gap-3 px-4 py-2.5 bg-gray-50 border-b text-xs text-gray-400 font-medium">
            <span>ID</span>
            <span>标题</span>
            <span>Prompt 内容</span>
            <span className="text-center">创建人</span>
            <span className="text-center">创建时间</span>
            <span />
          </div>

          {templates.map((t) => (
            <div
              key={t.id}
              className="grid grid-cols-[280px_160px_1fr_140px_140px_72px] gap-3 px-4 py-3 border-b last:border-b-0 items-center hover:bg-gray-50/50 transition-colors"
            >
              <div className="text-xs text-gray-400 font-mono break-all leading-relaxed">{t.id}</div>

              <input
                value={t.title ?? ""}
                onChange={(e) => updateField(t.id, "title", e.target.value)}
                placeholder="输入标题"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50 outline-none focus:bg-white focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all placeholder:text-gray-300"
              />

              <textarea
                value={t.prompt}
                onChange={(e) => updateField(t.id, "prompt", e.target.value)}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50 outline-none focus:bg-white focus:ring-2 focus:ring-blue-300 focus:border-transparent resize-none transition-all placeholder:text-gray-300"
              />

              <div className="text-center">
                <span className="text-xs text-gray-500 truncate block" title={t.user_email}>
                  {t.user_email?.split("@")[0]}
                </span>
              </div>

              <div className="text-center">
                <span className="text-xs text-gray-400">
                  {new Date(t.created_at).toLocaleString("zh-CN", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="flex flex-col gap-1.5 items-end">
                <button
                  onClick={() => handleSave(t)}
                  disabled={saving === t.id || deleting === t.id}
                  className="px-3 py-1 rounded-md text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-40"
                >
                  {saving === t.id ? "保存中..." : "保存"}
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  disabled={deleting === t.id || saving === t.id}
                  className="px-3 py-1 rounded-md text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  {deleting === t.id ? "删除中..." : "删除"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
