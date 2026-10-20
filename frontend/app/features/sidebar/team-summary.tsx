import { Card, CardContent, CardLabelHeader } from "@/components/ui/card.tsx";
import { createLocationName } from "@/features/user/user-utils.ts";
import { MapPinIcon, ShieldUserIcon, UsersIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUser } from "../user/user-context.tsx";

type TeamSummaryProps = {
	subordinateCount: number;
	/** "Your team" by default */
	title?: string;
	/** "{{count}} operators in team" by default */
	membersCountLabel?: string;
};

export const TeamSummary = ({ subordinateCount, title, membersCountLabel }: TeamSummaryProps) => {
	const { t } = useTranslation();
	const { user } = useUser();

	return (
		<Card muted={true} variant="labeled">
			<CardLabelHeader>
				<ShieldUserIcon className="size-4" />
				<h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
					{title ?? t(($) => $.sidebar.yourTeam)}
				</h2>
			</CardLabelHeader>

			<CardContent>
				<div className="flex items-center gap-2">
					<MapPinIcon className="size-4 shrink-0" />
					<p className="text-sm">{createLocationName(user.location)}</p>
				</div>

				<div className="flex items-center gap-2">
					<UsersIcon className="size-4" />
					<p className="text-sm">
						{membersCountLabel ??
							t(($) => $.foremanDashboard.team.membersCount, {
								count: subordinateCount,
							})}
					</p>
				</div>
			</CardContent>
		</Card>
	);
};
