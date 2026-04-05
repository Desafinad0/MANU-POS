import { useState, useEffect, useMemo } from 'react';
import { BookOpen, Plus, Edit2, Trash2, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { recipesService, Recipe, CreateRecipeInput } from '../../services/recipes.service';
import { inventoryService, Supply } from '../../services/inventory.service';
import api from '../../config/api';

interface IngredientRow {
  insumoId: string;
  cantidad: number;
  merma: number; // stored as 0-1 decimal
}

const emptyRow = (): IngredientRow => ({ insumoId: '', cantidad: 0, merma: 0 });

export default function RecipesPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [editing, setEditing] = useState(false);
  const [rendimiento, setRendimiento] = useState(1);
  const [notas, setNotas] = useState('');
  const [ingredients, setIngredients] = useState<IngredientRow[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prodsRes, suppliesRes] = await Promise.all([
        api.get('/productos', { params: { limit: 100 } }),
        inventoryService.getSupplies({ limit: 200 }),
      ]);
      setProducts(prodsRes.data.data || []);
      setSupplies(suppliesRes.data || []);
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadRecipe = async (productoId: string) => {
    try {
      const data = await recipesService.getByProduct(productoId);
      setRecipe(data);
    } catch {
      setRecipe(null);
    }
  };

  const selectProduct = (product: any) => {
    setSelectedProduct(product);
    setEditing(false);
    loadRecipe(product.id);
  };

  // --- Supply lookup map ---
  const supplyMap = useMemo(() => {
    const map = new Map<string, Supply>();
    supplies.forEach((s) => map.set(s.id, s));
    return map;
  }, [supplies]);

  // --- Estimated cost ---
  const estimatedCost = useMemo(() => {
    return ingredients.reduce((sum, row) => {
      const supply = supplyMap.get(row.insumoId);
      if (!supply || !row.cantidad) return sum;
      return sum + row.cantidad * supply.costoPromedio * (1 + row.merma);
    }, 0);
  }, [ingredients, supplyMap]);

  // --- Form helpers ---
  const openCreateForm = () => {
    setRendimiento(1);
    setNotas('');
    setIngredients([emptyRow()]);
    setEditing(true);
  };

  const openEditForm = () => {
    if (!recipe) return;
    setRendimiento(recipe.rendimiento);
    setNotas(recipe.notas || '');
    setIngredients(
      recipe.detalles.map((d) => ({
        insumoId: d.insumoId,
        cantidad: d.cantidad,
        merma: d.merma,
      }))
    );
    setEditing(true);
  };

  const cancelForm = () => {
    setEditing(false);
  };

  const updateIngredient = (index: number, field: keyof IngredientRow, value: string | number) => {
    setIngredients((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const addIngredient = () => {
    setIngredients((prev) => [...prev, emptyRow()]);
  };

  // --- Actions ---
  const handleSave = async () => {
    if (!selectedProduct) return;

    const validIngredients = ingredients.filter((r) => r.insumoId && r.cantidad > 0);
    if (validIngredients.length === 0) {
      toast.error('Agrega al menos un ingrediente');
      return;
    }

    const payload: CreateRecipeInput = {
      productoId: selectedProduct.id,
      rendimiento,
      notas: notas || undefined,
      detalles: validIngredients.map((r) => ({
        insumoId: r.insumoId,
        cantidad: r.cantidad,
        merma: r.merma || undefined,
      })),
    };

    setSaving(true);
    try {
      const saved = await recipesService.createOrUpdate(payload);
      setRecipe(saved);
      setEditing(false);
      toast.success(recipe ? 'Receta actualizada' : 'Receta creada');
    } catch {
      toast.error('Error al guardar la receta');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!recipe) return;
    if (!window.confirm('¿Eliminar esta receta? Esta acción no se puede deshacer.')) return;

    try {
      await recipesService.delete(recipe.id);
      setRecipe(null);
      setEditing(false);
      toast.success('Receta eliminada');
    } catch {
      toast.error('Error al eliminar la receta');
    }
  };

  const handleRecalculateCost = async () => {
    if (!recipe) return;
    try {
      const updated = await recipesService.calculateCost(recipe.id);
      setRecipe(updated);
      toast.success('Costo recalculado');
    } catch {
      toast.error('Error al recalcular costo');
    }
  };

  if (loading) return <p className="p-4 text-gray-500">Cargando...</p>;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Recetas</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Product list */}
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Selecciona un producto</h2>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProduct(p)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedProduct?.id === p.id
                    ? 'bg-teal-50 text-manu-teal border border-manu-teal'
                    : 'hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">{p.nombre}</span>
                <span className="text-gray-400 ml-2">${Number(p.precio).toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recipe detail / form */}
        <div className="card p-4">
          {!selectedProduct ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <BookOpen size={48} className="mb-2" />
              <p>Selecciona un producto para ver su receta</p>
            </div>
          ) : editing ? (
            /* ---- Recipe Form ---- */
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">
                  {recipe ? 'Editar Receta' : 'Crear Receta'} &mdash; {selectedProduct.nombre}
                </h2>
                <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              {/* Rendimiento & Notas */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rendimiento</label>
                  <input
                    type="number"
                    min={0.01}
                    step="any"
                    value={rendimiento}
                    onChange={(e) => setRendimiento(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-manu-teal focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <input
                    type="text"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Opcional"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-manu-teal focus:border-transparent"
                  />
                </div>
              </div>

              {/* Ingredients */}
              <h3 className="text-sm font-medium text-gray-700 mb-2">Ingredientes</h3>
              <div className="space-y-2 mb-3 max-h-[40vh] overflow-y-auto">
                {ingredients.map((row, idx) => {
                  const selectedSupply = supplyMap.get(row.insumoId);
                  return (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <select
                        value={row.insumoId}
                        onChange={(e) => updateIngredient(idx, 'insumoId', e.target.value)}
                        className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-manu-teal focus:border-transparent"
                      >
                        <option value="">Seleccionar insumo</option>
                        {supplies.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nombre} ({s.unidadMedida})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={row.cantidad || ''}
                        onChange={(e) => updateIngredient(idx, 'cantidad', Number(e.target.value))}
                        placeholder="Cant."
                        title="Cantidad"
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-manu-teal focus:border-transparent"
                      />
                      {selectedSupply && (
                        <span className="text-xs text-gray-400 w-8">{selectedSupply.unidadMedida}</span>
                      )}
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="any"
                        value={row.merma ? Number((row.merma * 100).toFixed(2)) : ''}
                        onChange={(e) => updateIngredient(idx, 'merma', Number(e.target.value) / 100)}
                        placeholder="%"
                        title="Merma %"
                        className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-manu-teal focus:border-transparent"
                      />
                      <span className="text-xs text-gray-400 w-4">%</span>
                      <button
                        onClick={() => removeIngredient(idx)}
                        className="text-red-400 hover:text-red-600 p-1"
                        title="Eliminar ingrediente"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={addIngredient}
                className="flex items-center gap-1 text-sm text-manu-teal hover:underline mb-4"
              >
                <Plus size={16} /> Agregar Ingrediente
              </button>

              {/* Estimated cost */}
              <div className="bg-teal-50 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-gray-700">
                  Costo estimado: <span className="text-manu-teal font-semibold">${estimatedCost.toFixed(2)}</span>
                </p>
              </div>

              {/* Save / Cancel */}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-manu-teal text-white rounded-lg py-2 text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Guardando...' : 'Guardar Receta'}
                </button>
                <button
                  onClick={cancelForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            /* ---- Read-only view ---- */
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-semibold">{selectedProduct.nombre}</h2>
                <div className="flex gap-2">
                  {recipe ? (
                    <>
                      <button
                        onClick={openEditForm}
                        className="flex items-center gap-1 text-sm text-manu-teal hover:underline"
                      >
                        <Edit2 size={14} /> Editar
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-1 text-sm text-red-500 hover:underline"
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={openCreateForm}
                      className="flex items-center gap-1 text-sm bg-manu-teal text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      <Plus size={14} /> Crear Receta
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Costo calculado:{' '}
                {recipe
                  ? `$${Number(recipe.costoCalculado).toFixed(2)}`
                  : 'Sin receta'}
              </p>

              {recipe ? (
                <div>
                  {recipe.rendimiento !== 1 && (
                    <p className="text-sm text-gray-600 mb-2">
                      Rendimiento: <span className="font-medium">{recipe.rendimiento}</span>
                    </p>
                  )}

                  <h3 className="text-sm font-medium text-gray-600 mb-2">Ingredientes:</h3>
                  <div className="space-y-2">
                    {recipe.detalles?.map((d, i) => (
                      <div key={d.id || i} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-sm">
                        <span>{d.insumo?.nombre}</span>
                        <span className="text-gray-500">
                          {Number(d.cantidad)} {d.insumo?.unidadMedida}
                          {Number(d.merma) > 0 && ` (+${(Number(d.merma) * 100).toFixed(0)}% merma)`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {recipe.notas && (
                    <p className="text-sm text-gray-500 mt-3 italic">{recipe.notas}</p>
                  )}

                  {/* Recalculate cost */}
                  <button
                    onClick={handleRecalculateCost}
                    className="flex items-center gap-1 mt-4 text-sm text-manu-teal hover:underline"
                  >
                    <RefreshCw size={14} /> Recalcular Costo
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Este producto no tiene receta asignada.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
