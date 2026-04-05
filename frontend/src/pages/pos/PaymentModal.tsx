import { useState } from 'react';
import { X, DollarSign, CreditCard, ArrowRightLeft, Layers, CheckCircle } from 'lucide-react';
import { salesService, type CreateSaleInput } from '../../services/sales.service';
import { ordersService } from '../../services/orders.service';
import toast from 'react-hot-toast';

interface OrderItem {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  comensal: number;
  tipoOrden: 'COCINA' | 'BARRA';
}

interface Props {
  total: number;
  subtotal: number;
  iva: number;
  descuento?: number;
  orderItems?: OrderItem[];
  orderType?: 'MESA' | 'PARA_LLEVAR' | 'PLATAFORMA';
  mesa?: string;
  ordenId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({
  total,
  subtotal,
  iva,
  descuento,
  orderItems,
  orderType,
  mesa,
  ordenId,
  onClose,
  onSuccess,
}: Props) {
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO'>('EFECTIVO');
  const [montoPagado, setMontoPagado] = useState('');
  const [montoEfectivo, setMontoEfectivo] = useState('');
  const [montoTarjeta, setMontoTarjeta] = useState('');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const paid = parseFloat(montoPagado) || 0;
  const efectivo = parseFloat(montoEfectivo) || 0;
  const tarjeta = parseFloat(montoTarjeta) || 0;
  const mixtoTotal = efectivo + tarjeta;

  const cambio =
    metodoPago === 'MIXTO'
      ? Math.max(0, mixtoTotal - total)
      : Math.max(0, paid - total);

  const quickAmounts = [
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 50) * 50,
    Math.ceil(total / 100) * 100,
    Math.ceil(total / 500) * 500,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= total);

  const isPayDisabled = () => {
    if (loading) return true;
    if (metodoPago === 'EFECTIVO' && paid < total) return true;
    if (metodoPago === 'MIXTO' && mixtoTotal < total) return true;
    return false;
  };

  const handlePay = async () => {
    if (metodoPago === 'EFECTIVO' && paid < total) {
      toast.error('Monto insuficiente');
      return;
    }
    if (metodoPago === 'MIXTO' && mixtoTotal < total) {
      toast.error('La suma de los montos es insuficiente');
      return;
    }

    setLoading(true);
    try {
      const notas = referenciaPago && ['TARJETA', 'TRANSFERENCIA', 'MIXTO'].includes(metodoPago)
        ? `Ref: ${referenciaPago}`
        : undefined;

      const montoPagadoFinal =
        metodoPago === 'EFECTIVO'
          ? paid
          : metodoPago === 'MIXTO'
            ? mixtoTotal
            : total;

      if (ordenId) {
        // Pay existing order
        await ordersService.pay(ordenId, {
          metodoPago,
          montoPagado: montoPagadoFinal,
          descuento: descuento && descuento > 0 ? descuento : undefined,
          notas,
        });
      } else {
        // Direct sale (legacy flow)
        const saleData: CreateSaleInput = {
          tipoServicio: orderType!,
          mesa: orderType === 'MESA' ? mesa : undefined,
          metodoPago,
          montoPagado: montoPagadoFinal,
          descuento: descuento && descuento > 0 ? descuento : undefined,
          notas,
          items: (orderItems || []).map((item) => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
            comensal: item.comensal,
          })),
        };
        await salesService.createSale(saleData);
      }

      setShowSuccess(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al procesar venta';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { key: 'EFECTIVO' as const, label: 'Efectivo', icon: DollarSign },
    { key: 'TARJETA' as const, label: 'Tarjeta', icon: CreditCard },
    { key: 'TRANSFERENCIA' as const, label: 'Transferencia', icon: ArrowRightLeft },
    { key: 'MIXTO' as const, label: 'Mixto', icon: Layers },
  ];

