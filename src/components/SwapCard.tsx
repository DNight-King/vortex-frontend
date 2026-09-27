"use client";

import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useQuote } from "@/hooks/useQuote";
import { useSwapSubmission } from "@/hooks/useSwapSubmission";
import { useRecentChains } from "@/hooks/useRecentChains";
import { useToastStore } from "@/store/toast";
import { CHAINS, DST_TOKENS, PRICES_AS_OF, SRC_TOKENS } from "@/lib/marketData";
import { isValidStellarPublicKey } from "@/lib/stellarAddress";
import { formatTokenAmount } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { MessageKey } from "@/lib/i18n";
import type { Quote, QuoteRequest } from "@/lib/types";

export const DEFAULT_SLIPPAGE_PCT = 0.5;
export const HIGH_PRICE_IMPACT_THRESHOLD_PCT = 3;
// A quote older than this is considered stale and must refresh before submit.
export const STALE_QUOTE_THRESHOLD_MS = 30_000;

// How long the "quote changed" delta indicator stays on screen after a refresh.
const QUOTE_DELTA_TTL_MS = 4000;

const SUBMISSION_LABEL_KEY: Record<string, MessageKey> = {
  connecting: "swap.submit.connecting",
  building: "swap.submit.building",
  "awaiting-signature": "swap.submit.awaitingSignature",
  submitting: "swap.submit.submitting",
};

