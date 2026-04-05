import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Truck } from 'lucide-react';
import { inventoryService, type Supplier } from '../../services/inventory.service';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

const emptyForm = { nombre: '', contacto: '', telefono: '', email: '', direccion: '', notas: '' };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { loadSuppliers(); }, []);

  const loadSuppliers = async () => {
    try {
      const res = await inventoryService.getSuppliers({ limit: 200, search: search || undefined });
      setSuppliers(res.data || []);
    } catch { toast.error('Error al cargar proveedores'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const timeout = setTimeout(() => loadSuppliers(), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      nombre: s.nombre,
      contacto: s.contacto || '',
      telefono: s.telefono || '',
      email: s.email || '',
      direccion: s.direccion || '',
      notas: s.notas || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { ...form, email: form.email || undefined };
      if (editing) {
        await inventoryService.updateSupplier(editing.id, data);
        toast.success('Proveedor actualizado');
      } else {
        await inventoryService.createSupplier(data);
        toast.success('Proveedor creado');
      }
      setShowModal(false);
      loadSuppliers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await inventoryService.deleteSupplier(deleteId);
      toast.success('Proveedor eliminado');
      setDeleteId(null);
      loadSuppliers();
    } catch { toast.error('Error al eliminar'); }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Proveedores</h1>
        <button onClick={openCreate} className="btn-primary"><Plus size={18} /> Nuevo Proveedor</button>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Buscar proveedor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {loading ? <p className="text-gray-500">Cargando...</p> : suppliers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Truck size={48} className="mx-auto mb-2" />
          <p>No hay proveedores registrados</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nombre</th>
                <th className="px-4 py-3 text-left font-medium">Contacto</th>
                <th className="px-4 py-3 text-left font-medium">Teléfono</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{s.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{s.contacto || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.telefono || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.email || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(s)} className="p-1 text-gray-400 hover:text-blue-600 mr-1"><Pencil size={16} /></button>
                    <button onClick={() => setDeleteId(s.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} title={editing ? 'Editar Proveedor' : 'Nuevo Proveedor'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Contacto</label>
                <input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Teléfono</label>
                <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="input" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dirección</label>
              <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notas</label>
              <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} className="input" rows={2} />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="btn-primary flex-1">{editing ? 'Actualizar' : 'Crear'}</button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Eliminar Proveedor"
        message="¿Estás seguro de eliminar este proveedor?"
        onConfirm={handleDelete}
      />
    </div>
  );
}
