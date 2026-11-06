import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppHeader } from "#/components/app-header";
import { meQueryOptions } from "#/queries/profile";
import { supabase } from "#/utils/supabase";

/**
 * Pathless-layout для всех экранов после входа.
 * Guard в beforeLoad: без сессии защищённый контент не рендерится вовсе.
 * Это удобство интерфейса; данные защищает RLS в базе.
 */
export const Route = createFileRoute("/_app")({
	beforeLoad: async ({ context, location }) => {
		const {
			data: { session },
		} = await supabase.auth.getSession();

		if (!session) {
			throw redirect({ to: "/login", search: { redirect: location.href } });
		}

		const profile = await context.queryClient.query({
			...meQueryOptions(session.user.id),
			staleTime: "static",
		});

		if (!profile) {
			// Сессию завершает уже /login. Если вызвать signOut() здесь, подписка
			// onAuthStateChange перезапустит этот guard, и его редирект без ?error
			// перебьёт текущий.
			throw redirect({ to: "/login", search: { error: "no-profile" } });
		}

		return { user: session.user, profile };
	},
	component: AppLayout,
});

function AppLayout() {
	const { profile } = Route.useRouteContext();

	return (
		<div className="flex min-h-svh flex-col">
			<AppHeader profile={profile} />
			<main className="mx-auto w-full max-w-4xl flex-1 p-6">
				<Outlet />
			</main>
		</div>
	);
}
