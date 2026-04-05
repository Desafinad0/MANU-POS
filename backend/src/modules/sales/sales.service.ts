import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import logger from '../../shared/utils/logger';
import { logAction } from '../../shared/middleware/audit.middleware';
import { CreateSaleInput } from './sales.schemas';

export class SalesService {
  async findAll(
    page: number,
    limit: number,
    filters: {
      fechaInicio?: string;
      fechaFin?: string;
      estado?: string;
      tipoServicio?: string;
      search?: string;
    } = {}
  ) {
    const where: any = {};

    if (filters.fechaInicio || filters.fechaFin) {
      where.fecha = {};
      if (filters.fechaInicio) where.fecha.gte = new Date(filters.fechaInicio);
      if (filters.fechaFin) where.fecha.lte = new Date(filters.fechaFin);
    }

    if (filters.estado) {
      where.estado = filters.estado;
    }

    if (filters.tipoServicio) {
      where.tipoServicio = filters.tipoServicio;
    }

    if (filters.search) {
      where.OR = [
        { numeroVenta: { contains: filters.search, mode: 'insensitive' } },
        { clienteNombre: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [ventas, total] = await Promise.all([
      prisma.venta.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          usuario: { select: { id: true, nombre: true, apellido: true } },
          _count: { select: { detalles: true } },
        },
        orderBy: { fecha: 'desc' },
      }),
      prisma.venta.count({ where }),
    ]);

    return { data: ventas, total };
  }

  async findForKitchen() {
    const ventas = await prisma.venta.findMany({
      where: {
        estado: 'COMPLETADA',
        detalles: {
          some: {
            estado: { in: ['PENDIENTE', 'PREPARANDO', 'LISTO'] },
          },
        },
      },
      include: {
        detalles: {
          select: {
            id: true,
            nombreProducto: true,
            cantidad: true,
            notas: true,
            estado: true,
            destino: true,
          },
        },
      },
      orderBy: { fecha: 'asc' },
      take: 50,
    });

    return ventas;
  }

  async findById(id: string) {
    const venta = await prisma.venta.findUnique({
      where: { id },
      include: {
        usuario: { select: { id: true, nombre: true, apellido: true } },
        caja: { select: { id: true, numeroCaja: true } },
        detalles: {
          include: {
            producto: { select: { id: true, nombre: true, sku: true } },
            variantes: {
              include: {
                variante: { select: { id: true, nombre: true, tipo: true } },
              },
            },
          },
        },
      },
    });

    if (!venta) throw new Error('Venta no encontrada');
    return venta;
  }

