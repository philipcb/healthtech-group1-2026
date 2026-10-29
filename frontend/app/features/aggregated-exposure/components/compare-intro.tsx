import { Factory, type LucideIcon, MapPin, UsersRound } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

const kinds = ["yard", "hall", "occupation"] as const;
const kindIcons: Record<(typeof kinds)[number], LucideIcon> = { yard: MapPin, hall: Factory, occupation: UsersRound };

export function CompareIntro() {
	const { t } = useTranslation();
	const headingId = useId();

	return (
		<section aria-labelledby={headingId} className="flex flex-col gap-3">
			<div className="flex flex-col gap-1">
				<h2 id={headingId} className="font-medium">
					{t(($) => $.aggregatedExposure.compare.intro.title)}
				</h2>
				<p className="max-w-prose text-muted-foreground text-sm">
					{t(($) => $.aggregatedExposure.compare.intro.description)}
				</p>
			</div>
			<ul className="grid gap-3 sm:grid-cols-3">
				{kinds.map((kind) => {
					const Icon = kindIcons[kind];

					return (
						<li key={kind} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
							<span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
								<Icon aria-hidden="true" className="size-4.5" />
							</span>
							<div className="flex flex-col gap-1">
								<h3 className="font-medium">
									{t(($) => $.aggregatedExposure.compare.intro[kind].title)}
								</h3>
								<p className="text-muted-foreground text-sm">
									{t(($) => $.aggregatedExposure.compare.intro[kind].description)}
								</p>
							</div>
							<p className="mt-auto border-t pt-3 text-muted-foreground text-xs">
								{t(($) => $.aggregatedExposure.compare.intro[kind].how)}
							</p>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
