import prisma from '../../../config/database';
import { CreateRecipeInput } from './recipes.schemas';

export class RecipesService {
  async findByProducto(productoId: string) {
    const receta = await prisma.receta.findUnique({
      where: { productoId },
      include: {
        detalles: {
          include: { insumo: true },
        },
      },
    });

    if (!receta) throw new Error('Receta no encontrada');
    return receta;
  }

  async createOrUpdate(input: CreateRecipeInput) {
    const producto = await prisma.producto.findUnique({ where: { id: input.productoId } });
    if (!producto) throw new Error('Producto no encontrado');

    // Check if recipe already exists
    const existingReceta = await prisma.receta.findUnique({
      where: { productoId: input.productoId },
    });

    let receta;

    if (existingReceta) {
      // Delete existing detalles
      await prisma.recetaDetalle.deleteMany({
        where: { recetaId: existingReceta.id },
      });

      // Update recipe and recreate detalles
      receta = await prisma.receta.update({
        where: { id: existingReceta.id },
        data: {
          rendimiento: input.rendimiento,
          notas: input.notas,
          detalles: {
            create: input.detalles.map((d) => ({
              insumoId: d.insumoId,
              cantidad: d.cantidad,
              merma: d.merma ?? 0,
            })),
          },
        },
        include: {
          detalles: {
            include: { insumo: true },
          },
        },
      });
    } else {
      // Create new recipe
      receta = await prisma.receta.create({
        data: {
          productoId: input.productoId,
          rendimiento: input.rendimiento,
          notas: input.notas,
          detalles: {
            create: input.detalles.map((d) => ({
              insumoId: d.insumoId,
              cantidad: d.cantidad,
              merma: d.merma ?? 0,
            })),
          },
        },
        include: {
          detalles: {
            include: { insumo: true },
          },
        },
      });
    }

    // Calculate and update product cost
    await this.calculateCost(receta.id);

    return receta;
  }

  async calculateCost(recetaId: string) {
    const receta = await prisma.receta.findUnique({
      where: { id: recetaId },
      include: {
        detalles: {
          include: { insumo: true },
        },
      },
    });

    if (!receta) throw new Error('Receta no encontrada');

    const costoCalculado = receta.detalles.reduce((total, detalle) => {
      const costoInsumo = Number(detalle.insumo.costoPromedio) || 0;
      const cantidad = Number(detalle.cantidad);
      const merma = Number(detalle.merma) || 0;
      return total + (costoInsumo * cantidad * (1 + merma));
    }, 0);

    await prisma.producto.update({
      where: { id: receta.productoId },
      data: { costoCalculado },
    });

    return costoCalculado;
  }

  async delete(id: string) {
    const receta = await prisma.receta.findUnique({ where: { id } });
    if (!receta) throw new Error('Receta no encontrada');

    await prisma.recetaDetalle.deleteMany({ where: { recetaId: id } });
    await prisma.receta.delete({ where: { id } });

    // Reset product cost
    await prisma.producto.update({
      where: { id: receta.productoId },
      data: { costoCalculado: 0 },
    });
  }
}
