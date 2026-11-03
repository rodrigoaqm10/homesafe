begin;
-- Balances include the full ledger, independently of UI pagination.
create view public.finance_charge_balances with (security_invoker=true) as
 select c.*,coalesce((select sum(p.amount_clp) from public.payment_ledger p where p.charge_id=c.id),0)::bigint as paid_clp,
 (c.amount_clp-coalesce((select sum(p.amount_clp) from public.payment_ledger p where p.charge_id=c.id),0))::bigint as balance_clp
 from public.common_expense_charges c;
revoke all on public.finance_charge_balances from anon,authenticated;
grant select on public.finance_charge_balances to authenticated;
-- A manual bank/payment reference identifies one receipt per community.
create unique index payment_receipt_reference on public.payment_ledger(community_id,reference) where kind='receipt';
create function public.admin_finance_summary(org uuid,community uuid) returns table(billed_clp numeric,collected_clp numeric,expenses_clp numeric,outstanding_clp numeric) language sql stable security invoker set search_path='' as $$
 select
 (select coalesce(sum(amount_clp),0) from public.common_expense_charges where organization_id=org and community_id=community and voided_at is null),
 (select coalesce(sum(amount_clp),0) from public.payment_ledger where organization_id=org and community_id=community),
 (select coalesce(sum(amount_clp),0) from public.expenses where organization_id=org and community_id=community and voided_at is null),
 (select coalesce(sum(balance_clp),0) from public.finance_charge_balances where organization_id=org and community_id=community and voided_at is null)
 where homesafe_private.has_role(org,community,array['administrador']);
$$;
revoke all on function public.admin_finance_summary(uuid,uuid) from public,anon;
grant execute on function public.admin_finance_summary(uuid,uuid) to authenticated;
commit;
