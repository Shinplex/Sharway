import { Handlers, PageProps } from "$fresh/server.ts";
import { getDistributionsByUser, getClaimedItemsByUser, Distribution, ClaimedItem } from "../utils/db.ts";
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
  myDistributions: Distribution[];
  myClaimedItems: ClaimedItem[];
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const user = ctx.state.user as User | undefined;
    let myDistributions: Distribution[] = [];
    let myClaimedItems: ClaimedItem[] = [];

    if (user) {
      myDistributions = await getDistributionsByUser(user.id);
      myClaimedItems = await getClaimedItemsByUser(user.id);
    }

    return ctx.render({ user: user || null, myDistributions, myClaimedItems });
  },
};

export default function Home({ data }: PageProps<Data>) {
  const { user, myDistributions, myClaimedItems } = data;

  return (
    <>
      <Header user={user} />
      <main class="container">
        {user ? (
          <>
            <h1>欢迎, {user.username}!</h1>
            <p>您的信任等级是: {user.trust_level}</p>

            <h2>您的分发</h2>
            {myDistributions.length > 0 ? (
              <ul>
                {myDistributions.map(dist => (
                  <li key={dist.id}>
                    <a href={`/distribution/${dist.id}`}>{dist.title}</a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>您还没有创建任何分发。</p>
            )}

            <h2>您领取的项目</h2>
            {myClaimedItems.length > 0 ? (
              <ul>
                {myClaimedItems.map(item => (
                  <li key={item.distribution_id + "-" + item.item_index}>
                    在分发 <a href={`/distribution/${item.distribution_id}`}>{item.distribution_id}</a> 中领取了索引为 {item.item_index} 的项目。
                  </li>
                ))}
              </ul>
            ) : (
              <p>您还没有领取任何项目。</p>
            )}
          </>
        ) : (
          <>
            <h1>欢迎来到Sharway</h1>
            <p>请登录以使用完整功能。</p>
            <a href="/login" role="button">使用 LINUX DO 登录</a>
          </>
        )}
      </main>
    </>
  );
}
