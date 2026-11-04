begin;
create table public.security_cameras (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, community_id uuid not null,
 label text not null check(char_length(trim(label)) between 2 and 80),
 location text not null check(char_length(trim(location)) between 2 and 120),
 created_at timestamptz not null default now(),
 foreign key(organization_id,community_id) references public.communities(organization_id,id),
 unique(organization_id,community_id,id)
);
create unique index security_camera_unique_label on public.security_cameras(community_id,lower(label));
create table public.security_camera_events (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, community_id uuid not null,
 camera_id uuid not null, actor_id uuid not null default auth.uid() references public.profiles(id),
 state text not null check(state in ('operativa','sin_imagen','en_revision')),
 note text not null default '' check(char_length(note)<=400), created_at timestamptz not null default now(),
 foreign key(organization_id,community_id,camera_id) references public.security_cameras(organization_id,community_id,id)
);
create index security_camera_event_latest on public.security_camera_events(camera_id,created_at desc,id desc);
create index security_camera_event_history on public.security_camera_events(organization_id,community_id,created_at desc);
alter table public.security_cameras enable row level security;
alter table public.security_camera_events enable row level security;
revoke all on public.security_cameras,public.security_camera_events from public,anon,authenticated;
grant select on public.security_cameras,public.security_camera_events to authenticated;
grant insert(organization_id,community_id,label,location) on public.security_cameras to authenticated;
grant insert(organization_id,community_id,camera_id,state,note) on public.security_camera_events to authenticated;
create policy camera_staff_read on public.security_cameras for select to authenticated using(homesafe_private.has_role(organization_id,community_id,array['conserje','administrador']));
create policy camera_admin_register on public.security_cameras for insert to authenticated with check(homesafe_private.has_role(organization_id,community_id,array['administrador']));
create policy camera_events_staff_read on public.security_camera_events for select to authenticated using(homesafe_private.has_role(organization_id,community_id,array['conserje','administrador']));
create policy camera_events_staff_report on public.security_camera_events for insert to authenticated with check(actor_id=(select auth.uid()) and homesafe_private.has_role(organization_id,community_id,array['conserje','administrador']));
create view public.security_camera_status with(security_invoker=true) as
 select c.*,e.state,e.created_at as observed_at from public.security_cameras c
 left join lateral(select state,created_at from public.security_camera_events where camera_id=c.id order by created_at desc,id desc limit 1)e on true;
revoke all on public.security_camera_status from public,anon,authenticated;
grant select on public.security_camera_status to authenticated;
create function homesafe_private.audit_camera_record() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_logs(organization_id,community_id,actor_id,entity_type,entity_id,action)
 values(new.organization_id,new.community_id,auth.uid(),tg_table_name,new.id,'INSERT');
 return new;
end;$$;
revoke all on function homesafe_private.audit_camera_record() from public,anon,authenticated;
create trigger camera_registration_audit after insert on public.security_cameras for each row execute function homesafe_private.audit_camera_record();
create trigger camera_observation_audit after insert on public.security_camera_events for each row execute function homesafe_private.audit_camera_record();
create view public.security_camera_history with(security_invoker=true) as
 select e.*, c.label as camera_label from public.security_camera_events e
 join public.security_cameras c on (c.organization_id,c.community_id,c.id)=(e.organization_id,e.community_id,e.camera_id);
revoke all on public.security_camera_history from public,anon,authenticated;
grant select on public.security_camera_history to authenticated;
commit;
