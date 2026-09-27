/**
 * /solve — dynamically imported to keep it out of the initial homepage
 * bundle. Heavy dependencies (SWR hooks for solvers + open intents,
 * registration form) only load when the user navigates here.
 */
import dynamic from "next/dynamic";
import { SkeletonCard } from "@/components/Skeleton";
import { Nav } from "@/components/Nav";
import { getTranslation } from "@/lib/i18n/server";

const SolvePageClient = dynamic(() => import("./SolvePageClient"), {
  loading: () => (
    <div className="min-h-screen">
      <Nav variant="breadcrumb" label={getTranslation().t("solve.nav.label")} />
      <main id="main-content" className="max-w-5xl mx-auto px-3 sm:px-5 py-8 sm:py-12">
        <div className="mb-8">
          <div className="h-3 w-28 bg-vx-surface/40 rounded animate-pulse mb-3" />
          <div className="h-8 w-56 bg-vx-surface/40 rounded animate-pulse mb-3" />
          <div className="h-4 w-72 bg-vx-surface/40 rounded animate-pulse" />
        </div>
        {/* How-it-works cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-4 sm:p-5 space-y-2 animate-pulse">
              <div className="h-3 w-8 bg-vx-surface/40 rounded" />
              <div className="h-4 w-3/4 bg-vx-surface/40 rounded" />
              <div className="h-3 w-full bg-vx-surface/40 rounded" />
            </div>
          ))}
        </div>
        {/* Tab bar skeleton */}
        <div className="flex gap-1 mb-6 bg-vx-surface/50 p-1 rounded-lg w-fit">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 w-24 bg-vx-surface/40 rounded-md animate-pulse" />
          ))}
        </div>
        <SkeletonCard rows={4} rowHeight="h-16" />
      </main>
    </div>
  ),
  ssr: false,
});

export default function SolvePage() {
  return <SolvePageClient />;
}
