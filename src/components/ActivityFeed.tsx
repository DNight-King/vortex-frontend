"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useIntentFeed } from "@/hooks/useIntentFeed";
import { useLiveRelativeTime } from "@/hooks/useLiveRelativeTime";
import { timeAgo } from "@/lib/time";
import { useTranslation } from "@/lib/i18n/I18nProvider";

const CHAIN_COLOR: Record<string, string> = {
  ethereum: "#627EEA",
  base: "#0052FF",
  polygon: "#8247E5",
  arbitrum: "#12AAFF",
  optimism: "#FF0420",
  avalanche: "#E84142",
};

/** Maximum number of activity items shown in the feed. */
const FEED_LIMIT = 6;

/** Rapid arrivals within this window are announced together ("3 new fills"). */
const ANNOUNCE_DELAY_MS = 1500;

type ActivityFeedViewProps = ReturnType<typeof useIntentFeed>;

export function ActivityFeedView({ items, isLoading, error, isLive }: ActivityFeedViewProps) {
  const { t } = useTranslation();
  const now = useLiveRelativeTime();

  // ── Screen-reader announcement ────────────────────────────────────────────
  // We track how many items were present on the *previous* render so we can
  // detect new arrivals.  The initial snapshot must never trigger an
  // announcement — we only announce incremental additions after mount.
  const prevCountRef = useRef<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const pendingNewRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Skip the first render (initial snapshot).
    if (prevCountRef.current === null) {
      prevCountRef.current = items.length;
      return;
    }

    const delta = items.length - prevCountRef.current;
    prevCountRef.current = items.length;

    if (delta <= 0) return;

    // Accumulate across rapid arrivals; reset the debounce window each time.
    pendingNewRef.current += delta;
    if (timerRef.current !== null) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const count = pendingNewRef.current;
      pendingNewRef.current = 0;
      setAnnouncement(count === 1 ? "1 new fill" : `${count} new fills`);
    }, ANNOUNCE_DELAY_MS);
  }, [items.length]);

  // Cleanup timer on unmount.
  useEffect(() => () => { if (timerRef.current !== null) clearTimeout(timerRef.current); }, []);

  // ── Visible items ─────────────────────────────────────────────────────────
  const visibleItems = useMemo(() => items.slice(0, FEED_LIMIT), [items]);

  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[52px] bg-vx-surface/40 rounded-lg border border-vx-line animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] text-vx-muted px-1">
        <span aria-hidden="true" className={`state-dot ${isLive ? "bg-vx-sage" : "bg-vx-dim"}`} />
        {isLive ? t("activityFeed.status.live") : t("activityFeed.status.polling")}
      </div>

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Error / empty states */}
      {error && items.length === 0 ? (
        <div className="p-4 text-center text-xs text-vx-muted bg-vx-surface/40 rounded-lg border border-vx-line">
          {t("activityFeed.error.unavailable")}
        </div>
      ) : items.length === 0 ? (
        <div className="p-4 text-center text-xs text-vx-muted bg-vx-surface/40 rounded-lg border border-vx-line">
          {t("activityFeed.empty")}
        </div>
      ) : null}

      {/* Feed rows */}
      {visibleItems.map((item) => {
        const color = CHAIN_COLOR[item.srcChain] ?? "#8B8B93";
        return (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 bg-vx-surface/40 rounded-lg
                       border border-vx-line hover:border-vx-border transition-colors"
          >
            <div
              aria-hidden="true"
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}20`, border: `1px solid ${color}30` }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-vx-text truncate">
                {item.srcAmount} {item.srcToken} → {item.dstToken}
              </div>
              <div className="text-[10px] text-vx-muted capitalize">
                {t("activityFeed.item.route", { chain: item.srcChain, solver: item.solver })}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span aria-hidden="true" className="state-dot bg-vx-sage" />
              <span
                className="text-[10px] text-vx-muted"
                title={new Date(item.createdAt).toLocaleString()}
              >
                {timeAgo(item.createdAt, now)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The live fills feed, wired to the intent feed hook. */
export function ActivityFeed() {
  return <ActivityFeedView {...useIntentFeed()} />;
}
