# Manual técnico de la base de datos de HomeSafe Real
Fecha: 3 de noviembre de 2026

Modelo implementado en las migraciones 001 a 003. No incluye secretos ni filas de usuarios.

## profiles
Identidad de negocio vinculada a una cuenta de Supabase Auth. Su identificador coincide con auth.users.id; no almacena contraseñas.

| Campo | Tipo | Nulo | Predeterminado |
|---|---|---|---|
| id | uuid | NO | - |
| display_name | text | NO | ''::text |
| created_at | timestamptz | NO | now() |

Restricción profiles_display_name_check: CHECK ((char_length(display_name) <= 120))

Restricción profiles_pkey: PRIMARY KEY (id)

Restricción profiles_id_fkey: FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE

### profiles_self
Operación: SELECT
USING: (id = ( SELECT auth.uid() AS uid))
WITH CHECK: None

Índice: CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)
## organizations
Empresa o entidad que administra una o más comunidades. Es el primer nivel de separación de clientes.

| Campo | Tipo | Nulo | Predeterminado |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | - |
| created_at | timestamptz | NO | now() |

Restricción organizations_name_check: CHECK (((char_length(name) >= 2) AND (char_length(name) <= 160)))

Restricción organizations_pkey: PRIMARY KEY (id)

### organization_members
Operación: SELECT
USING: homesafe_private.in_organization(id)
WITH CHECK: None

Índice: CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id)
## communities
Comunidad residencial perteneciente a una organización. Agrupa unidades, operaciones y finanzas.

| Campo | Tipo | Nulo | Predeterminado |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| organization_id | uuid | NO | - |
| name | text | NO | - |
| created_at | timestamptz | NO | now() |

Restricción communities_name_check: CHECK (((char_length(name) >= 2) AND (char_length(name) <= 160)))

Restricción communities_pkey: PRIMARY KEY (id)

Restricción communities_organization_id_id_key: UNIQUE (organization_id, id)

Restricción communities_organization_id_fkey: FOREIGN KEY (organization_id) REFERENCES organizations(id)

### community_members
Operación: SELECT
USING: homesafe_private.has_role(organization_id, id, ARRAY['residente'::text, 'conserje'::text, 'administrador'::text])
WITH CHECK: None

Índice: CREATE UNIQUE INDEX communities_pkey ON public.communities USING btree (id)

Índice: CREATE UNIQUE INDEX communities_organization_id_id_key ON public.communities USING btree (organization_id, id)
## units
Departamentos u otras unidades identificadas dentro de una comunidad. Su etiqueta es única en esa comunidad.

| Campo | Tipo | Nulo | Predeterminado |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| organization_id | uuid | NO | - |
| community_id | uuid | NO | - |
| label | text | NO | - |
| created_at | timestamptz | NO | now() |

Restricción units_label_check: CHECK (((char_length(label) >= 1) AND (char_length(label) <= 60)))

Restricción units_pkey: PRIMARY KEY (id)

Restricción units_organization_id_community_id_id_key: UNIQUE (organization_id, community_id, id)

Restricción units_community_id_label_key: UNIQUE (community_id, label)

Restricción units_organization_id_community_id_fkey: FOREIGN KEY (organization_id, community_id) REFERENCES communities(organization_id, id)

### unit_members
Operación: SELECT
USING: (homesafe_private.has_role(organization_id, community_id, ARRAY['conserje'::text, 'administrador'::text]) OR homesafe_private.owns_unit(organization_id, community_id, id))
WITH CHECK: None

### units_admin_create
Operación: INSERT
USING: None
WITH CHECK: homesafe_private.has_role(organization_id, community_id, ARRAY['administrador'::text])

Índice: CREATE UNIQUE INDEX units_pkey ON public.units USING btree (id)

Índice: CREATE UNIQUE INDEX units_organization_id_community_id_id_key ON public.units USING btree (organization_id, community_id, id)

Índice: CREATE UNIQUE INDEX units_community_id_label_key ON public.units USING btree (community_id, label)

Disparador: CREATE TRIGGER units_audit AFTER INSERT ON public.units FOR EACH ROW EXECUTE FUNCTION homesafe_private.audit_change()
## community_memberships
Asigna a una cuenta un perfil, comunidad y estado. El residente tiene una unidad asignada; conserje y administrador tienen alcance comunitario.

| Campo | Tipo | Nulo | Predeterminado |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| organization_id | uuid | NO | - |
| community_id | uuid | NO | - |
| profile_id | uuid | NO | - |
| role | text | NO | - |
| unit_id | uuid | YES | - |
| status | text | NO | 'active'::text |
| created_at | timestamptz | NO | now() |

Restricción community_memberships_role_check: CHECK ((role = ANY (ARRAY['residente'::text, 'conserje'::text, 'administrador'::text])))

Restricción community_memberships_status_check: CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text])))

Restricción community_memberships_check: CHECK ((((role = 'residente'::text) AND (unit_id IS NOT NULL)) OR ((role = ANY (ARRAY['conserje'::text, 'administrador'::text])) AND (unit_id IS NULL))))

