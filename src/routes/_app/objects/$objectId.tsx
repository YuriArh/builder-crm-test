import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { NotFound } from "#/components/not-found";
import { StatusFilter } from "#/components/status-filter";
import { TaskList, TaskRowContent } from "#/components/task-list";
import { TaskModal } from "#/components/task-modal";
import { taskListSearchSchema } from "#/lib/task-search";
import { objectQueryOptions } from "#/queries/objects";
import {
	ensureTaskWithHistory,
	objectTasksQueryOptions,
} from "#/queries/tasks";

export const Route = createFileRoute("/_app/objects/$objectId")({
	params: {
		parse: ({ objectId }) => ({ objectId: Number(objectId) }),
		stringify: ({ objectId }) => ({ objectId: String(objectId) }),
	},
	validateSearch: taskListSearchSchema,
	// Loader зависит только от ?task; смена фильтра ?status не перезапускает загрузку
	loaderDeps: ({ search }) => ({ task: search.task }),
	loader: async ({ context: { queryClient }, params: { objectId }, deps }) => {
		if (!Number.isSafeInteger(objectId) || objectId <= 0) throw notFound();

		const [object] = await Promise.all([
			queryClient.query({
				...objectQueryOptions(objectId),
				staleTime: "static",
			}),
			queryClient.query({
				...objectTasksQueryOptions(objectId),
				staleTime: "static",
			}),
			deps.task !== undefined
				? ensureTaskWithHistory(queryClient, deps.task)
				: null,
		]);

		// RLS не отличает «нет объекта» от «нет доступа» — и интерфейс тоже
		if (!object) throw notFound();
	},
	notFoundComponent: () => <NotFound>Объект не найден</NotFound>,
	component: ObjectPage,
});

function ObjectPage() {
	const { objectId } = Route.useParams();
	const { task: openTaskId, status } = Route.useSearch();
	const navigate = Route.useNavigate();
	const { data: object } = useSuspenseQuery(objectQueryOptions(objectId));
	const { data: tasks } = useSuspenseQuery(objectTasksQueryOptions(objectId));

	if (!object) return <NotFound>Объект не найден</NotFound>;

	const visibleTasks = status
		? tasks.filter((t) => t.status === status)
		: tasks;

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/objects"
					className="text-xs text-muted-foreground hover:text-foreground"
				>
					← Все объекты
				</Link>
				<h1 className="mt-1 text-lg font-medium">{object.name}</h1>
				<p className="text-sm text-muted-foreground">{object.address}</p>
			</div>

			<StatusFilter from={Route.fullPath} value={status} />

			<TaskList
				isEmpty={visibleTasks.length === 0}
				filter={status}
				emptyText="Задач пока нет"
			>
				{visibleTasks.map((task) => (
					<li key={task.id}>
						<Link
							from={Route.fullPath}
							to="."
							search={(prev) => ({ ...prev, task: task.id })}
						>
							<TaskRowContent
								title={task.title}
								status={task.status}
								createdAt={task.created_at}
								meta={task.assignee?.full_name ?? "—"}
							/>
						</Link>
					</li>
				))}
			</TaskList>

			<TaskModal
				taskId={openTaskId}
				onClose={() =>
					navigate({ search: (prev) => ({ ...prev, task: undefined }) })
				}
			/>
		</div>
	);
}
