import "react-native-url-polyfill/auto";
import { AppState, Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

// A new generation is fully written before replacing the manifest.
const secureStorage = {
	async getItem(key: string) {
		if (Platform.OS === "web") return null;
		const manifest = await SecureStore.getItemAsync(key);
		if (!manifest) return null;
		const { generation, count } = JSON.parse(manifest) as {
			generation: string;
			count: number;
		};
		if (!Number.isInteger(count) || count < 1 || count > 100) return null;
		const chunks = await Promise.all(
			Array.from({ length: count }, (_, i) =>
				SecureStore.getItemAsync(key + "." + generation + "." + i),
			),
		);
		return chunks.every((chunk) => chunk !== null) ? chunks.join("") : null;
	},
	async setItem(key: string, value: string) {
		if (Platform.OS === "web") return;
		const previous = await SecureStore.getItemAsync(key);
		const generation =
			Date.now().toString(36) + Math.random().toString(36).slice(2);
		const count = Math.ceil(value.length / 1000);
		if (count > 100) throw new Error("SESSION_TOO_LARGE");
		await Promise.all(
			Array.from({ length: count }, (_, i) =>
				SecureStore.setItemAsync(
					key + "." + generation + "." + i,
					value.slice(i * 1000, (i + 1) * 1000),
					{ keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
				),
			),
		);
		await SecureStore.setItemAsync(key, JSON.stringify({ generation, count }), {
			keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
		});
		if (previous) {
			const old = JSON.parse(previous) as { generation: string; count: number };
			await Promise.all(
				Array.from({ length: Math.min(old.count, 100) }, (_, i) =>
					SecureStore.deleteItemAsync(key + "." + old.generation + "." + i),
				),
			);
		}
	},
	async removeItem(key: string) {
		if (Platform.OS === "web") return;
		const previous = await SecureStore.getItemAsync(key);
		await SecureStore.deleteItemAsync(key);
		if (previous) {
			const old = JSON.parse(previous) as { generation: string; count: number };
			await Promise.all(
				Array.from({ length: Math.min(old.count, 100) }, (_, i) =>
					SecureStore.deleteItemAsync(key + "." + old.generation + "." + i),
				),
			);
		}
	},
};
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(url && key);
export const supabase = createClient(
	url || "https://invalid.supabase.co",
	key || "not-configured",
	{
		auth: {
			storage: secureStorage,
			persistSession: Platform.OS !== "web",
			autoRefreshToken: true,
			detectSessionInUrl: false,
		},
	},
);
if (Platform.OS !== "web") {
	AppState.addEventListener("change", (state) => {
		if (state === "active") supabase.auth.startAutoRefresh();
		else supabase.auth.stopAutoRefresh();
	});
}
