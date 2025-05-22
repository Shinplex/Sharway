import { Handlers } from "$fresh/server.ts";

const client_id = "cwP3kVVnjAMrrfCgseGd57I0eRLvuMKN";
const redirect_uri = "http://localhost:8000/oauth2/callback"; // We will create this callback route later
const authorize_endpoint = "https://connect.linux.do/oauth2/authorize";

export const handler: Handlers = {
  async GET(req) {
    const url = new URL(authorize_endpoint);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", client_id);
    url.searchParams.set("redirect_uri", redirect_uri);
    url.searchParams.set("state", "random_state_string"); // In a real app, use a secure random string and verify it in the callback

    return new Response(null, {
      status: 302,
      headers: {
        Location: url.toString(),
      },
    });
  },
};