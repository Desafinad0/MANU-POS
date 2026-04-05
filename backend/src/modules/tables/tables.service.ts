import prisma from '../../config/database';
import { CreateTableInput, UpdateTableInput } from './tables.schemas';

export class TablesService {
  async findAll(filters?: { zona?: string; estado?: string; activo?: boolean }) {
    const where: any = {};

    if (filters?.zona) {
      where.zona = filters.zona;
    }
    if (filters?.estado) {
      where.estado = filters.estado;
    }
    if (filters?.activo !== undefined) {
      where.activo = filters.activo;
    } else {
      where.activo = true;
    }

    const mesas = await prisma.mesa.findMany({
      where,
      orderBy: [{ zona: 'asc' }, { orden: 'asc' }],
      include: {
        _count: {
          select: {
            ordenes: {
              where: {
                estado: { in: ['ABIERTA', 'EN_COCINA', 'LISTA'] },
              },
            },
          },
        },
      },
    });

    return mesas;
  }

  async findById(id: string) {
    const mesa = await prisma.mesa.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            ordenes: {
              where: {
                estado: { in: ['ABIERTA', 'EN_COCINA', 'LISTA'] },
              },
            },
          },
        },
      },
    });
    if (!mesa) throw new Error('Mesa no encontrada');
    return mesa;
  }

  async create(input: CreateTableInput) {
    const existing = await prisma.mesa.findUnique({
      where: { nombre: input.nombre },
    });
    if (existing) throw new Error('Ya existe una mesa con ese nombre');

    return prisma.mesa.create({ data: input });
  }

  async update(id: string, input: UpdateTableInput) {
    await this.findById(id);

    if (input.nombre) {
      const existing = await prisma.mesa.findFirst({
        where: { nombre: input.nombre, id: { not: id } },
      });
      if (existing) throw new Error('Ya existe una mesa con ese nombre');
    }

    return prisma.mesa.update({ where: { id }, data: input });
  }

  async remove(id: string) {
    await this.findById(id);
    return prisma.mesa.update({ where: { id }, data: { activo: false } });
  }

  async updateEstado(id: string, estado: 'DISPONIBLE' | 'OCUPADA' | 'RESERVADA') {
    await this.findById(id);
    return prisma.mesa.update({ where: { id }, data: { estado } });
  }
}
