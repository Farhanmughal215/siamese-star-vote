import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/ssr/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Match every path EXCEPT static assets, image optimisations, and the
    // auth callback (which has its own handler).
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|css|js)$).*)",
  ],
};
