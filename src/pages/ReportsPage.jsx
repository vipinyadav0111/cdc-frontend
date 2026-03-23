import { useState, useEffect } from 'react';
import { api, getUser } from '../api';
import { useOutletContext } from 'react-router-dom';

const TYPE_COLORS = {
  adjustment:  { bg:'#dbeafe', color:'#1d4ed8', label:'ADJ' },
  duty:        { bg:'#fef3c7', color:'#92400e', label:'DUTY' },
  extra_class: { bg:'#d1fae5', color:'#065f46', label:'EXTRA' },
  cancellation:{ bg:'#fee2e2', color:'#dc2626', label:'OFF' },
};

function pctBadge(pct) {
  const p = parseFloat(pct||0);
  if(p >= 80) return { bg:'#d1fae5', color:'#065f46' };
  if(p >= 75) return { bg:'#fef3c7', color:'#92400e' };
  if(p >= 60) return { bg:'#fff7ed', color:'#9a3412' };
  return { bg:'#fee2e2', color:'#991b1b' };
}

function fmtDate(d) {
  if(!d) return '—';
  return new Date(d).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});
}

// ── TILE WRAPPER ──────────────────────────────────────
function Tile({ icon, title, subtitle, open, onToggle, children, theme, badge, badgeColor }) {
  return (
    <div style={{ background:theme.card, borderRadius:'14px', border:`1px solid ${theme.border}`, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
      <div onClick={onToggle} style={{ padding:'16px 20px', cursor:'pointer', display:'flex', alignItems:'center', gap:'14px', userSelect:'none',
        background: open ? theme.bg : theme.card }}
        onMouseEnter={e=>e.currentTarget.style.background=theme.bg}
        onMouseLeave={e=>e.currentTarget.style.background=open?theme.bg:theme.card}>
        <div style={{ width:'42px', height:'42px', borderRadius:'11px', background:theme.accent+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>
          {icon}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:'700', fontSize:'14px', color:theme.text }}>{title}</div>
          {subtitle && <div style={{ fontSize:'12px', color:theme.subtext, marginTop:'2px' }}>{subtitle}</div>}
        </div>
        {badge !== undefined && (
          <span style={{ background:badgeColor||'#fee2e2', color:badgeColor?'#fff':'#991b1b', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'700', flexShrink:0 }}>
            {badge}
          </span>
        )}
        <span style={{ color:theme.subtext, fontSize:'14px', transition:'transform 0.2s', transform:open?'rotate(180deg)':'rotate(0deg)', flexShrink:0 }}>▼</span>
      </div>
      {open && (
        <div style={{ borderTop:`1px solid ${theme.border}` }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── LOADING PLACEHOLDER ───────────────────────────────
function LoadingBox({ theme }) {
  return <div style={{ padding:'32px', textAlign:'center', color:theme.subtext, fontSize:'13px' }}>Loading…</div>;
}

// ── EMPTY STATE ───────────────────────────────────────
function EmptyBox({ icon='📭', text, theme }) {
  return (
    <div style={{ padding:'36px', textAlign:'center', color:theme.subtext }}>
      <div style={{ fontSize:'32px', marginBottom:'8px' }}>{icon}</div>
      <p style={{ margin:0, fontSize:'13px' }}>{text}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// TRAINER TILES
// ══════════════════════════════════════════════════════

function MyAttendanceTile({ theme }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { if(open && !data) api('/reports/my-attendance').then(setData).catch(()=>setData([])); }, [open]);
  const totalBelow75 = (data||[]).reduce((s,r)=>s+parseInt(r.below_75||0),0);
  return (
    <Tile icon="📊" title="My Attendance Report" subtitle="Section-wise summary for your classes"
      open={open} onToggle={()=>setOpen(o=>!o)} theme={theme}
      badge={data ? (totalBelow75>0?`${totalBelow75} below 75%`:null) : undefined}
      badgeColor={totalBelow75>0?'#dc2626':undefined}>
      {!data ? <LoadingBox theme={theme}/> : data.length===0 ? <EmptyBox text="No sections found. Upload student lists in Attendance." theme={theme}/> : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:theme.bg }}>
                {['Section','Inst','Domain','Students','Sessions','Avg %','<75%','<60%'].map(h=>(
                  <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:theme.subtext, borderBottom:`2px solid ${theme.border}`, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((r,i)=>{
                const b = pctBadge(r.avg_pct);
                return (
                  <tr key={i} style={{ background:i%2===0?theme.card:theme.bg }}>
                    <td style={{ padding:'9px 14px', fontWeight:'600', fontSize:'13px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{r.section_name}</td>
                    <td style={{ padding:'9px 14px', borderBottom:`1px solid ${theme.border}` }}>
                      <span style={{ background:r.institution==='MRU'?'#dbeafe':'#ede9fe', color:r.institution==='MRU'?'#1d4ed8':'#5b21b6', padding:'1px 7px', borderRadius:'10px', fontSize:'10px', fontWeight:'600' }}>{r.institution}</span>
                    </td>
                    <td style={{ padding:'9px 14px', fontSize:'12px', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{r.domain}</td>
                    <td style={{ padding:'9px 14px', fontSize:'13px', color:theme.text, borderBottom:`1px solid ${theme.border}`, textAlign:'center' }}>{r.total_students}</td>
                    <td style={{ padding:'9px 14px', fontSize:'13px', color:theme.text, borderBottom:`1px solid ${theme.border}`, textAlign:'center' }}>{r.sessions_conducted}</td>
                    <td style={{ padding:'9px 14px', borderBottom:`1px solid ${theme.border}` }}>
                      {r.avg_pct ? <span style={{ background:b.bg, color:b.color, padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>{r.avg_pct}%</span>
                        : <span style={{ color:theme.subtext, fontSize:'11px' }}>No data</span>}
                    </td>
                    <td style={{ padding:'9px 14px', fontSize:'12px', fontWeight:'600', color:parseInt(r.below_75)>0?'#dc2626':theme.subtext, borderBottom:`1px solid ${theme.border}`, textAlign:'center' }}>{r.below_75}</td>
                    <td style={{ padding:'9px 14px', fontSize:'12px', fontWeight:'600', color:parseInt(r.below_60)>0?'#ef4444':theme.subtext, borderBottom:`1px solid ${theme.border}`, textAlign:'center' }}>{r.below_60}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Tile>
  );
}

function MyLessonPlanTile({ theme }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { if(open && !data) api('/reports/my-lessonplans').then(setData).catch(()=>setData([])); }, [open]);
  const pending = (data||[]).filter(r=>!r.uploaded).length;
  return (
    <Tile icon="📒" title="Lesson Plan Status" subtitle="Which sections have lesson plan uploaded"
      open={open} onToggle={()=>setOpen(o=>!o)} theme={theme}
      badge={data ? (pending>0?`${pending} pending`:undefined) : undefined}
      badgeColor={pending>0?'#f59e0b':undefined}>
      {!data ? <LoadingBox theme={theme}/> : data.length===0 ? <EmptyBox text="No timetable classes found." theme={theme}/> : (
        <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:'8px' }}>
          {/* Summary */}
          <div style={{ display:'flex', gap:'10px', marginBottom:'6px', flexWrap:'wrap' }}>
            <span style={{ background:'#d1fae5', color:'#065f46', padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'700' }}>
              ✅ {data.filter(r=>r.uploaded).length} uploaded
            </span>
            <span style={{ background:'#fef3c7', color:'#92400e', padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'700' }}>
              ⏳ {pending} pending
            </span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:'7px' }}>
            {data.map((r,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', borderRadius:'8px', border:`1px solid ${r.uploaded?'#10b981':theme.border}`, background:r.uploaded?'#f0fdf4':theme.bg }}>
                <div>
                  <div style={{ fontWeight:'600', fontSize:'12px', color:theme.text }}>{r.class_name}</div>
                  <div style={{ fontSize:'10px', color:theme.subtext, marginTop:'1px' }}>{r.domain} · {r.institution}</div>
                </div>
                <span style={{ fontSize:'16px' }}>{r.uploaded ? '✅' : '⏳'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Tile>
  );
}

function MyTodoHistoryTile({ theme }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { if(open && !data) api('/reports/my-todo-history').then(setData).catch(()=>setData([])); }, [open]);
  const missedDays = (data||[]).filter(r=>!r.submitted_at).length;
  return (
    <Tile icon="✅" title="My To Do History" subtitle="Last 10 working days compliance"
      open={open} onToggle={()=>setOpen(o=>!o)} theme={theme}
      badge={data ? (missedDays>0?`${missedDays} not submitted`:undefined) : undefined}
      badgeColor={missedDays>0?'#f59e0b':undefined}>
      {!data ? <LoadingBox theme={theme}/> : data.length===0 ? <EmptyBox text="No To Do history found." theme={theme}/> : (
        <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:'6px' }}>
          {data.map((r,i)=>{
            const submitted = !!r.submitted_at;
            const filled    = !!r.punch_in_time;
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:'9px', border:`1px solid ${submitted?'#10b981':filled?theme.border:'#fca5a5'}`, background:submitted?'#f0fdf4':filled?theme.bg:'#fff5f5' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ fontSize:'16px' }}>{submitted?'✅':filled?'📝':'❌'}</span>
                  <div>
                    <div style={{ fontWeight:'600', fontSize:'13px', color:theme.text }}>{fmtDate(r.date)}</div>
                    <div style={{ fontSize:'11px', color:theme.subtext, marginTop:'1px' }}>
                      {r.punch_in_time ? `Punch-in: ${r.punch_in_time?.slice(0,5)}` : 'Not filled'}
                      {r.filled_slots > 0 && ` · ${r.filled_slots}/${r.total_slots} slots`}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize:'11px', fontWeight:'700', color:submitted?'#065f46':filled?theme.subtext:'#dc2626' }}>
                  {submitted ? 'Submitted' : filled ? 'Not submitted' : 'Missing'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Tile>
  );
}

function MyDutiesTile({ theme }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { if(open && !data) api('/reports/my-duties').then(setData).catch(()=>setData([])); }, [open]);
  return (
    <Tile icon="📋" title="My Duties & Adjustments" subtitle="Your assigned duties and schedule changes"
      open={open} onToggle={()=>setOpen(o=>!o)} theme={theme}>
      {!data ? <LoadingBox theme={theme}/> : data.length===0 ? <EmptyBox text="No duties assigned yet." theme={theme}/> : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:theme.bg }}>
                {['Type','Date','Slot','Class','Room','Assigned By'].map(h=>(
                  <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:theme.subtext, borderBottom:`2px solid ${theme.border}`, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((d,i)=>{
                const tc = TYPE_COLORS[d.type]||TYPE_COLORS.duty;
                return (
                  <tr key={i} style={{ background:i%2===0?theme.card:theme.bg }}>
                    <td style={{ padding:'8px 14px', borderBottom:`1px solid ${theme.border}` }}>
                      <span style={{ background:tc.bg, color:tc.color, padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>{tc.label}</span>
                    </td>
                    <td style={{ padding:'8px 14px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}`, whiteSpace:'nowrap' }}>{fmtDate(d.date)}</td>
                    <td style={{ padding:'8px 14px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>Slot {d.slot_number}</td>
                    <td style={{ padding:'8px 14px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{d.class_name||'—'}</td>
                    <td style={{ padding:'8px 14px', fontSize:'12px', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{d.room||'—'}</td>
                    <td style={{ padding:'8px 14px', fontSize:'12px', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{d.assigned_by_name||'—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Tile>
  );
}

// ══════════════════════════════════════════════════════
// ADMIN TILES
// ══════════════════════════════════════════════════════

function TrainerLoadTile({ theme }) {
  const [data, setData]   = useState(null);
  const [open, setOpen]   = useState(false);
  useEffect(() => { if(open && !data) api('/reports/load').then(setData).catch(()=>setData([])); }, [open]);
  const maxClasses = Math.max(...(data||[]).map(r=>parseInt(r.total_classes)||0), 1);
  return (
    <Tile icon="👥" title="Trainer Load Summary" subtitle="Weekly classes per trainer across all institutions"
      open={open} onToggle={()=>setOpen(o=>!o)} theme={theme}>
      {!data ? <LoadingBox theme={theme}/> : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:theme.bg }}>
                {['Trainer','Emp ID','Total','MRU','MRIIRS','CDOE','Load'].map(h=>(
                  <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:theme.subtext, borderBottom:`2px solid ${theme.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((r,i)=>{
                const total = parseInt(r.total_classes)||0;
                const pct = Math.round((total/maxClasses)*100);
                return (
                  <tr key={i} style={{ background:i%2===0?theme.card:theme.bg }}>
                    <td style={{ padding:'9px 14px', fontWeight:'600', fontSize:'13px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{r.name}</td>
                    <td style={{ padding:'9px 14px', fontSize:'12px', fontFamily:'monospace', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{r.employee_id}</td>
                    <td style={{ padding:'9px 14px', fontSize:'15px', fontWeight:'700', color:theme.accent, borderBottom:`1px solid ${theme.border}` }}>{total}</td>
                    <td style={{ padding:'9px 14px', borderBottom:`1px solid ${theme.border}` }}><span style={{ background:'#dbeafe', color:'#1d4ed8', padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600' }}>{r.mru_classes}</span></td>
                    <td style={{ padding:'9px 14px', borderBottom:`1px solid ${theme.border}` }}><span style={{ background:'#ede9fe', color:'#6d28d9', padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600' }}>{r.mriirs_classes}</span></td>
                    <td style={{ padding:'9px 14px', borderBottom:`1px solid ${theme.border}` }}><span style={{ background:'#fef3c7', color:'#92400e', padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600' }}>{r.cdoe_classes}</span></td>
                    <td style={{ padding:'9px 14px', borderBottom:`1px solid ${theme.border}`, minWidth:'130px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <div style={{ flex:1, background:theme.border, borderRadius:'4px', height:'6px', overflow:'hidden' }}>
                          <div style={{ width:`${pct}%`, height:'100%', background:theme.accent, borderRadius:'4px' }}/>
                        </div>
                        <span style={{ fontSize:'10px', color:theme.subtext, minWidth:'26px' }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Tile>
  );
}

function AllAttendanceTile({ theme }) {
  const [data,   setData]   = useState(null);
  const [open,   setOpen]   = useState(false);
  const [filter, setFilter] = useState('all'); // all | mru | mriirs | below75
  useEffect(() => { if(open && !data) api('/reports/all-attendance').then(setData).catch(()=>setData([])); }, [open]);

  const filtered = (data||[]).filter(r => {
    if(filter === 'mru') return r.institution === 'MRU';
    if(filter === 'mriirs') return r.institution === 'MRIIRS';
    if(filter === 'below75') return parseFloat(r.avg_pct||0) < 75;
    return true;
  });
  const totalBelow75 = (data||[]).filter(r=>parseFloat(r.avg_pct||0)<75).length;

  return (
    <Tile icon="🏫" title="Section-wise Attendance" subtitle="All sections across all trainers"
      open={open} onToggle={()=>setOpen(o=>!o)} theme={theme}
      badge={data?(totalBelow75>0?`${totalBelow75} below 75%`:undefined):undefined}
      badgeColor="#dc2626">
      {!data ? <LoadingBox theme={theme}/> : data.length===0 ? <EmptyBox text="No attendance data yet." theme={theme}/> : (
        <div>
          {/* Filter bar */}
          <div style={{ padding:'10px 16px', borderBottom:`1px solid ${theme.border}`, display:'flex', gap:'6px', background:theme.bg, flexWrap:'wrap' }}>
            {[['all','All'],['mru','MRU'],['mriirs','MRIIRS'],['below75','Below 75%']].map(([v,l])=>(
              <button key={v} onClick={()=>setFilter(v)} style={{ padding:'4px 12px', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:filter===v?'700':'400', background:filter===v?theme.accent:'transparent', color:filter===v?'#fff':theme.subtext }}>
                {l}
              </button>
            ))}
            <span style={{ fontSize:'12px', color:theme.subtext, alignSelf:'center', marginLeft:'auto' }}>{filtered.length} sections</span>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:theme.bg }}>
                  {['Section','Inst','Domain','Trainer','Students','Sessions','Avg %','<75%'].map(h=>(
                    <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:theme.subtext, borderBottom:`2px solid ${theme.border}`, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r,i)=>{
                  const b = pctBadge(r.avg_pct);
                  return (
                    <tr key={i} style={{ background:i%2===0?theme.card:theme.bg }}>
                      <td style={{ padding:'8px 12px', fontWeight:'600', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{r.section_name}</td>
                      <td style={{ padding:'8px 12px', borderBottom:`1px solid ${theme.border}` }}>
                        <span style={{ background:r.institution==='MRU'?'#dbeafe':'#ede9fe', color:r.institution==='MRU'?'#1d4ed8':'#5b21b6', padding:'1px 6px', borderRadius:'10px', fontSize:'10px', fontWeight:'600' }}>{r.institution}</span>
                      </td>
                      <td style={{ padding:'8px 12px', fontSize:'11px', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{r.domain}</td>
                      <td style={{ padding:'8px 12px', fontSize:'11px', color:theme.text, borderBottom:`1px solid ${theme.border}`, whiteSpace:'nowrap' }}>{r.trainer_name?.split(' ').slice(0,2).join(' ')}</td>
                      <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}`, textAlign:'center' }}>{r.total_students}</td>
                      <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}`, textAlign:'center' }}>{r.sessions_conducted}</td>
                      <td style={{ padding:'8px 12px', borderBottom:`1px solid ${theme.border}` }}>
                        {r.avg_pct ? <span style={{ background:b.bg, color:b.color, padding:'2px 7px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>{r.avg_pct}%</span>
                          : <span style={{ color:theme.subtext, fontSize:'11px' }}>—</span>}
                      </td>
                      <td style={{ padding:'8px 12px', fontSize:'12px', fontWeight:'600', color:parseInt(r.below_75)>0?'#dc2626':theme.subtext, borderBottom:`1px solid ${theme.border}`, textAlign:'center' }}>{r.below_75}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Tile>
  );
}

function MentorshipTile({ theme }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { if(open && !data) api('/reports/mentorship').then(setData).catch(()=>setData([])); }, [open]);
  const behind = (data||[]).filter(r => parseInt(r.interacted_this_month) < parseInt(r.total_mentees)*0.5).length;
  return (
    <Tile icon="🎓" title="Mentorship Compliance" subtitle="CMP 2026 — mentor interaction status this month"
      open={open} onToggle={()=>setOpen(o=>!o)} theme={theme}
      badge={data?(behind>0?`${behind} behind`:undefined):undefined}
      badgeColor="#f59e0b">
      {!data ? <LoadingBox theme={theme}/> : data.length===0 ? <EmptyBox icon="🎓" text="No mentorship data. Import student data in CMP 2026." theme={theme}/> : (
        <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:'6px' }}>
          {data.map((r,i)=>{
            const total = parseInt(r.total_mentees)||0;
            const done  = parseInt(r.interacted_this_month)||0;
            const pct   = total > 0 ? Math.round(done/total*100) : 0;
            const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'8px 12px', borderRadius:'8px', background:theme.bg }}>
                <div style={{ minWidth:'140px' }}>
                  <div style={{ fontWeight:'600', fontSize:'12px', color:theme.text }}>{r.mentor_name?.split(' ').slice(0,2).join(' ')}</div>
                  <div style={{ fontSize:'10px', color:theme.subtext }}>{r.designation||'Trainer'}</div>
                </div>
                <div style={{ flex:1, height:'7px', background:theme.border, borderRadius:'4px' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:'4px', transition:'width 0.5s' }}/>
                </div>
                <span style={{ fontSize:'12px', fontWeight:'700', color, minWidth:'50px', textAlign:'right' }}>{done}/{total}</span>
              </div>
            );
          })}
        </div>
      )}
    </Tile>
  );
}

function TodoComplianceTile({ theme }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { if(open && !data) api('/reports/todo-compliance').then(setData).catch(()=>setData([])); }, [open]);
  const notFilled = (data||[]).filter(r=>parseInt(r.days_submitted||0)===0).length;
  return (
    <Tile icon="✅" title="To Do Compliance — All Trainers" subtitle="Last 30 days submission status"
      open={open} onToggle={()=>setOpen(o=>!o)} theme={theme}
      badge={data?(notFilled>0?`${notFilled} never submitted`:undefined):undefined}
      badgeColor="#ef4444">
      {!data ? <LoadingBox theme={theme}/> : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:theme.bg }}>
                {['Trainer','This Week','Last 30d Filled','Last 30d Submitted'].map(h=>(
                  <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:theme.subtext, borderBottom:`2px solid ${theme.border}`, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((r,i)=>{
                const submitted = parseInt(r.days_submitted||0);
                const filled    = parseInt(r.days_filled||0);
                const thisWeek  = parseInt(r.this_week||0);
                const color = submitted >= 20 ? '#10b981' : submitted >= 10 ? '#f59e0b' : '#ef4444';
                return (
                  <tr key={i} style={{ background:i%2===0?theme.card:theme.bg }}>
                    <td style={{ padding:'9px 14px', borderBottom:`1px solid ${theme.border}` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        {r.profile_picture
                          ? <img src={r.profile_picture} alt="" style={{ width:'26px', height:'26px', borderRadius:'50%', objectFit:'cover' }}/>
                          : <div style={{ width:'26px', height:'26px', borderRadius:'50%', background:theme.accent+'33', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:'700', color:theme.accent }}>{r.name?.[0]}</div>
                        }
                        <span style={{ fontWeight:'600', fontSize:'13px', color:theme.text }}>{r.name}</span>
                      </div>
                    </td>
                    <td style={{ padding:'9px 14px', borderBottom:`1px solid ${theme.border}` }}>
                      <span style={{ background:thisWeek>=5?'#d1fae5':thisWeek>=3?'#fef3c7':'#fee2e2', color:thisWeek>=5?'#065f46':thisWeek>=3?'#92400e':'#991b1b', padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>
                        {thisWeek} days
                      </span>
                    </td>
                    <td style={{ padding:'9px 14px', fontSize:'13px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{filled} days</td>
                    <td style={{ padding:'9px 14px', borderBottom:`1px solid ${theme.border}` }}>
                      <span style={{ background:color+'22', color, padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>{submitted} days</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Tile>
  );
}

function DutiesReportTile({ theme }) {
  const [data,  setData]  = useState(null);
  const [open,  setOpen]  = useState(false);
  const [from,  setFrom]  = useState('');
  const [to,    setTo]    = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if(from) params.append('from', from);
    if(to)   params.append('to', to);
    api(`/reports/duties?${params}`).then(setData).catch(()=>setData([])).finally(()=>setLoading(false));
  };

  useEffect(() => { if(open && !data) load(); }, [open]);

  const inp = { padding:'6px 10px', border:`1px solid ${theme.border}`, borderRadius:'7px', fontSize:'12px', background:theme.card, color:theme.text, outline:'none' };

  return (
    <Tile icon="📋" title="Duties & Adjustments Report" subtitle="All duty assignments — filterable by date"
      open={open} onToggle={()=>setOpen(o=>!o)} theme={theme}>
      {!open ? null : (
        <div>
          <div style={{ padding:'10px 16px', borderBottom:`1px solid ${theme.border}`, display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap', background:theme.bg }}>
            <label style={{ fontSize:'12px', color:theme.subtext }}>From</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={inp}/>
            <label style={{ fontSize:'12px', color:theme.subtext }}>To</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={inp}/>
            <button onClick={load} disabled={loading} style={{ padding:'6px 14px', background:theme.accent, color:'#fff', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'12px', fontWeight:'600' }}>
              {loading?'Loading…':'🔍 Filter'}
            </button>
            {data && <span style={{ fontSize:'12px', color:theme.subtext }}>{data.length} records</span>}
          </div>
          {!data ? <LoadingBox theme={theme}/> : data.length===0 ? <EmptyBox text="No duties found for selected period." theme={theme}/> : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:theme.bg }}>
                    {['Type','Trainer','Date','Slot','Class','Room','Assigned By'].map(h=>(
                      <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:theme.subtext, borderBottom:`2px solid ${theme.border}`, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((d,i)=>{
                    const tc = TYPE_COLORS[d.type]||TYPE_COLORS.duty;
                    return (
                      <tr key={i} style={{ background:i%2===0?theme.card:theme.bg }}>
                        <td style={{ padding:'8px 12px', borderBottom:`1px solid ${theme.border}` }}>
                          <span style={{ background:tc.bg, color:tc.color, padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>{tc.label}</span>
                        </td>
                        <td style={{ padding:'8px 12px', fontWeight:'600', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{d.trainer_name}</td>
                        <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}`, whiteSpace:'nowrap' }}>{fmtDate(d.date)}</td>
                        <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>Slot {d.slot_number}</td>
                        <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{d.class_name||'—'}</td>
                        <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{d.room||'—'}</td>
                        <td style={{ padding:'8px 12px', fontSize:'12px', color:theme.subtext, borderBottom:`1px solid ${theme.border}` }}>{d.assigned_by_name||'—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Tile>
  );
}

// ══════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════
export default function ReportsPage() {
  const { theme } = useOutletContext();
  const user = getUser();
  const isAdmin = user?.role === 'super_admin';

  return (
    <div>
      <div style={{ marginBottom:'22px' }}>
        <h1 style={{ margin:'0 0 4px', fontSize:'24px', fontWeight:'700', color:theme.text }}>📊 Reports</h1>
        <p style={{ margin:0, fontSize:'13px', color:theme.subtext }}>Click any tile to expand and view the report</p>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>

        {/* ── TRAINER TILES — visible to everyone ── */}
        <div style={{ fontSize:'11px', fontWeight:'700', color:theme.subtext, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'2px' }}>My Reports</div>

        <MyAttendanceTile    theme={theme} />
        <MyLessonPlanTile    theme={theme} />
        <MyTodoHistoryTile   theme={theme} />
        <MyDutiesTile        theme={theme} />

        {/* ── ADMIN TILES ── */}
        {isAdmin && (
          <>
            <div style={{ fontSize:'11px', fontWeight:'700', color:theme.subtext, textTransform:'uppercase', letterSpacing:'0.5px', marginTop:'10px', marginBottom:'2px' }}>Admin Reports</div>
            <TrainerLoadTile     theme={theme} />
            <AllAttendanceTile   theme={theme} />
            <MentorshipTile      theme={theme} />
            <TodoComplianceTile  theme={theme} />
            <DutiesReportTile    theme={theme} />
          </>
        )}
      </div>
    </div>
  );
}
