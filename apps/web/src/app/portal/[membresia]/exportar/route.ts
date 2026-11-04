import writeExcelFile from 'write-excel-file/node';
import { money } from '@/modules/finance/domain/money';
import {
  financeDownload,
  financePdf,
} from '@/modules/finance/infrastructure/pdf';
import { requireMembership } from '@/modules/identity/infrastructure/session';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ membresia: string }> },
) {
  const { client, member } = await requireMembership((await params).membresia);
  if (member.role !== 'administrador')
    return new Response(null, { status: 403 });
  const format = new URL(request.url).searchParams.get('formato');
  if (format !== 'pdf' && format !== 'xlsx')
    return new Response(null, { status: 400 });
  const scope = (table: string, columns: string) =>
    client
      .from(table)
      .select(columns)
      .eq('organization_id', member.organization_id)
      .eq('community_id', member.community_id);
  async function all(table: string, columns: string) {
    const rows: Record<string, unknown>[] = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await scope(table, columns)
        .order('id')
        .range(offset, offset + pageSize - 1);
      if (error) throw new Error('REPORT_QUERY_FAILED');
      rows.push(...((data ?? []) as unknown as Record<string, unknown>[]));
      if (!data || data.length < pageSize) return rows;
    }
  }
  try {
    const [community, units, charges, payments, expenses] = await Promise.all([
      client
        .from('communities')
        .select('name')
        .eq('id', member.community_id)
        .eq('organization_id', member.organization_id)
        .single(),
      all('units', 'id,label'),
      all(
        'finance_charge_balances',
        'id,unit_id,description,due_date,amount_clp,paid_clp,balance_clp,voided_at',
      ),
      all(
        'finance_payment_history',
        'id,unit_id,charge_description,created_at,kind,method,reference,amount_clp',
      ),
      all(
        'expenses',
        'id,description,category,expense_date,amount_clp,voided_at',
      ),
    ]);
    if (community.error) throw new Error('COMMUNITY_QUERY_FAILED');
    const labels = new Map(units.map((row) => [row.id, String(row.label)]));
    const unit = (row: Record<string, unknown>) =>
      labels.get(row.unit_id) ?? '—';
    const text = (value: unknown) => String(value ?? '');
    const date = (value: unknown) => text(value).slice(0, 10);
    const amount = (value: unknown) => Number(value ?? 0);
    const by =
      (key: string) =>
      (a: Record<string, unknown>, b: Record<string, unknown>) =>
        text(a[key]).localeCompare(text(b[key]));
    const totals = new Map(
      units.map((row) => [
        row.id,
        {
          label: text(row.label),
          issued: BigInt(0),
          paid: BigInt(0),
          balance: BigInt(0),
        },
      ]),
    );
    for (const charge of charges) {
      const total = totals.get(charge.unit_id);
      if (!total || charge.voided_at) continue;
      total.issued += BigInt(text(charge.amount_clp));
      total.paid += BigInt(text(charge.paid_clp));
      total.balance += BigInt(text(charge.balance_clp));
    }
    const accounts = [...totals.values()].sort((a, b) =>
      a.label.localeCompare(b.label, 'es', { numeric: true }),
    );
    const tables = [
      {
        name: 'Cuentas por unidad',
        headers: ['Unidad', 'Emitido CLP', 'Abonos netos CLP', 'Saldo CLP'],
        rows: accounts.map((a) => [
          a.label,
          Number(a.issued),
          Number(a.paid),
          Number(a.balance),
        ]),
        moneyCols: [1, 2, 3],
      },
      {
        name: 'Cobros',
        headers: [
          'Unidad',
          'Concepto',
          'Vencimiento',
          'Monto CLP',
          'Abonado CLP',
          'Saldo CLP',
          'Estado',
        ],
        rows: charges
          .sort(by('due_date'))
          .map((c) => [
            unit(c),
            text(c.description),
            date(c.due_date),
            amount(c.amount_clp),
            amount(c.paid_clp),
            amount(c.balance_clp),
            c.voided_at
              ? 'Anulado'
              : amount(c.balance_clp) > 0
                ? 'Pendiente'
                : 'Pagado',
          ]),
        moneyCols: [3, 4, 5],
      },
      {
        name: 'Pagos y reversos',
        headers: [
          'Unidad',
          'Concepto',
          'Fecha UTC',
          'Tipo',
          'Medio',
          'Referencia',
          'Monto CLP',
        ],
        rows: payments.sort(by('created_at')).map((p) => [
          unit(p),
          text(p.charge_description),
          date(p.created_at),
          p.kind === 'receipt' ? 'Abono' : 'Reverso',
          (
            {
              transfer: 'Transferencia',
              cash: 'Efectivo',
              other: 'Otro',
            } as Record<string, string>
          )[text(p.method)] ?? text(p.method),
          text(p.reference),
          amount(p.amount_clp),
        ]),
        moneyCols: [6],
      },
      {
        name: 'Egresos',
        headers: ['Concepto', 'Categoría', 'Fecha', 'Monto CLP', 'Estado'],
        rows: expenses.sort(by('expense_date')).map((e) => [
          text(e.description),
          (
            {
              maintenance: 'Mantención',
              utilities: 'Servicios',
              staff: 'Personal',
              administration: 'Administración',
              other: 'Otros',
            } as Record<string, string>
          )[text(e.category)] ?? text(e.category),
          date(e.expense_date),
          amount(e.amount_clp),
          e.voided_at ? 'Anulado' : 'Vigente',
        ]),
        moneyCols: [3],
      },
    ];
    if (format === 'pdf') {
      const pdf = await financePdf(
        'Informe financiero',
        community.data.name +
          ' · ' +
          new Intl.DateTimeFormat('es-CL', {
            timeZone: 'America/Santiago',
            dateStyle: 'long',
          }).format(new Date()),
        tables.map((table) => ({
          title: table.name,
          rows: table.rows.map((row) =>
            row
              .map(
                (value, i) =>
                  table.headers[i] +
                  ': ' +
                  (table.moneyCols.includes(i) ? money(value) : value),
              )
              .join('  |  '),
          ),
        })),
      );
      return financeDownload(pdf, 'home-safe-finanzas.pdf', 'application/pdf');
    }
    const sheets = tables.map((table) => ({
      sheet: table.name,
      stickyRowsCount: 1,
      columns: table.headers.map((header) => ({
        width: header === 'Concepto' || header === 'Referencia' ? 42 : 23,
      })),
      data: [
        table.headers.map((value) => ({
          value,
          fontWeight: 'bold' as const,
          color: '#FFFFFF',
          backgroundColor: '#183139',
        })),
        ...table.rows.map((row) =>
          row.map((value, i) => ({
            value,
            ...(table.moneyCols.includes(i) && typeof value === 'number'
              ? { format: '#,##0' }
              : {}),
          })),
        ),
      ],
    }));
    const bytes = await writeExcelFile(sheets).toBuffer();
    return financeDownload(
      new Uint8Array(bytes),
      'home-safe-finanzas.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  } catch {
    return new Response('No se pudo generar el informe financiero.', {
      status: 503,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }
}
