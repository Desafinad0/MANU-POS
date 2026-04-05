import prisma from '../../../config/database';
import { CreateSupplyInput, UpdateSupplyInput } from './supplies.schemas';

export class SuppliesService {
  async findAll(page: number, limit: number, search?: string) {
    const where: any = { activo: true };
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [insumos, total] = await Promise.all([
      prisma.insumo.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { creadoEn: 'desc' },
      }),
      prisma.insumo.count({ where }),
    ]);

    return { data: insumos, total };
  }

  async findById(id: string) {
    const insumo = await prisma.insumo.findUnique({
      where: { id },
      include: {
        inventarios: {
          include: { almacen: true },
        },
      },
    });

    if (!insumo) throw new Error('Insumo no encontrado');
    return insumo;
  }

  async create(input: CreateSupplyInput) {
    const insumo = await prisma.insumo.create({
      data: {
        nombre: input.nombre,
        sku: input.sku,
        unidadMedida: input.unidadMedida,
        descripcion: input.descripcion,
        costoPromedio: input.costoPromedio ?? 0,
        ultimoCosto: input.ultimoCosto ?? 0,
        nivelMinimo: input.nivelMinimo ?? 0,
        nivelMaximo: input.nivelMaximo ?? 0,
        perecedero: input.perecedero ?? false,
      },
    });

    return insumo;
  }

  async update(id: string, input: UpdateSupplyInput) {
    const exists = await prisma.insumo.findUnique({ where: { id } });
    if (!exists) throw new Error('Insumo no encontrado');

    const insumo = await prisma.insumo.update({
      where: { id },
      data: input,
    });

    return insumo;
  }

  async delete(id: string) {
    const exists = await prisma.insumo.findUnique({ where: { id } });
    if (!exists) throw new Error('Insumo no encontrado');

    await prisma.insumo.update({
      where: { id },
      data: { activo: false },
    });
  }
}
