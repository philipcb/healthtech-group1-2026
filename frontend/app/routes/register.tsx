import { SignupForm } from "@/components/signup-form.tsx";
import { DemoRoleSwitcher } from "@/features/user/demo-role-switcher.tsx";
import { hasFrontendRole, type User } from "@/features/user/user.ts";
import { useUser } from "@/features/user/user-context.tsx";
import { useGetUsers } from "@/lib/api/generated/user.ts";
import { useNavigate } from "react-router";

export default function Page() {
	const navigate = useNavigate();
	const { setUser } = useUser();
	const { data: users } = useGetUsers();

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
					users={users?.filter(hasFrontendRole)}
					onSelect={handleDemoSelect}
					size="lg"
					className="w-full max-w-sm rounded-xl p-4"
				/>
			</div>
		</div>
	);
}
