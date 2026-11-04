begin;

alter table public.communities add column pro_until timestamptz;

create function public.community_has_pro(org uuid, community uuid)
returns boolean
language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from public.communities c
    where c.organization_id = org and c.id = community and c.pro_until > now()
  );
$$;
revoke all on function public.community_has_pro(uuid, uuid) from public, anon, authenticated;
grant execute on function public.community_has_pro(uuid, uuid) to authenticated;

create policy cameras_require_pro on public.security_cameras
  as restrictive for all to authenticated
  using (public.community_has_pro(organization_id, community_id))
  with check (public.community_has_pro(organization_id, community_id));

create policy camera_events_require_pro on public.security_camera_events
  as restrictive for all to authenticated
  using (public.community_has_pro(organization_id, community_id))
  with check (public.community_has_pro(organization_id, community_id));

create policy camera_audit_requires_pro on public.audit_logs
  as restrictive for select to authenticated
  using (
    entity_type not in ('security_cameras', 'security_camera_events')
    or public.community_has_pro(organization_id, community_id)
  );

commit;
