import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  initialState,
  validateVisit,
  visibleRecords,
  visitTransition,
} from '../src/modules/community/domain/demo-workflows.ts';

test('resident sees own unit, never another unit', () => {
  const records = visibleRecords(initialState().visits, 'residente', 'A-502');
  assert.equal(records.length, 1);
  assert.ok(records.every((v) => v.unit === 'A-502'));
});
test('concierge can register arrival and departure in order', () => {
  const visit = initialState().visits[0];
  const arrived = visitTransition(visit, 'Ingresada', 'conserje', '');
  assert.equal(
    visitTransition(arrived, 'Finalizada', 'conserje', '').status,
    'Finalizada',
  );
  assert.equal(visit.status, 'Autorizada');
});
test('resident cannot register arrival or cancel another unit', () => {
  assert.throws(() =>
    visitTransition(
      initialState().visits[0],
      'Ingresada',
      'residente',
      'A-502',
    ),
  );
  assert.throws(() =>
    visitTransition(
      { ...initialState().visits[0], unit: 'B-204' },
      'Cancelada',
      'residente',
      'A-502',
    ),
  );
});
test('cancelled and finished visits cannot re-enter', () => {
  for (const status of ['Cancelada', 'Finalizada'] as const)
    assert.throws(() =>
      visitTransition(
        { ...initialState().visits[0], status },
        'Ingresada',
        'administrador',
        '',
      ),
    );
});
test('reject skipping arrival and invalid dates', () => {
  assert.throws(() =>
    visitTransition(initialState().visits[0], 'Finalizada', 'conserje', ''),
  );
  assert.throws(() => validateVisit('Ejemplo', '2026-02-31'));
  assert.throws(() => validateVisit('x', '2026-11-05'));
  validateVisit('Visita de prueba', '2026-11-05');
});
