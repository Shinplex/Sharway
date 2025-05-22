import { MiddlewareHandlerContext } from "$fresh/server.ts";
import { getCookies } from "$std/http/cookie.ts";

export async function handler(
  req: Request,
  ctx: MiddlewareHandlerContext,
) {
  const cookies = getCookies(req.headers);
  const sessionId = cookies.session_id;

  if (sessionId) {
    const kv = await Deno.openKv();
    const sessionKey = ["sessions", sessionId];
    const sessionEntry = await kv.get(sessionKey);
    kv.close();

    if (sessionEntry.value) {
      ctx.state.user = sessionEntry.value;
    }
  }

  return await ctx.next();
}