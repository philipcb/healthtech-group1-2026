import type { UserRole as BackendUserRole, UserDto } from "@/lib/api/generated/models/index.ts";
import { z } from "zod";

/** The frontend's names for the backend's roles, see `toFrontendUser` */
export const UserRoleSchema = z.enum(["operator", "foreman", "occupationalHealthService", "management"]);

export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserRole = {
	Operator: "operator",
	Foreman: "foreman",
	OccupationalHealthService: "occupationalHealthService",
	Management: "management",
} as const satisfies Record<string, UserRole>;

const frontendRoleByBackendRole: Record<BackendUserRole, UserRole> = {
	operator: UserRole.Operator,
	foreman: UserRole.Foreman,
	ohs: UserRole.OccupationalHealthService,
	manager: UserRole.Management,
};

/** A user from the backend, with the frontend's name for its role */
export type User = Omit<UserDto, "role"> & { role: UserRole };

export function toFrontendUser<T extends UserDto>(user: T): Omit<T, "role"> & { role: UserRole } {
	return { ...user, role: frontendRoleByBackendRole[user.role] };
}
