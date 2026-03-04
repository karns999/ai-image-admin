"use client";

import { useEffect, useRef } from "react";
import { LoaderCircle } from "lucide-react";

export default function NavProgress({ loading }: { loading: boolean }) {
  return loading ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <LoaderCircle className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm text-gray-500">加载中...</p>
      </div>
    </div>
  ) : null;
}
