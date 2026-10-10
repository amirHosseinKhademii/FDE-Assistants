/** The place filter shared by the Nearby places card and the map: one category, or all. */
import type { PlaceCategory } from "@bostad/property";

export type PlacesFilter = "all" | PlaceCategory;
