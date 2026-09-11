import { AllExposuresUserOverview } from "@/features/user-details/all-exposures-user-overview.tsx";
import { DustUserChart } from "@/features/user-details/dust-user-chart.tsx";
import { NoiseUserChart } from "@/features/user-details/noise-user-chart.tsx";
import { VibrationUserChart } from "@/features/user-details/vibration-user-chart.tsx";
import type { UserWithStatusDto } from "@/lib/dto/user.ts";
import type { Exposure } from "@/lib/exposures.ts";

export function UserDetails({
	selectedUser,
	exposure,
}: {
	selectedUser: UserWithStatusDto;
	exposure: Exposure | null;
}) {
	return (
		<section className="flex flex-col gap-6">
			{exposure === null ? (
				<AllExposuresUserOverview selectedUser={selectedUser} />
			) : exposure === "dust" ? (
				<DustUserChart selectedUser={selectedUser} />
			) : exposure === "noise" ? (
				<NoiseUserChart selectedUser={selectedUser} />
			) : (
				<VibrationUserChart selectedUser={selectedUser} />
			)}
		</section>
	);
}
