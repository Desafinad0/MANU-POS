import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowUpDown, Plus, ArrowLeftRight, Trash2, ShoppingCart } from 'lucide-react';
import { inventoryService } from '../../services/inventory.service';
import toast from 'react-hot-toast';

interface PurchaseLine {
  insumoId: string;
  cantidad: string;
  costoUnitario: string;
}

const emptyLine = (): PurchaseLine => ({ insumoId: '', cantidad: '', costoUnitario: '' });

// ---- Autocomplete component for insumo selection ----
function InsumoAutocomplete({
  supplies,
  value,
  onChange,
  required,
}: {
  supplies: any[];
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Sync display text when value changes externally
  useEffect(() => {
    if (value) {
      const s = supplies.find((s) => s.id === value);
      if (s) setQuery(s.nombre);
    } else {
      setQuery('');
    }
  }, [value, supplies]);

  const filtered = useMemo(() => {
    if (!query) return supplies;
    const q = query.toLowerCase();
    return supplies.filter(
      (s) => s.nombre.toLowerCase().includes(q) || (s.sku && s.sku.toLowerCase().includes(q))
    );
  }, [query, supplies]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value) onChange('');
        }}
        onFocus={() => setOpen(true)}
        className="input text-sm w-full"
        placeholder="Buscar insumo..."
        required={required}
      />
      {/* Hidden input for form validation */}
      {required && <input type="hidden" value={value} required />}
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto w-full mt-1 text-sm">
          {filtered.slice(0, 30).map((s) => (
            <li
              key={s.id}
              className={`px-3 py-2 cursor-pointer hover:bg-teal-50 ${s.id === value ? 'bg-teal-50 font-semibold' : ''}`}
              onMouseDown={() => {
                onChange(s.id);
                setQuery(s.nombre);
                setOpen(false);
              }}
            >
              {s.nombre} <span className="text-gray-400 text-xs ml-1">({s.sku})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const LAST_WAREHOUSE_KEY = 'manu_pos_last_warehouse';

export default function MovementsPage() {
  const [supplies, setSupplies] = useState<any[]>([]);
  const [selectedSupply, setSelectedSupply] = useState('');
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [showEntry, setShowEntry] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [stockData, setStockData] = useState<any[]>([]);

  const lastWarehouse = localStorage.getItem(LAST_WAREHOUSE_KEY) || '';

  // Purchase form (multi-line)
  const [purchaseForm, setPurchaseForm] = useState({
    proveedorId: '', almacenDestinoId: lastWarehouse, fecha: new Date().toISOString().split('T')[0], notas: '', registradoPor: '',
  });
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);

  // Single entry form (non-purchase movements)
  const [form, setForm] = useState({
    insumoId: '', tipo: 'AJUSTE_POSITIVO', cantidad: '', costoUnitario: '', almacenId: lastWarehouse, notas: '', fecha: new Date().toISOString().split('T')[0], proveedorId: '',
  });

  const [transferForm, setTransferForm] = useState({
    insumoId: '', almacenOrigenId: '', almacenDestinoId: '', cantidad: '', notas: '',
  });

  useEffect(() => {
    Promise.all([
      inventoryService.getSupplies({ limit: 500 }),
      inventoryService.getWarehouses(),
      inventoryService.getSuppliers({ limit: 200 }),
      inventoryService.getStock(),
    ]).then(([s, w, p, st]) => {
      setSupplies(s.data || []);
      setWarehouses(w || []);
      setSuppliers(p.data || []);
      setStockData(st || []);
    }).catch(() => {});
  }, []);

  // Get total stock for an insumo (sum across all warehouses)
  const getStockForInsumo = (insumoId: string) => {
    const items = stockData.filter((s: any) => s.insumoId === insumoId);
    return items.reduce((sum: number, s: any) => sum + Number(s.cantidadActual), 0);
  };

  const loadKardex = async (insumoId: string) => {
    setLoading(true);
    try {
      const res = await inventoryService.getKardex(insumoId);
      setMovements(res.data || []);
    } catch { toast.error('Error al cargar kardex'); }
    finally { setLoading(false); }
  };

  const handleSelectSupply = (id: string) => {
    setSelectedSupply(id);
    if (id) loadKardex(id);
  };

  // --- Purchase handlers ---
  const addLine = () => setPurchaseLines([...purchaseLines, emptyLine()]);

  const removeLine = (idx: number) => {
    if (purchaseLines.length === 1) return;
    setPurchaseLines(purchaseLines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof PurchaseLine, value: string) => {
    const updated = [...purchaseLines];
    updated[idx] = { ...updated[idx], [field]: value };
    setPurchaseLines(updated);
  };

  const purchaseTotal = purchaseLines.reduce((sum, l) => {
    const qty = parseFloat(l.cantidad) || 0;
    const cost = parseFloat(l.costoUnitario) || 0;
    return sum + qty * cost;
  }, 0);

  // Check for duplicate insumos in purchase lines
  const getDuplicateInsumos = (): Set<string> => {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const line of purchaseLines) {
      if (line.insumoId) {
        if (seen.has(line.insumoId)) dupes.add(line.insumoId);
        seen.add(line.insumoId);
      }
    }
    return dupes;
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.almacenDestinoId) { toast.error('Selecciona un almacén destino'); return; }

    // Validate no duplicate insumos
    const dupes = getDuplicateInsumos();
    if (dupes.size > 0) {
      const names = Array.from(dupes).map(id => supplies.find(s => s.id === id)?.nombre || id).join(', ');
      toast.error(`Insumo duplicado en partidas: ${names}. Combina las cantidades en una sola línea.`);
      return;
    }

    const partidas = purchaseLines
      .filter(l => l.insumoId && l.cantidad)
      .map(l => ({
        insumoId: l.insumoId,
        cantidad: parseFloat(l.cantidad),
        costoUnitario: parseFloat(l.costoUnitario) || 0,
      }));

    if (partidas.length === 0) { toast.error('Agrega al menos una partida'); return; }

    // Save last warehouse
    localStorage.setItem(LAST_WAREHOUSE_KEY, purchaseForm.almacenDestinoId);

    setSubmitting(true);
    try {
      const res = await inventoryService.createPurchase({
        proveedorId: purchaseForm.proveedorId || undefined,
        almacenDestinoId: purchaseForm.almacenDestinoId,
        fecha: purchaseForm.fecha || undefined,
        notas: purchaseForm.notas ? (purchaseForm.registradoPor ? `${purchaseForm.notas} | Registró: ${purchaseForm.registradoPor}` : purchaseForm.notas) : (purchaseForm.registradoPor ? `Registró: ${purchaseForm.registradoPor}` : undefined),
        partidas,
      });
      toast.success(res.message || `Compra ${res.data?.folio} registrada con ${res.data?.partidas} partidas`);
      setShowPurchase(false);
      setPurchaseForm({ proveedorId: '', almacenDestinoId: purchaseForm.almacenDestinoId, fecha: new Date().toISOString().split('T')[0], notas: '', registradoPor: '' });
      setPurchaseLines([emptyLine()]);
      if (selectedSupply) loadKardex(selectedSupply);
      // Refresh stock data
      inventoryService.getStock().then(st => setStockData(st || [])).catch(() => {});
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error al registrar compra'); }
    finally { setSubmitting(false); }
  };

  // --- Single entry handler (non-purchase) ---
  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    // Save last warehouse
    localStorage.setItem(LAST_WAREHOUSE_KEY, form.almacenId);

    await (async () => {
      try {
        await inventoryService.createMovement({
          insumoId: form.insumoId,
          almacenId: form.almacenId,
          tipo: form.tipo as any,
          cantidad: parseFloat(form.cantidad),
          costoUnitario: parseFloat(form.costoUnitario) || 0,
          notas: form.notas || undefined,
          fecha: form.fecha || undefined,
          proveedorId: form.proveedorId || undefined,
        });
        toast.success('Movimiento registrado');
        setShowEntry(false);
        setForm({ insumoId: '', tipo: 'AJUSTE_POSITIVO', cantidad: '', costoUnitario: '', almacenId: form.almacenId, notas: '', fecha: new Date().toISOString().split('T')[0], proveedorId: '' });
        if (selectedSupply) loadKardex(selectedSupply);
        inventoryService.getStock().then(st => setStockData(st || [])).catch(() => {});
      } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    })();
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferForm.almacenOrigenId === transferForm.almacenDestinoId) {
      toast.error('El almacén origen y destino deben ser diferentes');
      return;
    }
    try {
      await inventoryService.createTransfer({
        insumoId: transferForm.insumoId,
        almacenOrigenId: transferForm.almacenOrigenId,
        almacenDestinoId: transferForm.almacenDestinoId,
        cantidad: parseFloat(transferForm.cantidad),
        notas: transferForm.notas || undefined,
      });
      toast.success('Transferencia registrada');
      setShowTransfer(false);
      setTransferForm({ insumoId: '', almacenOrigenId: '', almacenDestinoId: '', cantidad: '', notas: '' });
      if (selectedSupply) loadKardex(selectedSupply);
      inventoryService.getStock().then(st => setStockData(st || [])).catch(() => {});
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const openPurchase = () => { setShowPurchase(true); setShowEntry(false); setShowTransfer(false); };
  const openEntry = () => { setShowEntry(true); setShowPurchase(false); setShowTransfer(false); };
  const openTransfer = () => { setShowTransfer(true); setShowPurchase(false); setShowEntry(false); };

  const typeColors: Record<string, string> = {
    COMPRA: 'text-green-600', VENTA: 'text-red-600', MERMA: 'text-orange-600',
    AJUSTE_POSITIVO: 'text-green-600', AJUSTE_NEGATIVO: 'text-red-600',
    TRANSFERENCIA: 'text-blue-600', INVENTARIO_INICIAL: 'text-purple-600',
  };

  const duplicates = getDuplicateInsumos();

  // Get selected supply info for stock display
  const selectedSupplyData = supplies.find(s => s.id === selectedSupply);
  const selectedSupplyStock = selectedSupply ? getStockForInsumo(selectedSupply) : 0;

  // Helper: show unidad for an insumo
  const getUnidad = (insumoId: string) => {
    const s = supplies.find(s => s.id === insumoId);
    return s?.unidadMedida || '';
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Movimientos (Kardex)</h1>
        <div className="flex gap-2">
          <button onClick={openPurchase} className="btn-primary"><ShoppingCart size={18} /> Compra</button>
          <button onClick={openEntry} className="btn-primary bg-gray-600 hover:bg-gray-700"><Plus size={18} /> Ajuste</button>
          <button onClick={openTransfer} className="btn-primary bg-blue-600 hover:bg-blue-700"><ArrowLeftRight size={18} /> Transferencia</button>
        </div>
      </div>

      {/* ======= PURCHASE FORM (multi-line) ======= */}
      {showPurchase && (
        <form onSubmit={handlePurchase} className="card p-5 mb-4 border-2 border-manu-teal/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Orden de Compra</h2>
            <span className="text-xs text-gray-400">El folio se genera automáticamente</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <select value={purchaseForm.proveedorId} onChange={(e) => setPurchaseForm({ ...purchaseForm, proveedorId: e.target.value })} className="input">
              <option value="">Proveedor</option>
              {suppliers.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <select value={purchaseForm.almacenDestinoId} onChange={(e) => setPurchaseForm({ ...purchaseForm, almacenDestinoId: e.target.value })} className="input" required>
              <option value="">Almacén destino *</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.nombre}</option>)}
            </select>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha</label>
              <input value={purchaseForm.fecha} onChange={(e) => setPurchaseForm({ ...purchaseForm, fecha: e.target.value })} className="input" type="date" />
            </div>
            <input value={purchaseForm.registradoPor} onChange={(e) => setPurchaseForm({ ...purchaseForm, registradoPor: e.target.value })} className="input" placeholder="Registrado por" />
            <input value={purchaseForm.notas} onChange={(e) => setPurchaseForm({ ...purchaseForm, notas: e.target.value })} className="input" placeholder="Notas generales" />
          </div>

          {/* Line items header */}
          <div className="grid grid-cols-[1fr_80px_100px_120px_80px_40px] gap-2 mb-1 px-1">
            <span className="text-xs font-semibold text-gray-500 uppercase">Insumo</span>
            <span className="text-xs font-semibold text-gray-500 uppercase text-center">Unidad</span>
            <span className="text-xs font-semibold text-gray-500 uppercase text-right">Cantidad</span>
            <span className="text-xs font-semibold text-gray-500 uppercase text-right">Costo Unit.</span>
            <span className="text-xs font-semibold text-gray-500 uppercase text-right">Subtotal</span>
            <span></span>
          </div>

          {/* Line items */}
          <div className="space-y-2 mb-3">
            {purchaseLines.map((line, idx) => {
              const subtotal = (parseFloat(line.cantidad) || 0) * (parseFloat(line.costoUnitario) || 0);
              const isDupe = line.insumoId && duplicates.has(line.insumoId);
              return (
                <div key={idx} className={`grid grid-cols-[1fr_80px_100px_120px_80px_40px] gap-2 items-center ${isDupe ? 'ring-2 ring-red-300 rounded-lg p-1' : ''}`}>
                  <InsumoAutocomplete
                    supplies={supplies}
                    value={line.insumoId}
                    onChange={(id) => updateLine(idx, 'insumoId', id)}
                    required
                  />
                  <span className="text-xs text-gray-400 text-center">{getUnidad(line.insumoId)}</span>
                  <input value={line.cantidad} onChange={(e) => updateLine(idx, 'cantidad', e.target.value)} className="input text-sm text-right" placeholder="Cant." type="number" step="0.01" min="0.01" required />
                  <input value={line.costoUnitario} onChange={(e) => updateLine(idx, 'costoUnitario', e.target.value)} className="input text-sm text-right" placeholder="$0.00" type="number" step="0.01" min="0" required />
                  <span className="text-sm font-semibold text-right">${subtotal.toFixed(2)}</span>
                  <button type="button" onClick={() => removeLine(idx)} className="p-1 text-gray-400 hover:text-red-500" disabled={purchaseLines.length === 1}>
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          {duplicates.size > 0 && (
            <p className="text-xs text-red-500 mb-2">Hay insumos duplicados. Cada insumo solo puede aparecer una vez por orden.</p>
          )}

          <button type="button" onClick={addLine} className="text-sm text-manu-teal hover:underline mb-4 flex items-center gap-1">
            <Plus size={14} /> Agregar partida
          </button>

          {/* Footer */}
          <div className="flex items-center justify-between border-t pt-3">
            <div className="text-sm text-gray-500">
              {purchaseLines.filter(l => l.insumoId).length} partida(s)
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-sm text-gray-500">Total: </span>
                <span className="text-xl font-bold text-gray-800">${purchaseTotal.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Registrando...' : 'Registrar Compra'}
                </button>
                <button type="button" onClick={() => setShowPurchase(false)} className="btn-secondary">Cancelar</button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ======= SINGLE ENTRY FORM (non-purchase adjustments) ======= */}
      {showEntry && (
        <form onSubmit={handleEntry} className="card p-4 mb-4 grid grid-cols-2 gap-3">
          <select value={form.insumoId} onChange={(e) => setForm({ ...form, insumoId: e.target.value })} className="input" required>
            <option value="">Insumo</option>
            {supplies.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="input">
            <option value="AJUSTE_POSITIVO">Ajuste +</option>
            <option value="AJUSTE_NEGATIVO">Ajuste -</option>
            <option value="MERMA">Merma</option>
            <option value="CONSUMO_INTERNO">Consumo Interno</option>
            <option value="INVENTARIO_INICIAL">Inventario Inicial</option>
          </select>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha de registro</label>
            <input value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="input" type="date" />
          </div>
          <input value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} className="input" placeholder="Cantidad" type="number" step="0.01" required />
          <input value={form.costoUnitario} onChange={(e) => setForm({ ...form, costoUnitario: e.target.value })} className="input" placeholder="Costo unitario" type="number" step="0.01" min="0" />
          <select value={form.almacenId} onChange={(e) => setForm({ ...form, almacenId: e.target.value })} className="input" required>
            <option value="">Almacén</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.nombre}</option>)}
          </select>
          <select value={form.proveedorId} onChange={(e) => setForm({ ...form, proveedorId: e.target.value })} className="input">
            <option value="">Proveedor (opcional)</option>
            {suppliers.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} className="input" placeholder="Notas" />
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="btn-primary">Registrar</button>
            <button type="button" onClick={() => setShowEntry(false)} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      {/* ======= TRANSFER FORM ======= */}
      {showTransfer && (
        <form onSubmit={handleTransfer} className="card p-4 mb-4 grid grid-cols-2 gap-3">
          <select value={transferForm.insumoId} onChange={(e) => setTransferForm({ ...transferForm, insumoId: e.target.value })} className="input col-span-2" required>
            <option value="">Insumo</option>
            {supplies.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <select value={transferForm.almacenOrigenId} onChange={(e) => setTransferForm({ ...transferForm, almacenOrigenId: e.target.value })} className="input" required>
            <option value="">Almacén origen</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.nombre}</option>)}
          </select>
          <select value={transferForm.almacenDestinoId} onChange={(e) => setTransferForm({ ...transferForm, almacenDestinoId: e.target.value })} className="input" required>
            <option value="">Almacén destino</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.nombre}</option>)}
          </select>
          <input value={transferForm.cantidad} onChange={(e) => setTransferForm({ ...transferForm, cantidad: e.target.value })} className="input" placeholder="Cantidad" type="number" step="0.01" required />
          <input value={transferForm.notas} onChange={(e) => setTransferForm({ ...transferForm, notas: e.target.value })} className="input" placeholder="Notas" />
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="btn-primary">Transferir</button>
            <button type="button" onClick={() => setShowTransfer(false)} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      {/* ======= KARDEX ======= */}
      <div className="mb-4">
        <select value={selectedSupply} onChange={(e) => handleSelectSupply(e.target.value)} className="input">
          <option value="">Selecciona un insumo para ver su kardex</option>
          {supplies.map((s) => <option key={s.id} value={s.id}>{s.nombre} ({s.sku})</option>)}
        </select>
      </div>

      {/* Stock actual del insumo seleccionado */}
      {selectedSupply && selectedSupplyData && (
        <div className="flex items-center gap-4 mb-3 text-sm">
          <span className="text-gray-500">Stock actual:</span>
          <span className="font-bold text-lg text-manu-teal">{selectedSupplyStock.toFixed(2)}</span>
          <span className="text-gray-400">{selectedSupplyData.unidadMedida}</span>
          {selectedSupplyData.nivelMinimo > 0 && selectedSupplyStock < selectedSupplyData.nivelMinimo && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Bajo mínimo ({selectedSupplyData.nivelMinimo})</span>
          )}
        </div>
      )}

      {loading ? <p className="text-gray-500">Cargando...</p> : selectedSupply && (
        movements.length === 0 ? (
          <div className="text-center py-8 text-gray-400"><ArrowUpDown size={48} className="mx-auto mb-2" /><p>Sin movimientos.</p></div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left font-medium">Fecha</th>
                <th className="px-4 py-3 text-left font-medium">Tipo</th>
                <th className="px-4 py-3 text-right font-medium">Cantidad</th>
                <th className="px-4 py-3 text-center font-medium">Unidad</th>
                <th className="px-4 py-3 text-right font-medium">C. Unit.</th>
                <th className="px-4 py-3 text-right font-medium">Monto</th>
                <th className="px-4 py-3 text-right font-medium">Antes</th>
                <th className="px-4 py-3 text-right font-medium">Despues</th>
                <th className="px-4 py-3 text-left font-medium">Proveedor</th>
                <th className="px-4 py-3 text-left font-medium">Folio</th>
              </tr></thead>
              <tbody className="divide-y">
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 text-gray-500">{new Date(m.creadoEn || m.fecha).toLocaleString('es-MX', { timeZone: 'America/Monterrey' })}</td>
                    <td className={`px-4 py-3 font-medium ${typeColors[m.tipoMovimiento] || ''}`}>{m.tipoMovimiento}</td>
                    <td className="px-4 py-3 text-right font-semibold">{Number(m.cantidad).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{selectedSupplyData?.unidadMedida || ''}</td>
                    <td className="px-4 py-3 text-right">${Number(m.costoUnitario || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-semibold">${Number(m.costoTotal || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{Number(m.stockAnterior).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{Number(m.stockPosterior).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500">{m.proveedor?.nombre || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{m.referencia || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
