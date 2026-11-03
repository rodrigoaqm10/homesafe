-- HomeSafe core v1. Atomic migration. Apply once to the dedicated project.
begin;
create schema if not exists homesafe_private;
revoke all on schema homesafe_private from public, anon;
grant usage on schema homesafe_private to authenticated;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check(char_length(display_name)<=120),
 created_at timestamptz not null default now()
);
create table public.organizations(id uuid primary key default gen_random_uuid(),name text not null check(char_length(name) between 2 and 160),created_at timestamptz not null default now());
create table public.communities(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),name text not null check(char_length(name) between 2 and 160),created_at timestamptz not null default now(),unique(organization_id,id));
create table public.units(id uuid primary key default gen_random_uuid(),organization_id uuid not null,community_id uuid not null,label text not null check(char_length(label) between 1 and 60),created_at timestamptz not null default now(),foreign key(organization_id,community_id) references public.communities(organization_id,id),unique(organization_id,community_id,id),unique(community_id,label));
create table public.community_memberships(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,community_id uuid not null,profile_id uuid not null references public.profiles(id),
 role text not null check(role in ('residente','conserje','administrador')),unit_id uuid,status text not null default 'active' check(status in ('active','suspended')),
 created_at timestamptz not null default now(),
 foreign key(organization_id,community_id) references public.communities(organization_id,id),
 foreign key(organization_id,community_id,unit_id) references public.units(organization_id,community_id,id),
 check((role='residente' and unit_id is not null) or (role in ('conserje','administrador') and unit_id is null)),
 unique nulls not distinct (community_id,profile_id,role,unit_id)
);
create index memberships_user_scope on public.community_memberships(profile_id,organization_id,community_id,status);
create function homesafe_private.has_role(org uuid,community uuid,allowed text[]) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.community_memberships m where m.profile_id=(select auth.uid()) and m.organization_id=org and m.community_id=community and m.status='active' and m.role=any(allowed) and (m.role<>'administrador' or (select auth.jwt()->>'aal')='aal2'));
$$;
create function homesafe_private.owns_unit(org uuid,community uuid,unit uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.community_memberships m where m.profile_id=(select auth.uid()) and m.organization_id=org and m.community_id=community and m.unit_id=unit and m.status='active' and m.role='residente');
$$;
create function homesafe_private.in_organization(org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.community_memberships m where m.profile_id=(select auth.uid()) and m.organization_id=org and m.status='active' and (m.role<>'administrador' or (select auth.jwt()->>'aal')='aal2'));
$$;
revoke all on function homesafe_private.has_role(uuid,uuid,text[]),homesafe_private.owns_unit(uuid,uuid,uuid),homesafe_private.in_organization(uuid) from public,anon;
grant execute on function homesafe_private.has_role(uuid,uuid,text[]),homesafe_private.owns_unit(uuid,uuid,uuid),homesafe_private.in_organization(uuid) to authenticated;
create function homesafe_private.create_profile() returns trigger language plpgsql security definer set search_path='' as $$ begin insert into public.profiles(id) values(new.id) on conflict do nothing;return new;end;$$;
revoke all on function homesafe_private.create_profile() from public,anon,authenticated;
create trigger homesafe_create_profile after insert on auth.users for each row execute function homesafe_private.create_profile();
insert into public.profiles(id) select id from auth.users on conflict do nothing;
create table public.visits(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,community_id uuid not null,unit_id uuid not null,
 created_by uuid not null default auth.uid() references public.profiles(id),visitor_name text not null check(char_length(trim(visitor_name)) between 3 and 80),
 valid_from timestamptz not null,valid_until timestamptz not null,check(valid_until>valid_from and valid_until<=valid_from+interval '7 days'),
 status text not null default 'authorized' check(status in ('authorized','arrived','departed','cancelled')),
 arrived_at timestamptz,departed_at timestamptz,created_at timestamptz not null default now(),
 foreign key(organization_id,community_id,unit_id) references public.units(organization_id,community_id,id),
 check((status in ('authorized','cancelled') and arrived_at is null and departed_at is null) or (status='arrived' and arrived_at is not null and departed_at is null) or (status='departed' and arrived_at is not null and departed_at>=arrived_at))
);
create table public.packages(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,community_id uuid not null,unit_id uuid not null,
 carrier text not null check(char_length(trim(carrier)) between 2 and 100),status text not null default 'received' check(status in ('received','delivered')),
 received_by uuid not null default auth.uid() references public.profiles(id),received_at timestamptz not null default now(),delivered_at timestamptz,
 foreign key(organization_id,community_id,unit_id) references public.units(organization_id,community_id,id),check((status='received' and delivered_at is null) or (status='delivered' and delivered_at>=received_at))
);
create table public.incidents(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,community_id uuid not null,unit_id uuid not null,
 created_by uuid not null default auth.uid() references public.profiles(id),title text not null check(char_length(trim(title)) between 5 and 160),
 status text not null default 'open' check(status in ('open','in_progress','resolved')),created_at timestamptz not null default now(),resolved_at timestamptz,
 foreign key(organization_id,community_id,unit_id) references public.units(organization_id,community_id,id),check((status='resolved' and resolved_at is not null) or (status<>'resolved' and resolved_at is null))
);
create table public.announcements(id uuid primary key default gen_random_uuid(),organization_id uuid not null,community_id uuid not null,title text not null check(char_length(trim(title)) between 5 and 160),body text not null check(char_length(trim(body)) between 5 and 10000),created_by uuid not null default auth.uid() references public.profiles(id),created_at timestamptz not null default now(),foreign key(organization_id,community_id) references public.communities(organization_id,id));
create table public.audit_logs(id uuid primary key default gen_random_uuid(),organization_id uuid not null,community_id uuid not null,actor_id uuid references public.profiles(id),entity_type text not null,entity_id uuid not null,action text not null,old_status text,new_status text,created_at timestamptz not null default now(),foreign key(organization_id,community_id) references public.communities(organization_id,id));
create index visits_scope on public.visits(community_id,unit_id,created_at desc);
create index packages_scope on public.packages(community_id,unit_id,received_at desc);
create index incidents_scope on public.incidents(community_id,unit_id,created_at desc);
create index audit_scope on public.audit_logs(community_id,created_at desc);
create index announcements_scope on public.announcements(community_id,created_at desc);
-- No writes to organizations, units or memberships from the public API.
revoke all on public.profiles,public.organizations,public.communities,public.units,public.community_memberships,public.visits,public.packages,public.incidents,public.announcements,public.audit_logs from anon,authenticated;
grant select on public.profiles,public.organizations,public.communities,public.units,public.community_memberships,public.visits,public.packages,public.incidents,public.announcements,public.audit_logs to authenticated;
grant insert(organization_id,community_id,unit_id,visitor_name,valid_from,valid_until) on public.visits to authenticated;
grant insert(organization_id,community_id,unit_id,carrier) on public.packages to authenticated;
grant insert(organization_id,community_id,unit_id,title) on public.incidents to authenticated;
grant insert(organization_id,community_id,title,body) on public.announcements to authenticated;
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.communities enable row level security;
alter table public.units enable row level security;
alter table public.community_memberships enable row level security;
alter table public.visits enable row level security;
alter table public.packages enable row level security;
alter table public.incidents enable row level security;
alter table public.announcements enable row level security;
alter table public.audit_logs enable row level security;
create policy profiles_self on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy membership_self on public.community_memberships for select to authenticated using(profile_id=(select auth.uid()));
create policy organization_members on public.organizations for select to authenticated using(homesafe_private.in_organization(id));
create policy community_members on public.communities for select to authenticated using(homesafe_private.has_role(organization_id,id,array['residente','conserje','administrador']));
create policy unit_members on public.units for select to authenticated using(homesafe_private.has_role(organization_id,community_id,array['conserje','administrador']) or homesafe_private.owns_unit(organization_id,community_id,id));
create policy visits_read on public.visits for select to authenticated using(homesafe_private.has_role(organization_id,community_id,array['conserje','administrador']) or homesafe_private.owns_unit(organization_id,community_id,unit_id));
create policy visits_create on public.visits for insert to authenticated with check(created_by=(select auth.uid()) and status='authorized' and (homesafe_private.has_role(organization_id,community_id,array['conserje','administrador']) or homesafe_private.owns_unit(organization_id,community_id,unit_id)));
create policy packages_read on public.packages for select to authenticated using(homesafe_private.has_role(organization_id,community_id,array['conserje','administrador']) or homesafe_private.owns_unit(organization_id,community_id,unit_id));
create policy packages_create on public.packages for insert to authenticated with check(received_by=(select auth.uid()) and status='received' and homesafe_private.has_role(organization_id,community_id,array['conserje','administrador']));
create policy incidents_read on public.incidents for select to authenticated using(homesafe_private.has_role(organization_id,community_id,array['conserje','administrador']) or homesafe_private.owns_unit(organization_id,community_id,unit_id));
create policy incidents_create on public.incidents for insert to authenticated with check(created_by=(select auth.uid()) and status='open' and (homesafe_private.has_role(organization_id,community_id,array['conserje','administrador']) or homesafe_private.owns_unit(organization_id,community_id,unit_id)));
create policy announcements_read on public.announcements for select to authenticated using(homesafe_private.has_role(organization_id,community_id,array['residente','conserje','administrador']));
create policy announcements_create on public.announcements for insert to authenticated with check(created_by=(select auth.uid()) and homesafe_private.has_role(organization_id,community_id,array['administrador']));
create policy audit_staff on public.audit_logs for select to authenticated using(homesafe_private.has_role(organization_id,community_id,array['conserje','administrador']));
create function homesafe_private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$ begin
 insert into public.audit_logs(organization_id,community_id,actor_id,entity_type,entity_id,action,old_status,new_status)
 values(new.organization_id,new.community_id,auth.uid(),tg_table_name,new.id,tg_op,case when tg_op='UPDATE' then to_jsonb(old)->>'status' else null end,to_jsonb(new)->>'status');return new;end;$$;
