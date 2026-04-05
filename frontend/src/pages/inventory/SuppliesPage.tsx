import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Package2 } from 'lucide-react';
import { inventoryService } from '../../services/inventory.service';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

const emptyForm = { nombre: '', sku: '', unidadMedida: 'KG', nivelMinimo: '', nivelMaximo: '', perecedero: false };

export default function SuppliesPage() {
  const [supplies, setSupplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ ...emptyForm });

  // Edit modal state
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({ ...emptyForm });
  const [editId, setEditId] = useState<string | null>(null);

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadSupplies(); }, [search]);

  const loadSupplies = async () => {
    try {
      const res = await inventoryService.getSupplies({ search: search || undefined, limit: 50 });
      setSupplies(res.data || []);
    } catch { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inventoryService.createSupply({
        ...form,
        nivelMinimo: parseFloat(form.nivelMinimo) || 0,
        nivelMaximo: parseFloat(form.nivelMaximo) || 0,
      });
      toast.success('Insumo creado');
      setShowForm(false);
      setForm({ ...emptyForm });
      loadSupplies();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const openEdit = (supply: any) => {
    setEditId(supply.id);
    setEditForm({
      nombre: supply.nombre,
      sku: supply.sku || '',
      unidadMedida: supply.unidadMedida,
      nivelMinimo: String(supply.nivelMinimo ?? ''),
      nivelMaximo: String(supply.nivelMaximo ?? ''),
      perecedero: supply.perecedero ?? false,
    });
    setEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    try {
      await inventoryService.updateSupply(editId, {
        ...editForm,
        nivelMinimo: parseFloat(editForm.nivelMinimo) || 0,
        nivelMaximo: parseFloat(editForm.nivelMaximo) || 0,
      });
      toast.success('Insumo actualizado');
      setEditModal(false);
      setEditId(null);
      loadSupplies();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error al actualizar'); }
  };

  const openDelete = (id: string) => {
    setDeleteId(id);
    setDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await inventoryService.deleteSupply(deleteId);
      toast.success('Insumo eliminado');
      setDeleteDialog(false);
      setDeleteId(null);
      loadSupplies();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error al eliminar'); }
    finally { setDeleting(false); }
  };

  const renderFormFields = (f: any, setF: (v: any) => void) => (
    <>
      <input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} className="input" placeholder="Nombre" required />
      <input value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} className="input" placeholder="SKU" required />
      <select value={f.unidadMedida} onChange={(e) => setF({ ...f, unidadMedida: e.target.value })} className="input">
        {['KG', 'GR', 'LT', 'ML', 'PZA'].map((u) => <option key={u} value={u}>{u}</option>)}
      </select>
      <input value={f.nivelMinimo} onChange={(e) => setF({ ...f, nivelMinimo: e.target.value })} className="input" placeholder="Nivel mínimo" type="number" step="0.01" />
      <input value={f.nivelMaximo} onChange={(e) => setF({ ...f, nivelMaximo: e.target.value })} className="input" placeholder="Nivel máximo" type="number" step="0.01" />
      <label className="flex items-center gap-2 px-4">
        <input type="checkbox" checked={f.perecedero} onChange={(e) => setF({ ...f, perecedero: e.target.checked })} />
        <span className="text-sm">Perecedero</span>
      </label>
    </>
  );

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Insumos</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary"><Plus size={18} /> Nuevo</button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" placeholder="Buscar insumo..." />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 mb-4 grid grid-cols-2 gap-3">
          {renderFormFields(form, setForm)}
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="btn-primary">Crear</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? <p className="text-gray-500">Cargando...</p> : supplies.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><Package2 size={48} className="mx-auto mb-2" /><p>No hay insumos.</p></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-3 text-left font-medium">Insumo</th>
              <th className="px-4 py-3 text-left font-medium">SKU</th>
              <th className="px-4 py-3 text-left font-medium">Unidad</th>
              <th className="px-4 py-3 text-left font-medium">Costo Prom.</th>
              <th className="px-4 py-3 text-left font-medium">Mín</th>
              <th className="px-4 py-3 text-left font-medium">Máx</th>
              <th className="px-4 py-3 text-left font-medium">Acciones</th>
            </tr></thead>
            <tbody className="divide-y">
              {supplies.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium">{s.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{s.sku}</td>
                  <td className="px-4 py-3">{s.unidadMedida}</td>
                  <td className="px-4 py-3">${Number(s.costoPromedio).toFixed(2)}</td>
                  <td className="px-4 py-3">{Number(s.nivelMinimo)}</td>
                  <td className="px-4 py-3">{Number(s.nivelMaximo)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => openDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Eliminar">
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

      {/* Edit Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Editar Insumo">
        <form onSubmit={handleEdit} className="grid grid-cols-2 gap-3">
          {renderFormFields(editForm, setEditForm)}
          <div className="col-span-2 flex gap-2 justify-end mt-2">
            <button type="button" onClick={() => setEditModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Guardar</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Eliminar Insumo"
        message="¿Estás seguro de eliminar este insumo? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
