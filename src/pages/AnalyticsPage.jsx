import { useState, useEffect, useCallback } from 'react';
import { api, getUser } from '../api';
import { useOutletContext } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const DOMAIN_COLORS = { Aptitude:'#3b82f6', Verbal:'#10b981', Technical:'#8b5cf6', 'Soft Skills':'#f59e0b' };

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
}
function scoreColor(s) {
  if (s >= 80) return '#10b981';
  if (s >= 60) return '#f59e0b';
  return '#ef4444';
}

// ── Student drilldown modal ───────────────────────────────────────
function StudentDrillModal({ section, dateFrom, dateTo, theme, onClose }) {
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api(`/analytics/section-students/${section.id}?from=${dateFrom}&to=${dateTo}`)
      .then(d => setStudents(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const bandOf = pct => {
    const p = parseFloat(pct);
    if (p >= 80) return { label:'≥80%',  bg:'#d1fae5', color:'#065f46' };
    if (p >= 75) return { label:'75-80%', bg:'#fef3c7', color:'#92400e' };
    if (p >= 65) return { label:'65-75%', bg:'#ffedd5', color:'#9a3412' };
    if (p >= 40) return { label:'40-65%', bg:'#fee2e2', color:'#991b1b' };
    return             { label:'<40%',   bg:'#fca5a5', color:'#7f1d1d' };
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px' }} onClick={onClose}>
      <div style={{ background:theme.card,borderRadius:'16px',width:'100%',maxWidth:'640px',maxHeight:'88vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px 12px',borderBottom:`1px solid ${theme.border}`,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:'700',fontSize:'15px',color:theme.text }}>{section.name} — {section.domain}</div>
            <div style={{ fontSize:'12px',color:theme.subtext,marginTop:'2px' }}>{section.trainer_name} · {section.institution} · {fmtDate(dateFrom)} to {fmtDate(dateTo)}</div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:'20px',cursor:'pointer',color:theme.subtext }}>✕</button>
        </div>
        <div style={{ flex:1,overflowY:'auto' }}>
          {loading ? <div style={{ padding:'24px',textAlign:'center',color:theme.subtext }}>Loading…</div>
          : students.length===0 ? <div style={{ padding:'24px',textAlign:'center',color:theme.subtext }}>No student data available.</div>
          : (
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'13px' }}>
              <thead>
                <tr style={{ background:theme.bg }}>
                  {['#','Roll No','Name','Sessions','Present','Attendance %'].map(h=>(
                    <th key={h} style={{ padding:'9px 12px',textAlign:'left',color:theme.subtext,fontWeight:'600',fontSize:'11px',textTransform:'uppercase',borderBottom:`1px solid ${theme.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s,i)=>{
                  const b = bandOf(s.pct);
                  return (
                    <tr key={s.roll_no} style={{ background:i%2===0?theme.card:theme.bg,borderBottom:`1px solid ${theme.border}` }}>
                      <td style={{ padding:'8px 12px',color:theme.subtext,fontSize:'12px' }}>{i+1}</td>
                      <td style={{ padding:'8px 12px',color:theme.subtext,fontSize:'12px' }}>{s.roll_no}</td>
                      <td style={{ padding:'8px 12px',fontWeight:'600',color:theme.text }}>{s.name}</td>
                      <td style={{ padding:'8px 12px',color:theme.subtext }}>{s.total_sessions}</td>
                      <td style={{ padding:'8px 12px',color:theme.subtext }}>{s.present}</td>
                      <td style={{ padding:'8px 12px' }}>
                        <span style={{ background:b.bg,color:b.color,padding:'2px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:'700' }}>{s.pct}%</span>
                      </td>
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

// ── Custom tooltip for charts ─────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#1e293b',borderRadius:'10px',padding:'10px 14px',boxShadow:'0 4px 20px rgba(0,0,0,0.3)' }}>
      <div style={{ color:'#94a3b8',fontSize:'11px',marginBottom:'5px' }}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{ color:p.color||'#fff',fontSize:'13px',fontWeight:'600' }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════
export default function AnalyticsPage() {
  const { theme } = useOutletContext();
  const user = getUser();

  const today    = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo,   setDateTo]   = useState(today);
  const [applied,  setApplied]  = useState({ from:monthStart, to:today });

  const [overview,  setOverview]  = useState(null);
  const [weekly,    setWeekly]    = useState([]);
  const [domains,   setDomains]   = useState([]);
  const [sections,  setSections]  = useState([]);
  const [trainers,  setTrainers]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  const [sectFilter, setSectFilter] = useState({ institution:'all', domain:'all' });
  const [drillSection, setDrillSection] = useState(null);
  const [exportBusy, setExportBusy]   = useState('');

  const loadAll = useCallback(async (from, to) => {
    setLoading(true);
    try {
      const qs = `?from=${from}&to=${to}`;
      const [ov, wk, dm, sc, tr] = await Promise.all([
        api(`/analytics/overview${qs}`),
        api(`/analytics/weekly${qs}`),
        api(`/analytics/domains${qs}`),
        api(`/analytics/sections${qs}`),
        api(`/analytics/trainers${qs}`),
      ]);
      setOverview(ov); setWeekly(wk); setDomains(dm); setSections(sc); setTrainers(tr);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(applied.from, applied.to); }, [applied]);

  const applyFilter = () => {
    if (!dateFrom || !dateTo) return;
    if (new Date(dateTo) < new Date(dateFrom)) { alert('End date must be after start date'); return; }
    setApplied({ from:dateFrom, to:dateTo });
  };

  // Export Excel
  const exportExcel = async () => {
    setExportBusy('excel');
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // Sheet 1: Overview
      const ovData = overview ? [
        ['CDC Performance Report', '', '', ''],
        ['Period', `${fmtDate(applied.from)} to ${fmtDate(applied.to)}`, '', ''],
        ['', '', '', ''],
        ['Metric', 'Value', '', ''],
        ['Sessions Conducted', overview.conducted, '', ''],
        ['Sessions Planned', overview.planned, '', ''],
        ['Completion %', overview.completion_pct+'%', '', ''],
        ['Avg Attendance', overview.avg_attendance+'%', '', ''],
        ['At-Risk Sections', overview.at_risk_sections, '', ''],
      ] : [];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ovData), 'Overview');

      // Sheet 2: Section Health
      const secData = [['Section','Institution','Domain','Trainer','Total Students','Sessions','Avg Att%','Below 75%','Warning 75-80%','Safe >80%','Below 40%'],
        ...sections.map(s=>[s.name,s.institution,s.domain,s.trainer_name,s.total_students,s.sessions_conducted,s.avg_pct,s.below75,s.warning,s.safe,s.below40])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(secData), 'Section Health');

      // Sheet 3: Trainer Scores
      const trData = [['Trainer','Designation','Sessions Conducted','Att Marking %','LP Uploaded %','Plan Adherence %','Todo Score %','Overall Score'],
        ...trainers.map(t=>[t.name,t.designation,t.sessions_conducted,t.att_mark_score,t.lp_score,t.adherence_score,t.todo_score,t.overall_score])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trData), 'Trainer Scores');

      // Sheet 4: Domain Health
      const dmData = [['Domain','Avg Attendance %','Total Students','Below 75%','Warning 75-80%','Safe >80%'],
        ...domains.map(d=>[d.domain,d.avg_pct,d.total_students,d.below75,d.warning,d.safe])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dmData), 'Domain Health');

      const buf = XLSX.write(wb, { type:'array', bookType:'xlsx' });
      const blob = new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=`CDC_Performance_${applied.from}_${applied.to}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch(e) { alert('Export failed: '+e.message); }
    finally { setExportBusy(''); }
  };

  // Export PDF - simple print view
  const exportPDF = () => {
    window.print();
  };

  const card = { background:theme.card, borderRadius:'12px', border:`1px solid ${theme.border}`, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' };

  // Section filter
  const filteredSections = sections.filter(s => {
    if (sectFilter.institution !== 'all' && s.institution !== sectFilter.institution) return false;
    if (sectFilter.domain !== 'all'      && s.domain !== sectFilter.domain) return false;
    return true;
  });

  const alertSections = filteredSections.filter(s =>
    s.total_students > 0 &&
    (parseInt(s.below40) / parseInt(s.total_students)) * 100 > 20
  );

  if (!user || user.role !== 'super_admin') {
    return <div style={{ padding:'40px', textAlign:'center', color:theme.subtext }}>🔒 Super Admin access only</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'22px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'24px', fontWeight:'700', color:theme.text }}>📊 CDC Performance Analytics</h1>
          <p style={{ margin:'4px 0 0', fontSize:'13px', color:theme.subtext }}>
            {fmtDate(applied.from)} → {fmtDate(applied.to)}
          </p>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={exportExcel} disabled={exportBusy==='excel'} style={{ padding:'9px 16px', borderRadius:'9px', border:`1px solid ${theme.border}`, background:theme.card, color:theme.text, cursor:'pointer', fontSize:'13px', fontWeight:'500' }}>
            {exportBusy==='excel' ? '⏳ Exporting…' : '📊 Export Excel'}
          </button>
          <button onClick={exportPDF} style={{ padding:'9px 16px', borderRadius:'9px', border:'none', background:theme.accent, color:'#fff', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>
            🖨️ Export PDF
          </button>
        </div>
      </div>

      {/* Date filter */}
      <div style={{ ...card, padding:'14px 18px', marginBottom:'22px', display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
        <span style={{ fontSize:'13px', fontWeight:'600', color:theme.text }}>📅 Date Range:</span>
        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{ padding:'7px 11px', borderRadius:'8px', border:`1px solid ${theme.border}`, background:theme.bg, color:theme.text, fontSize:'13px' }} />
        <span style={{ color:theme.subtext }}>to</span>
        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{ padding:'7px 11px', borderRadius:'8px', border:`1px solid ${theme.border}`, background:theme.bg, color:theme.text, fontSize:'13px' }} />
        <button onClick={applyFilter} style={{ padding:'7px 18px', borderRadius:'8px', border:'none', background:theme.accent, color:'#fff', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>Apply</button>
        {/* Quick presets */}
        {[['This Month', monthStart, today],['Last 7 Days', new Date(Date.now()-6*86400000).toISOString().split('T')[0], today]].map(([label,f,t])=>(
          <button key={label} onClick={()=>{ setDateFrom(f); setDateTo(t); setApplied({from:f,to:t}); }} style={{ padding:'6px 12px', borderRadius:'8px', border:`1px solid ${theme.border}`, background:theme.bg, color:theme.text, cursor:'pointer', fontSize:'12px' }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding:'60px', textAlign:'center', color:theme.subtext, fontSize:'16px' }}>Loading analytics…</div>
      ) : (
        <>
          {/* ── KPI STRIP ── */}
          {overview && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'14px', marginBottom:'22px' }}>
              {[
                { label:'Sessions Conducted',  value:overview.conducted,         icon:'📚', color:'#3b82f6' },
                { label:'Sessions Planned',    value:overview.planned,           icon:'📋', color:'#8b5cf6' },
                { label:'Completion Rate',     value:overview.completion_pct+'%',icon:'✅', color:'#10b981' },
                { label:'Avg Attendance',      value:overview.avg_attendance+'%',icon:'👥', color:'#f59e0b' },
                { label:'🚨 At-Risk Sections', value:overview.at_risk_sections,  icon:'⚠️', color:'#ef4444' },
              ].map(s=>(
                <div key={s.label} style={{ ...card, padding:'16px 18px' }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:s.color+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', marginBottom:'10px' }}>{s.icon}</div>
                  <div style={{ fontSize:'26px', fontWeight:'800', color:s.color, lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:'11px', color:theme.subtext, marginTop:'4px', fontWeight:'500' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── CHARTS ROW ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:'18px', marginBottom:'22px' }}>

            {/* Weekly sessions chart */}
            <div style={{ ...card, padding:'20px 22px' }}>
              <div style={{ fontWeight:'700', fontSize:'15px', color:theme.text, marginBottom:'16px' }}>📈 Sessions — Conducted vs Planned (Weekly)</div>
              {weekly.length === 0 ? <div style={{ textAlign:'center', color:theme.subtext, padding:'30px' }}>No data for selected period</div> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={weekly} margin={{ top:0, right:10, bottom:0, left:-10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                    <XAxis dataKey="label" tick={{ fontSize:11, fill:theme.subtext }} />
                    <YAxis tick={{ fontSize:11, fill:theme.subtext }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize:'12px' }} />
                    <Bar dataKey="planned"   name="Planned"   fill="#94a3b8" radius={[4,4,0,0]} />
                    <Bar dataKey="conducted" name="Conducted" fill={theme.accent} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Domain pie/bar */}
            <div style={{ ...card, padding:'20px 22px' }}>
              <div style={{ fontWeight:'700', fontSize:'15px', color:theme.text, marginBottom:'16px' }}>🎯 Attendance by Domain</div>
              {domains.length === 0 ? <div style={{ textAlign:'center', color:theme.subtext, padding:'30px' }}>No data</div> : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={domains} layout="vertical" margin={{ top:0, right:10, bottom:0, left:20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.border} horizontal={false} />
                      <XAxis type="number" domain={[0,100]} tick={{ fontSize:10, fill:theme.subtext }} />
                      <YAxis type="category" dataKey="domain" tick={{ fontSize:11, fill:theme.subtext }} width={70} />
                      <Tooltip content={<ChartTooltip />} formatter={(v)=>[v+'%','Avg Att.']} />
                      <Bar dataKey="avg_pct" name="Avg Att %" radius={[0,4,4,0]}>
                        {domains.map((d,i)=><Cell key={i} fill={DOMAIN_COLORS[d.domain]||'#3b82f6'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop:'12px', display:'flex', flexDirection:'column', gap:'6px' }}>
                    {domains.map(d=>(
                      <div key={d.domain} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'12px' }}>
                        <span style={{ color:DOMAIN_COLORS[d.domain]||'#3b82f6', fontWeight:'600' }}>{d.domain}</span>
                        <span style={{ color:theme.subtext }}>{d.total_students} students · <span style={{ color:'#ef4444' }}>{d.below75} below 75%</span></span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── SECTION HEALTH ── */}
          <div style={{ ...card, overflow:'hidden', marginBottom:'22px' }}>
            <div style={{ padding:'16px 18px', borderBottom:`1px solid ${theme.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'10px' }}>
              <div>
                <div style={{ fontWeight:'700', fontSize:'15px', color:theme.text }}>🏫 Section Attendance Health</div>
                <div style={{ fontSize:'12px', color:theme.subtext, marginTop:'2px' }}>Click any section to see individual student data</div>
              </div>
              {alertSections.length > 0 && (
                <div style={{ background:'#fee2e2', color:'#dc2626', padding:'5px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'700' }}>
                  🚨 {alertSections.length} Critical Section{alertSections.length!==1?'s':''} — &gt;20% students below 40%
                </div>
              )}
              <div style={{ display:'flex', gap:'8px' }}>
                <select value={sectFilter.institution} onChange={e=>setSectFilter(f=>({...f,institution:e.target.value}))} style={{ padding:'6px 10px', borderRadius:'7px', border:`1px solid ${theme.border}`, background:theme.bg, color:theme.text, fontSize:'12px' }}>
                  <option value="all">All Institutions</option>
                  <option value="MRU">MRU</option>
                  <option value="MRIIRS">MRIIRS</option>
                </select>
                <select value={sectFilter.domain} onChange={e=>setSectFilter(f=>({...f,domain:e.target.value}))} style={{ padding:'6px 10px', borderRadius:'7px', border:`1px solid ${theme.border}`, background:theme.bg, color:theme.text, fontSize:'12px' }}>
                  <option value="all">All Domains</option>
                  {['Aptitude','Verbal','Technical','Soft Skills'].map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {filteredSections.length === 0 ? (
              <div style={{ padding:'32px', textAlign:'center', color:theme.subtext }}>No sections with attendance data in this period.</div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead>
                  <tr style={{ background:theme.bg }}>
                    {['Section','Institution','Domain','Trainer','Students','Sessions','Avg %','🔴 &lt;75%','🟡 75-80%','🟢 &gt;80%','Alert',''].map(h=>(
                      <th key={h} style={{ padding:'9px 11px', textAlign:'left', color:theme.subtext, fontWeight:'600', fontSize:'11px', textTransform:'uppercase', borderBottom:`1px solid ${theme.border}`, whiteSpace:'nowrap' }} dangerouslySetInnerHTML={{__html:h}} />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSections.map((s,i)=>{
                    const total = parseInt(s.total_students)||1;
                    const b40pct = Math.round((parseInt(s.below40)/total)*100);
                    const isCritical = b40pct > 20;
                    const avgPct = parseFloat(s.avg_pct)||0;
                    return (
                      <tr key={s.id} style={{ background:isCritical?'#fff5f5':i%2===0?theme.card:theme.bg, borderBottom:`1px solid ${theme.border}`, cursor:'pointer' }}
                        onClick={()=>setDrillSection(s)}>
                        <td style={{ padding:'9px 11px', fontWeight:'600', color:theme.text }}>{s.name}</td>
                        <td style={{ padding:'9px 11px', color:theme.subtext }}>{s.institution}</td>
                        <td style={{ padding:'9px 11px' }}>
                          <span style={{ background:(DOMAIN_COLORS[s.domain]||'#3b82f6')+'22', color:DOMAIN_COLORS[s.domain]||'#3b82f6', padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600' }}>{s.domain}</span>
                        </td>
                        <td style={{ padding:'9px 11px', color:theme.subtext, fontSize:'12px' }}>{s.trainer_name}</td>
                        <td style={{ padding:'9px 11px', color:theme.subtext }}>{s.total_students}</td>
                        <td style={{ padding:'9px 11px', color:theme.subtext }}>{s.sessions_conducted}</td>
                        <td style={{ padding:'9px 11px' }}>
                          <span style={{ fontWeight:'700', color:avgPct>=80?'#10b981':avgPct>=75?'#f59e0b':'#ef4444' }}>{s.avg_pct}%</span>
                        </td>
                        <td style={{ padding:'9px 11px', color:'#ef4444', fontWeight:'600' }}>{s.below75} <span style={{ color:theme.subtext, fontWeight:'400', fontSize:'11px' }}>({Math.round(parseInt(s.below75)/total*100)}%)</span></td>
                        <td style={{ padding:'9px 11px', color:'#f59e0b', fontWeight:'600' }}>{s.warning} <span style={{ color:theme.subtext, fontWeight:'400', fontSize:'11px' }}>({Math.round(parseInt(s.warning)/total*100)}%)</span></td>
                        <td style={{ padding:'9px 11px', color:'#10b981', fontWeight:'600' }}>{s.safe} <span style={{ color:theme.subtext, fontWeight:'400', fontSize:'11px' }}>({Math.round(parseInt(s.safe)/total*100)}%)</span></td>
                        <td style={{ padding:'9px 11px' }}>
                          {isCritical && <span style={{ background:'#fee2e2', color:'#dc2626', padding:'2px 7px', borderRadius:'20px', fontSize:'10px', fontWeight:'700' }}>🚨 Critical</span>}
                        </td>
                        <td style={{ padding:'9px 11px' }}>
                          <span style={{ color:theme.accent, fontSize:'12px' }}>View →</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── TRAINER HEALTH SCORES ── */}
          <div style={{ ...card, overflow:'hidden' }}>
            <div style={{ padding:'16px 18px', borderBottom:`1px solid ${theme.border}` }}>
              <div style={{ fontWeight:'700', fontSize:'15px', color:theme.text }}>👥 Trainer Health Scores</div>
              <div style={{ fontSize:'12px', color:theme.subtext, marginTop:'2px' }}>
                Weighted: 25% Attendance Marking · 20% Lesson Plan · 10% Plan Adherence · 45% Daily To Do
              </div>
            </div>
            {trainers.length === 0 ? (
              <div style={{ padding:'24px', textAlign:'center', color:theme.subtext }}>No trainer data for this period.</div>
            ) : (
              <>
                <div style={{ padding:'16px 18px', overflowX:'auto' }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={[...trainers].sort((a,b)=>b.overall_score-a.overall_score)} margin={{ top:0,right:10,bottom:40,left:-10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                      <XAxis dataKey="name" tick={{ fontSize:10, fill:theme.subtext }} angle={-30} textAnchor="end" interval={0} />
                      <YAxis domain={[0,100]} tick={{ fontSize:11, fill:theme.subtext }} />
                      <Tooltip content={<ChartTooltip />} formatter={(v)=>[v+'%','Score']} />
                      <Bar dataKey="overall_score" name="Overall Score" radius={[4,4,0,0]}>
                        {trainers.map((t,i)=><Cell key={i} fill={scoreColor(t.overall_score)} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                  <thead>
                    <tr style={{ background:theme.bg }}>
                      {['Trainer','Designation','Sessions','Att Marking','LP Uploaded','Plan Adherence','To Do Score','Overall'].map(h=>(
                        <th key={h} style={{ padding:'9px 11px', textAlign:'left', color:theme.subtext, fontWeight:'600', fontSize:'11px', textTransform:'uppercase', borderBottom:`1px solid ${theme.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...trainers].sort((a,b)=>b.overall_score-a.overall_score).map((t,i)=>(
                      <tr key={t.id} style={{ background:i%2===0?theme.card:theme.bg, borderBottom:`1px solid ${theme.border}` }}>
                        <td style={{ padding:'9px 11px', fontWeight:'600', color:theme.text }}>{t.name}</td>
                        <td style={{ padding:'9px 11px', color:theme.subtext, fontSize:'12px' }}>{t.designation||'—'}</td>
                        <td style={{ padding:'9px 11px', color:theme.subtext }}>{t.sessions_conducted}</td>
                        {[t.att_mark_score, t.lp_score, t.adherence_score, t.todo_score].map((score,si)=>(
                          <td key={si} style={{ padding:'9px 11px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                              <div style={{ flex:1, height:'6px', borderRadius:'3px', background:theme.border, overflow:'hidden', minWidth:'40px' }}>
                                <div style={{ width:score+'%', height:'100%', background:scoreColor(score), borderRadius:'3px' }} />
                              </div>
                              <span style={{ fontSize:'12px', fontWeight:'600', color:scoreColor(score), minWidth:'32px' }}>{score}%</span>
                            </div>
                          </td>
                        ))}
                        <td style={{ padding:'9px 11px' }}>
                          <span style={{ background:scoreColor(t.overall_score)+'22', color:scoreColor(t.overall_score), padding:'3px 10px', borderRadius:'20px', fontSize:'13px', fontWeight:'800' }}>
                            {t.overall_score}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </>
      )}

      {/* Student drill modal */}
      {drillSection && (
        <StudentDrillModal
          section={drillSection}
          dateFrom={applied.from}
          dateTo={applied.to}
          theme={theme}
          onClose={()=>setDrillSection(null)}
        />
      )}
    </div>
  );
}
