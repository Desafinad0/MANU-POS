import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FolderOpen } from 'lucide-react';
import { catalogService, type Category } from '../../services/catalog.service';
import toast from 'react-hot-toast';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await catalogService.getCategories();
      setCategories(data || []);
    } catch {
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await catalogService.updateCategory(editingId, form);
        toast.success('Categoría actualizada');
      } else {
        await catalogService.createCategory(form);
        toast.success('Categoría creada');
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ nombre: '', descripcion: '' });
      loadCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ nombre: cat.nombre, descripcion: cat.descripcion || '' });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    try {
      await catalogService.deleteCategory(id);
      toast.success('Categoría eliminada');
      loadCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Categorías</h1>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ nombre: '', descripcion: '' }); }} className="btn-primary">
          <Plus size={18} /> Nueva
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 mb-4 space-y-3">
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="input"
            placeholder="Nombre de la categoría"
            required
            autoFocus
          />
          <input
            type="text"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            className="input"
            placeholder="Descripción (opcional)"
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">{editingId ? 'Actualizar' : 'Crear'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FolderOpen size={48} className="mx-auto mb-2" />
          <p>No hay categorías. Crea la primera.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium">{cat.nombre}</p>
                {cat.descripcion && <p className="text-sm text-gray-500">{cat.descripcion}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(cat)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <Edit2 size={16} className="text-gray-500" />
                </button>
                <button onClick={() => handleDelete(cat.id)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <Trash2 size={16} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
