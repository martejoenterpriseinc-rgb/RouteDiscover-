"use client";

import dynamic from "next/dynamic";
import type { MapViewProps } from "./MapView";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#e9eef5] text-sm text-muted">
      Loading map…
    </div>
  ),
});

export function Map(props: MapViewProps) {
  return <MapView {...props} />;
}
