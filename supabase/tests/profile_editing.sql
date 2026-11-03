\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values('00000000-0000-0000-0000-000000000021'),('00000000-0000-0000-0000-000000000022'),('00000000-0000-0000-0000-000000000023'),('00000000-0000-0000-0000-000000000024');
insert into public.organizations(id,name) values('10000000-0000-0000-0000-000000000021','Profile QA');
insert into public.communities(id,organization_id,name) values('20000000-0000-0000-0000-000000000021','10000000-0000-0000-0000-000000000021','Profile QA');
insert into public.units(id,organization_id,community_id,label) values('30000000-0000-0000-0000-000000000021','10000000-0000-0000-0000-000000000021','20000000-0000-0000-0000-000000000021','101'),('30000000-0000-0000-0000-000000000022','10000000-0000-0000-0000-000000000021','20000000-0000-0000-0000-000000000021','102');
insert into public.community_memberships(organization_id,community_id,profile_id,role,unit_id) values('10000000-0000-0000-0000-000000000021','20000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000021','administrador',null),('10000000-0000-0000-0000-000000000021','20000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000022','conserje',null),('10000000-0000-0000-0000-000000000021','20000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000023','residente','30000000-0000-0000-0000-000000000021'),('10000000-0000-0000-0000-000000000021','20000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000024','residente','30000000-0000-0000-0000-000000000022');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000021","aal":"aal2"}',true);
do $$declare r uuid;stamp timestamptz;c uuid;c2 uuid;begin
 r:=public.register_resident('10000000-0000-0000-0000-000000000021','20000000-0000-0000-0000-000000000021','30000000-0000-0000-0000-000000000021','Persona QA','initial@example.invalid','111','tenant');
 select updated_at into stamp from public.residents where id=r;perform public.update_resident_details(r,'Persona corregida','fixed@example.invalid','222',stamp);
 assert(select email from public.residents where id=r)='fixed@example.invalid';assert(select phone from public.residents where id=r)='222';
 assert exists(select 1 from public.audit_logs where entity_id=r and changed_fields @> array['email','phone']),'Edit not audited';
 begin perform public.update_resident_details(r,'Overwrite','bad@example.invalid','333',stamp);raise exception 'FAIL stale edit';exception when serialization_failure then null;end;
 perform public.update_resident_relationship((select id from public.unit_residents where resident_id=r),'owner','tenant');assert(select relationship from public.unit_residents where resident_id=r)='owner';
 perform public.update_unit_label('30000000-0000-0000-0000-000000000021','A-101','101');assert(select label from public.units where id='30000000-0000-0000-0000-000000000021')='A-101';
 c:=public.create_common_charge('10000000-0000-0000-0000-000000000021','20000000-0000-0000-0000-000000000021','30000000-0000-0000-0000-000000000021',2026,11,'Own charge',100000,'2020-01-01');
 perform public.register_manual_payment(c,40000,'transfer','QA profile receipt');
 c2:=public.create_common_charge('10000000-0000-0000-0000-000000000021','20000000-0000-0000-0000-000000000021','30000000-0000-0000-0000-000000000022',2026,11,'Other charge',900000,'2020-01-01');
 end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000023","aal":"aal1"}',true);
do $$declare s record;begin select * into s from public.resident_finance_summary('10000000-0000-0000-0000-000000000021','20000000-0000-0000-0000-000000000021','30000000-0000-0000-0000-000000000021');assert s.billed_clp='100000' and s.paid_clp='40000' and s.outstanding_clp='60000' and s.overdue_clp='60000','Wrong own balance';
 assert(select count(*) from public.resident_finance_summary('10000000-0000-0000-0000-000000000021','20000000-0000-0000-0000-000000000021','30000000-0000-0000-0000-000000000022'))=0,'Other unit summary exposed';
 assert(select count(*) from public.finance_payment_history)=1,'Payment isolation failed';
 begin perform public.update_unit_label('30000000-0000-0000-0000-000000000021','HACK','A-101');raise exception 'FAIL resident edits';exception when insufficient_privilege then null;end;
 end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000022","aal":"aal2"}',true);
do $$begin assert(select count(*) from public.finance_payment_history)=0,'Concierge sees finance';assert(select count(*) from public.resident_finance_summary('10000000-0000-0000-0000-000000000021','20000000-0000-0000-0000-000000000021','30000000-0000-0000-0000-000000000021'))=0,'Concierge sees summary';begin perform public.update_unit_label('30000000-0000-0000-0000-000000000021','HACK','A-101');raise exception 'FAIL concierge edits';exception when insufficient_privilege then null;end;end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000021","aal":"aal1"}',true);
do $$begin begin perform public.update_unit_label('30000000-0000-0000-0000-000000000021','HACK','A-101');raise exception 'FAIL MFA bypass';exception when insufficient_privilege then null;end;end;$$;
rollback;
\echo 'PASS: administrative edits, audit fields, stale writes, own-unit debt and payment isolation, role restrictions and MFA'
