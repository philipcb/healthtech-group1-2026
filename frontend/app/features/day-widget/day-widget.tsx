import { useDate } from "@/features/date-picker/use-date.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { type DangerLevel, dangerlevelStyles } from "@/lib/danger-levels.ts";
import { exposures } from "@/lib/exposures.ts";
import type { OverviewChartRow } from "@/lib/time-bucket-types.ts";
import { cn } from "@/lib/utils.ts";
import { setHours, startOfDay } from "date-fns";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, type To } from "react-router";
import { DangerLevelDots } from "../../components/danger-level-dots.tsx";
import { ExposureIcon } from "../../components/exposure-icon.tsx";

// Pixel sizes matching the hour slot classes below: size-12, gap-1.5 and px-2
const SLOT_SIZE = 48;
const SLOT_GAP = 6;
const ROW_PADDING_X = 16;
const LAST_HOUR_OF_DAY = 23;

const getDangerLevelClasses = (dangerLevel: DangerLevel | null) => {
	if (dangerLevel) {
		return cn(dangerlevelStyles[dangerLevel].border, dangerlevelStyles[dangerLevel].bgSubtle);
	}

	return "border-muted-foreground/20";
};

interface DayWidgetProps {
	data: Array<OverviewChartRow>;
	startHour?: number;
	endHour?: number;
	headerRight?: React.ReactNode;
	buildLink?: (exposure: string, dateQueryParam: string) => To | null;
	selectedDate?: Date;
	exposureTypes?: ReadonlyArray<(typeof exposures)[number]>;
}

export function DayWidget({
	data,
	startHour = 0,
	endHour = 23,
	headerRight,
	buildLink,
	selectedDate,
	exposureTypes = exposures,
}: DayWidgetProps) {
	const { t } = useTranslation();
	const { date: contextDate } = useDate();
	const date = selectedDate ?? contextDate;
	const formatDate = useFormatDate();

	// Fill the available width with empty hour slots after the data, but never past the end of the day
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [fittingHours, setFittingHours] = useState(0);

	useLayoutEffect(() => {
		const el = scrollContainerRef.current;
		if (!el) return;

		const observer = new ResizeObserver(() => {
			setFittingHours(Math.floor((el.clientWidth - ROW_PADDING_X + SLOT_GAP) / (SLOT_SIZE + SLOT_GAP)));
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	const filledEndHour = Math.min(LAST_HOUR_OF_DAY, Math.max(endHour, startHour + fittingHours - 1));
	const totalHours = filledEndHour - startHour + 1;

	const hours = useMemo(() => Array.from({ length: totalHours }, (_, i) => startHour + i), [startHour, totalHours]);

	const hourData = useMemo(() => {
		const baseDate = startOfDay(date);

		return hours.reduce<Record<number, { timeLabel: string; utcHour: number }>>((acc, hour) => {
			const hourDate = setHours(baseDate, hour);

			acc[hour] = {
				timeLabel: formatDate(hourDate, "HH:mm"),
				utcHour: hourDate.getUTCHours(),
			};

			return acc;
		}, {});
	}, [hours, date, formatDate]);

	const dateQueryParam = useMemo(() => formatDate(date, "yyyy-MM-dd"), [date, formatDate]);
	const createLink =
		buildLink ??
		((exposure: string, formattedDate: string) => ({
			pathname: exposure,
			search: `?view=Day&date=${formattedDate}`,
		}));

	const dataByExposure = useMemo(
		() =>
			data.reduce<Record<string, OverviewChartRow>>((acc, row) => {
				acc[row.exposure] = row;
				return acc;
			}, {}),
		[data],
	);

	return (
		<div className={cn("relative", headerRight && "")}>
			{headerRight && <div className="absolute top-0 right-0 z-20 flex items-center gap-2">{headerRight}</div>}

			<div ref={scrollContainerRef} className="overflow-x-auto">
				<div className="w-max min-w-full space-y-1">
					{exposureTypes.map((exposure) => {
						const rowData = dataByExposure[exposure];
						const linkTarget = createLink(exposure, dateQueryParam);
						const isLinkable = linkTarget !== null;

						const rowContent = (
							<>
								<div className="sticky left-0 flex w-fit items-center gap-2 px-2 py-3">
									<ExposureIcon type={exposure} size="sm" />
									<span className="text-base text-foreground">{t(($) => $.exposures[exposure])}</span>
								</div>

								<div className="flex items-start gap-1.5 px-2 pb-3">
									{hours.map((localHour) => {
										const { timeLabel, utcHour } = hourData[localHour];
										const dangerLevel = rowData?.dangerLevelByHour?.[utcHour];

										const dangerText =
											dangerLevel == null ? null : t(($) => $.dangerLevels?.[dangerLevel]);

										const title = dangerText ? `${timeLabel} — ${dangerText}` : timeLabel;

										return (
											<div
												key={`${exposure}-${localHour}`}
												className="flex shrink-0 flex-col items-start"
											>
												{/* hour slot */}
												<div
													title={title}
													className={cn(
														"relative block size-12 rounded-lg border transition-all",
														getDangerLevelClasses(dangerLevel ?? null),
													)}
												>
													{dangerLevel && (
														<DangerLevelDots
															dangerLevel={dangerLevel}
															className="absolute right-1 bottom-1"
														/>
													)}
												</div>

												{/* time label */}
												<div className="mt-2 text-muted-foreground text-xs">{timeLabel}</div>
											</div>
										);
									})}
								</div>
							</>
						);

						if (isLinkable) {
							return (
								<Link
									key={exposure}
									to={linkTarget}
									className={cn(
										"group block rounded-lg transition-colors",
										isLinkable && "hover:bg-card-highlight",
									)}
									aria-label={t(($) => $.exposureStatus.showExposure, {
										exposure: t(($$) => $$.exposures[exposure]),
									})}
								>
									{rowContent}
								</Link>
							);
						}

						return (
							<div key={exposure} className="group block rounded-lg transition-colors">
								{rowContent}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
