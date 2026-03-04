import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;

  const { data, error } = await supabase
    .from("generation_tasks")
    .select(`*, task_suggestions(*)`)
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  return NextResponse.json(data);
}
