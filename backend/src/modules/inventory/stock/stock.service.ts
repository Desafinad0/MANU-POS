import prisma from '../../../config/database';
import { CreateMovementInput, CreatePurchaseInput, TransferInput } from './stock.schemas';
import { Decimal } from '@prisma/client/runtime/library';

const TIPOS_ENTRADA = ['COMPRA', 'AJUSTE_POSITIVO', 'INVENTARIO_INICIAL', 'DEVOLUCION'];
const TIPOS_SALIDA = ['VENTA', 'MERMA', 'AJUSTE_NEGATIVO', 'CONSUMO_INTERNO'];

export class StockService {
  async getCurrentStock(almacenId?: string, insumoId?: string) {
    const where: any = {};
    if (almacenId) where.almacenId = almacenId;
    if (insumoId) where.insumoId = insumoId;

    const inventarios = await prisma.inventario.findMany({
      where,
      include: {
        insumo: true,
        almacen: true,
      },
      orderBy: { insumo: { nombre: 'asc' } },
    });

    return inventarios;
  }

  async getAlerts() {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [lowStock, expiringSoon] = await Promise.all([
      // Items below minimum stock level
      prisma.$queryRaw`
        SELECT i.id, i.nombre, i.sku, i."unidad_medida" as "unidadMedida",
               i."nivel_minimo" as "nivelMinimo",
               COALESCE(SUM(inv."cantidad_actual"), 0) as "cantidadActual"
        FROM insumos i
        LEFT JOIN inventarios inv ON inv."insumo_id" = i.id
        WHERE i.activo = true AND i."nivel_minimo" > 0
        GROUP BY i.id, i.nombre, i.sku, i."unidad_medida", i."nivel_minimo"
        HAVING COALESCE(SUM(inv."cantidad_actual"), 0) < i."nivel_minimo"
      `,
      // Items expiring within 7 days
      prisma.inventario.findMany({
        where: {
          fechaCaducidad: {
            lte: sevenDaysFromNow,
            gte: now,
          },
          cantidadActual: { gt: 0 },
        },
        include: {
          insumo: true,
          almacen: true,
        },
        orderBy: { fechaCaducidad: 'asc' },
      }),
    ]);

    return {
      stockBajo: lowStock,
      porCaducar: expiringSoon,
    };
  }

