import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Button } from "#/components/ui/button";
import { ROLE_LABEL } from "#/lib/task-status";
import type { Profile } from "#/queries/profile";
import { supabase } from "#/utils/supabase";

const navLinkClass =
	"rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground data-[status=active]:bg-muted data-[status=active]:text-foreground";

export function AppHeader({ profile }: { profile: Profile }) {
	const navigate = useNavigate();

	async function handleSignOut() {
		await supabase.auth.signOut();
		await navigate({ to: "/login", search: {} });
	}

	return (
		<header className="border-b">
			<div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-4 px-6">
				<Link to="/" className="font-medium">
					Объекты и задачи
				</Link>
				<nav className="flex items-center gap-1">
					<Link to="/objects" className={navLinkClass}>
						Объекты
					</Link>
					{profile.role === "executor" && (
						<Link to="/my-tasks" className={navLinkClass}>
							Мои задачи
						</Link>
					)}
				</nav>
				<div className="ml-auto flex items-center gap-3">
					<div className="text-right leading-tight">
						<div className="text-sm">{profile.full_name}</div>
						<div className="text-xs text-muted-foreground">
							{ROLE_LABEL[profile.role]}
						</div>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={handleSignOut}
						aria-label="Выйти"
					>
						<LogOut />
					</Button>
				</div>
			</div>
		</header>
	);
}
