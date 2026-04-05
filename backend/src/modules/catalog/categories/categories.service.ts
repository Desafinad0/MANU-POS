import prisma from '../../../config/database';
import { CreateCategoryInput, UpdateCategoryInput } from './categories.schemas';

export class CategoriesService {
  async findAll() {
    const categorias = await prisma.categoria.findMany({
      where: { activo: true, categoriaPadreId: null },
      include: {
        subcategorias: {
          where: { activo: true },
          orderBy: { orden: 'asc' },
        },
      },
      orderBy: { orden: 'asc' },
    });

    return categorias;
  }

  async findById(id: string) {
    const categoria = await prisma.categoria.findUnique({
      where: { id },
      include: {
        subcategorias: {
          where: { activo: true },
          orderBy: { orden: 'asc' },
        },
        productos: {
          where: { activo: true },
          orderBy: { nombre: 'asc' },
        },
      },
    });

    if (!categoria) throw new Error('Categoría no encontrada');
    return categoria;
  }

  async create(input: CreateCategoryInput) {
    const categoria = await prisma.categoria.create({
      data: {
        nombre: input.nombre,
        descripcion: input.descripcion,
        imagen: input.imagen,
        orden: input.orden ?? 0,
        categoriaPadreId: input.categoriaPadreId ?? null,
      },
      include: {
        subcategorias: true,
      },
    });

    return categoria;
  }

  async update(id: string, input: UpdateCategoryInput) {
    const exists = await prisma.categoria.findUnique({ where: { id } });
    if (!exists) throw new Error('Categoría no encontrada');

    const categoria = await prisma.categoria.update({
      where: { id },
      data: input,
      include: {
        subcategorias: true,
      },
    });

    return categoria;
  }

  async updateOrder(id: string, orden: number) {
    const exists = await prisma.categoria.findUnique({ where: { id } });
    if (!exists) throw new Error('Categoría no encontrada');

    const categoria = await prisma.categoria.update({
      where: { id },
      data: { orden },
    });

    return categoria;
  }

  async delete(id: string) {
    const exists = await prisma.categoria.findUnique({ where: { id } });
    if (!exists) throw new Error('Categoría no encontrada');

    await prisma.categoria.update({
      where: { id },
      data: { activo: false },
    });
  }
}
