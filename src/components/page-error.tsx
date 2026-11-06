import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "#/components/ui/button";

export function PageError({ error }: ErrorComponentProps) {
	const router = useRouter();
	const queryErrorResetBoundary = useQueryErrorResetBoundary();

	useEffect(() => {
		queryErrorResetBoundary.reset();
	}, [queryErrorResetBoundary]);

	return (
		<div className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
			<h1 className="text-base font-medium">Не удалось загрузить данные</h1>
			<p className="text-sm text-muted-foreground">
				{error instanceof Error ? error.message : String(error)}
			</p>
			{/* invalidate перезапускает loader и сбрасывает границу ошибки */}
			<Button onClick={() => router.invalidate()}>Повторить</Button>
		</div>
	);
}
