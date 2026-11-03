'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { clpAmount } from '@/modules/finance/domain/money';
import { requireMembership } from '@/modules/identity/infrastructure/session';
export async function administer(form: FormData) {
  const { client, member } = await requireMembership(
    String(form.get('membership_id')),
  );
  if (member.role !== 'administrador') redirect('/portal');
  const action = String(form.get('operation'));
  const section = ['finanzas', 'registros'].includes(
    String(form.get('section')),
  )
    ? String(form.get('section'))
    : 'inicio';
  let success = false;
  let conflict = false;
  const org = member.organization_id;
  const community = member.community_id;
  try {
    const text = String(form.get('description') ?? '').trim();
    const unit = String(form.get('unit_id') ?? '');

    if (action === 'edit_resident') {
      const id = String(form.get('record_id'));
      if (text.length < 3 || text.length > 160) throw new Error('INVALID');
      const email = String(form.get('email') ?? '').trim();
      const phone = String(form.get('phone') ?? '').trim();
      if (
        email.length > 254 ||
        phone.length > 40 ||
        (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      )
        throw new Error('INVALID');
      const { data: record } = await client
        .from('residents')
        .select('id')
        .eq('id', id)
        .eq('organization_id', org)
        .eq('community_id', community)
        .maybeSingle();
      if (!record) throw new Error('DENIED');
      const { error } = await client.rpc('update_resident_details', {
        target_resident: id,
        resident_name: text,
        resident_email: email,
        resident_phone: phone,
        expected_updated_at: String(form.get('expected_updated_at')),
      });
      success = !error;
      conflict = error?.code === '40001';
    } else if (action === 'edit_unit') {
      const id = String(form.get('record_id'));
      if (text.length < 1 || text.length > 60) throw new Error('INVALID');
      const { data: record } = await client
        .from('units')
        .select('id')
        .eq('id', id)
        .eq('organization_id', org)
        .eq('community_id', community)
        .maybeSingle();
      if (!record) throw new Error('DENIED');
      const { error } = await client.rpc('update_unit_label', {
        target_unit: id,
        new_label: text,
        expected_label: String(form.get('expected_label')),
      });
      success = !error;
      conflict = error?.code === '40001';
    } else if (action === 'edit_relationship') {
      const id = String(form.get('record_id'));
      const { data: record } = await client
        .from('unit_residents')
        .select('id')
        .eq('id', id)
        .eq('organization_id', org)
        .eq('community_id', community)
        .maybeSingle();
      if (!record) throw new Error('DENIED');
      const { error } = await client.rpc('update_resident_relationship', {
        target_link: id,
        new_relationship: String(form.get('relationship')),
        expected_relationship: String(form.get('expected_relationship')),
      });
      success = !error;
      conflict = error?.code === '40001';
    } else if (action === 'unit') {
      if (text.length < 1 || text.length > 60) throw new Error('INVALID');
      const { error } = await client
        .from('units')
        .insert({ organization_id: org, community_id: community, label: text });
      success = !error;
    } else if (action === 'resident') {
      if (text.length < 3 || text.length > 160) throw new Error('INVALID');
      const email = String(form.get('email') ?? '').trim();
      const phone = String(form.get('phone') ?? '').trim();
      if (
        email.length > 254 ||
        phone.length > 40 ||
        (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      )
        throw new Error('INVALID');
      const { error } = await client.rpc('register_resident', {
        org,
        community,
        unit,
        resident_name: text,
        resident_email: email,
        resident_phone: phone,
        relation: String(form.get('relationship')),
      });
      success = !error;
    } else if (action === 'charge') {
      if (text.length < 3 || text.length > 200) throw new Error('INVALID');
      const period = String(form.get('period'));
      if (!/^\d{4}-\d{2}$/.test(period)) throw new Error('INVALID');
      const [year, month] = period.split('-').map(Number);
      const { error } = await client.rpc('create_common_charge', {
        org,
        community,
        unit,
        period_year: year,
        period_month: month,
        charge_description: text,
        charge_amount: clpAmount(String(form.get('amount'))),
        charge_due: String(form.get('date')),
      });
      success = !error;
    } else if (action === 'expense') {
      if (text.length < 3 || text.length > 200) throw new Error('INVALID');
      const { error } = await client.from('expenses').insert({
        organization_id: org,
        community_id: community,
        description: text,
        category: String(form.get('category')),
        amount_clp: clpAmount(String(form.get('amount'))),
        expense_date: String(form.get('date')),
      });
      success = !error;
    } else if (action === 'payment') {
      const id = String(form.get('record_id'));
      const { data } = await client
        .from('common_expense_charges')
        .select('id')
        .eq('id', id)
        .eq('community_id', community)
        .eq('organization_id', org)
        .maybeSingle();
      if (!data) throw new Error('DENIED');
      const reference = String(form.get('reference')).trim();
      if (reference.length < 3 || reference.length > 120)
        throw new Error('INVALID');
      const { error } = await client.rpc('register_manual_payment', {
        target_charge: id,
        payment_amount: clpAmount(String(form.get('amount'))),
        payment_method: String(form.get('method')),
        payment_reference: reference,
      });
      success = !error;
    } else if (action === 'reverse') {
      const id = String(form.get('record_id'));
      const { data } = await client
        .from('payment_ledger')
        .select('id')
        .eq('id', id)
        .eq('community_id', community)
        .eq('organization_id', org)
        .maybeSingle();
      if (!data) throw new Error('DENIED');
      const reason = String(form.get('reference')).trim();
      if (reason.length < 3 || reason.length > 120) throw new Error('INVALID');
      const { error } = await client.rpc('reverse_manual_payment', {
        target_payment: id,
        reason,
      });
      success = !error;
    } else if (action === 'void_charge' || action === 'void_expense') {
      const id = String(form.get('record_id'));
      const table =
        action === 'void_charge' ? 'common_expense_charges' : 'expenses';
      const { data } = await client
        .from(table)
        .select('id')
        .eq('id', id)
        .eq('community_id', community)
        .eq('organization_id', org)
        .maybeSingle();
      if (!data) throw new Error('DENIED');
      const { error } = await client.rpc('void_financial_record', {
        record_type: action === 'void_charge' ? 'charge' : 'expense',
        record_id: id,
      });
      success = !error;
    }
  } catch {
    success = false;
  }
  revalidatePath(`/portal/${member.id}`);
  redirect(
    `/portal/${member.id}?seccion=${section}&estado=${success ? 'guardado' : conflict ? 'conflicto' : 'no_disponible'}`,
  );
}
