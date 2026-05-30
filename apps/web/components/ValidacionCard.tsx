'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import type { Extraccion, Empresa } from '@/types';

interface ValidacionCardProps {
  extraccion: Extraccion;
  empresas: Empresa[];
  onActualizar: () => void;
}

export function ValidacionCard({ extraccion, empresas, onActualizar }: ValidacionCardProps) {
  const [expanded,  setExpanded]  = useState(false);
  const [editando,  setEditando]  = useState(false);
  const [loading,   setLoading]   = useState(false);

  const [empresaId,   setEmpresaId]   = useState(extraccion.empresa_id   ?? '');
  const [material,    setMaterial]    = useState(extraccion.tipo_material);
  const [cantidad,    setCantidad]    = useState(String(extraccion.cantidad_kg));
  const [fecha,       setFecha]       = useState(extraccion.fecha_recoleccion);

  const confianzaColor = (extraccion.confianza_ia ?? 0) >= 0.8 ? 'green'
    : (extraccion.confianza_ia ?? 0) >= 0.5 ? 'yellow' : 'red';

  async function accionar(accion: 'aprobar' | 'rechazar' | 'corregir') {
    setLoading(true);
    try {
      const res = await fetch('/api/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extraccion_id:     extraccion.id,
          accion,
          empresa_id:        empresaId || undefined,
          tipo_material:     material,
          cantidad_kg:       parseFloat(cantidad),
          fecha_recoleccion: fecha,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(accion === 'rechazar' ? 'Extracción rechazada' : 'Extracción aprobada');
      onActualizar();
    } catch {
      toast.error('Error al procesar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>{extraccion.empresas?.nombre ?? 'Empresa desconocida'}</CardTitle>
            <Badge variant={confianzaColor}>
              IA {Math.round((extraccion.confianza_ia ?? 0) * 100)}%
            </Badge>
          </div>
          <button onClick={() => setExpanded(v => !v)} className="text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">{new Date(extraccion.created_at).toLocaleString('es-BO')}</p>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* Mensaje original */}
        {extraccion.mensajes_recolector?.contenido_texto && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-300">
            <p className="text-xs font-medium text-gray-400 mb-1">Mensaje original</p>
            {extraccion.mensajes_recolector.contenido_texto}
          </div>
        )}

        {/* Datos extraídos / editables */}
        {editando ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Empresa</label>
              <select
                value={empresaId}
                onChange={e => setEmpresaId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="">Sin empresa</option>
                {empresas.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Material</label>
              <select
                value={material}
                onChange={e => setMaterial(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700"
              >
                {['plastico','papel','vidrio','metal','carton','electronico','organico'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Cantidad (kg)</label>
              <input
                type="number" step="0.01" value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha</label>
              <input
                type="date" value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-400">Material: </span><span className="font-medium capitalize">{extraccion.tipo_material}</span></div>
            <div><span className="text-gray-400">Cantidad: </span><span className="font-medium">{extraccion.cantidad_kg} kg</span></div>
            <div><span className="text-gray-400">Fecha: </span><span className="font-medium">{extraccion.fecha_recoleccion}</span></div>
            <div><span className="text-gray-400">Empresa ID: </span><span className="font-medium text-xs">{extraccion.empresa_id ?? '—'}</span></div>
          </div>
        )}

        {/* Raw JSON expandido */}
        {expanded && extraccion.datos_raw && (
          <pre className="text-xs bg-gray-900 text-green-400 rounded-lg p-3 overflow-auto max-h-32">
            {JSON.stringify(extraccion.datos_raw, null, 2)}
          </pre>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm" variant="primary"
            onClick={() => accionar(editando ? 'corregir' : 'aprobar')}
            disabled={loading}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {editando ? 'Guardar y aprobar' : 'Aprobar'}
          </Button>
          <Button
            size="sm" variant="secondary"
            onClick={() => setEditando(v => !v)}
            disabled={loading}
          >
            <Edit2 className="w-3.5 h-3.5" />
            {editando ? 'Cancelar edición' : 'Editar'}
          </Button>
          <Button
            size="sm" variant="danger"
            onClick={() => accionar('rechazar')}
            disabled={loading}
          >
            <XCircle className="w-3.5 h-3.5" />
            Rechazar
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
