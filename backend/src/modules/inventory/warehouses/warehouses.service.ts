import prisma from '../../../config/database';
import { CreateWarehouseInput, UpdateWarehouseInput } from './warehouses.schemas';

export class WarehousesService {
  async findAll() {
    const almacenes = await prisma.almacen.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });

    return almacenes;
  }

  async findById(id: string) {
    const almacen = await prisma.almacen.findUnique({
      where: { id },
      include: {
        inventarios: {
          include: { insumo: true },
        },
      },
    });

    if (!almacen) throw new Error('Almacén no encontrado');
    return almacen;
  }

  async create(input: CreateWarehouseInput) {
    const almacen = await prisma.almacen.create({
      data: {
        nombre: input.nombre,
        descripcion: input.descripcion,
      },
    });

    return almacen;
  }

  async update(id: string, input: UpdateWarehouseInput) {
    const exists = await prisma.almacen.findUnique({ where: { id } });
    if (!exists) throw new Error('Almacén no encontrado');

    const almacen = await prisma.almacen.update({
      where: { id },
      data: input,
    });

    return almacen;
  }
}
