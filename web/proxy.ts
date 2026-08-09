import { NextRequest, NextResponse } from "next/server";
import {
  CODEX_CALLBACK_API_PATH,
  isBackendPath,
  isCodexCallbackPath,
} from "./lib/proxy-policy";

// Backend base URL for `/api/*` and `/ws/*` rewrites. The container entrypoint
// exports `DEEPTUTOR_API_BASE_URL` from `data/user/settings/system.json`
// (preferring `next_public_api_base`, then `next_public_api_base_external`,
// then `http://127.0.0.1:${BACKEND_PORT}`). This last-resort default applies
// only when nothing exported the variable at all.
//
// The loopback is spelled as the IPv4 literal, not `localhost`: on a dual-stack
// host that name resolves to ::1 first, while uvicorn binds 0.0.0.0 (IPv4
// only), so every rewrite would fail to connect.
const API_BASE_URL =
  process.env.DEEPTUTOR_API_BASE_URL ?? "http://127.0.0.1:8001";

export function proxy(req: NextRequest): NextResponse {
  const { pathname, search } = req.nextUrl;

  if (isCodexCallbackPath(pathname)) {
    return NextResponse.rewrite(
      new URL(CODEX_CALLBACK_API_PATH + search, API_BASE_URL),
    );
  }

  // 1. Bridge the origin gap: forward backend-relative paths to the API server.
  //    This keeps the URL knowledge in one place (the entrypoint + system.json)
  //    rather than baked into the frontend bundle.
  if (isBackendPath(pathname)) {
    return NextResponse.rewrite(new URL(pathname + search, API_BASE_URL));
  }

  // Pages are public. The backend still validates the signed account/guest
  // cookie on every API call, and admin-only endpoints keep their 403 guard.
  return NextResponse.next();
}

export const config = {
  // Run on every request except Next.js internals and the favicon. The /api/*
  // and /ws/* paths are explicitly handled above (rewritten to the backend);
  // the browser's /_next/image optimizer requests are excluded here, while the
  // optimizer's loopback fetch for the source image (e.g. /logo.png) is let
  // through the auth gate by isAuthExempt.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
