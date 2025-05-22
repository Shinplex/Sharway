import { Handlers } from "$fresh/server.ts";
import { setCookie } from "$std/http/cookie.ts";
import { ulid } from "$std/ulid/mod.ts";

const client_id = "cwP3kVVnjAMrrfCgseGd57I0eRLvuMKN";
const client_secret = "cMYfpl8ukEnHcE9mKIEIxtb9wJuAubey"; // Provided in the user's prompt
const redirect_uri = "http://localhost:8181/oauth2/callback";
const token_endpoint = "https://connect.linux.do/oauth2/token";
const userinfo_endpoint = "https://connect.linux.do/api/user";

export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // In a real app, verify this state

    if (!code) {
      return new Response("Code not found", { status: 400 });
    }

    // Exchange code for token
    const tokenResponse = await fetch(token_endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: client_id,
        client_secret: client_secret,
        redirect_uri: redirect_uri,
        code: code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", tokenResponse.status, errorText);
      return new Response("Failed to get token", { status: tokenResponse.status });
    }

    const tokenData = await tokenResponse.json();
    console.log("Token data:", tokenData);

    const accessToken = tokenData.access_token;

    // Fetch user info
    const userinfoResponse = await fetch(userinfo_endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userinfoResponse.ok) {
      const errorText = await userinfoResponse.text();
      console.error("Userinfo fetch failed:", userinfoResponse.status, errorText);
      return new Response("Failed to get user info", { status: userinfoResponse.status });
    }

    const userInfo = await userinfoResponse.json();
    console.log("User info:", userInfo);

    // Store user info in Deno KV and set session cookie
    const kv = await Deno.openKv();
    const sessionId = ulid();
    const sessionKey = ["sessions", sessionId];
    await kv.set(sessionKey, userInfo, { expireIn: 1000 * 60 * 60 * 24 * 7 }); // Session expires in 7 days
    kv.close();

    const response = new Response(null, {
      status: 302,
      headers: {
        Location: "/",
      },
    });

    setCookie(response.headers, {
      name: "session_id",
      value: sessionId,
      path: "/",
      httpOnly: true,
      secure: true, // Use secure cookies in production
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  },
};