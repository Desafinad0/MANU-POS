import prisma from '../../config/database';

export class SuppliersService {
  async findAll(page: number, limit: number, search?: string) {
    const where: any = { activo: true };
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { contacto: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.proveedor.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nombre: 'asc' },
      }),
      prisma.proveedor.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    const proveedor = await prisma.proveedor.findUnique({ where: { id } });
    if (!proveedor) throw new Error('Proveedor no encontrado');
    return proveedor;
  }

  async create(input: {
    nombre: string;
    contacto?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    notas?: string;
  }) {
    return prisma.proveedor.create({ data: input });
  }

  async update(id: string, input: {
    nombre?: string;
    contacto?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    notas?: string;
  }) {
    await this.findById(id);
    return prisma.proveedor.update({ where: { id }, data: input });
  }

  async delete(id: string) {
    await this.findById(id);
    return prisma.proveedor.update({ where: { id }, data: { activo: false } });
  }
}