  // Success screen after sale
  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg">
          <div className="print-ticket p-8 text-center space-y-4">
            <CheckCircle size={64} className="mx-auto text-green-500" />
            <h2 className="text-2xl font-bold text-gray-800">Venta registrada</h2>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-800">${total.toFixed(2)}</p>
              {cambio > 0 && (
                <p className="text-lg text-green-700">Cambio: ${cambio.toFixed(2)}</p>
              )}
            </div>
          </div>
          <div className="p-4 border-t flex gap-3">
            <button
              onClick={() => window.print()}
              className="flex-1 py-3 rounded-xl border-2 border-manu-teal text-manu-teal font-medium hover:bg-teal-50"
            >
              Imprimir Ticket
            </button>
            <button
              onClick={onSuccess}
              className="btn-primary flex-1 py-3"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">Cobrar</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Total */}
          <div className="text-center py-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500">Total a cobrar</p>
            <p className="text-4xl font-bold text-gray-800">${total.toFixed(2)}</p>
            <div className="text-xs text-gray-400 mt-1 space-y-0.5">
              <p>Subtotal: ${subtotal.toFixed(2)}</p>
              {descuento && descuento > 0 && (
                <p className="text-red-500">Descuento: -${descuento.toFixed(2)}</p>
              )}
              <p>IVA: ${iva.toFixed(2)}</p>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="label">Método de pago</label>
            <div className="grid grid-cols-4 gap-2">
              {paymentMethods.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    setMetodoPago(key);
                    if (key !== 'EFECTIVO' && key !== 'MIXTO') setMontoPagado(total.toFixed(2));
                    if (key === 'MIXTO') {
                      setMontoPagado('');
                      setMontoEfectivo('');
                      setMontoTarjeta('');
                    }
                  }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
                    metodoPago === key
                      ? 'border-manu-teal bg-teal-50 text-manu-teal'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <Icon size={24} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount (only for cash) */}
          {metodoPago === 'EFECTIVO' && (
            <div>
              <label className="label">Monto recibido</label>
              <input
                type="number"
                value={montoPagado}
                onChange={(e) => setMontoPagado(e.target.value)}
                className="input text-2xl text-center font-bold"
                placeholder="0.00"
                step="0.01"
                autoFocus
              />

              {/* Quick amounts */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setMontoPagado(total.toFixed(2))}
                  className="flex-1 py-2 rounded-lg bg-teal-50 text-manu-teal text-sm font-medium hover:bg-teal-100"
                >
                  Exacto
                </button>
                {quickAmounts.slice(0, 3).map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setMontoPagado(amount.toString())}
                    className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
                  >
                    ${amount}
                  </button>
                ))}
              </div>

              {/* Change */}
              {paid > 0 && (
                <div className="mt-3 p-3 bg-green-50 rounded-xl text-center">
                  <p className="text-sm text-green-700">Cambio</p>
                  <p className="text-2xl font-bold text-green-700">${cambio.toFixed(2)}</p>
                </div>
              )}
            </div>
          )}

          {/* MIXTO inputs */}
          {metodoPago === 'MIXTO' && (
            <div className="space-y-3">
              <div>
                <label className="label">Monto en efectivo</label>
                <input
                  type="number"
                  value={montoEfectivo}
                  onChange={(e) => setMontoEfectivo(e.target.value)}
                  className="input text-xl text-center font-bold"
                  placeholder="0.00"
                  step="0.01"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Monto en tarjeta</label>
                <input
                  type="number"
                  value={montoTarjeta}
                  onChange={(e) => setMontoTarjeta(e.target.value)}
                  className="input text-xl text-center font-bold"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              {/* Mixto summary */}
              {mixtoTotal > 0 && (
                <div className="mt-3 p-3 bg-green-50 rounded-xl text-center">
                  <p className="text-sm text-green-700">
                    Total: ${mixtoTotal.toFixed(2)} {mixtoTotal < total && `(faltan $${(total - mixtoTotal).toFixed(2)})`}
                  </p>
                  {mixtoTotal >= total && (
                    <>
                      <p className="text-sm text-green-700 mt-1">Cambio</p>
                      <p className="text-2xl font-bold text-green-700">${cambio.toFixed(2)}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Referencia de pago */}
          {['TARJETA', 'TRANSFERENCIA', 'MIXTO'].includes(metodoPago) && (
            <div>
              <label className="label">Referencia (últimos 4 dígitos)</label>
              <input
                type="text"
                value={referenciaPago}
                onChange={(e) => setReferenciaPago(e.target.value)}
                className="input text-center font-medium"
                placeholder="0000"
                maxLength={4}
              />
            </div>
          )}

          {/* Summary */}
          <div className="text-sm text-gray-500 space-y-1">
            <p>{orderItems.length} productos, {orderItems.reduce((s, i) => s + i.cantidad, 0)} unidades</p>
            <p>
              {orderType === 'MESA' && mesa ? `Mesa ${mesa}` : ''}
              {orderType === 'PARA_LLEVAR' ? 'Para llevar' : ''}
              {orderType === 'PLATAFORMA' ? 'Plataforma' : ''}
            </p>
          </div>

          {/* Pay button */}
          <button
            onClick={handlePay}
            disabled={isPayDisabled()}
            className="btn-primary w-full text-lg py-4"
          >
            {loading ? 'Procesando...' : `Confirmar Pago $${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
