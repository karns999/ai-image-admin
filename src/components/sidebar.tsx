"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { HistoryIcon, ImageIcon, LayoutListIcon, LogOutIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import NavProgress from "@/components/nav-progress";

const navItems = [
  { href: "/generate", label: "AI 生图", icon: ImageIcon },
  { href: "/history", label: "生图历史", icon: HistoryIcon },
  { href: "/prompts", label: "Prompt 模板", icon: LayoutListIcon },
];

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  function handleNav(href: string) {
    if (href === pathname) return;
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  }

  if (pendingHref && !isPending) {
    setPendingHref(null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <NavProgress loading={isPending} />
      <aside className="w-56 border-r flex flex-col bg-background">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm">AI 工具后台</h2>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pendingHref === href;
            return (
              <button
                key={href}
                onClick={() => handleNav(href)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={16} className="shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t space-y-2">
          <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOutIcon size={14} />
            退出登录
          </Button>
        </div>
      </aside>
    </>
  );
}