  async create(input: CreateSaleInput, usuarioId: string) {
    // 1. Verify user has an open caja
    const cajaAbierta = await prisma.caja.findFirst({
      where: { abiertoPorId: usuarioId, estado: 'ABIERTA' },
    });

    if (!cajaAbierta) {
      throw new Error('No tiene una caja abierta. Debe abrir caja antes de vender.');
    }

    // 2. Start interactive transaction
    const venta = await prisma.$transaction(async (tx) => {
      // 3. Generate sale number: V-YYYYMMDD-NNN
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const prefix = `V-${dateStr}-`;

      const lastVenta = await tx.venta.findFirst({
        where: { numeroVenta: { startsWith: prefix } },
        orderBy: { numeroVenta: 'desc' },
        select: { numeroVenta: true },
      });

      let nextNum = 1;
      if (lastVenta) {
        const lastNum = parseInt(lastVenta.numeroVenta.split('-').pop() || '0', 10);
        nextNum = lastNum + 1;
      }
      const numeroVenta = `${prefix}${nextNum.toString().padStart(3, '0')}`;

      // 4. Process each item
      let subtotalVenta = new Prisma.Decimal(0);
      const detallesData: any[] = [];
      const inventoryOps: Array<{
        recetaDetalles: any[];
        cantidad: number;
        tipoOrden: string;
        numeroVenta: string;
      }> = [];

      for (const item of input.items) {
        // 4a. Fetch producto with receta
        const producto = await tx.producto.findUnique({
          where: { id: item.productoId },
          include: {
            receta: {
              include: {
                detalles: { include: { insumo: true } },
              },
            },
          },
        });

        if (!producto) {
          throw new Error(`Producto no encontrado: ${item.productoId}`);
        }

        if (!producto.disponible) {
          throw new Error(`Producto no disponible: ${producto.nombre}`);
        }

        // 4b. Calculate precioUnitario = producto.precio + sum of selected variante.precioExtra
        let precioUnitario = new Prisma.Decimal(producto.precio.toString());
        const variantesData: any[] = [];

        if (item.varianteIds && item.varianteIds.length > 0) {
          const variantes = await tx.varianteProducto.findMany({
            where: { id: { in: item.varianteIds }, productoId: producto.id, activo: true },
          });

          for (const variante of variantes) {
            precioUnitario = precioUnitario.add(new Prisma.Decimal(variante.precioExtra.toString()));
            variantesData.push({
              nombreVariante: variante.nombre,
              precioExtra: variante.precioExtra,
              varianteId: variante.id,
            });
          }
        }

        // 4c. Calculate line subtotal
        const lineSubtotal = precioUnitario.mul(item.cantidad);

        subtotalVenta = subtotalVenta.add(lineSubtotal);

        detallesData.push({
          nombreProducto: producto.nombre,
          precioUnitario,
          cantidad: item.cantidad,
          descuentoPorcentaje: 0,
          subtotal: lineSubtotal,
          notas: item.notas,
          comensal: item.comensal || 1,
          destino: producto.tipoOrden,
          estado: 'PENDIENTE' as const,
          productoId: producto.id,
          variantes: variantesData,
        });

        // Track inventory operations for later
        if (producto.receta && producto.receta.detalles.length > 0) {
          inventoryOps.push({
            recetaDetalles: producto.receta.detalles,
            cantidad: item.cantidad,
            tipoOrden: producto.tipoOrden,
            numeroVenta,
          });
        }
      }

      // 5. Calculate venta totals
      const impuestoMonto = subtotalVenta.mul(new Prisma.Decimal('0.16'));
      const descuento = new Prisma.Decimal(input.descuento?.toString() || '0');
      const total = subtotalVenta.add(impuestoMonto).sub(descuento);

      // 6. Calculate cambio
      const montoPagado = new Prisma.Decimal(input.montoPagado.toString());
      const cambio = montoPagado.sub(total).greaterThanOrEqualTo(0)
        ? montoPagado.sub(total)
        : new Prisma.Decimal(0);

      // 7. Create Venta record
      const nuevaVenta = await tx.venta.create({
        data: {
          numeroVenta,
          tipoServicio: input.tipoServicio,
          mesa: input.mesa,
          plataforma: input.plataforma,
          clienteNombre: input.clienteNombre,
          clienteTelefono: input.clienteTelefono,
          subtotal: subtotalVenta,
          impuestoTasa: new Prisma.Decimal('0.16'),
          impuestoMonto,
          descuento,
          total,
          metodoPago: input.metodoPago,
          montoPagado,
          cambio,
          comensales: input.comensales || 1,
          estado: 'COMPLETADA',
          notas: input.notas,
          usuarioId,
          cajaId: cajaAbierta.id,
        },
      });

      // Create DetalleVenta records
      for (const detalle of detallesData) {
        const { variantes, ...detalleData } = detalle;
        const detalleVenta = await tx.detalleVenta.create({
          data: {
            ...detalleData,
            ventaId: nuevaVenta.id,
          },
        });

        // 4e. Create DetalleVentaVariante records
        if (variantes.length > 0) {
          await tx.detalleVentaVariante.createMany({
            data: variantes.map((v: any) => ({
              ...v,
              detalleVentaId: detalleVenta.id,
            })),
          });
        }
      }

      // 8. Deduct inventory for each item with a receta
      for (const op of inventoryOps) {
        const warehouseName = op.tipoOrden === 'COCINA' ? 'Cocina' : 'Barra';

        const almacen = await tx.almacen.findFirst({
          where: { nombre: { contains: warehouseName, mode: 'insensitive' }, activo: true },
        });

        if (!almacen) {
          logger.warn({ warehouseName }, 'Almacén no encontrado para deducción de inventario');
          continue;
        }

        for (const recetaDetalle of op.recetaDetalles) {
          const needed = new Prisma.Decimal(recetaDetalle.cantidad.toString())
            .mul(op.cantidad)
            .mul(new Prisma.Decimal('1').add(new Prisma.Decimal(recetaDetalle.merma.toString())));

          // Find inventario record
          const inventario = await tx.inventario.findFirst({
            where: { insumoId: recetaDetalle.insumoId, almacenId: almacen.id },
          });

          if (!inventario) {
            logger.warn(
              { insumo: recetaDetalle.insumo.nombre, almacen: warehouseName },
              'Inventario no encontrado - se omite deducción'
            );
            continue;
          }

          const stockAnterior = new Prisma.Decimal(inventario.cantidadActual.toString());
          const stockPosterior = stockAnterior.sub(needed);

          if (stockPosterior.lessThan(0)) {
            logger.warn(
              {
                insumo: recetaDetalle.insumo.nombre,
                stockAnterior: stockAnterior.toString(),
                needed: needed.toString(),
                stockPosterior: stockPosterior.toString(),
              },
              'Stock negativo después de venta - la venta continúa'
            );
          }

          // Decrease cantidadActual
          await tx.inventario.update({
            where: { id: inventario.id },
            data: { cantidadActual: stockPosterior },
          });

          // Create MovimientoInventario
          await tx.movimientoInventario.create({
            data: {
              tipoMovimiento: 'VENTA',
              cantidad: needed,
              costoUnitario: recetaDetalle.insumo.costoPromedio,
              costoTotal: needed.mul(new Prisma.Decimal(recetaDetalle.insumo.costoPromedio.toString())),
              stockAnterior,
              stockPosterior,
              referencia: op.numeroVenta,
              insumoId: recetaDetalle.insumoId,
              almacenOrigenId: almacen.id,
              usuarioId,
            },
          });
        }
      }

      // 9. Update Caja totals
      const updateData: any = {
        totalVentas: { increment: total },
      };

      switch (input.metodoPago) {
        case 'EFECTIVO':
          updateData.totalEfectivo = { increment: total };
          break;
        case 'TARJETA':
          updateData.totalTarjeta = { increment: total };
          break;
        case 'TRANSFERENCIA':
          updateData.totalTransferencia = { increment: total };
          break;
        case 'MIXTO':
          // For MIXTO, add full amount to efectivo as default; adjust as needed
          updateData.totalEfectivo = { increment: total };
          break;
      }

      await tx.caja.update({
        where: { id: cajaAbierta.id },
        data: updateData,
      });

      // 10. Return created venta with detalles
      return tx.venta.findUnique({
        where: { id: nuevaVenta.id },
        include: {
          usuario: { select: { id: true, nombre: true, apellido: true } },
          detalles: {
            include: {
              producto: { select: { id: true, nombre: true, sku: true } },
              variantes: true,
            },
          },
        },
      });
    });

    return venta;
  }

