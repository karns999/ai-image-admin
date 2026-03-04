"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Record {
  id: string;
  model: string;
  prompt: string;
  status: "pending" | "success" | "failed";
  image_url: string | null;
  error_message: string | null;
  created_at: string;
}

const statusMap = {
  pending: { label: "生成中", variant: "secondary" as const },
  success: { label: "成功", variant: "default" as const },
  failed: { label: "失败", variant: "destructive" as const },
};

export default function RecordGallery({ initialRecords }: { initialRecords: Record[] }) {
  if (initialRecords.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-12">
        还没有生图记录，快去生成第一张吧
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-base font-semibold mb-4">历史记录</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {initialRecords.map((record) => {
          const status = statusMap[record.status];
          return (
            <Card key={record.id} className="overflow-hidden">
              {record.image_url ? (
                <img
                  src={record.image_url}
                  alt={record.prompt}
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className="w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground text-sm">
                  {record.status === "pending" ? "生成中..." : "生成失败"}
                </div>
              )}
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{record.model.split("/")[1]}</span>
                  <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                </div>
                <p className="text-xs line-clamp-2 text-foreground">{record.prompt}</p>
                {record.error_message && (
                  <p className="text-xs text-destructive">{record.error_message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(record.created_at).toLocaleString("zh-CN")}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
