let canvasContext: CanvasRenderingContext2D | null | undefined;

/**
 * Mapbox draws on a canvas and can't read CSS variables or `oklch()`, which the theme's colors use. This resolves a CSS
 * color, such as `var(--danger)`, to the `rgba()` the browser paints it as, so the map matches the rest of the app.
 * Resolved on each call, so it follows the current light or dark theme.
 */
export function toMapColor(cssColor: string): string {
	const variable = /^var\((--[\w-]+)\)$/.exec(cssColor.trim())?.[1];
	const value = variable ? getComputedStyle(document.documentElement).getPropertyValue(variable).trim() : cssColor;

	canvasContext ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });

	if (!(canvasContext && value)) {
		return "rgba(255, 255, 255, 1)";
	}

	canvasContext.clearRect(0, 0, 1, 1);
	canvasContext.fillStyle = value;
	canvasContext.fillRect(0, 0, 1, 1);
	const [red, green, blue, alpha] = canvasContext.getImageData(0, 0, 1, 1).data;

	return `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;
}

function parseRgba(color: string): [number, number, number, number] {
	const [red = 0, green = 0, blue = 0, alpha = 1] = (color.match(/[\d.]+/g) ?? []).map(Number);
	return [red, green, blue, alpha];
}

/** Mixes two colors from `toMapColor`, `amount` of the way from `color` to `other` */
export function mixMapColors(color: string, other: string, amount: number): string {
	const from = parseRgba(color);
	const to = parseRgba(other);
	const [red, green, blue] = from
		.slice(0, 3)
		.map((channel, index) => Math.round(channel + (to[index] - channel) * amount));

	return `rgba(${red}, ${green}, ${blue}, ${from[3]})`;
}
