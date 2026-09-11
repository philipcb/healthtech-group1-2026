import { NotesCard } from "@/components/notes-card.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import {
	buildLiveExposureQueries,
	getLiveExposureWindow,
	parseTimeRange,
	resolveTimeRange,
	type TimeRangeOption,
} from "@/features/live/live-exposure-queries.ts";
import { useLiveExposureData } from "@/features/live/use-live-exposure-data.ts";
import { LiveExposureCard } from "@/features/live-exposure-card/live-exposure-card.tsx";
import { SecurityRegulationsCard } from "@/features/security-regulations-card/security-regulations-card.tsx";
import { LimitExplanation } from "@/features/sidebar/limit-explanation.tsx";
import { useUser } from "@/features/user/user-context.tsx";
import { getStoredUser } from "@/features/user/user-utils.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { today as getToday } from "@/lib/date.ts";
import { queryClient } from "@/lib/query-client.ts";
import { Clock } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/live";

// biome-ignore lint/style/useComponentExportOnlyModules: Route files must export framework-specific functions like clientLoader
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
	const { searchParams } = new URL(request.url);
	const userId = searchParams.get("userId") ?? getStoredUser().id;
	const liveWindow = getLiveExposureWindow(userId, resolveTimeRange(searchParams.get("timeRange")));
	const queries = buildLiveExposureQueries(liveWindow);

	await Promise.allSettled(queries.map((options) => queryClient.ensureQueryData(options)));
	return null;
}

export default function OperatorLiveView() {
	const { user } = useUser();
	const [selectedUserId] = useQueryState("userId", parseAsString);
	const { t, i18n } = useTranslation();
	const formatDate = useFormatDate();

	const today = getToday();

	const [timeRange, setTimeRange] = useQueryState<TimeRangeOption>("timeRange", parseTimeRange.withDefault("30"));

	const targetUserId = selectedUserId ?? user.id;

	const { start, end, dustTwa1Data, dustTwa25Data, dustTwa10Data, noiseData, vibrationData } = useLiveExposureData(
		targetUserId,
		timeRange,
	);

	const formattedDate = formatDate(today, i18n.language === "en" ? "MMM d, yyyy" : "d. MMM yyyy");

	return (
		<div
			className="flex w-full flex-col gap-4 md:grid"
			style={{
				gridTemplateColumns: "minmax(calc(var(--spacing) * 40), 1fr) minmax(0, 3fr) calc(var(--spacing) * 73)",
			}}
		>
			<aside className="flex flex-col gap-4 md:col-start-1">
				<SecurityRegulationsCard />
				<NotesCard />
				<LimitExplanation />
			</aside>

			<div className="flex min-w-0 flex-col gap-4 md:col-start-2">
				<Card>
					<CardHeader>
						<CardTitle>{t(($) => $.exposures.dust)}</CardTitle>
					</CardHeader>
					<CardContent>
						<LiveExposureCard
							exposure="dust"
							exposureLabel="PM1 TWA"
							exposureUnitLabel="µg/m³"
							chartUnit="ug"
							data={dustTwa1Data}
							minTime={start}
							maxTime={end}
							chartClassName="h-42 p-0 border-none"
						/>
						<Separator />
						<LiveExposureCard
							exposure="dust"
							exposureLabel="PM2.5 TWA"
							exposureField="pm25_twa"
							exposureUnitLabel="µg/m³"
							chartUnit="ug"
							data={dustTwa25Data}
							minTime={start}
							maxTime={end}
							chartClassName="h-42 p-0 border-none"
						/>
						<Separator />
						<LiveExposureCard
							exposure="dust"
							exposureLabel="PM10 TWA"
							exposureField="pm10_twa"
							exposureUnitLabel="µg/m³"
							chartUnit="ug"
							data={dustTwa10Data}
							minTime={start}
							maxTime={end}
							chartClassName="h-42 p-0 border-none"
							showLegend={true}
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{t(($) => $.exposures.noise)}</CardTitle>
					</CardHeader>
					<CardContent>
						<LiveExposureCard
							exposure="noise"
							exposureLabel={t(($) => $.exposures.noise)}
							exposureUnitLabel="dB"
							chartUnit="db"
							data={noiseData}
							minTime={start}
							maxTime={end}
							chartClassName="h-42 p-0 border-none"
							showLegend={true}
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{t(($) => $.exposures.vibration)}</CardTitle>
					</CardHeader>
					<CardContent>
						<LiveExposureCard
							exposure="vibration"
							exposureLabel={t(($) => $.exposures.vibration)}
							exposureUnitLabel={t(($) => $.exposures.units.points)}
							chartUnit="points"
							data={vibrationData}
							minTime={start}
							maxTime={end}
							chartClassName="h-42 p-0 border-none"
							showLegend={true}
							lineType="monotone"
						/>
					</CardContent>
				</Card>
			</div>

			<aside className="md:col-start-3">
				<Card muted={true} className="flex flex-col gap-4">
					<div className="flex w-full flex-row justify-between">
						<p className="flex items-center gap-2 text-sm">
							<Clock size="1rem" />
							{t(($) => $.live.timeRange.label)}
						</p>
						<p className="text-sm">{formattedDate}</p>
					</div>
					<ToggleGroup
						type="single"
						value={timeRange}
						variant="outline"
						onValueChange={(value: TimeRangeOption | "") => {
							if (value) {
								setTimeRange(value);
							}
						}}
					>
						<ToggleGroupItem
							className="text-xs"
							value="30"
							aria-label={t(($) => $.live.timeRange.options.thirtyMinutes)}
						>
							<p>{t(($) => $.live.timeRange.options.thirtyMinutes)}</p>
						</ToggleGroupItem>
						<ToggleGroupItem
							className="text-xs"
							value="60"
							aria-label={t(($) => $.live.timeRange.options.oneHour)}
						>
							<p>{t(($) => $.live.timeRange.options.oneHour)}</p>
						</ToggleGroupItem>
						<ToggleGroupItem
							className="text-xs"
							value="180"
							aria-label={t(($) => $.live.timeRange.options.threeHours)}
						>
							<p>{t(($) => $.live.timeRange.options.threeHours)}</p>
						</ToggleGroupItem>
						<ToggleGroupItem
							className="text-xs"
							value="480"
							aria-label={t(($) => $.live.timeRange.options.eightHours)}
						>
							<p>{t(($) => $.live.timeRange.options.eightHours)}</p>
						</ToggleGroupItem>
					</ToggleGroup>
				</Card>
			</aside>
		</div>
	);
}
