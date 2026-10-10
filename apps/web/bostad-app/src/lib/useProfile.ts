import { useEffect, useState } from "react";
import type { Profile } from "@bostad/property";
import { normaliseProfile } from "./normalise";

export type ProfileErrorKind = "tooMany" | "badAddress" | "network" | "generic";

export type ProfileState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; profile: Profile }
  | { status: "error"; kind: ProfileErrorKind };

/** Fetches /api/profile for an address. `retry` re-runs the same lookup. */
export function useProfile(address: string | undefined) {
  const [state, setState] = useState<ProfileState>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!address) {
      setState({ status: "idle" });
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading" });

    (async () => {
      try {
        const res = await fetch(`/api/profile?address=${encodeURIComponent(address)}`, {
          signal: controller.signal,
        });
        if (res.status === 429) {
          setState({ status: "error", kind: "tooMany" });
          return;
        }
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState({ status: "error", kind: res.status === 400 ? "badAddress" : "generic" });
          return;
        }
        const profile = normaliseProfile(body);
        setState(profile ? { status: "ok", profile } : { status: "error", kind: "generic" });
      } catch {
        if (controller.signal.aborted) return;
        setState({ status: "error", kind: "network" });
      }
    })();

    return () => controller.abort();
  }, [address, attempt]);

  return { state, retry: () => setAttempt((n) => n + 1) };
}
