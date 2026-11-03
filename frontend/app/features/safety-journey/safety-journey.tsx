import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { LEVELS, safetyJourneyMock as data } from "@/features/safety-journey/safety-journey-mock.ts";
import { usePopup } from "@/features/popups/use-popup.ts";
import { cn } from "@/lib/utils";
import { Bell, ChevronDown, Flame, GraduationCap, Info, Lightbulb, NotebookPen, Star } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

/** Green, orange and red are reserved for exposure zones, so gamification only uses these */
const COLORS = {
	teal: "#0d9488",
	indigo: "#4f46e5",
	gold: "#ca8a04",
	plum: "#86198f",
	locked: "#a1a1aa",
};

const SHAPES = {
	hexagon: "M32 3 L57 17.5 V46.5 L32 61 L7 46.5 V17.5 Z",
	shield: "M32 3 L56 11 V30 C56 46 45 56 32 61 C19 56 8 46 8 30 V11 Z",
	rosette: `M${Array.from({ length: 24 }, (_, i) => {
		const r = i % 2 ? 26 : 30;
		const a = (i * Math.PI) / 12;
		return `${(32 + r * Math.sin(a)).toFixed(1)} ${(32 - r * Math.cos(a)).toFixed(1)}`;
	}).join(" L")} Z`,
};

const SYMBOLS = {
	eye: (c: string) => (
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
	shieldCheck: (c: string) => (
		<>
			<path d="M32 19 L43 23 V31 C43 38 38 43 32 45 C26 43 21 38 21 31 V23 Z" fill="white" />
			<polyline points="26.5,31.5 30.5,35.5 37.5,28" stroke={c} strokeWidth="3" fill="none" />
		</>
	),
	bulb: () => (
		<>
			<circle cx="32" cy="29" r="9" fill="white" />
			<rect x="28" y="37" width="8" height="6" rx="1.5" fill="white" />
		</>
	),
	calendar: (c: string) => (
		<>
			<rect x="20" y="22" width="24" height="21" rx="3" fill="white" />
			<line x1="20" y1="28" x2="44" y2="28" stroke={c} strokeWidth="2" />
			<polyline points="27,35 31,39 38,32" stroke={c} strokeWidth="2.5" fill="none" />
		</>
	),
	bolt: () => <polygon points="35,18 23,35 31,35 28,46 41,29 33,29" fill="white" />,
};

const badgeStyles = {
	sharpEye: { shape: "hexagon", color: COLORS.teal, symbol: "eye" },
	noiseDetective: { shape: "rosette", color: COLORS.indigo, symbol: "headphones" },
	preventer: { shape: "shield", color: COLORS.gold, symbol: "shieldCheck" },
	improvementMaker: { shape: "hexagon", color: COLORS.plum, symbol: "bulb" },
	consistentLogger: { shape: "rosette", color: COLORS.teal, symbol: "calendar" },
	quickResponder: { shape: "shield", color: COLORS.indigo, symbol: "bolt" },
} as const;

const eventTypes = {
	alert: { icon: Bell, color: COLORS.indigo },
	note: { icon: NotebookPen, color: COLORS.teal },
	suggestion: { icon: Lightbulb, color: COLORS.gold },
	challenge: { icon: GraduationCap, color: COLORS.plum },
};

type LockedBadge = Extract<(typeof data.badges)[number], { progress: number }>;

type BadgeEmblemProps = {
	shape: keyof typeof SHAPES;
	color: string;
	symbol: keyof typeof SYMBOLS;
	locked?: boolean;
	/** Full colour with a small lock mark, for the badge the user is working towards */
	lockMark?: boolean;
	className?: string;
};

function BadgeEmblem({ shape, color, symbol, locked, lockMark, className = "size-12" }: BadgeEmblemProps) {
	const gradientId = useId();
	const fill = locked ? COLORS.locked : color;

	return (
		<svg viewBox="0 0 64 64" className={className} aria-hidden>
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
					<path d="M28.5 32 V28.5 A3.5 3.5 0 0 1 35.5 28.5 V32" stroke="white" strokeWidth="2.5" fill="none" />
					<rect x="26" y="31" width="12" height="10" rx="2" fill="white" />
				</>
			) : (
				SYMBOLS[symbol](color)
			)}
			{lockMark && (
				<g transform="translate(46 46)">
					<circle r="9" fill="white" stroke={color} strokeWidth="1.5" />
					<path d="M-2.5 -0.5 V-3 A2.5 2.5 0 0 1 2.5 -3 V-0.5" stroke={color} strokeWidth="1.5" fill="none" />
					<rect x="-4" y="-1" width="8" height="6" rx="1.2" fill={color} />
				</g>
			)}
		</svg>
	);
}

