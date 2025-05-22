import { ulid } from "$std/ulid/mod.ts";

export interface Distribution {
  id: string;
  title: string;
  description: string;
  content: string[];
  min_trust_level: number;
  max_trust_level: number;
  created_by: number; // User ID
  created_at: Date;
}

export interface ClaimedItem {
  distribution_id: string;
  item_index: number;
  claimed_by: number; // User ID
  claimed_at: Date;
}

const kv = await Deno.openKv();

export async function saveDistribution(distribution: Omit<Distribution, "id" | "created_at" | "created_by">, created_by: number): Promise<Distribution> {
  const id = ulid();
  const newDistribution: Distribution = {
    id,
    ...distribution,
    created_by,
    created_at: new Date(),
  };
  const key = ["distributions", id];
  await kv.set(key, newDistribution);
  return newDistribution;
}

export async function getDistribution(id: string): Promise<Distribution | null> {
  const key = ["distributions", id];
  const entry = await kv.get<Distribution>(key);
  return entry.value;
}

export async function getDistributionsByUser(userId: number): Promise<Distribution[]> {
  const distributions: Distribution[] = [];
  for await (const entry of kv.list<Distribution>({ prefix: ["distributions"] })) {
    if (entry.value.created_by === userId) {
      distributions.push(entry.value);
    }
  }
  return distributions;
}

export async function getClaimedItems(distributionId: string): Promise<ClaimedItem[]> {
  const claimedItems: ClaimedItem[] = [];
  for await (const entry of kv.list<ClaimedItem>({ prefix: ["claimed_items", distributionId] })) {
    claimedItems.push(entry.value);
  }
  return claimedItems;
}

export async function claimItem(distributionId: string, itemIndex: number, claimedBy: number): Promise<ClaimedItem | null> {
  const key = ["claimed_items", distributionId, itemIndex];
  const existingClaim = await kv.get<ClaimedItem>(key);

  if (existingClaim.value) {
    return null; // Item already claimed
  }

  const newClaim: ClaimedItem = {
    distribution_id: distributionId,
    item_index: itemIndex,
    claimed_by: claimedBy,
    claimed_at: new Date(),
  };

  const ok = await kv.atomic()
    .check({ key, versionstamp: null }) // Ensure the item hasn't been claimed since we checked
    .set(key, newClaim)
    .commit();

  if (ok) {
    return newClaim;
  } else {
    return null; // Atomic operation failed, likely due to a race condition
  }
}


export async function getClaimedItemsByUser(userId: number): Promise<ClaimedItem[]> {
  const claimedItems: ClaimedItem[] = [];
  // Iterate through all claimed items across all distributions
  for await (const entry of kv.list<ClaimedItem>({ prefix: ["claimed_items"] })) {
    if (entry.value.claimed_by === userId) {
      claimedItems.push(entry.value);
    }
  }
  return claimedItems;
}

// Remember to close the KV connection when the application exits
// Deno.addDisposableResource(kv); // This is for Deno 1.37+, check Deno version if needed