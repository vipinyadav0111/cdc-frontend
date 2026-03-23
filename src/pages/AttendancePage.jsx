import { useState, useEffect, useRef } from 'react';
import { api, getUser } from '../api';
import { useOutletContext } from 'react-router-dom';

const DOMAINS     = ['Aptitude','Verbal','Technical','Soft Skills'];
const INSTITUTIONS = ['MRU','MRIIRS'];
const SLOTS = [
  {n:1,t:'9:00–9:50'},{n:2,t:'9:50–10:40'},{n:3,t:'10:40–11:30'},{n:4,t:'11:30–12:20'},
  {n:5,t:'12:20–1:10'},{n:6,t:'1:10–2:00'},{n:7,t:'2:00–2:50'},{n:8,t:'2:50–3:40'},{n:9,t:'3:40–4:30'},
];
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const MIN_DATE = new Date().getFullYear() + '-01-01';
const MAX_DATE = new Date().toISOString().split('T')[0];

function pctColor(pct) {
  const p = parseFloat(pct);
  if(p >= 80) return { bg:'#d1fae5', text:'#065f46', border:'#10b981' };
  if(p >= 75) return { bg:'#fef3c7', text:'#92400e', border:'#f59e0b' };
  return { bg:'#fee2e2', text:'#991b1b', border:'#ef4444' };
}
function pctCategory(pct) {
  const p = parseFloat(pct);
  if(p === 0) return '0%';
  if(p < 40) return '1–40%';
  if(p < 60) return '40–60%';
  if(p < 65) return '60–65%';
  if(p < 70) return '65–70%';
  if(p < 75) return '70–75%';
  if(p < 80) return '75–80%';
  return '≥80%';
}


// ── SLOT CARD (reused in both views) ─────────────────
function SlotCard({ slot, theme, startMarking, setActiveTab, card }) {
  const hasStudents = slot.has_students || parseInt(slot.student_count||0) > 0;
  const hasLP       = slot.has_lesson_plan;
  const isMarked    = !!slot.session_id;
  const blocked     = !hasStudents;
  const borderColor = isMarked ? '#10b981' : blocked ? '#ef4444' : '#f59e0b';

  return (
    <div style={{ ...card, padding:'14px 16px', borderLeft:`4px solid ${borderColor}`, opacity:blocked?0.85:1 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
        <div>
          <div style={{ fontWeight:'700', color:theme.text, fontSize:'13px' }}>{slot.class_name}</div>
          <div style={{ fontSize:'11px', color:theme.subtext, marginTop:'1px' }}>
            Slot {slot.slot_number} · {SLOTS.find(s=>s.n===slot.slot_number)?.t}
            {slot.session_type && <span style={{ marginLeft:'5px', background:theme.bg, padding:'1px 5px', borderRadius:'4px', fontSize:'10px' }}>{slot.session_type}</span>}
          </div>
        </div>
        {isMarked
          ? <span style={{ background:'#d1fae5', color:'#065f46', padding:'2px 7px', borderRadius:'20px', fontSize:'10px', fontWeight:'600', flexShrink:0 }}>✅ Marked</span>
          : <span style={{ background:'#fef3c7', color:'#92400e', padding:'2px 7px', borderRadius:'20px', fontSize:'10px', fontWeight:'600', flexShrink:0 }}>⏳ Pending</span>
        }
      </div>
      {blocked && (
        <div style={{ background:'#fee2e2', borderRadius:'6px', padding:'5px 8px', fontSize:'11px', color:'#991b1b', marginBottom:'6px' }}>
          🔴 No student list
        </div>
      )}
      {!blocked && !hasLP && (
        <div style={{ background:'#fef3c7', borderRadius:'6px', padding:'5px 8px', fontSize:'11px', color:'#92400e', marginBottom:'6px' }}>
          🟡 No lesson plan
        </div>
      )}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:'11px', color:theme.subtext }}>👥 {slot.student_count||0}</span>
        <button onClick={() => !blocked && startMarking(slot)} disabled={blocked}
          style={{ padding:'5px 12px', border:'none', borderRadius:'6px', cursor:blocked?'not-allowed':'pointer',
            background: blocked?'#e2e8f0': isMarked?theme.bg:theme.accent,
            color: blocked?'#94a3b8': isMarked?theme.subtext:'#fff',
            fontSize:'11px', fontWeight:'600' }}>
          {blocked ? 'No Students' : isMarked ? '✏️ Edit' : '📝 Mark'}
        </button>
      </div>
    </div>
  );
}


