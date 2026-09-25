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
	return (
		<Card
			className={cn(
				"relative w-full",
				props.variant === "compact" ? "pl-0" : "pr-0",
				breakoutOnMobile && MOBILE_BREAKOUT_CARD_CLASSNAME,
				className,
			)}
			id={id}
		>
			{headerRight && <div className="absolute top-2 right-2 z-10 flex items-center gap-2">{headerRight}</div>}
			<CardContent className={cn("flex h-full flex-1", contentClassName)}>
				<ExposureLineChart {...props} breakoutOnMobile={breakoutOnMobile} />
				{props.chartData.length === 0 && (
					<div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
						{t(($) => $.common.noDataLive)}
					</div>
				)}
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
