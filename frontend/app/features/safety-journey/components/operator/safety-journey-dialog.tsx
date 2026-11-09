import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { BadgesTab } from "@/features/safety-journey/components/operator/badges-tab.tsx";
import { EarnRules } from "@/features/safety-journey/components/operator/earn-rules.tsx";
import { OverviewTab } from "@/features/safety-journey/components/operator/overview-tab.tsx";
import { RewardsTab } from "@/features/safety-journey/components/operator/rewards-tab.tsx";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";

type SafetyJourneyDialogProps = { open: boolean; onClose: () => void };

export function SafetyJourneyDialog({ open, onClose }: SafetyJourneyDialogProps) {
	const { t } = useTranslation();

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-h-[90vh] w-full max-w-lg gap-4 overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t(($) => $.safetyJourney.dialog.title)}</DialogTitle>
				</DialogHeader>

				<Tabs defaultValue="overview" className="gap-4">
					<TabsList className="w-full">
						<TabsTrigger value="overview" className="cursor-pointer">
							{t(($) => $.safetyJourney.dialog.tabs.overview)}
						</TabsTrigger>
						<TabsTrigger value="badges" className="cursor-pointer">
							{t(($) => $.safetyJourney.dialog.tabs.badges)}
						</TabsTrigger>
						<TabsTrigger value="rewards" className="cursor-pointer">
							{t(($) => $.safetyJourney.dialog.tabs.rewards)}
						</TabsTrigger>
					</TabsList>
					<TabsContent value="overview">
						<OverviewTab />
					</TabsContent>
					<TabsContent value="badges">
						<BadgesTab />
					</TabsContent>
					<TabsContent value="rewards">
						<RewardsTab />
					</TabsContent>
				</Tabs>

				<footer className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-muted-foreground text-xs">
					<Popover>
						<PopoverTrigger className="flex min-h-11 cursor-pointer items-center gap-1.5 text-primary text-sm hover:underline">
							<Info className="size-4" aria-hidden={true} />
							{t(($) => $.safetyJourney.dialog.howToEarn)}
						</PopoverTrigger>
						<PopoverContent align="start" className="w-80">
							<EarnRules />
						</PopoverContent>
					</Popover>
					<p>{t(($) => $.safetyJourney.dialog.onlyYou)}</p>
				</footer>
			</DialogContent>
		</Dialog>
	);
}
