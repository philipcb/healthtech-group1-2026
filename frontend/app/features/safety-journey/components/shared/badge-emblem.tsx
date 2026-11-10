import { COLORS } from "@/features/safety-journey/model/colors.ts";
import type { BadgeShape, BadgeStyle, BadgeSymbol } from "@/features/safety-journey/model/types.ts";
import { useId } from "react";

const SHAPES: Record<BadgeShape, string> = {
	hexagon: "M32 3 L57 17.5 V46.5 L32 61 L7 46.5 V17.5 Z",
	shield: "M32 3 L56 11 V30 C56 46 45 56 32 61 C19 56 8 46 8 30 V11 Z",
	rosette: `M${Array.from({ length: 24 }, (_, i) => {
		const r = i % 2 ? 26 : 30;
		const a = (i * Math.PI) / 12;
		return `${(32 + r * Math.sin(a)).toFixed(1)} ${(32 - r * Math.cos(a)).toFixed(1)}`;
	}).join(" L")} Z`,
};

const SYMBOLS: Record<BadgeSymbol, (color: string) => React.ReactNode> = {
	eye: (c) => (
		<>
			<path d="M18 32 C23 24 41 24 46 32 C41 40 23 40 18 32 Z" fill="white" />
			<circle cx="32" cy="32" r="5" fill={c} />
		</>
	),
	headphones: () => (
		<>
			<path d="M21 37 V32 A11 11 0 0 1 43 32 V37" stroke="white" strokeWidth="3" fill="none" />
			<rect x="18" y="34" width="7" height="10" rx="2" fill="white" />
			<rect x="39" y="34" width="7" height="10" rx="2" fill="white" />
		</>
	),
	shieldCheck: (c) => (
		<>
			<path d="M32 19 L43 23 V31 C43 38 38 43 32 45 C26 43 21 38 21 31 V23 Z" fill="white" />
			<polyline points="26.5,31.5 30.5,35.5 37.5,28" stroke={c} strokeWidth="3" fill="none" />
		</>
	),
	calendar: (c) => (
		<>
			<rect x="20" y="22" width="24" height="21" rx="3" fill="white" />
			<line x1="20" y1="28" x2="44" y2="28" stroke={c} strokeWidth="2" />
			<polyline points="27,35 31,39 38,32" stroke={c} strokeWidth="2.5" fill="none" />
		</>
	),
	bolt: () => <polygon points="35,18 23,35 31,35 28,46 41,29 33,29" fill="white" />,
	team: () => (
		<>
			<circle cx="26" cy="28" r="5" fill="white" />
			<circle cx="38" cy="28" r="5" fill="white" />
			<path d="M17 44 C17 37 35 37 35 44 Z" fill="white" />
			<path d="M29 44 C29 37 47 37 47 44 Z" fill="white" />
		</>
	),
};

type BadgeEmblemProps = BadgeStyle & {
	locked?: boolean;
	className?: string;
};

export function BadgeEmblem({ shape, color, symbol, locked = false, className = "size-12" }: BadgeEmblemProps) {
	const gradientId = useId();
	const fill = locked ? COLORS.locked : color;

	return (
		<svg viewBox="0 0 64 64" className={className} aria-hidden={true}>
			<defs>
				<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor={fill} stopOpacity={0.7} />
					<stop offset="1" stopColor={fill} />
				</linearGradient>
			</defs>
			<path d={SHAPES[shape]} fill={`url(#${gradientId})`} stroke={fill} strokeWidth="1.5" />
			<path
				d={SHAPES[shape]}
				fill="none"
				stroke="white"
				strokeOpacity={0.5}
				strokeWidth="1"
				transform="translate(32 32) scale(0.85) translate(-32 -32)"
			/>
			{locked ? (
				<>
					<path
						d="M28.5 32 V28.5 A3.5 3.5 0 0 1 35.5 28.5 V32"
						stroke="white"
						strokeWidth="2.5"
						fill="none"
					/>
					<rect x="26" y="31" width="12" height="10" rx="2" fill="white" />
				</>
			) : (
				SYMBOLS[symbol](color)
			)}
		</svg>
	);
}
