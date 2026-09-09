import { SignupForm } from "@/components/signup-form.tsx";
import { DemoRoleSwitcher } from "@/features/user/demo-role-switcher.tsx";
import { useUser } from "@/features/user/user-context.tsx";
import { usersQueryOptions } from "@/lib/api.ts";
import type { User } from "@/lib/dto/user.ts";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";

export default function Page() {
	const navigate = useNavigate();
	const { setUser } = useUser();
	const { data: users } = useQuery(usersQueryOptions());

	const handleDemoSelect = (user: User) => {
		setUser(user);
		navigate("/");
	};

	return (
		<div className="min-h-svh">
			<div className="flex w-full flex-col items-center justify-center gap-4 p-6 md:p-10">
				<div className="w-full max-w-sm">
					<SignupForm />
				</div>

				<DemoRoleSwitcher
					users={users}
					onSelect={handleDemoSelect}
					size="lg"
					className="w-full max-w-sm rounded-xl p-4"
				/>
			</div>
		</div>
	);
}
