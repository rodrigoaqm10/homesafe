import type { FormSpec } from "./operations";
export function validate(spec: FormSpec, values: Record<string, string>) {
	for (const f of spec.fields) {
		const v = (values[f.key] ?? "").trim();
		if (!v && f.optional) continue;
		if (!v) throw new Error("Completa " + f.label.toLowerCase() + ".");
		if (f.min && v.length < f.min)
			throw new Error(f.label + ": escribe al menos " + f.min + " caracteres.");
		if (f.max && v.length > f.max)
			throw new Error(f.label + ": máximo " + f.max + " caracteres.");
		if (f.type === "email" && !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(v))
			throw new Error("Revisa el formato del correo.");
		if (f.type === "choice" && !f.choices?.some((c) => c.value === v))
			throw new Error("Selecciona una opción válida.");
		if (
			f.type === "number" &&
			(!/^\d+$/.test(v) || BigInt(v) < 1n || BigInt(v) > 9000000000000n)
		)
			throw new Error("Ingresa un monto entero entre $1 y $9.000.000.000.000.");
		if (
			f.type === "date" &&
			(!/^\d{4}-\d{2}-\d{2}$/.test(v) ||
				!Number.isFinite(Date.parse(v)) ||
				new Date(v).toISOString().slice(0, 10) !== v)
		)
			throw new Error("La fecha debe tener formato AAAA-MM-DD.");
	}
	if (spec.kind === "charge" && !/^\d{4}-(0[1-9]|1[0-2])$/.test(values.period))
		throw new Error("Revisa el período del cobro.");
	if (spec.kind === "visit") {
		const from = Date.parse(values.valid_from),
			until = Date.parse(values.valid_until);
		if (
			!Number.isFinite(from) ||
			!Number.isFinite(until) ||
			until <= from ||
			until <= Date.now() ||
			until - from > 7 * 86400000
		)
			throw new Error(
				"La visita debe vencer en el futuro y durar hasta siete días.",
			);
		const p = (values.vehicle_plate ?? "").toUpperCase().replace(/[\s-]/g, "");
		if (p && !/^[A-Z0-9]{5,8}$/.test(p))
			throw new Error(
				"La patente debe tener entre cinco y ocho letras o números.",
			);
	}
}
