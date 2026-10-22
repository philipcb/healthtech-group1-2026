import { GroupPage } from "@/features/aggregated-exposure/pages/group-page.tsx";
import type { Route } from "./+types/group";

export default function OccupationalHealthServiceGroup({ params }: Route.ComponentProps) {
	return <GroupPage groupId={params.groupId} />;
}
