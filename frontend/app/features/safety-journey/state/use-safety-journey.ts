import { SafetyJourneyContext } from "@/features/safety-journey/state/safety-journey-context.ts";
import { useContext } from "react";

export const useSafetyJourney = () => {
	const context = useContext(SafetyJourneyContext);

	if (context === undefined) throw new Error("useSafetyJourney must be used within a SafetyJourneyProvider");

	return context;
};
