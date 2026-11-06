import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { StatusFilter } from "#/components/status-filter";
import { TaskList, TaskRowContent } from "#/components/task-list";
import { TaskModal } from "#/components/task-modal";
import { taskListSearchSchema } from "#/lib/task-search";
import { MY_TASKS_PRIORITY } from "#/lib/task-status";
import { ensureTaskWithHistory, myTasksQueryOptions } from "#/queries/tasks";

export const Route = createFileRoute("/_app/my-tasks")({
	validateSearch: taskListSearchSchema,
	beforeLoad: ({ context }) => {
		if (context.profile.role !== "executor") throw redirect({ to: "/objects" });
	},
	loaderDeps: ({ search }) => ({ task: search.task }),
	loader: async ({ context: { queryClient, user }, deps }) => {
		await Promise.all([
			queryClient.query({
				...myTasksQueryOptions(user.id),
				staleTime: "static",
			}),
			deps.task !== undefined
				? ensureTaskWithHistory(queryClient, deps.task)
				: null,
		]);
	},
	component: MyTasksPage,
});

function MyTasksPage() {
	const { user } = Route.useRouteContext();
	const { task: openTaskId, status } = Route.useSearch();
	const navigate = Route.useNavigate();
	const { data: tasks } = useSuspenseQuery(myTasksQueryOptions(user.id));

	// Сначала задачи, которые ждут действия исполнителя; внутри группы — от новых к старым
	// (запрос уже отсортирован по дате, а sort стабилен)
	const visibleTasks = (
		status ? tasks.filter((t) => t.status === status) : tasks
	)
		.slice()
		.sort((a, b) => MY_TASKS_PRIORITY[a.status] - MY_TASKS_PRIORITY[b.status]);

	return (
		<div className="flex flex-col gap-4">
			<h1 className="text-lg font-medium">Мои задачи</h1>

			<StatusFilter from={Route.fullPath} value={status} />

			<TaskList
				isEmpty={visibleTasks.length === 0}
				filter={status}
				emptyText="Вам пока не назначены задачи"
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
								meta={task.object?.name ?? "—"}
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
