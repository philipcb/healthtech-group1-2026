import { usePopup } from "@/features/popups/use-popup.ts";
import { PointsChip } from "@/features/safety-journey/components/operator/points-chip.tsx";
import { SafetyJourneyDialog } from "@/features/safety-journey/components/operator/safety-journey-dialog.tsx";
import { JourneyCornerLink } from "@/features/safety-journey/components/shared/journey-corner-link.tsx";
import { SHOW_SAFETY_JOURNEY } from "@/features/safety-journey/model/config.ts";
import { useUser } from "@/features/user/user-context.tsx";
import { useTranslation } from "react-i18next";
import { href } from "react-router";

function OperatorSafetyJourney() {
	const { visible, openPopup, closePopup } = usePopup();

	return (
		<>
			<PointsChip onClick={openPopup} />
			<SafetyJourneyDialog open={visible} onClose={closePopup} />
		</>
	);
}

/**
 * The Safety Journey entry point in the header's top-right corner.
 * Operators get the points chip and dialog; foreman and management get a star linking to their page.
 */
export function SafetyJourney() {
	const { t } = useTranslation();
	const { user } = useUser();

	if (!SHOW_SAFETY_JOURNEY) return null;

	switch (user.role) {
		case "operator": {
			return <OperatorSafetyJourney />;
		}

		case "foreman": {
			return (
				<JourneyCornerLink to={href("/foreman/journey")} label={t(($) => $.safetyJourney.chip.foremanLabel)} />
			);
		}

		case "management": {
			return (
				<JourneyCornerLink
					to={href("/management/rewards")}
					label={t(($) => $.safetyJourney.chip.managementLabel)}
				/>
			);
		}

		default: {
			return null;
		}
	}
}
