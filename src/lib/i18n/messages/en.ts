// Source-of-truth message catalog. Keys are dot-namespaced by feature; values
// may contain {placeholder} tokens that are filled in at render time.
export const en = {
  "nav.branding": "Vortex",
  "nav.explore": "Explore",
  "nav.becomeSolver": "Become a Solver",
  "nav.docs": "Docs",
  "nav.myIntents": "My Intents",
  "nav.openMenu": "Open menu",
  "nav.closeMenu": "Close menu",

  "wallet.connect.cta": "Connect Freighter",
  "wallet.connect.connecting": "Connecting...",
  "wallet.connect.retry": "Retry Connection",
  "wallet.disconnect.cta": "Disconnect",
  "wallet.disconnect.aria": "Disconnect wallet {address}",
  "wallet.error.freighterUnavailable":
    "Freighter extension is not installed or enabled.",
  "wallet.error.connectFailed": "Failed to connect wallet.",

  "swap.chainPicker.title": "Select source chain",
  "swap.chainPicker.recent": "Recent",
  "swap.chainPicker.selectChain": "Select {name}",

  "activityFeed.empty": "No fills yet.",

  "swap.from.label": "From",
  "swap.from.amountLabel": "Amount to swap",
  "swap.from.amountPlaceholder": "0",
  "swap.from.selectChain": "Source chain, currently {name}",
  "swap.from.selectToken": "Select source token, currently {symbol}",
  "swap.from.approxValue": "≈ ${value}",

  "swap.prices.estimated": "est.",
  "swap.prices.asOf": "Estimated price as of {date}. Live quote will update this once available.",

  "swap.to.label": "To",
  "swap.to.tokenGroup": "Destination token",
  "swap.to.quoteLoading": "Loading quote…",

  "swap.slippage.label": "Slippage tolerance",
  "swap.slippage.inputLabel": "Slippage tolerance percent",
  "swap.slippage.minOut": "Min out: {amount} {token}",
  "swap.slippage.zeroWarning": "0% slippage may cause your swap to fail if the price moves at all.",

  "swap.quote.solver": "Best solver",
  "swap.quote.fillTime": "Est. fill time",
  "swap.quote.fillTimeValue": "~{seconds}s",
  "swap.quote.priceImpact": "Price impact",
  "swap.quote.priceImpactValue": "{percent}%",
  "swap.quote.priceImpactBelowMin": "<0.01",
  "swap.quote.protocolFee": "Protocol fee",
  "swap.quote.protocolFeeValue": "{percent}%",
  "swap.quote.rate": "Rate",

  "swap.quote.fillTime.tooltip": "Estimated time for a solver to fill your swap after you submit. Actual time may vary.",
  "swap.quote.priceImpact.tooltip": "How much your trade moves the effective price relative to the mid-market rate. A high impact means you receive less than the quoted mid-market rate.",
  "swap.quote.protocolFee.tooltip": "A small percentage fee charged by the Vortex protocol on each settled swap. It is deducted from the destination amount.",
  "swap.quote.unavailable": "Live quote unavailable — showing an estimated rate.",
  "swap.quote.noSolver": "No solver is available for this route right now.",
  "swap.quote.staleWarning": "Quote is stale. Please wait for a refresh before submitting.",
  "swap.quote.expiresIn": "Refreshes in {seconds}s",
  "swap.quote.expired": "Quote expired",
  "swap.quote.refreshCta": "Refresh quote",
  "swap.quote.highPriceImpactWarning": "High price impact above {threshold}% — review before swapping.",

  "swap.submit.connecting": "Connecting wallet…",
  "swap.submit.building": "Preparing swap…",
  "swap.submit.awaitingSignature": "Confirm in Freighter…",
  "swap.submit.submitting": "Submitting…",
  "swap.submit.findingRoute": "Finding best route…",
  "swap.submit.success": "Swap submitted ✓ — start a new swap",
  "swap.submit.enterAmount": "Enter an amount",
  "swap.submit.cta": "Swap {amount} {srcToken} → {dstToken}",
  "swap.submit.retryCta": "Retry: Swap {amount} {srcToken} → {dstToken}",

  "swap.destination.label": "Destination address",
  "swap.destination.placeholder": "G...",
  "swap.destination.invalidAddress": "Enter a valid Stellar address (starts with G).",
  "swap.destination.paste.prompt": "Address pasted from clipboard. Please confirm:",
  "swap.destination.paste.confirm": "Confirm",
  "swap.destination.paste.dismiss": "Dismiss",

  "swap.disclaimer": "Swap settles directly on Stellar · No wrapped tokens · Protected by solver bonds",

  "solve.nav.label": "Solve",

  "solve.hero.eyebrow": "Vortex Solver Dashboard",
  "solve.hero.title": "Register & compete to solve intents",
  "solve.hero.description": "Become a solver, post a bond, and earn fills by finding the best routes across chains.",
  "solve.steps.registerBond.number": "01",
  "solve.steps.registerBond.title": "Register + Bond",
  "solve.steps.registerBond.body": "Deposit ≥50 USDC as a bond into the Vortex settlement contract. Your bond backs your reliability — failing to fill after accepting slashes 10%.",
  "solve.steps.watchIntentFeed.number": "02",
  "solve.steps.watchIntentFeed.title": "Watch the intent feed",
  "solve.steps.watchIntentFeed.body": "Monitor the open intents API or WebSocket. When you see a profitable opportunity, claim exclusive fill rights for a 5-minute window.",
  "solve.steps.fillAndEarn.number": "03",
  "solve.steps.fillAndEarn.title": "Fill and earn",
  "solve.steps.fillAndEarn.body": "Execute the source-chain leg, relay to Stellar, transfer dst tokens to the user. Earn the spread between your fill cost and the user's minimum.",
  "solve.tabs.ariaLabel": "Solver portal sections",
  "solve.tabs.leaderboard": "leaderboard",
  "solve.tabs.intents": "intents",
  "solve.tabs.register": "register",

  "solve.register.states.connecting": "Connecting wallet…",
  "solve.register.states.building": "Building transaction…",
  "solve.register.states.submitting": "Submitting…",
  "solve.register.states.reviewing": "Review the transaction…",
  "solve.register.states.awaitingSignature": "Confirm in Freighter…",
  "solve.register.addressLabel": "Stellar Address",
  "solve.register.addressPlaceholder": "G...",
  "solve.register.bondLabel": "Bond Amount (USDC)",
  "solve.register.bondPlaceholder": "Minimum 50 USDC",
  "solve.register.info.minimumBond": "• Minimum bond: 50 USDC",
  "solve.register.validation.invalidAddress": "Enter a valid Stellar address (starts with G).",
  "solve.register.validation.minimumBond": "Minimum bond is {minBond} USDC.",
  "solve.onboarding.title": "Before You Register: Solver Readiness & Expectations",
  "solve.onboarding.description": "Review protocol requirements and public tracking metrics before registering as a Vortex solver.",
  "solve.onboarding.dismiss": "Dismiss checklist",
  "solve.onboarding.show": "Show onboarding checklist",
  "solve.onboarding.bondTitle": "1. Bond & Collateral Purpose",
  "solve.onboarding.bondBody": "Depositing a minimum 50 USDC bond backs your execution commitment. Failing to fulfill an accepted intent within 5 minutes results in a 10% bond slash. Your bond is withdrawable anytime when inactive.",
  "solve.onboarding.metricsTitle": "2. Public Performance Metrics",
  "solve.onboarding.metricsBody": "From the moment you register, your Stellar address is publicly listed on the solver leaderboard. Fill count, USD volume, success rate %, and average fill time in seconds are tracked transparently.",
  "solve.onboarding.expectationsTitle": "3. Operational Expectations",
  "solve.onboarding.expectationsBody": "Maintain high node uptime and competitive fill response times. Claiming an intent grants a 5-minute exclusive fill window to complete the cross-chain settlement.",

  "solve.register.title": "Register as a Solver",
  "solve.register.description": "To compete and earn fills, register your solver account on Stellar.",
  "solve.register.info.slash": "Minimum bond is 100 XLM — you can slash or withdraw it anytime.",
  "solve.register.info.withdraw": "Your solver bond earns you exclusive rights to solve intents.",
  "solve.register.button.registered": "Registered ✓",
  "solve.register.button.connect": "Connect to Register",

  "solve.leaderboard.title": "Active Solvers",
  "solve.leaderboard.error": "Failed to load leaderboard.",
  "solve.leaderboard.empty": "No active solvers yet.",
  "solve.leaderboard.volume": "Volume",
  "solve.leaderboard.fills": "Fills",
  "solve.leaderboard.success": "Success %",
  "solve.leaderboard.avgTime": "Avg Time",

  "solve.intents.title": "Open Intents",
  "solve.intents.error": "Failed to load intents.",
  "solve.intents.empty": "No open intents at the moment.",
  "solve.intents.accepting": "Accepting fill…",
  "solve.intents.accept": "Accept Intent",
  "solve.intents.available": "{count} available",
  "solve.intents.id": "ID: {id}",
  "solve.intents.details": "Min out: {minOut} {dstToken} · Expires in {timeRemaining}",

  "home.hero.eyebrow": "Stellar Agentic Hackathon 2025",
  // The headline is split so the second line can keep its accent colour and the
  // line break. Translations may reorder the two lines' content freely.
  "home.hero.titleLine1": "Swap from any chain",
  "home.hero.titleLine2": "directly to Stellar.",
  "home.hero.body":
    "Vortex is an intent-based cross-chain protocol. Express what you want, and competing solvers race to fill it — no bridges, no wrapped assets, no trust assumptions beyond the solver bond.",
  "home.hero.solverCta": "Become a solver →",

  "home.stats.totalVolume": "Total Volume",
  "home.stats.intentsFilled": "Intents Filled",
  "home.stats.activeSolvers": "Active Solvers",
  "home.stats.avgFillTime": "Avg Fill Time",

  "home.pipeline.title": "How it works",
  "home.pipeline.intent.label": "Intent",
  "home.pipeline.intent.sub": "You submit",
  "home.pipeline.auction.label": "Auction",
  "home.pipeline.auction.sub": "Solvers bid",
  "home.pipeline.relay.label": "Relay",
  "home.pipeline.relay.sub": "Best fills",
  "home.pipeline.settle.label": "Settle",
  "home.pipeline.settle.sub": "On Stellar",

  "home.feed.title": "Live Fills",
  "home.feed.viewAll": "View all →",

  "home.chains.title": "Supported chains",
  "home.chains.stellarDestination": "Stellar (dest.)",

  "footer.copyright": "© 2025 Vortex Protocol · MIT License",
  "footer.github": "GitHub",
  "footer.discord": "Discord",

  "notFound.breadcrumb": "Not Found",
  "notFound.eyebrow": "404",
  "notFound.title": "Page not found",
  "notFound.body":
    "The page you're looking for doesn't exist, or may have moved.",
  "notFound.backHome": "← Back to Vortex",

  // ── Empty states ──────────────────────────────────────────────────────────

  // /explore — filters match nothing
  "explore.empty.title": "No intents match your filters",
  "explore.empty.message": "Try adjusting or clearing your status and chain filters to see more results.",
  "explore.empty.clearFilters": "Clear filters",

  // /explore — error loading
  "explore.error.title": "Couldn't load intents",
  "explore.error.message": "Something went wrong fetching intents. Check your connection and try again.",

  // /my-intents — wallet connected but no intents yet
  "myIntents.empty.title": "No swaps yet",
  "myIntents.empty.message": "You haven't submitted any swaps from this wallet. Make your first swap to get started.",
  "myIntents.empty.cta": "Make your first swap →",

  // /my-intents — filter combination matches nothing
  "myIntents.filterEmpty.title": "No intents match your filters",
  "myIntents.filterEmpty.message": "Try a different status or chain filter, or clear all filters to see everything.",
  "myIntents.filterEmpty.clearFilters": "Clear filters",

  // ActivityFeed — empty on a fresh/quiet deployment
  "activityFeed.empty.title": "No activity yet",
  "activityFeed.empty.message": "Waiting for the first swap intents to arrive. Submit a swap to kick things off.",
  "activityFeed.empty.cta": "Swap now →",

  "activityFeed.status.live": "Live",
  "activityFeed.status.polling": "Polling",
  "activityFeed.error.unavailable": "Live feed unavailable right now.",
  "activityFeed.item.route": "{chain} · via {solver}",

  // solve/[address] — fill history empty
  "solverDetail.fillHistory.empty.title": "No fills yet",
  "solverDetail.fillHistory.empty.message": "Once this solver starts accepting and filling intents, their history will appear here.",
} as const;
