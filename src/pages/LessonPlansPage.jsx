import { useState, useEffect, useRef } from 'react';
import { api, getUser } from '../api';
import { useOutletContext } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const DOMAINS  = ['Aptitude','Verbal','Technical','Soft Skills'];

// ── Tiny helpers ──────────────────────────────────────────────────
function Avatar({ name, size=30 }) {
  const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899'];
  const c = colors[(name||'').charCodeAt(0) % colors.length];
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:c, flexShrink:0,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*0.38+'px', fontWeight:'700', color:'#fff' }}>
      {(name||'?')[0].toUpperCase()}
    </div>
  );
}

function Badge({ ok, label, subLabel }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
      <span style={{
        background: ok ? '#d1fae5' : '#fee2e2',
        color:      ok ? '#065f46' : '#991b1b',
        padding:'3px 10px', borderRadius:'20px',
        fontSize:'11px', fontWeight:'700', whiteSpace:'nowrap'
      }}>
        {ok ? '✅ Uploaded' : '🔴 Pending'}
      </span>
      {subLabel && <span style={{ fontSize:'10px', color:'#94a3b8' }}>{subLabel}</span>}
    </div>
  );
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'});
}

// ── Upload Modal ──────────────────────────────────────────────────
function UploadModal({ row, type, theme, onClose, onDone }) {
  // row = { trainer_id, trainer_name, class_name, institution, domain, section_id, student_count, plan_id }
  const [file,    setFile]    = useState(null);
  const [mode,    setMode]    = useState('replace');
  const [preview, setPreview] = useState(null);
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState('');
  const fileRef = useRef();
  const user    = getUser();

  const isLP = type === 'lessonplan';

  const handleUpload = async () => {
    if (!file) { setErr('Please select a file'); return; }
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('file',        file);
      fd.append('class_name',  row.class_name);
      fd.append('institution', row.institution || '');
      fd.append('domain',      row.domain);
      fd.append('mode',        mode);
      if (user.role === 'super_admin' && row.trainer_id) {
        fd.append('trainer_id', row.trainer_id);
      }

      const token = localStorage.getItem('token');
      const endpoint = isLP
        ? `${API_BASE}/lessonplans/upload`
        : `${API_BASE}/lessonplans/upload-students`;

      const res  = await fetch(endpoint, { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body:fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setPreview(data);
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const inp = { width:'100%', padding:'8px 11px', borderRadius:'8px', fontSize:'13px',
    border:`1px solid ${theme.border}`, background:theme.bg, color:theme.text, boxSizing:'border-box' };

  const templateHref = isLP
    ? `${API_BASE}/lessonplans/template`
    : `${API_BASE}/lessonplans/student-template`;

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',
      alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px' }} onClick={onClose}>
      <div style={{ background:theme.card,borderRadius:'16px',width:'100%',maxWidth:'460px',
        boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'16px 20px 12px',borderBottom:`1px solid ${theme.border}`,
          display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
          <div>
            <div style={{ fontWeight:'700',fontSize:'15px',color:theme.text }}>
              {isLP ? '📋 Upload Lesson Plan' : '👥 Upload Student List'}
            </div>
            <div style={{ fontSize:'12px',color:theme.subtext,marginTop:'3px' }}>
              <strong>{row.class_name}</strong> · {row.institution} · {row.domain}
              {user.role==='super_admin' && <span style={{ color:theme.accent }}> · {row.trainer_name}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:'18px',cursor:'pointer',color:theme.subtext }}>✕</button>
        </div>

        <div style={{ padding:'16px 20px',display:'flex',flexDirection:'column',gap:'13px' }}>
          {/* File drop zone */}
          <div>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px' }}>
              <label style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,textTransform:'uppercase' }}>
                {isLP ? 'Lesson Plan Excel File' : 'Student List Excel File'}
              </label>
              <a href={templateHref} target="_blank" rel="noopener noreferrer"
                style={{ fontSize:'11px',color:theme.accent,textDecoration:'none' }}>
                ⬇️ Download Template
              </a>
            </div>
            <div onClick={()=>fileRef.current?.click()} style={{
              border:`2px dashed ${file?theme.accent:theme.border}`,borderRadius:'10px',
              padding:'20px',textAlign:'center',cursor:'pointer',
              background:file?theme.accent+'0a':theme.bg,transition:'all 0.15s'
            }}>
              {file ? (
                <div style={{ color:theme.accent,fontWeight:'600',fontSize:'13px' }}>📄 {file.name}</div>
              ) : (
                <>
                  <div style={{ fontSize:'28px',marginBottom:'5px' }}>📂</div>
                  <div style={{ color:theme.subtext,fontSize:'13px' }}>Click to browse Excel file</div>
                  <div style={{ color:theme.subtext,fontSize:'11px',marginTop:'3px',opacity:0.7 }}>
                    {isLP ? 'Same format as your university system (Col A=Session, C=Date, D=Topic)'
                           : 'Roll No. and Name columns required'}
                  </div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:'none' }}
              onChange={e=>{ setFile(e.target.files[0]); setPreview(null); setErr(''); }} />
          </div>

          {/* Mode */}
          <div>
            <label style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,display:'block',marginBottom:'6px',textTransform:'uppercase' }}>
              Upload Mode
            </label>
            <div style={{ display:'flex',gap:'8px' }}>
              {['replace','merge'].map(m=>(
                <button key={m} onClick={()=>setMode(m)} style={{
                  flex:1,padding:'7px',borderRadius:'8px',cursor:'pointer',fontSize:'12px',
                  border:`2px solid ${mode===m?theme.accent:theme.border}`,
                  background:mode===m?theme.accent+'12':'transparent',
                  color:mode===m?theme.accent:theme.text,
                  fontWeight:mode===m?'700':'400'
                }}>
                  {m==='replace'?'🔄 Replace All':'➕ Merge'}
                </button>
              ))}
            </div>
          </div>

          {err && <div style={{ background:'#fee2e2',color:'#dc2626',padding:'9px 12px',borderRadius:'8px',fontSize:'12px' }}>⚠️ {err}</div>}

          {/* Preview */}
          {preview && (
            <div style={{ background:'#d1fae5',color:'#065f46',padding:'12px 14px',borderRadius:'10px',fontSize:'12px' }}>
              <div style={{ fontWeight:'700',marginBottom:'5px' }}>
                ✅ {isLP ? `${preview.sessions_parsed} sessions` : `${preview.inserted} students`} uploaded successfully!
              </div>
              {preview.preview?.slice(0,3).map((p,i)=>(
                <div key={i} style={{ fontSize:'11px',opacity:0.8 }}>
                  {isLP ? `Session ${p.session_no}: ${p.topic}` : `${p.roll_no} — ${p.name}`}
                </div>
              ))}
              {preview.preview?.length > 3 && <div style={{ fontSize:'11px',opacity:0.6 }}>...and more</div>}
            </div>
          )}
        </div>

        <div style={{ padding:'12px 20px 16px',borderTop:`1px solid ${theme.border}`,display:'flex',gap:'9px',justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'8px 16px',borderRadius:'8px',
            border:`1px solid ${theme.border}`,background:'transparent',color:theme.text,cursor:'pointer',fontSize:'13px' }}>
            {preview?'Close':'Cancel'}
          </button>
          {!preview && (
            <button onClick={handleUpload} disabled={busy||!file} style={{
              padding:'8px 18px',borderRadius:'8px',border:'none',background:theme.accent,
              color:'#fff',cursor:'pointer',fontSize:'13px',fontWeight:'600',
              opacity:(busy||!file)?0.6:1
            }}>
              {busy?'Uploading…':'⬆️ Upload'}
            </button>
          )}
          {preview && (
            <button onClick={()=>{ onDone(); onClose(); }} style={{
              padding:'8px 18px',borderRadius:'8px',border:'none',background:theme.accent,
              color:'#fff',cursor:'pointer',fontSize:'13px',fontWeight:'600'
            }}>Done ✓</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Detail modal — session-by-session view ────────────────────────
function DetailModal({ row, theme, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    api(`/lessonplans/sessions?trainer_id=${row.trainer_id}&class_name=${encodeURIComponent(row.class_name)}&domain=${encodeURIComponent(row.domain)}`)
      .then(d=>setData(d)).catch(console.error).finally(()=>setLoading(false));
  }, []);

  const statusOf = s => {
    if (s.taught_date) {
      const planned = s.planned_date ? new Date(s.planned_date) : null;
      const taught  = new Date(s.taught_date);
      if (!planned) return { label:'✅ Done',     bg:'#d1fae5', color:'#065f46' };
      const diff = Math.round((taught-planned)/86400000);
      if (diff <= 3) return { label:'✅ On Time', bg:'#d1fae5', color:'#065f46' };
      return           { label:`⚠️ Delayed ${diff}d`,bg:'#fef3c7', color:'#92400e' };
    }
    if (s.not_covered) return { label:'⏭️ Skipped',  bg:'#e0e7ff', color:'#3730a3' };
    const today = new Date(); today.setHours(0,0,0,0);
    if (s.planned_date && new Date(s.planned_date) < today)
      return { label:'🔴 Overdue', bg:'#fee2e2', color:'#991b1b' };
    return { label:'🕐 Pending', bg:'#f1f5f9', color:'#475569' };
  };

  const fmtD = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—';

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',
      alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px' }} onClick={onClose}>
      <div style={{ background:theme.card,borderRadius:'16px',width:'100%',maxWidth:'800px',
        maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',
        boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px 12px',borderBottom:`1px solid ${theme.border}`,
          display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:'700',fontSize:'16px',color:theme.text }}>
              📋 {row.class_name} — {row.domain}
            </div>
            <div style={{ fontSize:'12px',color:theme.subtext,marginTop:'2px' }}>
              {row.trainer_name} · {row.institution}
              {data?.plan && <span style={{ marginLeft:'10px',color:theme.subtext }}>
                {data.plan.total_sessions} sessions · Uploaded {fmtDate(data.plan.uploaded_at)}
              </span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:'20px',cursor:'pointer',color:theme.subtext }}>✕</button>
        </div>
        <div style={{ flex:1,overflowY:'auto' }}>
          {loading ? <div style={{ padding:'32px',textAlign:'center',color:theme.subtext }}>Loading…</div>
          : !data?.plan ? (
            <div style={{ padding:'32px',textAlign:'center',color:theme.subtext }}>
              <div style={{ fontSize:'32px',marginBottom:'8px' }}>📭</div>
              <p style={{ margin:0 }}>No lesson plan uploaded yet for this section.</p>
            </div>
          ) : (
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'13px' }}>
              <thead>
                <tr style={{ background:theme.bg }}>
                  {['#','Planned Date','Topic','Taught On','Status','Comment'].map(h=>(
                    <th key={h} style={{ padding:'10px 12px',textAlign:'left',color:theme.subtext,
                      fontWeight:'600',fontSize:'11px',textTransform:'uppercase',
                      borderBottom:`1px solid ${theme.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.sessions.map((s,i)=>{
                  const st = statusOf(s);
                  return (
                    <tr key={s.id} style={{ background:i%2===0?theme.card:theme.bg,borderBottom:`1px solid ${theme.border}` }}>
                      <td style={{ padding:'9px 12px',color:theme.subtext,fontWeight:'700' }}>{s.session_no}</td>
                      <td style={{ padding:'9px 12px',color:theme.text,whiteSpace:'nowrap' }}>{fmtD(s.planned_date)}</td>
                      <td style={{ padding:'9px 12px',color:theme.text,maxWidth:'240px' }}>{s.topic}</td>
                      <td style={{ padding:'9px 12px',color:theme.text,whiteSpace:'nowrap' }}>{fmtD(s.taught_date)}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ background:st.bg,color:st.color,padding:'2px 8px',borderRadius:'20px',fontSize:'11px',fontWeight:'600',whiteSpace:'nowrap' }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding:'9px 12px',color:theme.subtext,fontSize:'11px',fontStyle:'italic' }}>{s.comment||'—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function LessonPlansPage() {
  const { theme } = useOutletContext();
  const user      = getUser();
  const isAdmin   = user?.role === 'super_admin';

  const [rows,       setRows]       = useState([]);   // flat list from /status
  const [trainers,   setTrainers]   = useState([]);
  const [selTrainer, setSelTrainer] = useState('');   // '' = all
  const [filter,     setFilter]     = useState('all');// all | lp_pending | stu_pending | both_pending | complete
  const [loading,    setLoading]    = useState(true);
  const [notifying,  setNotifying]  = useState(false);
  const [notifyMsg,  setNotifyMsg]  = useState('');

  const [uploadModal, setUploadModal] = useState(null); // {row, type}
  const [detailModal, setDetailModal] = useState(null); // row

  useEffect(()=>{
    if (isAdmin) api('/lessonplans/trainers').then(setTrainers).catch(()=>{});
    load();
  },[]);

  const load = async (tid) => {
    setLoading(true);
    try {
      const qs  = tid ? `?trainer_id=${tid}` : '';
      const data = await api(`/lessonplans/status${qs}`);
      setRows(data);
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  };

  const handleTrainer = (tid) => {
    setSelTrainer(tid);
    load(tid || undefined);
  };

  const notify = async () => {
    setNotifying(true); setNotifyMsg('');
    try {
      const res = await api('/lessonplans/notify-pending',{method:'POST'});
      setNotifyMsg(`✅ Notified ${res.sent} trainer(s)`);
    } catch(e){ setNotifyMsg('❌ '+e.message); }
    finally { setNotifying(false); }
  };

  // Filter rows
  const filtered = rows.filter(r => {
    const lpDone  = !!r.plan_id;
    const stuDone = parseInt(r.student_count) > 0;
    if (filter==='lp_pending')   return !lpDone;
    if (filter==='stu_pending')  return !stuDone;
    if (filter==='both_pending') return !lpDone && !stuDone;
    if (filter==='complete')     return lpDone && stuDone;
    return true;
  });

  // Stats
  const totalRows    = rows.length;
  const lpDone       = rows.filter(r=>r.plan_id).length;
  const stuDone      = rows.filter(r=>parseInt(r.student_count)>0).length;
  const bothDone     = rows.filter(r=>r.plan_id && parseInt(r.student_count)>0).length;
  const bothPending  = rows.filter(r=>!r.plan_id && parseInt(r.student_count)===0).length;

  // Group by trainer for the table display
  const grouped = {};
  filtered.forEach(r => {
    const k = r.trainer_name;
    if (!grouped[k]) grouped[k] = { trainer_id:r.trainer_id, designation:r.trainer_designation, sections:[] };
    grouped[k].sections.push(r);
  });

  const card = { background:theme.card,borderRadius:'12px',border:`1px solid ${theme.border}`,boxShadow:'0 1px 4px rgba(0,0,0,0.06)' };

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'20px',flexWrap:'wrap',gap:'12px' }}>
        <div>
          <h1 style={{ margin:0,fontSize:'24px',fontWeight:'700',color:theme.text }}>📒 Lesson Plans & Student Lists</h1>
          <p style={{ margin:'4px 0 0',fontSize:'13px',color:theme.subtext }}>
            Status of all uploads across the team · Source: Master Timetable
          </p>
        </div>
        {isAdmin && (
          <div style={{ display:'flex',gap:'8px',alignItems:'center' }}>
            <button onClick={notify} disabled={notifying} style={{ padding:'9px 16px',borderRadius:'9px',
              border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,
              cursor:'pointer',fontSize:'13px',fontWeight:'500' }}>
              {notifying ? 'Sending…' : '🔔 Notify Pending'}
            </button>
          </div>
        )}
      </div>
      {notifyMsg && <div style={{ marginBottom:'14px',padding:'10px 14px',borderRadius:'9px',fontSize:'13px',
        background:notifyMsg.startsWith('✅')?'#d1fae5':'#fee2e2',
        color:notifyMsg.startsWith('✅')?'#065f46':'#dc2626' }}>{notifyMsg}</div>}

      {/* ── Stats strip ── */}
      {!loading && (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'12px',marginBottom:'18px' }}>
          {[
            { label:'Total Sections', value:totalRows,         color:'#3b82f6', icon:'📋', fid:'all'         },
            { label:'LP Uploaded',    value:lpDone,            color:'#10b981', icon:'✅', fid:'all'         },
            { label:'LP Pending',     value:totalRows-lpDone,  color:'#ef4444', icon:'🔴', fid:'lp_pending'  },
            { label:'Students Done',  value:stuDone,           color:'#8b5cf6', icon:'👥', fid:'all'         },
            { label:'Both Pending',   value:bothPending,       color:'#f59e0b', icon:'⚠️', fid:'both_pending'},
          ].map(s=>(
            <div key={s.label} onClick={()=>setFilter(s.fid)} style={{ ...card,padding:'14px 16px',cursor:'pointer',
              borderLeft:`4px solid ${s.color}`,transition:'all 0.12s',
              transform:filter===s.fid?'scale(1.02)':'scale(1)' }}>
              <div style={{ fontSize:'22px',fontWeight:'800',color:s.color }}>{s.value}</div>
              <div style={{ fontSize:'11px',color:theme.subtext,marginTop:'2px' }}>{s.icon} {s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters bar ── */}
      <div style={{ ...card,padding:'12px 16px',marginBottom:'18px',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap' }}>
        {isAdmin && (
          <>
            <span style={{ fontSize:'13px',fontWeight:'600',color:theme.text }}>Trainer:</span>
            <select value={selTrainer} onChange={e=>handleTrainer(e.target.value)} style={{
              padding:'7px 11px',borderRadius:'8px',border:`1px solid ${theme.border}`,
              background:theme.bg,color:theme.text,fontSize:'13px' }}>
              <option value="">All Trainers</option>
              {trainers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div style={{ width:'1px',height:'24px',background:theme.border }}/>
          </>
        )}
        <span style={{ fontSize:'13px',fontWeight:'600',color:theme.text }}>Show:</span>
        {[
          ['all','All'],['complete','✅ Complete'],['lp_pending','📋 LP Missing'],
          ['stu_pending','👥 Students Missing'],['both_pending','⚠️ Both Missing']
        ].map(([id,label])=>(
          <button key={id} onClick={()=>setFilter(id)} style={{
            padding:'6px 12px',borderRadius:'8px',cursor:'pointer',fontSize:'12px',
            border:`1px solid ${filter===id?theme.accent:theme.border}`,
            background:filter===id?theme.accent:theme.card,
            color:filter===id?'#fff':theme.text,
            fontWeight:filter===id?'700':'400'
          }}>{label}</button>
        ))}
        <span style={{ marginLeft:'auto',fontSize:'12px',color:theme.subtext }}>
          Showing {filtered.length} of {totalRows} sections
        </span>
      </div>

      {/* ── Main table ── */}
      <div style={{ ...card,overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:'40px',textAlign:'center',color:theme.subtext }}>Loading from timetable…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'40px',textAlign:'center',color:theme.subtext }}>
            <div style={{ fontSize:'32px',marginBottom:'8px' }}>🎉</div>
            <p style={{ margin:0,fontWeight:'600' }}>
              {filter==='both_pending' ? 'No sections with both items pending!' :
               filter==='lp_pending'  ? 'All lesson plans uploaded!' :
               filter==='stu_pending' ? 'All student lists uploaded!' :
               filter==='complete'    ? 'No completed sections yet.' : 'No sections found.'}
            </p>
          </div>
        ) : (
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'13px' }}>
            <thead>
              <tr style={{ background:theme.bg }}>
                {[
                  isAdmin&&'Trainer','Section','Institution','Domain',
                  '📋 Lesson Plan','👥 Student List',
                  'Sessions Done','Actions'
                ].filter(Boolean).map(h=>(
                  <th key={h} style={{ padding:'10px 13px',textAlign:'left',color:theme.subtext,
                    fontWeight:'700',fontSize:'11px',textTransform:'uppercase',
                    borderBottom:`1px solid ${theme.border}`,whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r,i) => {
                const lpDone  = !!r.plan_id;
                const stuDone = parseInt(r.student_count) > 0;
                const rowBg   = !lpDone && !stuDone
                  ? (theme.card==='#ffffff'?'#fff8f8':theme.bg)
                  : i%2===0 ? theme.card : theme.bg;

                return (
                  <tr key={`${r.trainer_id}-${r.class_name}-${r.domain}`}
                    style={{ background:rowBg, borderBottom:`1px solid ${theme.border}` }}>

                    {/* Trainer (admin only) */}
                    {isAdmin && (
                      <td style={{ padding:'11px 13px' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:'8px' }}>
                          <Avatar name={r.trainer_name} size={28}/>
                          <div>
                            <div style={{ fontWeight:'600',color:theme.text,fontSize:'12px' }}>{r.trainer_name}</div>
                            <div style={{ fontSize:'10px',color:theme.subtext }}>{r.trainer_designation||''}</div>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Section */}
                    <td style={{ padding:'11px 13px',fontWeight:'700',color:theme.text }}>{r.class_name}</td>

                    {/* Institution */}
                    <td style={{ padding:'11px 13px' }}>
                      <span style={{
                        background: r.institution==='MRU'?'#dbeafe':r.institution==='MRIIRS'?'#ede9fe':'#f1f5f9',
                        color:      r.institution==='MRU'?'#1e40af':r.institution==='MRIIRS'?'#5b21b6':'#475569',
                        padding:'2px 8px',borderRadius:'20px',fontSize:'11px',fontWeight:'600'
                      }}>{r.institution||'—'}</span>
                    </td>

                    {/* Domain */}
                    <td style={{ padding:'11px 13px' }}>
                      <span style={{ fontSize:'12px',color:theme.subtext }}>{r.domain}</span>
                    </td>

                    {/* Lesson Plan status */}
                    <td style={{ padding:'11px 13px' }}>
                      <div style={{ display:'flex',flexDirection:'column',gap:'2px' }}>
                        <span style={{
                          background:lpDone?'#d1fae5':'#fee2e2',
                          color:lpDone?'#065f46':'#991b1b',
                          padding:'3px 10px',borderRadius:'20px',
                          fontSize:'11px',fontWeight:'700',display:'inline-block'
                        }}>
                          {lpDone ? '✅ Uploaded' : '🔴 Pending'}
                        </span>
                        {lpDone && (
                          <span style={{ fontSize:'10px',color:theme.subtext }}>
                            {r.total_sessions} sessions · {fmtDate(r.lp_uploaded_at)}
                          </span>
                        )}
                        {lpDone && r.lp_uploaded_by_name && (
                          <span style={{ fontSize:'10px',color:theme.subtext }}>by {r.lp_uploaded_by_name}</span>
                        )}
                      </div>
                    </td>

                    {/* Student List status */}
                    <td style={{ padding:'11px 13px' }}>
                      <span style={{
                        background:stuDone?'#d1fae5':'#fee2e2',
                        color:stuDone?'#065f46':'#991b1b',
                        padding:'3px 10px',borderRadius:'20px',
                        fontSize:'11px',fontWeight:'700',display:'inline-block'
                      }}>
                        {stuDone ? `✅ ${r.student_count} students` : '🔴 Pending'}
                      </span>
                    </td>

                    {/* Sessions conducted */}
                    <td style={{ padding:'11px 13px',color:theme.subtext,fontSize:'12px' }}>
                      {parseInt(r.sessions_conducted)||0}
                    </td>

                    {/* Actions */}
                    <td style={{ padding:'11px 13px' }}>
                      <div style={{ display:'flex',gap:'5px',flexWrap:'wrap' }}>
                        <button
                          onClick={()=>setUploadModal({row:r,type:'lessonplan'})}
                          style={{ padding:'4px 10px',borderRadius:'6px',border:'none',cursor:'pointer',
                            fontSize:'11px',fontWeight:'600',
                            background:lpDone?theme.bg:theme.accent,
                            color:lpDone?theme.text:'#fff',
                            border:lpDone?`1px solid ${theme.border}`:'none'
                          }}>
                          {lpDone?'↺ LP':'⬆ LP'}
                        </button>
                        <button
                          onClick={()=>setUploadModal({row:r,type:'students'})}
                          style={{ padding:'4px 10px',borderRadius:'6px',border:'none',cursor:'pointer',
                            fontSize:'11px',fontWeight:'600',
                            background:stuDone?theme.bg:'#8b5cf6',
                            color:stuDone?theme.text:'#fff',
                            border:stuDone?`1px solid ${theme.border}`:'none'
                          }}>
                          {stuDone?'↺ Students':'⬆ Students'}
                        </button>
                        {lpDone && (
                          <button
                            onClick={()=>setDetailModal(r)}
                            style={{ padding:'4px 10px',borderRadius:'6px',
                              border:`1px solid ${theme.border}`,background:'transparent',
                              color:theme.accent,cursor:'pointer',fontSize:'11px',fontWeight:'600'
                            }}>
                            View →
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {uploadModal && (
        <UploadModal
          row={uploadModal.row}
          type={uploadModal.type}
          theme={theme}
          onClose={()=>setUploadModal(null)}
          onDone={()=>load(selTrainer||undefined)}
        />
      )}
      {detailModal && (
        <DetailModal
          row={detailModal}
          theme={theme}
          onClose={()=>setDetailModal(null)}
        />
      )}
    </div>
  );
}