Restricción community_memberships_pkey: PRIMARY KEY (id)

Restricción community_memberships_community_id_profile_id_role_unit_id_key: UNIQUE NULLS NOT DISTINCT (community_id, profile_id, role, unit_id)

Restricción community_memberships_profile_id_fkey: FOREIGN KEY (profile_id) REFERENCES profiles(id)

Restricción community_memberships_organization_id_community_id_fkey: FOREIGN KEY (organization_id, community_id) REFERENCES communities(organization_id, id)

Restricción community_memberships_organization_id_community_id_unit_id_fkey: FOREIGN KEY (organization_id, community_id, unit_id) REFERENCES units(organization_id, community_id, id)

### membership_self
Operación: SELECT
USING: (profile_id = ( SELECT auth.uid() AS uid))
WITH CHECK: None

Índice: CREATE UNIQUE INDEX community_memberships_pkey ON public.community_memberships USING btree (id)

Índice: CREATE UNIQUE INDEX community_memberships_community_id_profile_id_role_unit_id_key ON public.community_memberships USING btree (community_id, profile_id, role, unit_id) NULLS NOT DISTINCT

Índice: CREATE INDEX memberships_user_scope ON public.community_memberships USING btree (profile_id, organization_id, community_id, status)
## residents
Personas del registro residencial, tengan o no una cuenta de acceso. Contiene nombre y datos de contacto opcionales.

| Campo | Tipo | Nulo | Predeterminado |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| organization_id | uuid | NO | - |
| community_id | uuid | NO | - |
| full_name | text | NO | - |
| email | text | YES | - |
| phone | text | YES | - |
| created_at | timestamptz | NO | now() |

Restricción residents_full_name_check: CHECK (((char_length(TRIM(BOTH FROM full_name)) >= 3) AND (char_length(TRIM(BOTH FROM full_name)) <= 160)))

Restricción residents_email_check: CHECK (((email IS NULL) OR (char_length(email) <= 254)))

Restricción residents_phone_check: CHECK (((phone IS NULL) OR (char_length(phone) <= 40)))

Restricción residents_pkey: PRIMARY KEY (id)

Restricción residents_organization_id_community_id_id_key: UNIQUE (organization_id, community_id, id)

Restricción residents_organization_id_community_id_fkey: FOREIGN KEY (organization_id, community_id) REFERENCES communities(organization_id, id)

### residents_admin
Operación: SELECT
USING: homesafe_private.has_role(organization_id, community_id, ARRAY['administrador'::text])
WITH CHECK: None

Índice: CREATE UNIQUE INDEX residents_pkey ON public.residents USING btree (id)

Índice: CREATE UNIQUE INDEX residents_organization_id_community_id_id_key ON public.residents USING btree (organization_id, community_id, id)

Índice: CREATE INDEX residents_scope ON public.residents USING btree (community_id, full_name)

Disparador: CREATE TRIGGER residents_audit AFTER INSERT ON public.residents FOR EACH ROW EXECUTE FUNCTION homesafe_private.audit_change()
## unit_residents
Relaciona personas con unidades como propietarios, arrendatarios o residentes. Es independiente de las membresías de acceso.

| Campo | Tipo | Nulo | Predeterminado |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| organization_id | uuid | NO | - |
| community_id | uuid | NO | - |
| unit_id | uuid | NO | - |
| resident_id | uuid | NO | - |
| relationship | text | NO | - |
| created_at | timestamptz | NO | now() |

Restricción unit_residents_relationship_check: CHECK ((relationship = ANY (ARRAY['owner'::text, 'tenant'::text, 'resident'::text])))

Restricción unit_residents_pkey: PRIMARY KEY (id)

Restricción unit_residents_unit_id_resident_id_key: UNIQUE (unit_id, resident_id)

Restricción unit_residents_organization_id_community_id_unit_id_fkey: FOREIGN KEY (organization_id, community_id, unit_id) REFERENCES units(organization_id, community_id, id)

Restricción unit_residents_organization_id_community_id_resident_id_fkey: FOREIGN KEY (organization_id, community_id, resident_id) REFERENCES residents(organization_id, community_id, id)

### unit_residents_admin
Operación: SELECT
USING: homesafe_private.has_role(organization_id, community_id, ARRAY['administrador'::text])
WITH CHECK: None

Índice: CREATE UNIQUE INDEX unit_residents_pkey ON public.unit_residents USING btree (id)

Índice: CREATE UNIQUE INDEX unit_residents_unit_id_resident_id_key ON public.unit_residents USING btree (unit_id, resident_id)

Índice: CREATE INDEX unit_residents_scope ON public.unit_residents USING btree (community_id, unit_id)

Disparador: CREATE TRIGGER unit_residents_audit AFTER INSERT ON public.unit_residents FOR EACH ROW EXECUTE FUNCTION homesafe_private.audit_change()
## visits
Autorizaciones temporales de visitas para una unidad, con vigencia, estado e historial de ingreso y salida mediante auditoría.

