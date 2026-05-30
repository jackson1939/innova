export type Rol = 'admin' | 'empresa';

export interface Empresa {
  id: string;
  nombre: string;
  logo_url: string | null;
  contacto_email: string | null;
  created_at: string;
}

export interface Perfil {
  id: string;
  rol: Rol;
  empresa_id: string | null;
  nombre: string | null;
}

export interface MensajeRecolector {
  id: string;
  contenido_texto: string | null;
  fotos_urls: string[] | null;
  recibido_at: string;
  estado: 'pendiente' | 'procesando' | 'extraido' | 'validado' | 'rechazado';
}

export interface Extraccion {
  id: string;
  mensaje_id: string | null;
  empresa_id: string | null;
  tipo_material: string;
  cantidad_kg: number;
  fecha_recoleccion: string;
  confianza_ia: number | null;
  datos_raw: Record<string, unknown> | null;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'corregido';
  corregido_por: string | null;
  created_at: string;
  empresas?: { nombre: string };
  mensajes_recolector?: { contenido_texto: string | null; fotos_urls: string[] | null };
}

export interface Recoleccion {
  id: string;
  extraccion_id: string | null;
  empresa_id: string;
  tipo_material: string;
  cantidad_kg: number;
  fecha_recoleccion: string;
  validado_por: string | null;
  validado_at: string;
  empresas?: { nombre: string };
}

export interface ContenidoEducativo {
  id: string;
  titulo: string;
  tipo: 'articulo' | 'video' | 'infografia';
  url: string | null;
  contenido_md: string | null;
  tags: string[] | null;
  publicado: boolean;
  created_at: string;
}

export interface MetricasImpacto {
  co2_kg: number;
  agua_litros: number;
  arboles: number;
  total_kg: number;
}

export interface ExtraccionIA {
  empresa: string | null;
  tipo_material: string | null;
  cantidad_kg: number | null;
  fecha: string | null;
  notas: string | null;
}
