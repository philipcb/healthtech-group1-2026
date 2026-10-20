import { UserRole as BackendUserRole, type UserDto } from "@/lib/api/generated/models/index.ts";
import { z } from "zod";

/** The backend's roles, and `occupationalHealthService` and `occupationalHygienist`, frontend-only roles for the demo */
export const UserRoleSchema = z.enum([
	...BackendUserRole.options,
	"occupationalHealthService",
	"occupationalHygienist",
]);

export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserRole = {
	Operator: "operator",
	Foreman: "foreman",
	OccupationalHealthService: "occupationalHealthService",
	OccupationalHygienist: "occupationalHygienist",
} as const satisfies Record<string, UserRole>;

/** A user from the backend, or a demo user with a frontend-only role */
export type User = Omit<UserDto, "role"> & { role: UserRole };
