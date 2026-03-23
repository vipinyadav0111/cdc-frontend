import { Outlet, NavLink } from 'react-router-dom';
import { getUser, logout, api } from '../api';
import { useState, useEffect } from 'react';

const THEMES = [
  {
    id:'midnight', name:'Midnight Blue', emoji:'🌑', dark:true,
    sidebar:'#0f172a', sidebarBorder:'#1e293b', accent:'#3b82f6',
    bg:'#f1f5f9', card:'#ffffff', text:'#0f172a', subtext:'#64748b',
    navText:'#94a3b8', border:'#e2e8f0', headerText:'#ffffff',
  },
  {
    id:'emerald', name:'Emerald Dark', emoji:'🌿', dark:true,
    sidebar:'#064e3b', sidebarBorder:'#065f46', accent:'#10b981',
    bg:'#f0fdf4', card:'#ffffff', text:'#064e3b', subtext:'#6b7280',
    navText:'#a7f3d0', border:'#d1fae5', headerText:'#ffffff',
  },
  {
    id:'royal', name:'Royal Purple', emoji:'👑', dark:true,
    sidebar:'#2e1065', sidebarBorder:'#3b0764', accent:'#a855f7',
    bg:'#faf5ff', card:'#ffffff', text:'#2e1065', subtext:'#7c3aed',
    navText:'#d8b4fe', border:'#e9d5ff', headerText:'#ffffff',
  },
  {
    id:'rose', name:'Rose Pastel', emoji:'🌸', dark:false,
    sidebar:'#fff1f2', sidebarBorder:'#fecdd3', accent:'#f43f5e',
    bg:'#fff1f2', card:'#ffffff', text:'#881337', subtext:'#9f1239',
    navText:'#fb7185', border:'#fecdd3', headerText:'#881337',
  },
  {
    id:'sky', name:'Sky Pastel', emoji:'☁️', dark:false,
    sidebar:'#e0f2fe', sidebarBorder:'#bae6fd', accent:'#0284c7',
    bg:'#f0f9ff', card:'#ffffff', text:'#0c4a6e', subtext:'#0369a1',
    navText:'#0369a1', border:'#bae6fd', headerText:'#0c4a6e',
  },
  {
    id:'peach', name:'Peach Pastel', emoji:'🍑', dark:false,
    sidebar:'#fff7ed', sidebarBorder:'#fed7aa', accent:'#ea580c',
    bg:'#fff7ed', card:'#ffffff', text:'#7c2d12', subtext:'#9a3412',
    navText:'#c2410c', border:'#fed7aa', headerText:'#7c2d12',
  },
];

// Calculate shift info from punch-in time
function getShiftInfo(punchInStr) {
  if (!punchInStr) return null;
  const [ph, pm] = punchInStr.slice(0,5).split(':').map(Number);
  const punchMins = ph * 60 + pm;
  const fullEnd   = punchMins + 8 * 60 + 30;
  const shortEnd  = punchMins + 6 * 60 + 30;

  // Current IST minutes since midnight
  const now     = new Date();
  const istMins = ((now.getUTCHours() * 60 + now.getUTCMinutes()) + 5 * 60 + 30) % (24 * 60);

  const toHHMM = (m) => {
    const t = ((m % (24*60)) + 24*60) % (24*60);
    const hh = Math.floor(t/60), mm = t%60;
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const h12  = hh % 12 || 12;
    return `${String(h12).padStart(2,'0')}:${String(mm).padStart(2,'0')} ${ampm}`;
  };
  const fmtLeft = (rem) => {
    if (rem <= 0) return '✓ Done';
    return rem >= 60
      ? `${Math.floor(rem/60)}h ${rem%60}m left`
      : `${rem}m left`;
  };

  return {
    fullEndTime:  toHHMM(fullEnd),    // e.g. "06:30 PM"
    shortEndTime: toHHMM(shortEnd),   // e.g. "04:30 PM"
    fullLeft:     fmtLeft(fullEnd  - istMins),
    shortLeft:    fmtLeft(shortEnd - istMins),
    fullDone:     fullEnd  - istMins <= 0,
    shortDone:    shortEnd - istMins <= 0,
  };
}

