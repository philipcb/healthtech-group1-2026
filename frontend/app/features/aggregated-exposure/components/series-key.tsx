import { getMarkerPath, getSeriesColor, type SeriesSlot } from "@/features/aggregated-exposure/model/series.ts";

export function SeriesMarker({ slot, x, y, size }: { slot: SeriesSlot; x: number; y: number; size?: number }) {
	return (
		<path d={getMarkerPath(slot, x, y, size)} fill={getSeriesColor(slot)} stroke="var(--card)" strokeWidth={1.5} />
	);
}

export function SeriesKey({ slot, width = 22 }: { slot: SeriesSlot; width?: number }) {
	return (
		<svg aria-hidden="true" width={width} height={12} className="shrink-0 overflow-visible">
			<line x1={0} x2={width} y1={6} y2={6} stroke={getSeriesColor(slot)} strokeWidth={2} />
			<SeriesMarker slot={slot} x={width / 2} y={6} />
		</svg>
	);
}
