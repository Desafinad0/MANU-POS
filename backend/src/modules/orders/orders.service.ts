import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import logger from '../../shared/utils/logger';
import { CreateOrderInput, AddItemsInput, PayOrderInput } from './orders.schemas';

export class OrdersService {
  /**
   * Create a new order with items
   */
  async create(input: CreateOrderInput, usuarioId: string) {
    const orden = await prisma.$transaction(async (tx) => {
      // Generate order number O-YYYYMMDD-NNN
      const dateStr = new Date()
        .toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' })
        .replace(/-/g, '');
      const prefix = `O-${dateStr}-`;

      const lastOrden = await tx.orden.findFirst({
        where: { numeroOrden: { startsWith: prefix } },
        orderBy: { numeroOrden: 'desc' },
        select: { numeroOrden: true },
      });

      let nextNum = 1;
      if (lastOrden) {
        const lastNum = parseInt(lastOrden.numeroOrden.split('-').pop() || '0', 10);
        nextNum = lastNum + 1;
      }
      const numeroOrden = `${prefix}${nextNum.toString().padStart(3, '0')}`;

      // If mesaId provided, verify mesa is DISPONIBLE, then set to OCUPADA
      if (input.mesaId) {
        const mesa = await tx.mesa.findUnique({ where: { id: input.mesaId } });
        if (!mesa) {
          throw new Error('Mesa no encontrada');
        }
        if (mesa.estado !== 'DISPONIBLE') {
          throw new Error('La mesa no esta disponible');
        }
        await tx.mesa.update({
          where: { id: input.mesaId },
          data: { estado: 'OCUPADA' },
        });
      }

      // Process each item
      const detallesData: any[] = [];

      for (const item of input.items) {
        const producto = await tx.producto.findUnique({
          where: { id: item.productoId },
        });

        if (!producto) {
          throw new Error(`Producto no encontrado: ${item.productoId}`);
        }
        if (!producto.disponible) {
          throw new Error(`Producto no disponible: ${producto.nombre}`);
        }

        // Calculate precioUnitario = producto.precio + sum of variant extras
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

        const lineSubtotal = precioUnitario.mul(item.cantidad);

        detallesData.push({
          nombreProducto: producto.nombre,
          precioUnitario,
          cantidad: item.cantidad,
          subtotal: lineSubtotal,
          notas: item.notas,
          comensal: item.comensal || 1,
          destino: producto.tipoOrden,
          estado: 'GUARDADO' as const,
          productoId: producto.id,
          variantes: variantesData,
        });
      }

      // Create Orden record
      const nuevaOrden = await tx.orden.create({
        data: {
          numeroOrden,
          tipoServicio: input.tipoServicio,
          comensales: input.comensales || 1,
          clienteNombre: input.clienteNombre,
          clienteTelefono: input.clienteTelefono,
          plataforma: input.plataforma,
          notas: input.notas,
          estado: 'ABIERTA',
          mesaId: input.mesaId,
          usuarioId,
        },
      });

      // Create OrdenDetalle records
      for (const detalle of detallesData) {
        const { variantes, ...detalleData } = detalle;
        const ordenDetalle = await tx.ordenDetalle.create({
          data: {
            ...detalleData,
            ordenId: nuevaOrden.id,
          },
        });

        if (variantes.length > 0) {
          await tx.ordenDetalleVariante.createMany({
            data: variantes.map((v: any) => ({
              ...v,
              ordenDetalleId: ordenDetalle.id,
            })),
          });
        }
      }

      // Return created orden with detalles
      return tx.orden.findUnique({
        where: { id: nuevaOrden.id },
        include: {
          mesa: true,
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

    return orden;
  }

  /**
   * Find all orders with optional filters
   */
  async findAll(filters: {
    estado?: string;
    tipoServicio?: string;
    mesaId?: string;
    incluirCerradas?: boolean;
  } = {}) {
    const where: any = {};

    if (filters.estado) {
      where.estado = filters.estado;
    } else if (!filters.incluirCerradas) {
      where.estado = { notIn: ['COBRADA', 'CANCELADA'] };
    }

    if (filters.tipoServicio) {
      where.tipoServicio = filters.tipoServicio;
    }

    if (filters.mesaId) {
      where.mesaId = filters.mesaId;
    }

    const ordenes = await prisma.orden.findMany({
      where,
      include: {
        mesa: true,
        usuario: { select: { id: true, nombre: true, apellido: true } },
        _count: { select: { detalles: true } },
      },
      orderBy: { creadoEn: 'asc' },
    });

    return ordenes;
  }

  /**
   * Find order by ID with full details
   */
  async findById(id: string) {
    const orden = await prisma.orden.findUnique({
      where: { id },
      include: {
        mesa: true,
        usuario: { select: { id: true, nombre: true, apellido: true } },
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

    if (!orden) throw new Error('Orden no encontrada');
    return orden;
  }

  /**
   * Add items to an existing order
   */
  async addItems(ordenId: string, input: AddItemsInput, usuarioId: string) {
    const orden = await prisma.orden.findUnique({ where: { id: ordenId } });
    if (!orden) throw new Error('Orden no encontrada');
    if (orden.estado !== 'ABIERTA' && orden.estado !== 'EN_COCINA') {
      throw new Error('Solo se pueden agregar items a ordenes abiertas o en cocina');
    }

    await prisma.$transaction(async (tx) => {
      for (const item of input.items) {
        const producto = await tx.producto.findUnique({
          where: { id: item.productoId },
        });

        if (!producto) {
          throw new Error(`Producto no encontrado: ${item.productoId}`);
        }
        if (!producto.disponible) {
          throw new Error(`Producto no disponible: ${producto.nombre}`);
        }

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

        const lineSubtotal = precioUnitario.mul(item.cantidad);

        const ordenDetalle = await tx.ordenDetalle.create({
          data: {
            nombreProducto: producto.nombre,
            precioUnitario,
            cantidad: item.cantidad,
            subtotal: lineSubtotal,
            notas: item.notas,
            comensal: item.comensal || 1,
            destino: producto.tipoOrden,
            estado: 'GUARDADO',
            productoId: producto.id,
            ordenId,
          },
        });

        if (variantesData.length > 0) {
          await tx.ordenDetalleVariante.createMany({
            data: variantesData.map((v: any) => ({
              ...v,
              ordenDetalleId: ordenDetalle.id,
            })),
          });
        }
      }
    });

    return this.findById(ordenId);
  }

  /**
   * Send unsent items to the kitchen
   */
  async sendToKitchen(ordenId: string, usuarioId: string) {
    const orden = await prisma.orden.findUnique({
      where: { id: ordenId },
      include: {
        detalles: { where: { estado: 'GUARDADO' } },
      },
    });

    if (!orden) throw new Error('Orden no encontrada');
    if (orden.detalles.length === 0) {
      throw new Error('No hay items pendientes de enviar a cocina');
    }

    await prisma.$transaction(async (tx) => {
      // Set all GUARDADO items to ENVIADO
      await tx.ordenDetalle.updateMany({
        where: { ordenId, estado: 'GUARDADO' },
        data: { estado: 'ENVIADO', enviadoEn: new Date() },
      });

      // If orden was ABIERTA, set to EN_COCINA
      if (orden.estado === 'ABIERTA') {
        await tx.orden.update({
          where: { id: ordenId },
          data: { estado: 'EN_COCINA' },
        });
      }
    });

    return this.findById(ordenId);
  }

  /**
   * Update status of an individual order item
   */
  async updateItemStatus(ordenId: string, itemId: string, estado: string) {
    const detalle = await prisma.ordenDetalle.findFirst({
      where: { id: itemId, ordenId },
    });

    if (!detalle) throw new Error('Item de orden no encontrado');

    // Validate forward-only transition
    const statusOrder = ['GUARDADO', 'ENVIADO', 'PREPARANDO', 'LISTO', 'ENTREGADO'];
    const currentIdx = statusOrder.indexOf(detalle.estado);
    const targetIdx = statusOrder.indexOf(estado);

    if (targetIdx <= currentIdx) {
      throw new Error(`Transicion de estado invalida: ${detalle.estado} -> ${estado}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.ordenDetalle.update({
        where: { id: itemId },
        data: { estado: estado as any },
        include: {
          producto: { select: { id: true, nombre: true } },
        },
      });

      // Check all non-GUARDADO items to determine orden status
      const allItems = await tx.ordenDetalle.findMany({
        where: { ordenId, estado: { not: 'GUARDADO' } },
      });

      if (allItems.length > 0) {
        const allEntregado = allItems.every((i) => i.estado === 'ENTREGADO');
        const allListoOrEntregado = allItems.every(
          (i) => i.estado === 'LISTO' || i.estado === 'ENTREGADO'
        );

        if (allEntregado) {
          await tx.orden.update({
            where: { id: ordenId },
            data: { estado: 'POR_COBRAR' },
          });
        } else if (allListoOrEntregado) {
          await tx.orden.update({
            where: { id: ordenId },
            data: { estado: 'LISTA' },
          });
        }
      }

      return updatedItem;
    });

    return updated;
  }

  /**
   * Find orders for kitchen display
   */
  async findForKitchen(destino?: string) {
    const detallesWhere: any = {
      estado: { in: ['ENVIADO', 'PREPARANDO', 'LISTO'] },
    };
    if (destino) {
      detallesWhere.destino = destino;
    }

    const ordenes = await prisma.orden.findMany({
      where: {
        estado: { in: ['EN_COCINA', 'LISTA'] },
        detalles: {
          some: detallesWhere,
        },
      },
      include: {
        mesa: true,
        detalles: {
          where: detallesWhere,
          include: {
            producto: { select: { nombre: true } },
          },
        },
      },
      orderBy: { fecha: 'asc' },
      take: 50,
    });

    return ordenes;
  }

  /**
   * Pay an order: convert Orden to Venta, deduct inventory, update caja
   */
  async pay(ordenId: string, input: PayOrderInput, usuarioId: string) {
    // Verify user has an open caja
    const cajaAbierta = await prisma.caja.findFirst({
      where: { abiertoPorId: usuarioId, estado: 'ABIERTA' },
    });

    if (!cajaAbierta) {
      throw new Error('No tiene una caja abierta. Debe abrir caja antes de cobrar.');
    }

    // Verify orden status
    const ordenExistente = await prisma.orden.findUnique({
      where: { id: ordenId },
      include: {
        mesa: true,
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
            variantes: true,
          },
        },
      },
    });

    if (!ordenExistente) throw new Error('Orden no encontrada');

    if (!['EN_COCINA', 'LISTA', 'POR_COBRAR'].includes(ordenExistente.estado)) {
      throw new Error('La orden no esta lista para cobrar');
    }

    const venta = await prisma.$transaction(async (tx) => {
      // Generate sale number: V-YYYYMMDD-NNN
      const dateStr = new Date()
        .toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' })
        .replace(/-/g, '');
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

      // Calculate subtotal from sum of OrdenDetalle.subtotal
      let subtotalVenta = new Prisma.Decimal(0);
      for (const detalle of ordenExistente.detalles) {
        subtotalVenta = subtotalVenta.add(new Prisma.Decimal(detalle.subtotal.toString()));
      }

      // Calculate IVA, descuento, total, cambio
      const impuestoMonto = subtotalVenta.mul(new Prisma.Decimal('0.16'));
      const descuento = new Prisma.Decimal(input.descuento?.toString() || '0');
      const total = subtotalVenta.add(impuestoMonto).sub(descuento);

      const montoPagado = new Prisma.Decimal(input.montoPagado.toString());
      const cambio = montoPagado.sub(total).greaterThanOrEqualTo(0)
        ? montoPagado.sub(total)
        : new Prisma.Decimal(0);

      // Create Venta record
      const nuevaVenta = await tx.venta.create({
        data: {
          numeroVenta,
          tipoServicio: ordenExistente.tipoServicio,
          mesa: ordenExistente.mesa?.nombre || undefined,
          plataforma: ordenExistente.plataforma,
          clienteNombre: ordenExistente.clienteNombre,
          clienteTelefono: ordenExistente.clienteTelefono,
          subtotal: subtotalVenta,
          impuestoTasa: new Prisma.Decimal('0.16'),
          impuestoMonto,
          descuento,
          total,
          metodoPago: input.metodoPago,
          montoPagado,
          cambio,
          comensales: ordenExistente.comensales,
          estado: 'COMPLETADA',
          notas: input.notas,
          usuarioId,
          cajaId: cajaAbierta.id,
        },
      });

      // Create DetalleVenta records FROM OrdenDetalle data
      const inventoryOps: Array<{
        recetaDetalles: any[];
        cantidad: number;
        tipoOrden: string;
        numeroVenta: string;
      }> = [];

      for (const detalle of ordenExistente.detalles) {
        const detalleVenta = await tx.detalleVenta.create({
          data: {
            nombreProducto: detalle.nombreProducto,
            precioUnitario: detalle.precioUnitario,
            cantidad: detalle.cantidad,
            descuentoPorcentaje: detalle.descuentoPorcentaje,
            subtotal: detalle.subtotal,
            notas: detalle.notas,
            comensal: detalle.comensal,
            destino: detalle.destino,
            estado: 'ENTREGADO',
            productoId: detalle.productoId,
            ventaId: nuevaVenta.id,
          },
        });

        // Create DetalleVentaVariante FROM OrdenDetalleVariante data
        if (detalle.variantes.length > 0) {
          await tx.detalleVentaVariante.createMany({
            data: detalle.variantes.map((v) => ({
              nombreVariante: v.nombreVariante,
              precioExtra: v.precioExtra,
              varianteId: v.varianteId,
              detalleVentaId: detalleVenta.id,
            })),
          });
        }

        // Track inventory operations
        const producto = detalle.producto;
        if (producto.receta && producto.receta.detalles.length > 0) {
          inventoryOps.push({
            recetaDetalles: producto.receta.detalles,
            cantidad: detalle.cantidad,
            tipoOrden: producto.tipoOrden,
            numeroVenta,
          });
        }
      }

      // Deduct inventory for each item with a receta
      for (const op of inventoryOps) {
        const warehouseName = op.tipoOrden === 'COCINA' ? 'Cocina' : 'Barra';

        const almacen = await tx.almacen.findFirst({
          where: { nombre: { contains: warehouseName, mode: 'insensitive' }, activo: true },
        });

        if (!almacen) {
          logger.warn({ warehouseName }, 'Almacen no encontrado para deduccion de inventario');
          continue;
        }

        for (const recetaDetalle of op.recetaDetalles) {
          const needed = new Prisma.Decimal(recetaDetalle.cantidad.toString())
            .mul(op.cantidad)
            .mul(new Prisma.Decimal('1').add(new Prisma.Decimal(recetaDetalle.merma.toString())));

          const inventario = await tx.inventario.findFirst({
            where: { insumoId: recetaDetalle.insumoId, almacenId: almacen.id },
          });

          if (!inventario) {
            logger.warn(
              { insumo: recetaDetalle.insumo.nombre, almacen: warehouseName },
              'Inventario no encontrado - se omite deduccion'
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
              'Stock negativo despues de venta - la venta continua'
            );
          }

          await tx.inventario.update({
            where: { id: inventario.id },
            data: { cantidadActual: stockPosterior },
          });

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

      // Update Caja totals
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
          updateData.totalEfectivo = { increment: total };
          break;
      }

      await tx.caja.update({
        where: { id: cajaAbierta.id },
        data: updateData,
      });

      // Set orden as COBRADA and link to venta
      await tx.orden.update({
        where: { id: ordenId },
        data: {
          estado: 'COBRADA',
          ventaId: nuevaVenta.id,
        },
      });

      // If orden has mesa, set mesa to DISPONIBLE
      if (ordenExistente.mesaId) {
        await tx.mesa.update({
          where: { id: ordenExistente.mesaId },
          data: { estado: 'DISPONIBLE' },
        });
      }

      // Return the created venta with detalles
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

  /**
   * Cancel an order
   */
  async cancel(ordenId: string, motivoCancelacion: string, usuarioId: string) {
    const orden = await prisma.orden.findUnique({
      where: { id: ordenId },
    });

    if (!orden) throw new Error('Orden no encontrada');

    if (orden.estado === 'COBRADA' || orden.estado === 'CANCELADA') {
      throw new Error('No se puede cancelar una orden cobrada o ya cancelada');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ordenCancelada = await tx.orden.update({
        where: { id: ordenId },
        data: {
          estado: 'CANCELADA',
          motivoCancelacion,
          canceladaPor: usuarioId,
        },
      });

      // If mesa, set to DISPONIBLE
      if (orden.mesaId) {
        await tx.mesa.update({
          where: { id: orden.mesaId },
          data: { estado: 'DISPONIBLE' },
        });
      }

      return ordenCancelada;
    });

    return updated;
  }
}
