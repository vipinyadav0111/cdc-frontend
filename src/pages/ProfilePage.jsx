import { useState, useEffect, useRef } from 'react';
import { getUser, api } from '../api';
import { useOutletContext } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const DESIGNATIONS = [
  'Manager',
  'Associate Head - Career Skills',
  'Head - Career Skills',
  'Deputy General Manager',
  'Sr. Manager - Career Skills',
  'Sr. Manager Career Skills',
  'Senior Manager',
  'Manager - Career Skills',
  'Manager Training',
  'Deputy Manager - Career Skills',
  'Deputy Manager',
  'Lead Technical - Career Skills',
  'Assistant Manager - Career Skills',
  'Assistant Manager',
  'Asst. Manager',
  'Coordinator',
  'CDC Trainer',
  'Sr. Trainer - Career Skills',
  'Visiting Faculty',
  'Guest Trainer',
];

export default function ProfilePage() {
  const { theme } = useOutletContext();
  const user = getUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [form, setForm] = useState({ designation:'', birthday:'', bio:'', phone:'', joined_date:'', profile_picture:'' });
  const [passForm, setPassForm] = useState({ current:'', new:'', confirm:'' });
  const fileRef = useRef();

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const data = await api(`/profile/${user.id}`);
      setProfile(data);
      setForm({
        designation: data.designation||'',
        birthday: data.birthday ? data.birthday.split('T')[0] : '',
        bio: data.bio||'',
        phone: data.phone||'',
        joined_date: data.joined_date ? data.joined_date.split('T')[0] : '',
        profile_picture: data.profile_picture||'',
      });
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    if(file.size > 2 * 1024 * 1024) return setErr('Photo must be under 2MB');
    const reader = new FileReader();
    reader.onload = (ev) => setForm(f => ({...f, profile_picture: ev.target.result}));
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(''); setErr('');
    try {
      await api('/profile/me/update', { method:'PUT', body:JSON.stringify(form) });
      // Update local user cache
      const u = JSON.parse(localStorage.getItem('user')||'{}');
      u.name = profile.name;
      localStorage.setItem('user', JSON.stringify(u));
      setMsg('✅ Profile updated successfully!');
      loadProfile();
    } catch(e) { setErr('❌ '+e.message); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault(); setMsg(''); setErr('');
    if(!passForm.current || !passForm.new || !passForm.confirm) return setErr('All fields required');
    if(passForm.new !== passForm.confirm) return setErr('New passwords do not match');
    if(passForm.new.length < 6) return setErr('Minimum 6 characters');
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/auth/change-password`, {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
        body:JSON.stringify({currentPassword:passForm.current, newPassword:passForm.new})
      });
      const data = await res.json();
      if(!res.ok) setErr('❌ '+(data.error||'Failed'));
      else { setMsg('✅ Password changed!'); setPassForm({current:'',new:'',confirm:''}); }
    } catch { setErr('❌ Network error'); }
    finally { setSaving(false); }
  };

  const card = { background:theme.card, borderRadius:'14px', border:`1px solid ${theme.border}`, padding:'24px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' };
  const inp = { width:'100%', padding:'10px 12px', border:`2px solid ${theme.border}`, borderRadius:'8px', fontSize:'14px', boxSizing:'border-box', outline:'none', background:theme.card, color:theme.text };
  const lbl = { display:'block', fontSize:'12px', fontWeight:'600', color:theme.subtext, marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.4px' };

  if(loading) return <div style={{ color:theme.subtext, padding:'40px' }}>Loading...</div>;

  return (
    <div style={{ maxWidth:'900px' }}>
      <h1 style={{ margin:'0 0 24px', fontSize:'24px', fontWeight:'700', color:theme.text }}>👤 My Profile</h1>

      {/* Profile header card */}
      <div style={{ ...card, marginBottom:'20px', display:'flex', alignItems:'center', gap:'24px' }}>
        {/* Avatar */}
        <div style={{ position:'relative', flexShrink:0 }}>
          <div style={{ width:'90px', height:'90px', borderRadius:'50%', overflow:'hidden', border:`3px solid ${theme.accent}`, background:theme.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {form.profile_picture ? (
              <img src={form.profile_picture} alt="Profile" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            ) : (
              <span style={{ fontSize:'36px', fontWeight:'700', color:theme.accent }}>{profile?.name?.[0]}</span>
            )}
          </div>
          <button onClick={()=>fileRef.current.click()} style={{ position:'absolute', bottom:'-2px', right:'-2px', width:'28px', height:'28px', borderRadius:'50%', background:theme.accent, color:'white', border:'2px solid white', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center' }}>
            📷
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display:'none' }} />
        </div>

        <div style={{ flex:1 }}>
          <h2 style={{ margin:'0 0 4px', fontSize:'22px', fontWeight:'700', color:theme.text }}>{profile?.name}</h2>
          <div style={{ color:theme.accent, fontWeight:'600', fontSize:'14px', marginBottom:'4px' }}>{profile?.designation || 'CDC Trainer'}</div>
          <div style={{ color:theme.subtext, fontSize:'13px' }}>{profile?.email} · {profile?.employee_id}</div>
          {profile?.bio && <p style={{ margin:'8px 0 0', fontSize:'13px', color:theme.subtext, fontStyle:'italic' }}>{profile.bio}</p>}
        </div>

        {/* Birthday badge */}
        {profile?.birthday && (() => {
          const bday = new Date(profile.birthday);
          const today = new Date();
          const isToday = bday.getDate()===today.getDate() && bday.getMonth()===today.getMonth();
          const daysUntil = (() => {
            const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
            if(next < today) next.setFullYear(today.getFullYear()+1);
            return Math.ceil((next - today) / 86400000);
          })();
          return (
            <div style={{ textAlign:'center', background: isToday ? '#fef3c7' : theme.bg, borderRadius:'12px', padding:'12px 16px', border:`1px solid ${isToday?'#f59e0b':theme.border}` }}>
              <div style={{ fontSize:'24px' }}>{isToday ? '🎂' : '🎁'}</div>
              <div style={{ fontSize:'12px', fontWeight:'700', color: isToday ? '#92400e' : theme.subtext, marginTop:'4px' }}>
                {isToday ? 'Happy Birthday! 🎉' : `Birthday in ${daysUntil}d`}
              </div>
              <div style={{ fontSize:'11px', color:theme.subtext }}>{bday.toLocaleDateString('en-IN',{day:'numeric',month:'long'})}</div>
            </div>
          );
        })()}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'4px', marginBottom:'20px', background:theme.bg, padding:'4px', borderRadius:'10px', width:'fit-content' }}>
        {[['profile','✏️ Edit Profile'],['password','🔒 Change Password']].map(([id,label])=>(
          <button key={id} onClick={()=>setActiveTab(id)} style={{
            padding:'8px 20px', border:'none', borderRadius:'8px', cursor:'pointer',
            background: activeTab===id ? theme.card : 'transparent',
            color: activeTab===id ? theme.text : theme.subtext,
            fontWeight: activeTab===id ? '600' : '400', fontSize:'14px',
            boxShadow: activeTab===id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
          }}>{label}</button>
        ))}
      </div>

      {msg && <div style={{ background:'#d1fae5', color:'#065f46', padding:'12px', borderRadius:'8px', marginBottom:'16px', fontWeight:'500' }}>{msg}</div>}
      {err && <div style={{ background:'#fee2e2', color:'#991b1b', padding:'12px', borderRadius:'8px', marginBottom:'16px', fontWeight:'500' }}>{err}</div>}

      {/* Edit Profile Tab */}
      {activeTab==='profile' && (
        <div style={card}>
          <form onSubmit={handleSaveProfile}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
              <div>
                <label style={lbl}>Designation</label>
                <select value={form.designation} onChange={e=>setForm({...form,designation:e.target.value})} style={inp}>
                  <option value="">Select designation...</option>
                  {DESIGNATIONS.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Phone Number</label>
                <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+91 XXXXX XXXXX" style={inp} />
              </div>
              <div>
                <label style={lbl}>Date of Birth 🎂</label>
                <input type="date" value={form.birthday} onChange={e=>setForm({...form,birthday:e.target.value})} style={inp} />
              </div>
              <div>
                <label style={lbl}>Joined MREI On</label>
                <input type="date" value={form.joined_date} onChange={e=>setForm({...form,joined_date:e.target.value})} style={inp} />
              </div>
            </div>
            <div style={{ marginBottom:'16px' }}>
              <label style={lbl}>About Me / Bio</label>
              <textarea value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} placeholder="Write a short bio about yourself..." rows={3} style={{ ...inp, resize:'vertical', lineHeight:'1.6' }} />
            </div>
            <button type="submit" disabled={saving} style={{ padding:'12px 32px', background:saving?'#9ca3af':theme.accent, color:'white', border:'none', borderRadius:'10px', fontWeight:'700', cursor:saving?'not-allowed':'pointer', fontSize:'15px' }}>
              {saving ? 'Saving...' : '💾 Save Profile'}
            </button>
          </form>
        </div>
      )}

      {/* Change Password Tab */}
      {activeTab==='password' && (
        <div style={card}>
          <form onSubmit={handleChangePassword}>
            {[['Current Password','current','Your current password'],['New Password','new','Minimum 6 characters'],['Confirm New Password','confirm','Repeat new password']].map(([l,k,p])=>(
              <div key={k} style={{ marginBottom:'16px' }}>
                <label style={lbl}>{l}</label>
                <input type="password" value={passForm[k]} onChange={e=>setPassForm({...passForm,[k]:e.target.value})} placeholder={p} style={inp} />
              </div>
            ))}
            <button type="submit" disabled={saving} style={{ padding:'12px 32px', background:saving?'#9ca3af':theme.accent, color:'white', border:'none', borderRadius:'10px', fontWeight:'700', cursor:saving?'not-allowed':'pointer', fontSize:'15px' }}>
              {saving ? 'Saving...' : '🔒 Update Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
