import { supabase } from "./supabase";

export type Membership = {
	id: string;
	organization_id: string;
	community_id: string;
	profile_id: string;
	role: "residente" | "conserje" | "administrador";
	unit_id: string | null;
};
export type RecordCard = {
	id: string;
	title: string;
	detail: string;
	state?: string;
	code?: string;
};
export type PortalData = {
	community: string;
	unit: string;
	records: RecordCard[];
	metrics: { label: string; value: string }[];
};
export const money = (value: string | number) =>
	new Intl.NumberFormat("es-CL", {
		style: "currency",
		currency: "CLP",
		maximumFractionDigits: 0,
	}).format(Number(value));
export const date = (value: string) =>
	new Intl.DateTimeFormat("es-CL", {
		timeZone: "America/Santiago",
		dateStyle: "short",
		timeStyle: "short",
	}).format(new Date(value));
export const names: Record<string, string> = {
	authorized: "Autorizada",
	arrived: "Ingreso registrado",
	departed: "Salida registrada",
	cancelled: "Cancelada",
	received: "Por retirar",
	delivered: "Entregada",
	open: "Pendiente",
	in_progress: "En curso",
	resolved: "Resuelta",
};
export const menus = {
	residente: [
		"Inicio",
		"Mi cuenta",
		"Visitas",
		"Encomiendas",
		"Solicitudes",
		"Comunicados",
	],
	conserje: [
		"Recepción",
		"Visitas",
		"Encomiendas",
		"Solicitudes",
		"Bitácora",
		"Comunicados",
	],
	administrador: [
		"Dashboard",
		"Finanzas",
		"Solicitudes",
		"Bitácora",
		"Comunicados",
	],
};
export async function loadPortal(
	member: Membership,
	section: string,
): Promise<PortalData> {
	const { data: verified, error: identityError } =
		await supabase.auth.getUser();
	if (identityError || !verified.user) throw new Error("SESSION_EXPIRED");
	const { data: active, error: memberError } = await supabase
		.from("community_memberships")
		.select("id")
		.eq("id", member.id)
		.eq("profile_id", verified.user.id)
		.eq("status", "active")
		.maybeSingle();
	if (memberError || !active) throw new Error("MEMBERSHIP_DENIED");
	const scope = (table: string) =>
		supabase
			.from(table)
			.select("*")
			.eq("organization_id", member.organization_id)
			.eq("community_id", member.community_id);
	const personal = (table: string) =>
		member.role === "residente"
			? scope(table).eq(
					"unit_id",
					member.unit_id || "00000000-0000-0000-0000-000000000000",
				)
			: scope(table);
	const { data: community, error: communityError } = await supabase
		.from("communities")
		.select("name")
		.eq("id", member.community_id)
		.eq("organization_id", member.organization_id)
		.single();
	if (communityError) throw communityError;
	let unit = "";
	if (member.role === "residente" && member.unit_id) {
		const result = await scope("units").eq("id", member.unit_id).single();
		if (result.error) throw result.error;
		unit = result.data.label;
	}
	const data: PortalData = {
		community: community.name,
		unit,
		records: [],
		metrics: [],
	};
	if (["Inicio", "Mi cuenta", "Dashboard", "Finanzas"].includes(section)) {
		const resident = member.role === "residente";
		const summary = await supabase.rpc(
			resident ? "resident_finance_summary" : "admin_finance_summary",
			{
				org: member.organization_id,
				community: member.community_id,
				...(resident ? { unit: member.unit_id } : {}),
			},
		);
		if (summary.error || !summary.data?.[0])
			throw new Error("FINANCE_UNAVAILABLE");
		const totals = summary.data[0];
		data.metrics = [
			{ label: "Saldo pendiente", value: money(totals.outstanding_clp) },
			{
				label: resident ? "Cobros emitidos" : "Abonos netos",
				value: money(resident ? totals.billed_clp : totals.collected_clp),
			},
		];
		if (section === "Mi cuenta" || section === "Finanzas") {
			const charges = await personal("finance_charge_balances")
				.order("created_at", { ascending: false })
				.limit(100);
			if (charges.error) throw charges.error;
			data.records = (charges.data ?? []).map((row) => ({
				id: row.id,
				title: row.description,
				detail: "Vence " + row.due_date + " · Saldo " + money(row.balance_clp),
				state: row.voided_at
					? "Anulado"
					: Number(row.balance_clp) > 0
						? "Pendiente"
						: "Pagado",
			}));
		}
	} else if (section === "Recepción") {
		const count = (table: string) =>
			supabase
				.from(table)
				.select("id", { head: true, count: "exact" })
				.eq("organization_id", member.organization_id)
				.eq("community_id", member.community_id);
		const result = await Promise.all([
			count("packages").eq("status", "received"),
			count("incidents").in("status", ["open", "in_progress"]),
			count("visits").eq("status", "arrived"),
		]);
		if (result.some((item) => item.error))
			throw new Error("COUNTS_UNAVAILABLE");
		data.metrics = result.map((item, i) => ({
			label: [
				"Encomiendas por retirar",
				"Solicitudes activas",
				"Visitas dentro",
			][i],
			value: String(item.count ?? 0),
		}));
	} else if (section === "Visitas") {
		const result = await personal("visits")
			.order("created_at", { ascending: false })
			.limit(100);
		if (result.error) throw result.error;
		data.records = (result.data ?? []).map((row) => ({
			id: row.id,
			title: row.visitor_name,
			detail:
				date(row.valid_from) +
				" a " +
				date(row.valid_until) +
				(row.vehicle_plate ? " · " + row.vehicle_plate : ""),
			state:
				row.status === "authorized" && Date.parse(row.valid_until) < Date.now()
					? "Vencida"
					: names[row.status],
			code:
				row.status === "authorized" && Date.parse(row.valid_until) >= Date.now()
					? "HOME-SAFE:" + row.id
					: undefined,
		}));
	} else if (section === "Bitácora") {
		const day = new Intl.DateTimeFormat("sv-SE", {
			timeZone: "America/Santiago",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).format(new Date());
		const result = await supabase
			.rpc("daily_logbook", {
				org: member.organization_id,
				community: member.community_id,
				local_day: day,
			})
			.order("created_at", { ascending: false })
			.limit(100);
		if (result.error) throw result.error;
		data.records = (result.data ?? []).map(
			(row: {
				id: string;
				kind: string;
				created_at: string;
				detail?: string;
				body?: string;
			}) => ({
				id: row.kind + row.id,
				title:
					row.detail ||
					(
						{
							shift_note: "Anotación de turno",
							visits: "Visita",
							packages: "Encomienda",
							announcements: "Comunicado",
						} as Record<string, string>
					)[row.kind] ||
					"Actividad",
				detail: date(row.created_at) + (row.body ? "\n" + row.body : ""),
			}),
		);
	} else if (section === "Comunicados") {
		const result = await scope("announcements")
			.order("created_at", { ascending: false })
			.limit(50);
		if (result.error) throw result.error;
		data.records = (result.data ?? []).map((row) => ({
			id: row.id,
			title: row.title,
			detail: row.body,
			state: date(row.created_at),
		}));
	} else {
		const incidents = section === "Solicitudes";
		const result = await personal(incidents ? "incidents" : "packages")
			.order(incidents ? "created_at" : "received_at", { ascending: false })
			.limit(100);
		if (result.error) throw result.error;
		data.records = (result.data ?? []).map((row) => ({
			id: row.id,
			title: incidents ? row.title : row.carrier,
			detail: date(incidents ? row.created_at : row.received_at),
			state: names[row.status],
		}));
	}
	return data;
}
