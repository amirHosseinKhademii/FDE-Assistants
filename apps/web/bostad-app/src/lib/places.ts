/** Display order and translation keys for the everyday-places categories. */
import type { PlaceCategory } from "@bostad/property";
import type { MessageKey } from "./i18n";

export const PLACE_ORDER: PlaceCategory[] = ["grocery", "pharmacy", "school", "preschool", "park", "health"];

export const PLACE_KEY: Record<PlaceCategory, MessageKey> = {
  grocery: "place.grocery",
  pharmacy: "place.pharmacy",
  school: "place.school",
  preschool: "place.preschool",
  park: "place.park",
  health: "place.health",
};
