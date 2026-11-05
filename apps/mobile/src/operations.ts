import { validate } from "./validation";
import { supabase } from "./supabase";
import {
	verifiedMember,
	type Membership,
	type PortalData,
	type RecordCard,
	type Row,
	today,
} from "./portal";
export type Field = {
	key: string;
	label: string;
	min?: number;
	max?: number;
	optional?: boolean;
	type?:
		| "email"
		| "phone"
		| "number"
		| "date"
		| "datetime"
		| "multiline"
		| "choice";
	choices?: { value: string; label: string }[];
};
export type FormSpec = {
	kind: string;
	title: string;
	description?: string;
	fields: Field[];
	values: Record<string, string>;
	target?: RecordCard;
};
const choices = (pairs: Record<string, string>) =>
	Object.entries(pairs).map(([value, label]) => ({ value, label }));
const relation = choices({
	owner: "Propietario",
	tenant: "Arrendatario",
	resident: "Residente",
});
const input = (key: string, label: string, min = 3, max = 160): Field => ({
	key,
	label,
	min,
	max,
});
export function makeForm(
	kind: string,
	member: Membership,
	data: PortalData,
	target?: RecordCard,
): FormSpec {
	const r = target?.raw ?? {};
	const unit: Field = {
		key: "unit_id",
		label: "Unidad",
		type: "choice",
		choices: data.units.map((u) => ({ value: u.id, label: u.label })),
	};
	const withUnit = (fields: Field[]) =>
		member.role === "residente" ? fields : [unit, ...fields];
	const forms: Record<
		string,
		{
			title: string;
			fields: Field[];
			values?: Record<string, string>;
			description?: string;
		}
	> = {
		visit: {
			title: "Autorizar visita",
			fields: withUnit([
				input("visitor_name", "Nombre de la visita", 3, 80),
				{ key: "valid_from", label: "Desde", type: "datetime" },
				{ key: "valid_until", label: "Hasta", type: "datetime" },
				{
					key: "visitor_email",
					label: "Correo de la visita · opcional",
					type: "email",
					optional: true,
					max: 254,
				},
				{
					...input("vehicle_plate", "Patente · solo si viene en auto", 5, 8),
					optional: true,
				},
			]),
			values: {
				valid_from: new Date().toISOString(),
				valid_until: new Date(Date.now() + 4 * 3600000).toISOString(),
			},
			description:
				"La visita recibirá un QR. El correo y el vehículo son opcionales. Vigencia máxima: siete días.",
		},
		incident: {
			title: "Nueva solicitud",
			fields: withUnit([input("title", "¿Qué necesitas informar?", 5, 160)]),
		},
		package: {
			title: "Recibir encomienda",
			fields: [unit, input("carrier", "Empresa o remitente", 2, 100)],
		},
		announcement: {
			title: "Publicar comunicado",
			fields: [
				input("title", "Título", 5, 160),
				{ ...input("body", "Mensaje", 5, 10000), type: "multiline" },
			],
			description: "Será visible para las personas de esta comunidad.",
		},
		note: {
			title: "Anotación de turno",
			fields: [
				{ ...input("body", "¿Qué ocurrió?", 3, 2000), type: "multiline" },
			],
			description:
				"Quedará registrada con tu usuario y la hora del servidor. No acredita asistencia.",
		},
		unit: {
			title: target ? "Editar unidad" : "Registrar unidad",
			fields: [input("label", "Nombre de la unidad", 1, 60)],
			values: { label: r.label ?? "" },
		},
		resident: {
			title: target ? "Editar residente" : "Vincular residente",
			fields: [
				...(!target ? [unit] : []),
				input("full_name", "Nombre completo", 3, 160),
				{
					key: "email",
					label: "Correo · opcional",
					type: "email",
					optional: true,
					max: 254,
				},
				{
					key: "phone",
					label: "Teléfono · opcional",
					type: "phone",
					optional: true,
					max: 40,
				},
				...(!target
					? [
							{
								key: "relationship",
								label: "Relación con la unidad",
								type: "choice" as const,
								choices: relation,
							},
						]
					: []),
			],
			values: {
				full_name: r.full_name ?? "",
				email: r.email ?? "",
				phone: r.phone ?? "",
				relationship: "resident",
			},
		},
		relationship: {
			title: "Editar relación con la unidad",
			fields: [
				{
					key: "relationship",
					label: "Relación",
					type: "choice",
					choices: relation,
				},
			],
			values: { relationship: r.relationship ?? "resident" },
		},
		charge: {
			title: "Emitir cobro",
			fields: [
				unit,
				input("description", "Concepto", 3, 200),
				{ key: "amount", label: "Monto en pesos chilenos", type: "number" },
				input("period", "Período · AAAA-MM", 7, 7),
				{ key: "date", label: "Vencimiento", type: "date" },
			],
			values: { period: today().slice(0, 7), date: today() },
		},
		payment: {
			title: "Registrar abono",
			fields: [
				{ key: "amount", label: "Monto recibido · CLP", type: "number" },
				{
					key: "method",
					label: "Medio de pago",
					type: "choice",
					choices: choices({
						transfer: "Transferencia",
						cash: "Efectivo",
						other: "Otro",
					}),
				},
				input("reference", "Referencia del pago", 3, 120),
			],
			values: { amount: String(r.balance_clp ?? ""), method: "transfer" },
			description:
				"Registra únicamente dinero efectivamente recibido. La referencia no puede repetirse.",
		},
		expense: {
			title: "Registrar egreso",
			fields: [
				input("description", "Concepto", 3, 200),
				{ key: "amount", label: "Monto · CLP", type: "number" },
				{
					key: "category",
					label: "Categoría",
					type: "choice",
					choices: choices({
						maintenance: "Mantención",
						utilities: "Servicios",
						staff: "Personal",
						administration: "Administración",
						other: "Otro",
					}),
				},
				{ key: "date", label: "Fecha del egreso", type: "date" },
			],
			values: { category: "maintenance", date: today() },
		},
		reversal: {
			title: "Revertir abono",
			fields: [input("reason", "Motivo de la reversión", 3, 120)],
			description:
				"Se creará un movimiento compensatorio. El abono original conservará su historial.",
		},
		camera: {
			title: "Registrar cámara",
			fields: [
				input("label", "Nombre", 2, 80),
				input("location", "Ubicación", 2, 120),
			],
		},
		camera_event: {
			title: "Revisar cámara",
			fields: [
				{
					key: "state",
					label: "Estado observado",
					type: "choice",
					choices: choices({
						operativa: "Operativa",
						sin_imagen: "Sin imagen",
						en_revision: "En revisión",
					}),
				},
				{
					...input("note", "Observación · opcional", 0, 400),
					type: "multiline",
					optional: true,
				},
			],
			values: { state: "operativa" },
			description:
				"Este registro informa una revisión. No conecta ni reproduce el video.",
		},
	};
	const spec = forms[kind];
	if (!spec) throw new Error("Formulario no disponible.");
	return { kind, ...spec, values: spec.values ?? {}, target };
}
export async function mobileRequest(
	member: Membership,
	action: string,
	extra: Row = {},
) {
	const current = await supabase.auth.getSession();
	const token = current.data.session?.access_token;
	if (!token) throw new Error("Ingresa nuevamente para continuar.");
	const response = await fetch(
		"https://homesafe-real.vercel.app/api/mobile/services",
		{
			method: "POST",
			headers: {
				Authorization: "Bearer " + token,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ membership_id: member.id, action, ...extra }),
			signal: AbortSignal.timeout(25000),
		},
	);
	const data = await response.json().catch(() => null);
	if (!response.ok)
		throw new Error(data?.error ?? "El servicio aún no está disponible.");
	return data;
}
export async function submitForm(
	inputMember: Membership,
	spec: FormSpec,
	values: Record<string, string>,
) {
	validate(spec, values);
	const m = await verifiedMember(inputMember);
	const v = Object.fromEntries(
		Object.entries(values).map(([k, x]) => [k, x.trim()]),
	);
	const scope = {
		organization_id: m.organization_id,
		community_id: m.community_id,
	};
	const unit = m.role === "residente" ? m.unit_id : v.unit_id;
	const target = spec.target;
	if (target) {
		const table = (
			{
				unit: "units",
				resident: "residents",
				relationship: "unit_residents",
				payment: "common_expense_charges",
				reversal: "payment_ledger",
				camera_event: "security_cameras",
			} as Record<string, string>
		)[spec.kind];
		if (table) {
			const check = await supabase
				.from(table)
				.select("id")
				.eq("id", target.id)
				.eq("organization_id", m.organization_id)
				.eq("community_id", m.community_id)
				.maybeSingle();
			if (check.error || !check.data)
				throw new Error(
					"El registro no pertenece a este acceso o ya no está disponible.",
				);
		}
	}

	let result;
	let warning = "";
	const admin = [
		"unit",
		"resident",
		"relationship",
		"charge",
		"payment",
		"expense",
		"reversal",
		"camera",
		"announcement",
	];
	if (admin.includes(spec.kind) && m.role !== "administrador")
		throw new Error("Esta acción requiere administración.");
	if (["package", "camera_event"].includes(spec.kind) && m.role === "residente")
		throw new Error("Esta acción requiere personal del edificio.");
	if (spec.kind === "note" && m.role !== "conserje")
		throw new Error("Solo conserjería puede registrar anotaciones de turno.");
	if (["camera", "camera_event"].includes(spec.kind)) {
		const p = await supabase.rpc("community_has_pro", {
			org: m.organization_id,
			community: m.community_id,
		});
		if (p.error || !p.data)
			throw new Error("La comunidad no tiene un plan Pro vigente.");
	}
	if (spec.kind === "visit") {
		result = await supabase
			.from("visits")
			.insert({
				...scope,
				unit_id: unit,
				visitor_name: v.visitor_name,
				valid_from: new Date(v.valid_from).toISOString(),
				valid_until: new Date(v.valid_until).toISOString(),
				vehicle_plate:
					v.vehicle_plate?.toUpperCase().replace(/[\s-]/g, "") || null,
			})
			.select("id")
			.single();
		if (!result.error && v.visitor_email) {
			try {
				const sent = await mobileRequest(m, "visit_email", {
					visit_id: result.data.id,
					email: v.visitor_email,
				});
				warning = sent.warning ?? "";
			} catch {
				warning =
					"La visita y su QR quedaron guardados, pero no se pudo enviar el correo. Puedes compartir el QR desde Visitas.";
			}
		}
	} else if (spec.kind === "incident")
		result = await supabase
			.from("incidents")
			.insert({ ...scope, unit_id: unit, title: v.title });
	else if (spec.kind === "package")
		result = await supabase
			.from("packages")
			.insert({ ...scope, unit_id: unit, carrier: v.carrier });
	else if (spec.kind === "announcement")
		result = await supabase
			.from("announcements")
			.insert({ ...scope, title: v.title, body: v.body });
	else if (spec.kind === "note")
		result = await supabase
			.from("shift_notes")
			.insert({ ...scope, body: v.body });
	else if (spec.kind === "unit")
		result = target
			? await supabase.rpc("update_unit_label", {
					target_unit: target.id,
					new_label: v.label,
					expected_label: target.raw.label,
				})
			: await supabase.from("units").insert({ ...scope, label: v.label });
	else if (spec.kind === "resident")
		result = target
			? await supabase.rpc("update_resident_details", {
					target_resident: target.id,
					resident_name: v.full_name,
					resident_email: v.email ?? "",
					resident_phone: v.phone ?? "",
					expected_updated_at: target.raw.updated_at,
				})
			: await supabase.rpc("register_resident", {
					org: m.organization_id,
					community: m.community_id,
					unit,
					resident_name: v.full_name,
					resident_email: v.email ?? "",
					resident_phone: v.phone ?? "",
					relation: v.relationship,
				});
	else if (spec.kind === "relationship")
		result = await supabase.rpc("update_resident_relationship", {
			target_link: target?.id,
			new_relationship: v.relationship,
			expected_relationship: target?.raw.relationship,
		});
	else if (spec.kind === "charge") {
		const [year, month] = v.period.split("-").map(Number);
		result = await supabase.rpc("create_common_charge", {
			org: m.organization_id,
			community: m.community_id,
			unit,
			period_year: year,
			period_month: month,
			charge_description: v.description,
			charge_amount: v.amount,
			charge_due: v.date,
		});
	} else if (spec.kind === "payment")
		result = await supabase.rpc("register_manual_payment", {
			target_charge: target?.id,
			payment_amount: v.amount,
			payment_method: v.method,
			payment_reference: v.reference,
		});
	else if (spec.kind === "expense")
		result = await supabase.from("expenses").insert({
			...scope,
			description: v.description,
			category: v.category,
			amount_clp: v.amount,
			expense_date: v.date,
		});
	else if (spec.kind === "reversal")
		result = await supabase.rpc("reverse_manual_payment", {
			target_payment: target?.id,
			reason: v.reason,
		});
	else if (spec.kind === "camera")
		result = await supabase
			.from("security_cameras")
			.insert({ ...scope, label: v.label, location: v.location });
	else if (spec.kind === "camera_event")
		result = await supabase.from("security_camera_events").insert({
			...scope,
			camera_id: target?.id,
			state: v.state,
			note: v.note ?? "",
		});
	else throw new Error("Acción no disponible.");
	if (result?.error) {
		const code = result.error.code;
		if (code === "40001")
			throw new Error(
				"Otra persona modificó este registro. Actualiza la pantalla antes de editarlo.",
			);
		if (code === "23505")
			throw new Error("Ya existe un registro con esa referencia o nombre.");
		if (code === "23514")
			throw new Error(
				"Revisa los datos, el saldo y el estado actual del registro.",
			);
		throw new Error(
			"No se pudo guardar. Revisa tus permisos y actualiza los datos antes de reintentar.",
		);
	}
	return { warning };
}
export async function transition(
	inputMember: Membership,
	record: RecordCard,
	next: string,
) {
	const member = await verifiedMember(inputMember);
	const table = (
		{
			visit: "visits",
			package: "packages",
			incident: "incidents",
			charge: "common_expense_charges",
			expense: "expenses",
		} as Record<string, string>
	)[record.kind];
	if (!table) throw new Error("Acción no disponible.");
	const check = await supabase
		.from(table)
		.select("id")
		.eq("id", record.id)
		.eq("organization_id", member.organization_id)
		.eq("community_id", member.community_id)
		.maybeSingle();
	if (check.error || !check.data)
		throw new Error("Este registro ya no está disponible en tu comunidad.");
	if (
		member.role === "residente" &&
		!(record.kind === "visit" && next === "cancelled")
	)
		throw new Error("Tu perfil no permite esta acción.");
	const args =
		record.kind === "visit"
			? { visit_id: record.id, next_status: next }
			: record.kind === "package"
				? { package_id: record.id }
				: record.kind === "incident"
					? { incident_id: record.id, next_status: next }
					: { record_type: record.kind, record_id: record.id };
	const name =
		record.kind === "visit"
			? "transition_visit"
			: record.kind === "package"
				? "deliver_package"
				: record.kind === "incident"
					? "transition_incident"
					: "void_financial_record";
	const r = await supabase.rpc(name, args);
	if (r.error)
		throw new Error(
			"No se pudo aplicar el cambio. Puede que el registro haya cambiado o la autorización haya vencido.",
		);
}
export async function lookupVisit(member: Membership, code: string) {
	await verifiedMember(member);
	if (member.role === "residente")
		throw new Error("Acceso exclusivo de conserjería y administración.");
	const id = code.trim().replace(/^HOME-SAFE:/i, "");
	if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))
		throw new Error("El QR no es una autorización de Home Safe.");
	const r = await supabase
		.from("visits")
		.select("*")
		.eq("id", id)
		.eq("organization_id", member.organization_id)
		.eq("community_id", member.community_id)
		.single();
	if (r.error) throw new Error("No se encontró una visita en esta comunidad.");
	return r.data as Row;
}
