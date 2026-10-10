/** Display order, translation keys and pictograms for the everyday-places categories. */
import type { PlaceCategory } from "@bostad/property";
import type { MessageKey } from "./i18n";

/** The categories shown as rows and chips, in display order (gym and eatery are counts only). */
export const PLACE_ORDER: PlaceCategory[] = ["grocery", "pharmacy", "health", "school", "preschool", "park"];

export const PLACE_KEY: Record<PlaceCategory, MessageKey> = {
  grocery: "place.grocery",
  pharmacy: "place.pharmacy",
  health: "place.health",
  school: "place.school",
  preschool: "place.preschool",
  park: "place.park",
  gym: "place.gym",
  eatery: "place.eatery",
};

/**
 * Pictograms on the 24 x 24 grid, stroked with currentColor, drawn centred on
 * (12, 12) like the transport ones. Each category has its own colour token
 * (--place-*), so the pins read apart from the transport colours.
 */
export const PLACE_PATHS: Record<PlaceCategory, string[]> = {
  // Basket with two handles.
  grocery: ["M4 10h16l-2 9H6z", "M8 10l3.5-5.5", "M16 10l-3.5-5.5", "M10 14v3", "M14 14v3"],
  // Cross inside a rounded square.
  pharmacy: ["M4 4h16v16H4z", "M12 8v8", "M8 12h8"],
  // Heart (medical care).
  health: ["M12 19.5s-7.5-4.6-7.5-10A4 4 0 0 1 12 7a4 4 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z"],
  // Graduation cap.
  school: ["M2.5 9.5L12 5l9.5 4.5L12 14z", "M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5", "M21.5 9.5V15"],
  // Smiling face (small children).
  preschool: ["M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 1 0 0-17z", "M8.5 10v.5", "M15.5 10v.5", "M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8"],
  // Tree on a trunk.
  park: ["M12 3l5.5 8H14l4 6H6l4-6H6.5z", "M12 17v4"],
  // Dumbbell.
  gym: ["M3 10v4", "M6 8v8", "M18 8v8", "M21 10v4", "M6 12h12"],
  // Fork and knife.
  eatery: ["M7 4v6.5a2 2 0 0 0 4 0V4", "M9 4v16", "M17 20V4c-2 1-3 3.5-3 7h3"],
};

/** The CSS class that carries a category's colour (see app.css, --place-* tokens). */
export const placeClass = (c: PlaceCategory) => `pin--place-${c}`;
