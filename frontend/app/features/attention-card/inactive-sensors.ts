import type { UserWithStatusDto } from "@/lib/api/generated/models/index.ts";
import { type Exposure, exposures } from "@/lib/exposures.ts";

/** The user is in the team, but has no data for the exposure in the selected period */
export const hasInactiveSensor = (user: UserWithStatusDto, exposure: Exposure) => !user.status[exposure];

/** The user has no data for any exposure in the selected period */
export const hasNoActiveSensors = (user: UserWithStatusDto) =>
	exposures.every((exposure) => hasInactiveSensor(user, exposure));
