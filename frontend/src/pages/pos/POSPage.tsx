import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  X,
  Percent,
  MessageSquare,
  Send,
  DollarSign,
  Clock,
  ChefHat,
  CheckCircle,
  Users,
  XCircle,
  Save,
} from 'lucide-react';
import { catalogService, type Product, type Category } from '../../services/catalog.service';
import { cashRegisterService } from '../../services/cash-register.service';
import { ordersService, type Orden, type OrdenDetalle } from '../../services/orders.service';
import { tablesService, type Mesa } from '../../services/tables.service';
import toast from 'react-hot-toast';
import PaymentModal from './PaymentModal';
import { useAuth } from '../../context/AuthContext';

interface PendingItem {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  comensal: number;
  notas?: string;
  tipoOrden: 'COCINA' | 'BARRA';
}

interface NewOrderConfig {
  tipoServicio: 'MESA' | 'PARA_LLEVAR' | 'PLATAFORMA';
  mesaId?: string;
  comensales: number;
  clienteNombre?: string;
}

export default function POSPage() {
  const { hasPermission } = useAuth();
  // Catalog state
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [cajaId, setCajaId] = useState<string | null>(null);

  // Order management state
  const [activeOrders, setActiveOrders] = useState<Orden[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Orden | null>(null);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [newOrderMode, setNewOrderMode] = useState(false);
  const [newOrderConfig, setNewOrderConfig] = useState<NewOrderConfig | null>(null);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);

  // UI state
  const [showPayment, setShowPayment] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [descuentoTipo, setDescuentoTipo] = useState<'%' | '$'>('%');
  const [descuentoValor, setDescuentoValor] = useState('');
  const [editingNotesIndex, setEditingNotesIndex] = useState<number | null>(null);
  const [editingComensalIndex, setEditingComensalIndex] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  // New Order Modal state
  const [modalTipoServicio, setModalTipoServicio] = useState<'MESA' | 'PARA_LLEVAR' | 'PLATAFORMA'>('MESA');
  const [modalMesaId, setModalMesaId] = useState('');
  const [modalComensales, setModalComensales] = useState(2);
  const [modalClienteNombre, setModalClienteNombre] = useState('');

  const refreshInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Data Loading ─────────────────────────────────────────────────────

  useEffect(() => {
    loadData();
    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
    };
  }, []);

  // Auto-refresh active orders every 30 seconds
  useEffect(() => {
    if (refreshInterval.current) clearInterval(refreshInterval.current);
    refreshInterval.current = setInterval(() => {
      loadActiveOrders();
    }, 30000);
    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
    };
  }, []);

  const loadData = async () => {
    try {
      const [cats, prods] = await Promise.all([
        catalogService.getCategories(),
        catalogService.getProductsForPOS(),
      ]);
      setCategories(cats || []);
      setProducts(prods || []);

      try {
        const caja = await cashRegisterService.getCurrent();
        setCajaId(caja?.id || null);
      } catch {
        setCajaId(null);
      }

      await loadActiveOrders();
    } catch (err) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveOrders = async () => {
    try {
      const orders = await ordersService.getAll({ incluirCerradas: 'false' });
      // Filter to only active orders
      const active = (orders || []).filter(
        (o: Orden) => !['COBRADA', 'CANCELADA'].includes(o.estado)
      );
      setActiveOrders(active);
    } catch (err) {
      // silent fail on refresh
    }
  };

  const loadOrderDetails = async (orderId: string) => {
    try {
      const order = await ordersService.getById(orderId);
      setSelectedOrder(order);
    } catch (err) {
      toast.error('Error al cargar orden');
    }
  };

  const loadAvailableMesas = async () => {
    try {
      const m = await tablesService.getAll({ estado: 'DISPONIBLE' });
      setMesas(m || []);
    } catch (err) {
      toast.error('Error al cargar mesas');
    }
  };

  // ─── Order Selection ──────────────────────────────────────────────────

  const selectOrder = (orderId: string) => {
    setNewOrderMode(false);
    setNewOrderConfig(null);
    setPendingItems([]);
    setSelectedOrderId(orderId);
    loadOrderDetails(orderId);
    setDescuentoValor('');
  };

  const startNewOrder = async () => {
    await loadAvailableMesas();
    setModalTipoServicio('MESA');
    setModalMesaId('');
    setModalComensales(2);
    setModalClienteNombre('');
    setNewOrderMode(true);
  };

  const confirmNewOrderConfig = () => {
    if (modalTipoServicio === 'MESA' && !modalMesaId) {
      toast.error('Selecciona una mesa');
      return;
    }
    setNewOrderConfig({
      tipoServicio: modalTipoServicio,
      mesaId: modalTipoServicio === 'MESA' ? modalMesaId : undefined,
      comensales: modalComensales,
      clienteNombre: modalClienteNombre || undefined,
    });
    setSelectedOrderId(null);
    setSelectedOrder(null);
    setPendingItems([]);
    setNewOrderMode(false);
  };

  // ─── Product Filtering ────────────────────────────────────────────────

  const filteredProducts = products.filter((p) => {
    const matchesCategory = !selectedCategory || p.categoriaId === selectedCategory;
    const matchesSearch = !search || p.nombre.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // ─── Item Management ──────────────────────────────────────────────────

  const addItem = useCallback(
    (product: Product) => {
      // Must have a selected order or new order config
      if (!selectedOrderId && !newOrderConfig) {
        toast.error('Selecciona o crea una orden primero');
        return;
      }
      setPendingItems((items) => {
        const existing = items.find((i) => i.productoId === product.id && i.comensal === 1);
        if (existing) {
          return items.map((i) =>
            i.productoId === product.id && i.comensal === 1
              ? { ...i, cantidad: i.cantidad + 1 }
              : i
          );
        }
        return [
          ...items,
          {
            productoId: product.id,
            nombre: product.nombre,
            precio: Number(product.precio),
            cantidad: 1,
            comensal: 1,
            tipoOrden: product.tipoOrden,
          },
        ];
      });
    },
    [selectedOrderId, newOrderConfig]
  );

  const updatePendingQuantity = (index: number, delta: number) => {
    setPendingItems((items) =>
      items
        .map((item, i) =>
          i === index ? { ...item, cantidad: Math.max(0, item.cantidad + delta) } : item
        )
        .filter((item) => item.cantidad > 0)
    );
  };

  const removePendingItem = (index: number) => {
    setPendingItems((items) => items.filter((_, i) => i !== index));
  };

  const updatePendingNotes = (index: number, notas: string) => {
    setPendingItems((items) =>
      items.map((item, i) => (i === index ? { ...item, notas } : item))
    );
  };

  const updatePendingComensal = (index: number, comensal: number) => {
    setPendingItems((items) =>
      items.map((item, i) => (i === index ? { ...item, comensal } : item))
    );
    setEditingComensalIndex(null);
  };

  // ─── Order Actions ────────────────────────────────────────────────────

  const handleSave = async () => {
    if (pendingItems.length === 0) {
      toast.error('Agrega productos al pedido');
      return;
    }
    if (!cajaId) {
      toast.error('Debes abrir caja antes de crear órdenes');
      return;
    }

    setSavingOrder(true);
    try {
      const itemsPayload = pendingItems.map((item) => ({
        productoId: item.productoId,
        cantidad: item.cantidad,
        notas: item.notas,
        comensal: item.comensal,
      }));

      if (newOrderConfig) {
        // Create new order
        const newOrder = await ordersService.create({
          tipoServicio: newOrderConfig.tipoServicio,
          mesaId: newOrderConfig.mesaId,
          comensales: newOrderConfig.comensales,
          clienteNombre: newOrderConfig.clienteNombre,
          items: itemsPayload,
        });
        toast.success(`Orden #${newOrder.numeroOrden} creada`);
        setNewOrderConfig(null);
        setPendingItems([]);
        await loadActiveOrders();
        setSelectedOrderId(newOrder.id);
        await loadOrderDetails(newOrder.id);
      } else if (selectedOrderId) {
        // Add items to existing order
        await ordersService.addItems(selectedOrderId, itemsPayload);
        toast.success('Productos agregados a la orden');
        setPendingItems([]);
        await loadOrderDetails(selectedOrderId);
        await loadActiveOrders();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al guardar orden');
    } finally {
      setSavingOrder(false);
    }
  };

  const handleSendToKitchen = async () => {
    if (!selectedOrderId) return;

    // Save pending items first if any
    if (pendingItems.length > 0) {
      await handleSave();
    }

    try {
      await ordersService.sendToKitchen(selectedOrderId);
      toast.success('Orden enviada a cocina');
      await loadOrderDetails(selectedOrderId);
      await loadActiveOrders();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al enviar a cocina');
    }
  };

  const handleCobrar = () => {
    if (!selectedOrderId || !selectedOrder) return;
    if (!cajaId) {
      toast.error('Debes abrir caja antes de cobrar');
      return;
    }
    setShowPayment(true);
  };

  const handleCancelOrder = async () => {
    if (!selectedOrderId) return;
    if (!cancelReason.trim()) {
      toast.error('Ingresa un motivo de cancelación');
      return;
    }
    try {
      await ordersService.cancel(selectedOrderId, cancelReason);
      toast.success('Orden cancelada');
      setShowCancelDialog(false);
      setCancelReason('');
      setSelectedOrderId(null);
      setSelectedOrder(null);
      setPendingItems([]);
      await loadActiveOrders();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cancelar orden');
    }
  };

  // ─── Calculations ─────────────────────────────────────────────────────

  const orderDetalles = selectedOrder?.detalles || [];
  const existingSubtotal = orderDetalles.reduce(
    (sum, d) => sum + Number(d.precioUnitario) * d.cantidad,
    0
  );
  const pendingSubtotal = pendingItems.reduce(
    (sum, item) => sum + item.precio * item.cantidad,
    0
  );
  const combinedSubtotal = existingSubtotal + pendingSubtotal;

  const descuentoMonto =
    descuentoTipo === '%'
      ? combinedSubtotal * ((parseFloat(descuentoValor) || 0) / 100)
      : parseFloat(descuentoValor) || 0;
  const subtotalConDescuento = combinedSubtotal - descuentoMonto;
  const iva = subtotalConDescuento * 0.16;
  const total = subtotalConDescuento + iva;

  // ─── Helpers ──────────────────────────────────────────────────────────

  const getTabColor = (estado: Orden['estado']) => {
    switch (estado) {
      case 'EN_COCINA':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'LISTA':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'POR_COBRAR':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusBadge = (estado: OrdenDetalle['estado']) => {
    switch (estado) {
      case 'GUARDADO':
        return (
          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">
            <Clock size={9} /> Guardado
          </span>
        );
      case 'ENVIADO':
        return (
          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
            <Send size={9} /> Enviado
          </span>
        );
      case 'PREPARANDO':
        return (
          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
            <ChefHat size={9} /> Preparando
          </span>
        );
      case 'LISTO':
        return (
          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
            <CheckCircle size={9} /> Listo
          </span>
        );
      case 'ENTREGADO':
        return (
          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700">
            <CheckCircle size={9} /> Entregado
          </span>
        );
      default:
        return null;
    }
  };

  const getOrderTabLabel = (order: Orden) => {
    if (order.mesa) return order.mesa.nombre;
    if (order.tipoServicio === 'PARA_LLEVAR') return 'Para llevar';
    if (order.tipoServicio === 'PLATAFORMA') return 'Plataforma';
    return `Orden`;
  };

  const hasGuardadoItems =
    selectedOrder?.detalles.some((d) => d.estado === 'GUARDADO') || false;

  // ─── Render ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* ═══ Left: Product catalog ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search bar */}
        <div className="p-3 bg-white border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 p-3 overflow-x-auto bg-white border-b flex-shrink-0">
          <button
            onClick={() => setSelectedCategory(null)}
            className={selectedCategory === null ? 'category-tab-active' : 'category-tab-inactive'}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={
                selectedCategory === cat.id ? 'category-tab-active' : 'category-tab-inactive'
              }
            >
              {cat.nombre}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addItem(product)}
                className="product-tile text-left"
              >
                {product.imagen ? (
                  <img
                    src={product.imagen}
                    alt={product.nombre}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center">
                    <span className="text-xl">🦐</span>
                  </div>
                )}
                <span className="text-sm font-medium text-center line-clamp-2">
                  {product.nombre}
                </span>
                <span className="text-sm font-bold text-manu-teal">
                  ${Number(product.precio).toFixed(2)}
                </span>
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center text-gray-400 mt-10">
              No se encontraron productos
            </div>
          )}
        </div>
      </div>

      {/* ═══ Right: Order Panel ═══ */}
      <div className="w-80 lg:w-96 bg-white border-l flex flex-col">
        {/* ── Active Orders Tabs ── */}
        <div className="p-2 border-b bg-gray-50">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {activeOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => selectOrder(order.id)}
                className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  selectedOrderId === order.id
                    ? `${getTabColor(order.estado)} ring-2 ring-offset-1 ring-manu-teal`
                    : `${getTabColor(order.estado)} opacity-70 hover:opacity-100`
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>{getOrderTabLabel(order)}</span>
                  <span className="text-[10px] opacity-70">#{order.numeroOrden}</span>
                </div>
              </button>
            ))}

            {/* New order config tab (when configuring) */}
            {newOrderConfig && (
              <button
                className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-teal-400 bg-teal-50 text-teal-700 ring-2 ring-offset-1 ring-manu-teal"
              >
                <div className="flex items-center gap-1">
                  <Plus size={12} />
                  <span>
                    {newOrderConfig.tipoServicio === 'MESA'
                      ? mesas.find((m) => m.id === newOrderConfig.mesaId)?.nombre || 'Mesa'
                      : newOrderConfig.tipoServicio === 'PARA_LLEVAR'
                      ? 'Para llevar'
                      : 'Plataforma'}
                  </span>
                  <span className="text-[10px] opacity-70">Nueva</span>
                </div>
              </button>
            )}

            {/* "+" button */}
            <button
              onClick={startNewOrder}
              className="flex-shrink-0 w-8 h-8 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-manu-teal hover:border-manu-teal transition-colors"
              title="Nueva orden"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* ── Order Items Area ── */}
        <div className="flex-1 overflow-y-auto p-3">
          {!selectedOrderId && !newOrderConfig ? (
            /* No order selected */
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ShoppingCart size={48} className="mb-2" />
              <p className="text-sm">Selecciona o crea una orden</p>
              <button
                onClick={startNewOrder}
                className="mt-3 btn-primary text-sm px-4 py-2"
              >
                <Plus size={14} className="inline mr-1" /> Nueva Orden
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Order info header */}
              {selectedOrder && (
                <div className="p-2 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-800">
                      Orden #{selectedOrder.numeroOrden}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getTabColor(
                        selectedOrder.estado
                      )}`}
                    >
                      {selectedOrder.estado.replace('_', ' ')}
                    </span>
                  </div>
                  {selectedOrder.mesa && (
                    <div className="flex items-center gap-1">
                      <span>{selectedOrder.mesa.nombre}</span>
                      <span className="text-gray-400">|</span>
                      <Users size={10} />
                      <span>{selectedOrder.comensales} comensales</span>
                    </div>
                  )}
                  {selectedOrder.clienteNombre && (
                    <div>Cliente: {selectedOrder.clienteNombre}</div>
                  )}
                </div>
              )}

              {newOrderConfig && !selectedOrder && (
                <div className="p-2 bg-teal-50 rounded-lg text-xs text-teal-700 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Nueva Orden</span>
                    <button
                      onClick={() => {
                        setNewOrderConfig(null);
                        setPendingItems([]);
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div>
                    {newOrderConfig.tipoServicio === 'MESA'
                      ? `Mesa: ${mesas.find((m) => m.id === newOrderConfig.mesaId)?.nombre || ''}`
                      : newOrderConfig.tipoServicio === 'PARA_LLEVAR'
                      ? 'Para llevar'
                      : 'Plataforma'}
                    {' | '}
                    <Users size={10} className="inline" /> {newOrderConfig.comensales} comensales
                  </div>
                  {newOrderConfig.clienteNombre && (
                    <div>Cliente: {newOrderConfig.clienteNombre}</div>
                  )}
                </div>
              )}

              {/* Existing order items (from API) */}
              {orderDetalles.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    Items de la orden
                  </h4>
                  <div className="space-y-1.5">
                    {orderDetalles.map((detalle) => (
                      <div key={detalle.id} className="p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-gray-300 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {detalle.comensal}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {detalle.nombreProducto}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                ${Number(detalle.precioUnitario).toFixed(2)} x{detalle.cantidad}
                              </span>
                              {getStatusBadge(detalle.estado)}
                            </div>
                            {detalle.notas && (
                              <p className="text-xs text-amber-600 italic mt-0.5 flex items-center gap-1">
                                <MessageSquare size={10} />
                                {detalle.notas}
                              </p>
                            )}
                          </div>
                          <p className="w-16 text-right text-sm font-semibold">
                            ${(Number(detalle.precioUnitario) * detalle.cantidad).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending (unsaved) items */}
              {pendingItems.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-amber-600 uppercase mb-1 flex items-center gap-1">
                    <Clock size={11} /> Pendientes de guardar
                  </h4>
                  <div className="space-y-1.5">
                    {pendingItems.map((item, index) => (
                      <div
                        key={`pending-${index}`}
                        className="p-2 bg-amber-50 rounded-lg border border-amber-200"
                      >
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setEditingComensalIndex(
                                editingComensalIndex === index ? null : index
                              )
                            }
                            className="w-5 h-5 rounded-full bg-manu-teal text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                            title="Comensal"
                          >
                            {item.comensal}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm font-medium truncate cursor-pointer hover:text-manu-teal"
                              onClick={() =>
                                setEditingNotesIndex(
                                  editingNotesIndex === index ? null : index
                                )
                              }
                              title="Clic para agregar notas"
                            >
                              {item.nombre}
                            </p>
                            <p className="text-xs text-gray-500">
                              ${item.precio.toFixed(2)} c/u
                            </p>
                            {item.notas && editingNotesIndex !== index && (
                              <p className="text-xs text-amber-600 italic mt-0.5 flex items-center gap-1">
                                <MessageSquare size={10} />
                                {item.notas}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updatePendingQuantity(index, -1)}
                              className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center active:bg-gray-300"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-6 text-center text-sm font-bold">
                              {item.cantidad}
                            </span>
                            <button
                              onClick={() => updatePendingQuantity(index, 1)}
                              className="w-7 h-7 rounded-full bg-manu-teal text-white flex items-center justify-center active:bg-teal-700"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <p className="w-14 text-right text-sm font-semibold">
                            ${(item.precio * item.cantidad).toFixed(2)}
                          </p>
                          <button
                            onClick={() => removePendingItem(index)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Comensal selector */}
                        {editingComensalIndex === index && (
                          <div className="flex gap-1 mt-2 pl-7">
                            {[1, 2, 3, 4, 5, 6].map((num) => (
                              <button
                                key={num}
                                onClick={() => updatePendingComensal(index, num)}
                                className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors ${
                                  item.comensal === num
                                    ? 'bg-manu-teal text-white'
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Notes input */}
                        {editingNotesIndex === index && (
                          <div className="mt-2 pl-7">
                            <input
                              type="text"
                              placeholder="Notas del producto..."
                              value={item.notas || ''}
                              onChange={(e) => updatePendingNotes(index, e.target.value)}
                              onBlur={() => setEditingNotesIndex(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') setEditingNotesIndex(null);
                              }}
                              autoFocus
                              className="input text-xs py-1 px-2"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state when order selected but no items anywhere */}
              {orderDetalles.length === 0 && pendingItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <ShoppingCart size={36} className="mb-2" />
                  <p className="text-sm">Agrega productos al pedido</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Totals & Action Buttons ── */}
        {(selectedOrderId || newOrderConfig) && (
          <div className="border-t p-3 space-y-2">
            {/* Discount section */}
            {hasPermission('DESCUENTOS_APLICAR') && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDescuentoTipo(descuentoTipo === '%' ? '$' : '%')}
                  className="btn-secondary px-2 py-1 text-xs font-bold flex items-center gap-1 flex-shrink-0"
                >
                  {descuentoTipo === '%' ? <Percent size={12} /> : '$'}
                  {descuentoTipo}
                </button>
                <input
                  type="number"
                  placeholder="Descuento"
                  value={descuentoValor}
                  onChange={(e) => setDescuentoValor(e.target.value)}
                  min="0"
                  className="input text-sm py-1 flex-1"
                />
                {descuentoValor && (
                  <button
                    onClick={() => setDescuentoValor('')}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>${combinedSubtotal.toFixed(2)}</span>
            </div>
            {descuentoMonto > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Descuento {descuentoTipo === '%' ? `(${descuentoValor}%)` : ''}</span>
                <span>-${descuentoMonto.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>IVA (16%)</span>
              <span>${iva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-800 border-t pt-2">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              {/* Guardar */}
              <button
                onClick={handleSave}
                disabled={pendingItems.length === 0 || savingOrder}
                className="btn-secondary text-sm py-2 flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <Save size={14} />
                {savingOrder ? 'Guardando...' : 'Guardar'}
              </button>

              {/* Enviar a Cocina */}
              <button
                onClick={handleSendToKitchen}
                disabled={!selectedOrderId || (!hasGuardadoItems && pendingItems.length === 0)}
                className="text-sm py-2 flex items-center justify-center gap-1 rounded-lg font-medium transition-colors disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300"
              >
                <Send size={14} />
                Enviar Cocina
              </button>

              {/* Cobrar */}
              <button
                onClick={handleCobrar}
                disabled={!selectedOrderId || !selectedOrder}
                className="btn-primary text-sm py-2 flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <DollarSign size={14} />
                Cobrar
              </button>

              {/* Cancelar */}
              <button
                onClick={() => setShowCancelDialog(true)}
                disabled={!selectedOrderId}
                className="text-sm py-2 flex items-center justify-center gap-1 rounded-lg font-medium transition-colors disabled:opacity-50 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
              >
                <XCircle size={14} />
                Cancelar
              </button>
            </div>

            {!cajaId && (
              <p className="text-xs text-red-500 text-center">
                Caja no abierta. Ve a Caja para abrir turno.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ═══ New Order Modal ═══ */}
      {newOrderMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Nueva Orden</h3>
              <button
                onClick={() => setNewOrderMode(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Tipo de servicio */}
              <div>
                <label className="label">Tipo de servicio</label>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                  {(['MESA', 'PARA_LLEVAR', 'PLATAFORMA'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setModalTipoServicio(type)}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors ${
                        modalTipoServicio === type
                          ? 'bg-white shadow text-gray-800'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {type === 'MESA' ? 'Mesa' : type === 'PARA_LLEVAR' ? 'Para llevar' : 'Plataforma'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mesa selector */}
              {modalTipoServicio === 'MESA' && (
                <div>
                  <label className="label">Mesa</label>
                  {mesas.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      No hay mesas disponibles
                    </p>
                  ) : (
                    <select
                      value={modalMesaId}
                      onChange={(e) => setModalMesaId(e.target.value)}
                      className="input"
                    >
                      <option value="">Selecciona una mesa...</option>
                      {mesas.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre} - {m.zona} (cap. {m.capacidad})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Comensales */}
              <div>
                <label className="label">Comensales</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={modalComensales}
                  onChange={(e) => setModalComensales(parseInt(e.target.value) || 1)}
                  className="input"
                />
              </div>

              {/* Cliente nombre */}
              <div>
                <label className="label">Nombre del cliente (opcional)</label>
                <input
                  type="text"
                  placeholder="Nombre..."
                  value={modalClienteNombre}
                  onChange={(e) => setModalClienteNombre(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t">
              <button
                onClick={() => setNewOrderMode(false)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={confirmNewOrderConfig}
                className="btn-primary flex-1"
              >
                Crear Orden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Cancel Confirmation Dialog ═══ */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-red-600">Cancelar Orden</h3>
              <button
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancelReason('');
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600">
                Esta accion no se puede deshacer. Ingresa el motivo de cancelacion:
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Motivo de cancelacion..."
                rows={3}
                className="input resize-none"
              />
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancelReason('');
                }}
                className="btn-secondary flex-1"
              >
                Volver
              </button>
              <button
                onClick={handleCancelOrder}
                className="flex-1 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Confirmar Cancelacion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Payment Modal ═══ */}
      {showPayment && selectedOrder && (
        <PaymentModal
          total={total}
          subtotal={combinedSubtotal - descuentoMonto}
          iva={iva}
          descuento={descuentoMonto}
          orderItems={selectedOrder.detalles.map((d) => ({
            productoId: d.productoId,
            nombre: d.nombreProducto,
            precio: Number(d.precioUnitario),
            cantidad: d.cantidad,
            comensal: d.comensal,
            tipoOrden: d.destino as 'COCINA' | 'BARRA',
          }))}
          orderType={selectedOrder.tipoServicio as 'MESA' | 'PARA_LLEVAR' | 'PLATAFORMA'}
          mesa={selectedOrder.mesa?.nombre || ''}
          ordenId={selectedOrder.id}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false);
            setSelectedOrderId(null);
            setSelectedOrder(null);
            setPendingItems([]);
            setDescuentoValor('');
            loadActiveOrders();
            toast.success('Orden cobrada exitosamente');
          }}
        />
      )}
    </div>
  );
}
