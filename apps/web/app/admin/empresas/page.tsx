'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Empresa } from '@/types';

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [nombre,   setNombre]   = useState('');
  const [email,    setEmail]    = useState('');
  const [saving,   setSaving]   = useState(false);

  async function cargar() {
    setLoading(true);
    const res  = await fetch('/api/empresas');
    const json = await res.json() as { data: Empresa[] };
    setEmpresas(json.data ?? []);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/empresas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, contacto_email: email || undefined }),
    });
    if (res.ok) {
      toast.success('Empresa creada');
      setNombre(''); setEmail('');
      cargar();
    } else {
      toast.error('Error al crear empresa');
    }
    setSaving(false);
  }

  async function handleEliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    await fetch(`/api/empresas?id=${id}`, { method: 'DELETE' });
    toast.success('Empresa eliminada');
    cargar();
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Empresas aliadas</h1>

      {/* Form */}
      <Card>
        <CardHeader><CardTitle>Agregar empresa</CardTitle></CardHeader>
        <CardBody>
          <form onSubmit={handleCrear} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
              <input
                required value={nombre} onChange={e => setNombre(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                placeholder="Industrias Bisa"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Email contacto</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                placeholder="contacto@empresa.com"
              />
            </div>
            <Button type="submit" disabled={saving}>
              <Plus className="w-4 h-4" />
              {saving ? 'Guardando…' : 'Agregar'}
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* List */}
      <Card>
        <CardHeader><CardTitle>{loading ? '…' : `${empresas.length} empresas`}</CardTitle></CardHeader>
        <CardBody className="divide-y divide-gray-100 dark:divide-gray-800 p-0">
          {loading ? (
            <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div>
          ) : empresas.length === 0 ? (
            <p className="text-center text-gray-400 py-10">Sin empresas registradas</p>
          ) : (
            empresas.map(emp => (
              <div key={emp.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{emp.nombre}</p>
                    {emp.contacto_email && <p className="text-xs text-gray-400">{emp.contacto_email}</p>}
                  </div>
                </div>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => handleEliminar(emp.id, emp.nombre)}
                  className="text-red-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
