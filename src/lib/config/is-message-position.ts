import type { MessagePosition } from "../types";

/** Narrow an unknown value to one of the nine supported overlay anchors. */
export function isMessagePosition(value: unknown): value is MessagePosition {
  return (
    value === "upper" ||
    value === "center" ||
    value === "lower" ||
    value === "topleft" ||
    value === "topright" ||
    value === "middleleft" ||
    value === "middleright" ||
    value === "bottomleft" ||
    value === "bottomright"
  );
}
