"use client";

import { useState } from "react";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { Footer } from "@/components/Footer";
import { IntentStatusBadge } from "@/components/IntentStatusBadge";
import { Nav } from "@/components/Nav";
import { SkeletonDetailCard } from "@/components/Skeleton";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useIntent } from "@/hooks/useIntent";
import { timeAgo } from "@/lib/time";
import { truncateAddress } from "@/lib/stellarAddress";
import { sanitizeDisplayText } from "@/lib/textSafety";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { MessageKey, Translator } from "@/lib/i18n";
import { config } from "@/lib/config";
import type { IntentStatus } from "@/lib/types";

const NETWORK = config.network;

const STATUS_LABEL_KEY: Record<IntentStatus, MessageKey> = {
  pending: "intent.status.pending",
  accepted: "intent.status.accepted",
  filled: "intent.status.filled",
  failed: "intent.status.failed",
};

// This screen shows 6-and-6 truncation for full-width identifiers.
const truncate = (value: string) => truncateAddress(value, { prefix: 6, suffix: 6 });

function deadlineLabel(deadline: string, t: Translator) {
  const msRemaining = new Date(deadline).getTime() - Date.now();
  if (msRemaining <= 0) return t("intentDetail.deadline.expired");
  const minutes = Math.floor(msRemaining / 60_000);
  const seconds = Math.floor((msRemaining % 60_000) / 1000);
  return minutes > 0
    ? t("intentDetail.deadline.minutes", { minutes, seconds })
    : t("intentDetail.deadline.seconds", { seconds });
}

export default function IntentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { t } = useTranslation();
  const { intent, isLoading, error } = useIntent(params.id);
  const { copy } = useCopyToClipboard();
  const [txHashCopied, setTxHashCopied] = useState(false);

  const isSettled = intent?.status === "filled";

  return (
    <div className="min-h-screen">
      <Nav variant="breadcrumb" label={t("intentDetail.breadcrumb", { id: params.id.slice(0, 8) })} />

      <main id="main-content" className="max-w-3xl mx-auto px-5 py-12">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href="/explore" className="text-xs text-vx-sage hover:underline print:hidden">
            {t("intentDetail.back")}
          </Link>
          {intent && (
            <button
              type="button"
              onClick={() => window.print()}
              className="print:hidden text-xs px-3 py-1.5 rounded-lg border border-vx-border text-vx-muted
                         hover:text-vx-text hover:border-vx-sage/40 transition-colors"
            >
              {t("intentDetail.print")}
            </button>
          )}
        </div>

        {isLoading ? (
          <SkeletonDetailCard />
        ) : error ? (
          <div className="card p-8 text-center text-sm text-vx-muted">
            {t("intentDetail.error")}
          </div>
        ) : !intent ? (
          <div className="card p-8 text-center text-sm text-vx-muted">
            {t("intentDetail.empty")}
          </div>
        ) : (
          <div id="intent-record" className="card p-6 space-y-6 print:border print:border-black/20 print:shadow-none">
            {/* Print-only header - the on-screen Nav/Footer are stripped when printing. */}
            <div className="hidden print:block border-b border-black/20 pb-3">
              <div className="text-sm font-semibold">{t("intentDetail.print.title")}</div>
              <div className="text-xs text-black/60">
                {t("intentDetail.print.subtitle", { id: params.id, date: new Date().toLocaleString() })}
              </div>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="eyebrow mb-2">{t("intentDetail.eyebrow")}</div>
                <h1 className="text-2xl font-bold text-vx-text num">
                  {intent.srcAmount} {intent.srcToken} → {intent.dstAmount}{" "}
                  {intent.dstToken}
                </h1>
              </div>
              <IntentStatusBadge status={intent.status} />
            </div>

            {!isSettled && (
              <p
                role="note"
                className="text-xs rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-amber-300
                           print:border-black/40 print:bg-transparent print:text-black"
              >
                {t("intentDetail.notSettled", { status: t(STATUS_LABEL_KEY[intent.status]) })}
              </p>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {([
                ["intentDetail.field.srcChain", intent.srcChain],
                ["intentDetail.field.solver", sanitizeDisplayText(intent.solver)],
                ["intentDetail.field.minOut", `${intent.minOut} ${intent.dstToken}`],
                ["intentDetail.field.submitted", `${new Date(intent.createdAt).toLocaleString()} (${timeAgo(intent.createdAt)})`],
                ["intentDetail.field.deadline", deadlineLabel(intent.deadline, t)],
              ] as [MessageKey, string][]).map(([k, v]) => (
                <div key={k} className="bg-vx-surface/40 rounded-lg p-3">
                  <div className="eyebrow mb-1">{t(k)}</div>
                  <div className="text-sm text-vx-text num capitalize">{v}</div>
                </div>
              ))}
              <div className="bg-vx-surface/40 rounded-lg p-3">
                <div className="eyebrow mb-1">{t("intentDetail.field.dstAddress")}</div>
                <div className="flex items-center gap-2 text-sm text-vx-text num">
                  <span className="truncate">
                    {truncateAddress(intent.dstAddress)}
                  </span>
                  <CopyButton
                    value={intent.dstAddress}
                    label={t("intentDetail.copyDestination")}
                  />
                </div>
              </div>
            </div>

            {intent.txHash && (
              <div className="pt-2 border-t border-vx-line">
                <div className="eyebrow mb-1">{t("intentDetail.settlementTx")}</div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-vx-muted num">{truncate(intent.txHash)}</span>
                  <button
                    onClick={async () => {
                      const txHash = intent.txHash;
                      if (!txHash) return;
                      const didCopy = await copy(txHash);
                      setTxHashCopied(didCopy);
                      if (didCopy) {
                        window.setTimeout(() => setTxHashCopied(false), 1200);
                      }
                    }}
                    className="text-xs text-vx-sage hover:underline"
                  >
                    {txHashCopied ? t("intentDetail.copied") : t("intentDetail.copy")}
                  </button>
                  <a
                    href={`https://stellar.expert/explorer/${NETWORK}/tx/${intent.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-vx-sage hover:underline print:hidden"
                  >
                    {t("intentDetail.viewOnExplorer")}
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
