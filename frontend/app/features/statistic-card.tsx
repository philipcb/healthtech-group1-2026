import { Card, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { StatisticCardLayout } from "@/features/statistic-card-layout.tsx";
import { dangerlevelStyles, getDangerLevel } from "@/lib/danger-levels.ts";
import type { ExposureUnit } from "@/lib/exposures.ts";
import { formatExposureValue } from "@/lib/utils.ts";
import { useTranslation } from "react-i18next";

const formatValue = (value: number | null, unit: ExposureUnit) =>
	formatExposureValue(value ?? undefined, unit, 2, { mg: 3 });

type ExposureStatisticsSectionProps = {
	isLoading: boolean;
	isEmpty: boolean;
	averageValue: number | null;
	maxValue: number | null;
	maxTime: Date | null;
	latestValue: number | null;
	warningThreshold: number | null;
	dangerThreshold: number | null;
	unit: ExposureUnit;
	formatTime: (time: Date) => string;
};

export function ExposureStatisticsSection({
	isLoading,
	isEmpty,
	averageValue,
	maxValue,
	maxTime,
	latestValue,
	warningThreshold,
	dangerThreshold,
	unit,
	formatTime,
}: ExposureStatisticsSectionProps) {
	const { t } = useTranslation();

	if (isLoading) {
		return <ExposureStatisticsSkeleton />;
	}

	if (isEmpty) {
		return null;
	}

	const maxPointCaption = maxTime ? t(($) => $.measurement.recordedAt, { time: formatTime(maxTime) }) : undefined;

	return (
		// Mobile: one card per row. Desktop: grid-cols-3, matching main's pre-redesign layout.
		<div className="flex flex-col gap-3 md:grid md:grid-cols-3">
			{averageValue !== null && (
				<StatisticCard
					label={t(($) => $.measurement.average)}
					value={averageValue}
					unit={unit}
					warningThreshold={warningThreshold}
					dangerThreshold={dangerThreshold}
				/>
			)}
			{maxValue !== null && (
				<StatisticCard
					label={t(($) => $.measurement.maximum)}
					value={maxValue}
					unit={unit}
					recordedAt={maxPointCaption}
					warningThreshold={warningThreshold}
					dangerThreshold={dangerThreshold}
				/>
			)}
			{latestValue !== null && (
				<StatisticCard
					label={t(($) => $.measurement.latest)}
					value={latestValue}
					unit={unit}
					warningThreshold={warningThreshold}
					dangerThreshold={dangerThreshold}
				/>
			)}
		</div>
	);
}

export function ExposureGraphEmptyState({ date, locale }: { date: Date; locale: string }) {
	const { t } = useTranslation();

	return (
		<Card className="flex min-h-80 w-full items-center justify-center gap-1 text-center">
			<CardTitle className="font-medium text-muted-foreground text-sm">
				{date.toLocaleDateString(locale, {
					day: "numeric",
					month: "long",
					year: "numeric",
				})}
			</CardTitle>
			<p className="text-muted-foreground text-xs">{t(($) => $.common.noData)}</p>
		</Card>
	);
}

function ExposureStatisticsSkeleton() {
	return (
		<>
			<div className="flex flex-col gap-3 md:hidden">
				{["average", "maximum", "latest"].map((key) => (
					<Skeleton key={key} className="h-11 rounded-xl" />
				))}
			</div>

			<div className="hidden gap-3 md:grid md:grid-cols-3">
				{["average", "maximum", "latest"].map((key) => (
					<Card key={key} className="gap-2">
						<Skeleton className="h-3 w-20" />
						<Skeleton className="h-8 w-32" />
						<Skeleton className="h-3 w-24" />
					</Card>
				))}
			</div>
		</>
	);
}

type StatisticCardProps = {
	label: string;
	value: number;
	unit: ExposureUnit;
	warningThreshold: number | null;
	dangerThreshold: number | null;
	recordedAt?: string;
};

function StatisticCard({ label, value, unit, recordedAt, warningThreshold, dangerThreshold }: StatisticCardProps) {
	const { t } = useTranslation();

	const valueString = formatValue(value, unit);
	const limitValuePercentage = getLimitPercentage(value, dangerThreshold);

	const dangerLevel =
		warningThreshold !== null && dangerThreshold !== null
			? getDangerLevel(value, warningThreshold, dangerThreshold)
			: null;

	const color = dangerLevel ? dangerlevelStyles[dangerLevel].color : "var(--foreground)";

	const unitLabel = t(($) => $.exposures.units[unit]);

	return (
		<StatisticCardLayout
			label={label}
			value={
				<>
					{limitValuePercentage}
					{" % "}
					<span className="font-normal text-muted-foreground text-sm">
						{t(($) => $.measurement.ofTheLimitValue)}
					</span>
				</>
			}
			indicatorColor={color}
			caption={
				<>
					<p className="tabular-nums">
						{valueString} {unitLabel}
					</p>

					{recordedAt !== undefined && (
						<>
							<span aria-hidden={true} className="size-1 rounded-full bg-muted-foreground" />

							<div className="flex items-center gap-1">
								<p>{recordedAt}</p>
							</div>
						</>
					)}
				</>
			}
			collapsible={{
				summary: (
					<span className="shrink-0 font-medium text-sm tabular-nums">
						{valueString} {unitLabel}
					</span>
				),
				caption: recordedAt,
			}}
		/>
	);
}

function getLimitPercentage(value: number | null, dangerThreshold: number | null) {
	if (value == null || dangerThreshold == null || dangerThreshold <= 0) {
		return null;
	}

	return Math.round((value / dangerThreshold) * 100);
}
