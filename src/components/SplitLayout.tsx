"use client";

import { useState } from "react";

/**
 * Controls + list on one side, map on the other. On phones the map and the
 * list stack, with a toggle so either can take the screen.
 *
 * The header is 57px tall; on desktop the panel is pinned to the remaining
 * viewport so the list scrolls on its own and the map stays put.
 */
export function SplitLayout({
  controls,
  list,
  map,
}: {
  controls: React.ReactNode;
  list: React.ReactNode;
  map: React.ReactNode;
}) {
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col md:h-[calc(100vh-57px)] md:flex-none md:flex-row">
      <section
        className={`flex min-h-0 flex-col gap-3 p-4 md:w-[440px] md:shrink-0 md:overflow-y-auto ${
          mobileView === "map" ? "hidden md:flex" : ""
        }`}
      >
        {controls}
        {list}
      </section>
      <section
        className={`relative min-h-0 flex-1 ${mobileView === "list" ? "hidden md:block" : "block"} h-[calc(100dvh-108px)] md:h-auto`}
      >
        {map}
      </section>
      <button
        type="button"
        onClick={() => setMobileView((v) => (v === "list" ? "map" : "list"))}
        className="fixed bottom-6 left-1/2 z-[1050] -translate-x-1/2 rounded-full bg-navy px-5 py-2 text-sm font-semibold text-white shadow-lg md:hidden"
      >
        {mobileView === "list" ? "🗺️ Map" : "📋 List"}
      </button>
    </div>
  );
}
