import { useState, useEffect } from 'react';
import { Plus, Users, Pencil, Power } from 'lucide-react';
import { usersService } from '../../services/users.service';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const emptyForm = {
  username: '', email: '', password: '', nombre: '', apellido: '', pin: '', roleIds: [] as string[],
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  // Edit modal state
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        usersService.getUsers(),
        usersService.getRoles().catch(() => []),
      ]);
      setUsers(usersRes.data || []);
      setRoles(rolesRes || []);
    } catch { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await usersService.createUser(form as any);
      toast.success('Usuario creado');
      setShowForm(false);
      setForm({ ...emptyForm });
      loadData();
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.errors) {
        const msgs = Object.entries(data.errors).map(([field, errs]: [string, any]) => `${field}: ${errs.join(', ')}`).join('\n');
        toast.error(msgs, { duration: 5000 });
      } else {
        toast.error(data?.message || 'Error');
      }
    }
  };

  const toggleRole = (roleId: string) => {
    setForm((f) => ({
      ...f,
      roleIds: f.roleIds.includes(roleId)
        ? f.roleIds.filter((id) => id !== roleId)
        : [...f.roleIds, roleId],
    }));
  };

  const toggleEditRole = (roleId: string) => {
    setEditForm((f) => ({
      ...f,
      roleIds: f.roleIds.includes(roleId)
        ? f.roleIds.filter((id) => id !== roleId)
        : [...f.roleIds, roleId],
    }));
  };

  const openEditModal = (user: any) => {
    setEditUser(user);
    setEditForm({
      nombre: user.nombre || '',
      apellido: user.apellido || '',
      username: user.username || '',
      email: user.email || '',
      password: '',
      pin: user.pin || '',
      roleIds: user.roles?.map((r: any) => r.id) || [],
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      const payload: any = {
        nombre: editForm.nombre,
        apellido: editForm.apellido,
        username: editForm.username,
        email: editForm.email,
        pin: editForm.pin || undefined,
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }
      await usersService.updateUser(editUser.id, payload);
      // Update roles if changed
      await usersService.assignRoles(editUser.id, editForm.roleIds);
      toast.success('Usuario actualizado');
      setShowEditModal(false);
      setEditUser(null);
      loadData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error al actualizar'); }
  };

  const handleToggleActive = async (user: any) => {
    try {
      await usersService.updateUser(user.id, { activo: !user.activo });
      toast.success(user.activo ? 'Usuario desactivado' : 'Usuario activado');
      loadData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error al cambiar estado'); }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Usuarios</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary"><Plus size={18} /> Nuevo</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 mb-4 grid grid-cols-2 gap-3">
          <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input" placeholder="Nombre" required />
          <input value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} className="input" placeholder="Apellido" required />
          <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="input" placeholder="Usuario" required />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" placeholder="Email" type="email" required />
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" placeholder="Contrasena" type="password" required />
          <input value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} className="input" placeholder="PIN (4 digitos)" maxLength={4} />
          <div className="col-span-2">
            <label className="label">Roles</label>
            <div className="flex gap-2 flex-wrap">
              {roles.map((r) => (
                <button key={r.id} type="button" onClick={() => toggleRole(r.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${form.roleIds.includes(r.id) ? 'bg-manu-teal text-white border-manu-teal' : 'border-gray-300 text-gray-600'}`}>
                  {r.nombre}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="btn-primary">Crear</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? <p className="text-gray-500">Cargando...</p> : users.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><Users size={48} className="mx-auto mb-2" /><p>No hay usuarios.</p></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-3 text-left font-medium">Nombre</th>
              <th className="px-4 py-3 text-left font-medium">Usuario</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Roles</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-left font-medium">Acciones</th>
            </tr></thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium">{u.nombre} {u.apellido}</td>
                  <td className="px-4 py-3 text-gray-500">{u.username}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {u.roles?.map((r: any) => (
                        <span key={r.id} className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-manu-teal">{r.nombre}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-manu-teal transition-colors"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${u.activo ? 'text-green-600 hover:text-red-500' : 'text-gray-400 hover:text-green-600'}`}
                        title={u.activo ? 'Desactivar' : 'Activar'}
                      >
                        <Power size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit User Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Usuario" size="md">
        <form onSubmit={handleEditSubmit} className="grid grid-cols-2 gap-3">
          <input value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} className="input" placeholder="Nombre" required />
          <input value={editForm.apellido} onChange={(e) => setEditForm({ ...editForm, apellido: e.target.value })} className="input" placeholder="Apellido" required />
          <input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} className="input" placeholder="Usuario" required />
          <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="input" placeholder="Email" type="email" required />
          <input value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className="input" placeholder="Nueva contrasena (opcional)" type="password" />
          <input value={editForm.pin} onChange={(e) => setEditForm({ ...editForm, pin: e.target.value })} className="input" placeholder="PIN (4 digitos)" maxLength={4} />
          <div className="col-span-2">
            <label className="label">Roles</label>
            <div className="flex gap-2 flex-wrap">
              {roles.map((r) => (
                <button key={r.id} type="button" onClick={() => toggleEditRole(r.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${editForm.roleIds.includes(r.id) ? 'bg-manu-teal text-white border-manu-teal' : 'border-gray-300 text-gray-600'}`}>
                  {r.nombre}
                </button>
              ))}
            </div>
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
