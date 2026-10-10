import type { ReactNode } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { HAS_MAPS_KEY, MAPS_KEY } from "../lib/maps";

/**
 * Loads the Google Maps JavaScript API once for the whole app. Without a key it
 * renders its children untouched, so the plain search box and placeholder map
 * keep working. The key is fixed per build, so this never changes shape at runtime.
 */
export function MapsProvider({ children }: { children: ReactNode }) {
  if (!HAS_MAPS_KEY) return <>{children}</>;
  return (
    <APIProvider apiKey={MAPS_KEY} libraries={["places"]}>
      {children}
    </APIProvider>
  );
}