| Campo | Tipo | Nulo | Predeterminado |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| organization_id | uuid | NO | - |
| community_id | uuid | NO | - |
| unit_id | uuid | NO | - |
| created_by | uuid | NO | auth.uid() |
| visitor_name | text | NO | - |
| valid_from | timestamptz | NO | - |
| valid_until | timestamptz | NO | - |
| status | text | NO | 'authorized'::text |
| arrived_at | timestamptz | YES | - |
| departed_at | timestamptz | YES | - |
| created_at | timestamptz | NO | now() |

Restricción visits_visitor_name_check: CHECK (((char_length(TRIM(BOTH FROM visitor_name)) >= 3) AND (char_length(TRIM(BOTH FROM visitor_name)) <= 80)))

Restricción visits_check: CHECK (((valid_until > valid_from) AND (valid_until <= (valid_from + '7 days'::interval))))

Restricción visits_status_check: CHECK ((status = ANY (ARRAY['authorized'::text, 'arrived'::text, 'departed'::text, 'cancelled'::text])))

Restricción visits_check1: CHECK ((((status = ANY (ARRAY['authorized'::text, 'cancelled'::text])) AND (arrived_at IS NULL) AND (departed_at IS NULL)) OR ((status = 'arrived'::text) AND (arrived_at IS NOT NULL) AND (departed_at IS NULL)) OR ((status = 'departed'::text) AND (arrived_at IS NOT NULL) AND (departed_at >= arrived_at))))

Restricción visits_pkey: PRIMARY KEY (id)

Restricción visits_created_by_fkey: FOREIGN KEY (created_by) REFERENCES profiles(id)

Restricción visits_organization_id_community_id_unit_id_fkey: FOREIGN KEY (organization_id, community_id, unit_id) REFERENCES units(organization_id, community_id, id)

### visits_read
Operación: SELECT
USING: (homesafe_private.has_role(organization_id, community_id, ARRAY['conserje'::text, 'administrador'::text]) OR homesafe_private.owns_unit(organization_id, community_id, unit_id))
WITH CHECK: None

### visits_create
Operación: INSERT
USING: None
WITH CHECK: ((created_by = ( SELECT auth.uid() AS uid)) AND (status = 'authorized'::text) AND (homesafe_private.has_role(organization_id, community_id, ARRAY['conserje'::text, 'administrador'::text]) OR homesafe_private.owns_unit(organization_id, community_id, unit_id)))

Índice: CREATE UNIQUE INDEX visits_pkey ON public.visits USING btree (id)

Índice: CREATE INDEX visits_scope ON public.visits USING btree (community_id, unit_id, created_at DESC)

Disparador: CREATE TRIGGER visits_audit AFTER INSERT OR UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION homesafe_private.audit_change()
## packages
Recepción y entrega de encomiendas por unidad. Registra transportista, responsable y fechas.

| Campo | Tipo | Nulo | Predeterminado |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| organization_id | uuid | NO | - |
| community_id | uuid | NO | - |
| unit_id | uuid | NO | - |
| carrier | text | NO | - |
| status | text | NO | 'received'::text |
| received_by | uuid | NO | auth.uid() |
| received_at | timestamptz | NO | now() |
| delivered_at | timestamptz | YES | - |

Restricción packages_carrier_check: CHECK (((char_length(TRIM(BOTH FROM carrier)) >= 2) AND (char_length(TRIM(BOTH FROM carrier)) <= 100)))

Restricción packages_status_check: CHECK ((status = ANY (ARRAY['received'::text, 'delivered'::text])))

Restricción packages_check: CHECK ((((status = 'received'::text) AND (delivered_at IS NULL)) OR ((status = 'delivered'::text) AND (delivered_at >= received_at))))

Restricción packages_pkey: PRIMARY KEY (id)

Restricción packages_received_by_fkey: FOREIGN KEY (received_by) REFERENCES profiles(id)

Restricción packages_organization_id_community_id_unit_id_fkey: FOREIGN KEY (organization_id, community_id, unit_id) REFERENCES units(organization_id, community_id, id)

### packages_read
Operación: SELECT
USING: (homesafe_private.has_role(organization_id, community_id, ARRAY['conserje'::text, 'administrador'::text]) OR homesafe_private.owns_unit(organization_id, community_id, unit_id))
WITH CHECK: None

### packages_create
Operación: INSERT
USING: None
WITH CHECK: ((received_by = ( SELECT auth.uid() AS uid)) AND (status = 'received'::text) AND homesafe_private.has_role(organization_id, community_id, ARRAY['conserje'::text, 'administrador'::text]))

Índice: CREATE UNIQUE INDEX packages_pkey ON public.packages USING btree (id)

Índice: CREATE INDEX packages_scope ON public.packages USING btree (community_id, unit_id, received_at DESC)

Disparador: CREATE TRIGGER packages_audit AFTER INSERT OR UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION homesafe_private.audit_change()
## incidents
Solicitudes o incidencias asociadas a una unidad y su evolución de pendiente a resuelta.

