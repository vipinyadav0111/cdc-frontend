import { useState, useEffect } from 'react';
import { api, getUser } from '../api';
import { useOutletContext } from 'react-router-dom';

const CATEGORIES = [
  { id:'general',  label:'📢 General',  color:'#3b82f6' },
  { id:'urgent',   label:'🚨 Urgent',   color:'#ef4444' },
  { id:'event',    label:'🎉 Event',    color:'#8b5cf6' },
  { id:'academic', label:'📚 Academic', color:'#10b981' },
  { id:'admin',    label:'🏢 Admin',    color:'#f59e0b' },
];

const NEWS_SOURCES = [
  { id:'bbc',   name:'BBC World',  flag:'🌍' },
  { id:'toi',   name:'Times of India', flag:'🇮🇳' },
  { id:'hindu', name:'The Hindu',  flag:'🇮🇳' },
  { id:'ndtv',  name:'NDTV',       flag:'🇮🇳' },
];

function timeAgo(dateStr) {
  if(!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if(diff < 60) return 'just now';
  if(diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if(diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

function getBirthdayInfo(birthdayStr) {
  if(!birthdayStr) return null;
  const bday = new Date(birthdayStr);
  const today = new Date();
  const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  const isToday = thisYear.toDateString() === today.toDateString();
  const isTomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate()+1).toDateString() === thisYear.toDateString();
  let daysUntil = Math.ceil((thisYear - today) / 86400000);
  if(daysUntil < 0) {
    const nextYear = new Date(today.getFullYear()+1, bday.getMonth(), bday.getDate());
    daysUntil = Math.ceil((nextYear - today) / 86400000);
  }
  const age = today.getFullYear() - bday.getFullYear() + (isToday ? 0 : 0);
  return { isToday, isTomorrow, daysUntil, age, monthDay: bday.toLocaleDateString('en-IN', {day:'numeric', month:'long'}) };
}

export default function NoticeBoardPage() {
  const { theme } = useOutletContext();
  const user = getUser();
  const isAdmin = user?.role === 'super_admin';

  const [notices, setNotices] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [news, setNews] = useState([]);
  const [newsSource, setNewsSource] = useState('bbc');
  const [newsLoading, setNewsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [form, setForm] = useState({ title:'', content:'', category:'general', priority:'normal' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [activeRight, setActiveRight] = useState('birthdays'); // 'birthdays' | 'news'

  useEffect(() => { loadNotices(); loadProfiles(); }, []);
  useEffect(() => { if(activeRight === 'news') loadNews(); }, [activeRight, newsSource]);

  const loadNotices = async () => {
    try { setNotices(await api('/notices')); } catch(e) { console.error(e); }
  };

  const loadProfiles = async () => {
    try { setProfiles(await api('/profile')); } catch(e) { console.error(e); }
  };

  const loadNews = async () => {
    setNewsLoading(true);
    setNews([]);
    try {
      const data = await api(`/news?source=${newsSource}`);
      setNews(data.items || []);
    } catch(e) {
      console.error('News error:', e);
      setNews([]);
    } finally {
      setNewsLoading(false);
    }
  };

  // Birthday grouping
  const birthdayGroups = (() => {
    const today = [], tomorrow = [], thisWeek = [], thisMonth = [], upcoming = [];
    profiles.forEach(p => {
      if(!p.birthday) return;
      const info = getBirthdayInfo(p.birthday);
      if(!info) return;
      const entry = { ...p, bdInfo: info };
      if(info.isToday) today.push(entry);
      else if(info.isTomorrow) tomorrow.push(entry);
      else if(info.daysUntil <= 7) thisWeek.push(entry);
      else if(info.daysUntil <= 30) thisMonth.push(entry);
      else upcoming.push(entry);
    });
    upcoming.sort((a,b) => a.bdInfo.daysUntil - b.bdInfo.daysUntil);
    thisMonth.sort((a,b) => a.bdInfo.daysUntil - b.bdInfo.daysUntil);
    thisWeek.sort((a,b) => a.bdInfo.daysUntil - b.bdInfo.daysUntil);
    return { today, tomorrow, thisWeek, thisMonth, upcoming };
  })();

  const openNew = () => {
    setEditingNotice(null);
    setForm({ title:'', content:'', category:'general', priority:'normal' });
    setShowForm(true);
  };

  const openEdit = (n) => {
    setEditingNotice(n);
    setForm({ title:n.title, content:n.content, category:n.category, priority:n.priority });
    setShowForm(true);
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!form.title || !form.content) return setMsg('⚠️ Title and content required');
    setSaving(true);
    try {
      if(editingNotice) {
        await api(`/notices/${editingNotice.id}`, { method:'PUT', body:JSON.stringify({...form, is_active:true}) });
        setMsg('✅ Notice updated!');
      } else {
        await api('/notices', { method:'POST', body:JSON.stringify(form) });
        setMsg('✅ Notice posted!');
      }
      setShowForm(false); setEditingNotice(null);
      setForm({ title:'', content:'', category:'general', priority:'normal' });
      loadNotices();
    } catch(e) { setMsg('❌ '+e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if(!confirm('Delete this notice?')) return;
    try { await api(`/notices/${id}`, {method:'DELETE'}); loadNotices(); }
    catch(e) { alert(e.message); }
  };

  const filteredNotices = filterCat === 'all' ? notices : notices.filter(n => n.category === filterCat);
  const card = { background:theme.card, borderRadius:'14px', border:`1px solid ${theme.border}`, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' };
  const inp = { width:'100%', padding:'10px 12px', border:`2px solid ${theme.border}`, borderRadius:'8px', fontSize:'14px', boxSizing:'border-box', outline:'none', background:theme.card, color:theme.text };

  const BirthdayCard = ({ p, highlight }) => (
    <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', borderBottom:`1px solid ${theme.border}`, background: highlight ? '#fffbeb' : 'transparent' }}>
      {p.profile_picture ? (
        <img src={p.profile_picture} alt="" style={{ width:'36px', height:'36px', borderRadius:'50%', objectFit:'cover', border:`2px solid ${highlight?'#f59e0b':theme.border}` }} />
      ) : (
        <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:highlight?'#fef3c7':theme.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', fontWeight:'700', color:highlight?'#92400e':theme.accent, border:`2px solid ${highlight?'#f59e0b':theme.border}`, flexShrink:0 }}>
          {p.name?.[0]}
        </div>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:'600', fontSize:'13px', color:theme.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
        <div style={{ fontSize:'11px', color:theme.subtext }}>{p.designation || 'CDC Trainer'} · {p.bdInfo.monthDay}</div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        {p.bdInfo.isToday ? (
          <span style={{ background:'#fef3c7', color:'#92400e', padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>🎂 Today!</span>
        ) : p.bdInfo.isTomorrow ? (
          <span style={{ background:'#dbeafe', color:'#1d4ed8', padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600' }}>Tomorrow</span>
        ) : (
          <span style={{ color:theme.subtext, fontSize:'12px' }}>in {p.bdInfo.daysUntil}d</span>
        )}
      </div>
    </div>
  );

  const SectionHeader = ({ title, count, color }) => (
    <div style={{ padding:'8px 14px', background:theme.bg, fontSize:'11px', fontWeight:'700', color:color||theme.subtext, textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:`1px solid ${theme.border}` }}>
      {title} {count > 0 && <span style={{ background:color||theme.accent, color:'#fff', borderRadius:'20px', padding:'1px 7px', marginLeft:'5px', fontSize:'10px' }}>{count}</span>}
    </div>
  );

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 370px', gap:'20px', alignItems:'start' }}>

      {/* ── LEFT: Notice Board ── */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <div>
            <h1 style={{ margin:0, fontSize:'24px', fontWeight:'700', color:theme.text }}>📌 Notice Board</h1>
            <p style={{ margin:'4px 0 0', color:theme.subtext, fontSize:'13px' }}>CDC — MREI Announcements</p>
          </div>
          {!showForm && (
            <button onClick={openNew} style={{ padding:'10px 20px', background:theme.accent, color:'white', border:'none', borderRadius:'10px', cursor:'pointer', fontWeight:'600', fontSize:'14px' }}>
              + Post Notice
            </button>
          )}
        </div>

        {msg && <div style={{ background:msg.startsWith('❌')?'#fee2e2':'#d1fae5', color:msg.startsWith('❌')?'#991b1b':'#065f46', padding:'12px', borderRadius:'8px', marginBottom:'16px', fontWeight:'500' }}>{msg}</div>}

        {/* Post/Edit Form */}
        {showForm && (
          <div style={{ ...card, padding:'24px', marginBottom:'20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
              <h2 style={{ margin:0, fontSize:'16px', fontWeight:'700', color:theme.text }}>{editingNotice ? '✏️ Edit Notice' : '📝 New Notice'}</h2>
              <button onClick={()=>{setShowForm(false);setEditingNotice(null);}} style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:theme.subtext }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom:'12px' }}>
                <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Notice title..." style={{ ...inp, fontSize:'16px', fontWeight:'600' }} required />
              </div>
              <div style={{ marginBottom:'12px' }}>
                <textarea value={form.content} onChange={e=>setForm({...form,content:e.target.value})} placeholder="Write your announcement here..." rows={4} style={{ ...inp, resize:'vertical', lineHeight:'1.6' }} required />
              </div>
              <div style={{ display:'flex', gap:'10px', marginBottom:'16px' }}>
                <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{ ...inp, width:'auto' }}>
                  {CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} style={{ ...inp, width:'auto' }}>
                  <option value="normal">Normal</option>
                  <option value="high">⬆️ High Priority</option>
                  <option value="urgent">🔴 Urgent</option>
                </select>
              </div>
              <div style={{ display:'flex', gap:'10px' }}>
                <button type="submit" disabled={saving} style={{ padding:'10px 24px', background:theme.accent, color:'white', border:'none', borderRadius:'8px', fontWeight:'600', cursor:'pointer', fontSize:'14px' }}>
                  {saving ? 'Posting...' : editingNotice ? 'Update' : 'Post Notice'}
                </button>
                <button type="button" onClick={()=>{setShowForm(false);setEditingNotice(null);}} style={{ padding:'10px 16px', background:theme.bg, color:theme.subtext, border:`1px solid ${theme.border}`, borderRadius:'8px', cursor:'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Category filter pills */}
        <div style={{ display:'flex', gap:'6px', marginBottom:'16px', flexWrap:'wrap' }}>
          <button onClick={()=>setFilterCat('all')} style={{ padding:'6px 14px', border:'none', borderRadius:'20px', cursor:'pointer', fontSize:'12px', fontWeight:'600', background:filterCat==='all'?theme.accent:theme.bg, color:filterCat==='all'?'#fff':theme.subtext }}>All ({notices.length})</button>
          {CATEGORIES.map(c=>(
            <button key={c.id} onClick={()=>setFilterCat(c.id)} style={{ padding:'6px 14px', border:'none', borderRadius:'20px', cursor:'pointer', fontSize:'12px', fontWeight:'600', background:filterCat===c.id?c.color:theme.bg, color:filterCat===c.id?'#fff':theme.subtext }}>
              {c.label} ({notices.filter(n=>n.category===c.id).length})
            </button>
          ))}
        </div>

        {/* Notices list */}
        {filteredNotices.length === 0 ? (
          <div style={{ ...card, padding:'48px', textAlign:'center', color:theme.subtext }}>
            <div style={{ fontSize:'40px', marginBottom:'8px' }}>📭</div>
            <p style={{ margin:0, fontSize:'15px' }}>No notices posted yet</p>
            {isAdmin && <p style={{ margin:'8px 0 0', fontSize:'13px' }}>Click "+ Post Notice" to add one</p>}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {filteredNotices.map(n => {
              const cat = CATEGORIES.find(c=>c.id===n.category) || CATEGORIES[0];
              const isUrgent = n.priority==='urgent';
              const isHigh = n.priority==='high';
              return (
                <div key={n.id} style={{ ...card, padding:'20px 22px', borderLeft:`5px solid ${isUrgent?'#ef4444':isHigh?'#f59e0b':cat.color}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px', flexWrap:'wrap' }}>
                        {isUrgent && <span style={{ background:'#fee2e2', color:'#dc2626', padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>🔴 URGENT</span>}
                        {isHigh && <span style={{ background:'#fef3c7', color:'#92400e', padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>⬆️ HIGH</span>}
                        <span style={{ background:cat.color+'22', color:cat.color, padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600' }}>{cat.label}</span>
                      </div>
                      <h3 style={{ margin:'0 0 8px', fontSize:'16px', fontWeight:'700', color:theme.text, lineHeight:'1.3' }}>{n.title}</h3>
                      <p style={{ margin:'0 0 14px', fontSize:'14px', color:theme.subtext, lineHeight:'1.7', whiteSpace:'pre-wrap' }}>{n.content}</p>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        {n.author_pic ? (
                          <img src={n.author_pic} alt="" style={{ width:'28px', height:'28px', borderRadius:'50%', objectFit:'cover', border:`2px solid ${theme.border}` }} />
                        ) : (
                          <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:theme.accent+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700', color:theme.accent }}>
                            {n.author_name?.[0]}
                          </div>
                        )}
                        <div>
                          <span style={{ fontSize:'13px', fontWeight:'600', color:theme.text }}>{n.author_name}</span>
                          {n.author_designation && <span style={{ fontSize:'11px', color:theme.subtext, marginLeft:'6px' }}>· {n.author_designation}</span>}
                        </div>
                        <span style={{ fontSize:'12px', color:theme.subtext, marginLeft:'auto' }}>🕐 {timeAgo(n.created_at)}</span>
                      </div>
                    </div>
                    {(isAdmin || n.author_id === user?.id) && (
                      <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                        <button onClick={()=>openEdit(n)} style={{ background:'#dbeafe', color:'#1d4ed8', border:'none', borderRadius:'6px', padding:'5px 10px', cursor:'pointer', fontSize:'12px' }}>✏️</button>
                        <button onClick={()=>handleDelete(n.id)} style={{ background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:'6px', padding:'5px 10px', cursor:'pointer', fontSize:'12px' }}>🗑️</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── RIGHT: Birthdays + News ── */}
      <div style={{ position:'sticky', top:'20px', display:'flex', flexDirection:'column', gap:'16px' }}>

        {/* Tab switcher */}
        <div style={{ display:'flex', gap:'4px', background:theme.bg, padding:'4px', borderRadius:'10px' }}>
          {[['birthdays','🎂 Birthdays'],['news','📰 Live News']].map(([id,label])=>(
            <button key={id} onClick={()=>setActiveRight(id)} style={{
              flex:1, padding:'8px', border:'none', borderRadius:'8px', cursor:'pointer',
              background:activeRight===id?theme.card:'transparent',
              color:activeRight===id?theme.text:theme.subtext,
              fontWeight:activeRight===id?'600':'400', fontSize:'13px',
              boxShadow:activeRight===id?'0 1px 4px rgba(0,0,0,0.08)':'none'
            }}>{label}</button>
          ))}
        </div>

        {/* ── BIRTHDAYS PANEL ── */}
        {activeRight==='birthdays' && (
          <div style={{ ...card, overflow:'hidden' }}>
            <div style={{ padding:'14px 16px', borderBottom:`1px solid ${theme.border}`, background:theme.bg }}>
              <h3 style={{ margin:0, fontSize:'15px', fontWeight:'700', color:theme.text }}>🎂 Team Birthdays</h3>
              <p style={{ margin:'3px 0 0', fontSize:'12px', color:theme.subtext }}>{profiles.filter(p=>p.birthday).length} birthdays on record</p>
            </div>

            <div style={{ maxHeight:'580px', overflowY:'auto' }}>
              {/* Today */}
              {birthdayGroups.today.length > 0 && (
                <>
                  <SectionHeader title="🎉 TODAY" count={birthdayGroups.today.length} color="#dc2626" />
                  {birthdayGroups.today.map(p => <BirthdayCard key={p.id} p={p} highlight={true} />)}
                </>
              )}

              {/* Tomorrow */}
              {birthdayGroups.tomorrow.length > 0 && (
                <>
                  <SectionHeader title="📅 Tomorrow" count={birthdayGroups.tomorrow.length} color="#2563eb" />
                  {birthdayGroups.tomorrow.map(p => <BirthdayCard key={p.id} p={p} />)}
                </>
              )}

              {/* This Week */}
              {birthdayGroups.thisWeek.length > 0 && (
                <>
                  <SectionHeader title="📆 This Week" count={birthdayGroups.thisWeek.length} color="#7c3aed" />
                  {birthdayGroups.thisWeek.map(p => <BirthdayCard key={p.id} p={p} />)}
                </>
              )}

              {/* This Month */}
              {birthdayGroups.thisMonth.length > 0 && (
                <>
                  <SectionHeader title="🗓️ This Month" count={birthdayGroups.thisMonth.length} color="#059669" />
                  {birthdayGroups.thisMonth.map(p => <BirthdayCard key={p.id} p={p} />)}
                </>
              )}

              {/* Upcoming */}
              {birthdayGroups.upcoming.length > 0 && (
                <>
                  <SectionHeader title="🔜 Upcoming" count={birthdayGroups.upcoming.length} />
                  {birthdayGroups.upcoming.map(p => <BirthdayCard key={p.id} p={p} />)}
                </>
              )}

              {profiles.filter(p=>p.birthday).length === 0 && (
                <div style={{ padding:'32px', textAlign:'center', color:theme.subtext }}>
                  <div style={{ fontSize:'32px', marginBottom:'8px' }}>🎂</div>
                  <p style={{ margin:0, fontSize:'13px' }}>No birthdays on record yet</p>
                  <p style={{ margin:'4px 0 0', fontSize:'12px' }}>Trainers can add their birthday from Profile page</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── NEWS PANEL ── */}
        {activeRight==='news' && (
          <div style={{ ...card, overflow:'hidden' }}>
            <div style={{ padding:'14px 16px', borderBottom:`1px solid ${theme.border}`, background:theme.bg }}>
              <h3 style={{ margin:'0 0 10px', fontSize:'15px', fontWeight:'700', color:theme.text }}>📰 Live News</h3>
              <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                {NEWS_SOURCES.map(s=>(
                  <button key={s.id} onClick={()=>setNewsSource(s.id)} style={{
                    padding:'4px 10px', border:'none', borderRadius:'20px', cursor:'pointer', fontSize:'11px', fontWeight:'600',
                    background:newsSource===s.id?theme.accent:theme.card,
                    color:newsSource===s.id?'#fff':theme.subtext
                  }}>{s.flag} {s.name.split(' ')[0]}</button>
                ))}
              </div>
            </div>

            <div style={{ maxHeight:'520px', overflowY:'auto' }}>
              {newsLoading ? (
                <div style={{ padding:'40px', textAlign:'center', color:theme.subtext }}>
                  <div style={{ fontSize:'28px', marginBottom:'8px' }}>⏳</div>
                  <p style={{ margin:0, fontSize:'13px' }}>Fetching latest news...</p>
                </div>
              ) : news.length === 0 ? (
                <div style={{ padding:'40px', textAlign:'center', color:theme.subtext }}>
                  <div style={{ fontSize:'28px', marginBottom:'8px' }}>📡</div>
                  <p style={{ margin:0, fontSize:'13px' }}>Could not load news feed</p>
                  <button onClick={loadNews} style={{ marginTop:'10px', padding:'6px 16px', background:theme.accent, color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'12px' }}>Try Again</button>
                </div>
              ) : (
                news.map((item, i) => (
                  <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" style={{ display:'block', padding:'12px 14px', borderBottom:`1px solid ${theme.border}`, textDecoration:'none' }}
                    onMouseEnter={e=>e.currentTarget.style.background=theme.bg}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    {item.thumbnail && (
                      <img src={item.thumbnail} alt="" style={{ width:'100%', height:'90px', objectFit:'cover', borderRadius:'8px', marginBottom:'7px' }}
                        onError={e=>e.target.style.display='none'} />
                    )}
                    <p style={{ margin:'0 0 5px', fontSize:'13px', fontWeight:'600', color:theme.text, lineHeight:'1.4' }}>{item.title}</p>
                    {item.description && <p style={{ margin:'0 0 5px', fontSize:'11px', color:theme.subtext, lineHeight:'1.4' }}>{item.description.slice(0,100)}...</p>}
                    <span style={{ fontSize:'11px', color:theme.subtext }}>{item.pubDate ? timeAgo(item.pubDate) : ''}</span>
                  </a>
                ))
              )}
            </div>

            <div style={{ padding:'10px 14px', borderTop:`1px solid ${theme.border}`, textAlign:'center' }}>
              <button onClick={loadNews} disabled={newsLoading} style={{ background:'none', border:`1px solid ${theme.border}`, color:theme.subtext, padding:'6px 16px', borderRadius:'20px', cursor:'pointer', fontSize:'12px' }}>
                {newsLoading ? '⏳ Loading...' : '🔄 Refresh'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
