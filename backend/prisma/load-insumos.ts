import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📦 Cargando insumos desde historial de compras...');

  const insumos: { sku: string; nombre: string; unidad: string; costo: number; perecedero: boolean }[] = [
    // === MARISCOS Y PROTEÍNAS ===
    { sku: 'INS-001', nombre: 'CAMARÓN CRUDO 16-20', unidad: 'KG', costo: 225, perecedero: true },
    { sku: 'INS-002', nombre: 'CAMARÓN CRUDO 21-25', unidad: 'KG', costo: 195, perecedero: true },
    { sku: 'INS-003', nombre: 'CAMARÓN CRUDO 26-30', unidad: 'KG', costo: 190, perecedero: true },
    { sku: 'INS-004', nombre: 'CAMARÓN CRUDO 31-35', unidad: 'KG', costo: 177, perecedero: true },
    { sku: 'INS-005', nombre: 'CAMARÓN CRUDO 41-50', unidad: 'KG', costo: 170, perecedero: true },
    { sku: 'INS-006', nombre: 'ATÚN (MEDALLÓN)', unidad: 'KG', costo: 185, perecedero: true },
    { sku: 'INS-007', nombre: 'PULPO CRUDO', unidad: 'KG', costo: 200, perecedero: true },
    { sku: 'INS-008', nombre: 'CALLO DE HACHA', unidad: 'KG', costo: 400, perecedero: true },
    { sku: 'INS-009', nombre: 'FILETE DE MOJARRA', unidad: 'CAJA', costo: 340, perecedero: true },

    // === VERDURAS Y FRUTAS ===
    { sku: 'INS-010', nombre: 'AGUACATE HASS', unidad: 'CAJA', costo: 380, perecedero: true },
    { sku: 'INS-011', nombre: 'CEBOLLA MORADA', unidad: 'KG', costo: 23, perecedero: true },
    { sku: 'INS-012', nombre: 'CILANTRO', unidad: 'KG', costo: 60, perecedero: true },
    { sku: 'INS-013', nombre: 'PEPINO', unidad: 'KG', costo: 41.30, perecedero: true },
    { sku: 'INS-014', nombre: 'TOMATE HUAJE', unidad: 'KG', costo: 62, perecedero: true },
    { sku: 'INS-015', nombre: 'LECHUGA ROMANA', unidad: 'PIEZA', costo: 23, perecedero: true },
    { sku: 'INS-016', nombre: 'LIMONES', unidad: 'CAJA', costo: 680, perecedero: true },
    { sku: 'INS-017', nombre: 'ZANAHORIA', unidad: 'KG', costo: 4.40, perecedero: true },
    { sku: 'INS-018', nombre: 'AJOS', unidad: 'KG', costo: 150, perecedero: true },
    { sku: 'INS-019', nombre: 'PAPA', unidad: 'KG', costo: 25, perecedero: true },

    // === ACEITES, SALSAS Y CONDIMENTOS ===
    { sku: 'INS-020', nombre: 'ACEITE DE SOYA 5L', unidad: 'PIEZA', costo: 183, perecedero: false },
    { sku: 'INS-021', nombre: 'ACEITE VEGETAL 10L', unidad: 'PIEZA', costo: 357, perecedero: false },
    { sku: 'INS-022', nombre: 'MAYONESA HELLMANS 13L', unidad: 'PIEZA', costo: 1098, perecedero: false },
    { sku: 'INS-023', nombre: 'CATSUP 3.8KG', unidad: 'PIEZA', costo: 132, perecedero: false },
    { sku: 'INS-024', nombre: 'SALSA INGLESA 980ML', unidad: 'PIEZA', costo: 160.90, perecedero: false },
    { sku: 'INS-025', nombre: 'SALSA HABANERA 950ML', unidad: 'PIEZA', costo: 94.20, perecedero: false },
    { sku: 'INS-026', nombre: 'SALSA HUICHOL NEGRA 190ML', unidad: 'PIEZA', costo: 16.90, perecedero: false },
    { sku: 'INS-027', nombre: 'SALSA HABANERA ROJA 190ML', unidad: 'PIEZA', costo: 14.30, perecedero: false },
    { sku: 'INS-028', nombre: 'JUGO SAZONADOR MAGGI 1.9L', unidad: 'PIEZA', costo: 431.90, perecedero: false },
    { sku: 'INS-029', nombre: 'CLAMATO 946ML', unidad: 'PIEZA', costo: 53, perecedero: false },
    { sku: 'INS-030', nombre: 'TAJIN', unidad: 'PIEZA', costo: 131.97, perecedero: false },
    { sku: 'INS-031', nombre: 'CHILE CHIPOTLE CLEMENTE', unidad: 'PIEZA', costo: 14.62, perecedero: false },
    { sku: 'INS-032', nombre: 'SAL DE MAR', unidad: 'BOLSA', costo: 80.82, perecedero: false },
    { sku: 'INS-033', nombre: 'PIMIENTA NEGRA ENTERA', unidad: 'PIEZA', costo: 200, perecedero: false },
    { sku: 'INS-034', nombre: 'ORÉGANO CHINO', unidad: 'BOLSA', costo: 8, perecedero: false },
    { sku: 'INS-035', nombre: 'CLAVO ENTERO', unidad: 'PIEZA', costo: 6, perecedero: false },
    { sku: 'INS-036', nombre: 'KNORR CALDO DE POLLO 10G', unidad: 'PIEZA', costo: 8, perecedero: false },
    { sku: 'INS-037', nombre: 'CONSOMATE 10G', unidad: 'PIEZA', costo: 8, perecedero: false },
    { sku: 'INS-038', nombre: 'SALSA CATSUP SOBRES (50)', unidad: 'PIEZA', costo: 14.90, perecedero: false },

    // === LÁCTEOS Y HUEVO ===
    { sku: 'INS-039', nombre: 'CREMA', unidad: 'PIEZA', costo: 115.60, perecedero: true },
    { sku: 'INS-040', nombre: 'LECHE DESLACTOSADA 1L', unidad: 'PIEZA', costo: 34, perecedero: true },
    { sku: 'INS-041', nombre: 'HUEVO', unidad: 'KG', costo: 58, perecedero: true },
    { sku: 'INS-042', nombre: 'MARGARINA PRIMAVERA', unidad: 'PIEZA', costo: 22, perecedero: true },

    // === PAN Y EMPANIZADOS ===
    { sku: 'INS-043', nombre: 'PAN MOLIDO 400G', unidad: 'PIEZA', costo: 40, perecedero: false },
    { sku: 'INS-044', nombre: 'EMPANIZADOR CRUJIENTE 175G', unidad: 'PIEZA', costo: 58, perecedero: false },
    { sku: 'INS-045', nombre: 'GALLETA MOLIDA', unidad: 'KG', costo: 69.90, perecedero: false },
    { sku: 'INS-046', nombre: 'GALLETAS GAMESA (CAJA 200)', unidad: 'CAJA', costo: 212, perecedero: false },
    { sku: 'INS-047', nombre: 'TOSTADAS AJONJOLÍ', unidad: 'CAJA', costo: 9, perecedero: false },
    { sku: 'INS-048', nombre: 'ARROZ 1KG', unidad: 'PIEZA', costo: 42.50, perecedero: false },

    // === PAPAS CONGELADAS ===
    { sku: 'INS-049', nombre: 'PAPA McCAIN 2.27KG', unidad: 'PIEZA', costo: 138, perecedero: true },
    { sku: 'INS-050', nombre: 'PAPA CORTE RECTO TOTAL CHEF', unidad: 'KG', costo: 128.90, perecedero: true },

    // === BEBIDAS (PARA REVENTA) ===
    { sku: 'INS-051', nombre: 'COCA COLA REG 500ML (CAJA)', unidad: 'CAJA', costo: 320, perecedero: false },
    { sku: 'INS-052', nombre: 'COCA COLA LIGHT 500ML (CAJA)', unidad: 'CAJA', costo: 320, perecedero: false },
    { sku: 'INS-053', nombre: 'COCA COLA MIXTA (CAJA)', unidad: 'CAJA', costo: 305, perecedero: false },
    { sku: 'INS-054', nombre: 'JOYA MANZANA 500ML (CAJA)', unidad: 'CAJA', costo: 420, perecedero: false },
    { sku: 'INS-055', nombre: 'JOYA PONCHE 500ML (CAJA)', unidad: 'CAJA', costo: 305, perecedero: false },
    { sku: 'INS-056', nombre: 'AGUA 500ML (PAQUETE 45)', unidad: 'CAJA', costo: 122.76, perecedero: false },
    { sku: 'INS-057', nombre: 'AGUAS DE SABOR (CAJA)', unidad: 'CAJA', costo: 319, perecedero: false },
    { sku: 'INS-058', nombre: 'TOPO CHICO 600ML', unidad: 'PIEZA', costo: 23, perecedero: false },
    { sku: 'INS-059', nombre: 'SPRITE 500ML', unidad: 'PIEZA', costo: 15, perecedero: false },
    { sku: 'INS-060', nombre: 'ELECTROLIT 625ML', unidad: 'PIEZA', costo: 22.89, perecedero: false },

    // === SNACKS (PARA REVENTA) ===
    { sku: 'INS-061', nombre: 'TOSTITOS FLAMIN HOT (10/70G)', unidad: 'BOLSA', costo: 171.20, perecedero: false },
    { sku: 'INS-062', nombre: 'TOSTITOS SALSA VERDE (10/70G)', unidad: 'BOLSA', costo: 190, perecedero: false },
    { sku: 'INS-063', nombre: 'TOSTITOS/CRUJITO (CAJA)', unidad: 'BOLSA', costo: 170, perecedero: false },
    { sku: 'INS-064', nombre: 'PASTILLAS MENTA', unidad: 'BOLSA', costo: 168.79, perecedero: false },

    // === DESECHABLES Y EMPAQUE ===
    { sku: 'INS-065', nombre: 'ENVASE PLÁSTICO 1L', unidad: 'BOLSA', costo: 71, perecedero: false },
    { sku: 'INS-066', nombre: 'ENVASE PLÁSTICO 1/2L', unidad: 'BOLSA', costo: 52, perecedero: false },
    { sku: 'INS-067', nombre: 'CONTENEDOR 8X8 CON DIVISIÓN (C/50)', unidad: 'BOLSA', costo: 124.50, perecedero: false },
    { sku: 'INS-068', nombre: 'CONTENEDOR 7X7 LISO (C/50)', unidad: 'BOLSA', costo: 88, perecedero: false },
    { sku: 'INS-069', nombre: 'CAJA ALMEJA TRANSPARENTE', unidad: 'PIEZA', costo: 3, perecedero: false },
    { sku: 'INS-070', nombre: 'CAJA TRANSPARENTE 24X16X7', unidad: 'PIEZA', costo: 6.20, perecedero: false },
    { sku: 'INS-071', nombre: 'ENVASE TÉRMICO 716 (C/25)', unidad: 'BOLSA', costo: 26.50, perecedero: false },
    { sku: 'INS-072', nombre: 'ENVASE TÉRMICO 732 (C/15)', unidad: 'BOLSA', costo: 29, perecedero: false },
    { sku: 'INS-073', nombre: 'TAPA PLÁSTICA 416 (C/25)', unidad: 'BOLSA', costo: 46, perecedero: false },
    { sku: 'INS-074', nombre: 'TAPA PLÁSTICA NL8 (C/25)', unidad: 'BOLSA', costo: 32, perecedero: false },
    { sku: 'INS-075', nombre: 'BOLSA ECO GRANDE', unidad: 'BOLSA', costo: 44, perecedero: false },
    { sku: 'INS-076', nombre: 'BOLSA ECO MEDIANA', unidad: 'BOLSA', costo: 112, perecedero: false },
    { sku: 'INS-077', nombre: 'BOLSA ECO CHICA', unidad: 'BOLSA', costo: 44, perecedero: false },
    { sku: 'INS-078', nombre: 'BOLSA CELOFÁN 15X20 (C/100)', unidad: 'BOLSA', costo: 31, perecedero: false },
    { sku: 'INS-079', nombre: 'BOLSA NATURAL 10X20 (C/20)', unidad: 'BOLSA', costo: 60, perecedero: false },
    { sku: 'INS-080', nombre: 'VITAFILM 35CM 600MTS', unidad: 'PIEZA', costo: 235, perecedero: false },
    { sku: 'INS-081', nombre: 'BISAGRA CON TAPA BAJA 11X10X5', unidad: 'BOLSA', costo: 7.50, perecedero: false },

    // === CUBIERTOS Y SERVICIO ===
    { sku: 'INS-082', nombre: 'CUCHARAS MEDIANAS (C/25)', unidad: 'BOLSA', costo: 9.49, perecedero: false },
    { sku: 'INS-083', nombre: 'CUCHARA SOPERA (C/25)', unidad: 'PIEZA', costo: 15, perecedero: false },
    { sku: 'INS-084', nombre: 'TENEDOR GRANDE (C/25)', unidad: 'BOLSA', costo: 15, perecedero: false },
    { sku: 'INS-085', nombre: 'TENEDOR MEDIANO (C/25)', unidad: 'BOLSA', costo: 9.49, perecedero: false },
    { sku: 'INS-086', nombre: 'SERVILLETA DALIA (C/500)', unidad: 'BOLSA', costo: 38.50, perecedero: false },
    { sku: 'INS-087', nombre: 'COMANDA', unidad: 'BOLSA', costo: 7, perecedero: false },

    // === LIMPIEZA ===
    { sku: 'INS-088', nombre: 'JABÓN LAVAPLATOS', unidad: 'PIEZA', costo: 101.28, perecedero: false },
    { sku: 'INS-089', nombre: 'FABULOSO 4L', unidad: 'PIEZA', costo: 40, perecedero: false },
    { sku: 'INS-090', nombre: 'PINOL', unidad: 'PIEZA', costo: 48, perecedero: false },
    { sku: 'INS-091', nombre: 'FIBRA VERDE / ESPONJA', unidad: 'PIEZA', costo: 28.50, perecedero: false },
    { sku: 'INS-092', nombre: 'ÁCIDO MURIÁTICO', unidad: 'PIEZA', costo: 25, perecedero: false },

    // === HIELO ===
    { sku: 'INS-093', nombre: 'BOLSA DE HIELO 5KG', unidad: 'BOLSA', costo: 50, perecedero: true },
  ];

  let created = 0;
  let skipped = 0;

  for (const ins of insumos) {
    const exists = await prisma.insumo.findUnique({ where: { sku: ins.sku } });
    if (exists) {
      skipped++;
      continue;
    }

    await prisma.insumo.create({
      data: {
        nombre: ins.nombre,
        sku: ins.sku,
        unidadMedida: ins.unidad,
        costoPromedio: ins.costo,
        ultimoCosto: ins.costo,
        perecedero: ins.perecedero,
        activo: true,
      },
    });
    created++;
  }

  console.log(`✅ Insumos creados: ${created}`);
  if (skipped > 0) console.log(`⏭️  Insumos ya existentes (omitidos): ${skipped}`);
  console.log('🎉 Carga de insumos completada');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
