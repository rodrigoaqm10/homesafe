\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003'),('00000000-0000-0000-0000-000000000004'),('00000000-0000-0000-0000-000000000005');
insert into public.organizations(id,name) values('10000000-0000-0000-0000-000000000001','Organization A'),('10000000-0000-0000-0000-000000000002','Organization B');
insert into public.communities(id,organization_id,name) values('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Community A'),('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Community B');
insert into public.units(id,organization_id,community_id,label) values('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','A-101'),('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','A-102'),('30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','B-101');
insert into public.community_memberships(organization_id,community_id,profile_id,role,unit_id) values
('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','residente','30000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','residente','30000000-0000-0000-0000-000000000002'),
('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','conserje',null),
('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','administrador',null),
('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005','residente','30000000-0000-0000-0000-000000000003');
-- Composite FK blocks a cross-community unit even for trusted provisioning.
do $$begin begin insert into public.community_memberships(organization_id,community_id,profile_id,role,unit_id) values('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','residente','30000000-0000-0000-0000-000000000003');raise exception 'FAIL: cross-tenant FK';exception when foreign_key_violation then null;end;end;$$;
set local role anon;
do $$begin begin perform id from public.visits;raise exception 'FAIL: anonymous access';exception when insufficient_privilege then null;end;end;$$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","aal":"aal1"}',true);
do $$begin assert (select count(*) from public.units)=1,'Resident sees other units';assert (select count(*) from public.communities)=1,'Resident sees another community';assert (select count(*) from public.community_memberships)=1,'Resident sees other memberships';end;$$;
insert into public.visits(organization_id,community_id,unit_id,visitor_name,valid_from,valid_until,vehicle_plate) values('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Test visitor',now()-interval '1 hour',now()+interval '1 hour','ABCD12');
do $$begin begin insert into public.visits(organization_id,community_id,unit_id,visitor_name,valid_from,valid_until) values('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','Forbidden visitor',now(),now()+interval '1 hour');raise exception 'FAIL: write other unit';exception when insufficient_privilege then null;end;begin update public.community_memberships set role='administrador';raise exception 'FAIL: role escalation';exception when insufficient_privilege then null;end;begin insert into public.packages(organization_id,community_id,unit_id,carrier) values('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Forbidden carrier');raise exception 'FAIL: resident creates package';exception when insufficient_privilege then null;end;begin perform public.transition_visit((select id from public.visits limit 1),'arrived');raise exception 'FAIL: resident registers arrival';exception when insufficient_privilege then null;end;begin update public.visits set status='arrived';raise exception 'FAIL: direct update';exception when insufficient_privilege then null;end;end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000002","aal":"aal1"}',true);
do $$begin assert (select count(*) from public.visits)=0,'Another unit reads visit';end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000005","aal":"aal1"}',true);
do $$begin assert (select count(*) from public.visits)=0,'Another organization reads visit';assert (select count(*) from public.units)=1,'Foreign resident scope';end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000003","aal":"aal1"}',true);
do $$declare target uuid;begin assert (select count(*) from public.units)=2,'Staff cannot read own units';select id into target from public.visits where vehicle_plate='ABCD12';perform public.transition_visit(target,'arrived');assert (select status from public.visits where id=target)='arrived','Arrival failed';perform public.transition_visit(target,'departed');assert (select status from public.visits where id=target)='departed','Departure failed';begin perform public.transition_visit(target,'arrived');raise exception 'FAIL: reentry';exception when insufficient_privilege then null;end;assert (select count(*) from public.audit_logs where entity_type='visits' and entity_id=target)=3,'Audit missed transition';end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000004","aal":"aal1"}',true);
do $$begin assert (select count(*) from public.units)=0,'Admin bypasses MFA';assert (select count(*) from public.visits)=0,'Admin reads operations without MFA';assert (select count(*) from public.community_memberships)=1,'Admin must see membership to enroll MFA';end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000004","aal":"aal2"}',true);
do $$begin assert (select count(*) from public.units)=2,'MFA admin cannot read units';assert (select count(*) from public.visits)=1,'MFA admin cannot read visits';assert (select count(*) from public.audit_logs where entity_type='visits' and entity_id in (select id from public.visits where vehicle_plate='ABCD12'))=3,'MFA admin cannot read audit';end;$$;
reset role;
update public.community_memberships set status='suspended' where profile_id='00000000-0000-0000-0000-000000000003';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000003","aal":"aal2"}',true);
do $$begin assert (select count(*) from public.visits)=0,'Suspended staff still has access';end;$$;
rollback;
\echo 'PASS: RLS isolation, tenant FKs, role escalation, MFA, transitions, suspension and audit'