  async getKardex(insumoId: string, page: number, limit: number) {
    const where = { insumoId };

    const [movimientos, total] = await Promise.all([
      prisma.movimientoInventario.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          almacenOrigen: true,
          almacenDestino: true,
          proveedor: { select: { id: true, nombre: true } },
          usuario: {
            select: { id: true, nombre: true, apellido: true },
          },
        },
        orderBy: { creadoEn: 'desc' },
      }),
      prisma.movimientoInventario.count({ where }),
    ]);

    return { data: movimientos, total };
  }

  async recordMovement(input: CreateMovementInput, usuarioId: string) {
    const isEntrada = TIPOS_ENTRADA.includes(input.tipoMovimiento);
    const isSalida = TIPOS_SALIDA.includes(input.tipoMovimiento);

    if (isEntrada && !input.almacenDestinoId) {
      throw new Error('Almacén destino es requerido para movimientos de entrada');
    }
    if (isSalida && !input.almacenOrigenId) {
      throw new Error('Almacén origen es requerido para movimientos de salida');
    }

    const almacenId = isEntrada ? input.almacenDestinoId! : input.almacenOrigenId!;

    return await prisma.$transaction(async (tx) => {
      // Get or create inventory record
      let inventario = await tx.inventario.findFirst({
        where: { insumoId: input.insumoId, almacenId },
      });

      const stockAnterior = inventario
        ? Number(inventario.cantidadActual)
        : 0;

      let stockPosterior: number;
      if (isEntrada) {
        stockPosterior = stockAnterior + input.cantidad;
      } else {
        if (stockAnterior < input.cantidad) {
          throw new Error(
            `Stock insuficiente. Disponible: ${stockAnterior}, Solicitado: ${input.cantidad}`
          );
        }
        stockPosterior = stockAnterior - input.cantidad;
      }

      // Upsert inventory
      if (inventario) {
        await tx.inventario.update({
          where: { id: inventario.id },
          data: { cantidadActual: stockPosterior },
        });
      } else {
        await tx.inventario.create({
          data: {
            insumoId: input.insumoId,
            almacenId,
            cantidadActual: stockPosterior,
          },
        });
      }

      // For COMPRA, INVENTARIO_INICIAL, or any entry with cost: update insumo costs
      if (input.costoUnitario && input.costoUnitario > 0 && isEntrada) {
        const insumo = await tx.insumo.findUnique({
          where: { id: input.insumoId },
        });

        if (insumo) {
          const currentAvgCost = Number(insumo.costoPromedio);
          // Weighted average cost calculation
          const totalCurrentValue = currentAvgCost * stockAnterior;
          const newPurchaseValue = input.costoUnitario * input.cantidad;
          const newAvgCost =
            stockPosterior > 0
              ? (totalCurrentValue + newPurchaseValue) / stockPosterior
              : input.costoUnitario;

          await tx.insumo.update({
            where: { id: input.insumoId },
            data: {
              ultimoCosto: input.costoUnitario,
              costoPromedio: newAvgCost,
            },
          });
        }
      }

      // Create movement record
      const costoUnitario = input.costoUnitario ?? 0;
      const movimiento = await tx.movimientoInventario.create({
        data: {
          insumoId: input.insumoId,
          tipoMovimiento: input.tipoMovimiento as any,
          cantidad: input.cantidad,
          costoUnitario,
          costoTotal: costoUnitario * input.cantidad,
          stockAnterior,
          stockPosterior,
          almacenOrigenId: input.almacenOrigenId,
          almacenDestinoId: input.almacenDestinoId,
          referencia: input.referencia,
          notas: input.notas,
          proveedorId: input.proveedorId,
          fecha: input.fecha ? new Date(input.fecha + 'T12:00:00') : undefined,
          usuarioId,
        },
        include: {
          insumo: true,
          almacenOrigen: true,
          almacenDestino: true,
        },
      });

      return movimiento;
    });
  }

  async recordPurchase(input: CreatePurchaseInput, usuarioId: string) {
    // Generate folio: OC-YYYYMMDD-NNN using Mexico local date
    const today = new Date();
    const yyyy = today.toLocaleDateString('en-CA', { timeZone: 'America/Monterrey' }).replace(/-/g, '');
    const dateStr = yyyy;
    const prefix = `OC-${dateStr}-`;

    // Count distinct folios for today by looking at unique references with today's prefix
    const existingFolios = await prisma.movimientoInventario.findMany({
      where: {
        tipoMovimiento: 'COMPRA',
        referencia: { startsWith: prefix },
      },
      select: { referencia: true },
      distinct: ['referencia'],
    });
    const folioNum = existingFolios.length + 1;
    const folio = `${prefix}${String(folioNum).padStart(3, '0')}`;

    const fechaCompra = input.fecha ? new Date(input.fecha + 'T12:00:00') : new Date();

    return await prisma.$transaction(async (tx) => {
      const movimientos = [];

      for (const partida of input.partidas) {
        // Get or create inventory record
        let inventario = await tx.inventario.findFirst({
          where: { insumoId: partida.insumoId, almacenId: input.almacenDestinoId },
        });

        const stockAnterior = inventario ? Number(inventario.cantidadActual) : 0;
        const stockPosterior = stockAnterior + partida.cantidad;

        // Upsert inventory
        if (inventario) {
          await tx.inventario.update({
            where: { id: inventario.id },
            data: { cantidadActual: stockPosterior },
          });
        } else {
          await tx.inventario.create({
            data: {
              insumoId: partida.insumoId,
              almacenId: input.almacenDestinoId,
              cantidadActual: stockPosterior,
            },
          });
        }

        // Update insumo costs (weighted average)
        if (partida.costoUnitario > 0) {
          const insumo = await tx.insumo.findUnique({ where: { id: partida.insumoId } });
          if (insumo) {
            const currentAvgCost = Number(insumo.costoPromedio);
            const totalCurrentValue = currentAvgCost * stockAnterior;
            const newPurchaseValue = partida.costoUnitario * partida.cantidad;
            const newAvgCost = stockPosterior > 0
              ? (totalCurrentValue + newPurchaseValue) / stockPosterior
              : partida.costoUnitario;

            await tx.insumo.update({
              where: { id: partida.insumoId },
              data: { ultimoCosto: partida.costoUnitario, costoPromedio: newAvgCost },
            });
          }
        }

        // Create movement record
        const movimiento = await tx.movimientoInventario.create({
          data: {
            insumoId: partida.insumoId,
            tipoMovimiento: 'COMPRA',
            cantidad: partida.cantidad,
            costoUnitario: partida.costoUnitario,
            costoTotal: partida.costoUnitario * partida.cantidad,
            stockAnterior,
            stockPosterior,
            almacenDestinoId: input.almacenDestinoId,
            referencia: folio,
            notas: input.notas,
            proveedorId: input.proveedorId,
            fecha: fechaCompra,
            usuarioId,
          },
          include: { insumo: { select: { nombre: true } } },
        });

        movimientos.push(movimiento);
      }

      return { folio, partidas: movimientos.length, movimientos };
    });
  }

  async transferStock(input: TransferInput, usuarioId: string) {
    if (input.almacenOrigenId === input.almacenDestinoId) {
      throw new Error('Almacén origen y destino no pueden ser el mismo');
    }

    return await prisma.$transaction(async (tx) => {
      // Get origin inventory
      const inventarioOrigen = await tx.inventario.findFirst({
        where: { insumoId: input.insumoId, almacenId: input.almacenOrigenId },
      });

      const stockOrigenAnterior = inventarioOrigen
        ? Number(inventarioOrigen.cantidadActual)
        : 0;

      if (stockOrigenAnterior < input.cantidad) {
        throw new Error(
          `Stock insuficiente en almacén origen. Disponible: ${stockOrigenAnterior}, Solicitado: ${input.cantidad}`
        );
      }

      const stockOrigenPosterior = stockOrigenAnterior - input.cantidad;

      // Get or create destination inventory
      let inventarioDestino = await tx.inventario.findFirst({
        where: { insumoId: input.insumoId, almacenId: input.almacenDestinoId },
      });

      const stockDestinoAnterior = inventarioDestino
        ? Number(inventarioDestino.cantidadActual)
        : 0;
      const stockDestinoPosterior = stockDestinoAnterior + input.cantidad;

      // Update origin
      await tx.inventario.update({
        where: { id: inventarioOrigen!.id },
        data: { cantidadActual: stockOrigenPosterior },
      });

      // Upsert destination
      if (inventarioDestino) {
        await tx.inventario.update({
          where: { id: inventarioDestino.id },
          data: { cantidadActual: stockDestinoPosterior },
        });
      } else {
        await tx.inventario.create({
          data: {
            insumoId: input.insumoId,
            almacenId: input.almacenDestinoId,
            cantidadActual: stockDestinoPosterior,
          },
        });
      }

      // Create outgoing movement
      const movimientoSalida = await tx.movimientoInventario.create({
        data: {
          insumoId: input.insumoId,
          tipoMovimiento: 'TRANSFERENCIA',
          cantidad: input.cantidad,
          costoUnitario: 0,
          costoTotal: 0,
          stockAnterior: stockOrigenAnterior,
          stockPosterior: stockOrigenPosterior,
          almacenOrigenId: input.almacenOrigenId,
          almacenDestinoId: input.almacenDestinoId,
          referencia: `TRANS-OUT`,
          notas: input.notas,
          usuarioId,
        },
      });

      // Create incoming movement
      const movimientoEntrada = await tx.movimientoInventario.create({
        data: {
          insumoId: input.insumoId,
          tipoMovimiento: 'TRANSFERENCIA',
          cantidad: input.cantidad,
          costoUnitario: 0,
          costoTotal: 0,
          stockAnterior: stockDestinoAnterior,
          stockPosterior: stockDestinoPosterior,
          almacenOrigenId: input.almacenOrigenId,
          almacenDestinoId: input.almacenDestinoId,
          referencia: `TRANS-IN`,
          notas: input.notas,
          usuarioId,
        },
      });

      return { movimientoSalida, movimientoEntrada };
    });
  }

  async getPurchaseOrders(filters: { folio?: string; proveedorId?: string; fechaDesde?: string; fechaHasta?: string }, page: number, limit: number) {
    const where: any = { tipoMovimiento: 'COMPRA' };

    if (filters.folio) {
      where.referencia = { contains: filters.folio, mode: 'insensitive' };
    }
    if (filters.proveedorId) {
      where.proveedorId = filters.proveedorId;
    }
    if (filters.fechaDesde || filters.fechaHasta) {
      where.fecha = {};
      if (filters.fechaDesde) where.fecha.gte = new Date(filters.fechaDesde + 'T00:00:00');
      if (filters.fechaHasta) where.fecha.lte = new Date(filters.fechaHasta + 'T23:59:59');
    }

    // Get distinct folios with aggregated data
    const allMovements = await prisma.movimientoInventario.findMany({
      where,
      include: {
        proveedor: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true, apellido: true } },
        insumo: { select: { id: true, nombre: true, sku: true, unidadMedida: true } },
        almacenDestino: { select: { id: true, nombre: true } },
      },
      orderBy: { creadoEn: 'asc' },
    });

    // Group by folio (referencia), track creadoEn for proper sorting
    const folioMap = new Map<string, any>();
    for (const m of allMovements) {
      const folio = m.referencia || m.id;
      if (!folioMap.has(folio)) {
        folioMap.set(folio, {
          folio,
          fecha: m.fecha,
          creadoEn: m.creadoEn,
          proveedor: m.proveedor,
          almacen: m.almacenDestino,
          usuario: m.usuario,
          notas: m.notas,
          cancelado: false,
          partidas: [],
          total: 0,
        });
      }
      const order = folioMap.get(folio)!;
      // Keep the earliest creadoEn for this order group
      if (m.creadoEn < order.creadoEn) {
        order.creadoEn = m.creadoEn;
      }
      order.partidas.push({
        id: m.id,
        insumo: m.insumo,
        cantidad: m.cantidad,
        costoUnitario: m.costoUnitario,
        costoTotal: m.costoTotal,
        stockAnterior: m.stockAnterior,
        stockPosterior: m.stockPosterior,
      });
      order.total += Number(m.costoTotal);
    }

    // Check for cancelled orders (look for AJUSTE_NEGATIVO with matching ref)
    const cancelledRefs = await prisma.movimientoInventario.findMany({
      where: { tipoMovimiento: 'AJUSTE_NEGATIVO', referencia: { startsWith: 'CANCEL-OC-' } },
      select: { referencia: true },
    });
    const cancelledFolios = new Set(cancelledRefs.map(r => r.referencia?.replace('CANCEL-', '') || ''));

    // Sort by creadoEn ascending so oldest = #1, newest = last
    const orders = Array.from(folioMap.values())
      .map(o => ({
        ...o,
        cancelado: cancelledFolios.has(o.folio),
      }))
      .sort((a, b) => new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime());

    const total = orders.length;
    const paginated = orders.slice((page - 1) * limit, page * limit);

    return { data: paginated, total };
  }

  async getPurchaseOrderDetail(folio: string) {
    const movimientos = await prisma.movimientoInventario.findMany({
      where: { referencia: folio, tipoMovimiento: 'COMPRA' },
      include: {
        proveedor: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true, apellido: true } },
        insumo: { select: { id: true, nombre: true, sku: true, unidadMedida: true } },
        almacenDestino: { select: { id: true, nombre: true } },
      },
      orderBy: { creadoEn: 'asc' },
    });

    if (movimientos.length === 0) throw new Error('Orden de compra no encontrada');

    // Check if cancelled
    const cancelRecord = await prisma.movimientoInventario.findFirst({
      where: { referencia: `CANCEL-${folio}`, tipoMovimiento: 'AJUSTE_NEGATIVO' },
    });

    const first = movimientos[0];
    return {
      folio,
      fecha: first.fecha,
      proveedor: first.proveedor,
      almacen: first.almacenDestino,
      usuario: first.usuario,
      notas: first.notas,
      cancelado: !!cancelRecord,
      partidas: movimientos.map(m => ({
        id: m.id,
        insumo: m.insumo,
        cantidad: m.cantidad,
        costoUnitario: m.costoUnitario,
        costoTotal: m.costoTotal,
      })),
      total: movimientos.reduce((sum, m) => sum + Number(m.costoTotal), 0),
    };
  }

  async cancelPurchaseOrder(folio: string, usuarioId: string) {
    // Get all movements for this folio
    const movimientos = await prisma.movimientoInventario.findMany({
      where: { referencia: folio, tipoMovimiento: 'COMPRA' },
      include: { insumo: true },
    });

    if (movimientos.length === 0) throw new Error('Orden de compra no encontrada');

    // Check if already cancelled
    const existing = await prisma.movimientoInventario.findFirst({
      where: { referencia: `CANCEL-${folio}`, tipoMovimiento: 'AJUSTE_NEGATIVO' },
    });
    if (existing) throw new Error('Esta orden ya fue cancelada');

    return await prisma.$transaction(async (tx) => {
      for (const mov of movimientos) {
        const cantidad = Number(mov.cantidad);
        const almacenId = mov.almacenDestinoId!;

        // Get current inventory
        const inventario = await tx.inventario.findFirst({
          where: { insumoId: mov.insumoId, almacenId },
        });

        const stockAnterior = inventario ? Number(inventario.cantidadActual) : 0;
        const stockPosterior = Math.max(0, stockAnterior - cantidad);

        // Update inventory
        if (inventario) {
          await tx.inventario.update({
            where: { id: inventario.id },
            data: { cantidadActual: stockPosterior },
          });
        }

        // Create reversal movement
        await tx.movimientoInventario.create({
          data: {
            insumoId: mov.insumoId,
            tipoMovimiento: 'AJUSTE_NEGATIVO',
            cantidad,
            costoUnitario: Number(mov.costoUnitario),
            costoTotal: Number(mov.costoTotal),
            stockAnterior,
            stockPosterior,
            almacenOrigenId: almacenId,
            referencia: `CANCEL-${folio}`,
            notas: `Cancelación de orden ${folio}`,
            usuarioId,
          },
        });
      }

      return { folio, message: `Orden ${folio} cancelada. Se revirtieron ${movimientos.length} partidas.` };
    });
  }

  async deductByRecipe(
    recetaDetalles: Array<{ insumoId: string; cantidad: Decimal; merma: Decimal }>,
    cantidad: number,
    usuarioId: string,
    referencia: string,
    almacenId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      for (const detalle of recetaDetalles) {
        const cantidadDetalle = Number(detalle.cantidad);
        const merma = Number(detalle.merma);
        const needed = cantidadDetalle * cantidad * (1 + merma);

        // Get inventory record
        const inventario = await tx.inventario.findFirst({
          where: { insumoId: detalle.insumoId, almacenId },
        });

        const stockAnterior = inventario
          ? Number(inventario.cantidadActual)
          : 0;

        if (stockAnterior < needed) {
          const insumo = await tx.insumo.findUnique({
            where: { id: detalle.insumoId },
          });
          throw new Error(
            `Stock insuficiente de ${insumo?.nombre ?? detalle.insumoId}. Disponible: ${stockAnterior}, Necesario: ${needed.toFixed(4)}`
          );
        }

        const stockPosterior = stockAnterior - needed;

        // Update inventory
        await tx.inventario.update({
          where: { id: inventario!.id },
          data: { cantidadActual: stockPosterior },
        });

        // Create VENTA movement
        await tx.movimientoInventario.create({
          data: {
            insumoId: detalle.insumoId,
            tipoMovimiento: 'VENTA',
            cantidad: needed,
            costoUnitario: 0,
            costoTotal: 0,
            stockAnterior,
            stockPosterior,
            almacenOrigenId: almacenId,
            referencia,
            notas: `Consumo por venta - ${referencia}`,
            usuarioId,
          },
        });
      }

      return true;
    });
  }
}