| Campo | Tipo | Nulo | Predeterminado |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| organization_id | uuid | NO | - |
| community_id | uuid | NO | - |
| unit_id | uuid | NO | - |
| created_by | uuid | NO | auth.uid() |
| title | text | NO | - |
| status | text | NO | 'open'::text |
| created_at | timestamptz | NO | now() |
| resolved_at | timestamptz | YES | - |

Restricción incidents_organization_id_community_id_unit_id_fkey: FOREIGN KEY (organization_id, community_id, unit_id) REFERENCES units(organization_id, community_id, id)

Restricción incidents_title_check: CHECK (((char_length(TRIM(BOTH FROM title)) >= 5) AND (char_length(TRIM(BOTH FROM title)) <= 160)))

Restricción incidents_status_check: CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text])))

Restricción incidents_check: CHECK ((((status = 'resolved'::text) AND (resolved_at IS NOT NULL)) OR ((status <> 'resolved'::text) AND (resolved_at IS NULL))))

Restricción incidents_pkey: PRIMARY KEY (id)

Restricción incidents_created_by_fkey: FOREIGN KEY (created_by) REFERENCES profiles(id)

### incidents_read
Operación: SELECT
USING: (homesafe_private.has_role(organization_id, community_id, ARRAY['conserje'::text, 'administrador'::text]) OR homesafe_private.owns_unit(organization_id, community_id, unit_id))
WITH CHECK: None

### incidents_create
Operación: INSERT
USING: None
WITH CHECK: ((created_by = ( SELECT auth.uid() AS uid)) AND (status = 'open'::text) AND (homesafe_private.has_role(organization_id, community_id, ARRAY['conserje'::text, 'administrador'::text]) OR homesafe_private.owns_unit(organization_id, community_id, unit_id)))

Índice: CREATE UNIQUE INDEX incidents_pkey ON public.incidents USING btree (id)

Índice: CREATE INDEX incidents_scope ON public.incidents USING btree (community_id, unit_id, created_at DESC)

Disparador: CREATE TRIGGER incidents_audit AFTER INSERT OR UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION homesafe_private.audit_change()
## announcements
Comunicados publicados por administración para los miembros autorizados de la comunidad.

| Campo | Tipo | Nulo | Predeterminado |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| organization_id | uuid | NO | - |
| community_id | uuid | NO | - |
| title | text | NO | - |
| body | text | NO | - |
| created_by | uuid | NO | auth.uid() |
| created_at | timestamptz | NO | now() |

Restricción announcements_title_check: CHECK (((char_length(TRIM(BOTH FROM title)) >= 5) AND (char_length(TRIM(BOTH FROM title)) <= 160)))

Restricción announcements_body_check: CHECK (((char_length(TRIM(BOTH FROM body)) >= 5) AND (char_length(TRIM(BOTH FROM body)) <= 10000)))

Restricción announcements_pkey: PRIMARY KEY (id)

Restricción announcements_created_by_fkey: FOREIGN KEY (created_by) REFERENCES profiles(id)

Restricción announcements_organization_id_community_id_fkey: FOREIGN KEY (organization_id, community_id) REFERENCES communities(organization_id, id)

### announcements_read
Operación: SELECT
USING: homesafe_private.has_role(organization_id, community_id, ARRAY['residente'::text, 'conserje'::text, 'administrador'::text])
WITH CHECK: None

### announcements_create
Operación: INSERT
USING: None
WITH CHECK: ((created_by = ( SELECT auth.uid() AS uid)) AND homesafe_private.has_role(organization_id, community_id, ARRAY['administrador'::text]))

Índice: CREATE UNIQUE INDEX announcements_pkey ON public.announcements USING btree (id)

Índice: CREATE INDEX announcements_scope ON public.announcements USING btree (community_id, created_at DESC)

Disparador: CREATE TRIGGER announcements_audit AFTER INSERT ON public.announcements FOR EACH ROW EXECUTE FUNCTION homesafe_private.audit_change()
## audit_logs
Bitácora técnica de eventos de negocio. Conserva autor, entidad, acción y cambios de estado; no es una copia completa de cada registro.

| Campo | Tipo | Nulo | Predeterminado |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| organization_id | uuid | NO | - |
| community_id | uuid | NO | - |
| actor_id | uuid | YES | - |
| entity_type | text | NO | - |
| entity_id | uuid | NO | - |
| action | text | NO | - |
| old_status | text | YES | - |
| new_status | text | YES | - |
| created_at | timestamptz | NO | now() |

Restricción audit_logs_pkey: PRIMARY KEY (id)

Restricción audit_logs_actor_id_fkey: FOREIGN KEY (actor_id) REFERENCES profiles(id)

Restricción audit_logs_organization_id_community_id_fkey: FOREIGN KEY (organization_id, community_id) REFERENCES communities(organization_id, id)

### audit_staff
Operación: SELECT
USING: homesafe_private.has_role(organization_id, community_id, ARRAY['conserje'::text, 'administrador'::text])
WITH CHECK: None

Índice: CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id)

Índice: CREATE INDEX audit_scope ON public.audit_logs USING btree (community_id, created_at DESC)
## common_expense_periods
Agrupa cobros por año y mes de una comunidad. La combinación comunidad, año y mes es única.

