/**
 * `/` is the home page. `/?address=...` is the property profile for that
 * address, so a copied link opens the same profile.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ADDRESS_MAX_LENGTH } from "../lib/address";
import { HomeView } from "../components/HomeView";
import { ProfileView } from "../components/ProfileView";
import type { AppMode } from "../components/ModeSwitch";
import { addRecent } from "../lib/recents";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { address?: string; mode?: "rent" } => {
    const raw = typeof search.address === "string" ? search.address.trim() : "";
    const mode = search.mode === "rent" ? "rent" : undefined;
    return { ...(raw ? { address: raw.slice(0, ADDRESS_MAX_LENGTH) } : {}), ...(mode ? { mode } : {}) };
  },
  component: Page,
});

function Page() {
  const { address, mode } = Route.useSearch();
  const navigate = useNavigate();
  const appMode: AppMode = mode === "rent" ? "rent" : "buy";
  // A search from either mode stays in that mode: rent searches land on the rent profile.
  const search = (next: string) => {
    addRecent(next);
    navigate({ to: "/", search: appMode === "rent" ? { address: next, mode: "rent" } : { address: next } });
  };

  if (address) return <ProfileView address={address} appMode={appMode} onSearch={search} />;
  return <HomeView mode={appMode} onSearch={search} />;
}
