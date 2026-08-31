import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, syncUser } from '../services/api';
import { Edit2, Shield, UserX, CheckCircle, Save, Plus } from 'lucide-react';

export const UserAdmin = () => {
  const { usersList, setUsersList } = useAuth();
  const [editingUser, setEditingUser] = useState<(User & { isNew?: boolean }) | null>(null);
  const [saving, setSaving] = useState(false);

  const handleEdit = (user: User) => {
    setEditingUser({ ...user });
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    
    // We send a POST request via syncUser to update/insert the user on Google Sheets
    const success = await syncUser(editingUser);
    
    if (success) {
      setUsersList(prev => {
        const exists = prev.find(u => u.usuario === editingUser.usuario);
        const newList = exists 
          ? prev.map(u => u.usuario === editingUser.usuario ? editingUser : u)
          : [...prev, editingUser];
        localStorage.setItem('aguas_auth_list', JSON.stringify(newList));
        return newList;
      });
      alert('Cambios guardados correctamente.');
      setEditingUser(null);
    } else {
      alert('Error al guardar. Asegúrese de tener conexión a internet o revise el Apps Script.');
    }
    setSaving(false);
  };

  return (
    <>
      <div className="container-fluid animate-fade-in">
        <div className="flex-between" style={{ marginBottom: '2rem' }}>
          <h2 className="section-title" style={{ margin: 0, border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={24} style={{ color: 'var(--primary)' }} />
            Panel de Administración de Usuarios
          </h2>
          <button className="btn btn-primary" onClick={() => setEditingUser({
            usuario: '',
            contrasena: '',
            codigoRenipress: '',
            red: '',
            rol: 'IPRESS',
            estado: 'Activo',
            isNew: true
          })}>
            <Plus size={20} /> Nuevo Usuario
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Contraseña</th>
                <th>Renipress</th>
                <th>Red</th>
                <th>Rol</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((user, idx) => (
                <tr key={idx} style={{ opacity: user.estado !== 'Activo' ? 0.6 : 1 }}>
                  <td style={{ fontWeight: 600 }}>{user.usuario}</td>
                  <td>••••••••</td>
                  <td>{user.codigoRenipress || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>-</span>}</td>
                  <td>{user.red}</td>
                  <td>{user.rol}</td>
                  <td>
                    <span className={`status-badge ${user.estado === 'Activo' ? 'success' : 'danger'}`}>
                      {user.estado}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button onClick={() => handleEdit(user)} className="btn-icon" title="Editar" style={{ color: 'var(--primary)' }} disabled={saving}>
                        <Edit2 size={18} />
                      </button>
                      {user.estado === 'Activo' ? (
                        <button 
                          onClick={async () => {
                            if(window.confirm(`¿Desea deshabilitar a ${user.usuario}?`)){
                              setSaving(true);
                              await syncUser({ ...user, estado: 'Inactivo' });
                              setUsersList(prev => {
                                 const newList = prev.map(u => u.usuario === user.usuario ? { ...user, estado: 'Inactivo' } : u);
                                 localStorage.setItem('aguas_auth_list', JSON.stringify(newList));
                                 return newList;
                              });
                              setSaving(false);
                            }
                          }} 
                          className="btn-icon" 
                          title="Deshabilitar" 
                          style={{ color: 'var(--danger)' }}
                          disabled={saving}
                        >
                          <UserX size={18} />
                        </button>
                      ) : (
                        <button 
                          onClick={async () => {
                            setSaving(true);
                            await syncUser({ ...user, estado: 'Activo' });
                            setUsersList(prev => {
                               const newList = prev.map(u => u.usuario === user.usuario ? { ...user, estado: 'Activo' } : u);
                               localStorage.setItem('aguas_auth_list', JSON.stringify(newList));
                               return newList;
                            });
                            setSaving(false);
                          }} 
                          className="btn-icon" 
                          title="Habilitar" 
                          style={{ color: 'var(--success)' }}
                          disabled={saving}
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="glass-panel animate-fade-in" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--primary)' }}>
              {editingUser.isNew ? 'Crear Nuevo Usuario' : `Editar Usuario: ${editingUser.usuario}`}
            </h3>
            
            <div className="form-group">
              <label className="form-label">Usuario</label>
              <input type="text" className="form-control" value={editingUser.usuario} onChange={e => setEditingUser({...editingUser, usuario: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input type="text" className="form-control" value={editingUser.contrasena} onChange={e => setEditingUser({...editingUser, contrasena: e.target.value})} placeholder="Dejar en blanco para no cambiar (si existe)" />
            </div>

            <div className="form-group">
              <label className="form-label">Red</label>
              <select className="form-control" value={editingUser.red} onChange={e => setEditingUser({...editingUser, red: e.target.value})}>
                <option value="">Seleccione una Red</option>
                <option value="GERESA">GERESA</option>
                <option value="Hospital">Hospital</option>
                <option value="Red Cusco Norte">Red Cusco Norte</option>
                <option value="Red Cusco Sur">Red Cusco Sur</option>
                <option value="Red CCE">Red CCE</option>
                <option value="Red Chumbivilcas">Red Chumbivilcas</option>
                <option value="Red La Convencion">Red La Convencion</option>
                <option value="Red Cusco VRAEM">Red Cusco VRAEM</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Código RENIPRESS</label>
              <input type="text" className="form-control" value={editingUser.codigoRenipress} onChange={e => setEditingUser({...editingUser, codigoRenipress: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">Rol</label>
              <select className="form-control" value={editingUser.rol} onChange={e => setEditingUser({...editingUser, rol: e.target.value})}>
                <option value="IPRESS">IPRESS</option>
                <option value="Hospital">Hospital</option>
                <option value="Administra todas las Redes">Administra todas las Redes</option>
                <option value="Administra todas las IPRESS de la Red Norte">Administra todas las IPRESS de la Red Norte</option>
                <option value="Administra todas las IPRESS de la Red Sur">Administra todas las IPRESS de la Red Sur</option>
                <option value="Administra todas las IPRESS de la Red CCE">Administra todas las IPRESS de la Red CCE</option>
                <option value="Administra todas las IPRESS de la Red Chumbivilcas">Administra todas las IPRESS de la Red Chumbivilcas</option>
                <option value="Administra todas las IPRESS de la Red La Convencion">Administra todas las IPRESS de la Red La Convencion</option>
                <option value="Administra todas las IPRESS de la Red Cusco Vraem">Administra todas las IPRESS de la Red Cusco Vraem</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-control" value={editingUser.estado} onChange={e => setEditingUser({...editingUser, estado: e.target.value})}>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)} disabled={saving}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : <><Save size={18} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
