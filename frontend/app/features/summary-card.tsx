import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useDate } from "@/features/date-picker/use-date.ts";
import { useUser } from "@/features/user/user-context.tsx";
import { useView } from "@/features/views/use-view.ts";
import type { View } from "@/lib/views.ts";
import { getLocale } from "@/i18n/locale.ts";
import { exposureOverviewQueryOptions, exposureQueryOptions } from "@/lib/api.ts";
import { type Aggregation, Aggregations } from "@/lib/dto/exposure.ts";
import { buildExposureOverviewQuery, buildExposureQuery } from "@/lib/exposure-query-utils.ts";
import { defaultDustField, type Exposure, exposures, parseAsDustField } from "@/lib/exposures.ts";
import { calculateSummaryCounts } from "@/lib/time-bucket-utils.ts";
import { cn } from "@/lib/utils.ts";
import type { TZDate } from "@date-fns/tz";
import { useQueries } from "@tanstack/react-query";
import { formatDuration, hoursToMinutes, type Locale, minutesToHours } from "date-fns";
import { InfoIcon } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useTranslation } from "react-i18next";

type ExposureType = Exposure | "all";

interface ExposureSummaryProps {
	exposureType: ExposureType;
	selectedDate?: TZDate;
	selectedView?: View;
}

export function ExposureSummary({ exposureType, selectedDate, selectedView }: ExposureSummaryProps) {
	const { t, i18n } = useTranslation();
	const { view: contextView } = useView();
	const { date: contextDate } = useDate();
	const view = selectedView ?? contextView;
	const currentDate = selectedDate ?? contextDate;
	const { user } = useUser();
	const locale = getLocale(i18n.language);

	const parseAsAggregation = parseAsStringLiteral(Aggregations);
	const [aggregation] = useQueryState<Aggregation>("aggregation", parseAsAggregation.withDefault("average"));
	const [dustField] = useQueryState("dustField", parseAsDustField.withDefault(defaultDustField));

	const peakAggregation = aggregation === "peak";

	const exposure = exposureType === "all" ? null : (exposureType as Exposure);

	// Because vibration data is cumulative and has few data points, we never fetch it with minute granularity
	// TODO: When we take vibration disconnectedOn into account we could fetch it with minute granularity for the day
	// view as well
	const granularity = exposure === "vibration" ? "hour" : "minute";

	const exposureQuery =
		exposure &&
		buildExposureQuery(exposure, view, currentDate, {
			usePeakAggregation: peakAggregation,
			granularity,
			field: exposure === "dust" ? dustField : undefined,
		});
	const exposureQueryEnabled = exposure !== null && exposureQuery !== null;

	const [exposureResponse, allExposuresResponse] = useQueries({
		queries: [
			exposureQueryOptions({
				exposure: exposure as NonNullable<typeof exposure>,
				query: exposureQuery as NonNullable<typeof exposureQuery>,
				enabled: exposureQueryEnabled,
				userId: user.id,
			}),
			exposureOverviewQueryOptions({
				query: buildExposureOverviewQuery([...exposures], view, currentDate, {
					usePeakAggregation: peakAggregation,
					granularity,
				}),
				userId: user.id,
				enabled: !exposureQueryEnabled,
			}),
		],
	});

	const response = exposure === null ? allExposuresResponse : exposureResponse;

	const data = response.data
		? calculateSummaryCounts(response.data.data, {
				exposure,
				peakAggregation,
				granularity,
			})
		: null;

	if (data === null) {
		return <SummaryCardSkeleton />;
	}

	const safeLabel = t(($) => $.exposureSummary.aggregated.safe);
	const warningLabel = t(($) => $.exposureSummary.aggregated.warning);
	const dangerLabel = t(($) => $.exposureSummary.aggregated.danger);

	const actionValueLabel = t(($) => $.limitExplanation.actionValue.label);
	const actionValueDescription = t(($) => $.limitExplanation.actionValue.description);
	const limitValueLabel = t(($) => $.limitExplanation.limitValue.label);
	const limitValueDescription = t(($) => $.limitExplanation.limitValue.description);
	const viewDetailsLabel = t(($) => $.interactiveCard.viewDetails);

	const safeDuration = formatMinutesAsDuration(data.safeMinutes, locale);
	const warningDuration = formatMinutesAsDuration(data.warningMinutes, locale);
	const dangerDuration = formatMinutesAsDuration(data.dangerMinutes, locale);

	return (
		// Mobile: stacked bars. Desktop: plain grid-cols-3 boxes matching main.
		<div className="flex flex-col gap-3 md:grid md:grid-cols-3">
			<p
				title={`${safeLabel}: ${safeDuration}`}
				className={cn(
					"flex min-w-0 items-center justify-between gap-2 rounded-lg px-3 py-2 md:hidden",
					data.safeMinutes > 0 ? "bg-safe-subtle text-safe-text" : "bg-secondary text-muted-foreground",
				)}
			>
				<span className="text-xs">{safeLabel}</span>
				<span className="font-medium text-sm tabular-nums">{safeDuration}</span>
			</p>
			<p
				title={`${safeLabel}: ${safeDuration}`}
				className={cn(
					"hidden flex-col rounded-lg px-2 py-1 md:flex",
					data.safeMinutes > 0 ? "bg-safe-subtle text-safe-text" : "bg-secondary text-muted-foreground",
				)}
			>
				<span className="text-xs">{safeLabel}</span>
				<span className="font-medium text-sm tabular-nums">{safeDuration}</span>
			</p>

			<p
				title={`${warningLabel}: ${warningDuration}`}
				className={cn(
					"flex min-w-0 items-center justify-between gap-2 rounded-lg px-3 py-2 md:hidden",
					data.warningMinutes > 0
						? "bg-warning-subtle text-warning-text"
						: "bg-secondary text-muted-foreground",
				)}
			>
				<span className="flex min-w-0 items-center gap-1">
					<span className="text-xs">{warningLabel}</span>
					<Popover>
						<PopoverTrigger asChild={true}>
							<button
								type="button"
								aria-label={`${warningLabel}: ${viewDetailsLabel}`}
								className="-m-1 rounded p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100"
							>
								<InfoIcon className="size-3.5" />
							</button>
						</PopoverTrigger>
						<PopoverContent align="start" className="w-64 text-sm">
							<p className="font-medium">{actionValueLabel}</p>
							<p className="text-muted-foreground text-xs">{actionValueDescription}</p>
						</PopoverContent>
					</Popover>
				</span>
				<span className="font-medium text-sm tabular-nums">{warningDuration}</span>
			</p>
			<p
				title={`${warningLabel}: ${warningDuration}`}
				className={cn(
					"hidden flex-col rounded-lg px-2 py-1 md:flex",
					data.warningMinutes > 0
						? "bg-warning-subtle text-warning-text"
						: "bg-secondary text-muted-foreground",
				)}
			>
				<span className="flex items-center gap-1 text-xs">
					{warningLabel}
					{/* Tablet only: LimitExplanation in the sidebar covers this from lg, see exposure-layout.tsx. */}
					<Popover>
						<PopoverTrigger asChild={true}>
							<button
								type="button"
								aria-label={`${warningLabel}: ${viewDetailsLabel}`}
								className="-m-1 rounded p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 lg:hidden"
							>
								<InfoIcon className="size-3.5" />
							</button>
						</PopoverTrigger>
						<PopoverContent align="start" className="w-64 text-sm">
							<p className="font-medium">{actionValueLabel}</p>
							<p className="text-muted-foreground text-xs">{actionValueDescription}</p>
						</PopoverContent>
					</Popover>
				</span>
				<span className="font-medium text-sm tabular-nums">{warningDuration}</span>
			</p>

			<p
				title={`${dangerLabel}: ${dangerDuration}`}
				className={cn(
					"flex min-w-0 items-center justify-between gap-2 rounded-lg px-3 py-2 md:hidden",
					data.dangerMinutes > 0 ? "bg-danger-subtle text-danger-text" : "bg-secondary text-muted-foreground",
				)}
			>
				<span className="flex min-w-0 items-center gap-1">
					<span className="text-xs">{dangerLabel}</span>
					<Popover>
						<PopoverTrigger asChild={true}>
							<button
								type="button"
								aria-label={`${dangerLabel}: ${viewDetailsLabel}`}
								className="-m-1 rounded p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100"
							>
								<InfoIcon className="size-3.5" />
							</button>
						</PopoverTrigger>
						<PopoverContent align="start" className="w-64 text-sm">
							<p className="font-medium">{limitValueLabel}</p>
							<p className="text-muted-foreground text-xs">{limitValueDescription}</p>
						</PopoverContent>
					</Popover>
				</span>
				<span className="font-medium text-sm tabular-nums">{dangerDuration}</span>
			</p>
			<p
				title={`${dangerLabel}: ${dangerDuration}`}
				className={cn(
					"hidden flex-col rounded-lg px-2 py-1 md:flex",
					data.dangerMinutes > 0 ? "bg-danger-subtle text-danger-text" : "bg-secondary text-muted-foreground",
				)}
			>
				<span className="flex items-center gap-1 text-xs">
					{dangerLabel}
					{/* Tablet only: LimitExplanation in the sidebar covers this from lg, see exposure-layout.tsx. */}
					<Popover>
						<PopoverTrigger asChild={true}>
							<button
								type="button"
								aria-label={`${dangerLabel}: ${viewDetailsLabel}`}
								className="-m-1 rounded p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 lg:hidden"
							>
								<InfoIcon className="size-3.5" />
							</button>
						</PopoverTrigger>
						<PopoverContent align="start" className="w-64 text-sm">
							<p className="font-medium">{limitValueLabel}</p>
							<p className="text-muted-foreground text-xs">{limitValueDescription}</p>
						</PopoverContent>
					</Popover>
				</span>
				<span className="font-medium text-sm tabular-nums">{dangerDuration}</span>
			</p>
		</div>
	);
}

const HOURS_IN_DAY = 24;

function formatMinutesAsDuration(totalMinutes: number, locale: Locale) {
	if (totalMinutes === 0) {
		return formatDuration({ minutes: 0 }, { locale, format: ["minutes"], zero: true });
	}

	const totalHours = minutesToHours(totalMinutes);
	const days = Math.floor(totalHours / HOURS_IN_DAY);
	const hours = totalHours - days * HOURS_IN_DAY;
	const minutes = totalMinutes - hoursToMinutes(totalHours);

	const format: Array<"days" | "hours" | "minutes"> = [];

	if (days > 0) {
		format.push("days");
	}

	if (hours > 0) {
		format.push("hours");
	}

	if (minutes > 0) {
		format.push("minutes");
	}

	return formatDuration({ days, hours, minutes: minutes }, { locale, format }).replace("en", "1");
}

function SummaryCardSkeleton() {
	return (
		<div className="flex flex-col gap-3 md:grid md:grid-cols-3">
			<Skeleton className="h-11 w-full rounded-xl" />
			<Skeleton className="h-11 w-full rounded-xl" />
			<Skeleton className="h-11 w-full rounded-xl" />
		</div>
	);
}