| Campo | Tipo | Nulo | Predeterminado |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| organization_id | uuid | NO | - |
| community_id | uuid | NO | - |
| year | integer | NO | - |
| month | integer | NO | - |
| created_at | timestamptz | NO | now() |

Restricción common_expense_periods_year_check: CHECK (((year >= 2020) AND (year <= 2200)))

Restricción common_expense_periods_month_check: CHECK (((month >= 1) AND (month <= 12)))

Restricción common_expense_periods_pkey: PRIMARY KEY (id)

Restricción common_expense_periods_organization_id_community_id_id_key: UNIQUE (organization_id, community_id, id)

Restricción common_expense_periods_community_id_year_month_key: UNIQUE (community_id, year, month)

Restricción common_expense_periods_organization_id_community_id_fkey: FOREIGN KEY (organization_id, community_id) REFERENCES communities(organization_id, id)

### periods_read
Operación: SELECT
USING: homesafe_private.has_role(organization_id, community_id, ARRAY['administrador'::text, 'residente'::text])
WITH CHECK: None

Índice: CREATE UNIQUE INDEX common_expense_periods_pkey ON public.common_expense_periods USING btree (id)

Índice: CREATE UNIQUE INDEX common_expense_periods_organization_id_community_id_id_key ON public.common_expense_periods USING btree (organization_id, community_id, id)

Índice: CREATE UNIQUE INDEX common_expense_periods_community_id_year_month_key ON public.common_expense_periods USING btree (community_id, year, month)

Disparador: CREATE TRIGGER periods_audit AFTER INSERT ON public.common_expense_periods FOR EACH ROW EXECUTE FUNCTION homesafe_private.audit_change()
## common_expense_charges
Cobro individual a una unidad dentro de un período. Conserva concepto, monto en CLP, vencimiento y eventual anulación.

| Campo | Tipo | Nulo | Predeterminado |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| organization_id | uuid | NO | - |
| community_id | uuid | NO | - |
| unit_id | uuid | NO | - |
| period_id | uuid | NO | - |
| description | text | NO | - |
| amount_clp | bigint | NO | - |
| due_date | date | NO | - |
| created_by | uuid | NO | auth.uid() |
| created_at | timestamptz | NO | now() |
| voided_at | timestamptz | YES | - |

Restricción common_expense_charges_description_check: CHECK (((char_length(TRIM(BOTH FROM description)) >= 3) AND (char_length(TRIM(BOTH FROM description)) <= 200)))

Restricción common_expense_charges_amount_clp_check: CHECK (((amount_clp >= 1) AND (amount_clp <= '9000000000000'::bigint)))

Restricción common_expense_charges_pkey: PRIMARY KEY (id)

Restricción common_expense_charges_organization_id_community_id_id_key: UNIQUE (organization_id, community_id, id)

Restricción common_expense_charges_created_by_fkey: FOREIGN KEY (created_by) REFERENCES profiles(id)

Restricción common_expense_charges_organization_id_community_id_unit_i_fkey: FOREIGN KEY (organization_id, community_id, unit_id) REFERENCES units(organization_id, community_id, id)

Restricción common_expense_charges_organization_id_community_id_period_fkey: FOREIGN KEY (organization_id, community_id, period_id) REFERENCES common_expense_periods(organization_id, community_id, id)

### charges_read
Operación: SELECT
USING: (homesafe_private.has_role(organization_id, community_id, ARRAY['administrador'::text]) OR homesafe_private.owns_unit(organization_id, community_id, unit_id))
WITH CHECK: None

Índice: CREATE UNIQUE INDEX common_expense_charges_pkey ON public.common_expense_charges USING btree (id)

Índice: CREATE UNIQUE INDEX common_expense_charges_organization_id_community_id_id_key ON public.common_expense_charges USING btree (organization_id, community_id, id)

Índice: CREATE INDEX charges_scope ON public.common_expense_charges USING btree (community_id, unit_id, due_date)

Disparador: CREATE TRIGGER charges_audit AFTER INSERT OR UPDATE ON public.common_expense_charges FOR EACH ROW EXECUTE FUNCTION homesafe_private.audit_change()
## payment_ledger
Movimientos de abonos manuales y reversiones. Los abonos positivos y sus correcciones negativas conservan el historial financiero.

| Campo | Tipo | Nulo | Predeterminado |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| organization_id | uuid | NO | - |
| community_id | uuid | NO | - |
| charge_id | uuid | NO | - |
| amount_clp | bigint | NO | - |
| kind | text | NO | - |
| method | text | NO | - |
| reference | text | NO | - |
| reversal_of | uuid | YES | - |
| created_by | uuid | NO | auth.uid() |
| created_at | timestamptz | NO | now() |

Restricción payment_ledger_reversal_of_fkey: FOREIGN KEY (reversal_of) REFERENCES payment_ledger(id)

Restricción payment_ledger_created_by_fkey: FOREIGN KEY (created_by) REFERENCES profiles(id)

Restricción payment_ledger_organization_id_community_id_charge_id_fkey: FOREIGN KEY (organization_id, community_id, charge_id) REFERENCES common_expense_charges(organization_id, community_id, id)

