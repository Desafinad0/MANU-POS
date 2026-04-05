import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { CashRegisterService } from '../cash-register/cash-register.service';

const cashRegisterService = new CashRegisterService();

export class ReportsService {
  async ventasDiarias(fecha?: Date) {
    const targetDate = fecha || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const where = {
      fecha: { gte: startOfDay, lte: endOfDay },
      estado: 'COMPLETADA' as const,
    };

    const [
      totals,
      allSalesCount,
      cancelledCount,
      porMetodoPago,
      porTipoServicio,
      ventas,
    ] = await Promise.all([
      prisma.venta.aggregate({
        where,
        _sum: { total: true, subtotal: true, impuestoMonto: true, descuento: true },
        _avg: { total: true },
        _count: true,
      }),
      prisma.venta.count({
        where: { fecha: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.venta.count({
        where: { fecha: { gte: startOfDay, lte: endOfDay }, estado: 'CANCELADA' },
      }),
      prisma.venta.groupBy({
        by: ['metodoPago'],
        where,
        _sum: { total: true },
        _count: true,
      }),
      prisma.venta.groupBy({
        by: ['tipoServicio'],
        where,
        _sum: { total: true },
        _count: true,
      }),
      prisma.venta.findMany({
        where: { fecha: { gte: startOfDay, lte: endOfDay } },
        select: { fecha: true, total: true, estado: true },
        orderBy: { fecha: 'asc' },
      }),
    ]);

    // Group by hour
    const porHora: Record<number, { ventas: number; total: Prisma.Decimal }> = {};
    for (const venta of ventas) {
      if (venta.estado !== 'COMPLETADA') continue;
      const hour = venta.fecha.getHours();
      if (!porHora[hour]) {
        porHora[hour] = { ventas: 0, total: new Prisma.Decimal(0) };
      }
      porHora[hour].ventas += 1;
      porHora[hour].total = porHora[hour].total.add(
        new Prisma.Decimal(venta.total.toString())
      );
    }

    return {
      fecha: startOfDay.toISOString().slice(0, 10),
      totalVentas: allSalesCount,
      ventasCompletadas: totals._count,
      ventasCanceladas: cancelledCount,
      montoTotal: totals._sum.total || 0,
      subtotal: totals._sum.subtotal || 0,
      impuestos: totals._sum.impuestoMonto || 0,
      descuentos: totals._sum.descuento || 0,
      ticketPromedio: totals._avg.total || 0,
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
      porHora: Object.entries(porHora)
        .map(([hora, data]) => ({
          hora: parseInt(hora, 10),
          ventas: data.ventas,
          total: data.total,
        }))
        .sort((a, b) => a.hora - b.hora),
    };
  }

  async corteCaja(cajaId: string) {
    return cashRegisterService.getReport(cajaId);
  }

  async stockBajo() {
    // Get all active insumos with their total inventory across all warehouses
    const insumos = await prisma.insumo.findMany({
      where: { activo: true },
      include: {
        inventarios: {
          include: {
            almacen: { select: { id: true, nombre: true } },
          },
        },
      },
    });

    const stockBajo = insumos
      .map((insumo) => {
        const totalStock = insumo.inventarios.reduce(
          (sum, inv) => sum.add(new Prisma.Decimal(inv.cantidadActual.toString())),
          new Prisma.Decimal(0)
        );

        return {
          id: insumo.id,
          nombre: insumo.nombre,
          sku: insumo.sku,
          unidadMedida: insumo.unidadMedida,
          nivelMinimo: insumo.nivelMinimo,
          stockTotal: totalStock,
          deficit: new Prisma.Decimal(insumo.nivelMinimo.toString()).sub(totalStock),
          inventarios: insumo.inventarios.map((inv) => ({
            almacen: inv.almacen.nombre,
            cantidad: inv.cantidadActual,
          })),
        };
      })
      .filter((item) => item.stockTotal.lessThan(new Prisma.Decimal(item.nivelMinimo.toString())))
      .sort((a, b) => {
        // Sort by deficit descending (most critical first)
        const diff = b.deficit.sub(a.deficit);
        return diff.greaterThan(0) ? 1 : diff.lessThan(0) ? -1 : 0;
      });

    return stockBajo;
  }
}
