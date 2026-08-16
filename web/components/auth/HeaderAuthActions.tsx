"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useAuthStatus } from "@/hooks/useAuthStatus";

export function HeaderAuthActions() {
  const { t } = useTranslation();
  const { enabled, authenticated, loading } = useAuthStatus();

  if (loading || !enabled) return <div className="ml-auto" />;

  if (authenticated) {
    return (
      <Link
        href="/profile"
        className="ml-auto rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/60"
      >
        {t("Profile")}
      </Link>
    );
  }

  return (
    <div className="ml-auto flex items-center gap-1.5">
      <Link
        href="/login"
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/60"
      >
        {t("Sign in")}
      </Link>
      <Link
        href="/register"
        className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
      >
        {t("Create account")}
      </Link>
    </div>
  );
}
