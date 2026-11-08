import { Factory, type LucideIcon, MapPin, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";

const kinds = ["yard", "hall", "occupation"] as const;
const kindIcons: Record<(typeof kinds)[number], LucideIcon> = { yard: MapPin, hall: Factory, occupation: UsersRound };

export function CompareIntro() {
	const { t } = useTranslation();

	return (
		// Phones: a plain list, so three cards don't push the page down before anything is compared
		<ul className="flex flex-col divide-y sm:grid sm:grid-cols-3 sm:gap-3 sm:divide-y-0">
			{kinds.map((kind) => {
				const Icon = kindIcons[kind];

				return (
					<li
						key={kind}
						className="flex items-start gap-3 py-3 sm:flex-col sm:rounded-xl sm:border sm:bg-card sm:p-4"
					>
						<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
							<Icon aria-hidden="true" className="size-4.5" />
						</span>
						<div className="flex flex-col gap-1">
							<h2 className="font-medium">{t(($) => $.aggregatedExposure.compare.intro[kind].title)}</h2>
							<p className="text-muted-foreground text-sm">
								{t(($) => $.aggregatedExposure.compare.intro[kind].description)}
							</p>
						</div>
					</li>
				);
			})}
		</ul>
	);
}
