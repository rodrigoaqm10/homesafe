import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { supabase } from "./supabase";
import type { Membership } from "./portal";
export async function shareBytes(
	bytes: Uint8Array,
	name: string,
	mime: string,
) {
	if (Platform.OS === "web")
		throw new Error(
			"Abre la app en Android o iPhone para guardar y compartir archivos.",
		);
	if (!(await Sharing.isAvailableAsync()))
		throw new Error("Este dispositivo no permite compartir archivos.");
	const file = new File(Paths.cache, Date.now() + "-" + name);
	await file.write(bytes);
	try {
		await Sharing.shareAsync(file.uri, { mimeType: mime, dialogTitle: name });
	} finally {
		if (file.exists) await file.delete();
	}
}
export async function downloadFile(
	member: Membership,
	action: string,
	extra: Record<string, string>,
	name: string,
	mime: string,
) {
	const session = await supabase.auth.getSession();
	const token = session.data.session?.access_token;
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
			signal: AbortSignal.timeout(60000),
		},
	);
	if (!response.ok) {
		const body = await response.json().catch(() => null);
		throw new Error(body?.error ?? "No se pudo preparar el documento.");
	}
	await shareBytes(new Uint8Array(await response.arrayBuffer()), name, mime);
}
