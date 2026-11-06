import { createFileRoute, redirect } from "@tanstack/react-router";

/** Стартовая страница зависит от роли. */
export const Route = createFileRoute("/_app/")({
	beforeLoad: ({ context }) => {
		throw redirect({
			to: context.profile.role === "executor" ? "/my-tasks" : "/objects",
		});
	},
});
