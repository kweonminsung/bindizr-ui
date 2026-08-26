import { KeyboardEvent } from "react";

/**
 * Makes a table row open its details by pointer or keyboard alike. A bare
 * `onClick` on a `<tr>` is unreachable without a mouse.
 */
export function clickableRowProps(onActivate: () => void) {
  return {
    onClick: onActivate,
    onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        // Space would otherwise scroll the page.
        event.preventDefault();
        onActivate();
      }
    },
    tabIndex: 0,
    className:
      "cursor-pointer transition-colors hover:bg-gray-50 focus-visible:bg-gray-100",
  };
}
