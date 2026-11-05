import { supabase } from "./supabase";
export type Membership = {
	id: string;
	organization_id: string;
	community_id: string;
	profile_id: string;
	role: "residente" | "conserje" | "administrador";
	unit_id: string | null;
};
export type Row = Record<string, any>;
export type RecordCard = {
	id: string;
	title: string;
	detail: string;
	state?: string;
	code?: string;
	raw: Row;
	kind: string;
};
export type PortalData = {
	community: string;
	unit: string;
	pro: boolean;
	records: RecordCard[];
	metrics: { label: string; value: string }[];
	units: { id: string; label: string }[];
	hasMore: boolean;
};
export const money = (value: string | number) =>
	new Intl.NumberFormat("es-CL", {
		style: "currency",
		currency: "CLP",
		maximumFractionDigits: 0,
	}).format(
		typeof value === "string" && /^-?\d+$/.test(value)
			? BigInt(value)
			: Number(value),
	);
export const date = (value: string) =>
	new Intl.DateTimeFormat("es-CL", {
		timeZone: "America/Santiago",
		dateStyle: "short",
		timeStyle: "short",
	}).format(new Date(value));
export const today = () =>
	new Intl.DateTimeFormat("sv-SE", {
		timeZone: "America/Santiago",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
export const names: Record<string, string> = {
	authorized: "Autorizada",
	arrived: "Dentro del edificio",
	departed: "Salida registrada",
	cancelled: "Cancelada",
	received: "Por retirar",
	delivered: "Entregada",
	open: "Pendiente",
	in_progress: "En curso",
	resolved: "Resuelta",
	owner: "Propietario",
	tenant: "Arrendatario",
	resident: "Residente",
	operativa: "Operativa",
	sin_imagen: "Sin imagen",
	en_revision: "En revisión",
	transfer: "Transferencia",
	cash: "Efectivo",
	other: "Otro",
};
export const menus = {
	residente: [
		"Inicio",
		"Mi cuenta",
		"Visitas",
		"Solicitudes",
		"Encomiendas",
		"Comunicados",
		"Pagos",
	],
	conserje: [
		"Recepción",
		"Visitas",
		"Encomiendas",
		"Bitácora",
		"Solicitudes",
		"Comunicados",
	],
	administrador: [
		"Dashboard",
		"Finanzas",
		"Residentes",
		"Bitácora",
		"Unidades",
		"Pagos",
		"Egresos",
		"Visitas",
		"Encomiendas",
		"Solicitudes",
		"Comunicados",
		"Auditoría",
	],
};
export async function verifiedMember(member: Membership) {
	const identity = await supabase.auth.getUser();
	if (identity.error || !identity.data.user)
		throw new Error("Tu sesión venció. Ingresa de nuevo.");
	const result = await supabase
		.from("community_memberships")
		.select("id,organization_id,community_id,profile_id,role,unit_id")
		.eq("id", member.id)
		.eq("profile_id", identity.data.user.id)
		.eq("status", "active")
		.single();
	if (result.error || !result.data)
		throw new Error("Este acceso ya no está disponible.");
	const verified = result.data as Membership;
	if (verified.role === "administrador") {
		const a = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
		if (a.error || a.data.currentLevel !== "aal2")
			throw new Error("Verifica tu acceso de administración nuevamente.");
	}
	return verified;
}
export async function allScoped(
	member: Membership,
	table: string,
	columns = "*",
) {
	const rows: Row[] = [];
	for (let start = 0; ; start += 500) {
		const r = await supabase
			.from(table)
			.select(columns)
			.eq("organization_id", member.organization_id)
			.eq("community_id", member.community_id)
			.order("id")
			.range(start, start + 499);
		if (r.error) throw r.error;
		rows.push(...((r.data ?? []) as unknown as Row[]));
		if ((r.data?.length ?? 0) < 500) break;
	}
	return rows;
}
export async function loadPortal(
	input: Membership,
	section: string,
	page = 0,
	day = today(),
): Promise<PortalData> {
	const member = await verifiedMember(input);
	const community = await supabase
		.from("communities")
		.select("name,pro_until")
		.eq("id", member.community_id)
		.eq("organization_id", member.organization_id)
		.single();
	if (community.error) throw community.error;
	const pro = Boolean(
		community.data.pro_until &&
			Date.parse(community.data.pro_until) > Date.now(),
	);
	if (
		!menus[member.role].includes(section) &&
		!(section === "Cámaras" && pro && member.role !== "residente")
	)
		throw new Error("Sección no disponible para tu perfil.");
	const units = (await allScoped(member, "units", "id,label"))
		.map((r) => ({ id: String(r.id), label: String(r.label) }))
		.sort((a, b) => a.label.localeCompare(b.label, "es", { numeric: true }));
	const unitLabel = (id: string) => units.find((u) => u.id === id)?.label ?? "";
	const data: PortalData = {
		community: community.data.name,
		unit: unitLabel(member.unit_id ?? ""),
		pro,
		units,
		records: [],
		metrics: [],
		hasMore: false,
	};
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
					member.unit_id ?? "00000000-0000-0000-0000-000000000000",
				)
			: scope(table);
	const pageQuery = async (table: string, order: string, own = false) => {
		const r = await (own ? personal(table) : scope(table))
			.order(order, { ascending: false })
			.order("id")
			.range(page * 50, page * 50 + 50);
		if (r.error) throw r.error;
		data.hasMore = (r.data?.length ?? 0) > 50;
		return (r.data ?? []).slice(0, 50) as Row[];
	};
	const card = (
		r: Row,
		kind: string,
		title: string,
		detail: string,
		state?: string,
	): RecordCard => ({ id: r.id, raw: r, kind, title, detail, state });
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
			throw new Error("No pudimos consultar el resumen financiero.");
		const t = summary.data[0];
		data.metrics = [
			{ label: "Saldo pendiente", value: money(t.outstanding_clp) },
			{
				label: resident ? "Abonos registrados" : "Abonos netos",
				value: money(resident ? t.paid_clp : t.collected_clp),
			},
			{
				label: resident ? "Saldo vencido" : "Egresos registrados",
				value: money(resident ? t.overdue_clp : t.expenses_clp),
			},
		];
		if (["Mi cuenta", "Finanzas"].includes(section)) {
			data.records = (
				await pageQuery("finance_charge_balances", "created_at", true)
			).map((r) =>
				card(
					r,
					"charge",
					r.description,
					(resident ? "" : "Unidad " + unitLabel(r.unit_id) + " · ") +
						"Vence " +
						r.due_date +
						"\nMonto " +
						money(r.amount_clp) +
						" · Abonos " +
						money(r.paid_clp) +
						"\nSaldo " +
						money(r.balance_clp),
					r.voided_at
						? "Anulado"
						: BigInt(r.balance_clp) > 0n
							? "Pendiente"
							: "Pagado",
				),
			);
		} else {
			const r = await scope("announcements")
				.order("created_at", { ascending: false })
				.limit(3);
			if (r.error) throw r.error;
			data.records = (r.data ?? []).map((r) =>
				card(r, "announcement", r.title, r.body, date(r.created_at)),
			);
		}
	} else if (section === "Recepción") {
		const count = (t: string) =>
			supabase
				.from(t)
				.select("id", { head: true, count: "exact" })
				.eq("organization_id", member.organization_id)
				.eq("community_id", member.community_id);
		const rows = await Promise.all([
			count("packages").eq("status", "received"),
			count("incidents").in("status", ["open", "in_progress"]),
			count("visits").eq("status", "arrived"),
		]);
		if (rows.some((r) => r.error))
			throw new Error("No pudimos consultar los pendientes.");
		data.metrics = rows.map((r, i) => ({
			label: [
				"Encomiendas por retirar",
				"Solicitudes activas",
				"Visitas dentro",
			][i],
			value: String(r.count ?? 0),
		}));
		const notices = await scope("announcements")
			.order("created_at", { ascending: false })
			.limit(3);
		if (notices.error) throw notices.error;
		data.records = (notices.data ?? []).map((r) =>
			card(r, "announcement", r.title, r.body, date(r.created_at)),
		);
	} else if (section === "Visitas") {
		data.records = (await pageQuery("visits", "created_at", true)).map((r) => ({
			...card(
				r,
				"visit",
				r.visitor_name,
				(member.role === "residente"
					? ""
					: "Unidad " + unitLabel(r.unit_id) + " · ") +
					date(r.valid_from) +
					" a " +
					date(r.valid_until) +
					(r.vehicle_plate ? "\nPatente " + r.vehicle_plate : ""),
				r.status === "authorized" && Date.parse(r.valid_until) < Date.now()
					? "Vencida"
					: names[r.status],
			),
			code:
				r.status === "authorized" && Date.parse(r.valid_until) >= Date.now()
					? "HOME-SAFE:" + r.id
					: undefined,
		}));
	} else if (section === "Bitácora") {
		const r = await supabase
			.rpc("daily_logbook", {
				org: member.organization_id,
				community: member.community_id,
				local_day: day,
			})
			.order("created_at", { ascending: false })
			.order("id")
			.range(page * 50, page * 50 + 50);
		if (r.error) throw r.error;
		data.hasMore = (r.data?.length ?? 0) > 50;
		data.records = (r.data ?? []).slice(0, 50).map((r: Row) =>
			card(
				r,
				"log",
				r.detail ||
					((
						{
							shift_note: "Anotación de turno",
							visits: "Movimiento de visita",
							packages: "Encomienda",
							announcements: "Comunicado",
							incidents: "Solicitud",
						} as Record<string, string>
					)[r.kind] ??
						"Actividad"),
				date(r.created_at) +
					(r.unit_label ? " · Unidad " + r.unit_label : "") +
					(r.body ? "\n" + r.body : ""),
				names[r.state] ?? r.state,
			),
		);
	} else if (section === "Comunicados") {
		data.records = (await pageQuery("announcements", "created_at")).map((r) =>
			card(r, "announcement", r.title, r.body, date(r.created_at)),
		);
	} else if (section === "Unidades") {
		data.hasMore = units.length > (page + 1) * 50;
		data.records = units
			.slice(page * 50, page * 50 + 50)
			.map((r) => card(r, "unit", r.label, "Unidad residencial"));
	} else if (section === "Residentes") {
		const [people, links] = await Promise.all([
			pageQuery("residents", "created_at"),
			allScoped(member, "unit_residents"),
		]);
		data.records = people.map((r) => {
			const own = links.filter((l) => l.resident_id === r.id);
			return card(
				{ ...r, links: own },
				"resident",
				r.full_name,
				own
					.map((l) => unitLabel(l.unit_id) + " · " + names[l.relationship])
					.join(", ") +
					"\n" +
					[r.email, r.phone].filter(Boolean).join(" · "),
			);
		});
	} else if (section === "Pagos") {
		const payments = await pageQuery(
			"finance_payment_history",
			"created_at",
			true,
		);
		const receipts = payments
			.filter((r) => r.kind === "receipt")
			.map((r) => r.id);
		let reversed = new Set<string>();
		if (receipts.length) {
			const r = await personal("finance_payment_history")
				.select("reversal_of")
				.in("reversal_of", receipts);
			if (r.error) throw r.error;
			reversed = new Set((r.data ?? []).map((row) => String(row.reversal_of)));
		}
		data.records = payments.map((r) =>
			card(
				{ ...r, reversed: reversed.has(r.id) },
				"payment",
				r.charge_description,
				money(r.amount_clp) +
					" · " +
					(names[r.method] ?? r.method) +
					"\n" +
					date(r.created_at) +
					" · " +
					r.reference +
					(member.role === "administrador"
						? "\nUnidad " + unitLabel(r.unit_id)
						: ""),
				r.kind === "receipt"
					? reversed.has(r.id)
						? "Abono revertido"
						: "Abono"
					: "Reverso",
			),
		);
	} else if (section === "Egresos") {
		data.records = (await pageQuery("expenses", "expense_date")).map((r) =>
			card(
				r,
				"expense",
				r.description,
				money(r.amount_clp) + " · " + r.expense_date,
				r.voided_at ? "Anulado" : "Vigente",
			),
		);
	} else if (section === "Auditoría") {
		data.records = (await pageQuery("audit_logs", "created_at")).map((r) =>
			card(
				r,
				"audit",
				(
					{
						visits: "Visita",
						packages: "Encomienda",
						incidents: "Solicitud",
						shift_notes: "Bitácora",
						announcements: "Comunicado",
						residents: "Residente",
						units: "Unidad",
					} as Record<string, string>
				)[r.entity_type] ?? r.entity_type,
				date(r.created_at) +
					"\nRegistro " +
					r.entity_id +
					"\nAutor " +
					(r.actor_id ?? "Sistema"),
				r.new_status ? (names[r.new_status] ?? r.new_status) : r.action,
			),
		);
	} else if (section === "Cámaras") {
		data.records = (
			await pageQuery("security_camera_status", "created_at")
		).map((r) =>
			card(
				r,
				"camera",
				r.label,
				r.location +
					(r.observed_at
						? "\nÚltima revisión " + date(r.observed_at)
						: "\nSin revisión registrada"),
				names[r.state] ?? "Sin revisión",
			),
		);
	} else {
		const incidents = section === "Solicitudes";
		data.records = (
			await pageQuery(
				incidents ? "incidents" : "packages",
				incidents ? "created_at" : "received_at",
				true,
			)
		).map((r) =>
			card(
				r,
				incidents ? "incident" : "package",
				incidents ? r.title : r.carrier,
				date(incidents ? r.created_at : r.received_at) +
					(member.role === "residente"
						? ""
						: " · Unidad " + unitLabel(r.unit_id)),
				names[r.status],
			),
		);
	}
	return data;
}
