import { useEffect, useState, type ReactNode } from "react";
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Linking,
	Platform,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	View,
	useColorScheme,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { StatusBar } from "expo-status-bar";
import QRCode from "react-native-qrcode-svg";
import type { Session } from "@supabase/supabase-js";
import { configured, supabase } from "../supabase";
import { router, useLocalSearchParams } from "expo-router";
import { loadPortal, menus, type Membership, type PortalData } from "../portal";

const web = "https://homesafe-real.vercel.app";
const roleNames = {
	residente: "Residente",
	conserje: "Conserjería",
	administrador: "Administración",
};

function Surface({ children, dark }: { children: ReactNode; dark: boolean }) {
	if (Platform.OS === "ios" && isLiquidGlassAvailable()) {
		return (
			<GlassView
				colorScheme={dark ? "dark" : "light"}
				glassEffectStyle="regular"
				style={styles.glass}
			>
				{children}
			</GlassView>
		);
	}
	return (
		<View
			style={[styles.glass, { backgroundColor: dark ? "#24383c" : "#e8efeb" }]}
		>
			{children}
		</View>
	);
}

function HomeSafe() {
	const system = useColorScheme();
	const [dark, setDark] = useState(system === "dark");
	const color = {
		paper: dark ? "#142125" : "#f5f5f0",
		panel: dark ? "#1e3035" : "#ffffff",
		ink: dark ? "#edf3f1" : "#203b42",
		muted: dark ? "#b9ceca" : "#526a6d",
		line: dark ? "#46605f" : "#cfdad4",
		action: dark ? "#b8dcd2" : "#244b51",
		actionText: dark ? "#173339" : "#ffffff",
	};
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
		if (value !== section) {
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
	const [note, setNote] = useState("");
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
					setNote("");
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
			const next = await loadPortal(member, section);
			if (live) setData(next);
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
	}, [member, section, refresh]);

	const label = (text: string) => (
		<Text style={[styles.label, { color: color.ink }]}>{text}</Text>
	);
	const button = (text: string, action: () => void, secondary = false) => (
		<Pressable
			accessibilityRole="button"
			disabled={busy}
			onPress={action}
			style={({ pressed }) => [
				styles.button,
				{
					backgroundColor: secondary ? "transparent" : color.action,
					borderColor: color.line,
					borderWidth: secondary ? 1 : 0,
					opacity: busy || pressed ? 0.65 : 1,
				},
			]}
		>
			<Text
				style={[
					styles.buttonText,
					{ color: secondary ? color.ink : color.actionText },
				]}
			>
				{text}
			</Text>
		</Pressable>
	);
	const inputStyle = [
		styles.input,
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
	async function saveNote() {
		if (!member || member.role !== "conserje" || note.trim().length < 3) return;
		setBusy(true);
		setError("");
		const result = await supabase.from("shift_notes").insert({
			organization_id: member.organization_id,
			community_id: member.community_id,
			body: note.trim(),
		});
		if (result.error) setError("No se pudo guardar la anotación.");
		else {
			setNote("");
			setRefresh((value) => value + 1);
			Alert.alert(
				"Anotación guardada",
				"La administración puede consultar este registro.",
			);
		}
		setBusy(false);
	}

	return (
		<SafeAreaView style={[styles.safe, { backgroundColor: color.paper }]}>
			<StatusBar style={dark ? "light" : "dark"} />
			<KeyboardAvoidingView
				style={styles.safe}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<View style={[styles.header, { borderColor: color.line }]}>
					<Text style={[styles.brand, { color: color.ink }]}>HOME SAFE</Text>
					<View style={styles.theme}>
						<Text style={{ color: color.muted }}>Oscuro</Text>
						<Switch
							accessibilityLabel="Modo oscuro"
							value={dark}
							onValueChange={setDark}
						/>
					</View>
				</View>
				{initializing ? (
					<ActivityIndicator style={styles.loader} color={color.action} />
				) : (
					<ScrollView
						keyboardShouldPersistTaps="handled"
						contentContainerStyle={styles.content}
						refreshControl={
							member ? (
								<RefreshControl
									refreshing={busy}
									onRefresh={() => setRefresh((v) => v + 1)}
								/>
							) : undefined
						}
					>
						{!configured ? (
							<Text style={{ color: color.ink }}>
								Falta configurar la conexión de Home Safe.
							</Text>
						) : !session ? (
							<>
								<Text style={[styles.eyebrow, { color: color.muted }]}>
									TU COMUNIDAD, CONTIGO
								</Text>
								<Text style={[styles.title, { color: color.ink }]}>
									Bienvenido a casa
								</Text>
								<Text style={[styles.copy, { color: color.muted }]}>
									Ingresa con tu cuenta para abrir tu espacio de residente,
									conserjería o administración.
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
								{button("Ingresar", () => {
									void login();
								})}
							</>
						) : !member ? (
							<>
								<Text style={[styles.title, { color: color.ink }]}>
									Mis accesos
								</Text>
								<Text style={[styles.copy, { color: color.muted }]}>
									Elige el espacio asignado a tu cuenta.
								</Text>
								{members.map((item) => (
									<View
										key={item.id}
										style={[
											styles.card,
											{ backgroundColor: color.panel, borderColor: color.line },
										]}
									>
										<Text style={[styles.cardTitle, { color: color.ink }]}>
											{roleNames[item.role]}
										</Text>
										{button("Abrir mi espacio", () => {
											setSection(menus[item.role][0]);
											setData(null);
											setError("");
											setSelectedQr(null);
											setMfaReady(false);
											setBusy(true);
											setNote("");
											setMember(item);
										})}
									</View>
								))}
								{!busy && !members.length && (
									<Text style={{ color: color.muted }}>
										Tu cuenta todavía no tiene accesos asignados.
									</Text>
								)}
							</>
						) : member.role === "administrador" && !mfaReady ? (
							<>
								<Text style={[styles.title, { color: color.ink }]}>
									Verifica tu acceso
								</Text>
								<Text style={[styles.copy, { color: color.muted }]}>
									Ingresa el código de seis dígitos de tu autenticador.
								</Text>
								<TextInput
									accessibilityLabel="Código de autenticación"
									value={code}
									onChangeText={(value) =>
										setCode(value.replace(/[^0-9]/g, ""))
									}
									maxLength={6}
									keyboardType="number-pad"
									style={inputStyle}
								/>
								{button("Verificar", () => {
									void verifyMfa();
								})}
								{button(
									"Configurar en la web",
									() => {
										void Linking.openURL(web + "/seguridad");
									},
									true,
								)}
							</>
						) : (
							<>
								<Text style={[styles.eyebrow, { color: color.muted }]}>
									{roleNames[member.role]}
									{data?.unit ? " · " + data.unit : ""}
								</Text>
								<Text style={[styles.title, { color: color.ink }]}>
									{section}
								</Text>
								{data && (
									<Text style={[styles.copy, { color: color.muted }]}>
										{data.community}
									</Text>
								)}
								<Surface dark={dark}>
									<ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										contentContainerStyle={styles.nav}
									>
										{menus[member.role].map((tab) => (
											<Pressable
												key={tab}
												accessibilityRole="tab"
												accessibilityState={{ selected: section === tab }}
												onPress={() => setSection(tab)}
												style={[
													styles.navItem,
													{
														backgroundColor:
															section === tab ? color.action : "transparent",
													},
												]}
											>
												<Text
													style={[
														styles.navText,
														{
															color:
																section === tab ? color.actionText : color.ink,
														},
													]}
												>
													{tab}
												</Text>
											</Pressable>
										))}
									</ScrollView>
								</Surface>
								{busy && <ActivityIndicator color={color.action} />}
								{data?.metrics.map((metric) => (
									<View
										key={metric.label}
										style={[
											styles.card,
											{ backgroundColor: color.panel, borderColor: color.line },
										]}
									>
										<Text style={{ color: color.muted }}>{metric.label}</Text>
										<Text style={[styles.amount, { color: color.ink }]}>
											{metric.value}
										</Text>
									</View>
								))}
								{member.role === "conserje" && section === "Bitácora" && (
									<>
										<Text style={[styles.copy, { color: color.muted }]}>
											Las anotaciones de turno quedan disponibles para
											administración. La asistencia y el relevo requieren un
											registro separado.
										</Text>
										{label("Nueva anotación")}
										<TextInput
											accessibilityLabel="Anotación de turno"
											multiline
											maxLength={2000}
											value={note}
											onChangeText={setNote}
											style={[inputStyle, styles.multiline]}
										/>
										{button("Guardar anotación", () => {
											void saveNote();
										})}
									</>
								)}
								{data?.records.map((record) => (
									<View
										key={record.id}
										style={[
											styles.card,
											{ backgroundColor: color.panel, borderColor: color.line },
										]}
									>
										{record.state && (
											<Text style={[styles.badge, { color: color.muted }]}>
												{record.state}
											</Text>
										)}
										<Text style={[styles.cardTitle, { color: color.ink }]}>
											{record.title}
										</Text>
										<Text style={[styles.copy, { color: color.muted }]}>
											{record.detail}
										</Text>
										{record.code && member.role === "residente" && (
											<>
												{button(
													selectedQr === record.id
														? "Ocultar QR"
														: "Mostrar QR",
													() =>
														setSelectedQr(
															selectedQr === record.id ? null : record.id,
														),
													true,
												)}
												{selectedQr === record.id && (
													<View style={styles.qr}>
														<QRCode value={record.code} size={190} />
													</View>
												)}
											</>
										)}
									</View>
								))}
								{data && !data.records.length && data.metrics.length === 0 && (
									<Text style={[styles.copy, { color: color.muted }]}>
										Todavía no hay registros para esta sección.
									</Text>
								)}
							</>
						)}
						{error && (
							<View
								accessibilityRole="alert"
								style={[
									styles.card,
									{ borderColor: color.line, backgroundColor: color.panel },
								]}
							>
								<Text style={{ color: color.ink }}>{error}</Text>
								{member &&
									button(
										"Volver a intentar",
										() => setRefresh((v) => v + 1),
										true,
									)}
							</View>
						)}
						{session && (
							<>
								{member &&
									button(
										"Cambiar de espacio",
										() => {
											setMember(null);
											setData(null);
											setError("");
										},
										true,
									)}
								{button(
									"Cerrar sesión",
									() => {
										void signOut();
									},
									true,
								)}
							</>
						)}
					</ScrollView>
				)}
			</KeyboardAvoidingView>
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
const styles = StyleSheet.create({
	safe: { flex: 1 },
	header: {
		paddingHorizontal: 22,
		paddingVertical: 12,
		borderBottomWidth: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
	},
	brand: { fontWeight: "700", letterSpacing: 2, fontSize: 17 },
	theme: { flexDirection: "row", alignItems: "center", gap: 6 },
	loader: { marginTop: 60 },
	content: {
		padding: 22,
		paddingBottom: 48,
		gap: 14,
		maxWidth: 720,
		width: "100%",
		alignSelf: "center",
	},
	eyebrow: { fontSize: 13, fontWeight: "600", letterSpacing: 1 },
	title: { fontSize: 32, fontWeight: "600", lineHeight: 38 },
	copy: { fontSize: 16, lineHeight: 25 },
	label: { fontSize: 16, fontWeight: "500" },
	input: {
		fontSize: 17,
		padding: 15,
		borderWidth: 1,
		borderRadius: 12,
		minHeight: 52,
	},
	button: {
		paddingHorizontal: 18,
		paddingVertical: 15,
		minHeight: 50,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	buttonText: { fontSize: 16, fontWeight: "600" },
	card: { padding: 20, borderWidth: 1, borderRadius: 16, gap: 12 },
	cardTitle: { fontSize: 20, fontWeight: "600" },
	badge: { fontSize: 14 },
	amount: { fontSize: 30, fontWeight: "600" },
	glass: { borderRadius: 18, overflow: "hidden", marginVertical: 4 },
	nav: { padding: 6, gap: 4 },
	navItem: {
		padding: 12,
		minHeight: 46,
		borderRadius: 12,
		justifyContent: "center",
	},
	navText: { fontSize: 15, fontWeight: "500" },
	multiline: { minHeight: 120, textAlignVertical: "top" },
	qr: {
		backgroundColor: "#fff",
		padding: 20,
		alignItems: "center",
		borderRadius: 12,
		alignSelf: "center",
	},
});
