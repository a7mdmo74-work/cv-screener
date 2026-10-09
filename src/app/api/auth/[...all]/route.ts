import { auth, authOrigin } from "@/lib/auth/config";
import { consumeBudget } from "@/lib/auth/throttle";
const endpoints = new Set(["/sign-in/email", "/sign-out", "/get-session", "/change-password"]);
async function handle(request: Request) {
  const endpoint = new URL(request.url).pathname.replace(/^\/api\/auth/, "");
  if (!endpoints.has(endpoint)) return new Response(null, { status: 404 });
  const method = endpoint === "/get-session" ? "GET" : "POST";
  if (request.method !== method) return new Response(null, { status: 405, headers: { Allow: method } });
  let body: Record<string, unknown> = {};
  if (request.method === "POST") {
    // Require same-origin requests even for first login / requests without cookies.
    if (request.headers.get("origin") !== authOrigin()) return new Response(null, { status: 403 });
    if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return new Response(null, { status: 415 });
    const reader = request.body?.getReader();
    if (!reader) return new Response(null, { status: 400 });
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) { void reader.cancel(); return new Response(null, { status: 413 }); }
      chunks.push(value);
    }
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!body || typeof body !== "object" || Array.isArray(body)) return new Response(null, { status: 400 });
    } catch { return new Response(null, { status: 400 }); }
    request = new Request(request.url, { method: "POST", headers: request.headers, body: JSON.stringify(body) });
  }
  if (endpoint === "/sign-in/email") {
    if (typeof body.email !== "string" || body.email.length > 254 || typeof body.password !== "string" || Buffer.byteLength(body.password) > 72) return new Response(null, { status: 400 });
    if (!await consumeBudget("login-global", "all", 100) || !await consumeBudget("login-account", body.email.trim().toLowerCase(), 5)) return new Response(null, { status: 429, headers: { "Retry-After": "300" } });
  }
  const response = await auth.handler(request);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const GET = handle;
export const POST = handle;
