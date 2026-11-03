-- Editable administrative records and read-only residential account summary.
begin;
alter table public.residents add column updated_at timestamptz not null default now();
alter table public.audit_logs add column changed_fields text[] not null default '{}';
create function homesafe_private.audit_admin_edit() returns trigger language plpgsql security definer set search_path='' as $$declare changed text[];begin
 select coalesce(array_agg(n.key order by n.key),'{}'::text[]) into changed from jsonb_each(to_jsonb(new)) n where n.key not in ('updated_at','created_at') and n.value is distinct from (to_jsonb(old)->n.key);
 if cardinality(changed)>0 then insert into public.audit_logs(organization_id,community_id,actor_id,entity_type,entity_id,action,changed_fields) values(new.organization_id,new.community_id,auth.uid(),tg_table_name,new.id,'UPDATE',changed);end if;return new;end;$$;
revoke all on function homesafe_private.audit_admin_edit() from public,anon,authenticated;
create trigger residents_edit_audit after update on public.residents for each row execute function homesafe_private.audit_admin_edit();
create trigger units_edit_audit after update on public.units for each row execute function homesafe_private.audit_admin_edit();
create trigger unit_residents_edit_audit after update on public.unit_residents for each row execute function homesafe_private.audit_admin_edit();
create function public.update_resident_details(target_resident uuid,resident_name text,resident_email text,resident_phone text,expected_updated_at timestamptz) returns void language plpgsql security definer set search_path='' as $$declare r public.residents;begin
 select * into r from public.residents where id=target_resident for update;
 if not found or not homesafe_private.has_role(r.organization_id,r.community_id,array['administrador']) then raise exception 'Operation not permitted' using errcode='42501';end if;
 if r.updated_at is distinct from expected_updated_at then raise exception 'Record changed; reload before editing' using errcode='40001';end if;
 if resident_email is not null and trim(resident_email)<>'' and (char_length(resident_email)>254 or trim(resident_email)!~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then raise exception 'Invalid email' using errcode='23514';end if;
 update public.residents set full_name=trim(resident_name),email=nullif(trim(resident_email),''),phone=nullif(trim(resident_phone),''),updated_at=clock_timestamp() where id=r.id;
 end;$$;
create function public.update_unit_label(target_unit uuid,new_label text,expected_label text) returns void language plpgsql security definer set search_path='' as $$declare u public.units;begin
 select * into u from public.units where id=target_unit for update;
 if not found or not homesafe_private.has_role(u.organization_id,u.community_id,array['administrador']) then raise exception 'Operation not permitted' using errcode='42501';end if;
 if u.label is distinct from expected_label then raise exception 'Record changed; reload before editing' using errcode='40001';end if;
 update public.units set label=trim(new_label) where id=u.id;end;$$;
create function public.update_resident_relationship(target_link uuid,new_relationship text,expected_relationship text) returns void language plpgsql security definer set search_path='' as $$declare r public.unit_residents;begin
 select * into r from public.unit_residents where id=target_link for update;
 if not found or not homesafe_private.has_role(r.organization_id,r.community_id,array['administrador']) then raise exception 'Operation not permitted' using errcode='42501';end if;
 if r.relationship is distinct from expected_relationship then raise exception 'Record changed; reload before editing' using errcode='40001';end if;
 update public.unit_residents set relationship=new_relationship where id=r.id;end;$$;
create view public.finance_payment_history with(security_invoker=true) as select p.*,c.unit_id,c.description as charge_description,c.due_date from public.payment_ledger p join public.common_expense_charges c on c.id=p.charge_id and c.organization_id=p.organization_id and c.community_id=p.community_id;
revoke all on public.finance_payment_history from anon,authenticated;
grant select on public.finance_payment_history to authenticated;
create function public.resident_finance_summary(org uuid,community uuid,unit uuid) returns table(billed_clp text,paid_clp text,outstanding_clp text,overdue_clp text) language sql stable security invoker set search_path='' as $$
 select
 (select coalesce(sum(amount_clp),0)::text from public.common_expense_charges where organization_id=org and community_id=community and unit_id=unit and voided_at is null),
 (select coalesce(sum(amount_clp),0)::text from public.finance_payment_history where organization_id=org and community_id=community and unit_id=unit),
 (select coalesce(sum(balance_clp),0)::text from public.finance_charge_balances where organization_id=org and community_id=community and unit_id=unit and voided_at is null),
 (select coalesce(sum(balance_clp),0)::text from public.finance_charge_balances where organization_id=org and community_id=community and unit_id=unit and voided_at is null and due_date<(now() at time zone 'America/Santiago')::date and balance_clp>0)
 where homesafe_private.owns_unit(org,community,unit);
$$;
revoke all on function public.update_resident_details(uuid,text,text,text,timestamptz),public.update_unit_label(uuid,text,text),public.update_resident_relationship(uuid,text,text),public.resident_finance_summary(uuid,uuid,uuid) from public,anon;
grant execute on function public.update_resident_details(uuid,text,text,text,timestamptz),public.update_unit_label(uuid,text,text),public.update_resident_relationship(uuid,text,text),public.resident_finance_summary(uuid,uuid,uuid) to authenticated;
commit;
