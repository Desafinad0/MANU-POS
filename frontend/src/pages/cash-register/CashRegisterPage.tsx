import { useState, useEffect } from 'react';
import { DollarSign, Lock, Unlock, Clock } from 'lucide-react';
import { cashRegisterService } from '../../services/cash-register.service';
import toast from 'react-hot-toast';

export default function CashRegisterPage() {
  const [currentCaja, setCurrentCaja] = useState<any>(null);
  const [fondoInicial, setFondoInicial] = useState('');
  const [conteoFisico, setConteoFisico] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadCurrent();
  }, []);

  const loadCurrent = async () => {
    try {
      const caja = await cashRegisterService.getCurrent();
      setCurrentCaja(caja);
    } catch {
      setCurrentCaja(null);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    const amount = parseFloat(fondoInicial);
    if (isNaN(amount) || amount < 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    setActionLoading(true);
    try {
      const caja = await cashRegisterService.open(amount);
      setCurrentCaja(caja);
      setFondoInicial('');
      toast.success('Caja abierta exitosamente');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al abrir caja');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    const amount = parseFloat(conteoFisico);
    if (isNaN(amount) || amount < 0) {
      toast.error('Ingresa el conteo físico');
      return;
    }

    setActionLoading(true);
    try {
      await cashRegisterService.close(currentCaja.id, amount, observaciones);
      setCurrentCaja(null);
      setConteoFisico('');
      setObservaciones('');
      toast.success('Caja cerrada exitosamente');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cerrar caja');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Control de Caja</h1>

      {!currentCaja ? (
        /* Open register */
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Unlock className="text-green-600" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Abrir Caja</h2>
              <p className="text-sm text-gray-500">Registra el fondo inicial para iniciar turno</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Fondo Inicial ($)</label>
              <input
                type="number"
                value={fondoInicial}
                onChange={(e) => setFondoInicial(e.target.value)}
                className="input text-2xl text-center font-bold"
                placeholder="0.00"
                step="0.01"
                autoFocus
              />
            </div>

            <button
              onClick={handleOpen}
              disabled={actionLoading}
              className="btn-primary w-full"
            >
              {actionLoading ? 'Abriendo...' : 'Abrir Caja'}
            </button>
          </div>
        </div>
      ) : (
        /* Current register info + close */
        <div className="space-y-4">
          {/* Status card */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <DollarSign className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Caja Abierta</h2>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock size={14} />
                  <span>
                    Abierta: {new Date(currentCaja.fechaApertura).toLocaleString('es-MX')}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Fondo Inicial</p>
                <p className="text-lg font-bold">${Number(currentCaja.fondoInicial).toFixed(2)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Total Ventas</p>
                <p className="text-lg font-bold text-manu-teal">
                  ${Number(currentCaja.totalVentas).toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Efectivo</p>
                <p className="text-lg font-bold">${Number(currentCaja.totalEfectivo).toFixed(2)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Tarjeta</p>
                <p className="text-lg font-bold">${Number(currentCaja.totalTarjeta).toFixed(2)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                <p className="text-xs text-gray-500">Transferencia</p>
                <p className="text-lg font-bold">
                  ${Number(currentCaja.totalTransferencia).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Close register */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Lock className="text-red-600" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Cerrar Caja</h2>
                <p className="text-sm text-gray-500">Realiza el arqueo físico</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Conteo Físico de Efectivo ($)</label>
                <input
                  type="number"
                  value={conteoFisico}
                  onChange={(e) => setConteoFisico(e.target.value)}
                  className="input text-2xl text-center font-bold"
                  placeholder="0.00"
                  step="0.01"
                />
                {conteoFisico && (
                  <div className="mt-2 text-sm">
                    <span className="text-gray-500">Efectivo esperado: </span>
                    <span className="font-bold">
                      $
                      {(
                        Number(currentCaja.fondoInicial) + Number(currentCaja.totalEfectivo)
                      ).toFixed(2)}
                    </span>
                    {' | '}
                    <span
                      className={
                        parseFloat(conteoFisico) -
                          (Number(currentCaja.fondoInicial) + Number(currentCaja.totalEfectivo)) >=
                        0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }
                    >
                      Diferencia: $
                      {(
                        parseFloat(conteoFisico) -
                        (Number(currentCaja.fondoInicial) + Number(currentCaja.totalEfectivo))
                      ).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="label">Observaciones</label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="input"
                  rows={2}
                  placeholder="Notas del turno..."
                />
              </div>

              <button
                onClick={handleClose}
                disabled={actionLoading}
                className="btn-danger w-full"
              >
                {actionLoading ? 'Cerrando...' : 'Cerrar Caja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
