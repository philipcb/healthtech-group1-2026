import { useQueryStates } from "nuqs";
import type { Yard } from "./medical-team-yards.ts";
import { getPeriodRange, type YardScope, yardFilterParsers } from "./yard-filter-parsers.ts";

/** Reads the yard filters from the URL. Unknown halls and occupations fall back to the entire yard/every occupation. */
export function useYardScope(yard: Yard): YardScope {
	const [{ hall, occupation, period }] = useQueryStates(yardFilterParsers);
	const { start, end } = getPeriodRange(period);

	return {
		yardId: yard.id,
		hall: yard.halls.find((h) => h === hall) ?? null,
		occupation: yard.occupations.find((o) => o === occupation) ?? null,
		start,
		end,
	};
}
