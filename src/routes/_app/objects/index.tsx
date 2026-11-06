import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EmptyState } from "#/components/empty-state";
import { objectsQueryOptions } from "#/queries/objects";

export const Route = createFileRoute("/_app/objects/")({
	// Loader только наполняет кэш Query; компонент читает данные через useSuspenseQuery
	loader: ({ context }) =>
		context.queryClient.query({
			...objectsQueryOptions(),
			staleTime: "static",
		}),
	component: ObjectsPage,
});

function ObjectsPage() {
	const { profile } = Route.useRouteContext();
	const { data: objects } = useSuspenseQuery(objectsQueryOptions());

	return (
		<div className="flex flex-col gap-4">
			<h1 className="text-lg font-medium">Объекты</h1>

			{objects.length === 0 ? (
				<EmptyState>
					{profile.role === "manager"
						? "Объектов пока нет"
						: "Вам пока не назначены задачи"}
				</EmptyState>
			) : (
				<ul className="flex flex-col divide-y rounded-lg border">
					{objects.map((object) => (
						<li key={object.id}>
							<Link
								to="/objects/$objectId"
								params={{ objectId: object.id }}
								className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
							>
								<div className="min-w-0 flex-1">
									<div className="truncate text-sm font-medium">
										{object.name}
									</div>
									<div className="truncate text-xs text-muted-foreground">
										{object.address}
									</div>
								</div>
								<span className="text-xs whitespace-nowrap text-muted-foreground">
									{formatTaskCount(object.taskCount)}
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function formatTaskCount(count: number): string {
	const mod10 = count % 10;
	const mod100 = count % 100;
	if (mod10 === 1 && mod100 !== 11) return `${count} задача`;
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
		return `${count} задачи`;
	return `${count} задач`;
}
