import { useSearchParams } from "react-router-dom";

/** `?name=<item>` opens that item's details on arrival. */
export function useFocusName() {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusName = searchParams.get("name")?.trim() || null;

  const clearFocusName = () => {
    if (!focusName) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete("name");
    setSearchParams(next, { replace: true });
  };

  return { focusName, clearFocusName };
}

export const focusLink = (path: string, name: string) =>
  `${path}?name=${encodeURIComponent(name)}`;
