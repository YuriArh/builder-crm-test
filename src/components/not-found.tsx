import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function NotFound({ children }: { children?: ReactNode }) {
	return (
		<div className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
			<h1 className="text-base font-medium">
				{children ?? "Страница не найдена"}
			</h1>
			<Link
				to="/"
				className="text-sm text-primary underline-offset-4 hover:underline"
			>
				На главную
			</Link>
		</div>
	);
}
