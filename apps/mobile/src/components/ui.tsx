import { useEffect, useState, type ReactNode } from "react";
import {
	Platform,
	Pressable,
	StyleSheet,
	Text,
	View,
	type StyleProp,
	type ViewStyle,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import {
	GlassView,
	isLiquidGlassAvailable,
	isGlassEffectAPIAvailable,
} from "expo-glass-effect";
import { BlurView } from "expo-blur";

export const palette = (dark: boolean) => ({
	dark,
	paper: dark ? "#101d22" : "#f3f6f5",
	panel: dark ? "#1a2b31" : "#ffffff",
	ink: dark ? "#f1f7f5" : "#173b42",
	muted: dark ? "#b4c8c7" : "#536e73",
	line: dark ? "#354d53" : "#dce6e3",
	action: dark ? "#b9e0d3" : "#22574f",
	actionText: dark ? "#12382f" : "#ffffff",
	soft: dark ? "#2a413e" : "#e8f1ec",
	danger: dark ? "#ffb9a5" : "#a23f2b",
});
export type Colors = ReturnType<typeof palette>;
const paths: Record<string, string> = {
	home: "M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9",
	wallet: "M3 6h17v15H3V6Zm0 0 14-3v3M16 12h5v5h-5v-5",
	visits:
		"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M17 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.9",
	box: "m3 7 9-4 9 4-9 4-9-4Zm0 0v10l9 4 9-4V7M12 11v10M7.5 5 16.5 9",
	note: "M5 3h14v18H5V3Zm4 5h6M9 12h6M9 16h4",
	message:
		"M21 15a3 3 0 0 1-3 3H9l-6 4V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v9ZM7 8h10M7 12h6",
	camera: "M3 7h12v12H3V7Zm12 4 6-4v12l-6-4",
	building: "M4 21V3h12v18M16 9h4v12M2 21h20M8 7h4M8 11h4M8 15h4M8 21v-2h4v2",
	menu: "M4 6h16M4 12h16M4 18h16",
	close: "m6 6 12 12M6 18 18 6",
	arrow: "m9 5 7 7-7 7",
	plus: "M12 5v14M5 12h14",
	moon: "M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10Z",
	sun: "M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5",
	system: "M3 4h18v13H3V4ZM8 21h8M12 17v4",
	logout: "M9 3H4v18h5M9 12h13m-4-4 4 4-4 4",
	search: "m16 16 5 5",
	check: "m5 12 4 4L19 6",
	qr: "M3 3h6v6H3V3Zm12 0h6v6h-6V3ZM3 15h6v6H3v-6Zm12 0h3v3h3v3h-6v-6Z",
	download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
	shield: "M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7l-9-4Zm-4 9 3 3 5-6",
};
export function Icon({
	name,
	color,
	size = 23,
}: {
	name: string;
	color: string;
	size?: number;
}) {
	return (
		<Svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke={color}
			strokeWidth={1.65}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<Path d={paths[name] ?? paths.note} />
			{name === "visits" && <Circle cx="9" cy="7" r="4" />}
			{name === "sun" && <Circle cx="12" cy="12" r="4" />}
			{name === "search" && <Circle cx="10" cy="10" r="7" />}
		</Svg>
	);
}
export const sectionIcon = (name: string) =>
	({
		Inicio: "home",
		Recepción: "home",
		Dashboard: "home",
		"Mi cuenta": "wallet",
		Finanzas: "wallet",
		Pagos: "wallet",
		Egresos: "wallet",
		Visitas: "visits",
		Encomiendas: "box",
		Solicitudes: "message",
		Comunicados: "message",
		Bitácora: "note",
		Unidades: "building",
		Residentes: "visits",
		Auditoría: "shield",
		Cámaras: "camera",
	})[name] ?? "note";
export function Button({
	title,
	onPress,
	c,
	secondary = false,
	disabled = false,
	icon,
}: {
	title: string;
	onPress: () => void;
	c: Colors;
	secondary?: boolean;
	disabled?: boolean;
	icon?: string;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={title}
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => [
				ui.button,
				{
					backgroundColor: secondary ? c.soft : c.action,
					opacity: disabled || pressed ? 0.6 : 1,
				},
			]}
		>
			{icon && (
				<Icon name={icon} color={secondary ? c.ink : c.actionText} size={19} />
			)}
			<Text
				style={[ui.buttonText, { color: secondary ? c.ink : c.actionText }]}
			>
				{title}
			</Text>
		</Pressable>
	);
}
export function Glass({
	children,
	c,
	style,
}: {
	children: ReactNode;
	c: Colors;
	style?: StyleProp<ViewStyle>;
}) {
	const box = [ui.glass, style];
	if (
		Platform.OS === "ios" &&
		isLiquidGlassAvailable() &&
		isGlassEffectAPIAvailable()
	)
		return (
			<GlassView
				colorScheme={c.dark ? "dark" : "light"}
				glassEffectStyle="regular"
				style={box}
			>
				{children}
			</GlassView>
		);
	if (Platform.OS === "ios" || Platform.OS === "web")
		return (
			<BlurView
				intensity={75}
				tint={c.dark ? "dark" : "light"}
				style={[box, { borderWidth: 1, borderColor: c.line }]}
			>
				{children}
			</BlurView>
		);
	return (
		<View
			style={[
				box,
				{
					backgroundColor: c.dark ? "#20343b" : "#f9fcfb",
					borderWidth: 1,
					borderColor: c.line,
				},
			]}
		>
			{children}
		</View>
	);
}
export function Card({
	children,
	c,
	style,
}: {
	children: ReactNode;
	c: Colors;
	style?: StyleProp<ViewStyle>;
}) {
	return (
		<View
			style={[
				ui.card,
				{ backgroundColor: c.panel, borderColor: c.line },
				style,
			]}
		>
			{children}
		</View>
	);
}
export function Empty({
	title,
	detail,
	c,
}: {
	title: string;
	detail: string;
	c: Colors;
}) {
	return (
		<Card c={c} style={{ alignItems: "center", paddingVertical: 32 }}>
			<View style={[ui.iconTile, { backgroundColor: c.soft }]}>
				<Icon name="check" color={c.action} />
			</View>
			<Text style={[ui.cardTitle, { color: c.ink, textAlign: "center" }]}>
				{title}
			</Text>
			<Text style={[ui.copy, { color: c.muted, textAlign: "center" }]}>
				{detail}
			</Text>
		</Card>
	);
}
export const ui = StyleSheet.create({
	button: {
		minHeight: 50,
		paddingHorizontal: 17,
		paddingVertical: 13,
		borderRadius: 17,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 9,
	},
	buttonText: {
		fontSize: 16,
		fontWeight: "600",
		flexShrink: 1,
		textAlign: "center",
	},
	card: { padding: 20, borderWidth: 1, borderRadius: 24, gap: 12 },
	cardTitle: { fontSize: 20, fontWeight: "600", lineHeight: 27 },
	copy: { fontSize: 16, lineHeight: 25 },
	label: { fontSize: 15, fontWeight: "600", lineHeight: 22 },
	input: {
		fontSize: 17,
		padding: 15,
		borderWidth: 1,
		borderRadius: 16,
		minHeight: 54,
	},
	glass: { borderRadius: 32, overflow: "hidden" },
	iconTile: {
		width: 48,
		height: 48,
		borderRadius: 17,
		alignItems: "center",
		justifyContent: "center",
	},
	row: { flexDirection: "row", alignItems: "center", gap: 12 },
	wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	small: { fontSize: 13, lineHeight: 19 },
	title: {
		fontSize: 32,
		fontWeight: "700",
		lineHeight: 39,
		letterSpacing: -0.7,
	},
});

export function useNow() {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 30000);
		return () => clearInterval(timer);
	}, []);
	return now;
}
