"use client";

import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { EmptyState } from "@/components/EmptyState";
import { SolverTimeline } from "@/components/SolverTimeline";
import { useSolver } from "@/hooks/useSolver";
import { useIntentFeed } from "@/hooks/useIntentFeed";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { timeAgo } from "@/lib/time";
import { isValidStellarPublicKey } from "@/lib/stellarAddress";
import { sanitizeDisplayText } from "@/lib/textSafety";

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export default function SolverDetailPage({ params }: { params: { address: string } }) {
  const { t } = useTranslation();
  const isValidAddress = isValidStellarPublicKey(params.address);
  const { solver, isLoading, error } = useSolver(isValidAddress ? params.address : null);
  const { items: fillHistory, isLoading: historyLoading, error: historyError } = useIntentFeed();

  return (
    <div className="min-h-screen">
      <Nav
        variant="breadcrumb"
        label={t("solverDetail.breadcrumb", { address: params.address.slice(0, 8) })}
      />

      <main
        id="main-content"
        className="max-w-3xl mx-auto px-3 sm:px-5 py-8 sm:py-12"
      >
        <Link
          href="/solve"
          tabIndex={-1}
          className="text-xs text-vx-sage hover:underline mb-6 inline-block focus:outline-none focus:ring-2 focus:ring-vx-sage focus:ring-offset-2 focus:ring-offset-vx-ink rounded"
        >
          {t("solverDetail.back")}
        </Link>

        {!isValidAddress ? (
          <EmptyState variant="error" message={t("solverDetail.invalidAddress")} />
        ) : isLoading ? (
          <div
            className="card p-6 sm:p-8 space-y-3 animate-pulse"
            data-testid="skeleton"
          >
            <div className="h-6 w-2/3 bg-vx-surface rounded animate-pulse" />
            <div className="h-4 w-1/3 bg-vx-surface rounded animate-pulse" />
          </div>
        ) : error ? (
          <EmptyState variant="error" message={t("solverDetail.loadError")} />
        ) : !solver ? (
          <EmptyState variant="error" message={t("solverDetail.notFound")} />
        ) : (
          <>
            {/* Header card */}
            <div className="card p-4 sm:p-6 space-y-4 sm:space-y-6 mb-6">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div>
                  <div className="eyebrow mb-1 sm:mb-2 text-xs">{t("solverDetail.eyebrow")}</div>
                  <h1 className="text-lg sm:text-2xl font-bold text-vx-text break-words">
                    {sanitizeDisplayText(solver.name)}
                  </h1>
                </div>
                <div
                  className={`flex-shrink-0 px-2 sm:px-3 py-1 rounded-lg text-xs font-semibold border whitespace-nowrap ${
                    solver.status === "active"
                      ? "bg-vx-sage-bg text-vx-sage border-vx-sage/30"
                      : "bg-vx-surface text-vx-muted border-vx-border"
                  }`}
                  aria-label={t("solverDetail.statusLabel", { status: t(solver.status === "active" ? "solverDetail.status.active" : "solverDetail.status.inactive") })}
                >
                  {t(solver.status === "active" ? "solverDetail.status.active" : "solverDetail.status.inactive")}
                </div>
              </div>

              <div className="text-xs sm:text-sm text-vx-muted font-mono break-all">
                {t("solverDetail.address", { address: params.address })}
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {[
                  { label: t("solverDetail.metric.fills"), value: solver.fills },
                  { label: t("solverDetail.metric.failed"), value: solver.failed },
                  { label: t("solverDetail.metric.successRate"), value: `${solver.successRatePct}%` },
                  {
                    label: t("solverDetail.metric.volume"),
                    value: usdCompact.format(solver.volumeUsd),
                  },
                  {
                    label: t("solverDetail.metric.avgFillTime"),
                    value: `${solver.avgFillTimeSeconds}s`,
                  },
                  { label: t("solverDetail.metric.bond"), value: usdCompact.format(solver.bondUsd) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-vx-surface/40 rounded-lg p-3">
                    <div className="eyebrow text-[10px] sm:text-xs mb-1">
                      {label}
                    </div>
                    <div className="num text-xs sm:text-sm font-semibold text-vx-text">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chain coverage */}
              <div className="pt-3 sm:pt-4 border-t border-vx-border">
                <h2 className="eyebrow text-xs mb-2">{t("solverDetail.chains.title")}</h2>
                <div className="flex flex-wrap gap-2">
                  {solver.chains.length > 0 ? (
                    solver.chains.map(chain => (
                      <span 
                        key={chain} 
                        className="text-xs px-2 py-1 bg-vx-surface rounded text-vx-text border border-vx-border"
                      >
                        {chain}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-vx-muted">
                      {t("solverDetail.chains.empty")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Solver Timeline ─────────────────────────────────────────── */}
            <div className="mb-6">
              <SolverTimeline
                solverAddress={solver.address}
                fills={fillHistory}
                isLoading={historyLoading && fillHistory.length === 0}
              />
            </div>

            {/* ── Fill history table ──────────────────────────────────────── */}
            <div className="card overflow-hidden">
              <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-vx-border bg-vx-surface/30">
                <h2 className="text-sm font-semibold text-vx-text">
                  {t("solverDetail.fillHistory.title")}
                </h2>
              </div>

              {historyLoading && fillHistory.length === 0 ? (
                <div className="p-4 sm:p-5 space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-16 bg-vx-surface/40 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : historyError ? (
                <div
                  role="alert"
                  className="p-6 sm:p-8 text-center text-sm text-vx-muted"
                >
                  {t("solverDetail.fillHistory.error")}
                </div>
              ) : fillHistory.filter(item => item.solver === solver.address).length === 0 ? (
                <div className="p-6 sm:p-8 text-center">
                  <p className="text-sm font-medium text-vx-text mb-1">
                    {t("solverDetail.fillHistory.empty.title")}
                  </p>
                  <p className="text-xs text-vx-muted max-w-xs mx-auto">
                    {t("solverDetail.fillHistory.empty.message")}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-vx-line">
                  {fillHistory
                    .filter((item) => item.solver === solver.address)
                    .slice(0, 10)
                    .map(fill => (
                      <div
                        key={fill.id}
                        className="px-4 sm:px-5 py-4 hover:bg-vx-surface/30 transition-colors"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-vx-text truncate">
                                {fill.srcAmount} {fill.srcToken} →{" "}
                                {fill.dstToken}
                              </div>
                              <div className="text-xs text-vx-muted capitalize">
                                {fill.srcChain}
                              </div>
                            </div>
                            <span className="text-xs text-vx-muted num flex-shrink-0">
                              {timeAgo(fill.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
