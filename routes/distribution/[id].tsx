import { Handlers, PageProps } from "$fresh/server.ts";
import { getDistribution, getClaimedItems, claimItem, Distribution, ClaimedItem } from "../../utils/db.ts";
import Header from "../../components/Header.tsx";

interface User {
  id: number;
  username: string;
  name: string;
  trust_level: number;
  active: boolean;
  silenced: boolean;
}

interface Data {
  distribution: Distribution | null;
  claimedItems: ClaimedItem[];
  user: User | null;
  canClaim: boolean;
  claimedItemIndex: number | null;
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const distributionId = ctx.params.id;
    const distribution = await getDistribution(distributionId);
    const claimedItems = await getClaimedItems(distributionId);
    const user = ctx.state.user as User | undefined;

    let canClaim = false;
    let claimedItemIndex: number | null = null;

    if (distribution && user) {
      // Check trust level
      if (user.trust_level >= distribution.min_trust_level && user.trust_level <= distribution.max_trust_level) {
        // Check if already claimed by this user
        const userClaim = claimedItems.find(item => item.claimed_by === user.id);
        if (!userClaim) {
          // Check if there are available items
          if (claimedItems.length < distribution.content.length) {
            canClaim = true;
          }
        } else {
          claimedItemIndex = userClaim.item_index;
        }
      }
    }

    return ctx.render({
      distribution,
      claimedItems,
      user: user || null,
      canClaim,
      claimedItemIndex,
    });
  },

  async POST(req, ctx) {
    const distributionId = ctx.params.id;
    const distribution = await getDistribution(distributionId);
    const user = ctx.state.user as User | undefined;

    if (!distribution || !user) {
      return new Response("Unauthorized or Distribution not found", { status: 401 });
    }

    // Re-check eligibility before claiming
    if (user.trust_level < distribution.min_trust_level || user.trust_level > distribution.max_trust_level) {
      return new Response("Trust level not met", { status: 403 });
    }


    const claimedItems = await getClaimedItems(distributionId);
    if (claimedItems.length >= distribution.content.length) {
      return new Response("All items claimed", { status: 409 });
    }

    // Find the first unclaimed item index
    const claimedIndices = new Set(claimedItems.map(item => item.item_index));
    let nextItemIndex = -1;
    for (let i = 0; i < distribution.content.length; i++) {
      if (!claimedIndices.has(i)) {
        nextItemIndex = i;
        break;
      }
    }

    if (nextItemIndex === -1) {
       return new Response("All items claimed (race condition)", { status: 409 });
    }

    const claimedItem = await claimItem(distributionId, nextItemIndex, user.id);

    if (claimedItem) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/distribution/${distributionId}`, // Redirect back to the distribution page
        },
      });
    } else {
      return new Response("Failed to claim item (race condition)", { status: 500 });
    }
  },
};

export default function DistributionPage({ data }: PageProps<Data>) {
  const { distribution, claimedItems, user, canClaim, claimedItemIndex } = data;

  if (!distribution) {
    return (
      <>
        <Header user={user} />
        <main class="container">
          <h1>分发未找到</h1>
          <p>指定的分发不存在。</p>
        </main>
      </>
    );
  }

  const claimedCount = claimedItems.length;
  const totalItems = distribution.content.length;
  const progress = totalItems > 0 ? (claimedCount / totalItems) * 100 : 0;

  return (
    <>
      <Header user={user} />
      <main class="container mx-auto p-4">
        <h1 class="text-2xl font-bold mb-4">{distribution.title}</h1>
        <p class="mb-6">{distribution.description}</p>

        <div class="mb-6">
          <h2 class="text-xl font-semibold mb-2">领取进度</h2>
          <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div class="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
          <p class="text-sm text-gray-600 mt-1">{claimedCount} / {totalItems} 已领取</p>
        </div>

        {user && (
          <div class="mb-6">
            {claimedItemIndex !== null ? (
              <div>
                <h2 class="text-xl font-semibold mb-2">您已领取</h2>
                <p class="break-words">{distribution.content[claimedItemIndex]}</p>
              </div>
            ) : canClaim ? (
              <form method="POST">
                <button type="submit" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                  领取项目
                </button>
              </form>
            ) : (
              <p class="text-gray-600">您不符合领取条件或所有项目已被领取。</p>
            )}
          </div>
        )}

        <div class="mb-6">
          <h2 class="text-xl font-semibold mb-2">已领取项目 ({claimedCount})</h2>
          {claimedItems.length > 0 ? (
            <ul>
              {claimedItems.map((item, index) => (
                <li key={index} class="mb-1 text-gray-700">
                  项目 {item.item_index + 1} 已被用户 {item.claimed_by} 领取
                </li>
              ))}
            </ul>
          ) : (
            <p class="text-gray-600">暂无项目被领取。</p>
          )}
        </div>

        <div class="mb-6">
          <h2 class="text-xl font-semibold mb-2">分发详情</h2>
          <p><strong>最低信任等级:</strong> {distribution.min_trust_level}</p>
          <p><strong>最高信任等级:</strong> {distribution.max_trust_level}</p>
          <p><strong>创建者:</strong> {distribution.created_by}</p>
          <p><strong>创建时间:</strong> {new Date(distribution.created_at).toLocaleString()}</p>
        </div>

      </main>
    </>
  );
}