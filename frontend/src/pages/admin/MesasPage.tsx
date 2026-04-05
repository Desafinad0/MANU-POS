import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Table2 } from 'lucide-react';
import { tablesService, type Mesa } from '../../services/tables.service';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const ZONAS = ['INTERIOR', 'TERRAZA', 'BARRA', 'PRIVADO'] as const;

const emptyForm = {
  nombre: '',
  zona: 'INTERIOR' as string,
  capacidad: 4,
  orden: 0,
};

const estadoBadge: Record<string, string> = {
  DISPONIBLE: 'bg-green-100 text-green-700',
  OCUPADA: 'bg-red-100 text-red-700',
  RESERVADA: 'bg-yellow-100 text-yellow-700',
};

export default function MesasPage() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterZona, setFilterZona] = useState('');

  // Create modal
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  // Edit modal
  const [editMesa, setEditMesa] = useState<Mesa | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [filterZona]);

  const loadData = async () => {
    try {
      const params: Record<string, string> = {};
      if (filterZona) params.zona = filterZona;
      const data = await tablesService.getAll(params);
      setMesas(data || []);
    } catch {
      toast.error('Error al cargar mesas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await tablesService.create({
        nombre: form.nombre,
        zona: form.zona,
        capacidad: form.capacidad,
        orden: form.orden,
      });
      toast.success('Mesa creada');
      setShowForm(false);
      setForm({ ...emptyForm });
      loadData();
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.errors) {
        const msgs = Object.entries(data.errors)
          .map(([field, errs]: [string, any]) => `${field}: ${errs.join(', ')}`)
          .join('\n');
        toast.error(msgs, { duration: 5000 });
      } else {
        toast.error(data?.message || 'Error al crear mesa');
      }
    }
  };

  const openEditModal = (mesa: Mesa) => {
    setEditMesa(mesa);
    setEditForm({
      nombre: mesa.nombre || '',
      zona: mesa.zona || 'INTERIOR',
      capacidad: mesa.capacidad ?? 4,
      orden: mesa.orden ?? 0,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMesa) return;
    try {
      await tablesService.update(editMesa.id, {
        nombre: editForm.nombre,
        zona: editForm.zona,
        capacidad: editForm.capacidad,
        orden: editForm.orden,
      });
      toast.success('Mesa actualizada');
      setShowEditModal(false);
      setEditMesa(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar');
    }
  };

  const handleDelete = async (mesa: Mesa) => {
    if (!confirm(`¿Eliminar mesa "${mesa.nombre}"?`)) return;
    try {
      await tablesService.remove(mesa.id);
      toast.success('Mesa eliminada');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar');
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Mesas</h1>
        <div className="flex items-center gap-3">
          <select
            value={filterZona}
            onChange={(e) => setFilterZona(e.target.value)}
            className="input"
          >
            <option value="">Todas las zonas</option>
            {ZONAS.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            <Plus size={18} /> Nueva
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="label">Nombre</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="input"
              placeholder="Mesa 1"
              required
            />
          </div>
          <div>
            <label className="label">Zona</label>
            <select
              value={form.zona}
              onChange={(e) => setForm({ ...form, zona: e.target.value })}
              className="input"
            >
              {ZONAS.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Capacidad</label>
            <input
              type="number"
              value={form.capacidad}
              onChange={(e) => setForm({ ...form, capacidad: Number(e.target.value) })}
              className="input"
              min={1}
              required
            />
          </div>
          <div>
            <label className="label">Orden</label>
            <input
              type="number"
              value={form.orden}
              onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })}
              className="input"
              min={0}
            />
          </div>
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="btn-primary">Crear</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : mesas.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Table2 size={48} className="mx-auto mb-2" />
          <p>No hay mesas.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nombre</th>
                <th className="px-4 py-3 text-left font-medium">Zona</th>
                <th className="px-4 py-3 text-left font-medium">Capacidad</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-left font-medium">Orden</th>
                <th className="px-4 py-3 text-left font-medium">Activo</th>
                <th className="px-4 py-3 text-left font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mesas.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-medium">{m.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{m.zona}</td>
                  <td className="px-4 py-3 text-gray-500">{m.capacidad}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${estadoBadge[m.estado] || 'bg-gray-100 text-gray-500'}`}>
                      {m.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{m.orden}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {m.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(m)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-manu-teal transition-colors"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(m)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Mesa Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Mesa" size="md">
        <form onSubmit={handleEditSubmit} className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Nombre</label>
            <input
              value={editForm.nombre}
              onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
              className="input"
              placeholder="Mesa 1"
              required
            />
          </div>
          <div>
            <label className="label">Zona</label>
            <select
              value={editForm.zona}
              onChange={(e) => setEditForm({ ...editForm, zona: e.target.value })}
              className="input"
            >
              {ZONAS.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Capacidad</label>
            <input
              type="number"
              value={editForm.capacidad}
              onChange={(e) => setEditForm({ ...editForm, capacidad: Number(e.target.value) })}
              className="input"
              min={1}
              required
            />
          </div>
          <div>
            <label className="label">Orden</label>
            <input
              type="number"
              value={editForm.orden}
              onChange={(e) => setEditForm({ ...editForm, orden: Number(e.target.value) })}
              className="input"
              min={0}
            />
          </div>
          <div className="col-span-2 flex gap-2 pt-2">
            <button type="submit" className="btn-primary">Guardar</button>
            <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
