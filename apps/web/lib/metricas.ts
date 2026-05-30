import type { MetricasImpacto } from '@/types';

const FACTORES: Record<string, { co2_kg: number; agua_litros: number; arboles: number }> = {
  plastico:  { co2_kg: 1.5, agua_litros: 20,  arboles: 0.01  },
  papel:     { co2_kg: 1.1, agua_litros: 15,  arboles: 0.05  },
  vidrio:    { co2_kg: 0.3, agua_litros: 3,   arboles: 0.001 },
  metal:     { co2_kg: 4.0, agua_litros: 50,  arboles: 0.02  },
  carton:    { co2_kg: 0.9, agua_litros: 12,  arboles: 0.04  },
  electronico:{ co2_kg: 2.0, agua_litros: 30, arboles: 0.015 },
  organico:  { co2_kg: 0.5, agua_litros: 5,   arboles: 0.008 },
};

const DEFAULT_FACTOR = { co2_kg: 1.0, agua_litros: 10, arboles: 0.01 };

export function calcularMetricas(
  recolecciones: { tipo_material: string; cantidad_kg: number }[],
): MetricasImpacto {
  let co2 = 0, agua = 0, arboles = 0, total = 0;

  for (const r of recolecciones) {
    const key    = r.tipo_material.toLowerCase().split(' ')[0];
    const factor = FACTORES[key] ?? DEFAULT_FACTOR;
    co2     += r.cantidad_kg * factor.co2_kg;
    agua    += r.cantidad_kg * factor.agua_litros;
    arboles += r.cantidad_kg * factor.arboles;
    total   += r.cantidad_kg;
  }

  return {
    co2_kg:      Math.round(co2 * 100) / 100,
    agua_litros: Math.round(agua),
    arboles:     Math.round(arboles * 100) / 100,
    total_kg:    Math.round(total * 100) / 100,
  };
}

export function formatMetrica(value: number, unit: string): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k ${unit}`;
  return `${value} ${unit}`;
}
