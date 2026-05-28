import { useCallback, useEffect, useState } from "react";

const keyFor = (donorId: string) => `tissueqa.extraction.collapsed.${donorId}`;

type CollapsedMap = Record<string, boolean>; // group id -> collapsed?

function read(donorId: string): CollapsedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(keyFor(donorId));
    return raw ? (JSON.parse(raw) as CollapsedMap) : {};
  } catch {
    return {};
  }
}

function write(donorId: string, map: CollapsedMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(donorId), JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/**
 * Persistent collapsed state for extraction groups, keyed per donor.
 * Group IDs should be stable: e.g. `${docId}:${groupKey}`.
 */
export function useCollapsedGroups(donorId: string) {
  const [map, setMap] = useState<CollapsedMap>(() => read(donorId));

  useEffect(() => {
    setMap(read(donorId));
  }, [donorId]);

  const isCollapsed = useCallback(
    (id: string, defaultCollapsed: boolean) =>
      Object.prototype.hasOwnProperty.call(map, id) ? map[id] : defaultCollapsed,
    [map],
  );

  const toggle = useCallback(
    (id: string, defaultCollapsed: boolean) => {
      setMap((prev) => {
        const current = Object.prototype.hasOwnProperty.call(prev, id)
          ? prev[id]
          : defaultCollapsed;
        const next = { ...prev, [id]: !current };
        write(donorId, next);
        return next;
      });
    },
    [donorId],
  );

  const setAll = useCallback(
    (ids: string[], collapsed: boolean) => {
      setMap((prev) => {
        const next = { ...prev };
        ids.forEach((id) => (next[id] = collapsed));
        write(donorId, next);
        return next;
      });
    },
    [donorId],
  );

  return { isCollapsed, toggle, setAll };
}