// ── ATTENDANCE MONITORING ─────────────────────────────
function AttendanceMonitoring({ theme, isAdmin, sections, card, inp, handleExport, exporting, exportOpts, setExportOpts, DOMAINS, INSTITUTIONS }) {
  const [monTab,      setMonTab]      = useState('sections');
  const [streams,     setStreams]     = useState([]);
  const [filterInst,  setFilterInst]  = useState('all');
  const [filterProg,  setFilterProg]  = useState('all');
  const [filterSem,   setFilterSem]   = useState('all');
  const [filterStream,setFilterStream]= useState('all'); // stream_id
  const [filterDomain,setFilterDomain]= useState('all');
  const [threshold,   setThreshold]   = useState('75');
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    if(isAdmin) api('/settings/streams').then(setStreams).catch(()=>{});
  }, []);

  useEffect(() => { loadData(); }, [monTab, filterStream, filterDomain, filterInst, threshold]);

  const buildParams = () => {
    const p = new URLSearchParams();
    if(filterStream !== 'all') p.append('stream_id', filterStream);
    if(filterDomain !== 'all') p.append('domain', filterDomain);
    if(filterInst !== 'all') p.append('institution', filterInst);
    if(threshold) p.append('threshold', threshold);
    return p.toString();
  };

  const loadData = async () => {
    setLoading(true); setData(null);
    try {
      const p = buildParams();
      if(monTab === 'sections')   setData(await api(`/attendance/monitoring/sections?${p}`));
      if(monTab === 'at-risk')    setData(await api(`/attendance/monitoring/at-risk?${p}`));
      if(monTab === 'trainers' && isAdmin) setData(await api(`/attendance/monitoring/trainers?${p}`));
      if(monTab === 'trend')      setData(await api(`/attendance/monitoring/trend?${p}`));
      if(monTab === 'defaulters') setData(await api(`/attendance/monitoring/defaulters?${p}`));
      if(monTab === 'export')     setData(null);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Stream filter options
  const filteredStreams = streams.filter(s => {
    if(filterInst !== 'all' && s.institution !== filterInst) return false;
    if(filterProg !== 'all' && s.program !== filterProg) return false;
    if(filterSem !== 'all' && s.semester !== filterSem) return false;
    return true;
  });
  const programs = [...new Set(streams.filter(s=>filterInst==='all'||s.institution===filterInst).map(s=>s.program))].sort();
  const semesters = [...new Set(streams.filter(s=>(filterInst==='all'||s.institution===filterInst)&&(filterProg==='all'||s.program===filterProg)).map(s=>s.semester))].sort((a,b)=>parseInt(a)-parseInt(b));

  const pctBadge = (pct) => {
    const p = parseFloat(pct||0);
    if(p >= 80) return { bg:'#d1fae5', color:'#065f46' };
    if(p >= 75) return { bg:'#fef3c7', color:'#92400e' };
    if(p >= 65) return { bg:'#fff7ed', color:'#9a3412' };
    return { bg:'#fee2e2', color:'#991b1b' };
  };

  const TABS = [
    { id:'sections',  label:'📋 Section Summary' },
    { id:'at-risk',   label:'🚨 At-Risk Students' },
    ...(isAdmin ? [{ id:'trainers', label:'👤 Trainer Report' }] : []),
    { id:'trend',     label:'📈 Monthly Trend' },
    { id:'defaulters',label:'📝 Defaulter List' },
    { id:'export',    label:'📥 Export Excel' },
  ];

  // Export defaulters as Excel
  const exportDefaulters = () => {
    const XLSX = window.XLSX;
    if(!XLSX || !data) return;
    const wb = XLSX.utils.book_new();
    const rows = data.map((r,i) => ({
      'S.No': i+1, 'Roll No': r.roll_no, 'Student Name': r.student_name,
      'Section': r.section_name, 'Institution': r.institution, 'Domain': r.domain,
      'Trainer': r.trainer_name, 'Total Sessions': r.total_sessions,
      'Present': r.present, 'Absent': r.absent, 'Attendance %': r.percentage+'%'
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{wch:6},{wch:16},{wch:28},{wch:20},{wch:10},{wch:12},{wch:20},{wch:14},{wch:10},{wch:10},{wch:14}];
    XLSX.utils.book_append_sheet(wb, ws, 'Defaulters');
    XLSX.writeFile(wb, `Defaulters_Below${threshold}pct_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div>
      <h2 style={{ margin:'0 0 16px', fontSize:'16px', fontWeight:'700', color:theme.text }}>📊 Attendance Monitoring</h2>

      {/* ── FILTERS ── */}
      <div style={{ ...card, padding:'14px 18px', marginBottom:'16px' }}>
        <div style={{ fontSize:'11px', fontWeight:'700', color:theme.subtext, marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Filters</div>
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
          {/* Institution */}
          <select value={filterInst} onChange={e=>{ setFilterInst(e.target.value); setFilterProg('all'); setFilterSem('all'); setFilterStream('all'); }} style={inp}>
            <option value="all">All Institutions</option>
            <option value="MRU">MRU</option>
            <option value="MRIIRS">MRIIRS</option>
          </select>

          {/* Program */}
          {isAdmin && programs.length > 0 && (
            <select value={filterProg} onChange={e=>{ setFilterProg(e.target.value); setFilterSem('all'); setFilterStream('all'); }} style={inp}>
              <option value="all">All Programs</option>
              {programs.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          )}

          {/* Semester */}
          {isAdmin && semesters.length > 0 && (
            <select value={filterSem} onChange={e=>{ setFilterSem(e.target.value); setFilterStream('all'); }} style={inp}>
              <option value="all">All Semesters</option>
              {semesters.map(s=><option key={s} value={s}>Sem {s}</option>)}
            </select>
          )}

          {/* Stream */}
          {isAdmin && filteredStreams.length > 0 && (
            <select value={filterStream} onChange={e=>setFilterStream(e.target.value)} style={{ ...inp, maxWidth:'220px' }}>
              <option value="all">All Streams</option>
              {filteredStreams.map(s=><option key={s.id} value={s.id}>{s.stream_name} (Sem {s.semester})</option>)}
            </select>
          )}

          {/* Domain */}
          <select value={filterDomain} onChange={e=>setFilterDomain(e.target.value)} style={inp}>
            <option value="all">All Domains</option>
            {DOMAINS.map(d=><option key={d} value={d}>{d}</option>)}
          </select>

          {/* Threshold (for at-risk / defaulters) */}
          {(monTab === 'at-risk' || monTab === 'defaulters') && (
            <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <span style={{ fontSize:'12px', color:theme.subtext }}>Below</span>
              <select value={threshold} onChange={e=>setThreshold(e.target.value)} style={inp}>
                <option value="75">75%</option>
                <option value="70">70%</option>
                <option value="65">65%</option>
                <option value="60">60%</option>
                <option value="40">40%</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── SUB TABS ── */}
      <div style={{ display:'flex', gap:'4px', marginBottom:'16px', flexWrap:'wrap', background:theme.bg, padding:'4px', borderRadius:'10px', width:'fit-content' }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setMonTab(t.id)} style={{ padding:'7px 14px', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'12px', fontWeight:monTab===t.id?'700':'400', background:monTab===t.id?theme.accent:'transparent', color:monTab===t.id?'#fff':theme.subtext }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ ...card, padding:'48px', textAlign:'center', color:theme.subtext, fontSize:'13px' }}>Loading…</div> :

      /* ── SECTION SUMMARY ── */
      monTab === 'sections' && (
        <div style={{ ...card, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${theme.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h3 style={{ margin:0, fontSize:'14px', fontWeight:'700', color:theme.text }}>Section-wise Attendance Summary ({data?.length||0})</h3>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:theme.bg }}>
                {['Section','Inst','Domain','Trainer','Students','Sessions','Avg %','<75%','<65%','0%'].map(h=>(
                  <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:theme.subtext, borderBottom:`2px solid ${theme.border}`, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data||[]).map((s,i) => {
                const b = pctBadge(s.avg_attendance_pct);
                return (
                  <tr key={s.id} style={{ background:i%2===0?theme.card:theme.bg }}>
                    <td style={{ padding:'8px 12px', fontSize:'12px', fontWeight:'600', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{s.name}</td>
                    <td style={{ padding:'8px 12px', borderBottom:`1px solid ${theme.border}` }}>
                      <span style={{ background:s.institution==='MRU'?'#dbeafe':'#ede9fe', color:s.institution==='MRU'?'#1d4ed8':'#5b21b6', padding:'1px 6px', borderRadius:'10px', fontSize:'10px', fontWeight:'600' }}>{s.institution}</span>
                    </td>
                    <td style={{ padding:'8px 12px', fontSize:'11px', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{s.domain}</td>
                    <td style={{ padding:'8px 12px', fontSize:'11px', color:theme.text, borderBottom:`1px solid ${theme.border}`, whiteSpace:'nowrap' }}>{s.trainer_name?.split(' ').slice(0,2).join(' ')}</td>
                    <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}`, textAlign:'center' }}>{s.total_students}</td>
                    <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}`, textAlign:'center' }}>{s.sessions_conducted}</td>
                    <td style={{ padding:'8px 12px', borderBottom:`1px solid ${theme.border}` }}>
                      <span style={{ background:b.bg, color:b.color, padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>{s.avg_attendance_pct}%</span>
                    </td>
                    <td style={{ padding:'8px 12px', fontSize:'11px', fontWeight:'600', color:s.below_75>0?'#dc2626':theme.subtext, borderBottom:`1px solid ${theme.border}`, textAlign:'center' }}>{s.below_75}</td>
                    <td style={{ padding:'8px 12px', fontSize:'11px', fontWeight:'600', color:s.below_65>0?'#ef4444':theme.subtext, borderBottom:`1px solid ${theme.border}`, textAlign:'center' }}>{s.below_65}</td>
                    <td style={{ padding:'8px 12px', fontSize:'11px', fontWeight:'600', color:s.zero_attendance>0?'#7f1d1d':theme.subtext, borderBottom:`1px solid ${theme.border}`, textAlign:'center' }}>{s.zero_attendance}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── AT-RISK ── */}
      {monTab === 'at-risk' && (
        <div style={{ ...card, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${theme.border}` }}>
            <h3 style={{ margin:0, fontSize:'14px', fontWeight:'700', color:theme.text }}>Students Below {threshold}% ({data?.length||0})</h3>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:theme.bg }}>
                {['Roll No','Name','Section','Inst','Domain','Trainer','Sessions','Present','%'].map(h=>(
                  <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:theme.subtext, borderBottom:`2px solid ${theme.border}`, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data||[]).map((r,i) => {
                const b = pctBadge(r.percentage);
                return (
                  <tr key={i} style={{ background:i%2===0?theme.card:theme.bg }}>
                    <td style={{ padding:'8px 12px', fontSize:'11px', fontFamily:'monospace', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{r.roll_no}</td>
                    <td style={{ padding:'8px 12px', fontSize:'12px', fontWeight:'600', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{r.name}</td>
                    <td style={{ padding:'8px 12px', fontSize:'11px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{r.section_name}</td>
                    <td style={{ padding:'8px 12px', borderBottom:`1px solid ${theme.border}` }}><span style={{ background:r.institution==='MRU'?'#dbeafe':'#ede9fe', color:r.institution==='MRU'?'#1d4ed8':'#5b21b6', padding:'1px 5px', borderRadius:'8px', fontSize:'10px', fontWeight:'600' }}>{r.institution}</span></td>
                    <td style={{ padding:'8px 12px', fontSize:'11px', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{r.domain}</td>
                    <td style={{ padding:'8px 12px', fontSize:'11px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{r.trainer_name?.split(' ').slice(0,2).join(' ')}</td>
                    <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}`, textAlign:'center' }}>{r.total_sessions}</td>
                    <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}`, textAlign:'center' }}>{r.present_count}</td>
                    <td style={{ padding:'8px 12px', borderBottom:`1px solid ${theme.border}` }}><span style={{ background:b.bg, color:b.color, padding:'2px 7px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>{r.percentage}%</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TRAINER REPORT ── */}
      {monTab === 'trainers' && isAdmin && (
        <div style={{ ...card, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${theme.border}` }}>
            <h3 style={{ margin:0, fontSize:'14px', fontWeight:'700', color:theme.text }}>Trainer-wise Report ({data?.length||0})</h3>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:theme.bg }}>
                {['Trainer','Designation','Sections','Sessions Conducted','Avg Attendance %'].map(h=>(
                  <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:theme.subtext, borderBottom:`2px solid ${theme.border}`, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data||[]).map((t,i) => {
                const b = pctBadge(t.avg_attendance_pct);
                return (
                  <tr key={t.id} style={{ background:i%2===0?theme.card:theme.bg }}>
                    <td style={{ padding:'9px 12px', borderBottom:`1px solid ${theme.border}` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        {t.profile_picture ? <img src={t.profile_picture} alt="" style={{ width:'28px', height:'28px', borderRadius:'50%', objectFit:'cover' }}/> : <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:theme.accent+'33', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'700', color:theme.accent }}>{t.name?.[0]}</div>}
                        <span style={{ fontSize:'13px', fontWeight:'600', color:theme.text }}>{t.name}</span>
                      </div>
                    </td>
                    <td style={{ padding:'9px 12px', fontSize:'11px', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{t.designation||'—'}</td>
                    <td style={{ padding:'9px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}`, textAlign:'center' }}>{t.total_sections}</td>
                    <td style={{ padding:'9px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}`, textAlign:'center' }}>{t.sessions_conducted}</td>
                    <td style={{ padding:'9px 12px', borderBottom:`1px solid ${theme.border}` }}>
                      {t.avg_attendance_pct ? <span style={{ background:b.bg, color:b.color, padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>{t.avg_attendance_pct}%</span> : <span style={{ color:theme.subtext, fontSize:'11px' }}>No data</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TREND ── */}
      {monTab === 'trend' && (
        <div style={{ ...card, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${theme.border}` }}>
            <h3 style={{ margin:0, fontSize:'14px', fontWeight:'700', color:theme.text }}>Month-wise Attendance Trend</h3>
          </div>
          {!data?.length ? (
            <div style={{ padding:'40px', textAlign:'center', color:theme.subtext }}><div style={{ fontSize:'32px', marginBottom:'8px' }}>📈</div><p style={{ margin:0 }}>No attendance data yet</p></div>
          ) : (
            <div style={{ padding:'20px' }}>
              {/* Bar chart */}
              <div style={{ display:'flex', alignItems:'flex-end', gap:'8px', height:'160px', marginBottom:'8px' }}>
                {data.map((m,i) => {
                  const pct = parseFloat(m.attendance_pct||0);
                  const b = pctBadge(pct);
                  return (
                    <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                      <span style={{ fontSize:'10px', fontWeight:'700', color:b.color }}>{pct}%</span>
                      <div style={{ width:'100%', background:b.bg, border:`1px solid ${b.color}33`, borderRadius:'4px 4px 0 0', height:`${Math.max(pct,5)}%`, minHeight:'6px', transition:'height 0.5s' }}/>
                    </div>
                  );
                })}
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                {data.map((m,i) => (
                  <div key={i} style={{ flex:1, textAlign:'center' }}>
                    <div style={{ fontSize:'10px', color:theme.subtext }}>{m.month_label}</div>
                    <div style={{ fontSize:'10px', color:theme.subtext }}>{m.sessions} sessions</div>
                  </div>
                ))}
              </div>
              {/* Table below chart */}
              <table style={{ width:'100%', borderCollapse:'collapse', marginTop:'20px' }}>
                <thead>
                  <tr style={{ background:theme.bg }}>
                    {['Month','Sessions','Total Records','Present','Attendance %'].map(h=>(
                      <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:theme.subtext, borderBottom:`2px solid ${theme.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((m,i) => {
                    const b = pctBadge(m.attendance_pct);
                    return (
                      <tr key={i} style={{ background:i%2===0?theme.card:theme.bg }}>
                        <td style={{ padding:'8px 12px', fontSize:'12px', fontWeight:'600', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{m.month_label}</td>
                        <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{m.sessions}</td>
                        <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{m.total_records}</td>
                        <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{m.present_count}</td>
                        <td style={{ padding:'8px 12px', borderBottom:`1px solid ${theme.border}` }}>
                          <span style={{ background:b.bg, color:b.color, padding:'2px 7px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>{m.attendance_pct}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── DEFAULTERS ── */}
      {monTab === 'defaulters' && (
        <div style={{ ...card, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${theme.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h3 style={{ margin:0, fontSize:'14px', fontWeight:'700', color:theme.text }}>📝 Defaulter List — Below {threshold}% ({data?.length||0} students)</h3>
            {data?.length > 0 && (
              <button onClick={exportDefaulters} style={{ padding:'7px 14px', background:'#1e3a5f', color:'#fff', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'12px', fontWeight:'600' }}>
                📥 Download Excel
              </button>
            )}
          </div>
          {!data?.length ? (
            <div style={{ padding:'40px', textAlign:'center', color:theme.subtext }}><div style={{ fontSize:'32px', marginBottom:'8px' }}>🎉</div><p style={{ margin:0 }}>No defaulters found!</p></div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:theme.bg }}>
                  {['#','Roll No','Name','Section','Inst','Domain','Trainer','Sessions','Present','Absent','%'].map(h=>(
                    <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:theme.subtext, borderBottom:`2px solid ${theme.border}`, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((r,i) => {
                  const b = pctBadge(r.percentage);
                  return (
                    <tr key={i} style={{ background:i%2===0?theme.card:theme.bg }}>
                      <td style={{ padding:'7px 10px', fontSize:'11px', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{i+1}</td>
                      <td style={{ padding:'7px 10px', fontSize:'11px', fontFamily:'monospace', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{r.roll_no}</td>
                      <td style={{ padding:'7px 10px', fontSize:'12px', fontWeight:'600', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{r.student_name}</td>
                      <td style={{ padding:'7px 10px', fontSize:'11px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{r.section_name}</td>
                      <td style={{ padding:'7px 10px', borderBottom:`1px solid ${theme.border}` }}><span style={{ background:r.institution==='MRU'?'#dbeafe':'#ede9fe', color:r.institution==='MRU'?'#1d4ed8':'#5b21b6', padding:'1px 5px', borderRadius:'8px', fontSize:'10px', fontWeight:'600' }}>{r.institution}</span></td>
                      <td style={{ padding:'7px 10px', fontSize:'11px', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{r.domain}</td>
                      <td style={{ padding:'7px 10px', fontSize:'11px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{r.trainer_name?.split(' ').slice(0,2).join(' ')}</td>
                      <td style={{ padding:'7px 10px', fontSize:'11px', color:theme.text, borderBottom:`1px solid ${theme.border}`, textAlign:'center' }}>{r.total_sessions}</td>
                      <td style={{ padding:'7px 10px', fontSize:'11px', color:'#065f46', borderBottom:`1px solid ${theme.border}`, textAlign:'center', fontWeight:'600' }}>{r.present}</td>
                      <td style={{ padding:'7px 10px', fontSize:'11px', color:'#dc2626', borderBottom:`1px solid ${theme.border}`, textAlign:'center', fontWeight:'600' }}>{r.absent}</td>
                      <td style={{ padding:'7px 10px', borderBottom:`1px solid ${theme.border}` }}><span style={{ background:b.bg, color:b.color, padding:'2px 7px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>{r.percentage}%</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── EXPORT ── */}
      {monTab === 'export' && (
        <div style={{ maxWidth:'560px' }}>
          <div style={{ ...card, padding:'24px' }}>
            <h3 style={{ margin:'0 0 16px', fontSize:'14px', fontWeight:'700', color:theme.text }}>📥 Export Attendance Data</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginBottom:'16px' }}>
              <div>
                <label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:theme.subtext, marginBottom:'4px', textTransform:'uppercase' }}>Domain</label>
                <select value={exportOpts.domain} onChange={e=>setExportOpts({...exportOpts,domain:e.target.value})} style={{ ...inp, width:'100%' }}>
                  <option value="all">All Domains</option>
                  {DOMAINS.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:theme.subtext, marginBottom:'4px', textTransform:'uppercase' }}>Institution</label>
                <select value={exportOpts.institution} onChange={e=>setExportOpts({...exportOpts,institution:e.target.value})} style={{ ...inp, width:'100%' }}>
                  <option value="all">All</option>
                  {INSTITUTIONS.map(i=><option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:theme.subtext, marginBottom:'4px', textTransform:'uppercase' }}>Section</label>
                <select value={exportOpts.section_id} onChange={e=>setExportOpts({...exportOpts,section_id:e.target.value})} style={{ ...inp, width:'100%' }}>
                  <option value="all">All Sections</option>
                </select>
              </div>
            </div>
            <button onClick={handleExport} disabled={exporting} style={{ width:'100%', padding:'12px', background:exporting?'#9ca3af':theme.accent, color:'#fff', border:'none', borderRadius:'9px', fontWeight:'700', cursor:'pointer', fontSize:'14px' }}>
              {exporting ? '⏳ Preparing…' : '📥 Download Excel (7-band Report)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ADMIN MARK VIEW ───────────────────────────────────
function AdminMarkView({ slots, theme, user, adminView, setAdminView, expandedTrainer, setExpandedTrainer, filterDomain, setFilterDomain, filterStatus, setFilterStatus, startMarking, setActiveTab, card }) {

  // Group slots by trainer
  const trainerMap = {};
  slots.forEach(slot => {
    const key = slot.trainer_id;
    if(!trainerMap[key]) trainerMap[key] = { id: key, name: slot.trainer_name, slots: [] };
    trainerMap[key].slots.push(slot);
  });
  const trainers = Object.values(trainerMap).sort((a,b) => a.name?.localeCompare(b.name));
  const myId = parseInt(user?.id);

  // Apply filters to slots
  const filterSlots = (slotList) => slotList.filter(s => {
    if(filterDomain !== 'all' && s.session_type !== filterDomain) return false;
    if(filterStatus === 'pending' && s.session_id) return false;
    if(filterStatus === 'marked' && !s.session_id) return false;
    return true;
  });

  // Stats for a trainer's slots
  const stats = (slotList) => {
    const total   = slotList.length;
    const marked  = slotList.filter(s => s.session_id).length;
    const pending = total - marked;
    const blocked = slotList.filter(s => !s.has_students && !parseInt(s.student_count||0)).length;
    return { total, marked, pending, blocked };
  };

  // Which slots to show in flat/mine view
  const flatSlots = adminView === 'mine'
    ? filterSlots(slots.filter(s => s.trainer_id === myId))
    : filterSlots(slots);

  const inp = { padding:'7px 10px', border:`1px solid ${theme.border}`, borderRadius:'7px', fontSize:'12px', background:theme.card, color:theme.text, outline:'none' };

  return (
    <div>
      {/* Filter + View bar */}
      <div style={{ ...card, padding:'12px 16px', marginBottom:'14px', display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
        {/* View toggle */}
        <div style={{ display:'flex', gap:'4px', background:theme.bg, padding:'3px', borderRadius:'8px' }}>
          {[['tiles','🗂️ By Trainer'],['mine','👤 Only Mine'],['all','📋 All Flat']].map(([v,l])=>(
            <button key={v} onClick={()=>{ setAdminView(v); setExpandedTrainer(null); }} style={{ padding:'5px 12px', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:adminView===v?'700':'400', background:adminView===v?theme.accent:'transparent', color:adminView===v?'#fff':theme.subtext }}>
              {l}
            </button>
          ))}
        </div>

        <div style={{ width:'1px', height:'24px', background:theme.border }}/>

        {/* Domain filter */}
        <select value={filterDomain} onChange={e=>setFilterDomain(e.target.value)} style={inp}>
          <option value="all">All Domains</option>
          {DOMAINS.map(d=><option key={d} value={d}>{d}</option>)}
        </select>

        {/* Status filter */}
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={inp}>
          <option value="all">All Status</option>
          <option value="pending">⏳ Pending only</option>
          <option value="marked">✅ Marked only</option>
        </select>

        {/* Summary */}
        <div style={{ marginLeft:'auto', display:'flex', gap:'8px', fontSize:'12px' }}>
          <span style={{ background:'#d1fae5', color:'#065f46', padding:'3px 9px', borderRadius:'20px', fontWeight:'600' }}>✅ {slots.filter(s=>s.session_id).length} marked</span>
          <span style={{ background:'#fef3c7', color:'#92400e', padding:'3px 9px', borderRadius:'20px', fontWeight:'600' }}>⏳ {slots.filter(s=>!s.session_id).length} pending</span>
        </div>
      </div>

      {/* ── BY TRAINER TILES ── */}
      {adminView === 'tiles' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {trainers.map(trainer => {
            const st       = stats(trainer.slots);
            const filtered = filterSlots(trainer.slots);
            const isMe     = trainer.id === myId;
            const isOpen   = expandedTrainer === trainer.id;
            const allDone  = st.pending === 0;
            const hasIssue = st.blocked > 0;

            if(filtered.length === 0) return null; // hide if filter removes all

            return (
              <div key={trainer.id} style={{ ...card, overflow:'hidden', border:`1px solid ${allDone?'#10b981':st.pending>0?theme.border:theme.border}` }}>
                {/* Trainer header row */}
                <div
                  onClick={()=>setExpandedTrainer(isOpen ? null : trainer.id)}
                  style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', background:isOpen?theme.bg:theme.card, userSelect:'none' }}
                  onMouseEnter={e=>e.currentTarget.style.background=theme.bg}
                  onMouseLeave={e=>e.currentTarget.style.background=isOpen?theme.bg:theme.card}
                >
                  {/* Avatar */}
                  <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:allDone?'#d1fae5':'#dbeafe', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'700', color:allDone?'#065f46':'#1d4ed8', flexShrink:0 }}>
                    {trainer.name?.[0]}
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:'700', fontSize:'14px', color:theme.text, display:'flex', alignItems:'center', gap:'6px' }}>
                      {trainer.name}
                      {isMe && <span style={{ background:theme.accent, color:'#fff', padding:'1px 6px', borderRadius:'10px', fontSize:'10px' }}>You</span>}
                      {hasIssue && <span style={{ background:'#fee2e2', color:'#dc2626', padding:'1px 6px', borderRadius:'10px', fontSize:'10px' }}>⚠️ No students</span>}
                    </div>
                    <div style={{ fontSize:'12px', color:theme.subtext, marginTop:'2px' }}>
                      {st.total} class{st.total!==1?'es':''}
                    </div>
                  </div>

                  {/* Progress pills */}
                  <div style={{ display:'flex', gap:'6px', alignItems:'center', flexShrink:0 }}>
                    {st.marked > 0 && <span style={{ background:'#d1fae5', color:'#065f46', padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>✅ {st.marked}</span>}
                    {st.pending > 0 && <span style={{ background:'#fef3c7', color:'#92400e', padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>⏳ {st.pending}</span>}
                    {allDone && <span style={{ color:'#10b981', fontSize:'16px' }}>✓</span>}
                  </div>

                  {/* Expand arrow */}
                  <span style={{ color:theme.subtext, fontSize:'14px', transition:'transform 0.2s', transform:isOpen?'rotate(180deg)':'rotate(0deg)', flexShrink:0 }}>▼</span>
                </div>

                {/* Expanded slots */}
                {isOpen && (
                  <div style={{ borderTop:`1px solid ${theme.border}`, padding:'12px 16px', background:theme.bg }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'8px' }}>
                      {filtered.map((slot,i) => (
                        <SlotCard key={i} slot={slot} theme={theme} startMarking={startMarking} setActiveTab={setActiveTab} card={card} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── ONLY MINE / ALL FLAT ── */}
      {(adminView === 'mine' || adminView === 'all') && (
        <div>
          {flatSlots.length === 0 ? (
            <div style={{ ...card, padding:'40px', textAlign:'center', color:theme.subtext }}>
              <div style={{ fontSize:'32px', marginBottom:'8px' }}>📭</div>
              <p style={{ margin:0, fontSize:'13px' }}>No classes match the selected filters</p>
            </div>
          ) : (
            <div>
              {adminView === 'all' && (
                /* Group by trainer in flat view */
                trainers.map(trainer => {
                  const filtered = filterSlots(trainer.slots);
                  if(filtered.length === 0) return null;
                  return (
                    <div key={trainer.id} style={{ marginBottom:'16px' }}>
                      <div style={{ fontSize:'12px', fontWeight:'700', color:theme.subtext, marginBottom:'8px', display:'flex', alignItems:'center', gap:'6px' }}>
                        <div style={{ width:'20px', height:'20px', borderRadius:'50%', background:theme.accent+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:'700', color:theme.accent }}>{trainer.name?.[0]}</div>
                        {trainer.name}
                        {trainer.id === myId && <span style={{ background:theme.accent, color:'#fff', padding:'0px 5px', borderRadius:'8px', fontSize:'10px' }}>You</span>}
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'8px' }}>
                        {filtered.map((slot,i) => (
                          <SlotCard key={i} slot={slot} theme={theme} startMarking={startMarking} setActiveTab={setActiveTab} card={card} />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
              {adminView === 'mine' && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'10px' }}>
                  {flatSlots.map((slot,i) => (
                    <SlotCard key={i} slot={slot} theme={theme} startMarking={startMarking} setActiveTab={setActiveTab} card={card} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AttendancePage() {
  const { theme } = useOutletContext();
  const user = getUser();
  const isAdmin = user?.role === 'super_admin';

  const [activeTab, setActiveTab]   = useState('mark');
  const [sections,  setSections]    = useState([]);
  const [alerts,    setAlerts]      = useState([]);
  const [loading,   setLoading]     = useState(true);
  const [msg,       setMsg]         = useState('');

  // ── DATE PICKER ──────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(MAX_DATE);
  const [dateSlots,    setDateSlots]    = useState([]);
  const [dateLoading,  setDateLoading]  = useState(false);

  // ── ADMIN FILTER STATE ──────────────────────────────
  const [adminView,        setAdminView]        = useState('tiles'); // tiles | trainer | mine
  const [expandedTrainer,  setExpandedTrainer]  = useState(null);
  const [filterDomain,     setFilterDomain]     = useState('all');
  const [filterStatus,     setFilterStatus]     = useState('all');

  // ── MARKING STATE ────────────────────────────────────
  const [markingSlot,    setMarkingSlot]    = useState(null);
  const [session,        setSession]        = useState(null);
  const [students,       setStudents]       = useState([]);
  const [topic,          setTopic]          = useState('');
  const [remarks,        setRemarks]        = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [isEditMode,     setIsEditMode]     = useState(false);
  const [editReason,     setEditReason]     = useState('');
  const [lpData,         setLpData]         = useState(null);
  const [lpSessionId,    setLpSessionId]    = useState(null);
  const [lpNotCovered,   setLpNotCovered]   = useState(false);
  const [lpComment,      setLpComment]      = useState('');
  const [manualTopic,    setManualTopic]    = useState('');

  // ── SECTION SETUP ────────────────────────────────────
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionForm,     setSectionForm]     = useState({ name:'',institution:'MRIIRS',branch:'',year:'',semester:'',domain:'Aptitude',cr1_name:'',cr1_phone:'',cr2_name:'',cr2_phone:'',semester_start:'' });
  const [uploadSection,   setUploadSection]   = useState(null);
  const [uploadMode,      setUploadMode]      = useState('replace');
  const [uploadResult,    setUploadResult]    = useState(null);
  const [sectionMsg,      setSectionMsg]      = useState('');
  const fileRef = useRef();

  // ── SUMMARY ──────────────────────────────────────────
  const [selectedSection,  setSelectedSection]  = useState(null);
  const [summaryDomain,    setSummaryDomain]    = useState('all');
  const [summary,          setSummary]          = useState(null);
  const [auditData,        setAuditData]        = useState(null);
  const [showAudit,        setShowAudit]        = useState(false);

  // ── EXPORT ───────────────────────────────────────────
  const [exportOpts, setExportOpts] = useState({ section_id:'all', domain:'all', institution:'all' });
  const [exporting,  setExporting]  = useState(false);

  // ── ADMIN PENDING REPORT ─────────────────────────────
  const [pendingReport,      setPendingReport]      = useState(null);
  const [pendingReportDate,  setPendingReportDate]  = useState(MAX_DATE);
  const [pendingLoading,     setPendingLoading]     = useState(false);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadByDate(selectedDate); }, [selectedDate]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sec, alrt] = await Promise.all([
        api('/attendance/sections'),
        api('/attendance/alerts'),
      ]);
      setSections(sec);
      setAlerts(alrt);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadByDate = async (date) => {
    setDateLoading(true);
    setMarkingSlot(null); setSession(null); setStudents([]);
    try {
      const data = await api(`/attendance/by-date?date=${date}`);
      setDateSlots(data.slots || []);
    } catch(e) { console.error(e); }
    finally { setDateLoading(false); }
  };

  const loadPendingReport = async () => {
    setPendingLoading(true);
    try {
      const data = await api(`/attendance/pending-report?date=${pendingReportDate}`);
      setPendingReport(data);
    } catch(e) { setMsg('❌ ' + e.message); }
    finally { setPendingLoading(false); }
  };

  // ── START MARKING ────────────────────────────────────
  const startMarking = async (slot) => {
    if(!slot.has_students && !slot.section_db_id) {
      return setMsg('🔴 No student list found. Please upload student list in the Sections tab first.');
    }
    if(!slot.section_db_id) {
      return setMsg('🔴 Section not set up. Go to Sections tab and upload student list first.');
    }
    setMsg('');
    try {
      const data = await api('/attendance/sessions/start', {
        method: 'POST',
        body: JSON.stringify({
          section_id: slot.section_db_id,
          date: selectedDate,
          slot_number: slot.slot_number,
          domain: slot.session_type
        })
      });
      setSession(data.session);
      const hasExisting = data.students.some(s => s.status === 'P');
      setIsEditMode(!!data.session && hasExisting);
      setStudents(data.students.map(s => ({ ...s, status: s.status || 'P' })));
      setMarkingSlot(slot);
      setEditReason('');
      setLpData(null); setLpSessionId(null); setLpNotCovered(false); setLpComment(''); setManualTopic('');
      setTopic(data.session?.topic_covered || '');
      setRemarks(data.session?.remarks || '');

      // Load lesson plan
      try {
        const lp = await api(`/lessonplans/suggest?class_name=${encodeURIComponent(slot.class_name)}&domain=${encodeURIComponent(slot.session_type||'')}&date=${selectedDate}`);
        setLpData(lp);
        if(lp.suggested_id) setLpSessionId(lp.suggested_id);
      } catch(e) { /* no lesson plan */ }
    } catch(e) { setMsg('❌ ' + e.message); }
  };

  const toggleAll = (status) => setStudents(s => s.map(st => ({ ...st, status })));

  const submitAttendance = async () => {
    if(!session) return;
    if(isEditMode && !editReason.trim()) return setMsg('⚠️ Please write a reason for editing this attendance');
    setSubmitting(true);
    try {
      await api(`/attendance/sessions/${session.id}/submit-with-audit`, {
        method: 'POST',
        body: JSON.stringify({
          records: students.map(s => ({ student_id: s.id, status: s.status })),
          topic_covered: lpData?.plan_exists ? (lpNotCovered ? '' : '') : manualTopic,
          remarks,
          edit_reason: isEditMode ? editReason : undefined
        })
      });

      // Save lesson plan topic if exists
      if(lpData?.plan_exists) {
        try {
          await api('/lessonplans/topic', {
            method: 'POST',
            body: JSON.stringify({
              attendance_session_id: session.id,
              lesson_plan_session_id: lpNotCovered ? null : (lpSessionId || null),
              not_covered: lpNotCovered,
              comment: lpComment || null
            })
          });
        } catch(e) { /* non-fatal */ }
      } else if(manualTopic) {
        await api(`/attendance/sessions/${session.id}/submit-with-audit`, {
          method: 'POST',
          body: JSON.stringify({
            records: students.map(s => ({ student_id: s.id, status: s.status })),
            topic_covered: manualTopic,
            remarks,
            edit_reason: isEditMode ? editReason : undefined
          })
        });
      }

      setMsg(`✅ Attendance ${isEditMode ? 'updated' : 'saved'}! ${students.filter(s=>s.status==='P').length}P / ${students.filter(s=>s.status==='A').length}A`);
      setMarkingSlot(null); setSession(null); setStudents([]);
      setTopic(''); setRemarks(''); setEditReason(''); setManualTopic('');
      setLpData(null); setLpSessionId(null); setLpNotCovered(false); setLpComment('');
      loadByDate(selectedDate);
    } catch(e) { setMsg('❌ ' + e.message); }
    finally { setSubmitting(false); }
  };

  // ── SECTIONS ─────────────────────────────────────────
  const createSection = async (e) => {
    e.preventDefault();
    try {
      await api('/attendance/sections', { method:'POST', body: JSON.stringify(sectionForm) });
      setSectionMsg('✅ Section created!');
      setShowSectionForm(false);
      loadAll();
    } catch(e) { setSectionMsg('❌ ' + e.message); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if(!file || !uploadSection) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', uploadMode);
    setUploadResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/attendance/sections/${uploadSection.id}/upload-students`, {
        method:'POST', headers:{ 'Authorization':'Bearer '+token }, body: formData
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error);
      setUploadResult(data);
      loadAll();
    } catch(e) { setSectionMsg('❌ ' + e.message); }
    e.target.value = '';
  };

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/attendance/template`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if(!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'student_template.xlsx';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch(e) { setMsg('❌ Template download failed: ' + e.message); }
  };

  // ── SUMMARY ──────────────────────────────────────────
  const loadSummary = async (secId, domain) => {
    try {
      const data = await api(`/attendance/summary/${secId}?domain=${domain}`);
      setSummary(data);
    } catch(e) { console.error(e); }
  };

  const loadAudit = async (secId) => {
    try {
      const data = await api(`/attendance/audit/${secId}`);
      setAuditData(data);
      setShowAudit(true);
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    if(selectedSection) { loadSummary(selectedSection, summaryDomain); setShowAudit(false); }
  }, [selectedSection, summaryDomain]);

  // ── EXPORT ───────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams(exportOpts).toString();
      const data = await api(`/attendance/export?${params}`);
      const XLSX = window.XLSX;
      if(!XLSX) { alert('Please wait, loading Excel library...'); return; }
      const wb = XLSX.utils.book_new();
      const rows = data.map(r => ({
        'Roll No': r.roll_no, 'Name': r.name, 'Section': r.section_name,
        'Institution': r.institution, 'Domain': r.domain,
        'Total Sessions': r.total_sessions, 'Present': r.present_count,
        'Absent': parseInt(r.total_sessions) - parseInt(r.present_count),
        'Attendance %': parseFloat(r.percentage), 'Category': pctCategory(r.percentage),
      }));
      const ws1 = XLSX.utils.json_to_sheet(rows);
      ws1['!cols'] = [{wch:18},{wch:30},{wch:20},{wch:12},{wch:14},{wch:14},{wch:10},{wch:10},{wch:14},{wch:12}];
      XLSX.utils.book_append_sheet(wb, ws1, 'Student Wise');
      const cats = [
        { label:'≥ 75%',         filter: r => parseFloat(r.percentage) >= 75 },
        { label:'≥ 70% & < 75%', filter: r => parseFloat(r.percentage) >= 70 && parseFloat(r.percentage) < 75 },
        { label:'≥ 65% & < 70%', filter: r => parseFloat(r.percentage) >= 65 && parseFloat(r.percentage) < 70 },
        { label:'≥ 60% & < 65%', filter: r => parseFloat(r.percentage) >= 60 && parseFloat(r.percentage) < 65 },
        { label:'≥ 40% & < 60%', filter: r => parseFloat(r.percentage) >= 40 && parseFloat(r.percentage) < 60 },
        { label:'≥ 1% & < 40%',  filter: r => parseFloat(r.percentage) > 0 && parseFloat(r.percentage) < 40 },
        { label:'0%',             filter: r => parseFloat(r.percentage) === 0 },
      ];
      const summaryRows = cats.map(c => {
        const count = data.filter(c.filter).length;
        return { 'Category': c.label, 'Count': count, '% of Total': data.length > 0 ? ((count/data.length)*100).toFixed(1)+'%' : '0%' };
      });
      summaryRows.push({ 'Category': 'TOTAL', 'Count': data.length, '% of Total': '100%' });
      const ws2 = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, ws2, 'Summary');
      const domain = exportOpts.domain === 'all' ? 'All_Domains' : exportOpts.domain;
      XLSX.writeFile(wb, `CDC_Attendance_${domain}_${MAX_DATE}.xlsx`);
    } catch(e) { alert('Export error: ' + e.message); }
    finally { setExporting(false); }
  };

  // ── STYLES ───────────────────────────────────────────
  const card = { background:theme.card, borderRadius:'14px', border:`1px solid ${theme.border}`, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' };
  const inp  = { width:'100%', padding:'9px 12px', border:`2px solid ${theme.border}`, borderRadius:'8px', fontSize:'14px', boxSizing:'border-box', outline:'none', background:theme.card, color:theme.text };
  const tab  = (id) => ({ padding:'9px 18px', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight: activeTab===id?'600':'400', background: activeTab===id ? theme.accent : 'transparent', color: activeTab===id ? '#fff' : theme.subtext });

  // ── RENDER ───────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'24px', fontWeight:'700', color:theme.text }}>📊 Attendance</h1>
          <p style={{ margin:'3px 0 0', fontSize:'13px', color:theme.subtext }}>{sections.length} sections · {alerts.length} students below 75%</p>
        </div>
        <div style={{ display:'flex', gap:'6px', background:theme.bg, padding:'4px', borderRadius:'10px' }}>
          {[['mark','✅ Mark'],['sections','📋 Sections'],['alerts','🚨 Alerts'],['export','📊 Attendance Monitoring'],...(isAdmin?[['pending','📋 Pending Report']]:[] )].map(([id,label])=>(
            <button key={id} onClick={()=>setActiveTab(id)} style={tab(id)}>
              {id==='alerts' && alerts.length > 0 ? `🚨 Alerts (${alerts.length})` : label}
            </button>
          ))}
        </div>
      </div>

      {msg && <div style={{ background:msg.startsWith('❌')?'#fee2e2':msg.startsWith('⚠️')?'#fef3c7':'#d1fae5', color:msg.startsWith('❌')?'#991b1b':msg.startsWith('⚠️')?'#92400e':'#065f46', padding:'12px', borderRadius:'8px', marginBottom:'16px', fontWeight:'500' }}>{msg}</div>}

      {/* ══ MARK ATTENDANCE TAB ══════════════════════════ */}
      {activeTab === 'mark' && (
        <div>
          {!markingSlot ? (
            <div>
              {/* Date picker */}
              <div style={{ ...card, padding:'16px 20px', marginBottom:'16px', display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <label style={{ fontSize:'13px', fontWeight:'600', color:theme.text, whiteSpace:'nowrap' }}>📅 Select Date:</label>
                  <input type="date" value={selectedDate} min={MIN_DATE} max={MAX_DATE}
                    onChange={e => setSelectedDate(e.target.value)}
                    style={{ ...inp, width:'160px', fontSize:'14px' }} />
                </div>
                <button onClick={() => setSelectedDate(MAX_DATE)} style={{ padding:'8px 14px', background:selectedDate===MAX_DATE?theme.accent:theme.bg, color:selectedDate===MAX_DATE?'#fff':theme.subtext, border:`1px solid ${theme.border}`, borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>
                  Today
                </button>
                {selectedDate !== MAX_DATE && (
                  <span style={{ background:'#fef3c7', color:'#92400e', padding:'5px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'600' }}>
                    📅 Viewing: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
                  </span>
                )}
              </div>

              {/* Slots for selected date */}
              <h2 style={{ margin:'0 0 14px', fontSize:'15px', fontWeight:'700', color:theme.text }}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
              </h2>

              {dateLoading ? <p style={{ color:theme.subtext }}>Loading…</p> :
              dateSlots.length === 0 ? (
                <div style={{ ...card, padding:'48px', textAlign:'center', color:theme.subtext }}>
                  <div style={{ fontSize:'36px', marginBottom:'8px' }}>📭</div>
                  <p style={{ margin:0 }}>No classes scheduled for this day</p>
                </div>
              ) : isAdmin ? (
                /* ── ADMIN VIEW ── */
                <AdminMarkView
                  slots={dateSlots}
                  theme={theme}
                  user={user}
                  adminView={adminView}
                  setAdminView={setAdminView}
                  expandedTrainer={expandedTrainer}
                  setExpandedTrainer={setExpandedTrainer}
                  filterDomain={filterDomain}
                  setFilterDomain={setFilterDomain}
                  filterStatus={filterStatus}
                  setFilterStatus={setFilterStatus}
                  startMarking={startMarking}
                  setActiveTab={setActiveTab}
                  card={card}
                />
              ) : (
                /* ── TRAINER VIEW — unchanged ── */
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(310px,1fr))', gap:'12px' }}>
                  {dateSlots.map((slot,i) => {
                    const hasStudents = slot.has_students || parseInt(slot.student_count) > 0;
                    const hasLP       = slot.has_lesson_plan;
                    const isMarked    = !!slot.session_id;
                    const blocked     = !hasStudents;
                    return (
                      <div key={i} style={{ ...card, padding:'16px 18px', borderLeft:`4px solid ${isMarked ? '#10b981' : blocked ? '#ef4444' : '#f59e0b'}`, opacity: blocked ? 0.8 : 1 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                          <div>
                            <div style={{ fontWeight:'700', color:theme.text, fontSize:'14px' }}>{slot.class_name}</div>
                            <div style={{ fontSize:'12px', color:theme.subtext, marginTop:'2px' }}>
                              Slot {slot.slot_number} · {SLOTS.find(s=>s.n===slot.slot_number)?.t}
                              {slot.session_type && <span style={{ marginLeft:'6px', background:theme.bg, padding:'1px 6px', borderRadius:'4px' }}>{slot.session_type}</span>}
                            </div>
                          </div>
                          {isMarked
                            ? <span style={{ background:'#d1fae5', color:'#065f46', padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600' }}>✅ Marked</span>
                            : <span style={{ background:'#fef3c7', color:'#92400e', padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600' }}>⏳ Pending</span>
                          }
                        </div>
                        {blocked && (
                          <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:'7px', padding:'7px 10px', fontSize:'12px', color:'#991b1b', marginBottom:'8px' }}>
                            🔴 Student list not uploaded. <a href="/attendance" onClick={()=>setActiveTab('sections')} style={{ color:'#991b1b', fontWeight:'700' }}>Upload now →</a>
                          </div>
                        )}
                        {!blocked && !hasLP && (
                          <div style={{ background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:'7px', padding:'7px 10px', fontSize:'12px', color:'#92400e', marginBottom:'8px' }}>
                            🟡 Lesson plan missing. <a href="/lessonplans" style={{ color:'#92400e', fontWeight:'700' }}>Upload →</a>
                          </div>
                        )}
                        <div style={{ fontSize:'12px', color:theme.subtext, marginBottom:'10px' }}>👥 {slot.student_count || 0} students</div>
                        <button onClick={() => !blocked && startMarking(slot)} disabled={blocked}
                          style={{ width:'100%', padding:'9px', border:'none', borderRadius:'8px', cursor:blocked?'not-allowed':'pointer',
                            background: blocked ? '#e2e8f0' : isMarked ? theme.bg : theme.accent,
                            color: blocked ? '#94a3b8' : isMarked ? theme.subtext : '#fff',
                            fontSize:'13px', fontWeight:'600' }}>
                          {blocked ? '🔴 Upload Students First' : isMarked ? '✏️ Edit Attendance' : '📝 Mark Attendance'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ── MARKING INTERFACE ── */
            <div style={{ maxWidth:'820px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'18px', flexWrap:'wrap' }}>
                <button onClick={()=>{setMarkingSlot(null);setSession(null);setStudents([]);setMsg('');}} style={{ background:theme.bg, border:`1px solid ${theme.border}`, color:theme.subtext, padding:'8px 14px', borderRadius:'8px', cursor:'pointer', fontSize:'13px' }}>← Back</button>
                <div>
                  <div style={{ fontWeight:'700', fontSize:'16px', color:theme.text }}>{markingSlot.class_name}</div>
                  <div style={{ fontSize:'12px', color:theme.subtext }}>
                    Slot {markingSlot.slot_number} · {SLOTS.find(s=>s.n===markingSlot.slot_number)?.t} · {selectedDate !== MAX_DATE ? new Date(selectedDate+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : 'Today'}
                  </div>
                </div>
                <div style={{ marginLeft:'auto', display:'flex', gap:'8px' }}>
                  <span style={{ background:'#d1fae5', color:'#065f46', padding:'4px 12px', borderRadius:'20px', fontSize:'13px', fontWeight:'600' }}>P: {students.filter(s=>s.status==='P').length}</span>
                  <span style={{ background:'#fee2e2', color:'#991b1b', padding:'4px 12px', borderRadius:'20px', fontSize:'13px', fontWeight:'600' }}>A: {students.filter(s=>s.status==='A').length}</span>
                </div>
              </div>

              {/* Edit mode warning */}
              {isEditMode && (
                <div style={{ background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:'10px', padding:'12px 16px', marginBottom:'14px' }}>
                  <div style={{ fontWeight:'600', color:'#92400e', marginBottom:'6px' }}>✏️ Editing existing attendance — reason required</div>
                  <input value={editReason} onChange={e=>setEditReason(e.target.value)}
                    placeholder="Write reason for editing (e.g. correction, data entry error)..."
                    style={{ ...inp, fontSize:'13px', border:'1px solid #fcd34d', background:'#fffbeb' }} />
                </div>
              )}

              {/* Topic — LP or manual */}
              <div style={{ ...card, padding:'14px 16px', marginBottom:'14px' }}>
                <div style={{ fontSize:'13px', fontWeight:'600', color:theme.text, marginBottom:'10px' }}>📖 Topic Covered Today</div>
                {lpData?.plan_exists ? (
                  <div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'8px' }}>
                      {(lpData.sessions||[]).map(s => (
                        <label key={s.id} style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', padding:'7px 10px', borderRadius:'7px', border:`1px solid ${lpSessionId===s.id&&!lpNotCovered?theme.accent:theme.border}`, background:lpSessionId===s.id&&!lpNotCovered?theme.accent+'11':theme.bg }}>
                          <input type="radio" checked={lpSessionId===s.id && !lpNotCovered} onChange={()=>{setLpSessionId(s.id);setLpNotCovered(false);}} style={{ display:'none' }}/>
                          <div style={{ width:'14px', height:'14px', borderRadius:'50%', border:`2px solid ${lpSessionId===s.id&&!lpNotCovered?theme.accent:theme.border}`, background:lpSessionId===s.id&&!lpNotCovered?theme.accent:'transparent', flexShrink:0 }}/>
                          <span style={{ fontSize:'12px', color:theme.text }}>
                            {s.id === lpData.suggested_id && <span style={{ background:'#dbeafe', color:'#1d4ed8', padding:'1px 5px', borderRadius:'4px', fontSize:'10px', marginRight:'5px' }}>💡 Suggested</span>}
                            Session {s.session_no} — {s.topic}
                            {s.planned_date && <span style={{ color:theme.subtext, marginLeft:'6px', fontSize:'11px' }}>({new Date(s.planned_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})})</span>}
                          </span>
                        </label>
                      ))}
                      <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', padding:'7px 10px', borderRadius:'7px', border:`1px solid ${lpNotCovered?'#ef4444':theme.border}`, background:lpNotCovered?'#fef2f2':theme.bg }}>
                        <input type="radio" checked={lpNotCovered} onChange={()=>setLpNotCovered(true)} style={{ display:'none' }}/>
                        <div style={{ width:'14px', height:'14px', borderRadius:'50%', border:`2px solid ${lpNotCovered?'#ef4444':theme.border}`, background:lpNotCovered?'#ef4444':'transparent', flexShrink:0 }}/>
                        <span style={{ fontSize:'12px', color:lpNotCovered?'#dc2626':theme.text }}>Topic not covered today</span>
                      </label>
                    </div>
                    {lpNotCovered && (
                      <input value={lpComment} onChange={e=>setLpComment(e.target.value)}
                        placeholder="Reason (e.g. doubt session, test, holiday makeup)"
                        style={{ ...inp, fontSize:'13px' }} />
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize:'12px', color:'#f59e0b', marginBottom:'6px' }}>📒 No lesson plan uploaded — enter topic manually</div>
                    <input value={manualTopic} onChange={e=>setManualTopic(e.target.value)}
                      placeholder="e.g. Number System — Divisibility Rules, Chapter 4"
                      style={{ ...inp, fontSize:'13px' }} />
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <div style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
                <button onClick={()=>toggleAll('P')} style={{ padding:'8px 16px', background:'#d1fae5', color:'#065f46', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>✅ All Present</button>
                <button onClick={()=>toggleAll('A')} style={{ padding:'8px 16px', background:'#fee2e2', color:'#991b1b', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>❌ All Absent</button>
              </div>

              {/* Student list */}
              <div style={{ ...card, overflow:'hidden', marginBottom:'14px' }}>
                {students.map((s,i) => (
                  <div key={s.id} style={{ display:'flex', alignItems:'center', padding:'10px 14px', borderBottom:`1px solid ${theme.border}`, background: i%2===0?theme.card:theme.bg }}>
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:'13px', fontWeight:'600', color:theme.text }}>{s.name}</span>
                      <span style={{ fontSize:'11px', color:theme.subtext, marginLeft:'8px' }}>{s.roll_no}</span>
                    </div>
                    <div style={{ display:'flex', gap:'6px' }}>
                      <button onClick={()=>setStudents(st=>st.map(x=>x.id===s.id?{...x,status:'P'}:x))} style={{ padding:'6px 14px', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'13px', fontWeight:'600', background:s.status==='P'?'#10b981':'#f1f5f9', color:s.status==='P'?'#fff':'#9ca3af' }}>P</button>
                      <button onClick={()=>setStudents(st=>st.map(x=>x.id===s.id?{...x,status:'A'}:x))} style={{ padding:'6px 14px', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'13px', fontWeight:'600', background:s.status==='A'?'#ef4444':'#f1f5f9', color:s.status==='A'?'#fff':'#9ca3af' }}>A</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Remarks */}
              <div style={{ marginBottom:'14px' }}>
                <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:theme.subtext, marginBottom:'5px' }}>Remarks (optional)</label>
                <input value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder="Any notes..." style={inp} />
              </div>

              <button onClick={submitAttendance} disabled={submitting || (isEditMode && !editReason.trim())}
                style={{ padding:'13px 32px', background:submitting||(isEditMode&&!editReason.trim())?'#9ca3af':theme.accent, color:'#fff', border:'none', borderRadius:'10px', fontWeight:'700', cursor:'pointer', fontSize:'15px' }}>
                {submitting ? 'Saving…' : isEditMode ? `✏️ Update Attendance` : `💾 Submit (${students.filter(s=>s.status==='P').length}P / ${students.filter(s=>s.status==='A').length}A)`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ SECTIONS TAB ═════════════════════════════════ */}
      {activeTab === 'sections' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
            <h2 style={{ margin:0, fontSize:'15px', fontWeight:'700', color:theme.text }}>Sections ({sections.length})</h2>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={downloadTemplate} style={{ padding:'8px 14px', background:theme.bg, color:theme.subtext, border:`1px solid ${theme.border}`, borderRadius:'8px', cursor:'pointer', fontSize:'13px' }}>📥 Template</button>
              <button onClick={()=>setShowSectionForm(!showSectionForm)} style={{ padding:'8px 14px', background:theme.accent, color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>+ Add Section</button>
            </div>
          </div>
          {sectionMsg && <div style={{ background:sectionMsg.startsWith('✅')?'#d1fae5':'#fee2e2', color:sectionMsg.startsWith('✅')?'#065f46':'#991b1b', padding:'10px', borderRadius:'8px', marginBottom:'12px' }}>{sectionMsg}</div>}

          {showSectionForm && (
            <div style={{ ...card, padding:'22px', marginBottom:'18px' }}>
              <h3 style={{ margin:'0 0 14px', fontSize:'14px', fontWeight:'700', color:theme.text }}>New Section</h3>
              <form onSubmit={createSection}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'10px', marginBottom:'12px' }}>
                  <div><label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:theme.subtext, marginBottom:'4px' }}>Section Name *</label><input value={sectionForm.name} onChange={e=>setSectionForm({...sectionForm,name:e.target.value})} style={inp} required /></div>
                  <div><label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:theme.subtext, marginBottom:'4px' }}>Institution</label><select value={sectionForm.institution} onChange={e=>setSectionForm({...sectionForm,institution:e.target.value})} style={inp}>{INSTITUTIONS.map(i=><option key={i}>{i}</option>)}</select></div>
                  <div><label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:theme.subtext, marginBottom:'4px' }}>Domain</label><select value={sectionForm.domain} onChange={e=>setSectionForm({...sectionForm,domain:e.target.value})} style={inp}>{DOMAINS.map(d=><option key={d}>{d}</option>)}</select></div>
                  <div><label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:theme.subtext, marginBottom:'4px' }}>Semester Start</label><input type="date" value={sectionForm.semester_start} onChange={e=>setSectionForm({...sectionForm,semester_start:e.target.value})} style={inp}/></div>
                </div>
                <div style={{ background:'#f8fafc', borderRadius:'8px', padding:'12px', marginBottom:'12px' }}>
                  <div style={{ fontSize:'12px', fontWeight:'600', color:theme.text, marginBottom:'8px' }}>👥 CR Details (optional)</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'8px' }}>
                    <div><label style={{ display:'block', fontSize:'10px', fontWeight:'600', color:theme.subtext, marginBottom:'3px' }}>CR1 Name</label><input value={sectionForm.cr1_name} onChange={e=>setSectionForm({...sectionForm,cr1_name:e.target.value})} style={{...inp,padding:'7px 10px'}}/></div>
                    <div><label style={{ display:'block', fontSize:'10px', fontWeight:'600', color:theme.subtext, marginBottom:'3px' }}>CR1 Mobile</label><input value={sectionForm.cr1_phone} onChange={e=>setSectionForm({...sectionForm,cr1_phone:e.target.value})} style={{...inp,padding:'7px 10px'}}/></div>
                    <div><label style={{ display:'block', fontSize:'10px', fontWeight:'600', color:theme.subtext, marginBottom:'3px' }}>CR2 Name</label><input value={sectionForm.cr2_name} onChange={e=>setSectionForm({...sectionForm,cr2_name:e.target.value})} style={{...inp,padding:'7px 10px'}}/></div>
                    <div><label style={{ display:'block', fontSize:'10px', fontWeight:'600', color:theme.subtext, marginBottom:'3px' }}>CR2 Mobile</label><input value={sectionForm.cr2_phone} onChange={e=>setSectionForm({...sectionForm,cr2_phone:e.target.value})} style={{...inp,padding:'7px 10px'}}/></div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button type="submit" style={{ padding:'9px 20px', background:theme.accent, color:'#fff', border:'none', borderRadius:'8px', fontWeight:'600', cursor:'pointer' }}>Create</button>
                  <button type="button" onClick={()=>setShowSectionForm(false)} style={{ padding:'9px 14px', background:theme.bg, color:theme.subtext, border:`1px solid ${theme.border}`, borderRadius:'8px', cursor:'pointer' }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'10px' }}>
            {sections.map(sec => (
              <div key={sec.id} style={{ ...card, padding:'16px 18px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                  <div>
                    <div style={{ fontWeight:'700', fontSize:'14px', color:theme.text }}>{sec.name}</div>
                    <div style={{ fontSize:'11px', color:theme.subtext, marginTop:'1px' }}>{sec.domain} · {sec.institution} · {sec.student_count||0} students</div>
                  </div>
                  <span style={{ background:theme.bg, color:theme.subtext, padding:'2px 7px', borderRadius:'20px', fontSize:'11px' }}>{sec.sessions_conducted||0} sessions</span>
                </div>
                {(sec.cr1_name||sec.cr2_name) && (
                  <div style={{ background:theme.bg, borderRadius:'6px', padding:'7px 9px', marginBottom:'8px', fontSize:'11px', color:theme.subtext }}>
                    {sec.cr1_name&&<div>👤 CR1: <strong style={{ color:theme.text }}>{sec.cr1_name}</strong> {sec.cr1_phone&&`· ${sec.cr1_phone}`}</div>}
                    {sec.cr2_name&&<div>👤 CR2: <strong style={{ color:theme.text }}>{sec.cr2_name}</strong> {sec.cr2_phone&&`· ${sec.cr2_phone}`}</div>}
                  </div>
                )}
                <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                  <button onClick={()=>{ setUploadSection(sec); setUploadResult(null); }} style={{ flex:1, padding:'6px', background:'#dbeafe', color:'#1d4ed8', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'11px', fontWeight:'600' }}>📤 Upload Students</button>
                  <button onClick={()=>{ setSelectedSection(sec.id); setSummaryDomain('all'); setActiveTab('alerts'); setShowAudit(false); }} style={{ flex:1, padding:'6px', background:theme.bg, color:theme.subtext, border:`1px solid ${theme.border}`, borderRadius:'6px', cursor:'pointer', fontSize:'11px' }}>📊 Stats</button>
                </div>
                {uploadSection?.id === sec.id && (
                  <div style={{ marginTop:'10px', background:theme.bg, borderRadius:'7px', padding:'10px' }}>
                    <div style={{ fontSize:'11px', fontWeight:'600', color:theme.text, marginBottom:'6px' }}>Upload Student List</div>
                    <div style={{ display:'flex', gap:'6px', marginBottom:'6px' }}>
                      {['replace','merge'].map(m=>(
                        <button key={m} onClick={()=>setUploadMode(m)} style={{ padding:'4px 10px', border:'none', borderRadius:'5px', cursor:'pointer', fontSize:'11px', fontWeight:'600', background:uploadMode===m?theme.accent:theme.card, color:uploadMode===m?'#fff':theme.subtext }}>
                          {m==='replace'?'🔄 Replace':'➕ Merge'}
                        </button>
                      ))}
                    </div>
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} style={{ display:'none' }} />
                    <button onClick={()=>fileRef.current.click()} style={{ width:'100%', padding:'8px', background:theme.accent, color:'#fff', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'12px', fontWeight:'600' }}>📁 Choose File</button>
                    {uploadResult && (
                      <div style={{ marginTop:'6px', background:'#d1fae5', borderRadius:'6px', padding:'8px', fontSize:'11px', color:'#065f46' }}>
                        ✅ {uploadResult.inserted} students loaded! Preview: {uploadResult.preview?.map(s=>s.name).join(', ')}...
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ ALERTS TAB ══════════════════════════════════ */}
      {activeTab === 'alerts' && (
        <div>
          {selectedSection && (
            <div>
              {/* Section summary + Audit toggle */}
              <div style={{ display:'flex', gap:'10px', marginBottom:'14px', alignItems:'center', flexWrap:'wrap' }}>
                <button onClick={()=>setSelectedSection(null)} style={{ padding:'7px 14px', background:theme.bg, color:theme.subtext, border:`1px solid ${theme.border}`, borderRadius:'8px', cursor:'pointer', fontSize:'12px' }}>← All Sections</button>
                <select value={summaryDomain} onChange={e=>setSummaryDomain(e.target.value)} style={{ ...inp, width:'auto' }}>
                  <option value="all">All Domains</option>
                  {DOMAINS.map(d=><option key={d}>{d}</option>)}
                </select>
                {isAdmin && (
                  <button onClick={()=>{ if(!showAudit) loadAudit(selectedSection); else setShowAudit(false); }} style={{ padding:'7px 14px', background:showAudit?theme.accent:theme.bg, color:showAudit?'#fff':theme.subtext, border:`1px solid ${showAudit?theme.accent:theme.border}`, borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:'600' }}>
                    🔍 Attendance Audit {showAudit ? '(Hide)' : '(Show)'}
                  </button>
                )}
              </div>

              {/* Attendance Audit */}
              {showAudit && isAdmin && (
                <div style={{ ...card, overflow:'hidden', marginBottom:'16px' }}>
                  <div style={{ padding:'12px 16px', borderBottom:`1px solid ${theme.border}`, background:'#fef3c7' }}>
                    <h3 style={{ margin:0, fontSize:'14px', fontWeight:'700', color:'#92400e' }}>🔍 Attendance Audit Trail</h3>
                    <p style={{ margin:'3px 0 0', fontSize:'11px', color:'#92400e' }}>All attendance edits made for this section</p>
                  </div>
                  {!auditData ? <div style={{ padding:'20px', textAlign:'center', color:theme.subtext, fontSize:'13px' }}>Loading audit…</div>
                  : auditData.length === 0 ? (
                    <div style={{ padding:'28px', textAlign:'center', color:theme.subtext }}>
                      <div style={{ fontSize:'28px', marginBottom:'6px' }}>✅</div>
                      <p style={{ margin:0, fontSize:'12px' }}>No edits made — all attendance is original</p>
                    </div>
                  ) : (
                    <div style={{ overflowX:'auto' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead>
                          <tr style={{ background:theme.bg }}>
                            {['Student','Roll No','Date','Slot','Changed By','Old','New','Reason','When'].map(h=>(
                              <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:theme.subtext, borderBottom:`2px solid ${theme.border}`, whiteSpace:'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {auditData.map((a,i) => (
                            <tr key={a.id} style={{ background:i%2===0?theme.card:theme.bg }}>
                              <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{a.student_name}</td>
                              <td style={{ padding:'8px 12px', fontSize:'11px', fontFamily:'monospace', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{a.roll_no}</td>
                              <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}`, whiteSpace:'nowrap' }}>{new Date(a.session_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</td>
                              <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>Slot {a.slot_number}</td>
                              <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}`, whiteSpace:'nowrap' }}>{a.changed_by_name}</td>
                              <td style={{ padding:'8px 12px', borderBottom:`1px solid ${theme.border}` }}>
                                <span style={{ background:a.old_status==='P'?'#d1fae5':'#fee2e2', color:a.old_status==='P'?'#065f46':'#991b1b', padding:'1px 7px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>{a.old_status}</span>
                              </td>
                              <td style={{ padding:'8px 12px', borderBottom:`1px solid ${theme.border}` }}>
                                <span style={{ background:a.new_status==='P'?'#d1fae5':'#fee2e2', color:a.new_status==='P'?'#065f46':'#991b1b', padding:'1px 7px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>{a.new_status}</span>
                              </td>
                              <td style={{ padding:'8px 12px', fontSize:'11px', color:theme.subtext, borderBottom:`1px solid ${theme.border}`, maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.reason}</td>
                              <td style={{ padding:'8px 12px', fontSize:'11px', color:theme.subtext, borderBottom:`1px solid ${theme.border}`, whiteSpace:'nowrap' }}>{new Date(a.changed_at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Section summary */}
              {summary && !showAudit && (
                <div style={{ ...card, overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:`1px solid ${theme.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <h3 style={{ margin:0, fontSize:'14px', fontWeight:'700', color:theme.text }}>Student Attendance</h3>
                    <div style={{ fontSize:'12px', color:theme.subtext }}>
                      <span style={{ color:'#10b981', fontWeight:'600' }}>{summary.safe} safe</span> · <span style={{ color:'#f59e0b', fontWeight:'600' }}>{summary.warning} warning</span> · <span style={{ color:'#ef4444', fontWeight:'600' }}>{summary.below75} below 75%</span>
                    </div>
                  </div>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ background:theme.bg }}>
                        {['Roll No','Name','Sessions','Present','%'].map(h=>(
                          <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:theme.subtext, borderBottom:`2px solid ${theme.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(summary.students||[]).map((s,i) => {
                        const c = pctColor(s.percentage);
                        return (
                          <tr key={s.id} style={{ background:i%2===0?theme.card:theme.bg }}>
                            <td style={{ padding:'8px 12px', fontSize:'11px', fontFamily:'monospace', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{s.roll_no}</td>
                            <td style={{ padding:'8px 12px', fontSize:'12px', fontWeight:'600', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{s.name}</td>
                            <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{s.total_sessions}</td>
                            <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{s.present_count}</td>
                            <td style={{ padding:'8px 12px', borderBottom:`1px solid ${theme.border}` }}>
                              <span style={{ background:c.bg, color:c.text, border:`1px solid ${c.border}`, padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>{s.percentage}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!selectedSection && (
            <div>
              <h2 style={{ margin:'0 0 14px', fontSize:'15px', fontWeight:'700', color:theme.text }}>🚨 Students Below 75% ({alerts.length})</h2>
              {alerts.length === 0 ? (
                <div style={{ ...card, padding:'48px', textAlign:'center', color:theme.subtext }}>
                  <div style={{ fontSize:'36px', marginBottom:'8px' }}>🎉</div>
                  <p style={{ margin:0 }}>All students are above 75% attendance!</p>
                </div>
              ) : (
                <div style={{ ...card, overflow:'hidden' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ background:theme.bg }}>
                        {['Roll No','Name','Section','Domain','Sessions','Present','%'].map(h=>(
                          <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:theme.subtext, borderBottom:`2px solid ${theme.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {alerts.map((a,i) => {
                        const c = pctColor(a.percentage);
                        return (
                          <tr key={i} style={{ background:i%2===0?theme.card:theme.bg }}>
                            <td style={{ padding:'9px 12px', fontSize:'11px', fontFamily:'monospace', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{a.roll_no}</td>
                            <td style={{ padding:'9px 12px', fontSize:'12px', fontWeight:'600', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{a.name}</td>
                            <td style={{ padding:'9px 12px', fontSize:'12px', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{a.section_name}</td>
                            <td style={{ padding:'9px 12px', borderBottom:`1px solid ${theme.border}` }}>
                              <span style={{ background:theme.bg, color:theme.subtext, padding:'1px 7px', borderRadius:'20px', fontSize:'11px' }}>{a.domain}</span>
                            </td>
                            <td style={{ padding:'9px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{a.total_sessions}</td>
                            <td style={{ padding:'9px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{a.present_count}</td>
                            <td style={{ padding:'9px 12px', borderBottom:`1px solid ${theme.border}` }}>
                              <span style={{ background:c.bg, color:c.text, border:`1px solid ${c.border}`, padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>{a.percentage}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ ATTENDANCE MONITORING TAB ════════════════════ */}
      {activeTab === 'export' && (
        <AttendanceMonitoring
          theme={theme}
          isAdmin={isAdmin}
          sections={sections}
          card={card}
          inp={inp}
          handleExport={handleExport}
          exporting={exporting}
          exportOpts={exportOpts}
          setExportOpts={setExportOpts}
          DOMAINS={DOMAINS}
          INSTITUTIONS={INSTITUTIONS}
        />
      )}

      {/* ══ ADMIN PENDING REPORT TAB ════════════════════ */}
      {activeTab === 'pending' && isAdmin && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'18px', flexWrap:'wrap' }}>
            <h2 style={{ margin:0, fontSize:'15px', fontWeight:'700', color:theme.text }}>📋 Attendance Pending Report</h2>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <input type="date" value={pendingReportDate} min={MIN_DATE} max={MAX_DATE}
                onChange={e=>setPendingReportDate(e.target.value)}
                style={{ ...inp, width:'160px' }} />
              <button onClick={loadPendingReport} disabled={pendingLoading} style={{ padding:'9px 18px', background:theme.accent, color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>
                {pendingLoading ? 'Loading…' : '🔍 Fetch Report'}
              </button>
            </div>
          </div>

          {pendingReport && (
            <div>
              <div style={{ display:'flex', gap:'12px', marginBottom:'14px', flexWrap:'wrap' }}>
                <div style={{ ...card, padding:'14px 18px', display:'flex', gap:'10px', alignItems:'center' }}>
                  <span style={{ fontSize:'20px' }}>📅</span>
                  <div>
                    <div style={{ fontWeight:'700', color:theme.text }}>{new Date(pendingReport.date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</div>
                    <div style={{ fontSize:'12px', color:theme.subtext }}>{pendingReport.day}</div>
                  </div>
                </div>
                <div style={{ ...card, padding:'14px 18px', display:'flex', gap:'10px', alignItems:'center' }}>
                  <span style={{ fontSize:'20px' }}>⏳</span>
                  <div>
                    <div style={{ fontWeight:'700', fontSize:'20px', color:'#dc2626' }}>{pendingReport.pending?.length || 0}</div>
                    <div style={{ fontSize:'12px', color:theme.subtext }}>Pending</div>
                  </div>
                </div>
                <div style={{ ...card, padding:'14px 18px', display:'flex', gap:'10px', alignItems:'center' }}>
                  <span style={{ fontSize:'20px' }}>✅</span>
                  <div>
                    <div style={{ fontWeight:'700', fontSize:'20px', color:'#10b981' }}>{pendingReport.marked?.length || 0}</div>
                    <div style={{ fontSize:'12px', color:theme.subtext }}>Marked</div>
                  </div>
                </div>
              </div>

              {pendingReport.pending?.length > 0 && (
                <div style={{ ...card, overflow:'hidden', marginBottom:'16px' }}>
                  <div style={{ padding:'12px 16px', borderBottom:`1px solid ${theme.border}`, background:'#fef2f2' }}>
                    <h3 style={{ margin:0, fontSize:'13px', fontWeight:'700', color:'#dc2626' }}>⏳ Pending ({pendingReport.pending.length})</h3>
                  </div>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ background:theme.bg }}>
                        {['Trainer','Section','Domain','Slot','Students'].map(h=>(
                          <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:theme.subtext, borderBottom:`2px solid ${theme.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pendingReport.pending.map((p,i) => (
                        <tr key={i} style={{ background:i%2===0?theme.card:theme.bg }}>
                          <td style={{ padding:'9px 12px', fontSize:'12px', fontWeight:'600', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{p.trainer_name}</td>
                          <td style={{ padding:'9px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{p.class_name}</td>
                          <td style={{ padding:'9px 12px', fontSize:'11px', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{p.domain}</td>
                          <td style={{ padding:'9px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>Slot {p.slot_number}</td>
                          <td style={{ padding:'9px 12px', fontSize:'12px', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{p.student_count||0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {pendingReport.marked?.length > 0 && (
                <div style={{ ...card, overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:`1px solid ${theme.border}`, background:'#f0fdf4' }}>
                    <h3 style={{ margin:0, fontSize:'13px', fontWeight:'700', color:'#065f46' }}>✅ Marked ({pendingReport.marked.length})</h3>
                  </div>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ background:theme.bg }}>
                        {['Trainer','Section','Domain','Slot'].map(h=>(
                          <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:theme.subtext, borderBottom:`2px solid ${theme.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pendingReport.marked.map((p,i) => (
                        <tr key={i} style={{ background:i%2===0?theme.card:theme.bg }}>
                          <td style={{ padding:'8px 12px', fontSize:'12px', fontWeight:'600', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{p.trainer_name}</td>
                          <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{p.class_name}</td>
                          <td style={{ padding:'8px 12px', fontSize:'11px', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{p.domain}</td>
                          <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>Slot {p.slot_number}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {pendingReport.pending?.length === 0 && (
                <div style={{ ...card, padding:'48px', textAlign:'center', color:theme.subtext }}>
                  <div style={{ fontSize:'36px', marginBottom:'8px' }}>🎉</div>
                  <p style={{ margin:0 }}>All attendance marked for this day!</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