revoke all on function homesafe_private.audit_change() from public,anon,authenticated;
create trigger visits_audit after insert or update on public.visits for each row execute function homesafe_private.audit_change();
create trigger packages_audit after insert or update on public.packages for each row execute function homesafe_private.audit_change();
create trigger incidents_audit after insert or update on public.incidents for each row execute function homesafe_private.audit_change();
create trigger announcements_audit after insert on public.announcements for each row execute function homesafe_private.audit_change();
create function public.transition_visit(visit_id uuid,next_status text) returns void language plpgsql security definer set search_path='' as $$
 declare v public.visits;staff boolean;begin
 select * into v from public.visits where id=visit_id for update;
 if not found then raise exception 'Operation not permitted' using errcode='42501';end if;
 staff:=homesafe_private.has_role(v.organization_id,v.community_id,array['conserje','administrador']);
 if next_status='cancelled' and v.status='authorized' and (staff or homesafe_private.owns_unit(v.organization_id,v.community_id,v.unit_id)) then update public.visits set status='cancelled' where id=v.id;
 elsif staff and next_status='arrived' and v.status='authorized' and now() between v.valid_from and v.valid_until then update public.visits set status='arrived',arrived_at=now() where id=v.id;
 elsif staff and next_status='departed' and v.status='arrived' then update public.visits set status='departed',departed_at=now() where id=v.id;
 else raise exception 'Operation not permitted' using errcode='42501';end if;end;
