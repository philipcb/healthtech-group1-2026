import { UserRole as BackendUserRole, type UserDto } from "@/lib/api/generated/models/index.ts";
import { z } from "zod";

/**
 * The backend's operator and foreman roles, and `occupationalHealthService` and `management`, frontend-only roles for
 * the demo. The backend's `ohs` and `manager` roles have no pages yet.
 */
export const UserRoleSchema = z.enum([
	...BackendUserRole.extract(["operator", "foreman"]).options,
	"occupationalHealthService",
	"management",
]);

export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserRole = {
	Operator: "operator",
	Foreman: "foreman",
	OccupationalHealthService: "occupationalHealthService",
	Management: "management",
} as const satisfies Record<string, UserRole>;

/** A user from the backend, or a demo user with a frontend-only role */
export type User = Omit<UserDto, "role"> & { role: UserRole };

/** Whether a user from the backend has a role the frontend has pages for */
export function hasFrontendRole<T extends UserDto>(user: T): user is T & User {
	return UserRoleSchema.safeParse(user.role).success;
}
