"use client";

import Link from "next/link";
import { LogIn, LogOut, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { logout } from "@/lib/auth";
import { useAuthStatus } from "@/hooks/useAuthStatus";

interface LogoutButtonProps {
  collapsed?: boolean;
}

export function LogoutButton({ collapsed = false }: LogoutButtonProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { enabled, authenticated } = useAuthStatus();

  if (!enabled) return null;

  if (!authenticated) {
    if (collapsed) {
      return (
        <Link
          href="/login"
          className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--background)]/50 hover:text-[var(--foreground)]"
          aria-label={t("Sign in")}
          title={t("Sign in")}
        >
          <LogIn size={16} strokeWidth={1.5} />
        </Link>
      );
    }
    return (
      <div className="flex w-full flex-col gap-1">
        <Link
          href="/login"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-[var(--muted-foreground)] hover:bg-[var(--background)]/50 hover:text-[var(--foreground)]"
        >
          <LogIn size={16} strokeWidth={1.5} />
          <span>{t("Sign in")}</span>
        </Link>
        <Link
          href="/register"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-[var(--muted-foreground)] hover:bg-[var(--background)]/50 hover:text-[var(--foreground)]"
        >
          <UserPlus size={16} strokeWidth={1.5} />
          <span>{t("Create account")}</span>
        </Link>
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  if (collapsed) {
    return (
      <button
        onClick={handleLogout}
        className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--background)]/50 hover:text-red-500"
        aria-label={t("Sign out")}
        title={t("Sign out")}
      >
        <LogOut size={16} strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--background)]/50 hover:text-red-500"
    >
      <LogOut size={16} strokeWidth={1.5} />
      <span>{t("Sign out")}</span>
    </button>
  );
}