export function SafetyJourney() {
	const { t } = useTranslation();
	const { visible, openPopup, closePopup } = usePopup();
	const level = LEVELS[data.levelIndex];
	const nextLevel = LEVELS[data.levelIndex + 1];
	// Locked badge with the highest progress ratio; ties keep the first in the list
	const nextBadge = data.badges
		.filter((badge): badge is LockedBadge => "progress" in badge)
		.reduce<LockedBadge | undefined>(
			(best, badge) => (!best || badge.progress / badge.target > best.progress / best.target ? badge : best),
			undefined,
		);
	const levelLabel = (index: number) =>
		`${t(($) => $.safetyJourney.level, { number: index + 1 })} · ${t(($) => $.safetyJourney.levels[LEVELS[index].key])}`;

	return (
		<>
			<button
				type="button"
				onClick={openPopup}
				aria-label={t(($) => $.safetyJourney.chipLabel, { points: data.points, days: data.streakDays })}
				className="flex cursor-pointer items-center gap-2 rounded-full border px-2.5 py-1 text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
			>
				<span className="flex items-center gap-1">
					<Star className="size-4" style={{ color: COLORS.gold }} aria-hidden />
					{data.points}
				</span>
				<span className="flex items-center gap-1">
					<Flame className="size-4" style={{ color: COLORS.plum }} aria-hidden />
					{data.streakDays}
				</span>
			</button>

			<Dialog open={visible} onOpenChange={closePopup}>
				<DialogContent className="max-h-[90vh] w-full max-w-lg gap-4 overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{t(($) => $.safetyJourney.title)}</DialogTitle>
					</DialogHeader>

					<section className="space-y-2">
						<div className="flex items-center justify-between gap-2">
							<div className="flex flex-wrap items-baseline gap-x-3">
								<Popover>
									<PopoverTrigger className="flex cursor-pointer items-center gap-1 rounded-sm text-lg font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
										{levelLabel(data.levelIndex)}
										<ChevronDown className="size-4" aria-hidden />
									</PopoverTrigger>
									<PopoverContent align="start" className="w-60 p-2">
										<ul className="text-sm">
											{LEVELS.map((l, i) => (
												<li
													key={l.key}
													className={cn(
														"flex justify-between rounded-sm px-2 py-1",
														i === data.levelIndex && "bg-accent font-medium",
													)}
												>
													<span>{levelLabel(i)}</span>
													<span className="text-muted-foreground">{l.minPoints}</span>
												</li>
											))}
										</ul>
									</PopoverContent>
								</Popover>
								<span className="font-medium" style={{ color: COLORS.gold }}>
									{t(($) => $.safetyJourney.points, { points: data.points })}
								</span>
							</div>

							<Tooltip>
								<TooltipTrigger asChild>
									<Badge variant="outline" tabIndex={0}>
										<Flame style={{ color: COLORS.plum }} aria-hidden />
										{t(($) => $.safetyJourney.streak, { days: data.streakDays })}
									</Badge>
								</TooltipTrigger>
								<TooltipContent>{t(($) => $.safetyJourney.streakExplanation)}</TooltipContent>
							</Tooltip>
						</div>
						<Progress
							value={((data.points - level.minPoints) / (nextLevel.minPoints - level.minPoints)) * 100}
							className="h-1.5 bg-muted [&>*]:bg-(--bar-color)"
							style={{ "--bar-color": COLORS.teal } as React.CSSProperties}
						/>
						<p className="text-sm text-muted-foreground">
							{t(($) => $.safetyJourney.pointsToNext, {
								points: nextLevel.minPoints - data.points,
								level: levelLabel(data.levelIndex + 1),
							})}
						</p>
					</section>

					{nextBadge && (
						<section className="flex items-center gap-4 rounded-lg border p-2">
							<BadgeEmblem {...badgeStyles[nextBadge.key]} lockMark className="size-20 shrink-0" />
							<div className="space-y-1.5">
								<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
									{t(($) => $.safetyJourney.nextStepTitle)}
								</p>
								<p className="font-semibold">{t(($) => $.safetyJourney.badges[nextBadge.key])}</p>
								<div className="flex gap-1.5" role="img" aria-label={`${nextBadge.progress}/${nextBadge.target}`}>
									{Array.from({ length: nextBadge.target }, (_, i) => (
										<span
											key={i}
											className="size-2.5 rounded-full bg-muted"
											style={
												i < nextBadge.progress ? { backgroundColor: badgeStyles[nextBadge.key].color } : undefined
											}
										/>
									))}
								</div>
								<p className="text-sm">
									{t(($) => $.safetyJourney.nextStep[nextBadge.key], {
										count: nextBadge.target - nextBadge.progress,
									})}
								</p>
							</div>
						</section>
					)}

					<section className="space-y-2">
						<h3 className="font-medium">{t(($) => $.safetyJourney.badgesTitle)}</h3>
						<div className="grid grid-cols-3 gap-1">
							{data.badges.map((badge) => (
								<Popover key={badge.key}>
									<PopoverTrigger
										aria-label={t(($) => $.safetyJourney.badges[badge.key])}
										className={cn(
											"flex cursor-pointer flex-col items-center gap-0.5 rounded-md p-1 text-center text-[11px] leading-tight hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
											!badge.unlocked && "text-muted-foreground",
										)}
									>
										<BadgeEmblem {...badgeStyles[badge.key]} locked={!badge.unlocked} className="size-11" />
										{t(($) => $.safetyJourney.badges[badge.key])}
									</PopoverTrigger>
									<PopoverContent className="w-60 space-y-1 text-sm">
										<p className="font-medium">{t(($) => $.safetyJourney.badges[badge.key])}</p>
										<p>{t(($) => $.safetyJourney.badgeInfo[badge.key])}</p>
										<p className="text-muted-foreground">
											{badge.unlocked ? t(($) => $.safetyJourney.earned) : `${badge.progress}/${badge.target}`}
										</p>
									</PopoverContent>
								</Popover>
							))}
						</div>
					</section>

					<section className="space-y-2">
						<h3 className="font-medium">{t(($) => $.safetyJourney.recentTitle)}</h3>
						<ul className="space-y-2 text-sm">
							{data.recentEvents.slice(0, 2).map((event) => {
								const { icon: Icon, color } = eventTypes[event.type];
								return (
									<li key={event.key} className="flex items-center gap-3">
										<span
											className="flex size-8 shrink-0 items-center justify-center rounded-full"
											style={{ backgroundColor: `${color}1f`, color }}
										>
											<Icon className="size-4" aria-hidden />
										</span>
										<div className="min-w-0 flex-1">
											<p>{t(($) => $.safetyJourney.events[event.key])}</p>
											<p className="text-xs text-muted-foreground">
												{t(($) => $.safetyJourney.days[event.day])}, {event.time}
											</p>
										</div>
										<span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
											+{event.points}
										</span>
									</li>
								);
							})}
						</ul>
					</section>

					<footer className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
						<Popover>
							<PopoverTrigger className="flex cursor-pointer items-center gap-1 text-sm text-primary hover:underline">
								<Info className="size-4" aria-hidden />
								{t(($) => $.safetyJourney.howToEarnTitle)}
							</PopoverTrigger>
							<PopoverContent align="start" className="w-80 text-sm">
								<ul className="space-y-1">
									{data.earnRules.map((rule) => (
										<li key={rule.key} className="flex justify-between gap-4">
											<span>{t(($) => $.safetyJourney.rules[rule.key])}</span>
											<span className="shrink-0 text-muted-foreground">
												+{rule.points} {t(($) => $.safetyJourney.maxPerDay, { max: rule.maxPerDay })}
											</span>
										</li>
									))}
								</ul>
							</PopoverContent>
						</Popover>
						<p>{t(($) => $.safetyJourney.onlyYou)}</p>
					</footer>
				</DialogContent>
			</Dialog>
		</>
	);
}
