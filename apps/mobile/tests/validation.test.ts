import assert from "node:assert/strict";
import test from "node:test";
import { validate } from "../src/validation.ts";
const field = (key: string, type?: string) => ({ key, label: key, type });
const spec = (kind: string, fields: unknown[]) => ({
	kind,
	title: "Prueba",
	fields,
	values: {},
});
test("vehicle and email are optional for a visit", () => {
	const form = spec("visit", [
		field("visitor_name"),
		field("valid_from"),
		field("valid_until"),
		{ ...field("visitor_email", "email"), optional: true },
		{ ...field("vehicle_plate"), optional: true },
	]);
	const v = {
		visitor_name: "Visita de prueba",
		valid_from: new Date(Date.now() + 60000).toISOString(),
		valid_until: new Date(Date.now() + 3600000).toISOString(),
	};
	assert.doesNotThrow(() => validate(form as never, v));
	assert.throws(
		() => validate(form as never, { ...v, vehicle_plate: "??123" }),
		/patente/i,
	);
	assert.throws(
		() => validate(form as never, { ...v, visitor_email: "not-an-email" }),
		/correo/i,
	);
});
test("visit rejects expired, inverted and longer-than-seven-day windows", () => {
	const form = spec("visit", []);
	const now = Date.now();
	for (const [from, until] of [
		[now - 2000, now - 1000],
		[now + 2000, now + 1000],
		[now, now + 8 * 86400000],
	])
		assert.throws(
			() =>
				validate(form as never, {
					valid_from: new Date(from).toISOString(),
					valid_until: new Date(until).toISOString(),
				}),
			/visita/i,
		);
});
test("financial amounts reject decimals, negatives, zero and excess", () => {
	const form = spec("payment", [field("amount", "number")]);
	for (const amount of ["0", "-1", "1.5", "1e3", "9000000000001"])
		assert.throws(() => validate(form as never, { amount }), /monto/i);
	for (const amount of ["1", "9000000000000"])
		assert.doesNotThrow(() => validate(form as never, { amount }));
});
test("choices cannot include values outside the supplied options", () => {
	const form = spec("resident", [
		{
			...field("relationship", "choice"),
			choices: [{ value: "tenant", label: "Arrendatario" }],
		},
	]);
	assert.throws(
		() => validate(form as never, { relationship: "administrador" }),
		/opción/i,
	);
	assert.doesNotThrow(() =>
		validate(form as never, { relationship: "tenant" }),
	);
});
test("charge period and calendar dates must be valid", () => {
	const form = spec("charge", [field("date", "date")]);
	assert.throws(
		() => validate(form as never, { period: "2026-13", date: "2026-11-05" }),
		/período/i,
	);
	assert.throws(
		() => validate(form as never, { period: "2026-02", date: "2026-02-31" }),
		/fecha/i,
	);
	assert.doesNotThrow(() =>
		validate(form as never, { period: "2028-02", date: "2028-02-29" }),
	);
});
test("length limits apply before a request is submitted", () => {
	const form = spec("note", [{ ...field("body"), min: 3, max: 2000 }]);
	assert.throws(() => validate(form as never, { body: "  " }), /completa/i);
	assert.throws(
		() => validate(form as never, { body: "a".repeat(2001) }),
		/máximo/i,
	);
});
