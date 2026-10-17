import { useSearchParams } from "react-router-dom";

/** `?name=<item>` opens that item's details on arrival; `?tab=<id>` beside it
 * names the details tab to open on. */
export function useFocusName() {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusName = searchParams.get("name")?.trim() || null;
  const focusTab = focusName ? searchParams.get("tab") : null;

  const clearFocusName = () => {
    if (!focusName) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete("name");
    next.delete("tab");
    setSearchParams(next, { replace: true });
  };

  return { focusName, focusTab, clearFocusName };
}

export const focusLink = (path: string, name: string, tab?: string) =>
  `${path}?name=${encodeURIComponent(name)}${tab ? `&tab=${tab}` : ""}`;
