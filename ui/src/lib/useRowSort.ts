import { useState } from "react";
import { SortValue, sortRows } from "./sort";
import { SortOrder } from "./types";

/** The sort of a listing fetched whole: which field, which way, and the rows
 * in that order. Kept on the component, not the URL, since such a list can
 * open inside another's details. */
export function useRowSort<T extends { id: number }, F extends string>(
  values: Record<F, (row: T) => SortValue>,
  defaultSort: F,
  defaultOrder: SortOrder = "asc",
) {
  const [sort, setSort] = useState<F>(defaultSort);
  const [order, setOrder] = useState<SortOrder>(defaultOrder);

  return {
    sort,
    order,
    onChange: (nextSort: string, nextOrder: SortOrder) => {
      if (nextSort in values) {
        setSort(nextSort as F);
      }
      setOrder(nextOrder);
    },
    sorted: (rows: readonly T[]) => sortRows(rows, values[sort], order),
  };
}
