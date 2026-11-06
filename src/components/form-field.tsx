import type { ReactNode } from "react";
import { Label } from "#/components/ui/label";

export function FormField({
	id,
	label,
	children,
}: {
	id: string;
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor={id}>{label}</Label>
			{children}
		</div>
	);
}

export function FormError({ error }: { error: unknown }) {
	if (!error) return null;
	const message =
		error instanceof Error || (typeof error === "object" && "message" in error)
			? String((error as { message: unknown }).message)
			: "Не удалось сохранить";
	return (
		<p role="alert" className="text-sm text-destructive">
			{message}
		</p>
	);
}
