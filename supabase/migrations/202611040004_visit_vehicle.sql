begin;
alter table public.visits add column vehicle_plate text
  check (vehicle_plate is null or vehicle_plate ~ '^[A-Z0-9]{5,8}$');
grant insert(vehicle_plate) on public.visits to authenticated;
commit;
