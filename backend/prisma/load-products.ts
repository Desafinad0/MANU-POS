import { PrismaClient, TipoOrden } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📦 Cargando productos desde historial de ventas...');

  // Get existing categories
  const categorias = await prisma.categoria.findMany();
  const catMap = Object.fromEntries(categorias.map(c => [c.nombre, c.id]));

  // Ensure we have all needed categories
  const categoriasNeeded = ['Aguachiles', 'Ceviches', 'Cocteles', 'Bebidas', 'Extras', 'Tostadas', 'Platillos'];
  for (const nombre of categoriasNeeded) {
    if (!catMap[nombre]) {
      const cat = await prisma.categoria.create({
        data: {
          nombre,
          descripcion: `Categoría de ${nombre.toLowerCase()}`,
          orden: categorias.length + categoriasNeeded.indexOf(nombre) + 1,
        },
      });
      catMap[nombre] = cat.id;
      console.log(`  ✅ Categoría creada: ${nombre}`);
    }
  }

  // Products from sales history
  const productos = [
    // Aguachiles
    { sku: 'P-0001', nombre: 'AGUACHILE ATÚN', precio: 170, categoria: 'Aguachiles' },
    { sku: 'P-0003', nombre: 'AGUACHILE ATÚN + PULPO', precio: 170, categoria: 'Aguachiles' },
    { sku: 'P-0006', nombre: 'AGUACHILE CAMCO', precio: 170, categoria: 'Aguachiles' },
    { sku: 'P-0009', nombre: 'AGUACHILE CAMCO + ATÚN', precio: 170, categoria: 'Aguachiles' },
    { sku: 'P-0012', nombre: 'AGUACHILE CAMCO + ATÚN + PULPO', precio: 220, categoria: 'Aguachiles' },
    { sku: 'P-0015', nombre: 'AGUACHILE CAMCO + PULPO', precio: 170, categoria: 'Aguachiles' },
    { sku: 'P-0018', nombre: 'AGUACHILE CAMCRU', precio: 170, categoria: 'Aguachiles' },
    { sku: 'P-0021', nombre: 'AGUACHILE CAMCRU + ATÚN', precio: 170, categoria: 'Aguachiles' },
    { sku: 'P-0024', nombre: 'AGUACHILE CAMCRU + ATÚN + PULPO', precio: 220, categoria: 'Aguachiles' },
    { sku: 'P-0027', nombre: 'AGUACHILE CAMCRU + CAMCO', precio: 170, categoria: 'Aguachiles' },
    { sku: 'P-0030', nombre: 'AGUACHILE CAMCRU + CAMCO + ATÚN', precio: 220, categoria: 'Aguachiles' },
    { sku: 'P-0033', nombre: 'AGUACHILE CAMCRU + CAMCO + ATÚN + PULPO', precio: 270, categoria: 'Aguachiles' },
    { sku: 'P-0036', nombre: 'AGUACHILE CAMCRU + CAMCO + PULPO', precio: 220, categoria: 'Aguachiles' },
    { sku: 'P-0039', nombre: 'AGUACHILE CAMCRU + PULPO', precio: 170, categoria: 'Aguachiles' },

    // Ceviches
    { sku: 'P-0054', nombre: 'CEVICHE 1 L', precio: 240, categoria: 'Ceviches' },
    { sku: 'P-0057', nombre: 'CEVICHE 1/2 L', precio: 120, categoria: 'Ceviches' },
    { sku: 'P-0060', nombre: 'CEVICHE C/ATUN 1 L', precio: 340, categoria: 'Ceviches' },
    { sku: 'P-0063', nombre: 'CEVICHE C/ATUN 1/2 L', precio: 170, categoria: 'Ceviches' },
    { sku: 'P-0069', nombre: 'CEVICHE D/CAMARÓN 1/2 L', precio: 170, categoria: 'Ceviches' },
    { sku: 'P-0075', nombre: 'CEVICHE D/CAMARÓN C/PULPO 1/2 L', precio: 220, categoria: 'Ceviches' },
    { sku: 'P-0078', nombre: 'CEVICHE NEGRO 1 L', precio: 260, categoria: 'Ceviches' },
    { sku: 'P-0081', nombre: 'CEVICHE NEGRO 1/2 L', precio: 130, categoria: 'Ceviches' },

    // Cocteles
    { sku: 'P-0090', nombre: 'COCTÉL G CAMARÓN C/PULPO', precio: 220, categoria: 'Cocteles' },
    { sku: 'P-0093', nombre: 'COCTÉL G CAMARÓN C/PULPO C/CALLO G', precio: 295, categoria: 'Cocteles' },
    { sku: 'P-0096', nombre: 'COCTÉL CAMARÓN CH', precio: 80, categoria: 'Cocteles' },
    { sku: 'P-0099', nombre: 'COCTÉL CAMARÓN G', precio: 170, categoria: 'Cocteles' },

    // Tostadas
    { sku: 'P-0111', nombre: 'TOSTADA ATÚN', precio: 70, categoria: 'Tostadas' },
    { sku: 'P-0114', nombre: 'TOSTADA ATÚN + PULPO', precio: 70, categoria: 'Tostadas' },
    { sku: 'P-0117', nombre: 'TOSTADA CAMCO', precio: 70, categoria: 'Tostadas' },
    { sku: 'P-0120', nombre: 'TOSTADA CAMCO + ATÚN', precio: 70, categoria: 'Tostadas' },
    { sku: 'P-0123', nombre: 'TOSTADA CAMCO + ATÚN + PULPO', precio: 120, categoria: 'Tostadas' },
    { sku: 'P-0126', nombre: 'TOSTADA CAMCO + PULPO', precio: 70, categoria: 'Tostadas' },
    { sku: 'P-0129', nombre: 'TOSTADA CAMCRU', precio: 70, categoria: 'Tostadas' },
    { sku: 'P-0132', nombre: 'TOSTADA CAMCRU + ATÚN', precio: 70, categoria: 'Tostadas' },
    { sku: 'P-0135', nombre: 'TOSTADA CAMCRU + ATÚN + PULPO', precio: 120, categoria: 'Tostadas' },
    { sku: 'P-0138', nombre: 'TOSTADA CAMCRU + CAMCO', precio: 70, categoria: 'Tostadas' },
    { sku: 'P-0141', nombre: 'TOSTADA CAMCRU + CAMCO + ATÚN', precio: 120, categoria: 'Tostadas' },
    { sku: 'P-0147', nombre: 'TOSTADA CAMCRU + PULPO', precio: 70, categoria: 'Tostadas' },
    { sku: 'P-0150', nombre: 'TOSTADA CEVICHE', precio: 50, categoria: 'Tostadas' },
    { sku: 'P-0153', nombre: 'TOSTADA PULPO', precio: 70, categoria: 'Tostadas' },

    // Platillos
    { sku: 'P-0045', nombre: 'CALDO PESCADO 1 L', precio: 120, categoria: 'Platillos' },
    { sku: 'P-0051', nombre: 'CAMARONES EMPANIZADOS', precio: 160, categoria: 'Platillos' },
    { sku: 'P-0084', nombre: 'CHAROLA', precio: 450, categoria: 'Platillos' },
    { sku: 'P-0087', nombre: 'CHAROLA C/CALLO', precio: 600, categoria: 'Platillos' },
    { sku: 'P-0105', nombre: 'FILETE DE PESCADO', precio: 150, categoria: 'Platillos' },
    { sku: 'P-0108', nombre: 'TORRE', precio: 280, categoria: 'Platillos' },

    // Bebidas
    { sku: 'CD-0001', nombre: 'AGUA 500ML', precio: 20, categoria: 'Bebidas', tipoOrden: 'BARRA' as const },
    { sku: 'CD-0003', nombre: 'AGUA JAMAICA', precio: 25, categoria: 'Bebidas', tipoOrden: 'BARRA' as const },
    { sku: 'CD-0006', nombre: 'AGUA LIMÓN', precio: 25, categoria: 'Bebidas', tipoOrden: 'BARRA' as const },
    { sku: 'CD-0018', nombre: 'COCA COLA LIGHT', precio: 20, categoria: 'Bebidas', tipoOrden: 'BARRA' as const },
    { sku: 'CD-0021', nombre: 'COCA COLA REGULAR', precio: 20, categoria: 'Bebidas', tipoOrden: 'BARRA' as const },
    { sku: 'CD-0024', nombre: 'COCA COLA SIN AZUCAR', precio: 20, categoria: 'Bebidas', tipoOrden: 'BARRA' as const },
    { sku: 'CD-0036', nombre: 'JOYA MANZANA', precio: 20, categoria: 'Bebidas', tipoOrden: 'BARRA' as const },
    { sku: 'CD-0039', nombre: 'JOYA PONCHE', precio: 20, categoria: 'Bebidas', tipoOrden: 'BARRA' as const },

    // Extras
    { sku: 'CD-0060', nombre: 'SALSA HUICHOL NEGRA (190 ML)', precio: 25, categoria: 'Extras' },
    { sku: 'CD-0069', nombre: 'TOSTADAS (PAQUETE)', precio: 50, categoria: 'Extras' },
    { sku: 'CD-0123', nombre: 'CALLO DE HACHA', precio: 75, categoria: 'Extras' },
    { sku: 'CD-0138', nombre: 'TOSTITOS FLAMING HOT', precio: 20, categoria: 'Extras' },
    { sku: 'CD-0141', nombre: 'TOSTITOS SALSA VERDE', precio: 20, categoria: 'Extras' },
    { sku: 'GF-0003', nombre: 'AGUA (GARRAFÓN)', precio: 111, categoria: 'Extras' },
  ];

  let created = 0;
  let skipped = 0;

  for (const p of productos) {
    const exists = await prisma.producto.findUnique({ where: { sku: p.sku } });
    if (exists) {
      skipped++;
      continue;
    }

    await prisma.producto.create({
      data: {
        nombre: p.nombre,
        sku: p.sku,
        precio: p.precio,
        categoriaId: catMap[p.categoria],
        tipoOrden: (p as any).tipoOrden || TipoOrden.COCINA,
        disponible: true,
        activo: true,
      },
    });
    created++;
  }

  console.log(`✅ Productos creados: ${created}`);
  if (skipped > 0) console.log(`⏭️  Productos ya existentes (omitidos): ${skipped}`);
  console.log('🎉 Carga de productos completada');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
