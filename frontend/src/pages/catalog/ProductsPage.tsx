import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, EyeOff, Package, ChevronDown, ChevronRight, X } from 'lucide-react';
import { catalogService, type Product, type ProductVariant, type Category } from '../../services/catalog.service';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

const emptyForm = {
  nombre: '', sku: '', precio: '', categoriaId: '', descripcion: '', tipoOrden: 'COCINA',
};

const emptyVariantForm = { nombre: '', tipo: 'TAMAÑO', precioExtra: '' };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Edit modal
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Variants
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [variantForm, setVariantForm] = useState(emptyVariantForm);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editVariant, setEditVariant] = useState<ProductVariant | null>(null);
  const [editVariantForm, setEditVariantForm] = useState(emptyVariantForm);
  const [deleteVariantTarget, setDeleteVariantTarget] = useState<ProductVariant | null>(null);
  const [deletingVariant, setDeletingVariant] = useState(false);

  useEffect(() => {
    catalogService.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    loadProducts();
  }, [page, search, catFilter]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await catalogService.getProducts({
        page, limit: 20, search: search || undefined, categoriaId: catFilter || undefined,
      });
      setProducts(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  // --- Create ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await catalogService.createProduct({
        ...form,
        precio: parseFloat(form.precio),
      });
      toast.success('Producto creado');
      setShowForm(false);
      setForm(emptyForm);
      loadProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al crear producto');
    }
  };

  // --- Edit ---
  const openEdit = (p: Product) => {
    setEditProduct(p);
    setEditForm({
      nombre: p.nombre,
      sku: p.sku,
      precio: String(p.precio),
      categoriaId: p.categoriaId,
      descripcion: p.descripcion || '',
      tipoOrden: p.tipoOrden,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;
    try {
      await catalogService.updateProduct(editProduct.id, {
        ...editForm,
        precio: parseFloat(editForm.precio),
      });
      toast.success('Producto actualizado');
      setEditProduct(null);
      loadProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar producto');
    }
  };

  // --- Delete ---
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await catalogService.deleteProduct(deleteTarget.id);
      toast.success('Producto eliminado');
      setDeleteTarget(null);
      loadProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar producto');
    } finally {
      setDeleting(false);
    }
  };

  // --- Toggle availability ---
  const toggleAvailability = async (id: string) => {
    try {
      await catalogService.toggleAvailability(id);
      loadProducts();
    } catch {
      toast.error('Error al cambiar disponibilidad');
    }
  };

  // --- Variants ---
  const toggleVariants = async (productId: string) => {
    if (expandedProduct === productId) {
      setExpandedProduct(null);
      setVariants([]);
      setShowVariantForm(false);
      setEditVariant(null);
      return;
    }
    setExpandedProduct(productId);
    setShowVariantForm(false);
    setEditVariant(null);
    await loadVariants(productId);
  };

  const loadVariants = async (productId: string) => {
    setLoadingVariants(true);
    try {
      const product = await catalogService.getProduct(productId);
      setVariants(product.variantes || []);
    } catch {
      toast.error('Error al cargar variantes');
      setVariants([]);
    } finally {
      setLoadingVariants(false);
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedProduct) return;
    try {
      await catalogService.addVariant(expandedProduct, {
        ...variantForm,
        precioExtra: parseFloat(variantForm.precioExtra),
      });
      toast.success('Variante agregada');
      setShowVariantForm(false);
      setVariantForm(emptyVariantForm);
      await loadVariants(expandedProduct);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al agregar variante');
    }
  };

  const openEditVariant = (v: ProductVariant) => {
    setEditVariant(v);
    setEditVariantForm({
      nombre: v.nombre,
      tipo: v.tipo,
      precioExtra: String(v.precioExtra),
    });
  };

  const handleUpdateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedProduct || !editVariant) return;
    try {
      await catalogService.updateVariant(expandedProduct, editVariant.id, {
        ...editVariantForm,
        precioExtra: parseFloat(editVariantForm.precioExtra),
      });
      toast.success('Variante actualizada');
      setEditVariant(null);
      await loadVariants(expandedProduct);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar variante');
    }
  };

  const handleDeleteVariant = async () => {
    if (!expandedProduct || !deleteVariantTarget) return;
    setDeletingVariant(true);
    try {
      await catalogService.deleteVariant(expandedProduct, deleteVariantTarget.id);
      toast.success('Variante eliminada');
      setDeleteVariantTarget(null);
      await loadVariants(expandedProduct);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar variante');
    } finally {
      setDeletingVariant(false);
    }
  };

  // --- Shared form renderer ---
  const renderProductForm = (
    formData: typeof emptyForm,
    setFormData: (f: typeof emptyForm) => void,
    onSubmit: (e: React.FormEvent) => void,
    submitLabel: string,
    onCancel: () => void,
  ) => (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
      <input
        value={formData.nombre}
        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
        className="input"
        placeholder="Nombre"
        required
      />
      <input
        value={formData.sku}
        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
        className="input"
        placeholder="SKU"
        required
      />
      <input
        value={formData.precio}
        onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
        className="input"
        placeholder="Precio"
        type="number"
        step="0.01"
        required
      />
      <select
        value={formData.categoriaId}
        onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })}
        className="input"
        required
      >
        <option value="">Categoría</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
      <select
        value={formData.tipoOrden}
        onChange={(e) => setFormData({ ...formData, tipoOrden: e.target.value })}
        className="input"
      >
        <option value="COCINA">Cocina</option>
        <option value="BARRA">Barra</option>
      </select>
      <input
        value={formData.descripcion}
        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
        className="input"
        placeholder="Descripción"
      />
      <div className="col-span-2 flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        <button type="submit" className="btn-primary">{submitLabel}</button>
      </div>
    </form>
  );

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus size={18} /> Nuevo
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10"
            placeholder="Buscar..."
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
          className="input w-48"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {/* New product form */}
      {showForm && (
        <div className="card p-4 mb-4">
          {renderProductForm(form, setForm, handleSubmit, 'Crear', () => setShowForm(false))}
        </div>
      )}

      {/* Products table */}
      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Package size={48} className="mx-auto mb-2" />
          <p>No hay productos.</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium w-8"></th>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Precio</th>
                  <th className="px-4 py-3 font-medium">Costo</th>
                  <th className="px-4 py-3 font-medium">Destino</th>
                  <th className="px-4 py-3 font-medium text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((p) => (
                  <>
                    <tr key={p.id} className={!p.disponible ? 'opacity-50' : ''}>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleVariants(p.id)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="Ver variantes"
                        >
                          {expandedProduct === p.id
                            ? <ChevronDown size={16} className="text-gray-500" />
                            : <ChevronRight size={16} className="text-gray-400" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium">{p.nombre}</td>
                      <td className="px-4 py-3 text-gray-500">{p.sku}</td>
                      <td className="px-4 py-3 text-gray-500">{p.categoria?.nombre}</td>
                      <td className="px-4 py-3 font-semibold">${Number(p.precio).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-500">{p.costoCalculado ? `$${Number(p.costoCalculado).toFixed(2)}` : '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${p.tipoOrden === 'COCINA' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                          {p.tipoOrden}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => toggleAvailability(p.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title={p.disponible ? 'Deshabilitar' : 'Habilitar'}
                          >
                            {p.disponible
                              ? <Eye size={16} className="text-green-500" />
                              : <EyeOff size={16} className="text-gray-400" />}
                          </button>
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Editar"
                          >
                            <Edit2 size={16} className="text-blue-500" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(p)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Eliminar"
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Variants row */}
                    {expandedProduct === p.id && (
                      <tr key={`${p.id}-variants`}>
                        <td colSpan={8} className="bg-gray-50 px-8 py-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-700">
                              Variantes de {p.nombre}
                            </h4>
                            {!showVariantForm && (
                              <button
                                onClick={() => { setShowVariantForm(true); setEditVariant(null); }}
                                className="btn-primary text-xs py-1 px-3"
                              >
                                <Plus size={14} /> Agregar variante
                              </button>
                            )}
                          </div>

                          {loadingVariants ? (
                            <p className="text-gray-400 text-sm">Cargando variantes...</p>
                          ) : (
                            <>
                              {variants.length === 0 && !showVariantForm && (
                                <p className="text-gray-400 text-sm">Sin variantes registradas.</p>
                              )}

                              {variants.length > 0 && (
                                <table className="w-full text-sm mb-3">
                                  <thead>
                                    <tr className="text-left text-gray-500 border-b">
                                      <th className="pb-2 font-medium">Nombre</th>
                                      <th className="pb-2 font-medium">Tipo</th>
                                      <th className="pb-2 font-medium">Precio extra</th>
                                      <th className="pb-2 font-medium text-center">Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {variants.map((v) => (
                                      <tr key={v.id}>
                                        <td className="py-2">{v.nombre}</td>
                                        <td className="py-2">
                                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                            {v.tipo}
                                          </span>
                                        </td>
                                        <td className="py-2 font-medium">+${Number(v.precioExtra).toFixed(2)}</td>
                                        <td className="py-2">
                                          <div className="flex items-center justify-center gap-1">
                                            <button
                                              onClick={() => openEditVariant(v)}
                                              className="p-1 hover:bg-gray-200 rounded"
                                              title="Editar variante"
                                            >
                                              <Edit2 size={14} className="text-blue-500" />
                                            </button>
                                            <button
                                              onClick={() => setDeleteVariantTarget(v)}
                                              className="p-1 hover:bg-gray-200 rounded"
                                              title="Eliminar variante"
                                            >
                                              <Trash2 size={14} className="text-red-500" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}

                              {/* Add variant form */}
                              {showVariantForm && (
                                <form onSubmit={handleAddVariant} className="flex items-end gap-2 mt-2">
                                  <div className="flex-1">
                                    <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
                                    <input
                                      value={variantForm.nombre}
                                      onChange={(e) => setVariantForm({ ...variantForm, nombre: e.target.value })}
                                      className="input text-sm"
                                      placeholder="Ej: Grande, Extra queso"
                                      required
                                    />
                                  </div>
                                  <div className="w-36">
                                    <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                                    <select
                                      value={variantForm.tipo}
                                      onChange={(e) => setVariantForm({ ...variantForm, tipo: e.target.value })}
                                      className="input text-sm"
                                    >
                                      <option value="TAMAÑO">Tamaño</option>
                                      <option value="EXTRA">Extra</option>
                                    </select>
                                  </div>
                                  <div className="w-28">
                                    <label className="text-xs text-gray-500 mb-1 block">Precio extra</label>
                                    <input
                                      value={variantForm.precioExtra}
                                      onChange={(e) => setVariantForm({ ...variantForm, precioExtra: e.target.value })}
                                      className="input text-sm"
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      required
                                    />
                                  </div>
                                  <button type="submit" className="btn-primary text-sm py-2 px-3">Agregar</button>
                                  <button
                                    type="button"
                                    onClick={() => { setShowVariantForm(false); setVariantForm(emptyVariantForm); }}
                                    className="p-2 hover:bg-gray-200 rounded"
                                  >
                                    <X size={16} className="text-gray-500" />
                                  </button>
                                </form>
                              )}

                              {/* Edit variant inline form */}
                              {editVariant && (
                                <form onSubmit={handleUpdateVariant} className="flex items-end gap-2 mt-2 bg-blue-50 p-3 rounded-lg">
                                  <div className="flex-1">
                                    <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
                                    <input
                                      value={editVariantForm.nombre}
                                      onChange={(e) => setEditVariantForm({ ...editVariantForm, nombre: e.target.value })}
                                      className="input text-sm"
                                      required
                                    />
                                  </div>
                                  <div className="w-36">
                                    <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                                    <select
                                      value={editVariantForm.tipo}
                                      onChange={(e) => setEditVariantForm({ ...editVariantForm, tipo: e.target.value })}
                                      className="input text-sm"
                                    >
                                      <option value="TAMAÑO">Tamaño</option>
                                      <option value="EXTRA">Extra</option>
                                    </select>
                                  </div>
                                  <div className="w-28">
                                    <label className="text-xs text-gray-500 mb-1 block">Precio extra</label>
                                    <input
                                      value={editVariantForm.precioExtra}
                                      onChange={(e) => setEditVariantForm({ ...editVariantForm, precioExtra: e.target.value })}
                                      className="input text-sm"
                                      type="number"
                                      step="0.01"
                                      required
                                    />
                                  </div>
                                  <button type="submit" className="btn-primary text-sm py-2 px-3">Guardar</button>
                                  <button
                                    type="button"
                                    onClick={() => setEditVariant(null)}
                                    className="p-2 hover:bg-gray-200 rounded"
                                  >
                                    <X size={16} className="text-gray-500" />
                                  </button>
                                </form>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
            <span>{total} productos</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-secondary text-sm py-1 px-3">Anterior</button>
              <span className="py-1 px-3">Página {page}</span>
              <button onClick={() => setPage(page + 1)} disabled={products.length < 20} className="btn-secondary text-sm py-1 px-3">Siguiente</button>
            </div>
          </div>
        </>
      )}

      {/* Edit product modal */}
      <Modal isOpen={!!editProduct} onClose={() => setEditProduct(null)} title="Editar producto" size="lg">
        {renderProductForm(editForm, setEditForm, handleUpdate, 'Guardar cambios', () => setEditProduct(null))}
      </Modal>

      {/* Delete product confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar producto"
        message={`¿Estás seguro de eliminar "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
        loading={deleting}
      />

      {/* Delete variant confirm */}
      <ConfirmDialog
        isOpen={!!deleteVariantTarget}
        onClose={() => setDeleteVariantTarget(null)}
        onConfirm={handleDeleteVariant}
        title="Eliminar variante"
        message={`¿Estás seguro de eliminar la variante "${deleteVariantTarget?.nombre}"?`}
        confirmText="Eliminar"
        variant="danger"
        loading={deletingVariant}
      />
    </div>
  );
}
