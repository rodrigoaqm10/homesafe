import { useState, useRef, type ReactNode } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Linking,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button, Card, Icon, ui, useNow, type Colors } from "./ui";
import { date, type Membership, type Row } from "../portal";
import {
	lookupVisit,
	submitForm,
	transition,
	type FormSpec,
} from "../operations";
export function Sheet({
	title,
	children,
	onClose,
	c,
	busy = false,
}: {
	title: string;
	children: ReactNode;
	onClose: () => void;
	c: Colors;
	busy?: boolean;
}) {
	return (
		<Modal
			animationType="slide"
			onRequestClose={() => {
				if (!busy) onClose();
			}}
		>
			<SafeAreaView style={{ flex: 1, backgroundColor: c.paper }}>
				<KeyboardAvoidingView
					style={{ flex: 1 }}
					behavior={Platform.OS === "ios" ? "padding" : undefined}
				>
					<View
						style={[
							ui.row,
							{
								justifyContent: "space-between",
								padding: 20,
								borderBottomWidth: 1,
								borderColor: c.line,
							},
						]}
					>
						<Text style={[ui.cardTitle, { color: c.ink, flex: 1 }]}>
							{title}
						</Text>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Cerrar"
							disabled={busy}
							onPress={onClose}
							style={{ padding: 12 }}
						>
							<Icon name="close" color={c.ink} />
						</Pressable>
					</View>
					<ScrollView
						keyboardShouldPersistTaps="handled"
						contentContainerStyle={{
							padding: 20,
							paddingBottom: 48,
							gap: 18,
							maxWidth: 720,
							width: "100%",
							alignSelf: "center",
						}}
					>
						{children}
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</Modal>
	);
}
export function FormSheet({
	spec,
	member,
	c,
	onClose,
	onSaved,
}: {
	spec: FormSpec;
	member: Membership;
	c: Colors;
	onClose: () => void;
	onSaved: (warning: string) => void;
}) {
	const [initialDate] = useState(() => new Date());
	const [values, setValues] = useState<Record<string, string>>(spec.values);
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const submitting = useRef(false);
	const [picker, setPicker] = useState<{
		key: string;
		mode: "date" | "time";
	} | null>(null);
	const set = (key: string, value: string) =>
		setValues((old) => ({ ...old, [key]: value }));
	async function save() {
		if (submitting.current) return;
		submitting.current = true;
		setBusy(true);
		setError("");
		try {
			const result = await submitForm(member, spec, values);
			onSaved(result.warning);
		} catch (e) {
			setError(e instanceof Error ? e.message : "No se pudo guardar.");
		} finally {
			submitting.current = false;
			setBusy(false);
		}
	}
	const pickerValue = picker
		? values[picker.key]?.length === 10
			? new Date(values[picker.key] + "T12:00:00")
			: new Date(values[picker.key] ?? initialDate)
		: initialDate;
	return (
		<Sheet title={spec.title} onClose={onClose} c={c} busy={busy}>
			{Boolean(spec.description) && (
				<Text style={[ui.copy, { color: c.muted }]}>{spec.description}</Text>
			)}
			{spec.fields.map((f) => (
				<View key={f.key} style={{ gap: 9 }}>
					<Text style={[ui.label, { color: c.ink }]}>{f.label}</Text>
					{f.type === "choice" ? (
						<View style={ui.wrap}>
							{f.choices?.map((o) => (
								<Pressable
									key={o.value}
									disabled={busy}
									accessibilityRole="radio"
									accessibilityState={{ selected: values[f.key] === o.value }}
									onPress={() => set(f.key, o.value)}
									style={{
										minHeight: 48,
										padding: 13,
										borderRadius: 15,
										backgroundColor:
											values[f.key] === o.value ? c.action : c.panel,
										borderWidth: 1,
										borderColor: c.line,
									}}
								>
									<Text
										style={{
											fontSize: 16,
											color: values[f.key] === o.value ? c.actionText : c.ink,
										}}
									>
										{o.label}
									</Text>
								</Pressable>
							))}
							{!f.choices?.length && (
								<Text style={{ color: c.muted }}>
									Primero registra una unidad desde administración.
								</Text>
							)}
						</View>
					) : f.type === "date" || f.type === "datetime" ? (
						<View style={{ gap: 8 }}>
							{Platform.OS === "web" ? (
								<TextInput
									accessibilityLabel={f.label}
									placeholder={
										f.type === "date"
											? "AAAA-MM-DD"
											: "2026-11-05T12:00:00-03:00"
									}
									placeholderTextColor={c.muted}
									value={values[f.key] ?? ""}
									onChangeText={(v) => set(f.key, v)}
									style={[
										ui.input,
										{
											color: c.ink,
											backgroundColor: c.panel,
											borderColor: c.line,
										},
									]}
								/>
							) : (
								<>
									<Text style={[ui.copy, { color: c.ink }]}>
										{values[f.key]
											? f.type === "date"
												? values[f.key]
												: date(values[f.key])
											: "Seleccionar fecha"}
									</Text>
									<View style={ui.wrap}>
										<Button
											c={c}
											secondary
											title="Elegir fecha"
											onPress={() => setPicker({ key: f.key, mode: "date" })}
										/>
										{f.type === "datetime" && (
											<Button
												c={c}
												secondary
												title="Elegir hora"
												onPress={() => setPicker({ key: f.key, mode: "time" })}
											/>
										)}
									</View>
								</>
							)}
						</View>
					) : (
						<TextInput
							accessibilityLabel={f.label}
							editable={!busy}
							placeholderTextColor={c.muted}
							value={values[f.key] ?? ""}
							onChangeText={(v) =>
								set(
									f.key,
									f.key === "vehicle_plate"
										? v.toUpperCase().replace(/[\s-]/g, "")
										: v,
								)
							}
							maxLength={f.max}
							multiline={f.type === "multiline"}
							keyboardType={
								f.type === "email"
									? "email-address"
									: f.type === "phone"
										? "phone-pad"
										: f.type === "number"
											? "number-pad"
											: "default"
							}
							autoCapitalize={
								f.type === "email"
									? "none"
									: f.key === "vehicle_plate"
										? "characters"
										: "sentences"
							}
							style={[
								ui.input,
								{ color: c.ink, backgroundColor: c.panel, borderColor: c.line },
								f.type === "multiline"
									? { minHeight: 150, textAlignVertical: "top" }
									: {},
							]}
						/>
					)}
				</View>
			))}
			{picker && Platform.OS !== "web" && (
				<View style={{ gap: 10 }}>
					<DateTimePicker
						value={
							Number.isNaN(pickerValue.getTime()) ? initialDate : pickerValue
						}
						mode={picker.mode}
						display={Platform.OS === "ios" ? "spinner" : "default"}
						themeVariant={c.dark ? "dark" : "light"}
						onChange={(event, selected) => {
							if (Platform.OS === "android") setPicker(null);
							if (event.type === "dismissed" || !selected) return;
							const field = spec.fields.find((f) => f.key === picker.key);
							if (field?.type === "date")
								set(
									picker.key,
									[
										selected.getFullYear(),
										String(selected.getMonth() + 1).padStart(2, "0"),
										String(selected.getDate()).padStart(2, "0"),
									].join("-"),
								);
							else set(picker.key, selected.toISOString());
						}}
					/>
					{Platform.OS === "ios" && (
						<Button
							c={c}
							title="Confirmar fecha y hora"
							onPress={() => setPicker(null)}
						/>
					)}
				</View>
			)}
			{Boolean(error) && (
				<Text accessibilityRole="alert" style={[ui.copy, { color: c.danger }]}>
					{error}
				</Text>
			)}
			<Button
				c={c}
				disabled={busy}
				title={busy ? "Guardando…" : "Guardar"}
				onPress={() => void save()}
				icon="check"
			/>
			{busy && <ActivityIndicator color={c.action} />}
		</Sheet>
	);
}
export function ScannerSheet({
	member,
	c,
	onClose,
	onSaved,
}: {
	member: Membership;
	c: Colors;
	onClose: () => void;
	onSaved: () => void;
}) {
	const [permission, requestPermission] = useCameraPermissions();
	const [visit, setVisit] = useState<Row | null>(null);
	const [manual, setManual] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const reading = useRef(false);
	const [scanned, setScanned] = useState(false);
	const now = useNow();
	async function lookup(code: string) {
		if (reading.current) return;
		reading.current = true;
		setScanned(true);
		setBusy(true);
		setError("");
		try {
			setVisit(await lookupVisit(member, code));
		} catch (e) {
			setError(e instanceof Error ? e.message : "No se pudo leer el QR.");
		} finally {
			setBusy(false);
		}
	}
	async function admit() {
		if (!visit) return;
		setBusy(true);
		try {
			await transition(
				member,
				{
					id: visit.id,
					title: visit.visitor_name,
					detail: "",
					raw: visit,
					kind: "visit",
				},
				"arrived",
			);
			onSaved();
		} catch (e) {
			setError(
				e instanceof Error ? e.message : "No se pudo registrar el ingreso.",
			);
			setBusy(false);
		}
	}
	const valid =
		visit &&
		visit.status === "authorized" &&
		Date.parse(visit.valid_from) <= now &&
		Date.parse(visit.valid_until) >= now;
	return (
		<Sheet title="Revisar QR de visita" c={c} onClose={onClose} busy={busy}>
			<Text style={[ui.copy, { color: c.muted }]}>
				Escanea el QR y revisa los datos antes de confirmar el ingreso.
			</Text>
			{!visit && permission?.granted && !scanned && (
				<CameraView
					style={{ height: 280, borderRadius: 24, overflow: "hidden" }}
					facing="back"
					barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
					onBarcodeScanned={(r) => void lookup(r.data)}
				/>
			)}
			{!permission?.granted && !visit && (
				<Button
					c={c}
					title="Permitir cámara"
					onPress={() => {
						if (permission?.canAskAgain === false) void Linking.openSettings();
						else void requestPermission();
					}}
				/>
			)}
			{!visit && (
				<>
					<Text style={[ui.label, { color: c.ink }]}>
						También puedes pegar el código de la visita
					</Text>
					<TextInput
						accessibilityLabel="Código de visita"
						value={manual}
						autoCapitalize="none"
						onChangeText={setManual}
						style={[
							ui.input,
							{ color: c.ink, borderColor: c.line, backgroundColor: c.panel },
						]}
					/>
					<Button
						c={c}
						disabled={busy}
						title="Buscar autorización"
						onPress={() => {
							reading.current = false;
							setScanned(false);
							void lookup(manual);
						}}
					/>
				</>
			)}
			{visit && (
				<Card c={c}>
					<Text style={[ui.cardTitle, { color: c.ink }]}>
						{visit.visitor_name}
					</Text>
					<Text style={[ui.copy, { color: c.muted }]}>
						{date(visit.valid_from)} a {date(visit.valid_until)}
						{visit.vehicle_plate ? "\nPatente " + visit.vehicle_plate : ""}
					</Text>
					<Text style={[ui.copy, { color: valid ? c.action : c.danger }]}>
						{valid
							? "Autorización vigente"
							: "Esta visita no está autorizada para ingresar ahora."}
					</Text>
					{valid && (
						<Button
							c={c}
							title="Confirmar ingreso"
							disabled={busy}
							onPress={() => void admit()}
						/>
					)}
				</Card>
			)}
			{Boolean(error) && (
				<Text accessibilityRole="alert" style={[ui.copy, { color: c.danger }]}>
					{error}
				</Text>
			)}
			{scanned && !busy && (
				<Button
					c={c}
					secondary
					title="Leer otro QR"
					onPress={() => {
						reading.current = false;
						setVisit(null);
						setError("");
					}}
				/>
			)}
			{busy && <ActivityIndicator color={c.action} />}
		</Sheet>
	);
}
