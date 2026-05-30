import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import React from 'react';
import type { Recoleccion, Empresa, MetricasImpacto } from '@/types';
import { calcularMetricas } from './metricas';

const styles = StyleSheet.create({
  page:         { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1f2937' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '2 solid #16a34a', paddingBottom: 12 },
  title:        { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#16a34a' },
  subtitle:     { fontSize: 12, color: '#6b7280', marginTop: 2 },
  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#16a34a', marginBottom: 8, borderBottom: '1 solid #d1fae5', paddingBottom: 4 },
  tableHeader:  { flexDirection: 'row', backgroundColor: '#f0fdf4', padding: '6 4', fontFamily: 'Helvetica-Bold' },
  tableRow:     { flexDirection: 'row', padding: '5 4', borderBottom: '1 solid #f3f4f6' },
  col1:         { width: '20%' },
  col2:         { width: '30%' },
  col3:         { width: '25%' },
  col4:         { width: '25%', textAlign: 'right' },
  metricGrid:   { flexDirection: 'row', gap: 12 },
  metricBox:    { flex: 1, backgroundColor: '#f0fdf4', borderRadius: 6, padding: 12, border: '1 solid #bbf7d0' },
  metricValue:  { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#16a34a' },
  metricLabel:  { fontSize: 9, color: '#6b7280', marginTop: 2 },
  footer:       { position: 'absolute', bottom: 24, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#9ca3af' },
});

function agruparPorMaterial(recolecciones: Recoleccion[]) {
  return recolecciones.reduce<Record<string, number>>((acc, r) => {
    acc[r.tipo_material] = (acc[r.tipo_material] ?? 0) + Number(r.cantidad_kg);
    return acc;
  }, {});
}

function agruparPorMes(recolecciones: Recoleccion[]) {
  return recolecciones.reduce<Record<string, number>>((acc, r) => {
    const mes = r.fecha_recoleccion.slice(0, 7);
    acc[mes] = (acc[mes] ?? 0) + Number(r.cantidad_kg);
    return acc;
  }, {});
}

interface ReporteProps {
  empresa: Empresa;
  recolecciones: Recoleccion[];
  anio: number;
  metricas: MetricasImpacto;
}

function ReportePDF({ empresa, recolecciones, anio, metricas }: ReporteProps) {
  const porMaterial = agruparPorMaterial(recolecciones);
  const porMes      = agruparPorMes(recolecciones);

  return React.createElement(Document, null,
    React.createElement(Page, { size: 'A4', style: styles.page },
      // Header
      React.createElement(View, { style: styles.header },
        React.createElement(View, null,
          React.createElement(Text, { style: styles.title }, 'Fundares Recycling'),
          React.createElement(Text, { style: styles.subtitle }, `Reporte Anual ${anio} — ${empresa.nombre}`),
        ),
      ),

      // Métricas de impacto
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Impacto Ambiental'),
        React.createElement(View, { style: styles.metricGrid },
          React.createElement(View, { style: styles.metricBox },
            React.createElement(Text, { style: styles.metricValue }, `${metricas.total_kg} kg`),
            React.createElement(Text, { style: styles.metricLabel }, 'Total reciclado'),
          ),
          React.createElement(View, { style: styles.metricBox },
            React.createElement(Text, { style: styles.metricValue }, `${metricas.co2_kg} kg`),
            React.createElement(Text, { style: styles.metricLabel }, 'CO₂ evitado'),
          ),
          React.createElement(View, { style: styles.metricBox },
            React.createElement(Text, { style: styles.metricValue }, `${metricas.agua_litros} L`),
            React.createElement(Text, { style: styles.metricLabel }, 'Agua ahorrada'),
          ),
          React.createElement(View, { style: styles.metricBox },
            React.createElement(Text, { style: styles.metricValue }, `${metricas.arboles}`),
            React.createElement(Text, { style: styles.metricLabel }, 'Árboles equivalentes'),
          ),
        ),
      ),

      // Por material
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Reciclaje por Material'),
        React.createElement(View, { style: styles.tableHeader },
          React.createElement(Text, { style: { ...styles.col2 } }, 'Material'),
          React.createElement(Text, { style: { ...styles.col4 } }, 'Total (kg)'),
        ),
        ...Object.entries(porMaterial).map(([mat, kg]) =>
          React.createElement(View, { style: styles.tableRow, key: mat },
            React.createElement(Text, { style: styles.col2 }, mat),
            React.createElement(Text, { style: styles.col4 }, kg.toFixed(2)),
          )
        ),
      ),

      // Por mes
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Reciclaje por Mes'),
        React.createElement(View, { style: styles.tableHeader },
          React.createElement(Text, { style: styles.col2 }, 'Mes'),
          React.createElement(Text, { style: styles.col4 }, 'Total (kg)'),
        ),
        ...Object.entries(porMes).sort().map(([mes, kg]) =>
          React.createElement(View, { style: styles.tableRow, key: mes },
            React.createElement(Text, { style: styles.col2 }, mes),
            React.createElement(Text, { style: styles.col4 }, kg.toFixed(2)),
          )
        ),
      ),

      // Footer
      React.createElement(Text, { style: styles.footer },
        `Generado por Fundares Recycling Platform · ${new Date().toLocaleDateString('es-BO')}`
      ),
    )
  );
}

export async function generarReportePDF(
  empresa: Empresa,
  recolecciones: Recoleccion[],
  anio: number,
): Promise<Buffer> {
  const metricas = calcularMetricas(recolecciones);
  const doc      = React.createElement(ReportePDF, { empresa, recolecciones, anio, metricas });
  const blob     = await pdf(doc as any).toBuffer();
  return blob;
}
