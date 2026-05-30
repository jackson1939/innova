-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE empresas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        text NOT NULL,
  logo_url      text,
  contacto_email text,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE perfiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rol        text NOT NULL CHECK (rol IN ('admin', 'empresa')),
  empresa_id uuid REFERENCES empresas(id) ON DELETE SET NULL,
  nombre     text
);

CREATE TABLE mensajes_recolector (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contenido_texto text,
  fotos_urls      text[],
  recibido_at     timestamptz DEFAULT now(),
  estado          text DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'procesando', 'extraido', 'validado', 'rechazado'))
);

CREATE TABLE extracciones (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mensaje_id          uuid REFERENCES mensajes_recolector(id) ON DELETE CASCADE,
  empresa_id          uuid REFERENCES empresas(id) ON DELETE CASCADE,
  tipo_material       text NOT NULL,
  cantidad_kg         numeric NOT NULL,
  fecha_recoleccion   date NOT NULL,
  confianza_ia        numeric CHECK (confianza_ia BETWEEN 0 AND 1),
  datos_raw           jsonb,
  estado              text DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'corregido')),
  corregido_por       uuid REFERENCES auth.users(id),
  created_at          timestamptz DEFAULT now()
);

CREATE TABLE recolecciones (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extraccion_id     uuid REFERENCES extracciones(id) ON DELETE SET NULL,
  empresa_id        uuid REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  tipo_material     text NOT NULL,
  cantidad_kg       numeric NOT NULL,
  fecha_recoleccion date NOT NULL,
  validado_por      uuid REFERENCES auth.users(id),
  validado_at       timestamptz DEFAULT now()
);

CREATE TABLE contenido_educativo (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo       text NOT NULL,
  tipo         text CHECK (tipo IN ('articulo', 'video', 'infografia')),
  url          text,
  contenido_md text,
  tags         text[],
  publicado    boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX ON extracciones (estado);
CREATE INDEX ON extracciones (empresa_id);
CREATE INDEX ON recolecciones (empresa_id);
CREATE INDEX ON recolecciones (fecha_recoleccion);
CREATE INDEX ON mensajes_recolector (estado);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE empresas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_recolector   ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracciones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE recolecciones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE contenido_educativo   ENABLE ROW LEVEL SECURITY;

-- Helper: role of the current user
CREATE OR REPLACE FUNCTION get_user_rol()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT rol FROM perfiles WHERE id = auth.uid();
$$;

-- Helper: empresa_id of the current user
CREATE OR REPLACE FUNCTION get_user_empresa()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT empresa_id FROM perfiles WHERE id = auth.uid();
$$;

-- empresas: admins see all; empresa users see only their own
CREATE POLICY "admin full access" ON empresas
  FOR ALL USING (get_user_rol() = 'admin');

CREATE POLICY "empresa reads own" ON empresas
  FOR SELECT USING (id = get_user_empresa());

-- perfiles: users read own profile; admins read all
CREATE POLICY "read own profile" ON perfiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "admin reads all profiles" ON perfiles
  FOR ALL USING (get_user_rol() = 'admin');

-- mensajes_recolector: only admins
CREATE POLICY "admin full access" ON mensajes_recolector
  FOR ALL USING (get_user_rol() = 'admin');

-- extracciones: only admins
CREATE POLICY "admin full access" ON extracciones
  FOR ALL USING (get_user_rol() = 'admin');

-- recolecciones: admins full; empresas read own
CREATE POLICY "admin full access" ON recolecciones
  FOR ALL USING (get_user_rol() = 'admin');

CREATE POLICY "empresa reads own" ON recolecciones
  FOR SELECT USING (empresa_id = get_user_empresa());

-- contenido_educativo: admins manage; empresas read published
CREATE POLICY "admin full access" ON contenido_educativo
  FOR ALL USING (get_user_rol() = 'admin');

CREATE POLICY "empresa reads published" ON contenido_educativo
  FOR SELECT USING (publicado = true AND get_user_rol() = 'empresa');

-- ─── Realtime ─────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE recolecciones;
ALTER PUBLICATION supabase_realtime ADD TABLE extracciones;
