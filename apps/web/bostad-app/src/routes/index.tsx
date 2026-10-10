/**
 * `/` is the home page. `/?address=...` is the property profile for that
 * address, so a copied link opens the same profile.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ADDRESS_MAX_LENGTH } from "../lib/address";
import { HomeView } from "../components/HomeView";
import { ProfileView } from "../components/ProfileView";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { address?: string } => {
    const raw = typeof search.address === "string" ? search.address.trim() : "";
    return raw ? { address: raw.slice(0, ADDRESS_MAX_LENGTH) } : {};
  },
  component: Page,
});

function Page() {
  const { address } = Route.useSearch();
  const navigate = useNavigate();
  const search = (next: string) => navigate({ to: "/", search: { address: next } });

  return address ? <ProfileView address={address} onSearch={search} /> : <HomeView onSearch={search} />;
}