export default function Layout() {
  const user       = getUser();
  const [time,       setTime]       = useState(new Date());
  const [themeId,    setThemeId]    = useState(() => localStorage.getItem('cdc_theme') || 'midnight');
  const [showThemes, setShowThemes] = useState(false);
  const [profile,    setProfile]    = useState(null);
  const [todayTodo,  setTodayTodo]  = useState(null);

  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const [currentSlotTask, setCurrentSlotTask] = useState(null);

  // Load profile + today's todo for punch-in + current timetable slot
  useEffect(() => {
    if (!user?.id) return;
    api('/profile/' + user.id).then(d => setProfile(d)).catch(() => {});
    const today = new Date().toISOString().split('T')[0];
    api('/todos/date/' + today).then(d => setTodayTodo(d)).catch(() => {});
    // Load current slot task — refresh every minute
    const loadSlot = () => {
      api('/timetable/current').then(cur => {
        const nowMins = new Date().getHours()*60 + new Date().getMinutes();
        const inSlot = nowMins >= 540 && nowMins <= 990;
        const mySlot = (cur?.inClass||[]).find(t => String(t.trainer_id) === String(user?.id));
        if(mySlot) {
          setCurrentSlotTask({ type:'class', label: mySlot.class_name, sub: mySlot.institution });
        } else if(inSlot) {
          // Check todo for current slot
          api('/todos/date/' + today).then(td => {
            const slotRanges = [[540,590],[590,640],[640,690],[690,740],[740,790],[790,840],[840,890],[890,940],[940,990]];
            const slotIdx = slotRanges.findIndex(([s,e]) => nowMins>=s && nowMins<e);
            if(slotIdx >= 0 && td?.slots?.[slotIdx]) {
              const slot = td.slots[slotIdx];
              const label = slot.task || (slot.is_class ? slot.class_name : null);
              if(label) setCurrentSlotTask({ type:'todo', label, sub: slot.slot_start?.slice(0,5)+'–'+slot.slot_end?.slice(0,5) });
              else setCurrentSlotTask({ type:'free' });
            } else { setCurrentSlotTask(null); }
          }).catch(() => {});
        } else { setCurrentSlotTask(null); }
      }).catch(() => {});
    };
    loadSlot();
    const t2 = setInterval(loadSlot, 60000);
    return () => clearInterval(t2);
  }, []);

  const changeTheme = (id) => {
    setThemeId(id); localStorage.setItem('cdc_theme', id); setShowThemes(false);
  };

  // IST time
  const istNow    = new Date(time.getTime() + (5*60+30)*60000);
  const timeStr   = istNow.toISOString().slice(11,19);
  const dateStr   = istNow.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });

  const shiftInfo   = getShiftInfo(todayTodo?.punch_in_time);
  const picSrc      = profile?.profile_picture || null;
  const initials    = (user?.name || '?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const designation = profile?.designation || (user?.role==='super_admin' ? 'Super Admin' : 'Trainer');

  const navItems = [
    { to:'/dashboard',   icon:'🏠', label:'Dashboard'    },
    { to:'/cmp',          icon:'🎓', label:'CMP 2026'     },
    { to:'/timetable',   icon:'📅', label:'Timetable'    },
    { to:'/duties',      icon:'📋', label:'Duties'       },
    { to:'/noticeboard', icon:'📌', label:'Notice Board' },
    { to:'/attendance',  icon:'📊', label:'Attendance'   },
    { to:'/lessonplans', icon:'📒', label:'Lesson Plans' },
    { to:'/meetings',    icon:'🤝', label:'Meetings'     },
    { to:'/messages',    icon:'💬', label:'Messages'     },
    { to:'/todo',        icon:'✅', label:'To Do'        },
    ...(user?.role === 'super_admin' ? [
      { to:'/analytics', icon:'📈', label:'Analytics'    },
      { to:'/settings',  icon:'⚙️', label:'Settings'    },
      { to:'/users',     icon:'👥', label:'Manage Users' },
    ] : []),
    { to:'/hiring',  icon:'📈', label:'Hiring Trends' },
    { to:'/reports', icon:'📊', label:'Reports' },
    { to:'/profile', icon:'👤', label:'Profile' },
  ];

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:'Segoe UI, Arial, sans-serif', background:theme.bg }}>

      {/* ═══════════════ SIDEBAR ═══════════════ */}
      <div style={{
        width:'228px', background:theme.sidebar,
        borderRight:`1px solid ${theme.sidebarBorder}`,
        display:'flex', flexDirection:'column',
        position:'fixed', top:0, left:0, bottom:0, zIndex:100,
      }}>

        {/* ── TOP: fixed, never scrolls ── */}
        <div style={{ padding:'14px 14px 10px', flexShrink:0, borderBottom:`1px solid ${theme.sidebarBorder}` }}>

          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'13px' }}>
            <span style={{ fontSize:'22px', flexShrink:0 }}>🎓</span>
            <div>
              <div style={{ color:theme.headerText, fontWeight:'800', fontSize:'10.5px', letterSpacing:'0.7px', lineHeight:1.25 }}>
                CDC MANAGEMENT
              </div>
              <div style={{ color:theme.accent, fontWeight:'700', fontSize:'10.5px', letterSpacing:'0.7px', lineHeight:1.25 }}>
                SYSTEM
              </div>
            </div>
          </div>

          {/* Profile row */}
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'11px' }}>
            {/* Profile picture — round */}
            {picSrc ? (
              <img src={picSrc} alt="" style={{ width:'44px', height:'44px', borderRadius:'50%', objectFit:'cover', flexShrink:0, border:`2px solid ${theme.accent}`, boxShadow:'0 0 0 2px rgba(255,255,255,0.15)' }} />
            ) : (
              <div style={{ width:'44px', height:'44px', borderRadius:'50%', flexShrink:0, background:theme.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'17px', fontWeight:'800', color:'#fff', border:`2px solid ${theme.sidebarBorder}` }}>
                {initials}
              </div>
            )}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:theme.headerText, fontWeight:'700', fontSize:'12px', lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ color:theme.navText, fontSize:'10px', opacity:0.75, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:'1px' }}>
                {designation}
              </div>
            </div>
          </div>

          {/* Live clock */}
          <div style={{ background:theme.sidebarBorder, borderRadius:'8px', padding:'7px 11px', marginBottom:'6px' }}>
            <div style={{ color:theme.accent, fontFamily:'monospace', fontWeight:'800', fontSize:'22px', letterSpacing:'2px', lineHeight:1 }}>
              {timeStr}
            </div>
            <div style={{ color:theme.navText, fontSize:'12px', opacity:0.65, marginTop:'4px' }}>
              {dateStr}
            </div>
          </div>

          {/* Current Task */}
          {currentSlotTask && (
            <div style={{ background: currentSlotTask.type==='class' ? 'rgba(29,78,216,0.25)' : theme.sidebarBorder, borderRadius:'8px', padding:'7px 11px', marginBottom:'6px', border: currentSlotTask.type==='class' ? '1px solid rgba(29,78,216,0.4)' : 'none' }}>
              <div style={{ fontSize:'9px', fontWeight:'700', color: currentSlotTask.type==='class' ? '#93c5fd' : theme.navText, opacity: currentSlotTask.type==='class' ? 1 : 0.6, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'4px' }}>
                {currentSlotTask.type==='class' ? '🟢 In Class' : '📋 Current Task'}
              </div>
              <div style={{ fontSize:'11px', fontWeight:'700', color: currentSlotTask.type==='class' ? '#fff' : theme.navText, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {currentSlotTask.label}
              </div>
              {currentSlotTask.sub && (
                <div style={{ fontSize:'9px', color: currentSlotTask.type==='class' ? '#93c5fd' : theme.navText, opacity:0.6, marginTop:'2px' }}>
                  {currentSlotTask.sub}
                </div>
              )}
            </div>
          )}

          {/* Shift countdown */}
          {shiftInfo ? (
            <div style={{ background:theme.sidebarBorder, borderRadius:'8px', padding:'7px 11px' }}>
              <div style={{ fontSize:'9px', fontWeight:'700', color:theme.navText, opacity:0.6, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'5px' }}>
                Shift Status
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                {/* Full shift row */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'10px', color:theme.navText, opacity:0.75 }}>⏰ Full out</span>
                  <span style={{ fontSize:'11px', fontWeight:'800', color: shiftInfo.fullDone ? '#10b981' : theme.accent, fontFamily:'monospace' }}>
                    {shiftInfo.fullEndTime}
                  </span>
                </div>
                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <span style={{ fontSize:'9px', color: shiftInfo.fullDone?'#10b981':theme.navText, opacity:0.7 }}>
                    {shiftInfo.fullLeft}
                  </span>
                </div>
                {/* Short leave row */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'2px' }}>
                  <span style={{ fontSize:'10px', color:theme.navText, opacity:0.75 }}>🏃 Short leave</span>
                  <span style={{ fontSize:'11px', fontWeight:'800', color: shiftInfo.shortDone ? '#10b981' : '#f59e0b', fontFamily:'monospace' }}>
                    {shiftInfo.shortEndTime}
                  </span>
                </div>
                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <span style={{ fontSize:'9px', color: shiftInfo.shortDone?'#10b981':'#f59e0b', opacity:0.8 }}>
                    {shiftInfo.shortLeft}
                  </span>
                </div>
                <div style={{ fontSize:'9px', color:theme.navText, opacity:0.45, marginTop:'1px', borderTop:`1px solid ${theme.sidebarBorder}`, paddingTop:'4px' }}>
                  Punched in: {todayTodo?.punch_in_time?.slice(0,5)}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background:theme.sidebarBorder, borderRadius:'8px', padding:'6px 11px' }}>
              <div style={{ fontSize:'10px', color:theme.navText, opacity:0.55 }}>
                ⏱ Fill To Do to see shift status
              </div>
            </div>
          )}
        </div>

        {/* ── NAV — SCROLLABLE ── */}
        <nav style={{
          flex:1,
          overflowY:'auto',
          padding:'8px 12px',
          scrollbarWidth:'thin',
          scrollbarColor:`${theme.sidebarBorder} transparent`,
        }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:'9px',
              padding:'9px 12px', borderRadius:'9px', textDecoration:'none',
              color: isActive ? '#ffffff' : theme.navText,
              background: isActive ? theme.accent : 'transparent',
              fontWeight: isActive ? '600' : '400',
              fontSize:'13px', marginBottom:'1px', transition:'all 0.12s',
            })}>
              <span style={{ fontSize:'15px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* ── BOTTOM: theme + sign out — fixed ── */}
        <div style={{ padding:'10px 12px 14px', borderTop:`1px solid ${theme.sidebarBorder}`, flexShrink:0 }}>
          <button onClick={() => setShowThemes(s => !s)} style={{
            width:'100%', padding:'8px 10px', marginBottom:'6px',
            background: showThemes ? theme.accent : theme.sidebarBorder,
            color: showThemes ? '#fff' : theme.navText,
            border:'none', borderRadius:'8px', cursor:'pointer',
            fontSize:'12px', fontWeight:'600', textAlign:'left',
            display:'flex', alignItems:'center', gap:'6px'
          }}>
            🎨 <span>Change Theme</span>
          </button>

          {showThemes && (
            <div style={{
              background:theme.card, borderRadius:'10px', padding:'9px',
              marginBottom:'6px', border:`1px solid ${theme.border}`,
              boxShadow:'0 -4px 20px rgba(0,0,0,0.15)',
              maxHeight:'200px', overflowY:'auto'
            }}>
              <div style={{ fontSize:'9px', fontWeight:'700', color:theme.subtext, marginBottom:'5px', textTransform:'uppercase' }}>Dark</div>
              {THEMES.filter(t => t.dark).map(t => (
                <button key={t.id} onClick={() => changeTheme(t.id)} style={{
                  width:'100%', padding:'5px 8px', marginBottom:'3px',
                  background: themeId===t.id ? t.accent : 'transparent',
                  color: themeId===t.id ? '#fff' : theme.text,
                  border:`1px solid ${themeId===t.id ? t.accent : theme.border}`,
                  borderRadius:'6px', cursor:'pointer', fontSize:'11px',
                  textAlign:'left', display:'flex', alignItems:'center', gap:'5px'
                }}>
                  {t.emoji} {t.name} {themeId===t.id && <span style={{ marginLeft:'auto' }}>✓</span>}
                </button>
              ))}
              <div style={{ fontSize:'9px', fontWeight:'700', color:theme.subtext, margin:'7px 0 5px', textTransform:'uppercase' }}>Light</div>
              {THEMES.filter(t => !t.dark).map(t => (
                <button key={t.id} onClick={() => changeTheme(t.id)} style={{
                  width:'100%', padding:'5px 8px', marginBottom:'3px',
                  background: themeId===t.id ? t.accent : 'transparent',
                  color: themeId===t.id ? '#fff' : theme.text,
                  border:`1px solid ${themeId===t.id ? t.accent : theme.border}`,
                  borderRadius:'6px', cursor:'pointer', fontSize:'11px',
                  textAlign:'left', display:'flex', alignItems:'center', gap:'5px'
                }}>
                  {t.emoji} {t.name} {themeId===t.id && <span style={{ marginLeft:'auto' }}>✓</span>}
                </button>
              ))}
            </div>
          )}

          <button onClick={logout} style={{
            width:'100%', padding:'9px',
            background:theme.sidebarBorder, color:theme.navText,
            border:'none', borderRadius:'8px', cursor:'pointer',
            fontSize:'13px', fontWeight:'500',
            display:'flex', alignItems:'center', justifyContent:'center', gap:'6px'
          }}>
            🚪 Sign Out
          </button>
        </div>
      </div>

      {/* ═══════════════ MAIN CONTENT ═══════════════ */}
      <div style={{ marginLeft:'228px', flex:1, padding:'28px', minHeight:'100vh' }}>
        <Outlet context={{ theme }} />
      </div>
    </div>
  );
}
