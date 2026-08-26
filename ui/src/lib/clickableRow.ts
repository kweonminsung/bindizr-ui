import { KeyboardEvent } from "react";

/** A bare `onClick` on a `<tr>` is unreachable without a mouse. */
export function clickableRowProps(onActivate: () => void) {
  return {
    onClick: onActivate,
    onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
      // Preventing the default here would cancel a nested button's activation.
      if (event.target !== event.currentTarget) {
        return;
      }
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
