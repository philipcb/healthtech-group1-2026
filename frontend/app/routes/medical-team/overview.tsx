import { ThresholdLegend } from "@/components/exposure-line-chart/threshold-legend.tsx";
import { ThresholdLine } from "@/components/exposure-line-chart/threshold-line.tsx";
import { Card } from "@/components/ui/card.tsx";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import {
	type MedicalPeriod,
	MIN_GROUP_SIZE,
	medicalGroupAggregates,
} from "@/features/medical-team/medical-team-mock-data.ts";
import { useUser } from "@/features/user/user-context.tsx";
import type { TranslateFn } from "@/i18n/config.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { BriefcaseBusiness, CalendarDays, Factory, MapPin, ShieldCheck } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

const exposureTypes = ["dust", "noise", "vibration"] as const satisfies ReadonlyArray<Exposure>;

const exposureLabelSelectors: Record<Exposure, (t: TranslateFn) => string> = {
	dust: (t) => t(($) => $.medicalTeamDashboard.exposures.dust),
	noise: (t) => t(($) => $.medicalTeamDashboard.exposures.noise),
	vibration: (t) => t(($) => $.medicalTeamDashboard.exposures.vibration),
};

const getExposureLabel = (exposure: Exposure, t: TranslateFn) => exposureLabelSelectors[exposure](t);

function getHallLabel(hall: string, t: TranslateFn) {
	return hall === "M-hallen"
		? t(($) => $.medicalTeamDashboard.halls.mHall)
		: t(($) => $.medicalTeamDashboard.halls.hall2);
}

function getOccupationLabel(occupation: string, t: TranslateFn) {
	switch (occupation) {
		case "Welder":
			return t(($) => $.medicalTeamDashboard.occupations.welder);
		case "Technician":
			return t(($) => $.medicalTeamDashboard.occupations.technician);
		case "Electrician":
			return t(($) => $.medicalTeamDashboard.occupations.electrician);
		default:
			return t(($) => $.medicalTeamDashboard.occupations.fitter);
	}
}

const monthKeys = [
	"january",
	"february",
	"march",
	"april",
	"may",
	"june",
	"july",
	"august",
	"september",
	"october",
	"november",
	"december",
] as const;

