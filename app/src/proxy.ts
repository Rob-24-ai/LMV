import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Single-passcode gate (HTTP Basic auth). Active ONLY when LMV_PASSCODE is set,
// so local Max-mode dev stays open while a public deploy is locked. Covers both
// the UI and /api/* — so a public URL can't let anyone burn the Anthropic key.
// Any username is accepted; only the password is checked. (Next 16 renamed
// Middleware → Proxy; same mechanism, runs on the Edge runtime where atob exists.)
export function proxy(request: NextRequest) {
  const passcode = process.env.LMV_PASSCODE;
  if (!passcode) return NextResponse.next();

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const supplied = decoded.slice(decoded.indexOf(":") + 1);
    if (supplied === passcode) return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Lick My Vintage"' },
  });
}

export const config = {
  // Run on everything except Next's static assets and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
