"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Suggestion {
  id: string;
  prompt_index: number;
  prompt_title: string;
  image_url: string | null;
  image_status: string;
  selected: boolean;
}

interface Task {
  id: string;
  product_title: string | null;
  status: string;
  current_step: number;
  created_at: string;
  task_suggestions: Suggestion[];
}

const statusMap: Record<string, { label: string; color: string }> = {
  draft:      { label: "草稿",   color: "bg-gray-100 text-gray-500" },
  suggesting: { label: "建议中", color: "bg-orange-100 text-orange-500" },
  suggested:  { label: "待选方案", color: "bg-blue-100 text-blue-500" },
  generating: { label: "生成中", color: "bg-purple-100 text-purple-500" },
  done:       { label: "已完成", color: "bg-green-100 text-green-600" },
  failed:     { label: "失败",   color: "bg-red-100 text-red-500" },
};

export default function HistoryPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTasks(data);
        else toast.error("加载失败");
        setLoading(false);
      })
      .catch(() => { toast.error("加载失败"); setLoading(false); });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-gray-400">加载中...</div>;
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-base font-semibold text-gray-800">生图历史</h1>
          <p className="text-xs text-gray-400 mt-0.5">所有生图任务记录</p>
        </div>
      </div>

      {tasks.length === 0 && (
        <div className="border rounded-lg bg-white py-16 text-center">
          <p className="text-sm text-gray-400">还没有生图任务</p>
          <p className="text-xs text-gray-300 mt-1">点击右上角「新建任务」开始</p>
        </div>
      )}

      <div className="space-y-4">
        {tasks.map((task) => {
          const status = statusMap[task.status] ?? { label: task.status, color: "bg-gray-100 text-gray-500" };
          const images = task.task_suggestions?.filter((s) => s.image_url) ?? [];

          return (
            <div
              key={task.id}
              onClick={() => router.push(`/generate?task=${task.id}`)}
              className="border rounded-lg bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {task.product_title || "未命名任务"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(task.created_at).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                    {status.label}
                  </span>
                  <span className="text-xs text-gray-400">步骤 {task.current_step + 1}/5</span>
                </div>
              </div>

              {images.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {images.map((s) => (
                    <img
                      key={s.id}
                      src={s.image_url!}
                      alt={s.prompt_title}
                      className="w-20 h-20 rounded-md object-cover border"
                    />
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-300 italic">暂无生成图片</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
