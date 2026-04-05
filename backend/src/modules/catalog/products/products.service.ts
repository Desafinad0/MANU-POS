import prisma from '../../../config/database';
import { CreateProductInput, UpdateProductInput, CreateVariantInput, UpdateVariantInput } from './products.schemas';

export class ProductsService {
  async findAll(page: number, limit: number, search?: string, categoriaId?: string) {
    const where: any = { activo: true };

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoriaId) {
      where.categoriaId = categoriaId;
    }

    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          categoria: true,
          variantes: { where: { activo: true } },
        },
        orderBy: { nombre: 'asc' },
      }),
      prisma.producto.count({ where }),
    ]);

    return { data: productos, total };
  }

  async findForPOS() {
    const productos = await prisma.producto.findMany({
      where: { activo: true, disponible: true },
      include: {
        variantes: { where: { activo: true } },
        categoria: { select: { id: true, nombre: true } },
      },
      orderBy: { nombre: 'asc' },
    });

    return productos;
  }

  async findById(id: string) {
    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: true,
        variantes: { where: { activo: true } },
        receta: {
          include: {
            detalles: {
              include: { insumo: true },
            },
          },
        },
      },
    });

    if (!producto) throw new Error('Producto no encontrado');
    return producto;
  }

  async create(input: CreateProductInput) {
    const producto = await prisma.producto.create({
      data: {
        nombre: input.nombre,
        sku: input.sku,
        precio: input.precio,
        categoriaId: input.categoriaId,
        tipoOrden: input.tipoOrden as any,
        descripcion: input.descripcion,
        imagen: input.imagen,
      },
      include: {
        categoria: true,
        variantes: true,
      },
    });

    return producto;
  }

  async update(id: string, input: UpdateProductInput) {
    const exists = await prisma.producto.findUnique({ where: { id } });
    if (!exists) throw new Error('Producto no encontrado');

    const producto = await prisma.producto.update({
      where: { id },
      data: input as any,
      include: {
        categoria: true,
        variantes: true,
      },
    });

    return producto;
  }

  async toggleDisponibilidad(id: string) {
    const producto = await prisma.producto.findUnique({ where: { id } });
    if (!producto) throw new Error('Producto no encontrado');

    const updated = await prisma.producto.update({
      where: { id },
      data: { disponible: !producto.disponible },
    });

    return updated;
  }

  async delete(id: string) {
    const exists = await prisma.producto.findUnique({ where: { id } });
    if (!exists) throw new Error('Producto no encontrado');

    await prisma.producto.update({
      where: { id },
      data: { activo: false },
    });
  }

  async addVariant(productoId: string, input: CreateVariantInput) {
    const producto = await prisma.producto.findUnique({ where: { id: productoId } });
    if (!producto) throw new Error('Producto no encontrado');

    const variante = await prisma.productoVariante.create({
      data: {
        productoId,
        nombre: input.nombre,
        tipo: input.tipo,
        precioExtra: input.precioExtra,
      },
    });

    return variante;
  }

  async updateVariant(id: string, input: UpdateVariantInput) {
    const exists = await prisma.productoVariante.findUnique({ where: { id } });
    if (!exists) throw new Error('Variante no encontrada');

    const variante = await prisma.productoVariante.update({
      where: { id },
      data: input,
    });

    return variante;
  }

  async deleteVariant(id: string) {
    const exists = await prisma.productoVariante.findUnique({ where: { id } });
    if (!exists) throw new Error('Variante no encontrada');

    await prisma.productoVariante.update({
      where: { id },
      data: { activo: false },
    });
  }
}
