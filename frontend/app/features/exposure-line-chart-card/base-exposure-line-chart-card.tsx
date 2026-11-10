"use client";

import { Card, CardContent } from "@/components/ui/card.tsx";
import { MOBILE_BREAKOUT_CARD_CLASSNAME } from "@/lib/mobile-breakout.ts";
import { cn } from "@/lib/utils.ts";
import { useTranslation } from "react-i18next";
import {
	ExposureLineChart,
	type ExposureLineChartProps,
} from "../../components/exposure-line-chart/exposure-line-chart.tsx";
import { Skeleton } from "../../components/ui/skeleton.tsx";

export function BaseExposureLineChartCard({
	headerRight,
	contentClassName,
	className,
	id,
	breakoutOnMobile = false,
	...props
}: ExposureLineChartProps & {
	headerRight?: React.ReactNode;
	contentClassName?: string;
	className?: string;
	id?: string;
	// Opt-in: pdf-chart-renderer.tsx renders this in a fixed-width offscreen container, where a
	// 100vw breakout would misalign against the real viewport instead.
	breakoutOnMobile?: boolean;
}) {
	const { t } = useTranslation();

	// Without data there is nothing to draw, so one line says so instead of an empty chart's worth of space
	if (props.chartData.length === 0) {
		return (
			<p className="flex flex-wrap items-baseline gap-x-2 px-5 py-3 text-sm lg:px-3" id={id}>
				{/* Phones hide the value beside the chart, which otherwise names the dust fraction */}
				{props.title && <span className="font-medium lg:hidden">{props.title}</span>}
				<span className="text-muted-foreground">{t(($) => $.common.noDataLive)}</span>
			</p>
		);
	}

	return (
		<Card
			className={cn(
				"relative w-full",
				props.variant === "compact" ? "pl-0" : "pr-0",
				// The chart runs edge to edge on phones, and its figure keeps the page's gutter itself
				breakoutOnMobile && [MOBILE_BREAKOUT_CARD_CLASSNAME, "max-lg:px-0"],
				className,
			)}
			id={id}
		>
			{headerRight && <div className="absolute top-2 right-2 z-10 flex items-center gap-2">{headerRight}</div>}
			<CardContent className={cn("flex h-full flex-1", contentClassName)}>
				<ExposureLineChart {...props} breakoutOnMobile={breakoutOnMobile} />
			</CardContent>
		</Card>
	);
}

export function ExposureLineChartCardSkeleton() {
	return (
		<Card className="flex aspect-video w-full flex-col items-center gap-5">
			<Skeleton className="size-full" />
		</Card>
	);
}