Restricción payment_ledger_amount_clp_check: CHECK (((amount_clp <> 0) AND (abs(amount_clp) <= '9000000000000'::bigint)))

Restricción payment_ledger_kind_check: CHECK ((kind = ANY (ARRAY['receipt'::text, 'reversal'::text])))

Restricción payment_ledger_method_check: CHECK ((method = ANY (ARRAY['transfer'::text, 'cash'::text, 'other'::text])))

Restricción payment_ledger_reference_check: CHECK (((char_length(TRIM(BOTH FROM reference)) >= 3) AND (char_length(TRIM(BOTH FROM reference)) <= 120)))

Restricción payment_ledger_check: CHECK ((((kind = 'receipt'::text) AND (amount_clp > 0) AND (reversal_of IS NULL)) OR ((kind = 'reversal'::text) AND (amount_clp < 0) AND (reversal_of IS NOT NULL))))

Restricción payment_ledger_pkey: PRIMARY KEY (id)

Restricción payment_ledger_reversal_of_key: UNIQUE (reversal_of)

### ledger_read
Operación: SELECT
USING: (homesafe_private.has_role(organization_id, community_id, ARRAY['administrador'::text]) OR (EXISTS ( SELECT 1
   FROM common_expense_charges c
  WHERE ((c.id = payment_ledger.charge_id) AND homesafe_private.owns_unit(c.organization_id, c.community_id, c.unit_id)))))
WITH CHECK: None

Índice: CREATE UNIQUE INDEX payment_ledger_pkey ON public.payment_ledger USING btree (id)

Índice: CREATE UNIQUE INDEX payment_ledger_reversal_of_key ON public.payment_ledger USING btree (reversal_of)

Índice: CREATE INDEX payments_charge ON public.payment_ledger USING btree (charge_id, created_at)

Índice: CREATE UNIQUE INDEX payment_receipt_reference ON public.payment_ledger USING btree (community_id, reference) WHERE (kind = 'receipt'::text)

Disparador: CREATE TRIGGER payments_audit AFTER INSERT ON public.payment_ledger FOR EACH ROW EXECUTE FUNCTION homesafe_private.audit_change()
## expenses
Egresos registrados manualmente por administración, clasificados por categoría, monto, fecha y anulación.

| Campo | Tipo | Nulo | Predeterminado |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| organization_id | uuid | NO | - |
| community_id | uuid | NO | - |
| description | text | NO | - |
| category | text | NO | - |
| amount_clp | bigint | NO | - |
| expense_date | date | NO | - |
| created_by | uuid | NO | auth.uid() |
| created_at | timestamptz | NO | now() |
| voided_at | timestamptz | YES | - |

Restricción expenses_description_check: CHECK (((char_length(TRIM(BOTH FROM description)) >= 3) AND (char_length(TRIM(BOTH FROM description)) <= 200)))

Restricción expenses_category_check: CHECK ((category = ANY (ARRAY['maintenance'::text, 'utilities'::text, 'staff'::text, 'administration'::text, 'other'::text])))

Restricción expenses_amount_clp_check: CHECK (((amount_clp >= 1) AND (amount_clp <= '9000000000000'::bigint)))

Restricción expenses_pkey: PRIMARY KEY (id)

Restricción expenses_created_by_fkey: FOREIGN KEY (created_by) REFERENCES profiles(id)

Restricción expenses_organization_id_community_id_fkey: FOREIGN KEY (organization_id, community_id) REFERENCES communities(organization_id, id)

### expenses_read
Operación: SELECT
USING: homesafe_private.has_role(organization_id, community_id, ARRAY['administrador'::text])
WITH CHECK: None

### expenses_create
Operación: INSERT
USING: None
WITH CHECK: ((created_by = ( SELECT auth.uid() AS uid)) AND (voided_at IS NULL) AND homesafe_private.has_role(organization_id, community_id, ARRAY['administrador'::text]))

Índice: CREATE UNIQUE INDEX expenses_pkey ON public.expenses USING btree (id)

Índice: CREATE INDEX expenses_scope ON public.expenses USING btree (community_id, expense_date)

Disparador: CREATE TRIGGER expenses_audit AFTER INSERT OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION homesafe_private.audit_change()

## homesafe_private.audit_change
Disparador que añade un evento de auditoría por inserción o actualización de las entidades configuradas.

```sql
CREATE OR REPLACE FUNCTION homesafe_private.audit_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ begin
 insert into public.audit_logs(organization_id,community_id,actor_id,entity_type,entity_id,action,old_status,new_status)
 values(new.organization_id,new.community_id,auth.uid(),tg_table_name,new.id,tg_op,case when tg_op='UPDATE' then to_jsonb(old)->>'status' else null end,to_jsonb(new)->>'status');return new;end;$function$

```

## homesafe_private.create_profile
Disparador de alta: crea el perfil de negocio cuando se crea un usuario en auth.users, sin asignarle privilegios.

