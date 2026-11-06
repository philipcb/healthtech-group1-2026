import { Button } from "@/components/ui/button.tsx";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible.tsx";
import type { ComparisonSeries } from "@/features/aggregated-exposure/components/comparison-trend-chart.tsx";
import { SeriesKey } from "@/features/aggregated-exposure/components/series-key.tsx";
import { formatGroupValue, NO_VALUE } from "@/features/aggregated-exposure/model/groups.ts";
import { getBucketAverages, type ValueBucket } from "@/features/aggregated-exposure/model/trend-chart.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { TIMEZONE } from "@/i18n/locale.ts";
import type { ExposureUnit } from "@/lib/exposures.ts";
import { getISOWeek } from "date-fns";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ComparisonValues({
	series,
	unit,
	bucket,
	periodLabel,
}: {
	series: Array<ComparisonSeries>;
	unit: ExposureUnit;
	bucket: ValueBucket;
	periodLabel: string;
}) {
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const averagesBySlot = series.map(({ points }) => getBucketAverages(points, bucket));
	const bucketStarts = [...new Set(averagesBySlot.flatMap((averages) => [...averages.keys()]))].toSorted(
		(a, b) => a - b,
	);

	return (
		<Collapsible className="flex flex-col gap-2">
			<CollapsibleTrigger asChild={true}>
				<Button variant="ghost" size="sm" className="group -ml-2 w-fit text-muted-foreground">
					<ChevronDown
						aria-hidden="true"
						className="transition-transform group-data-[state=open]:rotate-180"
					/>
					{bucket === "week"
						? t(($) => $.aggregatedExposure.compare.values.week)
						: t(($) => $.aggregatedExposure.compare.values.month)}
				</Button>
			</CollapsibleTrigger>
			<CollapsibleContent className="overflow-x-auto">
				<table className="w-full text-sm">
					<caption className="sr-only">
						{t(($) => $.aggregatedExposure.compare.values.caption, { period: periodLabel })}
					</caption>
					<thead>
						<tr className="border-b text-left text-muted-foreground text-xs">
							<th scope="col" className="pr-3 pb-2 font-medium">
								{t(($) => $.aggregatedExposure.compare.values.bucketColumn)}
							</th>
							{series.map(({ slot, name }) => (
								<th key={slot} scope="col" className="px-3 pb-2 font-medium">
									<span className="flex items-center gap-1.5">
										<SeriesKey slot={slot} width={16} />
										{name}
									</span>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{bucketStarts.map((start) => (
							<tr key={start} className="border-t first:border-t-0">
								<th scope="row" className="py-2 pr-3 text-left font-normal">
									{bucket === "week"
										? t(($) => $.aggregatedExposure.compare.values.weekLabel, {
												week: getISOWeek(start, { in: TIMEZONE }),
											})
										: formatDate(start, "LLLL")}
								</th>
								{averagesBySlot.map((averages, index) => {
									const value = averages.get(start);

									return (
										<td key={series[index]?.slot} className="px-3 py-2 tabular-nums">
											{value === undefined ? (
												<>
													<span aria-hidden="true">{NO_VALUE}</span>
													<span className="sr-only">
														{t(($) => $.aggregatedExposure.compare.noData)}
													</span>
												</>
											) : value === null ? (
												<span className="text-muted-foreground">
													{t(($) => $.aggregatedExposure.compare.notEnoughData)}
												</span>
											) : (
												formatGroupValue(value, unit, t)
											)}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</CollapsibleContent>
		</Collapsible>
	);
}
