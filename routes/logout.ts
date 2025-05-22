import { Handlers } from "$fresh/server.ts";
import { deleteCookie } from "$std/http/cookie.ts";

export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const cookies = req.headers.get("Cookie");
    const sessionId = cookies ? cookies.split('; ').find(row => row.startsWith('session_id='))?.split('=')[1] : null;

    if (sessionId) {
      const kv = await Deno.openKv();
      const sessionKey = ["sessions", sessionId];
      await kv.delete(sessionKey);
      kv.close();
    }

    const response = new Response(null, {
      status: 302,
      headers: {
        Location: "/",
      },
    });

    deleteCookie(response.headers, "session_id", { path: "/" });

    return response;
  },
};