```sql
CREATE OR REPLACE FUNCTION homesafe_private.create_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ begin insert into public.profiles(id) values(new.id) on conflict do nothing;return new;end;$function$

```

## homesafe_private.has_role
Comprueba membresía activa, organización, comunidad y perfil permitido. Si el perfil es administrador, exige aal2 del JWT firmado.

```sql
CREATE OR REPLACE FUNCTION homesafe_private.has_role(org uuid, community uuid, allowed text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.community_memberships m where m.profile_id=(select auth.uid()) and m.organization_id=org and m.community_id=community and m.status='active' and m.role=any(allowed) and (m.role<>'administrador' or (select auth.jwt()->>'aal')='aal2'));
$function$

```

## homesafe_private.in_organization
Comprueba membresía activa en una organización y aplica MFA cuando el acceso proviene del perfil administrador.

```sql
CREATE OR REPLACE FUNCTION homesafe_private.in_organization(org uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.community_memberships m where m.profile_id=(select auth.uid()) and m.organization_id=org and m.status='active' and (m.role<>'administrador' or (select auth.jwt()->>'aal')='aal2'));
$function$

```

## homesafe_private.owns_unit
Comprueba que el usuario tenga una membresía residencial activa para esa unidad dentro del mismo cliente y comunidad.

```sql
CREATE OR REPLACE FUNCTION homesafe_private.owns_unit(org uuid, community uuid, unit uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.community_memberships m where m.profile_id=(select auth.uid()) and m.organization_id=org and m.community_id=community and m.unit_id=unit and m.status='active' and m.role='residente');
$function$

```

## public.admin_finance_summary
Devuelve totales de cobros vigentes, pagos netos, gastos vigentes y saldo pendiente sobre todo el historial autorizado.

```sql
CREATE OR REPLACE FUNCTION public.admin_finance_summary(org uuid, community uuid)
 RETURNS TABLE(billed_clp numeric, collected_clp numeric, expenses_clp numeric, outstanding_clp numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select
 (select coalesce(sum(amount_clp),0) from public.common_expense_charges where organization_id=org and community_id=community and voided_at is null),
 (select coalesce(sum(amount_clp),0) from public.payment_ledger where organization_id=org and community_id=community),
 (select coalesce(sum(amount_clp),0) from public.expenses where organization_id=org and community_id=community and voided_at is null),
 (select coalesce(sum(balance_clp),0) from public.finance_charge_balances where organization_id=org and community_id=community and voided_at is null)
 where homesafe_private.has_role(org,community,array['administrador']);
$function$

```

## public.create_common_charge
Obtiene o crea el período mensual e inserta un cobro para una unidad del mismo contexto. Solo administrador con MFA.

```sql
CREATE OR REPLACE FUNCTION public.create_common_charge(org uuid, community uuid, unit uuid, period_year integer, period_month integer, charge_description text, charge_amount bigint, charge_due date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare pid uuid;cid uuid;begin
 if not homesafe_private.has_role(org,community,array['administrador']) then raise exception 'Operation not permitted' using errcode='42501';end if;
 if not exists(select 1 from public.units where id=unit and organization_id=org and community_id=community) then raise exception 'Invalid unit' using errcode='23503';end if;
 insert into public.common_expense_periods(organization_id,community_id,year,month) values(org,community,period_year,period_month) on conflict(community_id,year,month) do update set year=excluded.year returning id into pid;
 insert into public.common_expense_charges(organization_id,community_id,unit_id,period_id,description,amount_clp,due_date) values(org,community,unit,pid,charge_description,charge_amount,charge_due) returning id into cid;return cid;end;$function$

```

## public.deliver_package
Bloquea una encomienda recibida y registra su entrega. Solo conserjería o administración autorizadas.

```sql
CREATE OR REPLACE FUNCTION public.deliver_package(package_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare p public.packages;begin
 select * into p from public.packages where id=package_id for update;
 if not found or not homesafe_private.has_role(p.organization_id,p.community_id,array['conserje','administrador']) or p.status<>'received' then raise exception 'Operation not permitted' using errcode='42501';end if;
 update public.packages set status='delivered',delivered_at=now() where id=p.id;end;$function$

```

## public.register_manual_payment
Bloquea el cobro, calcula los abonos netos y registra un recibo sin superar el saldo ni aceptar un cobro anulado.

```sql
CREATE OR REPLACE FUNCTION public.register_manual_payment(target_charge uuid, payment_amount bigint, payment_method text, payment_reference text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare c public.common_expense_charges;paid numeric;pid uuid;begin
 select * into c from public.common_expense_charges where id=target_charge for update;
 if not found or not homesafe_private.has_role(c.organization_id,c.community_id,array['administrador']) then raise exception 'Operation not permitted' using errcode='42501';end if;
 select coalesce(sum(amount_clp),0) into paid from public.payment_ledger where charge_id=c.id;
 if c.voided_at is not null or payment_amount<=0 or paid+payment_amount>c.amount_clp then raise exception 'Invalid amount or closed charge' using errcode='23514';end if;
 insert into public.payment_ledger(organization_id,community_id,charge_id,amount_clp,kind,method,reference) values(c.organization_id,c.community_id,c.id,payment_amount,'receipt',payment_method,payment_reference) returning id into pid;return pid;end;$function$

```

