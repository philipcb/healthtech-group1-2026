/** Green, orange and red are reserved for exposure zones, so gamification only uses these */
export const COLORS = {
	teal: "#0d9488",
	indigo: "#4f46e5",
	gold: "#ca8a04",
	plum: "#86198f",
	locked: "#a1a1aa",
} as const;

/** A light tint of a colour for icon backgrounds, works on both light and dark backgrounds */
export const tint = (color: string) => `${color}1f`;
