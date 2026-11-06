import { useSuspenseQuery } from "@tanstack/react-query";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { objectsQueryOptions } from "#/queries/objects";

/** Выбор объекта для формы задачи. Список объектов читается из кэша Query. */
export function ObjectSelect({
	id,
	value,
	onChange,
}: {
	id: string;
	value: number;
	onChange: (objectId: number) => void;
}) {
	const { data: objects } = useSuspenseQuery(objectsQueryOptions());

	return (
		<Select
			required
			value={value}
			onValueChange={(next) => {
				if (next !== null) onChange(next);
			}}
			// items нужен SelectValue, чтобы в поле показывалось название, а не id
			items={objects.map((object) => ({
				value: object.id,
				label: object.name,
			}))}
		>
			<SelectTrigger id={id} className="w-full">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{objects.map((object) => (
					<SelectItem key={object.id} value={object.id}>
						{object.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