export default function MedicalTeamOverview() {
	const { t } = useTranslation();
	const { user } = useUser();
	const filterId = useId();
	const currentYear = new Date().getFullYear();
	const [period, setPeriod] = useState<MedicalPeriod>("month");
	const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
	const [selectedYear, setSelectedYear] = useState(currentYear);
	const [selectedHall, setSelectedHall] = useState("all");
	const [selectedOccupation, setSelectedOccupation] = useState("all");
	const chartConfig = {
		average: {
			label: t(($) => $.medicalTeamDashboard.average),
			color: "var(--safe)",
		},
	};

	const groups = medicalGroupAggregates.filter(
		(group) => group.site === user.location.site && group.periods[period].peopleCount >= MIN_GROUP_SIZE,
	);
	const halls = [...new Set(groups.map((group) => group.hall))];
	const occupations = [...new Set(groups.map((group) => group.occupation))];
	const visibleGroups = groups.filter(
		(group) =>
			(selectedHall === "all" || group.hall === selectedHall) &&
			(selectedOccupation === "all" || group.occupation === selectedOccupation),
	);
	const periodLabel =
		period === "month"
			? `${t(($) => $.medicalTeamDashboard.months[monthKeys[selectedMonth]])} ${selectedYear}`
			: selectedYear.toString();
	const years = Array.from({ length: 5 }, (_, index) => currentYear - index);

	return (
		<div className="flex w-full min-w-0 flex-col gap-7">
			<header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
				<div className="space-y-2">
					<p className="flex items-center gap-2 text-muted-foreground text-sm">
						<MapPin aria-hidden="true" className="size-4" />
						{user.location.site}
					</p>
					<h1 className="font-medium text-2xl">{t(($) => $.medicalTeamDashboard.title)}</h1>
					<p className="max-w-prose text-muted-foreground text-sm">
						{t(($) => $.medicalTeamDashboard.description)}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<ToggleGroup
						aria-label={t(($) => $.medicalTeamDashboard.period.label)}
						type="single"
						value={period}
						variant="outline"
						onValueChange={(value: string) => {
							if (value === "month" || value === "year") setPeriod(value);
						}}
					>
						<ToggleGroupItem value="month">{t(($) => $.medicalTeamDashboard.period.month)}</ToggleGroupItem>
						<ToggleGroupItem value="year">{t(($) => $.medicalTeamDashboard.period.year)}</ToggleGroupItem>
					</ToggleGroup>
					{period === "month" && (
						<label className="sr-only" htmlFor={`${filterId}-month`}>
							{t(($) => $.medicalTeamDashboard.period.month)}
						</label>
					)}
					{period === "month" && (
						<select
							id={`${filterId}-month`}
							className="h-9 rounded-md border border-input bg-background px-3 text-sm"
							value={selectedMonth}
							onChange={(event) => setSelectedMonth(Number(event.target.value))}
						>
							{monthKeys.map((month, index) => (
								<option key={month} value={index}>
									{t(($) => $.medicalTeamDashboard.months[month])}
								</option>
							))}
						</select>
					)}
					<label className="sr-only" htmlFor={`${filterId}-year`}>
						{t(($) => $.medicalTeamDashboard.period.selectYear)}
					</label>
					<select
						id={`${filterId}-year`}
						className="h-9 rounded-md border border-input bg-background px-3 text-sm"
						value={selectedYear}
						onChange={(event) => setSelectedYear(Number(event.target.value))}
					>
						{years.map((year) => (
							<option key={year} value={year}>
								{year}
							</option>
						))}
					</select>
				</div>
			</header>

			<section aria-label={t(($) => $.medicalTeamDashboard.filters.title)} className="grid gap-3 sm:grid-cols-2">
				<div className="space-y-1.5">
					<label className="flex items-center gap-2 font-medium text-sm" htmlFor={`${filterId}-hall`}>
						<Factory aria-hidden="true" className="size-4 text-muted-foreground" />
						{t(($) => $.medicalTeamDashboard.filters.hall)}
					</label>
					<Select value={selectedHall} onValueChange={(value) => setSelectedHall(value ?? "all")}>
						<SelectTrigger id={`${filterId}-hall`} className="w-full bg-background">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">{t(($) => $.medicalTeamDashboard.filters.allHalls)}</SelectItem>
							{halls.map((hall) => (
								<SelectItem key={hall} value={hall}>
									{getHallLabel(hall, t)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-1.5">
					<label className="flex items-center gap-2 font-medium text-sm" htmlFor={`${filterId}-occupation`}>
						<BriefcaseBusiness aria-hidden="true" className="size-4 text-muted-foreground" />
						{t(($) => $.medicalTeamDashboard.filters.occupation)}
					</label>
					<Select value={selectedOccupation} onValueChange={(value) => setSelectedOccupation(value ?? "all")}>
						<SelectTrigger id={`${filterId}-occupation`} className="w-full bg-background">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">
								{t(($) => $.medicalTeamDashboard.filters.allOccupations)}
							</SelectItem>
							{occupations.map((occupation) => (
								<SelectItem key={occupation} value={occupation}>
									{getOccupationLabel(occupation, t)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</section>

			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2 text-muted-foreground text-sm">
					<CalendarDays aria-hidden="true" className="size-4" />
					<span>{periodLabel}</span>
				</div>
				<p className="flex items-center gap-1.5 text-muted-foreground text-xs">
					<ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
					{t(($) => $.medicalTeamDashboard.privacyNotice, { count: MIN_GROUP_SIZE })}
				</p>
			</div>

			{visibleGroups.length === 0 ? (
				<div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
					<p className="font-medium">{t(($) => $.medicalTeamDashboard.empty.title)}</p>
					<p className="max-w-sm text-muted-foreground text-sm">
						{t(($) => $.medicalTeamDashboard.empty.description)}
					</p>
				</div>
			) : (
				<section
					aria-label={t(($) => $.medicalTeamDashboard.groupsTitle)}
					className="grid gap-4 xl:grid-cols-2"
				>
					{visibleGroups.map((group) => {
						const aggregate = group.periods[period];
						const chartData = exposureTypes.map((exposure) => ({
							name: getExposureLabel(exposure, t),
							average: aggregate.averageValues[exposure].percentOfActionValue,
							value: aggregate.averageValues[exposure].average,
							unit: aggregate.averageValues[exposure].unit,
							color:
								aggregate.averageValues[exposure].percentOfActionValue <= 100
									? "var(--safe)"
									: "var(--warning)",
						}));
						const maxPercent = Math.max(100, ...chartData.map((entry) => entry.average));
						const xDomainMax = maxPercent + 15;
						const xTicks = Array.from({ length: Math.ceil(xDomainMax / 25) + 1 }, (_, index) => index * 25);

						return (
							<Card key={group.id} className="gap-0 overflow-hidden rounded-lg p-0">
								<div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
									<div>
										<p className="flex items-center gap-2 text-muted-foreground text-xs">
											<Factory aria-hidden="true" className="size-3.5" />
											{getHallLabel(group.hall, t)}
										</p>
										<h2 className="mt-1 font-semibold">
											{getOccupationLabel(group.occupation, t)}
										</h2>
									</div>
									<div className="min-w-32 rounded-md bg-warning-subtle px-3 py-2 text-right">
										<p className="font-semibold text-lg">
											{aggregate.averageTimeAboveActionPercent}
											{"%"}
										</p>
										<p className="text-muted-foreground text-xs">
											{t(($) => $.medicalTeamDashboard.averageTimeAboveAction)}
										</p>
									</div>
								</div>
								<div className="px-3 pt-3">
									<p className="px-1 text-muted-foreground text-xs">
										{t(($) => $.medicalTeamDashboard.averageExposureTitle)}
									</p>
									<ChartContainer config={chartConfig} className="mt-2 aspect-auto h-44 w-full">
										<BarChart
											accessibilityLayer={true}
											data={chartData}
											layout="vertical"
											margin={{ left: 8, right: 20 }}
										>
											<CartesianGrid horizontal={false} />
											<XAxis
												type="number"
												domain={[0, xDomainMax]}
												ticks={xTicks}
												tickFormatter={(value: number) => `${value}%`}
												axisLine={false}
												tickLine={false}
												fontSize={11}
											/>
											<YAxis
												type="category"
												dataKey="name"
												width={94}
												axisLine={false}
												tickLine={false}
												fontSize={11}
											/>
											<ThresholdLine x={100} dangerLevel="warning" />
											<ChartTooltip
												cursor={false}
												content={
													<ChartTooltipContent
														formatter={(value, _name, item) => {
															const point = item.payload as (typeof chartData)[number];
															return `${point.value} ${point.unit} · ${value}% ${t(($) => $.medicalTeamDashboard.ofActionValue)}`;
														}}
													/>
												}
											/>
											<Bar
												dataKey="average"
												name={t(($) => $.medicalTeamDashboard.average)}
												radius={4}
											>
												{chartData.map((entry) => (
													<Cell
														key={entry.name}
														fill={entry.color}
														fillOpacity={0.3}
														stroke={entry.color}
													/>
												))}
											</Bar>
										</BarChart>
									</ChartContainer>
									<ThresholdLegend items={[{ dangerLevel: "warning", color: "var(--warning)" }]} />
								</div>
							</Card>
						);
					})}
				</section>
			)}

			<p className="flex items-start gap-2 border-t pt-4 text-muted-foreground text-xs">
				<ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
				{t(($) => $.medicalTeamDashboard.demoDataNotice)}
			</p>
		</div>
	);
}
