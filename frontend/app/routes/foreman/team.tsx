// biome-ignore-all lint/nursery/noShadow: Allow us to use the variable name "user" in different scopes

import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { DataTable } from "@/components/ui/data-table.tsx";
import { useUser } from "@/features/user/user-context.tsx";
import { UserSearch } from "@/features/user/user-search.tsx";
import {
	fetchSubordinatesQueryOptions,
	useAddSubordinatesMutation,
	useRemoveSubordinatesMutation,
	usersQueryOptions,
} from "@/lib/api.ts";
import { type User, UserRole, type UserWithStatusDto } from "@/lib/dto/user.ts";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export default function TeamPage() {
	const { t } = useTranslation();
	const { user } = useUser();

	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [userIdSelection, setUserIdSelection] = useState<Array<User>>([]);

	const columns: Array<ColumnDef<UserWithStatusDto>> = [
		{
			id: "select",
			header: ({ table }) => (
				<Checkbox
					checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
					aria-label={t(($) => $.select.all)}
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label={t(($) => $.select.row)}
				/>
			),
			enableSorting: false,
			enableHiding: false,
		},
		{
			id: "name",
			accessorKey: "name",
			header: t(($) => $.foremanDashboard.team.table.name),
		},
		{
			id: "email",
			accessorKey: "email",
			header: t(($) => $.foremanDashboard.team.table.email),
		},
		{
			id: "jobDescription",
			accessorKey: "jobDescription",
			header: t(($) => $.foremanDashboard.team.table.jobDescription),
		},
	];

	const {
		data: subordinates,
		isLoading: isSubordinatesLoading,
		error: subordinatesError,
	} = useQuery(fetchSubordinatesQueryOptions(user.id));

	const { data: users } = useQuery(usersQueryOptions());

	const filteredUsers = useMemo(() => {
		if (!(users && subordinates)) {
			return [];
		}

		const subordinateIds = new Set(subordinates.map((s) => s.id));

		return users.filter((user) => user.role === UserRole.Operator && !subordinateIds.has(user.id));
	}, [users, subordinates]);

	const addSubordinates = useAddSubordinatesMutation(user.id);
	const removeSubordinates = useRemoveSubordinatesMutation(user.id);

	const handleAddSubordinates = () => {
		if (userIdSelection.length === 0) {
			return;
		}

		const userIds = userIdSelection.map((user) => user.id);

		addSubordinates.mutate(userIds, {
			onSuccess: () => {
				setUserIdSelection([]);
			},
		});
	};

	const handleRemoveSubordinates = () => {
		const selectedIds = Object.keys(rowSelection);

		removeSubordinates.mutate(selectedIds, {
			onSuccess: () => {
				setRowSelection({});
			},
		});
	};

	if (isSubordinatesLoading) {
		return <div className="p-4">{t(($) => $.common.loading)}</div>;
	}

	if (subordinatesError) {
		return <div className="p-4 text-destructive">{t(($) => $.foremanDashboard.team.failedToLoadMembers)}</div>;
	}

	const subordinateList = subordinates ?? [];

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-4">
				<h1 className="font-bold text-2xl">{t(($) => $.foremanDashboard.team.title)}</h1>
								<div className="flex flex-col gap-2 sm:flex-row sm:items-start">
										<div className="min-w-0 sm:flex-1">
											<UserSearch
						users={filteredUsers}
						placeholder={t(($) => $.user.searchPlaceholder)}
						multiple={true}
						value={userIdSelection}
						onValueChange={(value) => {
							if (value == null || value.length === 0) {
								setUserIdSelection([]);
								return;
							}

							setUserIdSelection(value);
						}}
						disabled={filteredUsers.length === 0}
												emptyLabel={t(($) => $.common.noOptions)}
											/>
										</div>
										<Button
											className="w-full sm:w-auto"
											onClick={handleAddSubordinates}
											disabled={userIdSelection.length === 0}
										>
						{t(($) => $.foremanDashboard.team.action.addSubordinate)}
					</Button>
				</div>
				{subordinateList.length === 0 ? (
					<div className="p-4 text-muted-foreground">{t(($) => $.foremanDashboard.team.noMembersFound)}</div>
				) : (
										<>
										<div className="hidden min-w-0 lg:block">
											<DataTable
												columns={columns}
												data={subordinateList}
												selectionLabelT={t}
												state={{ rowSelection }}
												onRowSelectionChange={setRowSelection}
												getRowId={(user) => user.id}
											/>
										</div>

										<div className="flex flex-col gap-3 lg:hidden">
											{subordinateList.map((teamMember) => (
													<div
														className="flex min-w-0 items-start gap-3 rounded-lg border p-4"
														key={teamMember.id}
													>
														<Checkbox
															checked={rowSelection[teamMember.id] === true}
															onCheckedChange={(value) => {
																setRowSelection((current) => {
																	const next = { ...current };

																		if (value) {
																			next[teamMember.id] = true;
																		} else {
																			delete next[teamMember.id];
																		}

																		return next;
																	});
															}}
															aria-label={t(($) => $.select.row)}
														/>
														<div className="min-w-0 flex-1 space-y-1 text-sm">
															<p className="break-words font-medium">{teamMember.name}</p>
															<p className="break-words text-muted-foreground">{teamMember.email}</p>
															<p className="break-words text-muted-foreground">
																{teamMember.jobDescription ?? "-"}
															</p>
														</div>
													</div>
												))}
										</div>
										</>
				)}
									<div>
					<Button
											className="w-full sm:w-auto"
						onClick={handleRemoveSubordinates}
						disabled={Object.keys(rowSelection).length === 0}
						variant="destructive"
					>
						{t(($) => $.foremanDashboard.team.action.removeSubordinate)}
					</Button>
				</div>
			</div>
		</div>
	);
}
