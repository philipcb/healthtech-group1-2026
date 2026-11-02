export type SeriesSlot = number;

const SERIES_COLOR_COUNT = 4;
const seriesMarkers = ["circle", "square", "triangle", "diamond"] as const;

export function getSeriesColor(slot: SeriesSlot) {
	return `var(--series-${(slot % SERIES_COLOR_COUNT) + 1})`;
}

// Shifted by one each round of colors, so the first 16 groups each get their own color and marker
function getSeriesMarker(slot: SeriesSlot) {
	return seriesMarkers[(slot + Math.floor(slot / SERIES_COLOR_COUNT)) % seriesMarkers.length];
}

const MARKER_SIZE = 8;

export function getMarkerPath(slot: SeriesSlot, x: number, y: number, size = MARKER_SIZE) {
	const r = size / 2;

	switch (getSeriesMarker(slot)) {
		case "square":
			return `M${x - r * 0.85},${y - r * 0.85}h${r * 1.7}v${r * 1.7}h${-r * 1.7}Z`;
		case "triangle":
			return `M${x},${y - r * 1.1}L${x + r},${y + r * 0.75}L${x - r},${y + r * 0.75}Z`;
		case "diamond":
			return `M${x},${y - r * 1.15}L${x + r * 1.05},${y}L${x},${y + r * 1.15}L${x - r * 1.05},${y}Z`;
		default:
			return `M${x - r},${y}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 ${-r * 2},0`;
	}
}

export function getFreeSlot(used: Array<{ slot: SeriesSlot }>): SeriesSlot {
	let slot = 0;
	while (used.some((series) => series.slot === slot)) {
		slot++;
	}
	return slot;
}