// Small ▲/▼ indicator shown briefly next to a quote field when a fresh quote
// moved it relative to the previous same-route quote (#297). Green when the
// change favours the user, amber when it works against them.
function QuoteDelta({
  value,
  betterWhenHigher,
  format,
  label,
}: {
  value: number;
  betterWhenHigher: boolean;
  format: (n: number) => string;
  label: string;
}) {
  const { t } = useTranslation();
  if (value === 0) return null;
  const isUp = value > 0;
  const isGood = betterWhenHigher ? isUp : !isUp;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold animate-fade-up ${
        isGood ? "text-vx-sage" : "text-amber-400"
      }`}
    >
      <span aria-hidden="true">{isUp ? "▲" : "▼"}</span>
      <span aria-hidden="true">{format(Math.abs(value))}</span>
      <span className="sr-only">
        {t(isGood ? "swap.quote.delta.improved" : "swap.quote.delta.worsened", {
          label,
          amount: format(Math.abs(value)),
        })}
      </span>
    </span>
  );
}

export type SwapCardProps = {
  initialAmount?: string;
  /** Pre-select the source chain (must be a valid CHAINS id; falls back to "ethereum"). */
  initialChain?: string;
  /** Pre-select the source token symbol on the given chain (falls back to that chain's first token). */
  initialSrcToken?: string;
  /** Pre-select the destination token symbol (must be in DST_TOKENS; falls back to the first). */
  initialDstToken?: string;
  previewQuote?: Quote;
  onPreviewSubmit?: (request: QuoteRequest) => void;
};

export function SwapCard({ initialAmount = "", previewQuote, onPreviewSubmit }: SwapCardProps = {}) {
  const { t } = useTranslation();

  const [srcChain, setSrcChain] = useState("ethereum");
  const [srcToken, setSrcToken] = useState(SRC_TOKENS["ethereum"]![0]!);
  const [dstToken, setDstToken] = useState(DST_TOKENS[0]!);
  const [srcAmount, setSrcAmount] = useState(initialAmount);
  const [dstAddress, setDstAddress] = useState("");
  const [slippagePct, setSlippagePct] = useState(String(DEFAULT_SLIPPAGE_PCT));
  const [showChainPicker, setShowChainPicker] = useState(false);
  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const [pastedAddress, setPastedAddress] = useState<string | null>(null);
  const [showPasteConfirmation, setShowPasteConfirmation] = useState(false);
  const { recentChains, addRecentChain } = useRecentChains();

  const chainToggleRef = useRef<HTMLButtonElement>(null);
  const chainPickerRef = useRef<HTMLDivElement>(null);
  const tokenToggleRef = useRef<HTMLButtonElement>(null);
  const tokenPickerRef = useRef<HTMLDivElement>(null);
  const dstAddressInputRef = useRef<HTMLInputElement>(null);

  const chain = CHAINS.find(c => c.id === srcChain) ?? CHAINS[0]!;

  // ── Chain picker helpers ───────────────────────────────────────────────────
  const closeChainPicker = () => {
    setShowChainPicker(false);
    chainToggleRef.current?.focus();
  };

  const handleChainPickerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeChainPicker();
      return;
    }

    if (e.key !== "Tab") return;

    const focusable = chainPickerRef.current?.querySelectorAll<HTMLButtonElement>("button");
    if (!focusable || focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };

  const handleSelectChain = (chainId: string) => {
    setSrcChain(chainId);
    const nextToken = SRC_TOKENS[chainId]?.[0];
    if (nextToken) setSrcToken(nextToken);
    addRecentChain(chainId); // #284 – record recency
    closeChainPicker();
  };

  // ── Token picker helpers ───────────────────────────────────────────────────
  const closeTokenPicker = () => {
    setShowTokenPicker(false);
    tokenToggleRef.current?.focus();
  };

  const handleTokenPickerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeTokenPicker();
      return;
    }
    if (e.key !== "Tab") return;
    const focusable = tokenPickerRef.current?.querySelectorAll<HTMLButtonElement>("button");
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };

  useEffect(() => {
    if (showChainPicker) {
      chainPickerRef.current
        ?.querySelector<HTMLButtonElement>("button")
        ?.focus();
    }
  }, [showChainPicker]);

  const debouncedAmount = useDebouncedValue(srcAmount, 500);
  const hasAmount = Boolean(debouncedAmount) && parseFloat(debouncedAmount) > 0;
  const {
    quote: fetchedQuote,
    isLoading: quoteIsLoading,
    error: quoteError,
    quoteErrorType,
    quoteFetchedAt,
    refresh: refreshQuote,
  } = useQuote(
    hasAmount && !previewQuote
      ? {
          srcChain,
          srcToken: srcToken.symbol,
          srcAmount: debouncedAmount,
          dstToken: dstToken.symbol,
        }
      : null,
  );

  const quote = previewQuote ?? fetchedQuote;
  const quoting = previewQuote ? false : quoteIsLoading;

  // Re-render once a second so the stale-quote countdown/expiry stays accurate,
  // but stop ticking while the tab is hidden to avoid wasted work in the background.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!quoteFetchedAt || previewQuote) return;
    const tick = () => setNow(Date.now());
    const interval = setInterval(() => {
      if (!document.hidden) tick();
    }, 1000);
    const onVisibilityChange = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [quoteFetchedAt, previewQuote]);

  const quoteAgeMs = quoteFetchedAt ? now - quoteFetchedAt : 0;
  const quoteIsStale = !previewQuote && Boolean(quoteFetchedAt) && quoteAgeMs >= STALE_QUOTE_THRESHOLD_MS;
  const quoteExpiresInSeconds = quoteFetchedAt
    ? Math.max(0, Math.ceil((STALE_QUOTE_THRESHOLD_MS - quoteAgeMs) / 1000))
    : null;

  // === "Quote changed" delta indicator (#297)
  // Compare each fresh quote to the immediately-previous one for the *same
  // route* (chain + token pair). A different route is a new quote entirely, not
  // a delta; the very first quote for a route has nothing to compare against.
  const routeKey = `${srcChain}|${srcToken.symbol}|${dstToken.symbol}`;
  const prevQuoteRef = useRef<{ routeKey: string; quote: Quote } | null>(null);
  const [quoteDelta, setQuoteDelta] = useState<{ dstAmount: number; priceImpactPct: number } | null>(null);

  useEffect(() => {
    const prev = prevQuoteRef.current;

    // No quote (initial, or cleared while a new route's quote loads), or the
    // route changed: drop any comparison history so the next quote for this
    // route counts as a first quote, not a delta.
    if (!quote || (prev && prev.routeKey !== routeKey)) {
      prevQuoteRef.current = quote ? { routeKey, quote } : null;
      setQuoteDelta(null);
      return;
    }

    prevQuoteRef.current = { routeKey, quote };
    if (!prev || prev.quote === quote) return;

    const delta = {
      dstAmount: parseFloat(quote.dstAmount) - parseFloat(prev.quote.dstAmount),
      priceImpactPct: quote.priceImpactPct - prev.quote.priceImpactPct,
    };
    if (delta.dstAmount === 0 && delta.priceImpactPct === 0) return;

    setQuoteDelta(delta);
    const timer = setTimeout(() => setQuoteDelta(null), QUOTE_DELTA_TTL_MS);
    return () => clearTimeout(timer);
  }, [quote, routeKey]);

  const dstAddressError = dstAddress && !isValidStellarPublicKey(dstAddress) ? t("swap.destination.invalidAddress") : null;

  // ── Derived display values ─────────────────────────────────────────────────
  const dstAmount = quote
    ? parseFloat(quote.dstAmount)
    : srcAmount
      ? (parseFloat(srcAmount) * srcToken.priceUsd) / dstToken.priceUsd * 0.998
      : 0;

  const srcValueUSD = srcAmount ? parseFloat(srcAmount) * srcToken.priceUsd : 0;
  const parsedSlippagePct = Math.max(0, Math.min(50, parseFloat(slippagePct) || 0));
  const minOut = dstAmount > 0 ? (dstAmount * (1 - parsedSlippagePct / 100)).toFixed(dstToken.symbol === "XLM" ? 2 : 4) : "0";
  const hasHighPriceImpact = quote ? quote.priceImpactPct > HIGH_PRICE_IMPACT_THRESHOLD_PCT : false;
  // #285 – badge the USD value as an estimate while it comes from static prices.
  const showPriceEstimateNotice = !quote && srcValueUSD > 0;

  // ── Submission ─────────────────────────────────────────────────────────────
  const submission = useSwapSubmission();
  const isSubmitting = submission.status in SUBMISSION_LABEL_KEY;
  const canSwap =
    Boolean(srcAmount) &&
    parseFloat(srcAmount) > 0 &&
    !quoting &&
    !isSubmitting &&
    !dstAddressError &&
    !quoteIsStale;

  function truncateToDecimals(value: string, decimals: number): string {
    const dotIndex = value.indexOf(".");
    if (dotIndex === -1 || decimals === 0) return (value.split(".")[0] ?? "");
    return value.slice(0, dotIndex + 1 + decimals);
  }

  const handleAmountChange = (raw: string) => {
    // The field is `type="text"` (a `type="number"` input silently reformats
    // high-precision decimals) so keep only digits and a single dot here.
    const cleaned = raw.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
    setSrcAmount(truncateToDecimals(cleaned, srcToken.decimals));
  };

  const handleAddressPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").trim();
    if (pasted) {
      e.preventDefault();
      setPastedAddress(pasted);
      setShowPasteConfirmation(true);
    }
  };

  const confirmPastedAddress = () => {
    if (pastedAddress) {
      setDstAddress(pastedAddress);
    }
    setShowPasteConfirmation(false);
    setPastedAddress(null);
  };

  const dismissPasteConfirmation = () => {
    setShowPasteConfirmation(false);
    setPastedAddress(null);
  };

  const handleSubmit = () => {
    if (onPreviewSubmit) {
      onPreviewSubmit({
        srcChain,
        srcToken: srcToken.symbol,
        srcAmount,
        dstToken: dstToken.symbol,
      });
      return;
    }

    if (submission.status === "success") {
      submission.reset();
      setSrcAmount("");
      return;
    }

    if (quoteIsStale) {
      useToastStore.getState().addToast(t("swap.quote.staleWarning"), "error");
      return;
    }

    submission.submit({
      srcChain,
      srcToken: srcToken.symbol,
      srcAmount,
      dstToken: dstToken.symbol,
      minOut,
    });
  };

  const hiddenTabIndex = showChainPicker ? -1 : undefined;

  return (
    <div className="relative">
      {showChainPicker && (
        <div
          ref={chainPickerRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("swap.chainPicker.title")}
          onKeyDown={handleChainPickerKeyDown}
          className="absolute top-0 left-0 right-0 z-20 bg-vx-card border border-vx-border rounded-xl p-3 shadow-2xl animate-fade-up"
        >
          <div className="eyebrow mb-3 px-1">{t("swap.chainPicker.title")}</div>

          {/* ── #284 Recent chains quick-select row ── */}
          {recentChains.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] text-vx-muted/70 uppercase tracking-wide px-1 mb-1.5">
                {t("swap.chainPicker.recent")}
              </div>
              <div className="flex gap-2 flex-wrap">
                {recentChains.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectChain(c.id)}
                    aria-label={t("swap.chainPicker.selectChain", { name: c.name })}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                      ${srcChain === c.id
                        ? "border-vx-sage/40 bg-vx-sage-bg text-vx-sage"
                        : "border-vx-border text-vx-muted hover:text-vx-text bg-vx-surface/50"
                      }`}
                  >
                    <span
                      aria-hidden="true"
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="mt-3 border-t border-vx-border/50" />
            </div>
          )}

          {/* Full grid (always visible) */}
          <div className="grid grid-cols-2 gap-2">
            {CHAINS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectChain(c.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all ${
                  srcChain === c.id
                    ? "border-vx-sage/40 bg-vx-sage-bg text-vx-sage"
                    : "border-vx-border hover:border-vx-border text-vx-muted hover:text-vx-text bg-vx-surface/50"
                }`}
              >
                <span aria-hidden="true" className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-sm font-medium">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div aria-hidden={showChainPicker} className={`card p-5 space-y-2 ${showChainPicker ? "opacity-0 pointer-events-none" : ""}`}>
        <div className="bg-vx-surface/50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="eyebrow">{t("swap.from.label")}</span>
            <button
              ref={chainToggleRef}
              type="button"
              onClick={() => setShowChainPicker(true)}
              aria-haspopup="dialog"
              aria-expanded={showChainPicker}
              aria-label={t("swap.from.selectChain", { name: chain.name })}
              className="chain-badge cursor-pointer hover:bg-vx-lav/15 transition-colors"
            >
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: chain.color }}
              />
              {chain.name}
              <svg aria-hidden="true" className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="src-amount" className="sr-only">
              {t("swap.from.amountLabel")}
            </label>
            <input
              id="src-amount"
              type="text"
              inputMode="decimal"
              value={srcAmount}
              onChange={e => handleAmountChange(e.target.value)}
              placeholder={t("swap.from.amountPlaceholder")}
              className="input-swap flex-1"
            />
            {/* ── Token picker toggle ── */}
            <button
              ref={tokenToggleRef}
              type="button"
              className="token-btn"
              onClick={() => setShowTokenPicker(prev => !prev)}
              aria-haspopup="listbox"
              aria-expanded={showTokenPicker}
              aria-label={t("swap.from.selectToken", {
                symbol: srcToken.symbol,
              })}
            >
              <span
                aria-hidden="true"
                className="w-6 h-6 rounded-full bg-vx-lav/20 flex items-center justify-center text-xs font-bold text-vx-lav"
              >
                {srcToken.symbol[0]}
              </span>
              <span className="font-semibold text-sm text-vx-text">{srcToken.symbol}</span>
              <svg
                aria-hidden="true"
                className="w-3.5 h-3.5 text-vx-muted"
                viewBox="0 0 14 14"
                fill="none"
              >
                <path
                  d="M3.5 5.25L7 8.75L10.5 5.25"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* ── Token picker inline overlay ── */}
          {showTokenPicker && (
            <div
              ref={tokenPickerRef}
              role="listbox"
              aria-label={t("swap.from.selectToken", { symbol: srcToken.symbol })}
              onKeyDown={handleTokenPickerKeyDown}
              className="pt-2 border-t border-vx-line space-y-1"
            >
              {(SRC_TOKENS[srcChain] ?? []).map(token => (
                <button
                  key={token.symbol}
                  type="button"
                  tabIndex={hiddenTabIndex}
                  onClick={() => {
                    setSrcToken(token);
                    setShowTokenPicker(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    token.symbol === srcToken.symbol ? "bg-vx-lav-bg text-vx-lav" : "hover:bg-vx-surface text-vx-muted hover:text-vx-text"
                  }`}
                >
                  <span className="font-medium">{token.symbol}</span>
                  <span className="num text-xs">${token.priceUsd.toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}

          {srcValueUSD > 0 && (
            <div className="num text-xs text-vx-muted">
              {t("swap.from.approxValue", {
                value: srcValueUSD.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                }),
              })}
              {/* #285 – show "estimated" badge when showing a price-derived value (no live quote yet) */}
              {showPriceEstimateNotice && (
                <span
                  title={t("swap.prices.asOf", { date: PRICES_AS_OF })}
                  className="inline-flex items-center px-1 py-0.5 rounded text-[10px] leading-none bg-vx-surface border border-vx-border text-vx-muted/80 cursor-default"
                >
                  {t("swap.prices.estimated")}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <div
            aria-hidden="true"
            className="w-8 h-8 rounded-full bg-vx-surface border border-vx-border flex items-center justify-center z-10"
          >
            <svg className="w-4 h-4 text-vx-sage" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3v10M5 10l3 3 3-3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <div className="bg-vx-surface/50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="eyebrow">{t("swap.to.label")}</span>
            <span className="stellar-badge">
              <svg
                aria-hidden="true"
                className="w-2.5 h-2.5"
                viewBox="0 0 10 10"
                fill="currentColor"
              >
                <circle cx="5" cy="5" r="2" />
              </svg>
              Stellar
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              {quoting ? (
                <div className="h-9 flex items-center">
                  <div
                    aria-hidden="true"
                    className="w-24 h-6 bg-vx-surface rounded animate-pulse"
                  />
                  <span className="sr-only">{t("swap.to.quoteLoading")}</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-light text-vx-text num">
                    {dstAmount > 0
                      ? formatTokenAmount(dstAmount, undefined, {
                          maximumFractionDigits: dstToken.symbol === "XLM" ? 2 : 4,
                        })
                      : "0"}
                  </div>
                  {quoteDelta && (
                    <QuoteDelta
                      value={quoteDelta.dstAmount}
                      betterWhenHigher
                      label={t("swap.to.label")}
                      format={(n) =>
                        formatTokenAmount(n, undefined, {
                          maximumFractionDigits: dstToken.symbol === "XLM" ? 2 : 4,
                        })
                      }
                    />
                  )}
                </div>
              )}
            </div>
            <div
              role="group"
              aria-label={t("swap.to.tokenGroup")}
              className="flex gap-2"
            >
              {DST_TOKENS.map((token) => (
                <button
                  key={token.symbol}
                  type="button"
                  onClick={() => setDstToken(token)}
                  aria-pressed={dstToken.symbol === token.symbol}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    dstToken.symbol === token.symbol ? "bg-vx-sage-bg text-vx-sage border-vx-sage/30" : "border-vx-border text-vx-muted hover:text-vx-text"
                  }`}
                >
                  {token.symbol}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-vx-surface/50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="eyebrow">{t("swap.slippage.label")}</span>
            <span className="num text-[10px] text-vx-muted">{t("swap.slippage.minOut", { amount: minOut, token: dstToken.symbol })}</span>
          </div>
          <label htmlFor="slippage-pct" className="sr-only">{t("swap.slippage.inputLabel")}</label>
          <input
            id="slippage-pct"
            type="number"
            min="0"
            max="50"
            step="0.1"
            value={slippagePct}
            onChange={e => setSlippagePct(e.target.value)}
            className="w-full bg-vx-surface border border-vx-border rounded-lg px-3 py-2.5 text-sm text-vx-text placeholder-vx-dim/60 focus:outline-none focus:border-vx-sage/50 transition-colors"
          />
        </div>

        <div className="bg-vx-surface/50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="eyebrow">{t("swap.destination.label")}</span>
          </div>
          <label htmlFor="dst-address" className="sr-only">
            {t("swap.destination.label")}
          </label>
          <input
            ref={dstAddressInputRef}
            id="dst-address"
            type="text"
            tabIndex={hiddenTabIndex}
            value={dstAddress}
            onChange={e => setDstAddress(e.target.value.trim())}
            onPaste={handleAddressPaste}
            placeholder={t("swap.destination.placeholder")}
            aria-invalid={Boolean(dstAddressError)}
            aria-describedby={dstAddressError ? "dst-address-error" : undefined}
            className="w-full bg-vx-surface border border-vx-border rounded-lg px-3 py-2.5 text-sm text-vx-text placeholder-vx-dim/60 focus:outline-none focus:border-vx-sage/50 transition-colors"
          />
          {showPasteConfirmation && pastedAddress && (
            <div className="mt-2 p-3 bg-amber-500/10 border border-amber-400/30 rounded-lg space-y-2">
              <p className="text-xs text-amber-400/90">{t("swap.destination.paste.prompt")}</p>
              <p className="text-xs font-mono text-vx-text break-all bg-vx-surface/50 p-2 rounded">
                {pastedAddress.slice(0, 16)}...{pastedAddress.slice(-16)}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirmPastedAddress}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-medium transition-colors"
                >
                  {t("swap.destination.paste.confirm")}
                </button>
                <button
                  type="button"
                  onClick={dismissPasteConfirmation}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-vx-border hover:border-vx-sage/40 text-vx-muted hover:text-vx-text text-xs font-medium transition-colors"
                >
                  {t("swap.destination.paste.dismiss")}
                </button>
              </div>
            </div>
          )}
          {dstAddressError && !showPasteConfirmation && (
            <p id="dst-address-error" role="alert" className="text-[11px] text-red-400">{dstAddressError}</p>
          )}
        </div>

        {quote && srcAmount && (
          <div
            className={`rounded-xl p-3.5 space-y-2.5 animate-fade-up border ${
              hasHighPriceImpact ? "bg-amber-500/10 border-amber-400/30" : "bg-vx-surface/40 border-transparent"
            }`}
          >
            {([
              ["swap.quote.solver", quote.solver],
              ["swap.quote.fillTime", t("swap.quote.fillTimeValue", { seconds: quote.fillTimeSeconds })],
              ["swap.quote.priceImpact", t("swap.quote.priceImpactValue", { percent: quote.priceImpactPct < 0.01 ? t("swap.quote.priceImpactBelowMin") : quote.priceImpactPct.toFixed(2) })],
              ["swap.quote.protocolFee", t("swap.quote.protocolFeeValue", { percent: quote.protocolFeePct.toFixed(2) })],
              ["swap.quote.rate", quote.rate],
            ] as const).map(([labelKey, value]) => (
              <div key={labelKey} className="flex items-center justify-between">
                <span className="text-xs text-vx-muted">{t(labelKey)}</span>
                <span className={`num text-xs font-medium ${labelKey === "swap.quote.priceImpact" && hasHighPriceImpact ? "text-amber-300" : "text-vx-text"}`}>
                  {value}
                </span>
              </div>
            ))}
            {hasHighPriceImpact && (
              <p role="alert" className="text-xs text-amber-300">
                {t("swap.quote.highPriceImpactWarning", { threshold: HIGH_PRICE_IMPACT_THRESHOLD_PCT })}
              </p>
            )}
            {quoteFetchedAt && !quoteIsStale && quoteExpiresInSeconds !== null && quoteExpiresInSeconds <= 5 && (
              <p role="status" className="text-xs text-amber-300">
                {t("swap.quote.expiresIn", { seconds: quoteExpiresInSeconds })}
              </p>
            )}
            {quoteIsStale && (
              <div className="flex items-center justify-between gap-2">
                <p role="alert" className="text-xs text-amber-300">{t("swap.quote.expired")}</p>
                <button
                  type="button"
                  onClick={() => refreshQuote()}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-vx-sage/30 bg-vx-sage-bg text-vx-sage hover:bg-vx-sage/15 transition-colors"
                >
                  {t("swap.quote.refreshCta")}
                </button>
              </div>
            )}
          </div>
        )}

        {quoteError && hasAmount && !quoting && (
          <p role="status" className="text-center text-[11px] text-amber-400/90 px-1">
            {quoteErrorType?.kind === "no-solver" ? t("swap.quote.noSolver") : t("swap.quote.unavailable")}
          </p>
        )}

        {submission.status === "error" && (
          <p role="alert" className="text-center text-[11px] text-red-400 px-1">
            {submission.error}
          </p>
        )}

        <button
          type="button"
          className="btn-swap"
          disabled={!canSwap && submission.status !== "success"}
          aria-busy={isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                aria-hidden="true"
                className="w-4 h-4 animate-spin-slow"
                viewBox="0 0 16 16"
                fill="none"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="28"
                  strokeDashoffset="8"
                />
              </svg>
              {t(SUBMISSION_LABEL_KEY[submission.status] ?? "swap.submit.submitting")}
            </span>
          ) : submission.status === "success" ? (
            t("swap.submit.success")
          ) : quoting ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                aria-hidden="true"
                className="w-4 h-4 animate-spin-slow"
                viewBox="0 0 16 16"
                fill="none"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="28"
                  strokeDashoffset="8"
                />
              </svg>
              {t("swap.submit.findingRoute")}
            </span>
          ) : canSwap ? (
            t(submission.status === "error" ? "swap.submit.retryCta" : "swap.submit.cta", {
              amount: srcAmount,
              srcToken: srcToken.symbol,
              dstToken: dstToken.symbol,
            })
          ) : (
            t("swap.submit.enterAmount")
          )}
        </button>

        <p className="text-center text-[11px] text-vx-muted/70">{t("swap.disclaimer")}</p>
      </div>

      {/* Mobile sticky action bar — only visible below md breakpoint */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-30
                   bg-vx-card/95 backdrop-blur-sm
                   border-t border-vx-border
                   px-4 pt-3 pb-safe"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        aria-hidden={showChainPicker}
      >
        <button
          type="button"
          tabIndex={showChainPicker ? -1 : undefined}
          className="btn-swap"
          disabled={!canSwap && submission.status !== "success"}
          aria-busy={isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                aria-hidden="true"
                className="w-4 h-4 animate-spin-slow"
                viewBox="0 0 16 16"
                fill="none"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="28"
                  strokeDashoffset="8"
                />
              </svg>
              {t(SUBMISSION_LABEL_KEY[submission.status]!)}
            </span>
          ) : submission.status === "success" ? (
            t("swap.submit.success")
          ) : quoting ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                aria-hidden="true"
                className="w-4 h-4 animate-spin-slow"
                viewBox="0 0 16 16"
                fill="none"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="28"
                  strokeDashoffset="8"
                />
              </svg>
              {t("swap.submit.findingRoute")}
            </span>
          ) : quoteIsStale ? (
            t("swap.quote.expired")
          ) : canSwap ? (
            t(
              submission.status === "error"
                ? "swap.submit.retryCta"
                : "swap.submit.cta",
              {
                amount: srcAmount,
                srcToken: srcToken.symbol,
                dstToken: dstToken.symbol,
              },
            )
          ) : (
            t("swap.submit.enterAmount")
          )}
        </button>
      </div>
    </div>
  );
}
