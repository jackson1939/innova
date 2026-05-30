export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string;
          nombre: string;
          logo_url: string | null;
          contacto_email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          logo_url?: string | null;
          contacto_email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          logo_url?: string | null;
          contacto_email?: string | null;
          created_at?: string;
        };
      };
      perfiles: {
        Row: {
          id: string;
          rol: 'admin' | 'empresa';
          empresa_id: string | null;
          nombre: string | null;
        };
        Insert: {
          id: string;
          rol: 'admin' | 'empresa';
          empresa_id?: string | null;
          nombre?: string | null;
        };
        Update: {
          id?: string;
          rol?: 'admin' | 'empresa';
          empresa_id?: string | null;
          nombre?: string | null;
        };
      };
      mensajes_recolector: {
        Row: {
          id: string;
          contenido_texto: string | null;
          fotos_urls: string[] | null;
          recibido_at: string;
          estado: 'pendiente' | 'procesando' | 'extraido' | 'validado' | 'rechazado';
        };
        Insert: {
          id?: string;
          contenido_texto?: string | null;
          fotos_urls?: string[] | null;
          recibido_at?: string;
          estado?: 'pendiente' | 'procesando' | 'extraido' | 'validado' | 'rechazado';
        };
        Update: {
          id?: string;
          contenido_texto?: string | null;
          fotos_urls?: string[] | null;
          recibido_at?: string;
          estado?: 'pendiente' | 'procesando' | 'extraido' | 'validado' | 'rechazado';
        };
      };
      extracciones: {
        Row: {
          id: string;
          mensaje_id: string | null;
          empresa_id: string | null;
          tipo_material: string;
          cantidad_kg: number;
          fecha_recoleccion: string;
          confianza_ia: number | null;
          datos_raw: Json | null;
          estado: 'pendiente' | 'aprobado' | 'rechazado' | 'corregido';
          corregido_por: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          mensaje_id?: string | null;
          empresa_id?: string | null;
          tipo_material: string;
          cantidad_kg: number;
          fecha_recoleccion: string;
          confianza_ia?: number | null;
          datos_raw?: Json | null;
          estado?: 'pendiente' | 'aprobado' | 'rechazado' | 'corregido';
          corregido_por?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          mensaje_id?: string | null;
          empresa_id?: string | null;
          tipo_material?: string;
          cantidad_kg?: number;
          fecha_recoleccion?: string;
          confianza_ia?: number | null;
          datos_raw?: Json | null;
          estado?: 'pendiente' | 'aprobado' | 'rechazado' | 'corregido';
          corregido_por?: string | null;
          created_at?: string;
        };
      };
      recolecciones: {
        Row: {
          id: string;
          extraccion_id: string | null;
          empresa_id: string;
          tipo_material: string;
          cantidad_kg: number;
          fecha_recoleccion: string;
          validado_por: string | null;
          validado_at: string;
        };
        Insert: {
          id?: string;
          extraccion_id?: string | null;
          empresa_id: string;
          tipo_material: string;
          cantidad_kg: number;
          fecha_recoleccion: string;
          validado_por?: string | null;
          validado_at?: string;
        };
        Update: {
          id?: string;
          extraccion_id?: string | null;
          empresa_id?: string;
          tipo_material?: string;
          cantidad_kg?: number;
          fecha_recoleccion?: string;
          validado_por?: string | null;
          validado_at?: string;
        };
      };
      contenido_educativo: {
        Row: {
          id: string;
          titulo: string;
          tipo: 'articulo' | 'video' | 'infografia' | null;
          url: string | null;
          contenido_md: string | null;
          tags: string[] | null;
          publicado: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          tipo?: 'articulo' | 'video' | 'infografia' | null;
          url?: string | null;
          contenido_md?: string | null;
          tags?: string[] | null;
          publicado?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          tipo?: 'articulo' | 'video' | 'infografia' | null;
          url?: string | null;
          contenido_md?: string | null;
          tags?: string[] | null;
          publicado?: boolean;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
