"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuthStatus } from "@/hooks/useAuthStatus";

/** Keep deployment configuration out of ordinary users' browser sessions. */
export function AdminSettingsGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { enabled, isAdmin, loading } = useAuthStatus();
  const denied = enabled && !isAdmin;

  useEffect(() => {
    if (!loading && denied) router.replace("/home");
  }, [denied, loading, router]);

  if (loading || denied) return null;
  return children;
}
