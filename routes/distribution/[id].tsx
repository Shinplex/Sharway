import { Handlers, PageProps } from "$fresh/server.ts";
import { getDistribution, getClaimedItems, claimItem, hasIpClaimedDistribution, Distribution, ClaimedItem } from "../../utils/db.ts";
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
  alreadyClaimedByIp: boolean;
  claimedItemIndex: number | null;
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const distributionId = ctx.params.id;
    const distribution = await getDistribution(distributionId);
    const claimedItems = await getClaimedItems(distributionId);
    const user = ctx.state.user as User | undefined;

    let canClaim = false;
    let alreadyClaimedByIp = false;
    let claimedItemIndex: number | null = null;

    if (distribution && user) {
      // Check trust level
      if (user.trust_level >= distribution.min_trust_level && user.trust_level <= distribution.max_trust_level) {
        // Check if already claimed by this user
        const userClaim = claimedItems.find(item => item.claimed_by === user.id);
        if (!userClaim) {
          // Check if already claimed by this IP
          const ip = req.headers.get("X-Forwarded-For") || req.headers.get("Remote-Addr") || "unknown"; // Get client IP
          alreadyClaimedByIp = await hasIpClaimedDistribution(distributionId, ip);
          if (!alreadyClaimedByIp) {
            // Check if there are available items
            if (claimedItems.length < distribution.content.length) {
              canClaim = true;
            }
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
      alreadyClaimedByIp,
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

    const ip = req.headers.get("X-Forwarded-For") || req.headers.get("Remote-Addr") || "unknown"; // Get client IP
    const alreadyClaimedByIp = await hasIpClaimedDistribution(distributionId, ip);
    if (alreadyClaimedByIp) {
      return new Response("Already claimed by this IP", { status: 403 });
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

    const claimedItem = await claimItem(distributionId, nextItemIndex, user.id, ip);

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
  const { distribution, claimedItems, user, canClaim, alreadyClaimedByIp, claimedItemIndex } = data;

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

  return <div>Test</div>;
}