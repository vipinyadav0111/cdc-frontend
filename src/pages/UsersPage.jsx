import { useState, useEffect } from 'react';
import { api } from '../api';
import { useOutletContext } from 'react-router-dom';

export default function UsersPage() {
  const { theme } = useOutletContext();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', employee_id:'', role:'trainer' });
  const [msg, setMsg] = useState('');

  useEffect(() => { loadUsers(); }, []);
  const loadUsers = async () => {
    try { setUsers(await api('/users')); } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try { await api('/users', {method:'POST', body:JSON.stringify(form)}); setMsg('User added! Password = Employee ID'); setShowForm(false); setForm({name:'',email:'',employee_id:'',role:'trainer'}); loadUsers(); }
    catch(e) { setMsg('Error: '+e.message); }
  };

  const handleReset = async (id, name) => {
    if(!confirm(`Reset ${name}'s password to Employee ID?`)) return;
    try { await api(`/users/${id}/reset-password`, {method:'POST'}); setMsg(`${name}'s password reset`); }
    catch(e) { setMsg('Error: '+e.message); }
  };

  const handleToggle = async (u) => {
    try { await api(`/users/${u.id}`, {method:'PUT', body:JSON.stringify({...u, is_active:!u.is_active})}); loadUsers(); }
    catch(e) { alert(e.message); }
  };

  const inp = { width:'100%', padding:'9px 12px', border:`2px solid ${theme.border}`, borderRadius:'8px', fontSize:'14px', boxSizing:'border-box', outline:'none', background:theme.card, color:theme.text };
  const card = { background:theme.card, borderRadius:'14px', boxShadow:'0 1px 4px rgba(0,0,0,0.07)', border:`1px solid ${theme.border}` };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <h1 style={{ margin:0, fontSize:'24px', fontWeight:'700', color:theme.text }}>👥 Manage Users</h1>
        <button onClick={()=>setShowForm(!showForm)} style={{ padding:'10px 20px', background:theme.accent, color:'white', border:'none', borderRadius:'10px', cursor:'pointer', fontWeight:'600', fontSize:'14px' }}>{showForm?'✕ Cancel':'+ Add User'}</button>
      </div>

      {msg && <div style={{ background:'#d1fae5', color:'#065f46', padding:'12px', borderRadius:'8px', marginBottom:'16px' }}>{msg}</div>}

      {showForm && (
        <div style={{ ...card, padding:'24px', marginBottom:'20px' }}>
          <h2 style={{ margin:'0 0 16px', fontSize:'16px', fontWeight:'700', color:theme.text }}>Add New User</h2>
          <form onSubmit={handleAdd}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'12px', marginBottom:'16px' }}>
              {[['Full Name','text','name','Ms. Name'],['Email','email','email','email@mriu.edu.in'],['Employee ID','text','employee_id','e.g. 4500466']].map(([l,type,k,p])=>(
                <div key={k}><label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:theme.subtext, marginBottom:'5px' }}>{l}</label>
                  <input type={type} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder={p} style={inp} required />
                </div>
              ))}
              <div><label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:theme.subtext, marginBottom:'5px' }}>Role</label>
                <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} style={inp}>
                  <option value="trainer">Trainer</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>
            <button type="submit" style={{ padding:'10px 24px', background:theme.accent, color:'white', border:'none', borderRadius:'8px', fontWeight:'600', cursor:'pointer' }}>Add User</button>
          </form>
        </div>
      )}

      <div style={card}>
        {loading ? <p style={{ padding:'24px', color:theme.subtext }}>Loading...</p> : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:theme.bg }}>
                  {['Name','Email','Employee ID','Role','Status','Actions'].map(h=>(
                    <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:'12px', fontWeight:'600', color:theme.subtext, borderBottom:`2px solid ${theme.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u,i)=>(
                  <tr key={u.id} style={{ background:i%2===0?theme.card:theme.bg }}>
                    <td style={{ padding:'10px 14px', fontWeight:'600', fontSize:'13px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{u.name}</td>
                    <td style={{ padding:'10px 14px', fontSize:'13px', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{u.email}</td>
                    <td style={{ padding:'10px 14px', fontSize:'13px', fontFamily:'monospace', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{u.employee_id}</td>
                    <td style={{ padding:'10px 14px', borderBottom:`1px solid ${theme.border}` }}>
                      <span style={{ padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', background:u.role==='super_admin'?'#dbeafe':'#f1f5f9', color:u.role==='super_admin'?'#1d4ed8':'#475569' }}>{u.role==='super_admin'?'Admin':'Trainer'}</span>
                    </td>
                    <td style={{ padding:'10px 14px', borderBottom:`1px solid ${theme.border}` }}>
                      <span style={{ padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', background:u.is_active?'#d1fae5':'#fee2e2', color:u.is_active?'#065f46':'#991b1b' }}>{u.is_active?'Active':'Inactive'}</span>
                    </td>
                    <td style={{ padding:'10px 14px', borderBottom:`1px solid ${theme.border}` }}>
                      <div style={{ display:'flex', gap:'6px' }}>
                        <button onClick={()=>handleReset(u.id,u.name)} style={{ background:'#fef3c7', color:'#92400e', border:'none', borderRadius:'6px', padding:'4px 10px', cursor:'pointer', fontSize:'11px', fontWeight:'600' }}>Reset PWD</button>
                        <button onClick={()=>handleToggle(u)} style={{ background:u.is_active?'#fee2e2':'#d1fae5', color:u.is_active?'#991b1b':'#065f46', border:'none', borderRadius:'6px', padding:'4px 10px', cursor:'pointer', fontSize:'11px', fontWeight:'600' }}>{u.is_active?'Deactivate':'Activate'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