$$;
create function public.deliver_package(package_id uuid) returns void language plpgsql security definer set search_path='' as $$ declare p public.packages;begin
 select * into p from public.packages where id=package_id for update;
 if not found or not homesafe_private.has_role(p.organization_id,p.community_id,array['conserje','administrador']) or p.status<>'received' then raise exception 'Operation not permitted' using errcode='42501';end if;
 update public.packages set status='delivered',delivered_at=now() where id=p.id;end;$$;
create function public.transition_incident(incident_id uuid,next_status text) returns void language plpgsql security definer set search_path='' as $$ declare i public.incidents;begin
 select * into i from public.incidents where id=incident_id for update;
 if not found or not homesafe_private.has_role(i.organization_id,i.community_id,array['conserje','administrador']) or not ((i.status='open' and next_status='in_progress') or (i.status='in_progress' and next_status='resolved')) then raise exception 'Operation not permitted' using errcode='42501';end if;
 update public.incidents set status=next_status,resolved_at=case when next_status='resolved' then now() else null end where id=i.id;end;$$;
revoke all on function public.transition_visit(uuid,text),public.deliver_package(uuid),public.transition_incident(uuid,text) from public,anon;
grant execute on function public.transition_visit(uuid,text),public.deliver_package(uuid),public.transition_incident(uuid,text) to authenticated;
commit;
