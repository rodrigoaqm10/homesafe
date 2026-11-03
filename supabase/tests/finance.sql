\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values('00000000-0000-0000-0000-000000000011'),('00000000-0000-0000-0000-000000000012'),('00000000-0000-0000-0000-000000000013');
insert into public.organizations(id,name) values('10000000-0000-0000-0000-000000000011','Finance QA');
insert into public.communities(id,organization_id,name) values('20000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000011','Finance QA');
insert into public.units(id,organization_id,community_id,label) values('30000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000011','101');
insert into public.community_memberships(organization_id,community_id,profile_id,role,unit_id) values('10000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000011','administrador',null),('10000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000012','conserje',null),('10000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000013','residente','30000000-0000-0000-0000-000000000011');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000011","aal":"aal1"}',true);
do $$begin begin perform public.create_common_charge('10000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000011','30000000-0000-0000-0000-000000000011',2026,11,'Charge',100000,'2026-11-30');raise exception 'FAIL MFA';exception when insufficient_privilege then null;end;end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000011","aal":"aal2"}',true);
do $$declare cid uuid;pid uuid;begin cid:=public.create_common_charge('10000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000011','30000000-0000-0000-0000-000000000011',2026,11,'Gastos comunes',100000,'2026-11-30');pid:=public.register_manual_payment(cid,40000,'transfer','Test receipt');assert(select sum(amount_clp) from public.payment_ledger where charge_id=cid)=40000;
 begin perform public.register_manual_payment(cid,1000,'transfer','Test receipt');raise exception 'FAIL duplicate reference';exception when unique_violation then null;end;
 assert(select billed_clp from public.admin_finance_summary('10000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000011'))=100000;
 assert(select paid_clp from public.finance_charge_balances where id=cid)=40000;
 begin perform public.register_manual_payment(cid,70000,'transfer','Overpayment');raise exception 'FAIL overpayment';exception when check_violation then null;end;
 begin perform public.void_financial_record('charge',cid);raise exception 'FAIL void paid charge';exception when check_violation then null;end;
 perform public.reverse_manual_payment(pid,'Test reversal');assert(select sum(amount_clp) from public.payment_ledger where charge_id=cid)=0;
 begin perform public.reverse_manual_payment(pid,'Duplicate reversal');raise exception 'FAIL duplicate reversal';exception when check_violation then null;end;
 perform public.void_financial_record('charge',cid);
 begin perform public.register_manual_payment(cid,1000,'cash','Closed charge');raise exception 'FAIL closed charge';exception when check_violation then null;end;
 begin update public.payment_ledger set amount_clp=999;raise exception 'FAIL ledger update';exception when insufficient_privilege then null;end;
 perform public.register_resident('10000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000011','30000000-0000-0000-0000-000000000011','Persona ficticia','','','owner');assert(select count(*) from public.unit_residents)=1;end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000012","aal":"aal2"}',true);
do $$begin assert(select count(*) from public.payment_ledger)=0,'Concierge sees finance';assert(select count(*) from public.residents)=0,'Concierge sees residents directory';begin perform public.create_common_charge('10000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000011','30000000-0000-0000-0000-000000000011',2026,11,'Forbidden',1,'2026-11-30');raise exception 'FAIL concierge creates charge';exception when insufficient_privilege then null;end;end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000013","aal":"aal1"}',true);
do $$begin assert(select count(*) from public.common_expense_charges)=1,'Resident cannot see own charge';assert(select count(*) from public.payment_ledger)=2,'Resident cannot see own ledger';begin perform public.register_manual_payment((select id from public.common_expense_charges limit 1),1000,'cash','Forbidden');raise exception 'FAIL resident registers payments';exception when insufficient_privilege then null;end;end;$$;
rollback;
\echo 'PASS finance: MFA, partial payments, overpayment prevention, immutable reversals, voiding, role isolation and resident registry'

