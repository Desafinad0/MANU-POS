import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...');

  // Create roles
  const adminRole = await prisma.rol.upsert({
    where: { nombre: 'admin' },
    update: {},
    create: {
      nombre: 'admin',
      descripcion: 'Administrador con acceso total',
      permisos: [
        'VENTAS_CREAR', 'VENTAS_CANCELAR', 'VENTAS_VER',
        'PRODUCTOS_CREAR', 'PRODUCTOS_EDITAR', 'PRODUCTOS_ELIMINAR',
        'RECETAS_GESTIONAR',
        'INVENTARIO_VER', 'INVENTARIO_ENTRADAS', 'INVENTARIO_AJUSTES', 'INVENTARIO_TRANSFERENCIAS',
        'CAJA_ABRIR', 'CAJA_CERRAR', 'CAJA_VER_TODAS',
        'USUARIOS_GESTIONAR', 'ROLES_GESTIONAR',
        'REPORTES_VER', 'DESCUENTOS_APLICAR',
      ],
    },
  });

  const supervisorRole = await prisma.rol.upsert({
    where: { nombre: 'supervisor' },
    update: {},
    create: {
      nombre: 'supervisor',
      descripcion: 'Supervisor con permisos de gestión',
      permisos: [
        'VENTAS_CREAR', 'VENTAS_CANCELAR', 'VENTAS_VER',
        'PRODUCTOS_CREAR', 'PRODUCTOS_EDITAR',
        'RECETAS_GESTIONAR',
        'INVENTARIO_VER', 'INVENTARIO_ENTRADAS', 'INVENTARIO_AJUSTES', 'INVENTARIO_TRANSFERENCIAS',
        'CAJA_ABRIR', 'CAJA_CERRAR', 'CAJA_VER_TODAS',
        'REPORTES_VER', 'DESCUENTOS_APLICAR',
      ],
    },
  });

  const cajeroRole = await prisma.rol.upsert({
    where: { nombre: 'cajero' },
    update: {},
    create: {
      nombre: 'cajero',
      descripcion: 'Cajero con permisos de venta y caja',
      permisos: [
        'VENTAS_CREAR', 'VENTAS_VER',
        'CAJA_ABRIR', 'CAJA_CERRAR',
        'INVENTARIO_VER',
      ],
    },
  });

  const cocinaRole = await prisma.rol.upsert({
    where: { nombre: 'cocina' },
    update: {},
    create: {
      nombre: 'cocina',
      descripcion: 'Personal de cocina - solo ve pedidos',
      permisos: ['VENTAS_VER'],
    },
  });

  console.log('✅ Roles creados:', { adminRole: adminRole.nombre, supervisorRole: supervisorRole.nombre, cajeroRole: cajeroRole.nombre, cocinaRole: cocinaRole.nombre });

  // Create admin user
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const adminUser = await prisma.usuario.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@manuaguachiles.com',
      passwordHash,
      nombre: 'Administrador',
      apellido: 'Sistema',
      pin: '0000',
      roles: {
        create: { rolId: adminRole.id },
      },
    },
  });

  console.log('✅ Usuario admin creado:', adminUser.username);

  // Create default warehouses
  const almacenes = ['Cocina', 'Barra', 'Almacén Seco'];
  const existingAlmacenes = await prisma.almacen.findMany();
  if (existingAlmacenes.length === 0) {
    await prisma.almacen.createMany({
      data: almacenes.map((nombre) => ({
        nombre,
        descripcion: `Almacén de ${nombre.toLowerCase()}`,
      })),
    });
    console.log('✅ Almacenes creados:', almacenes);
  }

  // Create sample categories
  const existingCategorias = await prisma.categoria.findMany();
  if (existingCategorias.length === 0) {
    const categorias = [
      { nombre: 'Aguachiles', descripcion: 'Aguachiles frescos', orden: 1 },
      { nombre: 'Ceviches', descripcion: 'Ceviches y tostadas', orden: 2 },
      { nombre: 'Cocteles', descripcion: 'Cocteles de mariscos', orden: 3 },
      { nombre: 'Bebidas', descripcion: 'Bebidas y refrescos', orden: 4 },
      { nombre: 'Extras', descripcion: 'Extras y complementos', orden: 5 },
    ];

    await prisma.categoria.createMany({ data: categorias });
    console.log('✅ Categorías creadas:', categorias.map((c) => c.nombre));
  }

  console.log('🎉 Seed completado exitosamente');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
