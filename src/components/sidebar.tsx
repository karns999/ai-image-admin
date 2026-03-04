"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ImageIcon, LogOutIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/generate", label: "AI 生图", icon: ImageIcon },
];

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-56 border-r flex flex-col bg-background">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm">AI 工具后台</h2>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
              pathname === href
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t space-y-2">
        <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleLogout}>
          <LogOutIcon size={14} />
          退出登录
        </Button>
      </div>
    </aside>
  );
}
