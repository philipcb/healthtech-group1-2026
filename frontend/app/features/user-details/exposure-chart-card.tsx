import { Card, CardTitle } from "@/components/ui/card.tsx";
import { ExposureLineChartCardSkeleton } from "@/features/exposure-line-chart-card/base-exposure-line-chart-card.tsx";
import type { ExposureDto, ExposureOverviewBucketDto } from "@/lib/dto/exposure.ts";
import type { TZDate } from "@date-fns/tz";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function ExposureChartCard({
	isLoading,
	isError,
	data,
	isExposure,
	selectedDate,
	children,
}: {
	isLoading: boolean;
	isError: boolean;
	data: Array<ExposureDto> | Array<ExposureOverviewBucketDto> | undefined;
	isExposure?: boolean;
	selectedDate: TZDate;
	children: ReactNode;
}) {
	const { t, i18n } = useTranslation();

	if (isLoading && isExposure) {
		return <ExposureLineChartCardSkeleton />;
	}

	if (isLoading) {
		return (
			<Card className="flex w-full items-center">
				<p>{t(($) => $.common.loading)}</p>
			</Card>
		);
	}

	if (isError) {
		return (
			<Card className="flex w-full items-center">
				<p>{t(($) => $.common.error)}</p>
			</Card>
		);
	}

	if (!data || data.length === 0) {
		return (
			<Card className="flex w-full items-center">
				<CardTitle>{formatChartDate(selectedDate, i18n.language)}</CardTitle>
				<p>{t(($) => $.common.noData)}</p>
			</Card>
		);
	}

	return <div className="w-full max-w-4xl">{children}</div>;
}

function formatChartDate(selectedDate: TZDate, locale: string) {
	return selectedDate.toLocaleDateString(locale, {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}
