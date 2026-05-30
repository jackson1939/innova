export interface ImpactoAmbiental {
  co2_evitado_kg: number;
  arboles_equivalentes: number;
  agua_ahorrada_litros: number;
}

export type TipoMaterial = 'plastico' | 'papel' | 'vidrio' | 'metal' | 'carton';

interface FactorMaterial {
  co2_kg: number;
  agua_litros: number;
  arboles: number;
}

export const FACTORES: Record<string, FactorMaterial> = {
  plastico: { co2_kg: 1.5, agua_litros: 20, arboles: 0.01 },
  papel: { co2_kg: 1.1, agua_litros: 15, arboles: 0.05 },
  vidrio: { co2_kg: 0.3, agua_litros: 3, arboles: 0.001 },
  metal: { co2_kg: 4.0, agua_litros: 50, arboles: 0.02 },
  carton: { co2_kg: 0.9, agua_litros: 12, arboles: 0.04 },
};

export function calcularImpacto(
  tipo_material: string,
  cantidad_kg: number
): ImpactoAmbiental {
  const factor = FACTORES[tipo_material.toLowerCase()] ?? {
    co2_kg: 1.0,
    agua_litros: 10,
    arboles: 0.01,
  };

  return {
    co2_evitado_kg: +(factor.co2_kg * cantidad_kg).toFixed(2),
    arboles_equivalentes: +(factor.arboles * cantidad_kg).toFixed(3),
    agua_ahorrada_litros: +(factor.agua_litros * cantidad_kg).toFixed(1),
  };
}

export function calcularImpactoTotal(
  recolecciones: { tipo_material: string; cantidad_kg: number }[]
): ImpactoAmbiental {
  return recolecciones.reduce(
    (acc, r) => {
      const impacto = calcularImpacto(r.tipo_material, r.cantidad_kg);
      return {
        co2_evitado_kg: +(acc.co2_evitado_kg + impacto.co2_evitado_kg).toFixed(2),
        arboles_equivalentes: +(
          acc.arboles_equivalentes + impacto.arboles_equivalentes
        ).toFixed(3),
        agua_ahorrada_litros: +(
          acc.agua_ahorrada_litros + impacto.agua_ahorrada_litros
        ).toFixed(1),
      };
    },
    { co2_evitado_kg: 0, arboles_equivalentes: 0, agua_ahorrada_litros: 0 }
  );
}

export function calcularKgPorMes(
  recolecciones: { fecha_recoleccion: string; cantidad_kg: number }[],
  meses = 12
): { mes: string; kg: number }[] {
  const ahora = new Date();
  const resultado: { mes: string; kg: number }[] = [];

  for (let i = meses - 1; i >= 0; i--) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    const nombreMes = fecha.toLocaleDateString('es', { month: 'short', year: '2-digit' });

    const kg = recolecciones
      .filter((r) => r.fecha_recoleccion.startsWith(key))
      .reduce((sum, r) => sum + r.cantidad_kg, 0);

    resultado.push({ mes: nombreMes, kg: +kg.toFixed(1) });
  }

  return resultado;
}

export function calcularPorMaterial(
  recolecciones: { tipo_material: string; cantidad_kg: number }[]
): { name: string; value: number }[] {
  const mapa: Record<string, number> = {};

  for (const r of recolecciones) {
    const mat = r.tipo_material.toLowerCase();
    mapa[mat] = (mapa[mat] ?? 0) + r.cantidad_kg;
  }

  return Object.entries(mapa)
    .map(([name, value]) => ({ name, value: +value.toFixed(1) }))
    .sort((a, b) => b.value - a.value);
}
