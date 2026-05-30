'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Edit3, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Extraccion {
  id: string;
  tipo_material: string;
  cantidad_kg: number;
  fecha_recoleccion: string;
  confianza_ia: number | null;
  empresa_id: string | null;
  mensajes_recolector?: {
    contenido_texto: string | null;
    fotos_urls: string[] | null;
    recibido_at: string;
  } | null;
}

interface Empresa {
  id: string;
  nombre: string;
}

interface ValidacionCardProps {
  extraccion: Extraccion;
  empresas: Empresa[];
  userId: string;
  onResolved: () => void;
}

const MATERIALES = ['plastico', 'papel', 'vidrio', 'metal', 'carton', 'desconocido'];

export function ValidacionCard({
  extraccion,
  empresas,
  userId,
  onResolved,
}: ValidacionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    empresa_id: extraccion.empresa_id ?? '',
    tipo_material: extraccion.tipo_material,
    cantidad_kg: extraccion.cantidad_kg,
    fecha_recoleccion: extraccion.fecha_recoleccion,
  });

  const confianza = extraccion.confianza_ia ?? 0;
  const confianzaColor =
    confianza >= 0.8
      ? 'text-green-600 bg-green-50'
      : confianza >= 0.5
      ? 'text-amber-600 bg-amber-50'
      : 'text-red-600 bg-red-50';

  const handleAction = async (accion: 'aprobar' | 'rechazar' | 'corregir') => {
    if ((accion === 'aprobar' || accion === 'corregir') && !form.empresa_id) {
      toast.error('Selecciona una empresa antes de aprobar');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extraccion_id: extraccion.id,
          accion,
          correcciones: accion !== 'rechazar' ? form : undefined,
          validado_por: userId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'Error al procesar');
        return;
      }

      toast.success(
        accion === 'aprobar'
          ? '✅ Extracción aprobada'
          : accion === 'rechazar'
          ? '❌ Extracción rechazada'
          : '✏️ Corrección guardada y aprobada'
      );
      onResolved();
    } catch {
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="p-5 flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
              {extraccion.tipo_material}
            </span>
            <span className={`badge ${confianzaColor}`}>
              <AlertCircle className="w-3 h-3" />
              {Math.round(confianza * 100)}% confianza
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-slate-400 text-xs">Cantidad</span>
              <p className="font-bold text-slate-800 dark:text-slate-100">
                {extraccion.cantidad_kg} kg
              </p>
            </div>
            <div>
              <span className="text-slate-400 text-xs">Fecha</span>
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                {new Date(extraccion.fecha_recoleccion + 'T00:00:00').toLocaleDateString('es')}
              </p>
            </div>
            <div>
              <span className="text-slate-400 text-xs">Recibido</span>
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                {extraccion.mensajes_recolector?.recibido_at
                  ? new Date(extraccion.mensajes_recolector.recibido_at).toLocaleString('es', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400"
        >
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-700 p-5 space-y-4 bg-slate-50 dark:bg-slate-900/50">
          {/* Original message */}
          {extraccion.mensajes_recolector?.contenido_texto && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Mensaje original
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                {extraccion.mensajes_recolector.contenido_texto}
              </p>
            </div>
          )}

          {/* Photos */}
          {extraccion.mensajes_recolector?.fotos_urls &&
            extraccion.mensajes_recolector.fotos_urls.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Fotos ({extraccion.mensajes_recolector.fotos_urls.length})
                </p>
                <div className="flex gap-2 flex-wrap">
                  {extraccion.mensajes_recolector.fotos_urls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:underline"
                    >
                      📷 Foto {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

          {/* Edit form */}
          {editMode ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Corregir datos
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Empresa</label>
                  <select
                    className="input text-sm"
                    value={form.empresa_id}
                    onChange={(e) => setForm({ ...form, empresa_id: e.target.value })}
                  >
                    <option value="">Seleccionar empresa…</option>
                    {empresas.map((e) => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Material</label>
                  <select
                    className="input text-sm"
                    value={form.tipo_material}
                    onChange={(e) => setForm({ ...form, tipo_material: e.target.value })}
                  >
                    {MATERIALES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Cantidad (kg)</label>
                  <input
                    type="number"
                    className="input text-sm"
                    value={form.cantidad_kg}
                    onChange={(e) => setForm({ ...form, cantidad_kg: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Fecha</label>
                  <input
                    type="date"
                    className="input text-sm"
                    value={form.fecha_recoleccion}
                    onChange={(e) => setForm({ ...form, fecha_recoleccion: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Empresa</label>
              <select
                className="input text-sm"
                value={form.empresa_id}
                onChange={(e) => setForm({ ...form, empresa_id: e.target.value })}
              >
                <option value="">Seleccionar empresa…</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="p-4 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700">
        <button
          onClick={() => setEditMode(!editMode)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          {editMode ? 'Vista simple' : 'Editar datos'}
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => handleAction('rechazar')}
            disabled={loading}
            className="btn-danger flex items-center gap-1.5 text-sm py-2 px-3"
          >
            <XCircle className="w-4 h-4" />
            Rechazar
          </button>
          <button
            onClick={() => handleAction(editMode ? 'corregir' : 'aprobar')}
            disabled={loading}
            className="btn-primary flex items-center gap-1.5 text-sm py-2 px-3"
          >
            <CheckCircle className="w-4 h-4" />
            {editMode ? 'Corregir y aprobar' : 'Aprobar'}
          </button>
        </div>
      </div>
    </div>
  );
}
