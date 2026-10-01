import { ExposureBadge } from "@/components/exposure-badge.tsx";
import { DataTable } from "@/components/ui/data-table.tsx";
import { type DangerLevel, mapDangerLevelToLabel } from "@/lib/danger-levels.ts";
import type { UserWithStatusDto } from "@/lib/dto/user.ts";
import { type Exposure, exposures } from "@/lib/exposures.ts";
import type { ColumnDef } from "@tanstack/react-table";
import { t } from "i18next";
import { Link, useSearchParams } from "react-router";

export interface ExposureTableCellProps {
	data: Array<UserWithStatusDto> | undefined;
}

export function OperatorExposureStatusTable({ data }: ExposureTableCellProps) {
	const [searchParams] = useSearchParams();

	const buildSearchParams = (userId: string, exposure?: Exposure) => {
		const params = new URLSearchParams(searchParams);
		params.set("userId", userId);

		if (exposure) {
			params.set("exposure", exposure);
		} else {
			params.delete("exposure");
		}

		return params.toString();
	};

	const columns: Array<ColumnDef<UserWithStatusDto>> = [
		{
			id: "name",
			accessorKey: "name",
			header: t(($) => $.foremanDashboard.team.table.name),
			cell: ({ row }) => (
				<Link
					to={{ search: buildSearchParams(row.original.id, undefined) }}
					className="font-medium hover:underline"
				>
					{row.original.name}
				</Link>
			),
		},
		...exposures.map<ColumnDef<UserWithStatusDto>>((exposure) => ({
			id: exposure,
			header: t(($) => $.exposures[exposure]),
			cell: ({ row }) => {
				const status = row.original.status[exposure]?.dangerLevel ?? "safe";

				return (
					<OperatorExposureStatusExposureCell
						status={status}
						exposure={exposure}
						search={buildSearchParams(row.original.id, exposure)}
					/>
				);
			},
		})),
	];

		return (
			<>
				<div className="hidden min-w-0 lg:block">
					<DataTable columns={columns} data={data ?? []} getRowId={(teamMember) => teamMember.id} />
				</div>

				<div className="flex flex-col gap-3 lg:hidden">
					{(data ?? []).map((teamMember) => (
						<div className="min-w-0 rounded-lg border p-4" key={teamMember.id}>
							<Link
								to={{ search: buildSearchParams(teamMember.id, undefined) }}
								className="break-words font-medium hover:underline"
							>
								{teamMember.name}
							</Link>
							<div className="mt-3 flex flex-wrap items-center gap-2">
								{exposures.map((exposure) => {
									const status = teamMember.status[exposure]?.dangerLevel ?? "safe";

									return (
										<OperatorExposureStatusExposureCell
											key={exposure}
											status={status}
											exposure={exposure}
											search={buildSearchParams(teamMember.id, exposure)}
										/>
									);
								})}
							</div>
						</div>
					))}
				</div>
			</>
		);
}

interface OperatorExposureStatusCellProps {
	search: string;
	status: DangerLevel;
	exposure: Exposure;
}

function OperatorExposureStatusExposureCell({ search, status, exposure }: OperatorExposureStatusCellProps) {
	const label = mapDangerLevelToLabel(status);

	return (
		<Link
			to={{
				search,
			}}
			className="block w-fit cursor-pointer rounded-full hover:brightness-95"
		>
			<ExposureBadge exposure={exposure} dangerLevel={status}>
				{label}
			</ExposureBadge>
		</Link>
	);
}
