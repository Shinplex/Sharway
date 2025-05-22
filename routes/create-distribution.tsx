import { Handlers, PageProps } from "$fresh/server.ts";
import { saveDistribution, Distribution } from "../utils/db.ts";
import Header from "../components/Header.tsx";

interface User {
  id: number;
  username: string;
  name: string;
  trust_level: number;
  active: boolean;
  silenced: boolean;
}

interface Data {
  user: User | null;
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const user = ctx.state.user as User | undefined;
    if (!user) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/login",
        },
      });
    }
    return ctx.render({ user });
  },
  async POST(req, ctx) {
    const user = ctx.state.user as User | undefined;
    if (!user) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/login",
        },
      });
    }

    const form = await req.formData();
    const title = form.get("title")?.toString() || "";
    const description = form.get("description")?.toString() || "";
    const content = form.get("content")?.toString() || "";
    const min_trust_level = parseInt(form.get("min_trust_level")?.toString() || "0", 10);
    const max_trust_level = parseInt(form.get("max_trust_level")?.toString() || "4", 10);

    // Basic validation
    if (!title || !content) {
      return new Response("Title and Content are required", { status: 400 });
    }

    const contentArray = content.split("\n").map(line => line.trim()).filter(line => line.length > 0);

    const newDistribution = await saveDistribution({
      title,
      description,
      content: contentArray,
      min_trust_level,
      max_trust_level,
    }, user.id);

    return new Response(null, {
      status: 302,
      headers: {
        Location: `/distribution/${newDistribution.id}`,
      },
    });
  },
};

export default function CreateDistribution({ data }: PageProps<Data>) {
  const { user } = data;

  if (!user) {
    // This case should be handled by the handler, but good for type safety
    return <div>Redirecting to login...</div>;
  }

  return (
    <>
      <Header user={user} />
      <main class="container">
        <h1>创建新分发</h1>
        <form method="POST">
          <div class="grid">
            <label for="title">
              标题:
              <input type="text" id="title" name="title" required />
            </label>
          </div>
          <div class="grid">
            <label for="description">
              描述:
              <textarea id="description" name="description"></textarea>
            </label>
          </div>
          <div class="grid">
            <label for="content">
              内容 (每行一个):
              <textarea id="content" name="content" rows={10} required></textarea>
            </label>
          </div>
          <div class="grid">
            <label for="min_trust_level">
              最小信任等级:
              <input type="number" id="min_trust_level" name="min_trust_level" min="0" max="4" value="0" />
            </label>
          </div>
          <div class="grid">
            <label for="max_trust_level">
              最高信任等级:
              <input type="number" id="max_trust_level" name="max_trust_level" min="0" max="4" value="4" />
            </label>
          </div>
          <button type="submit">创建分发</button>
        </form>
      </main>
    </>
  );
}