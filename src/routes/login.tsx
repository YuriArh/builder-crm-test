import { createFileRoute, redirect } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { supabase } from "#/utils/supabase";

/** Только относительный путь внутри приложения — защита от open redirect. */
function sanitizeRedirect(value: unknown): string | undefined {
	if (
		typeof value !== "string" ||
		!value.startsWith("/") ||
		value.startsWith("//")
	) {
		return undefined;
	}
	return value;
}

type LoginSearch = { redirect?: string; error?: "no-profile" };

export const Route = createFileRoute("/login")({
	validateSearch: (search: Record<string, unknown>): LoginSearch => ({
		redirect: sanitizeRedirect(search.redirect),
		error: search.error === "no-profile" ? "no-profile" : undefined,
	}),
	beforeLoad: async ({ search }) => {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (!session) return;

		// Вошёл, но профиля (роли) нет: завершаем сессию и остаёмся здесь, чтобы показать ошибку.
		// Перезапуск guards из onAuthStateChange вернёт сюда же: сессии уже не будет.
		if (search.error === "no-profile") {
			await supabase.auth.signOut();
			return;
		}

		throw redirect({ to: search.redirect ?? "/" });
	},
	component: LoginPage,
});

function LoginPage() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [formError, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	// Ошибку из адреса вычисляем на каждом рендере, а не кладём в начальное состояние:
	// после неудачного входа страница уже открыта, и useState не увидел бы новый ?error.
	const error =
		formError ??
		(search.error === "no-profile"
			? "Доступ не настроен, обратитесь к администратору"
			: null);

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setPending(true);
		setError(null);
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		setPending(false);
		if (error) {
			setError("Неверный email или пароль");
			return;
		}
		await navigate({ to: search.redirect ?? "/", search: {} });
	}

	return (
		<main className="flex min-h-svh items-center justify-center p-4">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>Вход</CardTitle>
					<CardDescription>CRM «Объекты и задачи»</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						<div className="flex flex-col gap-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								autoComplete="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="password">Пароль</Label>
							<Input
								id="password"
								type="password"
								autoComplete="current-password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
						{error && (
							<p role="alert" className="text-sm text-destructive">
								{error}
							</p>
						)}
						<Button type="submit" size="lg" disabled={pending}>
							{pending ? "Вход…" : "Войти"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</main>
	);
}
