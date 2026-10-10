/**
 * `pnpm bostad:profile "Djurgårdsgatan 23 A, Göteborg"` prints the profile as JSON.
 *
 * Loads the repo-root .env (same as the steering scripts). Credentials are read
 * from the environment only and are never printed.
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function findRepoRoot(start: string): string {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error("could not find pnpm-workspace.yaml above " + start);
    dir = parent;
  }
}

config({ path: resolve(findRepoRoot(__dirname), ".env"), quiet: true });

import { getProfile } from "../profile";

async function main(): Promise<void> {
  const address = process.argv.slice(2).join(" ").trim();
  if (!address) {
    console.error('usage: pnpm bostad:profile "Djurgårdsgatan 23 A, Göteborg"');
    process.exit(2);
  }
  const profile = await getProfile(address);
  console.log(JSON.stringify(profile, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
