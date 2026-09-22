import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { MOBILE_BREAKOUT_CARD_CLASSNAME } from "@/lib/mobile-breakout.ts";
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
		<Card className={cn("relative w-full", breakoutOnMobile && MOBILE_BREAKOUT_CARD_CLASSNAME)}>
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