  async cancel(id: string, motivoCancelacion: string, canceladaPorId: string) {
    const ventaExistente = await prisma.venta.findUnique({
      where: { id },
      include: {
        detalles: {
          include: {
            producto: {
              include: {
                receta: {
                  include: {
                    detalles: { include: { insumo: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!ventaExistente) throw new Error('Venta no encontrada');

    if (ventaExistente.estado !== 'COMPLETADA') {
      throw new Error('Solo se pueden cancelar ventas completadas');
    }

    const venta = await prisma.$transaction(async (tx) => {
      // Update venta estado
      const ventaCancelada = await tx.venta.update({
        where: { id },
        data: {
          estado: 'CANCELADA',
          canceladaPor: canceladaPorId,
          motivoCancelacion,
        },
      });

      // Restore inventory for each item
      for (const detalle of ventaExistente.detalles) {
        const producto = detalle.producto;
        if (!producto.receta || producto.receta.detalles.length === 0) continue;

        const warehouseName = producto.tipoOrden === 'COCINA' ? 'Cocina' : 'Barra';
        const almacen = await tx.almacen.findFirst({
          where: { nombre: { contains: warehouseName, mode: 'insensitive' }, activo: true },
        });

        if (!almacen) continue;

        for (const recetaDetalle of producto.receta.detalles) {
          const needed = new Prisma.Decimal(recetaDetalle.cantidad.toString())
            .mul(detalle.cantidad)
            .mul(new Prisma.Decimal('1').add(new Prisma.Decimal(recetaDetalle.merma.toString())));

          const inventario = await tx.inventario.findFirst({
            where: { insumoId: recetaDetalle.insumoId, almacenId: almacen.id },
          });

          if (!inventario) continue;

          const stockAnterior = new Prisma.Decimal(inventario.cantidadActual.toString());
          const stockPosterior = stockAnterior.add(needed);

          await tx.inventario.update({
            where: { id: inventario.id },
            data: { cantidadActual: stockPosterior },
          });

          await tx.movimientoInventario.create({
            data: {
              tipoMovimiento: 'DEVOLUCION',
              cantidad: needed,
              costoUnitario: recetaDetalle.insumo.costoPromedio,
              costoTotal: needed.mul(new Prisma.Decimal(recetaDetalle.insumo.costoPromedio.toString())),
              stockAnterior,
              stockPosterior,
              referencia: `CANCEL-${ventaExistente.numeroVenta}`,
              insumoId: recetaDetalle.insumoId,
              almacenDestinoId: almacen.id,
              usuarioId: canceladaPorId,
            },
          });
        }
      }

      // Update Caja totals (subtract amounts)
      if (ventaExistente.cajaId) {
        const subtractData: any = {
          totalVentas: { decrement: ventaExistente.total },
        };

        switch (ventaExistente.metodoPago) {
          case 'EFECTIVO':
            subtractData.totalEfectivo = { decrement: ventaExistente.total };
            break;
          case 'TARJETA':
            subtractData.totalTarjeta = { decrement: ventaExistente.total };
            break;
          case 'TRANSFERENCIA':
            subtractData.totalTransferencia = { decrement: ventaExistente.total };
            break;
          case 'MIXTO':
            subtractData.totalEfectivo = { decrement: ventaExistente.total };
            break;
        }

        await tx.caja.update({
          where: { id: ventaExistente.cajaId },
          data: subtractData,
        });
      }

      return ventaCancelada;
    });

    // Log to bitacora
    await logAction(
      canceladaPorId,
      'CANCELAR_VENTA',
      'Venta',
      id,
      { estado: 'COMPLETADA' },
      { estado: 'CANCELADA', motivoCancelacion }
    );

    return venta;
  }

  async updateItemStatus(ventaId: string, itemId: string, estado: string) {
    const detalle = await prisma.detalleVenta.findFirst({
      where: { id: itemId, ventaId },
    });

    if (!detalle) throw new Error('Detalle de venta no encontrado');

    const updated = await prisma.detalleVenta.update({
      where: { id: itemId },
      data: { estado: estado as any },
      include: {
        producto: { select: { id: true, nombre: true } },
      },
    });

    return updated;
  }

  async getDailySummary(fecha?: Date) {
    const targetDate = fecha || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const where = {
      fecha: { gte: startOfDay, lte: endOfDay },
    };

    const [
      totalVentas,
      ventasCompletadas,
      ventasCanceladas,
      porMetodoPago,
      porTipoServicio,
    ] = await Promise.all([
      prisma.venta.count({ where }),
      prisma.venta.aggregate({
        where: { ...where, estado: 'COMPLETADA' },
        _sum: { total: true },
        _avg: { total: true },
        _count: true,
      }),
      prisma.venta.count({ where: { ...where, estado: 'CANCELADA' } }),
      prisma.venta.groupBy({
        by: ['metodoPago'],
        where: { ...where, estado: 'COMPLETADA' },
        _sum: { total: true },
        _count: true,
      }),
      prisma.venta.groupBy({
        by: ['tipoServicio'],
        where: { ...where, estado: 'COMPLETADA' },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    return {
      fecha: startOfDay.toISOString().slice(0, 10),
      totalVentas,
      ventasCompletadas: ventasCompletadas._count,
      ventasCanceladas,
      montoTotal: ventasCompletadas._sum.total || 0,
      ticketPromedio: ventasCompletadas._avg.total || 0,
      porMetodoPago: porMetodoPago.map((g) => ({
        metodoPago: g.metodoPago,
        total: g._sum.total || 0,
        cantidad: g._count,
      })),
      porTipoServicio: porTipoServicio.map((g) => ({
        tipoServicio: g.tipoServicio,
        total: g._sum.total || 0,
        cantidad: g._count,
      })),
    };
  }
}
