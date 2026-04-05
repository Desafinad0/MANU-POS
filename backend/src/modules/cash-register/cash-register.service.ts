import { Prisma } from '@prisma/client';
import prisma from '../../config/database';

export class CashRegisterService {
  async findAll(page: number, limit: number) {
    const [cajas, total] = await Promise.all([
      prisma.caja.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: {
          abiertoPor: { select: { id: true, nombre: true, apellido: true } },
          cerradoPor: { select: { id: true, nombre: true, apellido: true } },
          _count: { select: { ventas: true } },
        },
        orderBy: { fechaApertura: 'desc' },
      }),
      prisma.caja.count(),
    ]);

    return { data: cajas, total };
  }

  async findById(id: string) {
    const caja = await prisma.caja.findUnique({
      where: { id },
      include: {
        abiertoPor: { select: { id: true, nombre: true, apellido: true } },
        cerradoPor: { select: { id: true, nombre: true, apellido: true } },
        ventas: {
          select: {
            id: true,
            numeroVenta: true,
            total: true,
            metodoPago: true,
            estado: true,
            fecha: true,
          },
          orderBy: { fecha: 'desc' },
        },
      },
    });

    if (!caja) throw new Error('Caja no encontrada');
    return caja;
  }

  async getCurrentOpen(usuarioId: string) {
    const caja = await prisma.caja.findFirst({
      where: { abiertoPorId: usuarioId, estado: 'ABIERTA' },
      include: {
        abiertoPor: { select: { id: true, nombre: true, apellido: true } },
        _count: { select: { ventas: true } },
      },
    });

    return caja;
  }

  async open(fondoInicial: number, usuarioId: string) {
    // Check no existing open caja for this user
    const existingOpen = await prisma.caja.findFirst({
      where: { abiertoPorId: usuarioId, estado: 'ABIERTA' },
    });

    if (existingOpen) {
      throw new Error('Ya tiene una caja abierta. Debe cerrarla antes de abrir otra.');
    }

    // Generate numeroCaja: CAJA-YYYYMMDD-NN
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `CAJA-${dateStr}-`;

    const lastCaja = await prisma.caja.findFirst({
      where: { numeroCaja: { startsWith: prefix } },
      orderBy: { numeroCaja: 'desc' },
      select: { numeroCaja: true },
    });

    let nextNum = 1;
    if (lastCaja) {
      const lastNum = parseInt(lastCaja.numeroCaja.split('-').pop() || '0', 10);
      nextNum = lastNum + 1;
    }
    const numeroCaja = `${prefix}${nextNum.toString().padStart(2, '0')}`;

    const caja = await prisma.caja.create({
      data: {
        numeroCaja,
        fondoInicial: new Prisma.Decimal(fondoInicial.toString()),
        estado: 'ABIERTA',
        abiertoPorId: usuarioId,
      },
      include: {
        abiertoPor: { select: { id: true, nombre: true, apellido: true } },
      },
    });

    return caja;
  }

  async close(cajaId: string, conteoFisico: number, observaciones: string | undefined, usuarioId: string) {
    const caja = await prisma.caja.findUnique({ where: { id: cajaId } });

    if (!caja) throw new Error('Caja no encontrada');
    if (caja.estado !== 'ABIERTA') throw new Error('La caja ya está cerrada');

    // Calculate diferencia = conteoFisico - (fondoInicial + totalEfectivo)
    const conteoDecimal = new Prisma.Decimal(conteoFisico.toString());
    const expectedCash = new Prisma.Decimal(caja.fondoInicial.toString())
      .add(new Prisma.Decimal(caja.totalEfectivo.toString()));
    const diferencia = conteoDecimal.sub(expectedCash);

    const cajaCerrada = await prisma.caja.update({
      where: { id: cajaId },
      data: {
        estado: 'CERRADA',
        conteoFisico: conteoDecimal,
        diferencia,
        observaciones,
        fechaCierre: new Date(),
        cerradoPorId: usuarioId,
      },
      include: {
        abiertoPor: { select: { id: true, nombre: true, apellido: true } },
        cerradoPor: { select: { id: true, nombre: true, apellido: true } },
      },
    });

    return cajaCerrada;
  }

  async getReport(cajaId: string) {
    const caja = await prisma.caja.findUnique({
      where: { id: cajaId },
      include: {
        abiertoPor: { select: { id: true, nombre: true, apellido: true } },
        cerradoPor: { select: { id: true, nombre: true, apellido: true } },
      },
    });

    if (!caja) throw new Error('Caja no encontrada');

    const ventasWhere = { cajaId, estado: 'COMPLETADA' as const };

    const [
      ventasAggregate,
      ventasCanceladas,
      porMetodoPago,
      porTipoServicio,
    ] = await Promise.all([
      prisma.venta.aggregate({
        where: ventasWhere,
        _sum: { total: true },
        _avg: { total: true },
        _count: true,
      }),
      prisma.venta.count({ where: { cajaId, estado: 'CANCELADA' } }),
      prisma.venta.groupBy({
        by: ['metodoPago'],
        where: ventasWhere,
        _sum: { total: true },
        _count: true,
      }),
      prisma.venta.groupBy({
        by: ['tipoServicio'],
        where: ventasWhere,
        _sum: { total: true },
        _count: true,
      }),
    ]);

    return {
      caja,
      resumen: {
        ventasCompletadas: ventasAggregate._count,
        ventasCanceladas,
        montoTotal: ventasAggregate._sum.total || 0,
        ticketPromedio: ventasAggregate._avg.total || 0,
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
      },
    };
  }
}
