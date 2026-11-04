begin;
insert into auth.users(id) values('00000000-0000-0000-0000-000000000051'),('00000000-0000-0000-0000-000000000052'),('00000000-0000-0000-0000-000000000053');
insert into public.organizations(id,name) values('10000000-0000-0000-0000-000000000051','CCTV QA'),('10000000-0000-0000-0000-000000000052','CCTV QA externo');
insert into public.communities(id,organization_id,name) values('20000000-0000-0000-0000-000000000051','10000000-0000-0000-0000-000000000051','CCTV QA'),('20000000-0000-0000-0000-000000000052','10000000-0000-0000-0000-000000000052','CCTV QA externo');
insert into public.units(id,organization_id,community_id,label) values('30000000-0000-0000-0000-000000000051','10000000-0000-0000-0000-000000000051','20000000-0000-0000-0000-000000000051','101');
insert into public.community_memberships(organization_id,community_id,profile_id,role,unit_id) values
 ('10000000-0000-0000-0000-000000000051','20000000-0000-0000-0000-000000000051','00000000-0000-0000-0000-000000000051','administrador',null),('10000000-0000-0000-0000-000000000051','20000000-0000-0000-0000-000000000051','00000000-0000-0000-0000-000000000052','conserje',null),('10000000-0000-0000-0000-000000000051','20000000-0000-0000-0000-000000000051','00000000-0000-0000-0000-000000000053','residente','30000000-0000-0000-0000-000000000051');

insert into public.shift_notes(organization_id,community_id,author_id,body,created_at) values
 ('10000000-0000-0000-0000-000000000051','20000000-0000-0000-0000-000000000051','00000000-0000-0000-0000-000000000052','Anotación de ayer',((now() at time zone 'America/Santiago')::date-1)::timestamp at time zone 'America/Santiago'),
 ('10000000-0000-0000-0000-000000000052','20000000-0000-0000-0000-000000000052','00000000-0000-0000-0000-000000000052','Anotación externa',now());
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000051","aal":"aal2"}',true);
insert into public.announcements(organization_id,community_id,title,body) values('10000000-0000-0000-0000-000000000051','20000000-0000-0000-0000-000000000051','Corte programado','Habrá una revisión de agua.');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000053","aal":"aal1"}',true);
insert into public.incidents(organization_id,community_id,unit_id,title) values('10000000-0000-0000-0000-000000000051','20000000-0000-0000-0000-000000000051','30000000-0000-0000-0000-000000000051','Pérdida de agua');
do $$begin
 assert (select count(*) from public.daily_logbook('10000000-0000-0000-0000-000000000051','20000000-0000-0000-0000-000000000051',(now() at time zone 'America/Santiago')::date))=0,'Resident can see staff feed';
 begin insert into public.shift_notes(organization_id,community_id,body) values('10000000-0000-0000-0000-000000000051','20000000-0000-0000-0000-000000000051','Nota indebida');raise exception 'Resident added shift note';exception when insufficient_privilege then null;end;
end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000052","aal":"aal1"}',true);
insert into public.shift_notes(organization_id,community_id,body) values('10000000-0000-0000-0000-000000000051','20000000-0000-0000-0000-000000000051','Aviso al siguiente turno');
do $$begin
 assert (select count(*) from public.daily_logbook('10000000-0000-0000-0000-000000000051','20000000-0000-0000-0000-000000000051',(now() at time zone 'America/Santiago')::date))=3,'Feed missing or exposing records';
 assert exists(select 1 from public.daily_logbook('10000000-0000-0000-0000-000000000051','20000000-0000-0000-0000-000000000051',(now() at time zone 'America/Santiago')::date) where kind='announcements' and body='Habrá una revisión de agua.');
 assert exists(select 1 from public.daily_logbook('10000000-0000-0000-0000-000000000051','20000000-0000-0000-0000-000000000051',(now() at time zone 'America/Santiago')::date) where kind='incidents' and unit_label='101' and detail='Pérdida de agua');
 assert exists(select 1 from public.daily_logbook('10000000-0000-0000-0000-000000000051','20000000-0000-0000-0000-000000000051',(now() at time zone 'America/Santiago')::date) where kind='shift_note' and body='Aviso al siguiente turno');
 assert (select count(*) from public.daily_logbook('10000000-0000-0000-0000-000000000051','20000000-0000-0000-0000-000000000051',(now() at time zone 'America/Santiago')::date-1))=1;
 begin update public.shift_notes set body='Nota modificada';raise exception 'Shift note modified';exception when insufficient_privilege then null;end;
end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000051","aal":"aal1"}',true);
do $$begin assert (select count(*) from public.daily_logbook('10000000-0000-0000-0000-000000000051','20000000-0000-0000-0000-000000000051',(now() at time zone 'America/Santiago')::date))=0,'Admin without MFA sees notes';end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000051","aal":"aal2"}',true);
do $$begin assert (select count(*) from public.daily_logbook('10000000-0000-0000-0000-000000000051','20000000-0000-0000-0000-000000000051',(now() at time zone 'America/Santiago')::date))=3,'Admin cannot see notes';end;$$;
rollback;
