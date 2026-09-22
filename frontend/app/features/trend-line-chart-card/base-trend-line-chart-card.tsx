import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { cn } from "@/lib/utils.ts";
import type { PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";
import { useView } from "../views/use-view.ts";

interface Props extends PropsWithChildren {
	// Opt-in: pdf-chart-renderer.tsx renders this in a fixed-width offscreen container, where a
	// 100vw breakout would misalign against the real viewport instead.
	breakoutOnMobile?: boolean;
}

export function BaseTrendLineChartCard({ children, breakoutOnMobile = false }: Props) {
	const { view } = useView();
	const { t } = useTranslation();

	return (
		<Card
			className={cn(
				"relative w-full",
				// left-1/2 + -50vw margin cancels out layout.tsx's mx-5 regardless of nesting depth.
				breakoutOnMobile &&
					"left-1/2 -ml-[50vw] w-screen rounded-none border-x-0 md:left-auto md:ml-0 md:w-full md:rounded-xl md:border-x",
			)}
		>
			<CardHeader>
				<CardTitle>
					{t(($) => $.exposureTrendLineChartCard.title[view], {
						view: t(($) => $.views[view]).toLowerCase(),
					})}
				</CardTitle>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}
