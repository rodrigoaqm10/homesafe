begin;
create table public.shift_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  community_id uuid not null,
  author_id uuid not null default auth.uid() references public.profiles(id),
  body text not null check(char_length(trim(body)) between 3 and 2000),
  created_at timestamptz not null default now(),
  foreign key(organization_id,community_id) references public.communities(organization_id,id)
);
create index shift_notes_daily on public.shift_notes(organization_id,community_id,created_at desc,id desc);
create index audit_logs_daily on public.audit_logs(organization_id,community_id,created_at desc,id desc);
alter table public.shift_notes enable row level security;
revoke all on public.shift_notes from public,anon,authenticated;
grant select on public.shift_notes to authenticated;
grant insert(organization_id,community_id,body) on public.shift_notes to authenticated;
create policy shift_notes_staff_read on public.shift_notes for select to authenticated
  using(homesafe_private.has_role(organization_id,community_id,array['conserje','administrador']));
create policy shift_notes_concierge_write on public.shift_notes for insert to authenticated
  with check(author_id=(select auth.uid()) and homesafe_private.has_role(organization_id,community_id,array['conserje']));

create function public.daily_logbook(org uuid,community uuid,local_day date)
returns table(id uuid,created_at timestamptz,kind text,action text,state text,detail text,body text,unit_label text)
language sql stable security invoker set search_path='' as $$
 with bounds as (
   select local_day::timestamp at time zone 'America/Santiago' as start_at,
     (local_day+1)::timestamp at time zone 'America/Santiago' as end_at
 )
 select n.id,n.created_at,'shift_note',null,null,null,n.body,null
 from public.shift_notes n cross join bounds b
 where n.organization_id=org and n.community_id=community and n.created_at>=b.start_at and n.created_at<b.end_at
 union all
 select a.id,a.created_at,a.entity_type,a.action,coalesce(e.state,a.new_status),
   coalesce(announcement.title,request.title,c.label),coalesce(announcement.body,e.note),u.label
 from public.audit_logs a
 cross join bounds b
 left join public.announcements announcement on a.entity_type='announcements' and (announcement.id,announcement.organization_id,announcement.community_id)=(a.entity_id,org,community)
 left join public.incidents request on a.entity_type='incidents' and (request.id,request.organization_id,request.community_id)=(a.entity_id,org,community)
 left join public.visits v on a.entity_type='visits' and (v.id,v.organization_id,v.community_id)=(a.entity_id,org,community)
 left join public.packages p on a.entity_type='packages' and (p.id,p.organization_id,p.community_id)=(a.entity_id,org,community)
 left join public.security_camera_events e on a.entity_type='security_camera_events' and (e.id,e.organization_id,e.community_id)=(a.entity_id,org,community)
 left join public.security_cameras c on (c.id,c.organization_id,c.community_id)=(coalesce(e.camera_id,case when a.entity_type='security_cameras' then a.entity_id end),org,community)
 left join public.units u on (u.id,u.organization_id,u.community_id)=(coalesce(request.unit_id,v.unit_id,p.unit_id),org,community)
 where a.organization_id=org and a.community_id=community and a.created_at>=b.start_at and a.created_at<b.end_at
 and a.entity_type in ('announcements','incidents','visits','packages','security_cameras','security_camera_events')
 and homesafe_private.has_role(org,community,array['conserje','administrador']);
$$;
revoke all on function public.daily_logbook(uuid,uuid,date) from public,anon,authenticated;
grant execute on function public.daily_logbook(uuid,uuid,date) to authenticated;
commit;
