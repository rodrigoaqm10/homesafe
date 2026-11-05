import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Linking,
	Platform,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
	useColorScheme,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";
import QRCode from "react-native-qrcode-svg";
import type { Session } from "@supabase/supabase-js";
import { router, useLocalSearchParams } from "expo-router";
import { configured, supabase } from "../supabase";
import {
	loadPortal,
	menus,
	today,
	type Membership,
	type PortalData,
	type RecordCard,
	type Row,
} from "../portal";
import {
	makeForm,
	mobileRequest,
	transition,
	type FormSpec,
} from "../operations";
import { downloadFile, shareBytes } from "../downloads";
import {
	Button,
	Card,
	Empty,
	Glass,
	Icon,
	palette,
	useNow,
	sectionIcon,
	ui,
} from "./ui";
import { Sheet, FormSheet, ScannerSheet } from "./sheets";
const web = "https://homesafe-real.vercel.app";
const roleNames = {
	residente: "Residente",
	conserje: "Conserjería",
	administrador: "Administración",
};

function HomeSafe() {
	const system = useColorScheme();
	const now = useNow();
	const [appearance, setAppearance] = useState<"light" | "dark" | "system">(
		"system",
	);
	const dark =
		appearance === "system" ? system === "dark" : appearance === "dark";
	const color = palette(dark);
	const [session, setSession] = useState<Session | null>(null);
	const [initializing, setInitializing] = useState(true);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [members, setMembers] = useState<Membership[]>([]);
	const [member, setMember] = useState<Membership | null>(null);
	const params = useLocalSearchParams<{ section?: string }>();
	const section =
		typeof params.section === "string" ? params.section : "Inicio";
	const setSection = (value: string) => {
		setMenuOpen(false);
		setSearch("");
		setPage(0);
		setNotice("");
		scroll.current?.scrollTo({ y: 0, animated: false });
		if (value !== section || page !== 0) {
			setData(null);
			setError("");
			setSelectedQr(null);
			setBusy(true);
		}
		router.setParams({ section: value });
	};
	const [data, setData] = useState<PortalData | null>(null);
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const [refresh, setRefresh] = useState(0);
	const [mfaReady, setMfaReady] = useState(false);
	const [code, setCode] = useState("");
	const [page, setPage] = useState(0);
	const [day, setDay] = useState(today());
	const [dayInput, setDayInput] = useState(today());
	const [search, setSearch] = useState("");
	const [notice, setNotice] = useState("");
	const [menuOpen, setMenuOpen] = useState(false);
	const [planPro, setPlanPro] = useState(false);
	const [form, setForm] = useState<FormSpec | null>(null);
	const [scanner, setScanner] = useState(false);
	const [confirmation, setConfirmation] = useState<{
		record: RecordCard;
		next: string;
		title: string;
	} | null>(null);
	const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
	const qrRef = useRef<{
		toDataURL: (callback: (data: string) => void) => void;
	} | null>(null);
	useEffect(() => {
		if (Platform.OS !== "web")
			SecureStore.getItemAsync("homesafe.appearance")
				.then((v) => {
					if (v === "light" || v === "dark" || v === "system") setAppearance(v);
				})
				.catch(() => {});
	}, []);
	function changeAppearance(value: "light" | "dark" | "system") {
		setAppearance(value);
		if (Platform.OS !== "web")
			void SecureStore.setItemAsync("homesafe.appearance", value).catch(
				() => {},
			);
	}
	function reload() {
		setError("");
		setBusy(true);
		setRefresh((v) => v + 1);
	}
	function changePage(value: number) {
		setPage(value);
		setData(null);
		setError("");
		setBusy(true);
		setSearch("");
		scroll.current?.scrollTo({ y: 0, animated: false });
	}
	function openForm(kind: string, target?: RecordCard) {
		if (!member || !data) return;
		setForm(makeForm(kind, member, data, target));
	}
	async function confirmChange() {
		if (!member || !confirmation || busy) return;
		setBusy(true);
		setError("");
		try {
			await transition(member, confirmation.record, confirmation.next);
			setConfirmation(null);
			setNotice("El cambio quedó registrado.");
			reload();
		} catch (e) {
			setError(e instanceof Error ? e.message : "No se pudo guardar.");
			setBusy(false);
		}
	}
	async function downloadReport(format: "pdf" | "xlsx") {
		if (!member) return;
		setBusy(true);
		setError("");
		try {
			await downloadFile(
				member,
				"export",
				{ format },
				"home-safe-finanzas." + format,
				format === "pdf"
					? "application/pdf"
					: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			);
		} catch (e) {
			setError(e instanceof Error ? e.message : "No se pudo exportar.");
		} finally {
			setBusy(false);
		}
	}
	async function receipt(id: string, email: boolean) {
		if (!member) return;
		setBusy(true);
		setError("");
		try {
			if (email) {
				await mobileRequest(member, "receipt_email", { payment_id: id });
				setNotice(
					"El comprobante fue enviado al correo confirmado de tu cuenta.",
				);
			} else
				await downloadFile(
					member,
					"receipt",
					{ payment_id: id },
					"home-safe-comprobante.pdf",
					"application/pdf",
				);
		} catch (e) {
			setError(
				e instanceof Error ? e.message : "No se pudo obtener el comprobante.",
			);
		} finally {
			setBusy(false);
		}
	}
	async function aiSummary() {
		if (!member || !data) return;
		setBusy(true);
		setError("");
		try {
			const result = await mobileRequest(member, "summary");
			if (result.draft && member.role === "conserje") {
				const next = makeForm("note", member, data);
				next.values = { body: result.draft };
				next.description =
					"Revisa este borrador antes de guardarlo en la bitácora. " +
					(result.error ?? "");
				setForm(next);
			} else
				setNotice([result.draft, result.error].filter(Boolean).join("\n\n"));
		} catch (e) {
			setError(
				e instanceof Error ? e.message : "No se pudo generar el resumen.",
			);
		} finally {
			setBusy(false);
		}
	}
	async function shareQr(record: RecordCard) {
		if (!qrRef.current) return;
		try {
			const data = await new Promise<string>((resolve) =>
				qrRef.current!.toDataURL(resolve),
			);
			await shareBytes(
				Uint8Array.from(atob(data), (c) => c.charCodeAt(0)),
				"home-safe-visita.png",
				"image/png",
			);
		} catch (e) {
			setError(e instanceof Error ? e.message : "No se pudo compartir el QR.");
		}
	}

	const [selectedQr, setSelectedQr] = useState<string | null>(null);

	useEffect(() => {
		let live = true;
		supabase.auth
			.getSession()
			.then(({ data }) => {
				if (live) {
					setSession(data.session);
					setInitializing(false);
				}
			})
			.catch(() => {
				if (live) {
					setError("No se pudo abrir la sesión.");
					setInitializing(false);
				}
			});
		const { data: listener } = supabase.auth.onAuthStateChange(
			(event, next) => {
				setSession(next);
				if (event === "SIGNED_OUT") {
					setMembers([]);
					setMember(null);
					setData(null);
					setMfaReady(false);
					setSelectedQr(null);
					setForm(null);
					setConfirmation(null);
					setScanner(false);
					setNotice("");
					setPlanPro(false);
					setCode("");
					setError("");
				}
			},
		);
		return () => {
			live = false;
			listener.subscription.unsubscribe();
		};
	}, []);
	useEffect(() => {
		let live = true;
		if (!session?.user.id) return;
		(async () => {
			const identity = await supabase.auth.getUser();
			if (identity.error || !identity.data.user)
				throw new Error("AUTH_REQUIRED");
			const result = await supabase
				.from("community_memberships")
				.select("id,organization_id,community_id,profile_id,role,unit_id")
				.eq("profile_id", identity.data.user.id)
				.eq("status", "active");
			if (result.error) throw result.error;
			if (live) {
				setMember(null);
				setData(null);
				setMfaReady(false);
			}
			if (live)
				setMembers(
					(result.data ?? []).filter(
						(row) => row.role in menus,
					) as Membership[],
				);
		})()
			.catch(() => {
				if (live)
					setError(
						"No se pudieron consultar tus accesos. Cierra sesión e inténtalo de nuevo.",
					);
			})
			.finally(() => {
				if (live) setBusy(false);
			});
		return () => {
			live = false;
		};
	}, [session?.user.id]);
	useEffect(() => {
		let live = true;
		if (!member) return;
		(async () => {
			if (member.role === "administrador") {
				const assurance =
					await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
				if (assurance.error) throw assurance.error;
				if (assurance.data.currentLevel !== "aal2") {
					if (live) setMfaReady(false);
					return;
				}
			}
			if (live) setMfaReady(true);
			const next = await loadPortal(member, section, page, day);
			if (live) {
				setData(next);
				setPlanPro(next.pro);
			}
		})()
			.catch(() => {
				if (live)
					setError(
						"No pudimos cargar esta sección. Revisa tu conexión y vuelve a intentar.",
					);
			})
			.finally(() => {
				if (live) setBusy(false);
			});
		return () => {
			live = false;
		};
	}, [member, section, refresh, page, day]);

	const label = (text: string) => (
		<Text style={[ui.label, { color: color.ink }]}>{text}</Text>
	);
	const button = (text: string, action: () => void) => (
		<Button c={color} disabled={busy} title={text} onPress={action} />
	);
	const inputStyle = [
		ui.input,
		{ backgroundColor: color.panel, borderColor: color.line, color: color.ink },
	];

	async function login() {
		setBusy(true);
		setError("");
		try {
			const result = await supabase.auth.signInWithPassword({
				email: email.trim(),
				password,
			});
			if (result.error) throw result.error;
			setPassword("");
		} catch {
			setError("No pudimos iniciar sesión. Revisa el correo y la contraseña.");
		} finally {
			setBusy(false);
		}
	}
	async function verifyMfa() {
		setBusy(true);
		setError("");
		try {
			const factors = await supabase.auth.mfa.listFactors();
			const factor = factors.data?.totp[0];
			if (factors.error || !factor) throw new Error("NO_FACTOR");
			const result = await supabase.auth.mfa.challengeAndVerify({
				factorId: factor.id,
				code,
			});
			if (result.error) throw result.error;
			setCode("");
			setRefresh((value) => value + 1);
		} catch {
			setError(
				"Revisa el código de tu autenticador. Si aún no lo configuraste, hazlo desde la web.",
			);
		} finally {
			setBusy(false);
		}
	}
	async function signOut() {
		setBusy(true);
		const result = await supabase.auth.signOut();
		if (result.error) {
			setError("No se pudo cerrar la sesión. Intenta nuevamente.");
			setBusy(false);
		} else {
			setSession(null);
			setPassword("");
			setBusy(false);
		}
	}
	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: color.paper }}>
			<StatusBar style={dark ? "light" : "dark"} />
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<View style={[s.header, { borderColor: color.line }]}>
					<View style={ui.row}>
						<View style={[s.monogram, { backgroundColor: color.action }]}>
							<Icon name="building" color={color.actionText} size={22} />
						</View>
						<View style={{ flexShrink: 1 }}>
							<Text style={[s.brand, { color: color.ink }]}>HOME SAFE</Text>
							<Text
								numberOfLines={1}
								style={[ui.small, { color: color.muted }]}
							>
								{member ? roleNames[member.role] : "Tu comunidad, contigo"}
							</Text>
						</View>
					</View>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Abrir menú y apariencia"
						onPress={() => setMenuOpen(true)}
						style={[
							s.round,
							{ backgroundColor: color.panel, borderColor: color.line },
						]}
					>
						<Icon name="menu" color={color.ink} />
					</Pressable>
				</View>
				{initializing ? (
					<ActivityIndicator style={{ marginTop: 60 }} color={color.action} />
				) : (
					<ScrollView
						ref={scroll}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
						contentContainerStyle={s.content}
						refreshControl={
							member ? (
								<RefreshControl
									refreshing={busy}
									tintColor={color.action}
									onRefresh={reload}
								/>
							) : undefined
						}
					>
						{!configured ? (
							<Empty
								c={color}
								title="Conexión pendiente"
								detail="Falta configurar la conexión de Home Safe."
							/>
						) : !session ? (
							<>
								<View style={[s.welcome, { backgroundColor: color.soft }]}>
									<Icon name="home" color={color.action} size={42} />
									<Text
										style={[
											ui.title,
											{ color: color.ink, fontSize: 38, lineHeight: 45 },
										]}
									>
										Bienvenido{"\n"}a casa.
									</Text>
									<Text style={[ui.copy, { color: color.muted }]}>
										Todo lo que necesitas de tu comunidad, en un mismo lugar.
									</Text>
								</View>
								<Card c={color}>
									<Text style={[ui.cardTitle, { color: color.ink }]}>
										Ingresa a tu espacio
									</Text>
									{label("Correo")}
									<TextInput
										accessibilityLabel="Correo"
										autoComplete="email"
										keyboardType="email-address"
										autoCapitalize="none"
										value={email}
										onChangeText={setEmail}
										style={inputStyle}
									/>
									{label("Contraseña")}
									<TextInput
										accessibilityLabel="Contraseña"
										autoComplete="current-password"
										secureTextEntry
										value={password}
										onChangeText={setPassword}
										style={inputStyle}
										onSubmitEditing={() => {
											if (!busy) void login();
										}}
									/>
									{button(
										busy ? "Ingresando…" : "Ingresar",
										() => void login(),
									)}
									<Button
										c={color}
										secondary
										title="Recuperar acceso desde la web"
										onPress={() => void Linking.openURL(web + "/acceso")}
									/>
								</Card>
							</>
						) : !member ? (
							<>
								<Text style={[ui.title, { color: color.ink }]}>
									Tu comunidad,{"\n"}tu espacio.
								</Text>
								<Text style={[ui.copy, { color: color.muted }]}>
									Selecciona el acceso asignado a tu cuenta.
								</Text>
								{members.map((item) => (
									<Card key={item.id} c={color}>
										<View style={ui.row}>
											<View
												style={[ui.iconTile, { backgroundColor: color.soft }]}
											>
												<Icon
													name={
														item.role === "administrador"
															? "building"
															: item.role === "conserje"
																? "shield"
																: "home"
													}
													color={color.action}
												/>
											</View>
											<Text
												style={[ui.cardTitle, { color: color.ink, flex: 1 }]}
											>
												{roleNames[item.role]}
											</Text>
										</View>
										<Button
											c={color}
											title="Abrir mi espacio"
											disabled={busy}
											onPress={() => {
												setSection(menus[item.role][0]);
												setData(null);
												setError("");
												setSelectedQr(null);
												setMfaReady(false);
												setBusy(true);
												setPlanPro(false);
												setMember(item);
											}}
										/>
									</Card>
								))}
								{!busy && !members.length && (
									<Empty
										c={color}
										title="Sin accesos asignados"
										detail="La administración debe vincular tu cuenta a una comunidad."
									/>
								)}
							</>
						) : member.role === "administrador" && !mfaReady ? (
							<Card c={color}>
								<Icon name="shield" color={color.action} size={36} />
								<Text style={[ui.title, { color: color.ink }]}>
									Un acceso protegido.
								</Text>
								<Text style={[ui.copy, { color: color.muted }]}>
									Ingresa el código de seis dígitos de tu aplicación de
									autenticación.
								</Text>
								<TextInput
									accessibilityLabel="Código de autenticación"
									value={code}
									onChangeText={(v) => setCode(v.replace(/[^0-9]/g, ""))}
									maxLength={6}
									keyboardType="number-pad"
									autoComplete="one-time-code"
									style={inputStyle}
								/>
								{button("Verificar", () => void verifyMfa())}
								<Button
									c={color}
									secondary
									title="Configurar en la web"
									onPress={() => void Linking.openURL(web + "/seguridad")}
								/>
							</Card>
						) : (
							<>
								<View style={{ gap: 6 }}>
									<Text style={[s.eyebrow, { color: color.muted }]}>
										{data?.community ?? "TU COMUNIDAD"}
										{data?.unit ? " · " + data.unit : ""}
									</Text>
									<Text
										accessibilityRole="header"
										style={[ui.title, { color: color.ink }]}
									>
										{section}
									</Text>
									<Text style={[ui.copy, { color: color.muted }]}>
										{descriptions[section] ??
											"Información y gestión de tu comunidad."}
									</Text>
								</View>
								{busy && <ActivityIndicator color={color.action} />}
								{data?.metrics.length ? (
									<View style={{ gap: 12 }}>
										{data.metrics.map((metric, i) => (
											<View
												key={metric.label}
												style={[
													s.metric,
													{
														backgroundColor:
															i === 0 ? color.action : color.panel,
														borderColor: color.line,
													},
												]}
											>
												<Text
													style={[
														ui.label,
														{ color: i === 0 ? color.actionText : color.muted },
													]}
												>
													{metric.label}
												</Text>
												<Text
													style={[
														s.amount,
														{ color: i === 0 ? color.actionText : color.ink },
													]}
												>
													{metric.value}
												</Text>
											</View>
										))}
									</View>
								) : null}
								{["Inicio", "Recepción", "Dashboard"].includes(section) && (
									<>
										<Text style={[ui.cardTitle, { color: color.ink }]}>
											A un toque
										</Text>
										<View style={s.quickGrid}>
											{(member.role === "residente"
												? ["Mi cuenta", "Visitas", "Encomiendas", "Solicitudes"]
												: member.role === "conserje"
													? [
															"Visitas",
															"Encomiendas",
															"Bitácora",
															"Solicitudes",
														]
													: [
															"Finanzas",
															"Residentes",
															"Bitácora",
															"Comunicados",
														]
											).map((tab) => (
												<Pressable
													key={tab}
													accessibilityRole="button"
													onPress={() => setSection(tab)}
													style={[
														s.quick,
														{
															backgroundColor: color.panel,
															borderColor: color.line,
														},
													]}
												>
													<View
														style={[
															ui.iconTile,
															{ backgroundColor: color.soft },
														]}
													>
														<Icon
															name={sectionIcon(tab)}
															color={color.action}
														/>
													</View>
													<Text style={[ui.label, { color: color.ink }]}>
														{tab}
													</Text>
													<Icon name="arrow" color={color.muted} size={16} />
												</Pressable>
											))}
										</View>
										<Text style={[ui.cardTitle, { color: color.ink }]}>
											Últimos comunicados
										</Text>
									</>
								)}
								<View style={ui.wrap}>
									{section === "Visitas" && (
										<>
											<Button
												c={color}
												title="Autorizar visita"
												icon="plus"
												disabled={!data || busy}
												onPress={() => openForm("visit")}
											/>
											{member.role !== "residente" && (
												<Button
													c={color}
													secondary
													title="Leer QR"
													icon="qr"
													onPress={() => setScanner(true)}
												/>
											)}
										</>
									)}
									{section === "Encomiendas" && member.role !== "residente" && (
										<Button
											c={color}
											title="Recibir encomienda"
											icon="plus"
											onPress={() => openForm("package")}
										/>
									)}
									{section === "Solicitudes" && (
										<Button
											c={color}
											title="Nueva solicitud"
											icon="plus"
											onPress={() => openForm("incident")}
										/>
									)}
									{section === "Bitácora" && member.role === "conserje" && (
										<Button
											c={color}
											title="Escribir anotación"
											icon="plus"
											onPress={() => openForm("note")}
										/>
									)}
									{member.role === "administrador" &&
										(
											{
												Comunicados: "announcement",
												Unidades: "unit",
												Residentes: "resident",
												Finanzas: "charge",
												Egresos: "expense",
												Cámaras: "camera",
											} as Record<string, string>
										)[section] && (
											<Button
												c={color}
												title={
													(
														{
															Comunicados: "Publicar comunicado",
															Unidades: "Registrar unidad",
															Residentes: "Vincular residente",
															Finanzas: "Emitir cobro",
															Egresos: "Registrar egreso",
															Cámaras: "Registrar cámara",
														} as Record<string, string>
													)[section]
												}
												icon="plus"
												onPress={() =>
													openForm(
														(
															{
																Comunicados: "announcement",
																Unidades: "unit",
																Residentes: "resident",
																Finanzas: "charge",
																Egresos: "expense",
																Cámaras: "camera",
															} as Record<string, string>
														)[section],
													)
												}
											/>
										)}
								</View>
								{section === "Finanzas" && member.role === "administrador" && (
									<View style={ui.wrap}>
										<Button
											c={color}
											secondary
											icon="download"
											title="Informe PDF"
											disabled={busy}
											onPress={() => void downloadReport("pdf")}
										/>
										<Button
											c={color}
											secondary
											icon="download"
											title="Excel completo"
											disabled={busy}
											onPress={() => void downloadReport("xlsx")}
										/>
									</View>
								)}
								{section === "Mi cuenta" && (
									<Card c={color}>
										<Text style={[ui.cardTitle, { color: color.ink }]}>
											Tus pagos y comprobantes
										</Text>
										<Text style={[ui.copy, { color: color.muted }]}>
											Revisa tus abonos y descarga sus comprobantes. Los pagos
											en línea estarán disponibles cuando se conecte la
											pasarela.
										</Text>
										<Button
											c={color}
											secondary
											title="Ver mis pagos"
											onPress={() => setSection("Pagos")}
										/>
									</Card>
								)}
								{section === "Cámaras" && (
									<Card c={color}>
										<Text style={[ui.copy, { color: color.muted }]}>
											Control de estado y revisiones del equipo. El video en
											vivo requiere integrar el grabador del edificio.
										</Text>
									</Card>
								)}
								{section === "Bitácora" && (
									<>
										<View style={ui.row}>
											<TextInput
												accessibilityLabel="Día de bitácora AAAA-MM-DD"
												value={dayInput}
												onChangeText={setDayInput}
												maxLength={10}
												placeholder="AAAA-MM-DD"
												placeholderTextColor={color.muted}
												style={[inputStyle, { flex: 1 }]}
											/>
											<Button
												c={color}
												secondary
												title="Consultar día"
												disabled={busy}
												onPress={() => {
													if (
														!/^\d{4}-\d{2}-\d{2}$/.test(dayInput) ||
														Number.isNaN(Date.parse(dayInput))
													) {
														setError("Revisa la fecha: AAAA-MM-DD.");
														return;
													}
													setPage(0);
													setDay(dayInput);
													setBusy(true);
													setError("");
													setRefresh((v) => v + 1);
												}}
											/>
										</View>
										{planPro && (
											<Button
												c={color}
												secondary
												title="Preparar resumen con IA"
												disabled={busy}
												onPress={() => void aiSummary()}
											/>
										)}
									</>
								)}
								{data &&
									data.records.length > 0 &&
									!["Inicio", "Recepción", "Dashboard"].includes(section) && (
										<View
											style={[
												s.search,
												{
													backgroundColor: color.panel,
													borderColor: color.line,
												},
											]}
										>
											<Icon name="search" color={color.muted} size={20} />
											<TextInput
												accessibilityLabel="Buscar en esta página"
												placeholder="Buscar en esta página"
												placeholderTextColor={color.muted}
												value={search}
												onChangeText={setSearch}
												style={{
													flex: 1,
													fontSize: 16,
													color: color.ink,
													paddingVertical: 12,
												}}
											/>
										</View>
									)}
								{Boolean(notice) && (
									<Card c={color}>
										<Text
											accessibilityRole="alert"
											style={[ui.copy, { color: color.ink }]}
										>
											{notice}
										</Text>
										<Button
											c={color}
											secondary
											title="Entendido"
											onPress={() => setNotice("")}
										/>
									</Card>
								)}
								{data?.records
									.filter((r) =>
										(r.title + " " + r.detail + " " + r.state)
											.toLocaleLowerCase("es")
											.includes(search.toLocaleLowerCase("es")),
									)
									.map((record) => (
										<Card c={color} key={record.id}>
											<View style={[ui.row, { alignItems: "flex-start" }]}>
												<View
													style={[ui.iconTile, { backgroundColor: color.soft }]}
												>
													<Icon
														name={sectionIcon(
															record.kind === "announcement"
																? "Comunicados"
																: section,
														)}
														color={color.action}
													/>
												</View>
												<View style={{ flex: 1, gap: 6 }}>
													{record.state && (
														<Text
															style={[
																s.badge,
																{
																	color: color.action,
																	backgroundColor: color.soft,
																},
															]}
														>
															{record.state}
														</Text>
													)}
													<Text style={[ui.cardTitle, { color: color.ink }]}>
														{record.title}
													</Text>
												</View>
											</View>
											<Text
												selectable
												style={[ui.copy, { color: color.muted }]}
											>
												{record.detail}
											</Text>
											{record.kind === "visit" && (
												<>
													<View style={ui.wrap}>
														{record.code && (
															<Button
																c={color}
																secondary
																title={
																	selectedQr === record.id
																		? "Ocultar QR"
																		: "Ver QR"
																}
																icon="qr"
																onPress={() =>
																	setSelectedQr(
																		selectedQr === record.id ? null : record.id,
																	)
																}
															/>
														)}
														{record.raw.status === "authorized" && (
															<Button
																c={color}
																secondary
																title="Cancelar visita"
																onPress={() =>
																	setConfirmation({
																		record,
																		next: "cancelled",
																		title: "¿Cancelar esta autorización?",
																	})
																}
															/>
														)}
														{member.role !== "residente" &&
															record.raw.status === "authorized" &&
															Date.parse(record.raw.valid_from) <= now &&
															Date.parse(record.raw.valid_until) >= now && (
																<Button
																	c={color}
																	title="Registrar ingreso"
																	onPress={() =>
																		setConfirmation({
																			record,
																			next: "arrived",
																			title:
																				"¿Confirmar el ingreso de esta visita?",
																		})
																	}
																/>
															)}
														{member.role !== "residente" &&
															record.raw.status === "arrived" && (
																<Button
																	c={color}
																	title="Registrar salida"
																	onPress={() =>
																		setConfirmation({
																			record,
																			next: "departed",
																			title: "¿Confirmar la salida?",
																		})
																	}
																/>
															)}
													</View>
													{selectedQr === record.id && record.code && (
														<View style={{ gap: 16, alignItems: "center" }}>
															<View style={s.qr}>
																<QRCode
																	value={record.code}
																	size={190}
																	getRef={(value) => {
																		qrRef.current = value;
																	}}
																/>
															</View>
															<Button
																c={color}
																secondary
																title="Compartir QR"
																icon="qr"
																onPress={() => void shareQr(record)}
															/>
														</View>
													)}
												</>
											)}
											{record.kind === "package" &&
												member.role !== "residente" &&
												record.raw.status === "received" && (
													<Button
														c={color}
														secondary
														title="Confirmar entrega"
														onPress={() =>
															setConfirmation({
																record,
																next: "delivered",
																title: "¿La encomienda ya fue entregada?",
															})
														}
													/>
												)}
											{record.kind === "incident" &&
												member.role !== "residente" &&
												record.raw.status !== "resolved" && (
													<Button
														c={color}
														secondary
														title={
															record.raw.status === "open"
																? "Tomar solicitud"
																: "Marcar resuelta"
														}
														onPress={() =>
															setConfirmation({
																record,
																next:
																	record.raw.status === "open"
																		? "in_progress"
																		: "resolved",
																title:
																	"¿Actualizar el estado de esta solicitud?",
															})
														}
													/>
												)}
											{record.kind === "charge" &&
												member.role === "administrador" &&
												!record.raw.voided_at && (
													<View style={ui.wrap}>
														{BigInt(record.raw.balance_clp) > 0n && (
															<Button
																c={color}
																title="Registrar abono"
																onPress={() => openForm("payment", record)}
															/>
														)}
														{BigInt(record.raw.paid_clp) === 0n && (
															<Button
																c={color}
																secondary
																title="Anular cobro"
																onPress={() =>
																	setConfirmation({
																		record,
																		next: "void",
																		title: "¿Anular este cobro?",
																	})
																}
															/>
														)}
													</View>
												)}
											{record.kind === "charge" &&
												member.role === "residente" &&
												!record.raw.voided_at &&
												BigInt(record.raw.balance_clp) > 0n && (
													<Button
														c={color}
														secondary
														title="Pagar este cobro"
														onPress={() =>
															setNotice(
																"La pasarela de pago todavía no está conectada. No se realizará ningún cargo. La administración puede registrar tu transferencia y emitir su comprobante.",
															)
														}
													/>
												)}
											{record.kind === "expense" && !record.raw.voided_at && (
												<Button
													c={color}
													secondary
													title="Anular egreso"
													onPress={() =>
														setConfirmation({
															record,
															next: "void",
															title: "¿Anular este egreso?",
														})
													}
												/>
											)}
											{record.kind === "unit" && (
												<Button
													c={color}
													secondary
													title="Editar unidad"
													onPress={() => openForm("unit", record)}
												/>
											)}
											{record.kind === "resident" && (
												<>
													<Button
														c={color}
														secondary
														title="Editar datos"
														onPress={() => openForm("resident", record)}
													/>
													{record.raw.links?.map((link: Row) => (
														<Button
															key={link.id}
															c={color}
															secondary
															title={
																"Editar relación · " +
																(data.units.find((u) => u.id === link.unit_id)
																	?.label ?? "Unidad")
															}
															onPress={() =>
																openForm("relationship", {
																	...record,
																	id: link.id,
																	raw: link,
																})
															}
														/>
													))}
												</>
											)}
											{record.kind === "payment" &&
												record.raw.kind === "receipt" && (
													<View style={ui.wrap}>
														{member.role === "residente" ? (
															<>
																<Button
																	c={color}
																	secondary
																	title="Descargar comprobante"
																	icon="download"
																	disabled={busy}
																	onPress={() => void receipt(record.id, false)}
																/>
																<Button
																	c={color}
																	secondary
																	title="Enviar a mi correo"
																	disabled={busy}
																	onPress={() => void receipt(record.id, true)}
																/>
															</>
														) : (
															<Button
																c={color}
																secondary
																disabled={Boolean(record.raw.reversed)}
																title={
																	record.raw.reversed
																		? "Abono ya revertido"
																		: "Revertir abono"
																}
																onPress={() => openForm("reversal", record)}
															/>
														)}
													</View>
												)}
											{record.kind === "camera" && (
												<Button
													c={color}
													secondary
													title="Registrar revisión"
													onPress={() => openForm("camera_event", record)}
												/>
											)}
										</Card>
									))}
								{data && !data.records.length && !busy && (
									<Empty
										c={color}
										title={
											["Inicio", "Recepción", "Dashboard"].includes(section)
												? "Sin comunicados nuevos"
												: "Todo al día"
										}
										detail="Los registros aparecerán aquí cuando se incorporen a tu comunidad."
									/>
								)}
								{data &&
									search &&
									!data.records.some((r) =>
										(r.title + " " + r.detail + " " + r.state)
											.toLocaleLowerCase("es")
											.includes(search.toLocaleLowerCase("es")),
									) && (
										<Text style={[ui.copy, { color: color.muted }]}>
											No hay coincidencias en esta página.
										</Text>
									)}
								{(page > 0 || data?.hasMore) && (
									<View style={[ui.row, { justifyContent: "space-between" }]}>
										<Button
											c={color}
											secondary
											title="Anterior"
											disabled={page === 0 || busy}
											onPress={() => changePage(page - 1)}
										/>
										<Text style={{ color: color.muted }}>
											Página {page + 1}
										</Text>
										<Button
											c={color}
											secondary
											title="Siguiente"
											disabled={!data?.hasMore || busy}
											onPress={() => changePage(page + 1)}
										/>
									</View>
								)}
							</>
						)}
						{Boolean(error) && (
							<Card c={color}>
								<Text
									accessibilityRole="alert"
									style={[ui.copy, { color: color.danger }]}
								>
									{error}
								</Text>
								{member && (
									<Button
										c={color}
										secondary
										title="Volver a intentar"
										onPress={reload}
									/>
								)}
							</Card>
						)}
					</ScrollView>
				)}
				{member && (member.role !== "administrador" || mfaReady) && (
					<View style={s.dock}>
						<Glass c={color}>
							<View style={s.tabRow}>
								{menus[member.role].slice(0, 4).map((tab) => (
									<Pressable
										key={tab}
										accessibilityRole="tab"
										accessibilityState={{ selected: section === tab }}
										accessibilityLabel={tab}
										onPress={() => setSection(tab)}
										style={[
											s.tab,
											{
												backgroundColor:
													section === tab ? color.soft : "transparent",
											},
										]}
									>
										<Icon
											name={sectionIcon(tab)}
											color={section === tab ? color.action : color.muted}
										/>
										<Text
											style={[
												s.tabLabel,
												{ color: section === tab ? color.action : color.muted },
											]}
										>
											{shortNames[tab] ?? tab}
										</Text>
									</Pressable>
								))}
								<Pressable
									accessibilityRole="button"
									accessibilityLabel="Más opciones"
									onPress={() => setMenuOpen(true)}
									style={[
										s.tab,
										{
											backgroundColor: !menus[member.role]
												.slice(0, 4)
												.includes(section)
												? color.soft
												: "transparent",
										},
									]}
								>
									<Icon name="menu" color={color.muted} />
									<Text style={[s.tabLabel, { color: color.muted }]}>Más</Text>
								</Pressable>
							</View>
						</Glass>
					</View>
				)}
			</KeyboardAvoidingView>
			{menuOpen && (
				<Sheet title="Tu espacio" c={color} onClose={() => setMenuOpen(false)}>
					{session && member && (
						<>
							<Text style={[ui.small, { color: color.muted }]}>
								{roleNames[member.role]} · {data?.community ?? "Home Safe"}
							</Text>
							<Card c={color} style={{ padding: 6 }}>
								{[
									...menus[member.role],
									...(planPro && member.role !== "residente"
										? ["Cámaras"]
										: []),
								].map((tab) => (
									<Pressable
										accessibilityRole="button"
										key={tab}
										onPress={() => {
											setMenuOpen(false);
											setSection(tab);
										}}
										style={[
											ui.row,
											{
												padding: 14,
												minHeight: 54,
												borderRadius: 17,
												backgroundColor:
													section === tab ? color.soft : "transparent",
											},
										]}
									>
										<Icon name={sectionIcon(tab)} color={color.action} />
										<Text style={[ui.copy, { color: color.ink, flex: 1 }]}>
											{tab}
										</Text>
										<Icon name="arrow" color={color.muted} size={17} />
									</Pressable>
								))}
							</Card>
						</>
					)}
					<Text style={[ui.cardTitle, { color: color.ink }]}>Apariencia</Text>
					<Text style={[ui.copy, { color: color.muted }]}>
						Elige cómo quieres ver Home Safe.
					</Text>
					<View style={ui.wrap}>
						{(["light", "dark", "system"] as const).map((mode) => (
							<Button
								key={mode}
								c={color}
								title={
									mode === "light"
										? "Claro"
										: mode === "dark"
											? "Oscuro"
											: "Automático"
								}
								icon={
									mode === "light" ? "sun" : mode === "dark" ? "moon" : "system"
								}
								secondary={appearance !== mode}
								onPress={() => changeAppearance(mode)}
							/>
						))}
					</View>
					{session && (
						<>
							<Text style={[ui.cardTitle, { color: color.ink }]}>Cuenta</Text>
							{member && (
								<Button
									c={color}
									secondary
									title="Cambiar de espacio"
									disabled={busy}
									onPress={() => {
										setMember(null);
										setData(null);
										setError("");
										setMenuOpen(false);
									}}
								/>
							)}
							<Button
								c={color}
								secondary
								title="Cerrar sesión"
								icon="logout"
								disabled={busy}
								onPress={() => {
									setMenuOpen(false);
									void signOut();
								}}
							/>
						</>
					)}
					<Text style={[ui.small, { color: color.muted }]}>
						Home Safe · Versión de desarrollo
					</Text>
				</Sheet>
			)}
			{form && member && (
				<FormSheet
					key={form.kind + (form.target?.id ?? "")}
					spec={form}
					member={member}
					c={color}
					onClose={() => setForm(null)}
					onSaved={(warning) => {
						setForm(null);
						setNotice(warning || "El registro se guardó correctamente.");
						reload();
					}}
				/>
			)}
			{scanner && member && (
				<ScannerSheet
					member={member}
					c={color}
					onClose={() => setScanner(false)}
					onSaved={() => {
						setScanner(false);
						setNotice("Ingreso registrado.");
						reload();
					}}
				/>
			)}
			{confirmation && member && (
				<Sheet
					title="Confirmar cambio"
					c={color}
					busy={busy}
					onClose={() => setConfirmation(null)}
				>
					<Text style={[ui.cardTitle, { color: color.ink }]}>
						{confirmation.title}
					</Text>
					<Text style={[ui.copy, { color: color.muted }]}>
						{confirmation.record.title}
					</Text>
					<Text style={[ui.copy, { color: color.muted }]}>
						Se conservará el historial del cambio en la comunidad.
					</Text>
					<Button
						c={color}
						title={busy ? "Guardando…" : "Confirmar"}
						disabled={busy}
						onPress={() => void confirmChange()}
					/>
					<Button
						c={color}
						secondary
						title="Volver"
						disabled={busy}
						onPress={() => setConfirmation(null)}
					/>
					{Boolean(error) && (
						<Text
							accessibilityRole="alert"
							style={[ui.copy, { color: color.danger }]}
						>
							{error}
						</Text>
					)}
				</Sheet>
			)}
		</SafeAreaView>
	);
}
export default function App() {
	return (
		<SafeAreaProvider>
			<HomeSafe />
		</SafeAreaProvider>
	);
}
const shortNames: Record<string, string> = {
	"Mi cuenta": "Cuenta",
	Dashboard: "Inicio",
	Recepción: "Inicio",
	Encomiendas: "Paquetes",
	Residentes: "Personas",
};
const descriptions: Record<string, string> = {
	Inicio: "Tu hogar y sus novedades, en un vistazo.",
	Recepción: "Organiza las llegadas y los pendientes del edificio.",
	Dashboard: "Una visión clara de tu comunidad.",
	Finanzas: "Cobros, saldos y gestión financiera.",
	"Mi cuenta": "Tus gastos comunes, saldos y pagos.",
	Visitas: "Autorizaciones y accesos, sin complicaciones.",
	Encomiendas: "Recepción y entrega de paquetes.",
	Solicitudes: "Un lugar para informar y dar seguimiento.",
	Bitácora: "Lo que ocurre en el edificio, con su historial.",
	Comunicados: "Información que mantiene conectada a tu comunidad.",
	Residentes: "Personas vinculadas y datos de contacto.",
	Unidades: "Organiza las unidades de tu comunidad.",
	Pagos: "Abonos, referencias y comprobantes.",
	Egresos: "Los gastos de la comunidad, en orden.",
	Auditoría: "Trazabilidad de los movimientos registrados.",
	Cámaras: "Revisiones y estado del sistema de seguridad.",
};
const s = StyleSheet.create({
	header: {
		paddingHorizontal: 20,
		paddingVertical: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
		borderBottomWidth: 1,
	},
	brand: { fontSize: 16, fontWeight: "700", letterSpacing: 2 },
	monogram: {
		width: 42,
		height: 42,
		borderRadius: 15,
		alignItems: "center",
		justifyContent: "center",
	},
	round: {
		width: 46,
		height: 46,
		borderRadius: 23,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	content: {
		padding: 20,
		paddingTop: 26,
		paddingBottom: 120,
		gap: 18,
		maxWidth: 760,
		width: "100%",
		alignSelf: "center",
	},
	welcome: { padding: 28, borderRadius: 30, gap: 22, marginBottom: 6 },
	eyebrow: {
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 1.2,
		lineHeight: 19,
	},
	metric: { borderRadius: 25, padding: 23, gap: 12, borderWidth: 1 },
	amount: { fontSize: 34, fontWeight: "700", letterSpacing: -0.7 },
	quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
	quick: {
		width: "48%",
		flexGrow: 1,
		padding: 16,
		borderRadius: 23,
		borderWidth: 1,
		gap: 12,
	},
	search: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		borderWidth: 1,
		borderRadius: 17,
		paddingHorizontal: 14,
	},
	badge: {
		fontSize: 12,
		lineHeight: 18,
		fontWeight: "600",
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 10,
		alignSelf: "flex-start",
	},
	dock: {
		position: "absolute",
		bottom: 8,
		left: 12,
		right: 12,
		maxWidth: 680,
		alignSelf: "center",
		width: "auto",
	},
	tabRow: { flexDirection: "row", padding: 6, gap: 2 },
	tab: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		minHeight: 66,
		paddingHorizontal: 2,
		paddingVertical: 8,
		gap: 5,
		borderRadius: 25,
	},
	tabLabel: {
		fontSize: 11,
		fontWeight: "600",
		textAlign: "center",
		lineHeight: 15,
	},
	qr: {
		padding: 22,
		backgroundColor: "#ffffff",
		borderRadius: 24,
		alignSelf: "center",
	},
});