## public.register_resident
Crea una persona y su relación con una unidad en una transacción. Solo administrador con MFA.

```sql
CREATE OR REPLACE FUNCTION public.register_resident(org uuid, community uuid, unit uuid, resident_name text, resident_email text, resident_phone text, relation text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare rid uuid;begin
 if not homesafe_private.has_role(org,community,array['administrador']) then raise exception 'Operation not permitted' using errcode='42501';end if;
 if not exists(select 1 from public.units where id=unit and organization_id=org and community_id=community) then raise exception 'Invalid unit' using errcode='23503';end if;
 insert into public.residents(organization_id,community_id,full_name,email,phone) values(org,community,trim(resident_name),nullif(trim(resident_email),''),nullif(trim(resident_phone),'')) returning id into rid;
 insert into public.unit_residents(organization_id,community_id,unit_id,resident_id,relationship) values(org,community,unit,rid,relation);return rid;end;$function$

```

## public.reverse_manual_payment
Registra un movimiento negativo por el importe exacto del recibo original. Impide revertir dos veces el mismo recibo.

```sql
CREATE OR REPLACE FUNCTION public.reverse_manual_payment(target_payment uuid, reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare p public.payment_ledger;c public.common_expense_charges;rid uuid;begin
 select * into p from public.payment_ledger where id=target_payment;
 if not found then raise exception 'Operation not permitted' using errcode='42501';end if;
 select * into c from public.common_expense_charges where id=p.charge_id for update;
 if not homesafe_private.has_role(c.organization_id,c.community_id,array['administrador']) then raise exception 'Operation not permitted' using errcode='42501';end if;
 if p.kind<>'receipt' or exists(select 1 from public.payment_ledger where reversal_of=p.id) then raise exception 'Payment already reversed' using errcode='23514';end if;
 insert into public.payment_ledger(organization_id,community_id,charge_id,amount_clp,kind,method,reference,reversal_of) values(p.organization_id,p.community_id,p.charge_id,-p.amount_clp,'reversal',p.method,reason,p.id) returning id into rid;return rid;end;$function$

```

## public.transition_incident
Permite a personal autorizado avanzar de open a in_progress y luego a resolved; registra la fecha de resolución.

```sql
CREATE OR REPLACE FUNCTION public.transition_incident(incident_id uuid, next_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare i public.incidents;begin
 select * into i from public.incidents where id=incident_id for update;
 if not found or not homesafe_private.has_role(i.organization_id,i.community_id,array['conserje','administrador']) or not ((i.status='open' and next_status='in_progress') or (i.status='in_progress' and next_status='resolved')) then raise exception 'Operation not permitted' using errcode='42501';end if;
 update public.incidents set status=next_status,resolved_at=case when next_status='resolved' then now() else null end where id=i.id;end;$function$

```

## public.transition_visit
Bloquea la visita y valida permisos, estado y horario. Permite cancelar, registrar ingreso o registrar salida según el caso.

```sql
CREATE OR REPLACE FUNCTION public.transition_visit(visit_id uuid, next_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 declare v public.visits;staff boolean;begin
 select * into v from public.visits where id=visit_id for update;
 if not found then raise exception 'Operation not permitted' using errcode='42501';end if;
 staff:=homesafe_private.has_role(v.organization_id,v.community_id,array['conserje','administrador']);
 if next_status='cancelled' and v.status='authorized' and (staff or homesafe_private.owns_unit(v.organization_id,v.community_id,v.unit_id)) then update public.visits set status='cancelled' where id=v.id;
 elsif staff and next_status='arrived' and v.status='authorized' and now() between v.valid_from and v.valid_until then update public.visits set status='arrived',arrived_at=now() where id=v.id;
 elsif staff and next_status='departed' and v.status='arrived' then update public.visits set status='departed',departed_at=now() where id=v.id;
 else raise exception 'Operation not permitted' using errcode='42501';end if;end;
$function$

```

## public.void_financial_record
Anula un cobro sin pagos netos o un gasto. Conserva la fila y no borra el historial.

```sql
CREATE OR REPLACE FUNCTION public.void_financial_record(record_type text, record_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare org uuid;community uuid;begin
 if record_type='charge' then select organization_id,community_id into org,community from public.common_expense_charges where id=record_id for update;
 elsif record_type='expense' then select organization_id,community_id into org,community from public.expenses where id=record_id for update;else raise exception 'Invalid record';end if;
 if org is null or not homesafe_private.has_role(org,community,array['administrador']) then raise exception 'Operation not permitted' using errcode='42501';end if;
 if record_type='charge' then if (select coalesce(sum(amount_clp),0) from public.payment_ledger where charge_id=record_id)<>0 then raise exception 'Reverse payments first' using errcode='23514';end if;update public.common_expense_charges set voided_at=now() where id=record_id and voided_at is null;
 else update public.expenses set voided_at=now() where id=record_id and voided_at is null;end if;end;$function$

```