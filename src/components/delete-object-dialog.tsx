import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { FormError } from "#/components/form-field";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	forgetDeletedObject,
	useDeleteObject,
} from "#/queries/object-mutations";

export function DeleteObjectDialog({
	object,
	taskCount,
	open,
	onOpenChange,
}: {
	object: { id: number; name: string };
	taskCount: number;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const mutation = useDeleteObject();

	function handleDelete() {
		mutation.mutate(object.id, {
			onSuccess: async () => {
				// сначала уходим со страницы удалённого объекта, потом чистим кэш
				await navigate({ to: "/objects" });
				await forgetDeletedObject(queryClient, object.id);
			},
		});
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (mutation.isPending) return;
				if (!next) mutation.reset();
				onOpenChange(next);
			}}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Удалить объект «{object.name}»?</DialogTitle>
					<DialogDescription>
						{taskCount > 0
							? `Вместе с объектом будут удалены все его задачи (${taskCount}) и их история.`
							: "В объекте нет задач."}{" "}
						Действие необратимо.
					</DialogDescription>
				</DialogHeader>

				<FormError error={mutation.error} />

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={mutation.isPending}
					>
						Отмена
					</Button>
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={mutation.isPending}
					>
						{mutation.isPending ? "Удаление…" : "Удалить"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
