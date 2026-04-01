import { useState, useEffect, useRef } from 'react';
import { api, getUser } from '../api';
import { useOutletContext } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const CAREER_GOALS = [
  'Data Scientist','Data Engineer','AI/ML Engineer','Backend Developer',
  'Full Stack Developer','Frontend Developer','DevOps / Cloud Engineer',
  'Cyber Security Expert','Software Engineer (SWE)','Product Manager',
  'Business Analyst','Higher Studies / MS','Family Business','Other',
];
const SC_LABELS = ['','Poor','Below Avg','Average','Good','Excellent'];
const SC_COLORS = ['','#ef4444','#f97316','#eab308','#22c55e','#10b981'];

// ── Tiny helpers ──────────────────────────────────────────────────
function Avatar({ name, size=34 }) {
  const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899'];
  const c = colors[(name||'A').charCodeAt(0) % colors.length];
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:c, flexShrink:0,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*0.38+'px', fontWeight:'700', color:'#fff' }}>
      {(name||'?')[0].toUpperCase()}
    </div>
  );
}

function ScorePill({ score }) {
  if (!score) return <span style={{ color:'#94a3b8', fontSize:'11px' }}>—</span>;
  return (
    <span style={{ background:SC_COLORS[score]+'20', color:SC_COLORS[score],
      padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>
      {score} {SC_LABELS[score]}
    </span>
  );
}

function ScoreBtn({ value, onChange, theme }) {
  return (
    <div style={{ display:'flex', gap:'5px' }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onChange(n === value ? null : n)} style={{
          width:'38px', height:'34px', borderRadius:'7px', cursor:'pointer',
          border:`2px solid ${value===n ? SC_COLORS[n] : '#e2e8f0'}`,
          background: value===n ? SC_COLORS[n]+'18' : 'transparent',
          color: value===n ? SC_COLORS[n] : theme.subtext,
          fontWeight: value===n ? '800' : '500', fontSize:'14px',
        }}>{n}</button>
      ))}
    </div>
  );
}

function InteractionDots({ last, total=5 }) {
  return (
    <div style={{ display:'flex', gap:'4px', alignItems:'center' }}>
      {[1,2,3,4,5].map(n => (
        <div key={n} style={{
          width:'12px', height:'12px', borderRadius:'50%',
          background: n <= (last||0) ? '#10b981' : '#e2e8f0',
          border: n <= (last||0) ? 'none' : '1px solid #cbd5e1',
        }}/>
      ))}
      <span style={{ fontSize:'10px', color:'#94a3b8', marginLeft:'4px' }}>
        {last||0}/5
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SYNC MODAL — trainer uploads their own sheet
// ══════════════════════════════════════════════════════════════════
function SyncModal({ isAdmin, theme, onClose, onDone }) {
  const [syncing,  setSyncing]  = useState(false);
  const [result,   setResult]   = useState(null);
  const fileRef = useRef();

  const doSync = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSyncing(true); setResult(null);
    try {
      const fd  = new FormData();
      fd.append('file', file);
      const tok = localStorage.getItem('token');
      const url = isAdmin ? `${API_BASE}/cmp/sync-full` : `${API_BASE}/cmp/sync-mine`;
      const res = await fetch(url, { method:'POST', headers:{ Authorization:`Bearer ${tok}` }, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setResult(data);
      onDone();
    } catch(e) { setResult({ error: e.message }); }
    finally { setSyncing(false); e.target.value=''; }
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',
      alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px' }} onClick={onClose}>
      <div style={{ background:theme.card,borderRadius:'16px',width:'100%',maxWidth:'440px',
        padding:'24px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'16px' }}>
          <div>
            <div style={{ fontWeight:'700',fontSize:'16px',color:theme.text }}>📤 Upload Excel Sheet</div>
            <div style={{ fontSize:'12px',color:theme.subtext,marginTop:'2px' }}>
              {isAdmin ? 'Upload full workbook — all mentor sheets will sync' : 'Upload your own sheet — only your students will sync'}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:'20px',cursor:'pointer',color:theme.subtext }}>✕</button>
        </div>

        {!result && (
          <div onClick={()=>fileRef.current?.click()} style={{
            border:`2px dashed ${theme.border}`,borderRadius:'12px',padding:'32px',
            textAlign:'center',cursor:'pointer',background:theme.bg
          }}>
            <div style={{ fontSize:'36px',marginBottom:'8px' }}>📊</div>
            <div style={{ fontWeight:'600',color:theme.text,fontSize:'14px' }}>
              {syncing ? '🔄 Syncing...' : 'Click to select Excel file'}
            </div>
            <div style={{ fontSize:'12px',color:theme.subtext,marginTop:'4px' }}>
              Download latest sheet from Google → upload here
            </div>
          </div>
        )}

        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:'none' }} onChange={doSync}/>

        {result && !result.error && (
          <div style={{ background:'#d1fae5',borderRadius:'10px',padding:'14px',marginTop:'14px' }}>
            <div style={{ fontWeight:'700',color:'#065f46',marginBottom:'8px' }}>✅ Sync complete!</div>
            <div style={{ fontSize:'12px',color:'#047857',display:'flex',flexDirection:'column',gap:'3px' }}>
              <span>🆕 {result.mentees_new} new students added</span>
              <span>🔄 {result.mentees_updated} students updated</span>
              <span>📝 {result.interactions_new} interactions imported</span>
              <span>👥 {result.group_updated} group attendance records</span>
              {result.skipped_sheets?.length > 0 && (
                <span style={{ color:'#b45309' }}>⚠️ Skipped: {result.skipped_sheets.join(', ')}</span>
              )}
            </div>
          </div>
        )}

        {result?.error && (
          <div style={{ background:'#fee2e2',borderRadius:'10px',padding:'14px',marginTop:'14px',color:'#dc2626',fontSize:'13px' }}>
            ❌ {result.error}
          </div>
        )}

        <div style={{ display:'flex',justifyContent:'flex-end',marginTop:'16px',gap:'8px' }}>
          <button onClick={onClose} style={{ padding:'8px 16px',borderRadius:'8px',border:`1px solid ${theme.border}`,background:'transparent',color:theme.text,cursor:'pointer' }}>
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && !syncing && (
            <button onClick={()=>fileRef.current?.click()} style={{ padding:'8px 18px',borderRadius:'8px',border:'none',background:theme.accent,color:'#fff',cursor:'pointer',fontWeight:'600' }}>
              Choose File
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// GROUP MEETING MODAL
// ══════════════════════════════════════════════════════════════════
function GroupMeetingModal({ mentees, existing, theme, onClose, onDone }) {
  const [date,  setDate]  = useState(existing?.meeting?.held_date?.slice(0,10) || new Date().toISOString().slice(0,10));
  const [notes, setNotes] = useState(existing?.meeting?.notes || '');
  const [att,   setAtt]   = useState(() => {
    const m = {};
    mentees.forEach(s => {
      const ex = existing?.attendance?.find(a => a.mentee_id === s.id);
      m[s.id] = { attended: ex?.attended || false, observation: ex?.observation || '' };
    });
    return m;
  });
  const [busy, setBusy] = useState(false);
  const present = Object.values(att).filter(a=>a.attended).length;

  const save = async () => {
    setBusy(true);
    try {
      await api('/cmp/group-meeting', { method:'POST', body: JSON.stringify({
        held_date: date, notes,
        attendance: mentees.map(s => ({ mentee_id: s.id, attended: att[s.id]?.attended||false, observation: att[s.id]?.observation||'' }))
      })});
      onDone(); onClose();
    } catch(e) { alert(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',
      alignItems:'center',justifyContent:'center',zIndex:9999,padding:'12px' }} onClick={onClose}>
      <div style={{ background:theme.card,borderRadius:'16px',width:'100%',maxWidth:'600px',
        maxHeight:'92vh',overflow:'hidden',display:'flex',flexDirection:'column',
        boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px',borderBottom:`1px solid ${theme.border}`,display:'flex',justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:'700',fontSize:'16px',color:theme.text }}>👥 Group Meeting</div>
            <div style={{ fontSize:'12px',color:theme.subtext }}>{present}/{mentees.length} students marked present</div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:'20px',cursor:'pointer',color:theme.subtext }}>✕</button>
        </div>
        <div style={{ padding:'12px 20px',borderBottom:`1px solid ${theme.border}`,display:'flex',gap:'10px' }}>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)}
            style={{ flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${theme.border}`,background:theme.bg,color:theme.text,fontSize:'13px' }}/>
          <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes..."
            style={{ flex:2,padding:'8px',borderRadius:'8px',border:`1px solid ${theme.border}`,background:theme.bg,color:theme.text,fontSize:'13px' }}/>
          <button onClick={()=>setAtt(p=>{const n={...p};mentees.forEach(s=>{n[s.id]={...n[s.id],attended:true}});return n;})}
            style={{ padding:'8px 12px',borderRadius:'8px',border:`1px solid ${theme.accent}`,background:'transparent',color:theme.accent,cursor:'pointer',fontSize:'12px',fontWeight:'600',whiteSpace:'nowrap' }}>
            All Present
          </button>
        </div>
        <div style={{ flex:1,overflowY:'auto',padding:'8px 20px' }}>
          {mentees.map(s => (
            <div key={s.id} style={{ display:'flex',alignItems:'center',gap:'10px',padding:'7px 0',borderBottom:`1px solid ${theme.border}` }}>
              <Avatar name={s.name} size={28}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'13px',fontWeight:'600',color:theme.text }}>{s.name}</div>
                <div style={{ fontSize:'10px',color:theme.subtext }}>{s.roll_no} · {s.program}</div>
              </div>
              <button onClick={()=>setAtt(p=>({...p,[s.id]:{...p[s.id],attended:!p[s.id]?.attended}}))}
                style={{ padding:'5px 12px',borderRadius:'7px',border:'none',cursor:'pointer',fontWeight:'700',fontSize:'11px',
                  background:att[s.id]?.attended?'#d1fae5':'#fee2e2',
                  color:att[s.id]?.attended?'#065f46':'#991b1b' }}>
                {att[s.id]?.attended?'✅ Present':'❌ Absent'}
              </button>
              <input value={att[s.id]?.observation||''} placeholder="Observation..."
                onChange={e=>setAtt(p=>({...p,[s.id]:{...p[s.id],observation:e.target.value}}))}
                style={{ width:'140px',padding:'5px 8px',borderRadius:'6px',border:`1px solid ${theme.border}`,background:theme.bg,color:theme.text,fontSize:'11px' }}/>
            </div>
          ))}
        </div>
        <div style={{ padding:'12px 20px',borderTop:`1px solid ${theme.border}`,display:'flex',gap:'8px',justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'8px 16px',borderRadius:'8px',border:`1px solid ${theme.border}`,background:'transparent',color:theme.text,cursor:'pointer' }}>Cancel</button>
          <button onClick={save} disabled={busy} style={{ padding:'8px 18px',borderRadius:'8px',border:'none',background:theme.accent,color:'#fff',cursor:'pointer',fontWeight:'600' }}>
            {busy?'Saving…':'✅ Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// INTERACTION MODAL
// ══════════════════════════════════════════════════════════════════
function InteractionModal({ mentee, no, existing, trainers, theme, onClose, onDone }) {
  const user = getUser();
  const [tab, setTab] = useState('form');
  const [f, setF] = useState({
    meeting_date:    existing?.meeting_date?.slice(0,10) || new Date().toISOString().slice(0,10),
    attendance:      existing?.attendance || 'present',
    career_goal:     existing?.career_goal || mentee?.career_goal || '',
    domain_interest: existing?.domain_interest || mentee?.domain_interest || '',
    score_resume:    existing?.score_resume || null,
    score_comm:      existing?.score_comm || null,
    score_grooming:  existing?.score_grooming || null,
    score_attitude:  existing?.score_attitude || null,
    score_technical: existing?.score_technical || null,
    strengths:       existing?.strengths || mentee?.strengths || '',
    weaknesses:      existing?.weaknesses || mentee?.weaknesses || '',
    notes:           existing?.notes || '',
    feedback:        existing?.feedback || '',
    action_plan:     existing?.action_plan || '',
  });
  const [referrals, setRefs] = useState([]);
  const [newRef, setNewRef]  = useState({ trainer_id:'', domain:'Aptitude', note:'' });
  const [showRef, setShowRef] = useState(false);
  const [aiReport, setAiReport] = useState(existing?.ai_report || '');
  const [aiLoading, setAiLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const S = (k,v) => setF(p=>({...p,[k]:v}));

  const inp = { width:'100%',padding:'8px 10px',borderRadius:'8px',border:`1px solid ${theme.border}`,background:theme.bg,color:theme.text,fontSize:'13px',boxSizing:'border-box' };
  const ta  = { ...inp, minHeight:'64px', resize:'vertical', fontFamily:'inherit' };

  const genReport = async () => {
    setAiLoading(true); setTab('report');
    try {
      const d = await api('/cmp/generate-report', { method:'POST', body: JSON.stringify({
        mentee_id: mentee.id, interaction_no: no,
        student_name: mentee.name, roll_no: mentee.roll_no,
        program: mentee.program, university: mentee.university,
        cgpa: mentee.cgpa, certifications: mentee.certifications,
        internships: mentee.internships, projects: mentee.projects,
        mentor_name: user?.name||'Mentor',
        prev_scores: existing||{},
        ...f,
      })});
      setAiReport(d.report||'');
    } catch(e) { alert('AI error: '+e.message); }
    finally { setAiLoading(false); }
  };

  const downloadReport = async () => {
    if (!aiReport) return;
    const tok  = localStorage.getItem('token');
    const resp = await fetch(`${API_BASE}/cmp/download-report`, {
      method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${tok}` },
      body: JSON.stringify({ report_text:aiReport, student_name:mentee.name, roll_no:mentee.roll_no,
        program:mentee.program, university:mentee.university, mentor_name:user?.name||'',
        interaction_no:no, meeting_date:f.meeting_date }),
    });
    if (resp.ok) {
      const b = await resp.blob();
      const u = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href=u; a.download=`CMP_${mentee.name.replace(/\s+/g,'_')}_S${no}.docx`;
      a.click(); URL.revokeObjectURL(u);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      await api('/cmp/interaction', { method:'POST', body: JSON.stringify({
        mentee_id:mentee.id, interaction_no:no, referrals, ...f
      })});
      onDone(); onClose();
    } catch(e) { alert(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',
      alignItems:'center',justifyContent:'center',zIndex:9999,padding:'10px' }} onClick={onClose}>
      <div style={{ background:theme.card,borderRadius:'16px',width:'100%',maxWidth:'720px',
        maxHeight:'96vh',overflow:'hidden',display:'flex',flexDirection:'column',
        boxShadow:'0 20px 60px rgba(0,0,0,0.35)' }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'14px 20px',borderBottom:`1px solid ${theme.border}`,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:'700',fontSize:'15px',color:theme.text }}>
              📝 Session {no} — {mentee.name}
            </div>
            <div style={{ fontSize:'11px',color:theme.subtext }}>{mentee.roll_no} · {mentee.program} · {mentee.university}</div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:'20px',cursor:'pointer',color:theme.subtext }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex',borderBottom:`1px solid ${theme.border}` }}>
          {[['form','📋 Form'],['report','🤖 AI Report']].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{
              flex:1,padding:'10px',border:'none',cursor:'pointer',fontSize:'13px',
              background:tab===id?theme.accent+'12':'transparent',
              color:tab===id?theme.accent:theme.subtext,
              fontWeight:tab===id?'700':'400',
              borderBottom:tab===id?`2px solid ${theme.accent}`:'2px solid transparent',
            }}>
              {label}
              {id==='report'&&aiReport&&<span style={{ marginLeft:'5px',background:'#10b981',color:'#fff',padding:'1px 5px',borderRadius:'10px',fontSize:'10px' }}>Ready</span>}
            </button>
          ))}
        </div>

        <div style={{ flex:1,overflowY:'auto' }}>
          {tab === 'form' && (
            <div style={{ padding:'16px 20px',display:'flex',flexDirection:'column',gap:'12px' }}>
              {/* Date + Attendance */}
              <div style={{ display:'flex',gap:'10px' }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,display:'block',marginBottom:'4px',textTransform:'uppercase' }}>Date</label>
                  <input type="date" style={inp} value={f.meeting_date} onChange={e=>S('meeting_date',e.target.value)}/>
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,display:'block',marginBottom:'4px',textTransform:'uppercase' }}>Attendance</label>
                  <div style={{ display:'flex',gap:'6px' }}>
                    {['present','absent'].map(a=>(
                      <button key={a} onClick={()=>S('attendance',a)} style={{
                        flex:1,padding:'8px',borderRadius:'8px',border:'none',cursor:'pointer',fontWeight:'700',fontSize:'12px',
                        background:f.attendance===a?(a==='present'?'#d1fae5':'#fee2e2'):'#f1f5f9',
                        color:f.attendance===a?(a==='present'?'#065f46':'#991b1b'):theme.subtext
                      }}>{a==='present'?'✅ Present':'❌ Absent'}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Career goal */}
              <div style={{ display:'flex',gap:'10px' }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,display:'block',marginBottom:'4px',textTransform:'uppercase' }}>Career Goal</label>
                  <select style={inp} value={f.career_goal} onChange={e=>S('career_goal',e.target.value)}>
                    <option value="">Select...</option>
                    {CAREER_GOALS.map(g=><option key={g}>{g}</option>)}
                  </select>
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,display:'block',marginBottom:'4px',textTransform:'uppercase' }}>Domain Interest</label>
                  <input style={inp} value={f.domain_interest} onChange={e=>S('domain_interest',e.target.value)} placeholder="e.g. AI/ML, Full Stack..."/>
                </div>
              </div>

              {/* Scores */}
              <div style={{ background:theme.bg,borderRadius:'10px',padding:'13px 14px',border:`1px solid ${theme.border}` }}>
                <div style={{ fontSize:'12px',fontWeight:'700',color:theme.text,marginBottom:'10px' }}>📊 Assessment Scores (1 = Poor → 5 = Excellent)</div>
                {[['📄 Resume','score_resume'],['💬 Communication','score_comm'],
                  ['👔 Grooming','score_grooming'],['🎯 Attitude','score_attitude'],
                  ['💻 Technical','score_technical']].map(([lbl,key])=>(
                  <div key={key} style={{ display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px' }}>
                    <div style={{ width:'120px',fontSize:'12px',fontWeight:'600',color:theme.text,flexShrink:0 }}>{lbl}</div>
                    <ScoreBtn value={f[key]} onChange={v=>S(key,v)} theme={theme}/>
                    <span style={{ fontSize:'11px',color:SC_COLORS[f[key]]||theme.subtext,fontWeight:'600',minWidth:'80px' }}>
                      {f[key]?SC_LABELS[f[key]]:'Not rated'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Strengths + Weaknesses */}
              <div style={{ display:'flex',gap:'10px' }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,display:'block',marginBottom:'4px',textTransform:'uppercase' }}>💪 Strengths</label>
                  <input style={inp} value={f.strengths} onChange={e=>S('strengths',e.target.value)} placeholder="e.g. Python, leadership..."/>
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,display:'block',marginBottom:'4px',textTransform:'uppercase' }}>⚠️ Weaknesses</label>
                  <input style={inp} value={f.weaknesses} onChange={e=>S('weaknesses',e.target.value)} placeholder="e.g. communication..."/>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,display:'block',marginBottom:'4px',textTransform:'uppercase' }}>📝 Meeting Notes</label>
                <textarea style={ta} value={f.notes} onChange={e=>S('notes',e.target.value)} placeholder="Brief notes from today..."/>
              </div>

              {/* Feedback + Action Plan */}
              <div style={{ display:'flex',gap:'10px' }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,display:'block',marginBottom:'4px',textTransform:'uppercase' }}>💭 Feedback</label>
                  <textarea style={ta} value={f.feedback} onChange={e=>S('feedback',e.target.value)} placeholder="What did you tell the student?"/>
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,display:'block',marginBottom:'4px',textTransform:'uppercase' }}>✅ Action Plan</label>
                  <textarea style={ta} value={f.action_plan} onChange={e=>S('action_plan',e.target.value)} placeholder="What should they do next?"/>
                </div>
              </div>

              {/* Referrals */}
              <div style={{ background:theme.bg,borderRadius:'10px',padding:'12px 14px',border:`1px solid ${theme.border}` }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px' }}>
                  <div style={{ fontSize:'12px',fontWeight:'700',color:theme.text }}>🔀 Refer to Specialist</div>
                  <button onClick={()=>setShowRef(s=>!s)} style={{ fontSize:'11px',padding:'4px 10px',borderRadius:'6px',border:`1px solid ${theme.accent}`,background:'transparent',color:theme.accent,cursor:'pointer' }}>
                    + Add
                  </button>
                </div>
                {showRef && (
                  <div style={{ display:'flex',gap:'6px',marginBottom:'8px',flexWrap:'wrap' }}>
                    <select value={newRef.trainer_id} onChange={e=>setNewRef(r=>({...r,trainer_id:e.target.value}))}
                      style={{ flex:2,...inp,padding:'6px 8px' }}>
                      <option value="">Select trainer...</option>
                      {trainers.map(t=><option key={t.id} value={t.id}>{t.name}{t.designation?` — ${t.designation}`:''}</option>)}
                    </select>
                    <select value={newRef.domain} onChange={e=>setNewRef(r=>({...r,domain:e.target.value}))}
                      style={{ flex:1,...inp,padding:'6px 8px' }}>
                      {['Aptitude','Technical','Verbal','Soft Skills'].map(d=><option key={d}>{d}</option>)}
                    </select>
                    <input value={newRef.note} onChange={e=>setNewRef(r=>({...r,note:e.target.value}))} placeholder="Note..."
                      style={{ flex:2,...inp,padding:'6px 8px' }}/>
                    <button onClick={()=>{ if(!newRef.trainer_id) return; setRefs(r=>[...r,{...newRef}]); setNewRef({trainer_id:'',domain:'Aptitude',note:''}); setShowRef(false); }}
                      style={{ padding:'6px 12px',borderRadius:'7px',border:'none',background:theme.accent,color:'#fff',cursor:'pointer',fontSize:'12px' }}>Add</button>
                  </div>
                )}
                {referrals.length === 0 ? (
                  <div style={{ fontSize:'12px',color:theme.subtext,fontStyle:'italic' }}>No referrals</div>
                ) : referrals.map((r,i)=>(
                  <div key={i} style={{ display:'flex',alignItems:'center',gap:'7px',padding:'5px 8px',background:theme.card,borderRadius:'7px',marginBottom:'4px',border:`1px solid ${theme.border}` }}>
                    <span style={{ fontSize:'12px',fontWeight:'600',color:theme.text }}>
                      → {trainers.find(t=>String(t.id)===String(r.trainer_id))?.name||r.trainer_id}
                    </span>
                    <span style={{ background:theme.accent+'18',color:theme.accent,padding:'2px 7px',borderRadius:'10px',fontSize:'11px' }}>{r.domain}</span>
                    {r.note && <span style={{ fontSize:'11px',color:theme.subtext,flex:1 }}>{r.note}</span>}
                    <button onClick={()=>setRefs(p=>p.filter((_,j)=>j!==i))} style={{ background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'14px' }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'report' && (
            <div style={{ padding:'16px 20px' }}>
              {aiLoading ? (
                <div style={{ textAlign:'center',padding:'40px' }}>
                  <div style={{ fontSize:'36px',marginBottom:'10px' }}>🤖</div>
                  <div style={{ fontWeight:'600',color:theme.text }}>Generating AI report...</div>
                  <div style={{ fontSize:'12px',color:theme.subtext,marginTop:'4px' }}>Takes ~10 seconds</div>
                </div>
              ) : aiReport ? (
                <>
                  <div style={{ display:'flex',justifyContent:'flex-end',marginBottom:'10px' }}>
                    <button onClick={downloadReport} style={{ padding:'7px 14px',borderRadius:'8px',border:'none',background:'#1e3a5f',color:'#fff',cursor:'pointer',fontSize:'12px',fontWeight:'600' }}>
                      ⬇️ Download Word
                    </button>
                  </div>
                  <div style={{ background:theme.bg,borderRadius:'10px',padding:'16px',border:`1px solid ${theme.border}`,fontSize:'13px',lineHeight:'1.7',color:theme.text,whiteSpace:'pre-wrap',fontFamily:'Georgia,serif' }}>
                    {aiReport}
                  </div>
                </>
              ) : (
                <div style={{ textAlign:'center',padding:'40px' }}>
                  <div style={{ fontSize:'36px',marginBottom:'10px' }}>🤖</div>
                  <div style={{ fontWeight:'600',color:theme.text,marginBottom:'8px' }}>No report yet</div>
                  <button onClick={()=>setTab('form')} style={{ padding:'8px 16px',borderRadius:'8px',border:'none',background:theme.accent,color:'#fff',cursor:'pointer' }}>← Fill form first</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px',borderTop:`1px solid ${theme.border}`,display:'flex',justifyContent:'space-between',gap:'8px' }}>
          <button onClick={genReport} disabled={aiLoading} style={{ padding:'8px 14px',borderRadius:'8px',border:`1px solid ${theme.accent}`,background:'transparent',color:theme.accent,cursor:'pointer',fontSize:'13px',fontWeight:'600',opacity:aiLoading?0.6:1 }}>
            {aiLoading?'Generating…':'🤖 Generate AI Report'}
          </button>
          <div style={{ display:'flex',gap:'8px' }}>
            <button onClick={onClose} style={{ padding:'8px 16px',borderRadius:'8px',border:`1px solid ${theme.border}`,background:'transparent',color:theme.text,cursor:'pointer' }}>Cancel</button>
            <button onClick={save} disabled={busy} style={{ padding:'8px 18px',borderRadius:'8px',border:'none',background:theme.accent,color:'#fff',cursor:'pointer',fontWeight:'600',opacity:busy?0.6:1 }}>
              {busy?'Saving…':'💾 Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// STUDENT PROFILE PAGE
// ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
// EDIT STUDENT MODAL
// ══════════════════════════════════════════════════════════════════
function EditStudentModal({ mentee, theme, onClose, onDone }) {
  const [f, setF] = useState({
    name:            mentee.name            || '',
    program:         mentee.program         || '',
    university:      mentee.university      || '',
    phone:           mentee.phone           || '',
    email:           mentee.email           || '',
    cgpa:            mentee.cgpa            || '',
    backlogs:        mentee.backlogs        ?? '',
    career_goal:     mentee.career_goal     || '',
    domain_interest: mentee.domain_interest || '',
    strengths:       mentee.strengths       || '',
    weaknesses:      mentee.weaknesses      || '',
    certifications:  mentee.certifications  || '',
    internships:     mentee.internships     || '',
    projects:        mentee.projects        || '',
  });
  const [busy, setBusy] = useState(false);
  const S = (k, v) => setF(p => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      await api(`/cmp/mentee/${mentee.id}`, {
        method: 'PUT',
        body: JSON.stringify(f),
      });
      onDone();
      onClose();
    } catch(e) { alert('Save failed: ' + e.message); }
    finally { setBusy(false); }
  };

  const inp = {
    width: '100%', padding: '8px 10px', borderRadius: '8px',
    border: `1px solid ${theme.border}`, background: theme.bg,
    color: theme.text, fontSize: '13px', boxSizing: 'border-box',
  };
  const ta = { ...inp, minHeight: '64px', resize: 'vertical', fontFamily: 'inherit' };

  const Field = ({ label, k, type='text', placeholder='' }) => (
    <div>
      <label style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,
        display:'block',marginBottom:'4px',textTransform:'uppercase' }}>{label}</label>
      <input type={type} style={inp} value={f[k]} placeholder={placeholder}
        onChange={e=>S(k, e.target.value)}/>
    </div>
  );

  const TextArea = ({ label, k, placeholder='' }) => (
    <div>
      <label style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,
        display:'block',marginBottom:'4px',textTransform:'uppercase' }}>{label}</label>
      <textarea style={ta} value={f[k]} placeholder={placeholder}
        onChange={e=>S(k, e.target.value)}/>
    </div>
  );

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',
      display:'flex',alignItems:'center',justifyContent:'center',
      zIndex:9999,padding:'12px' }} onClick={onClose}>
      <div style={{ background:theme.card,borderRadius:'16px',width:'100%',maxWidth:'640px',
        maxHeight:'94vh',overflow:'hidden',display:'flex',flexDirection:'column',
        boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'16px 20px',borderBottom:`1px solid ${theme.border}`,
          display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:'700',fontSize:'15px',color:theme.text }}>
              ✏️ Edit Student — {mentee.name}
            </div>
            <div style={{ fontSize:'11px',color:theme.subtext,marginTop:'2px' }}>
              {mentee.roll_no} · Changes apply to portal only, not to Google Sheet
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',
            fontSize:'20px',cursor:'pointer',color:theme.subtext }}>✕</button>
        </div>

        {/* Form */}
        <div style={{ flex:1,overflowY:'auto',padding:'16px 20px',
          display:'flex',flexDirection:'column',gap:'12px' }}>

          {/* Basic info */}
          <div style={{ background:theme.bg,borderRadius:'10px',padding:'12px 14px',
            border:`1px solid ${theme.border}` }}>
            <div style={{ fontSize:'12px',fontWeight:'700',color:theme.text,marginBottom:'10px' }}>
              👤 Basic Information
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px' }}>
              <Field label="Full Name"   k="name"/>
              <Field label="Roll Number (read-only)" k="roll_no" placeholder={mentee.roll_no}/>
              <Field label="Program"     k="program"    placeholder="e.g. CSE, AIML, ECE"/>
              <Field label="University"  k="university" placeholder="MRU / MRIIRS"/>
              <Field label="CGPA"        k="cgpa"  type="number" placeholder="e.g. 7.85"/>
              <Field label="Backlogs"    k="backlogs" type="number" placeholder="0"/>
            </div>
          </div>

          {/* Contact */}
          <div style={{ background:theme.bg,borderRadius:'10px',padding:'12px 14px',
            border:`1px solid ${theme.border}` }}>
            <div style={{ fontSize:'12px',fontWeight:'700',color:theme.text,marginBottom:'10px' }}>
              📞 Contact Details
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px' }}>
              <div>
                <Field label="Phone (WhatsApp)" k="phone" placeholder="10-digit mobile number"/>
                <div style={{ fontSize:'10px',color:theme.subtext,marginTop:'3px' }}>
                  Enter 10-digit number without country code
                </div>
              </div>
              <Field label="Email" k="email" type="email" placeholder="student@gmail.com"/>
            </div>
          </div>

          {/* Career */}
          <div style={{ background:theme.bg,borderRadius:'10px',padding:'12px 14px',
            border:`1px solid ${theme.border}` }}>
            <div style={{ fontSize:'12px',fontWeight:'700',color:theme.text,marginBottom:'10px' }}>
              🎯 Career Profile
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px' }}>
              <div>
                <label style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,
                  display:'block',marginBottom:'4px',textTransform:'uppercase' }}>Career Goal</label>
                <select style={inp} value={f.career_goal} onChange={e=>S('career_goal',e.target.value)}>
                  <option value="">Select...</option>
                  {CAREER_GOALS.map(g=><option key={g}>{g}</option>)}
                </select>
              </div>
              <Field label="Domain Interest" k="domain_interest" placeholder="e.g. AI/ML, Full Stack"/>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px' }}>
              <Field label="Strengths" k="strengths" placeholder="e.g. Python, communication"/>
              <Field label="Weaknesses" k="weaknesses" placeholder="e.g. no internship, backlogs"/>
            </div>
          </div>

          {/* Background */}
          <div style={{ background:theme.bg,borderRadius:'10px',padding:'12px 14px',
            border:`1px solid ${theme.border}` }}>
            <div style={{ fontSize:'12px',fontWeight:'700',color:theme.text,marginBottom:'10px' }}>
              📋 Academic Background
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:'10px' }}>
              <TextArea label="Certifications" k="certifications"
                placeholder="List certifications..."/>
              <TextArea label="Internships" k="internships"
                placeholder="Internship details..."/>
              <TextArea label="Projects" k="projects"
                placeholder="Project descriptions..."/>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px',borderTop:`1px solid ${theme.border}`,
          display:'flex',gap:'8px',justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'8px 16px',borderRadius:'8px',
            border:`1px solid ${theme.border}`,background:'transparent',
            color:theme.text,cursor:'pointer' }}>Cancel</button>
          <button onClick={save} disabled={busy} style={{ padding:'8px 20px',borderRadius:'8px',
            border:'none',background:theme.accent,color:'#fff',cursor:'pointer',
            fontWeight:'600',opacity:busy?0.6:1 }}>
            {busy ? 'Saving…' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StudentProfile({ menteeId, trainers, theme, onBack }) {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [interModal, setInterModal] = useState(null);
  const [showEdit,   setShowEdit]   = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const resumeRef = useRef();
  const user = getUser();

  const load = async () => {
    setLoading(true);
    try { setData(await api(`/cmp/mentee/${menteeId}`)); }
    catch(e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[menteeId]);

  const uploadResume = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd  = new FormData();
      fd.append('file', file);
      const tok = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/cmp/mentee/${menteeId}/resume`, {
        method:'POST', headers:{ Authorization:`Bearer ${tok}` }, body: fd
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      await load();
    } catch(e) { alert('Upload failed: '+e.message); }
    finally { setUploading(false); e.target.value=''; }
  };

  if (loading) return <div style={{ padding:'40px',textAlign:'center',color:theme.subtext }}>Loading...</div>;
  if (!data) return <div style={{ padding:'40px',textAlign:'center',color:theme.subtext }}>Not found</div>;

  const { mentee, interactions, referrals, group } = data;
  const lastNo = interactions.length > 0 ? Math.max(...interactions.map(i=>i.interaction_no)) : 0;
  const nextNo = Math.min(lastNo + 1, 5);

  const card = { background:theme.card,borderRadius:'12px',border:`1px solid ${theme.border}`,padding:'16px',marginBottom:'14px' };

  return (
    <div>
      {/* Back + Header */}
      <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px',flexWrap:'wrap' }}>
        <button onClick={onBack} style={{ padding:'8px 14px',borderRadius:'9px',border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,cursor:'pointer',fontSize:'13px',fontWeight:'600' }}>
          ← Back
        </button>
        <Avatar name={mentee.name} size={44}/>
        <div style={{ flex:1,minWidth:0 }}>
          <h1 style={{ margin:0,fontSize:'22px',fontWeight:'700',color:theme.text }}>{mentee.name}</h1>
          <div style={{ fontSize:'13px',color:theme.subtext }}>{mentee.roll_no} · {mentee.program} · {mentee.university} · CGPA: {mentee.cgpa||'—'}</div>
        </div>
        <div style={{ display:'flex',gap:'8px',flexWrap:'wrap' }}>
          {mentee.phone && (
            <>
              <a href={`https://wa.me/91${mentee.phone}`} target="_blank" rel="noopener noreferrer"
                style={{ padding:'8px 14px',borderRadius:'9px',background:'#d1fae5',color:'#065f46',textDecoration:'none',fontSize:'13px',fontWeight:'700',display:'flex',alignItems:'center',gap:'5px' }}>
                💬 WhatsApp
              </a>
              <a href={`tel:${mentee.phone}`}
                style={{ padding:'8px 14px',borderRadius:'9px',background:'#dbeafe',color:'#1e40af',textDecoration:'none',fontSize:'13px',fontWeight:'700',display:'flex',alignItems:'center',gap:'5px' }}>
                📞 Call
              </a>
            </>
          )}
          <button onClick={()=>setShowEdit(true)} style={{
            padding:'8px 16px',borderRadius:'9px',border:`1px solid ${theme.border}`,
            background:theme.card,color:theme.text,cursor:'pointer',
            fontSize:'13px',fontWeight:'600',display:'flex',alignItems:'center',gap:'5px'
          }}>
            ✏️ Edit Student
          </button>
        </div>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px' }}>
        {/* Left column */}
        <div>
          {/* Profile info */}
          <div style={card}>
            <div style={{ fontSize:'12px',fontWeight:'700',color:theme.subtext,marginBottom:'10px',textTransform:'uppercase' }}>Student Profile</div>
            {[
              ['📞 Phone', mentee.phone ? mentee.phone : null],
              ['🎯 Career Goal', mentee.career_goal],
              ['🌐 Domain', mentee.domain_interest],
              ['💪 Strengths', mentee.strengths],
              ['⚠️ Weaknesses', mentee.weaknesses],
              ['📜 Certifications', mentee.certifications],
              ['💼 Internships', mentee.internships],
              ['🛠 Projects', mentee.projects],
            ].filter(([,v])=>v).map(([k,v])=>(
              <div key={k} style={{ marginBottom:'8px' }}>
                <div style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext }}>{k}</div>
                <div style={{ fontSize:'12px',color:theme.text,lineHeight:'1.5',marginTop:'1px' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Group meeting */}
          <div style={card}>
            <div style={{ fontSize:'12px',fontWeight:'700',color:theme.subtext,marginBottom:'8px',textTransform:'uppercase' }}>👥 Group Meeting</div>
            {group ? (
              <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
                <span style={{ background:group.attended?'#d1fae5':'#fee2e2',color:group.attended?'#065f46':'#991b1b',padding:'4px 12px',borderRadius:'20px',fontSize:'12px',fontWeight:'700' }}>
                  {group.attended?'✅ Present':'❌ Absent'}
                </span>
                {group.held_date && <span style={{ fontSize:'12px',color:theme.subtext }}>📅 {new Date(group.held_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>}
                {group.observation && <span style={{ fontSize:'12px',color:theme.text,fontStyle:'italic' }}>"{group.observation}"</span>}
              </div>
            ) : (
              <div style={{ fontSize:'12px',color:theme.subtext,fontStyle:'italic' }}>Group meeting not logged yet</div>
            )}
          </div>

          {/* Resume */}
          <div style={card}>
            <div style={{ fontSize:'12px',fontWeight:'700',color:theme.subtext,marginBottom:'10px',textTransform:'uppercase' }}>📁 Resume</div>
            {mentee.resume_url ? (
              <div>
                <div style={{ display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px' }}>
                  <span style={{ fontSize:'22px' }}>
                    {mentee.resume_type?.includes('pdf')?'📄':mentee.resume_type?.includes('image')?'🖼️':'📝'}
                  </span>
                  <div>
                    <div style={{ fontSize:'13px',fontWeight:'600',color:theme.text }}>{mentee.resume_name}</div>
                    <div style={{ fontSize:'10px',color:theme.subtext }}>
                      Uploaded {mentee.resume_uploaded_at?new Date(mentee.resume_uploaded_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'}):''}
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex',gap:'8px' }}>
                  <a href={mentee.resume_url} target="_blank" rel="noopener noreferrer"
                    style={{ padding:'6px 14px',borderRadius:'7px',border:`1px solid ${theme.accent}`,color:theme.accent,textDecoration:'none',fontSize:'12px',fontWeight:'600' }}>
                    👁 View
                  </a>
                  <button onClick={()=>resumeRef.current?.click()} style={{ padding:'6px 14px',borderRadius:'7px',border:`1px solid ${theme.border}`,background:'transparent',color:theme.text,cursor:'pointer',fontSize:'12px' }}>
                    🔄 Replace
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize:'12px',color:theme.subtext,marginBottom:'10px' }}>No resume uploaded yet</div>
                <button onClick={()=>resumeRef.current?.click()} disabled={uploading} style={{ padding:'8px 16px',borderRadius:'8px',border:'none',background:theme.accent,color:'#fff',cursor:'pointer',fontSize:'13px',fontWeight:'600' }}>
                  {uploading?'Uploading…':'⬆️ Upload Resume'}
                </button>
              </div>
            )}
            <input ref={resumeRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display:'none' }} onChange={uploadResume}/>
          </div>

          {/* Referrals */}
          {referrals.length > 0 && (
            <div style={card}>
              <div style={{ fontSize:'12px',fontWeight:'700',color:theme.subtext,marginBottom:'8px',textTransform:'uppercase' }}>🔀 Referrals</div>
              {referrals.map((r,i)=>(
                <div key={i} style={{ padding:'7px 9px',borderRadius:'8px',background:theme.bg,marginBottom:'5px',border:`1px solid ${theme.border}` }}>
                  <div style={{ display:'flex',alignItems:'center',gap:'7px',marginBottom:'3px' }}>
                    <span style={{ fontWeight:'600',fontSize:'12px',color:theme.text }}>→ {r.trainer_name}</span>
                    <span style={{ background:theme.accent+'18',color:theme.accent,padding:'2px 7px',borderRadius:'10px',fontSize:'11px' }}>{r.domain}</span>
                    <span style={{ marginLeft:'auto',fontSize:'11px',fontWeight:'700',color:r.status==='reviewed'?'#10b981':'#f59e0b' }}>
                      {r.status==='reviewed'?'✅ Reviewed':'⏳ Pending'}
                    </span>
                  </div>
                  {r.trainer_review && <div style={{ fontSize:'11px',color:theme.subtext,fontStyle:'italic' }}>"{r.trainer_review}"</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column — Interactions */}
        <div>
          <div style={{ ...card, marginBottom:'14px' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px' }}>
              <div style={{ fontSize:'12px',fontWeight:'700',color:theme.subtext,textTransform:'uppercase' }}>Interactions Progress</div>
              <InteractionDots last={lastNo}/>
            </div>
            {/* 5 session buttons */}
            <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'6px',marginBottom:'12px' }}>
              {[1,2,3,4,5].map(n => {
                const ix    = interactions.find(i=>i.interaction_no===n);
                const done  = !!ix;
                const next  = n === nextNo && !done;
                return (
                  <button key={n} onClick={()=>setInterModal({no:n,existing:ix})} style={{
                    padding:'10px 0',borderRadius:'10px',border:'none',cursor:'pointer',
                    fontWeight:'700',fontSize:'13px',transition:'all 0.12s',
                    background: done?'#d1fae5':next?theme.accent:'#f1f5f9',
                    color: done?'#065f46':next?'#fff':theme.subtext,
                    boxShadow: next?`0 2px 8px ${theme.accent}44`:'none',
                  }}>
                    {done?'✅':'📝'}<br/>
                    <span style={{ fontSize:'10px',fontWeight:'600' }}>S-{n}</span>
                  </button>
                );
              })}
            </div>
            {nextNo <= 5 && !interactions.find(i=>i.interaction_no===nextNo) && (
              <button onClick={()=>setInterModal({no:nextNo,existing:null})} style={{ width:'100%',padding:'10px',borderRadius:'9px',border:'none',background:theme.accent,color:'#fff',cursor:'pointer',fontWeight:'600',fontSize:'13px' }}>
                📝 Start Session {nextNo}
              </button>
            )}
          </div>

          {/* Interaction history */}
          {interactions.map(ix => (
            <div key={ix.id} style={{ ...card }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px' }}>
                <div style={{ fontWeight:'700',color:theme.text }}>Session {ix.interaction_no}</div>
                <div style={{ display:'flex',gap:'6px',alignItems:'center' }}>
                  {ix.meeting_date && <span style={{ fontSize:'11px',color:theme.subtext }}>{new Date(ix.meeting_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>}
                  <span style={{ fontSize:'11px',fontWeight:'700',background:ix.attendance==='present'?'#d1fae5':'#fee2e2',color:ix.attendance==='present'?'#065f46':'#991b1b',padding:'2px 8px',borderRadius:'10px' }}>
                    {ix.attendance==='present'?'Present':'Absent'}
                  </span>
                </div>
              </div>
              {/* Scores */}
              <div style={{ display:'flex',gap:'5px',flexWrap:'wrap',marginBottom:'8px' }}>
                {[['R',ix.score_resume],['C',ix.score_comm],['G',ix.score_grooming],['A',ix.score_attitude],['T',ix.score_technical]].map(([l,s])=>
                  s ? <span key={l} style={{ background:SC_COLORS[s]+'18',color:SC_COLORS[s],padding:'2px 7px',borderRadius:'5px',fontSize:'11px',fontWeight:'700' }}>{l}:{s}</span> : null
                )}
              </div>
              {ix.feedback && <div style={{ fontSize:'12px',color:theme.subtext,marginBottom:'4px' }}>💭 {ix.feedback}</div>}
              {ix.action_plan && <div style={{ fontSize:'12px',color:theme.accent,marginBottom:'6px' }}>✅ {ix.action_plan}</div>}
              <div style={{ display:'flex',gap:'6px' }}>
                <button onClick={()=>setInterModal({no:ix.interaction_no,existing:ix})} style={{ padding:'4px 10px',borderRadius:'6px',border:`1px solid ${theme.border}`,background:'transparent',color:theme.text,cursor:'pointer',fontSize:'11px' }}>✏️ Edit</button>
                {ix.ai_report && <button onClick={()=>setInterModal({no:ix.interaction_no,existing:ix})} style={{ padding:'4px 10px',borderRadius:'6px',border:'none',background:theme.accent,color:'#fff',cursor:'pointer',fontSize:'11px' }}>🤖 Report</button>}
              </div>
            </div>
          ))}

          {interactions.length === 0 && (
            <div style={{ ...card,textAlign:'center',padding:'30px' }}>
              <div style={{ fontSize:'32px',marginBottom:'8px' }}>📝</div>
              <div style={{ fontSize:'13px',color:theme.subtext }}>No interactions logged yet</div>
              <div style={{ fontSize:'12px',color:theme.subtext,marginTop:'4px' }}>Click "Start Session 1" above</div>
            </div>
          )}
        </div>
      </div>

      {interModal && (
        <InteractionModal
          mentee={mentee} no={interModal.no} existing={interModal.existing}
          trainers={trainers} theme={theme}
          onClose={()=>setInterModal(null)} onDone={load}
        />
      )}

      {showEdit && (
        <EditStudentModal
          mentee={mentee}
          theme={theme}
          onClose={()=>setShowEdit(false)}
          onDone={load}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// COMPLIANCE VIEW (admin)
// ══════════════════════════════════════════════════════════════════
function ComplianceView({ theme }) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRpt, setShowRpt] = useState(false);
  const [report,  setReport]  = useState('');
  const [genning, setGenning] = useState(false);

  useEffect(()=>{
    api('/cmp/compliance').then(setData).catch(console.error).finally(()=>setLoading(false));
  },[]);

  const genReport = async () => {
    setGenning(true); setShowRpt(true);
    try {
      const d = await api('/cmp/program-report',{method:'POST',body:JSON.stringify({})});
      setReport(d.report||'');
    } catch(e) { setReport('Error: '+e.message); }
    finally { setGenning(false); }
  };

  if (loading) return <div style={{ padding:'32px',textAlign:'center',color:theme.subtext }}>Loading...</div>;

  const badge = (done,total) => {
    const p = total ? Math.round(done/total*100) : 0;
    return { bg:p>=80?'#d1fae5':p>=50?'#fef3c7':'#fee2e2', color:p>=80?'#065f46':p>=50?'#92400e':'#991b1b', label:p>=80?'🟢 Good':p>=50?'🟡 Partial':'🔴 Behind' };
  };

  return (
    <div>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px' }}>
        <h2 style={{ margin:0,fontSize:'18px',fontWeight:'700',color:theme.text }}>📊 Compliance Dashboard</h2>
        <button onClick={genReport} disabled={genning} style={{ padding:'9px 16px',borderRadius:'9px',border:'none',background:'#7c3aed',color:'#fff',cursor:'pointer',fontSize:'13px',fontWeight:'600' }}>
          {genning?'Generating…':'🤖 AI Program Report'}
        </button>
      </div>

      {showRpt && (
        <div style={{ background:theme.card,borderRadius:'12px',border:`1px solid ${theme.border}`,padding:'20px',marginBottom:'16px',maxHeight:'400px',overflowY:'auto' }}>
          {genning ? <div style={{ textAlign:'center',padding:'30px',color:theme.subtext }}>🤖 Generating...</div>
            : <div style={{ fontSize:'13px',lineHeight:'1.8',color:theme.text,whiteSpace:'pre-wrap',fontFamily:'Georgia,serif' }}>{report}</div>}
        </div>
      )}

      <div style={{ background:theme.card,borderRadius:'12px',border:`1px solid ${theme.border}`,overflow:'hidden' }}>
        <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'12px' }}>
          <thead>
            <tr style={{ background:theme.bg }}>
              {['Mentor','Total','Grp Mtg','Present','S-1','S-2','S-3','S-4','S-5','Refs','Status'].map(h=>(
                <th key={h} style={{ padding:'10px 11px',textAlign:'left',color:theme.subtext,fontWeight:'700',fontSize:'11px',textTransform:'uppercase',borderBottom:`1px solid ${theme.border}`,whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((m,i)=>{
              const total = parseInt(m.total)||1;
              const b = badge(parseInt(m.i1)||0, total);
              return (
                <tr key={m.mentor_id} style={{ background:i%2===0?theme.card:theme.bg,borderBottom:`1px solid ${theme.border}` }}>
                  <td style={{ padding:'9px 11px' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:'7px' }}>
                      <Avatar name={m.mentor_name} size={24}/>
                      <span style={{ fontWeight:'600',color:theme.text }}>{m.mentor_name}</span>
                    </div>
                  </td>
                  <td style={{ padding:'9px 11px',fontWeight:'700',color:theme.text }}>{total}</td>
                  <td style={{ padding:'9px 11px' }}>{m.grp_date?<span style={{ color:'#10b981',fontWeight:'700' }}>✅</span>:<span style={{ color:'#ef4444' }}>❌</span>}</td>
                  <td style={{ padding:'9px 11px',color:theme.text }}>{m.grp_present||0}</td>
                  {[m.i1,m.i2,m.i3,m.i4,m.i5].map((v,j)=>(
                    <td key={j} style={{ padding:'9px 11px' }}>
                      <span style={{ fontWeight:'700',color:parseInt(v)===total?'#10b981':parseInt(v)>0?'#f59e0b':'#94a3b8' }}>
                        {v||0}/{total}
                      </span>
                    </td>
                  ))}
                  <td style={{ padding:'9px 11px',color:theme.subtext }}>{m.ref_given||0}↑ {m.ref_received||0}↓</td>
                  <td style={{ padding:'9px 11px' }}>
                    <span style={{ background:b.bg,color:b.color,padding:'3px 8px',borderRadius:'10px',fontSize:'11px',fontWeight:'700' }}>{b.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// REFERRALS INBOX
// ══════════════════════════════════════════════════════════════════
function ReferralsInbox({ theme }) {
  const [refs,    setRefs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);
  const [review,  setReview]  = useState('');
  const [score,   setScore]   = useState(null);
  const [busy,    setBusy]    = useState(false);

  const load = () => api('/cmp/my-referrals').then(setRefs).catch(console.error).finally(()=>setLoading(false));
  useEffect(()=>{ load(); },[]);

  const submitReview = async () => {
    if (!review.trim()) { alert('Please write your assessment'); return; }
    setBusy(true);
    try {
      await api(`/cmp/referral-review/${reviewing.id}`,{method:'POST',body:JSON.stringify({trainer_review:review,trainer_score:score})});
      setReviewing(null); setReview(''); setScore(null);
      load();
    } catch(e) { alert(e.message); }
    finally { setBusy(false); }
  };

  if (loading) return <div style={{ padding:'32px',textAlign:'center',color:theme.subtext }}>Loading...</div>;

  const pending  = refs.filter(r=>r.status==='pending');
  const reviewed = refs.filter(r=>r.status==='reviewed');
  const card = { background:theme.card,borderRadius:'10px',border:`1px solid ${theme.border}`,padding:'13px 15px',marginBottom:'8px' };

  return (
    <div>
      <h2 style={{ margin:'0 0 16px',fontSize:'18px',fontWeight:'700',color:theme.text }}>
        🔀 Referrals Inbox
        {pending.length>0 && <span style={{ marginLeft:'8px',background:'#ef4444',color:'#fff',padding:'2px 8px',borderRadius:'20px',fontSize:'12px' }}>{pending.length} pending</span>}
      </h2>

      {refs.length === 0 && (
        <div style={{ textAlign:'center',padding:'40px',color:theme.subtext }}>
          <div style={{ fontSize:'32px',marginBottom:'8px' }}>📭</div>
          <div>No referrals yet</div>
        </div>
      )}

      {pending.length > 0 && (
        <div style={{ marginBottom:'20px' }}>
          <div style={{ fontSize:'12px',fontWeight:'700',color:theme.subtext,marginBottom:'8px',textTransform:'uppercase' }}>⏳ Pending Review</div>
          {pending.map(r => (
            <div key={r.id} style={{ ...card,borderLeft:`4px solid #f59e0b` }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontWeight:'700',color:theme.text,fontSize:'14px' }}>{r.mentee_name}</div>
                  <div style={{ fontSize:'11px',color:theme.subtext }}>{r.roll_no} · {r.program} · {r.university}</div>
                  <div style={{ display:'flex',gap:'7px',marginTop:'5px',flexWrap:'wrap' }}>
                    <span style={{ background:theme.accent+'18',color:theme.accent,padding:'2px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:'700' }}>{r.domain}</span>
                    <span style={{ fontSize:'11px',color:theme.subtext }}>Referred by {r.from_mentor_name}</span>
                    {r.career_goal && <span style={{ fontSize:'11px',color:theme.subtext }}>🎯 {r.career_goal}</span>}
                  </div>
                  {r.note && <div style={{ fontSize:'12px',color:theme.text,marginTop:'6px',fontStyle:'italic' }}>"{r.note}"</div>}
                </div>
                <button onClick={()=>{ setReviewing(r); setReview(r.trainer_review||''); setScore(r.trainer_score||null); }}
                  style={{ padding:'7px 14px',borderRadius:'8px',border:'none',background:'#f59e0b',color:'#fff',cursor:'pointer',fontSize:'12px',fontWeight:'700',whiteSpace:'nowrap',flexShrink:0 }}>
                  ✍️ Write Review
                </button>
              </div>

              {/* Review form — inline */}
              {reviewing?.id === r.id && (
                <div style={{ marginTop:'12px',padding:'12px',background:theme.bg,borderRadius:'9px',border:`1px solid ${theme.border}` }}>
                  <div style={{ marginBottom:'8px' }}>
                    <div style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,marginBottom:'5px',textTransform:'uppercase' }}>Your Score (1-5)</div>
                    <div style={{ display:'flex',gap:'6px' }}>
                      {[1,2,3,4,5].map(n=>(
                        <button key={n} onClick={()=>setScore(n===score?null:n)} style={{
                          width:'36px',height:'32px',borderRadius:'7px',cursor:'pointer',
                          border:`2px solid ${score===n?SC_COLORS[n]:'#e2e8f0'}`,
                          background:score===n?SC_COLORS[n]+'18':'transparent',
                          color:score===n?SC_COLORS[n]:theme.subtext,fontWeight:'800',fontSize:'13px'
                        }}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom:'10px' }}>
                    <div style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,marginBottom:'5px',textTransform:'uppercase' }}>Your Assessment</div>
                    <textarea value={review} onChange={e=>setReview(e.target.value)}
                      placeholder={`Write your assessment of ${r.mentee_name} for ${r.domain}...`}
                      style={{ width:'100%',padding:'9px',borderRadius:'8px',border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,fontSize:'13px',minHeight:'90px',resize:'vertical',fontFamily:'inherit',lineHeight:'1.6',boxSizing:'border-box' }}/>
                  </div>
                  <div style={{ display:'flex',gap:'8px',justifyContent:'flex-end' }}>
                    <button onClick={()=>setReviewing(null)} style={{ padding:'7px 14px',borderRadius:'7px',border:`1px solid ${theme.border}`,background:'transparent',color:theme.text,cursor:'pointer',fontSize:'12px' }}>Cancel</button>
                    <button onClick={submitReview} disabled={busy} style={{ padding:'7px 16px',borderRadius:'7px',border:'none',background:theme.accent,color:'#fff',cursor:'pointer',fontSize:'12px',fontWeight:'600' }}>
                      {busy?'Saving…':'✅ Submit Review'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <div>
          <div style={{ fontSize:'12px',fontWeight:'700',color:theme.subtext,marginBottom:'8px',textTransform:'uppercase' }}>✅ Reviewed</div>
          {reviewed.map(r=>(
            <div key={r.id} style={{ ...card,borderLeft:`4px solid #10b981` }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontWeight:'600',color:theme.text }}>{r.mentee_name} <span style={{ fontSize:'11px',color:theme.subtext }}>{r.roll_no}</span></div>
                  <div style={{ display:'flex',gap:'7px',marginTop:'4px' }}>
                    <span style={{ background:theme.accent+'18',color:theme.accent,padding:'2px 7px',borderRadius:'10px',fontSize:'11px',fontWeight:'700' }}>{r.domain}</span>
                    {r.trainer_score && <ScorePill score={r.trainer_score}/>}
                  </div>
                  {r.trainer_review && <div style={{ fontSize:'12px',color:theme.subtext,marginTop:'6px',fontStyle:'italic' }}>"{r.trainer_review}"</div>}
                </div>
                <button onClick={()=>{ setReviewing(r); setReview(r.trainer_review||''); setScore(r.trainer_score||null); }}
                  style={{ padding:'5px 10px',borderRadius:'7px',border:`1px solid ${theme.border}`,background:'transparent',color:theme.text,cursor:'pointer',fontSize:'11px' }}>
                  ✏️ Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN CMP PAGE
// ══════════════════════════════════════════════════════════════════
// ── Inline attendance toggle row ─────────────────────────────────
function AttendanceRow({ a, theme, i, onToggle }) {
  const [attended, setAttended] = useState(a.attended);
  const [saving,   setSaving]   = useState(false);

  const toggle = async () => {
    setSaving(true);
    try {
      await api(`/cmp/group-attendance/${a.mentee_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ attended: !attended, observation: a.observation }),
      });
      setAttended(!attended);
      onToggle();
    } catch(e) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <tr style={{ background:i%2===0?theme.card:theme.bg, borderBottom:`1px solid ${theme.border}` }}>
      <td style={{ padding:'9px 12px' }}>
        <div style={{ display:'flex',alignItems:'center',gap:'7px' }}>
          <Avatar name={a.mentee_name} size={26}/>
          <span style={{ fontWeight:'600',color:theme.text }}>{a.mentee_name}</span>
        </div>
      </td>
      <td style={{ padding:'9px 12px',color:theme.subtext,fontSize:'11px' }}>{a.roll_no}</td>
      <td style={{ padding:'9px 12px',color:theme.subtext,fontSize:'11px' }}>{a.program}</td>
      <td style={{ padding:'9px 12px' }}>
        <button onClick={toggle} disabled={saving} style={{
          background: attended?'#d1fae5':'#fee2e2',
          color: attended?'#065f46':'#991b1b',
          padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'700',
          border:'none', cursor:'pointer', opacity: saving?0.6:1,
        }}>
          {saving ? '...' : attended ? '✅ Present' : '❌ Absent'}
        </button>
      </td>
      <td style={{ padding:'9px 12px',color:theme.subtext,fontSize:'12px',fontStyle:a.observation?'normal':'italic' }}>
        {a.observation||'—'}
      </td>
    </tr>
  );
}

// ══════════════════════════════════════════════════════════════════
// RICH ANALYTICS VIEW
// ══════════════════════════════════════════════════════════════════

function AnalyticsView({ trainers, theme }) {
  const [data,               setData]               = useState(null);
  const [loading,            setLoading]            = useState(true);
  const [selTid,             setSelTid]             = useState('');
  const [aiReport,           setAiReport]           = useState('');
  const [aiLoading,          setAiLoading]          = useState(false);
  const [aiType,             setAiType]             = useState(null);
  const [showAI,             setShowAI]             = useState(false);
  const [fullProgData,       setFullProgData]       = useState(null);
  const [fullProgLoading,    setFullProgLoading]    = useState(false);
  const [fullProgAI,         setFullProgAI]         = useState('');
  const [fullProgAILoading,  setFullProgAILoading]  = useState(false);
  const [showFullProg,       setShowFullProg]       = useState(false);

  // KEY FIX: useEffect watches selTid so it re-runs on trainer change
  useEffect(() => { load(selTid); }, [selTid]);

  const load = async (tid) => {
    setLoading(true);
    try {
      const qs = tid ? `?trainer_id=${tid}` : '';
      setData(await api(`/cmp/analytics${qs}`));
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const genAIReport = async (type) => {
    setAiLoading(true); setAiType(type); setShowAI(true); setAiReport('');
    try {
      const body = { type, trainer_id: type==='individual' ? selTid : null };
      const d = await api('/cmp/analytics-report', { method:'POST', body: JSON.stringify(body) });
      setAiReport(d.report || '');
    } catch(e) { setAiReport('Error: ' + e.message); }
    finally { setAiLoading(false); }
  };

  const downloadWord = async () => {
    if (!aiReport) return;
    const trainerName = selTid
      ? trainers.find(t=>String(t.id)===String(selTid))?.name || 'Trainer'
      : 'All Mentors';
    const tok  = localStorage.getItem('token');
    const resp = await fetch(`${API_BASE}/cmp/download-report`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${tok}` },
      body: JSON.stringify({
        report_text: aiReport,
        student_name: aiType==='combined' ? 'CMP 2026 — Full Program Report' : `Trainer Report: ${trainerName}`,
        roll_no: aiType==='combined' ? 'All 18 Mentors' : `Trainer: ${trainerName}`,
        program: 'CDC Mentorship Program 2026',
        university: 'MREI',
        mentor_name: 'CDC Admin',
        interaction_no: 0,
        meeting_date: new Date().toLocaleDateString('en-IN'),
      })
    });
    if (resp.ok) {
      const b = await resp.blob();
      const u = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href=u;
      a.download=`CMP2026_${aiType==='combined'?'Full_Program':trainerName.replace(/\s+/g,'_')}_Report.docx`;
      a.click(); URL.revokeObjectURL(u);
    }
  };

  const printHTML = () => {
    if (!aiReport || !data) return;
    const trainerName = selTid
      ? trainers.find(t=>String(t.id)===String(selTid))?.name || 'Trainer'
      : 'All Mentors Combined';
    const ov    = data.overview;
    const total = data.total || 1;
    const SC_COLORS = ['','#ef4444','#f97316','#eab308','#22c55e','#10b981'];

    // Build inline chart SVGs
    const funnelBars = [
      { label:'Group Meeting', val: parseInt(ov.grp_present)||0, color:'#06b6d4' },
      ...([1,2,3,4,5].map(n => {
        const prog = data.progression.find(p=>p.interaction_no===n);
        const colors=['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ec4899'];
        return { label:`Session ${n}`, val: parseInt(prog?.done)||0, color:colors[n-1] };
      }))
    ];

    const funnelSVG = funnelBars.map((b,i) => {
      const pct = Math.round(b.val/total*100);
      const w   = Math.max(pct, b.val>0?2:0);
      return `<div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
          <span style="font-weight:600">${b.label}</span>
          <span style="font-weight:800;color:${b.color}">${b.val}/${total} (${pct}%)</span>
        </div>
        <div style="height:20px;background:#f1f5f9;border-radius:4px;overflow:hidden">
          <div style="width:${w}%;height:100%;background:${b.color};border-radius:4px"></div>
        </div>
      </div>`;
    }).join('');

    const careerBars = (data.careers||[]).map(c => {
      const pct = Math.round(parseInt(c.cnt)/total*100);
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <div style="width:140px;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.career_goal}</div>
        <div style="flex:1;height:16px;background:#f1f5f9;border-radius:3px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:#3b82f6;border-radius:3px"></div>
        </div>
        <div style="width:24px;font-size:11px;font-weight:700;color:#3b82f6">${c.cnt}</div>
      </div>`;
    }).join('');

    const scoreCols = data.scores.map(s => `
      <tr>
        <td style="padding:6px 10px;font-weight:700">Session ${s.interaction_no} (${s.count} students)</td>
        <td style="padding:6px 10px;text-align:center;background:${SC_COLORS[Math.round(s.resume)]||'#f1f5f9'};color:white;font-weight:800">${s.resume||'—'}</td>
        <td style="padding:6px 10px;text-align:center;background:${SC_COLORS[Math.round(s.comm)]||'#f1f5f9'};color:white;font-weight:800">${s.comm||'—'}</td>
        <td style="padding:6px 10px;text-align:center;background:${SC_COLORS[Math.round(s.grooming)]||'#f1f5f9'};color:white;font-weight:800">${s.grooming||'—'}</td>
        <td style="padding:6px 10px;text-align:center;background:${SC_COLORS[Math.round(s.attitude)]||'#f1f5f9'};color:white;font-weight:800">${s.attitude||'—'}</td>
        <td style="padding:6px 10px;text-align:center;background:${SC_COLORS[Math.round(s.technical)]||'#f1f5f9'};color:white;font-weight:800">${s.technical||'—'}</td>
      </tr>`).join('');

    const reportHTML = aiReport.split('\n').map(line => {
      if (line.startsWith('## ')) return `<h2 style="background:#1e3a5f;color:white;padding:8px 14px;border-radius:4px;margin:20px 0 8px">${line.replace('## ','')}</h2>`;
      if (line.startsWith('# '))  return `<h1 style="background:#1e3a5f;color:white;padding:10px 16px;border-radius:4px;margin:20px 0 8px">${line.replace('# ','')}</h1>`;
      if (line.match(/^[-•*]\s/))  return `<div style="padding:3px 0 3px 16px;font-size:13px">• ${line.replace(/^[-•*]\s/,'')}</div>`;
      if (line.trim())              return `<p style="margin:6px 0;font-size:13px;line-height:1.7">${line}</p>`;
      return '<br/>';
    }).join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>CMP 2026 — ${aiType==='combined'?'Full Program':trainerName} Report</title>
<style>
  body { font-family: 'Segoe UI',Arial,sans-serif; margin:0; padding:0; color:#1e293b; }
  .header { background:#1e3a5f; color:white; padding:28px 40px; }
  .header h1 { margin:0 0 4px; font-size:22px; }
  .header p  { margin:0; font-size:13px; opacity:0.8; }
  .kpi-strip { display:grid; grid-template-columns:repeat(6,1fr); gap:12px; padding:20px 40px; background:#f8fafc; border-bottom:1px solid #e2e8f0; }
  .kpi { background:white; border-radius:8px; padding:12px; border-left:4px solid #3b82f6; box-shadow:0 1px 3px rgba(0,0,0,0.06); }
  .kpi .val { font-size:20px; font-weight:800; color:#3b82f6; }
  .kpi .lbl { font-size:10px; color:#64748b; margin-top:2px; }
  .body { padding:24px 40px; }
  .two-col { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; }
  .section-card { background:white; border-radius:10px; border:1px solid #e2e8f0; padding:16px; }
  .section-title { font-size:13px; font-weight:700; color:#1e293b; margin-bottom:12px; padding-bottom:6px; border-bottom:2px solid #e2e8f0; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th { background:#1e3a5f; color:white; padding:8px 10px; text-align:left; }
  td { padding:6px 10px; border-bottom:1px solid #f1f5f9; }
  tr:nth-child(even) td { background:#f8fafc; }
  .footer { background:#f1f5f9; padding:16px 40px; text-align:center; font-size:11px; color:#64748b; margin-top:24px; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head><body>
<div class="header">
  <h1>CDC Mentorship Program 2026 — ${aiType==='combined'?'Full Program Performance Report':`Trainer Report: ${trainerName}`}</h1>
  <p>Career Development Centre | Manav Rachna Educational Institutions | ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</p>
</div>

<div class="kpi-strip">
  <div class="kpi"><div class="val">${total}</div><div class="lbl">Total Students</div></div>
  <div class="kpi" style="border-color:#06b6d4"><div class="val" style="color:#06b6d4">${ov.grp_present||0}</div><div class="lbl">Group Present</div></div>
  <div class="kpi" style="border-color:#10b981"><div class="val" style="color:#10b981">${ov.i1_done||0}</div><div class="lbl">1st 1-on-1 Done</div></div>
  <div class="kpi" style="border-color:#8b5cf6"><div class="val" style="color:#8b5cf6">${ov.refs_given||0}</div><div class="lbl">Referrals Made</div></div>
  <div class="kpi" style="border-color:#f59e0b"><div class="val" style="color:#f59e0b">${ov.resumes_uploaded||0}</div><div class="lbl">Resumes Uploaded</div></div>
  <div class="kpi" style="border-color:#ef4444"><div class="val" style="color:#ef4444">${total-(ov.total_interacted||0)}</div><div class="lbl">Not Yet Interacted</div></div>
</div>

<div class="body">
  <div class="two-col">
    <div class="section-card">
      <div class="section-title">📊 Interaction Funnel</div>
      ${funnelSVG}
    </div>
    <div class="section-card">
      <div class="section-title">🎯 Career Goal Distribution</div>
      ${careerBars || '<div style="color:#94a3b8;text-align:center;padding:20px">No data yet</div>'}
    </div>
  </div>

  ${data.scores.length > 0 ? `
  <div class="section-card" style="margin-bottom:20px">
    <div class="section-title">📈 Assessment Score Averages (1=Poor → 5=Excellent)</div>
    <table>
      <thead><tr><th>Session</th><th>Resume</th><th>Communication</th><th>Grooming</th><th>Attitude</th><th>Technical</th></tr></thead>
      <tbody>${scoreCols}</tbody>
    </table>
  </div>` : ''}

  <div class="section-card">
    <div class="section-title">🤖 AI Performance Analysis</div>
    ${reportHTML}
  </div>
</div>
<div class="footer">Confidential — Career Development Centre, MREI | CMP 2026 | Generated ${new Date().toLocaleString('en-IN')}</div>
</body></html>`;

    const w = window.open('','_blank','width=1000,height=700');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 800);
  };

  // ── FULL PROGRAM REPORT ────────────────────────────────────────
  const loadFullProgData = async () => {
    setFullProgLoading(true);
    setShowFullProg(true);
    const tok = localStorage.getItem('token');
    const BASE = API_BASE;
    try {
      const r1 = await fetch(`${BASE}/cmp/full-program-data`, {
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${tok}` }
      });
      if (!r1.ok) throw new Error(`Data fetch failed: ${r1.status}`);
      const d = await r1.json();
      setFullProgData(d);
      // Auto-generate AI text
      setFullProgAILoading(true);
      try {
        const r2 = await fetch(`${BASE}/cmp/program-report`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${tok}` },
          body: JSON.stringify({})
        });
        const d2 = await r2.json();
        setFullProgAI(d2.report || '');
      } catch(e) { setFullProgAI(''); }
      finally { setFullProgAILoading(false); }
    } catch(e) { alert('Error loading report data: ' + e.message); setShowFullProg(false); }
    finally { setFullProgLoading(false); }
  };

  const downloadFullDocx = async () => {
    if (!fullProgData) return;
    const tok = localStorage.getItem('token');
    const resp = await fetch(`${API_BASE}/cmp/download-full-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ ...fullProgData, aiText: fullProgAI }),
    });
    if (resp.ok) {
      const b = await resp.blob();
      const u = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = u;
      a.download = `CMP2026_Full_Program_Report.docx`;
      a.click(); URL.revokeObjectURL(u);
    } else { alert('DOCX generation failed'); }
  };

  const printFullHTML = () => {
    if (!fullProgData) return;
    const t  = fullProgData.totals  || {};
    const gs = fullProgData.grpSummary || {};
    const sc = fullProgData.scores  || {};
    const mw = fullProgData.mentorwise || [];
    const total = parseInt(t.total) || 1;
    const pct = (n,d) => d ? Math.round((parseInt(n)||0)/parseInt(d)*100) : 0;
    const scColor = v => !v ? '#94a3b8' : parseFloat(v)<=2 ? '#dc2626' : parseFloat(v)<4 ? '#d97706' : '#059669';
    const scBg    = v => !v ? '#f3f4f6' : parseFloat(v)<=2 ? '#fee2e2' : parseFloat(v)<4 ? '#fef3c7' : '#d1fae5';
    const scLabel = v => !v ? '—' : (['','Poor','Below Avg','Average','Good','Excellent'][Math.round(parseFloat(v))]||'');

    // Build bar chart SVG
    const barH = 28, gap = 8, labelW = 160, innerW = 380, numW = 90;
    const chartH = mw.length*(barH+gap)+60;
    const getCol = p => p>=80 ? '#059669' : p>=50 ? '#d97706' : '#dc2626';
    const barsHTML = mw.map((r,i) => {
      const done = parseInt(r.i1_done)||0;
      const assign = parseInt(r.assigned)||1;
      const p = Math.round(done/assign*100);
      const bw = Math.max(Math.round(p/100*innerW), done>0?3:0);
      const y = 50 + i*(barH+gap);
      const name = (r.name||'').length>22 ? r.name.slice(0,20)+'…' : (r.name||'');
      return `<text x="0" y="${y+barH*0.72}" font-size="11" fill="#374151" font-family="Calibri,Arial">${name}</text>
        <rect x="${labelW}" y="${y}" width="${innerW}" height="${barH}" rx="3" fill="#f1f5f9"/>
        <rect x="${labelW}" y="${y}" width="${bw}" height="${barH}" rx="3" fill="${getCol(p)}"/>
        <text x="${labelW+innerW+8}" y="${y+barH*0.72}" font-size="11" font-weight="bold" fill="${getCol(p)}" font-family="Calibri,Arial">${done}/${assign} (${p}%)</text>`;
    }).join('');

    const chartSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${labelW+innerW+numW}" height="${chartH}">
      <text x="0" y="16" font-size="12" font-weight="bold" fill="#1b3a6b" font-family="Calibri,Arial">Session 1 — 1-on-1 Completion per Mentor</text>
      <text x="0" y="30" font-size="10" fill="#6b7280" font-family="Calibri,Arial">■ Green ≥80%  ■ Amber 50–79%  ■ Red &lt;50%</text>
      ${barsHTML}</svg>`;

    // Build mentor table rows
    const mentorRows = mw.map((r,i) => {
      const done=parseInt(r.i1_done)||0, assign=parseInt(r.assigned)||1;
      const pending=assign-done, p=pct(done,assign);
      const avg = r.avg_overall ? parseFloat(r.avg_overall).toFixed(1) : '—';
      return `<tr style="background:${i%2===0?'white':'#f8fafc'}">
        <td style="padding:7px 10px;font-weight:600">${r.name||'—'}</td>
        <td style="padding:7px 10px;text-align:center">${assign}</td>
        <td style="padding:7px 10px;text-align:center;font-weight:700;color:${done>0?'#059669':'#dc2626'}">${done}</td>
        <td style="padding:7px 10px;text-align:center;font-weight:700;color:${pending>0?'#d97706':'#059669'}">${pending}</td>
        <td style="padding:7px 10px;text-align:center;font-weight:800;color:${getCol(p)};background:${scBg(p/20)}">${p}%</td>
        <td style="padding:7px 10px;text-align:center;font-weight:700;color:${scColor(r.avg_overall)};background:${scBg(r.avg_overall)}">${avg}</td>
      </tr>`;
    }).join('');

    const totalDone   = mw.reduce((a,r)=>a+(parseInt(r.i1_done)||0),0);
    const totalAssign = mw.reduce((a,r)=>a+(parseInt(r.assigned)||0),0);
    const totalPct    = pct(totalDone,totalAssign);

    const aiHTML = (fullProgAI||'').split('
').map(line => {
      if (line.startsWith('## ')) return `<h2 style="background:#1b3a6b;color:white;padding:8px 14px;border-radius:4px;margin:18px 0 8px;font-size:14px">${line.replace('## ','')}</h2>`;
      if (line.match(/^[-•*]\s/)) return `<div style="padding:3px 0 3px 20px;font-size:13px;color:#1a1a2e">▸ ${line.replace(/^[-•*]\s/,'')}</div>`;
      if (line.trim()) return `<p style="margin:5px 0;font-size:13px;line-height:1.7;color:#1a1a2e">${line}</p>`;
      return '<br/>';
    }).join('');

    const grpPresent=parseInt(t.grp_present)||0, grpAbsent=parseInt(t.grp_absent)||0;
    const grpPct=pct(grpPresent,total);
    const date = fullProgData.generatedAt || new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>CMP 2026 — Full Program Report</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',Calibri,Arial,sans-serif;margin:0;padding:0;color:#1a1a2e;background:#f8fafc}
  .header{background:linear-gradient(135deg,#1b3a6b,#243f7a);color:white;padding:28px 40px;display:flex;justify-content:space-between;align-items:center}
  .header h1{margin:0 0 4px;font-size:20px;font-weight:800}
  .header p{margin:0;font-size:12px;opacity:0.75}
  .header-badge{text-align:right}
  .header-badge .prog{font-size:11px;color:#c8960c;font-weight:700;letter-spacing:1px}
  .header-badge .date{font-size:12px;opacity:0.8;margin-top:2px}
  .gold-bar{height:5px;background:linear-gradient(90deg,#c8960c,#0f7173)}
  .kpi-strip{display:grid;grid-template-columns:repeat(6,1fr);gap:0;background:white;border-bottom:1px solid #e2e8f0}
  .kpi{padding:14px 12px;border-right:1px solid #e2e8f0;text-align:center}
  .kpi:last-child{border-right:none}
  .kpi .val{font-size:22px;font-weight:800}
  .kpi .lbl{font-size:10px;color:#6b7280;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px}
  .body{padding:24px 40px;max-width:1100px;margin:0 auto}
  .sec-title{font-size:13px;font-weight:800;color:#1b3a6b;text-transform:uppercase;letter-spacing:0.5px;
             padding-bottom:6px;border-bottom:3px solid #0f7173;margin:24px 0 12px;display:flex;align-items:center;gap:6px}
  .card{background:white;border-radius:10px;border:1px solid #e2e8f0;padding:16px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#1b3a6b;color:white;padding:9px 12px;text-align:left;font-size:12px;font-weight:700}
  th.c{text-align:center}
  td{padding:7px 12px;border-bottom:1px solid #f1f5f9}
  .score-card{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:0}
  .score-box{border-radius:8px;padding:12px;text-align:center;border:1px solid #e2e8f0}
  .score-box .sval{font-size:24px;font-weight:800}
  .score-box .slbl{font-size:11px;font-weight:600;color:#374151;margin-bottom:2px}
  .score-box .sdesc{font-size:10px;font-style:italic}
  .footer{background:#1b3a6b;color:#aaccee;text-align:center;padding:14px;font-size:11px;margin-top:32px}
  @media print{body{background:white}.kpi-strip{-webkit-print-color-adjust:exact;print-color-adjust:exact}th{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>

<div class="header">
  <div>
    <h1>CAREER DEVELOPMENT CENTRE — CMP 2026</h1>
    <p>Manav Rachna Educational Institutions (MREI) · Full Program Performance Report</p>
  </div>
  <div class="header-badge">
    <div class="prog">CONFIDENTIAL</div>
    <div class="date">${date}</div>
  </div>
</div>
<div class="gold-bar"></div>

<div class="kpi-strip">
  <div class="kpi"><div class="val" style="color:#1b3a6b">${total}</div><div class="lbl">Total Students</div></div>
  <div class="kpi"><div class="val" style="color:#0f7173">${grpPresent}/${total}</div><div class="lbl">Group Mtg Present</div></div>
  <div class="kpi"><div class="val" style="color:#059669">${t.i1_done||0}/${total}</div><div class="lbl">Session 1 Done</div></div>
  <div class="kpi"><div class="val" style="color:#d97706">${t.i2_done||0}/${total}</div><div class="lbl">Session 2 Done</div></div>
  <div class="kpi"><div class="val" style="color:#243f7a">${gs.mentors_with_meeting||0}/${gs.total_mentors||0}</div><div class="lbl">Mentors w/ Grp Mtg</div></div>
  <div class="kpi"><div class="val" style="color:${getCol(totalPct)}">${totalPct}%</div><div class="lbl">S1 Coverage</div></div>
</div>

<div class="body">

  <div class="sec-title">👥 Group Meeting — Consolidated</div>
  <div class="card">
    <table>
      <thead><tr><th>Activity</th><th class="c">Total Students</th><th class="c">Present</th><th class="c">Absent</th><th class="c">Attendance %</th></tr></thead>
      <tbody>
        <tr>
          <td style="font-weight:600">Group Orientation Meeting</td>
          <td style="text-align:center">${total}</td>
          <td style="text-align:center;font-weight:700;color:#059669">${grpPresent}</td>
          <td style="text-align:center;font-weight:700;color:${grpAbsent>0?'#dc2626':'#059669'}">${grpAbsent}</td>
          <td style="text-align:center;font-weight:800;font-size:15px;color:${getCol(grpPct)}">${grpPct}%</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="sec-title">📋 Session 1 — Mentor-wise 1-on-1 Compliance</div>
  <div class="card">
    <table>
      <thead><tr><th>Mentor Name</th><th class="c">Assigned</th><th class="c">Done</th><th class="c">Pending</th><th class="c">%</th><th class="c">Avg Score</th></tr></thead>
      <tbody>
        ${mentorRows}
        <tr style="background:#1b3a6b;color:white">
          <td style="font-weight:800;color:white">TOTAL / OVERALL</td>
          <td style="text-align:center;font-weight:800;color:white">${totalAssign}</td>
          <td style="text-align:center;font-weight:800;color:white">${totalDone}</td>
          <td style="text-align:center;font-weight:800;color:white">${totalAssign-totalDone}</td>
          <td style="text-align:center;font-weight:800;color:white">${totalPct}%</td>
          <td style="text-align:center;font-weight:800;color:white">${sc.resume ? parseFloat(sc.resume).toFixed(1) : '—'}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="sec-title">📊 Session 1 Compliance — Bar Chart</div>
  <div class="card" style="overflow-x:auto">
    <div style="min-width:630px">${chartSVG}</div>
  </div>

  <div class="sec-title">🎯 Session 1 — Overall Assessment Scores</div>
  <div class="card">
    <div class="score-card">
      ${[['Resume',sc.resume],['Communication',sc.comm],['Grooming',sc.grooming],['Attitude',sc.attitude],['Technical',sc.tech]].map(([lbl,v])=>`
        <div class="score-box" style="background:${scBg(v)}">
          <div class="slbl">${lbl}</div>
          <div class="sval" style="color:${scColor(v)}">${v?parseFloat(v).toFixed(1)+'/5':'—'}</div>
          <div class="sdesc" style="color:${scColor(v)}">${scLabel(v)}</div>
        </div>`).join('')}
    </div>
  </div>

  ${fullProgAI ? `<div class="sec-title">🤖 AI Analysis & Recommendations</div>
  <div class="card">${aiHTML}</div>` : ''}

</div>
<div class="footer">Career Development Centre (CDC) · Manav Rachna Educational Institutions · CMP 2026 · CONFIDENTIAL · ${date}</div>
</body></html>`;

    const w = window.open('','_blank','width=1100,height=800');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 900);
  };

  const card = { background:theme.card, borderRadius:'12px', border:`1px solid ${theme.border}`, padding:'16px' };

  const selectedName = selTid ? trainers.find(t=>String(t.id)===selTid)?.name : null;

  const BarChart = ({ data: bars, valueKey='cnt', labelKey, color='#3b82f6' }) => {
    const max = Math.max(...(bars||[]).map(b=>parseInt(b[valueKey])||0), 1);
    return (
      <div style={{ display:'flex',flexDirection:'column',gap:'5px' }}>
        {(bars||[]).map((b,i)=>{
          const val = parseInt(b[valueKey])||0;
          const pct = Math.round((val/max)*100);
          return (
            <div key={i} style={{ display:'flex',alignItems:'center',gap:'7px' }}>
              <div style={{ width:'130px',fontSize:'11px',color:theme.text,flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }} title={b[labelKey]}>{b[labelKey]||'Unknown'}</div>
              <div style={{ flex:1,height:'18px',background:'#f1f5f9',borderRadius:'4px',overflow:'hidden' }}>
                <div style={{ width:`${pct}%`,height:'100%',background:color,borderRadius:'4px' }}/>
              </div>
              <div style={{ width:'28px',fontSize:'11px',fontWeight:'700',color,textAlign:'right',flexShrink:0 }}>{val}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const DonutSlices = ({ slices, size=100 }) => {
    const total = slices.reduce((a,s)=>a+s.val,0)||1;
    const colors=['#10b981','#f59e0b','#f97316','#ef4444','#8b5cf6'];
    let cum = 0;
    return (
      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'8px' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map((s,i)=>{
            const pct = s.val/total;
            const start = cum*2*Math.PI - Math.PI/2;
            cum += pct;
            const end = cum*2*Math.PI - Math.PI/2;
            const r=size/2-8; const cx=size/2; const cy=size/2;
            const x1=cx+r*Math.cos(start); const y1=cy+r*Math.sin(start);
            const x2=cx+r*Math.cos(end);   const y2=cy+r*Math.sin(end);
            const d=`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${pct>0.5?1:0},1 ${x2},${y2} Z`;
            return <path key={i} d={d} fill={colors[i%colors.length]} stroke="white" strokeWidth="2"/>;
          })}
          <circle cx={size/2} cy={size/2} r={size/2-24} fill={theme.card}/>
          <text x={size/2} y={size/2+4} textAnchor="middle" fontSize="12" fontWeight="800" fill={theme.text}>{total}</text>
        </svg>
        <div style={{ width:'100%' }}>
          {slices.map((s,i)=>(
            <div key={i} style={{ display:'flex',justifyContent:'space-between',fontSize:'10px',color:theme.subtext,marginBottom:'2px' }}>
              <span style={{ display:'flex',alignItems:'center',gap:'4px' }}>
                <span style={{ width:'8px',height:'8px',borderRadius:'50%',background:colors[i%colors.length],display:'inline-block'}}/>
                {s.label}
              </span>
              <span style={{ fontWeight:'700',color:theme.text }}>{s.val}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ScoreCircle = ({ val, label }) => {
    const r = Math.round(parseFloat(val)||0);
    const SC_COLORS=['#94a3b8','#ef4444','#f97316','#eab308','#22c55e','#10b981'];
    return (
      <div style={{ textAlign:'center' }}>
        <div style={{ width:'44px',height:'44px',borderRadius:'50%',margin:'0 auto 4px',
          background:SC_COLORS[r]+'20',border:`2px solid ${SC_COLORS[r]}`,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:'15px',fontWeight:'800',color:SC_COLORS[r] }}>
          {val||'—'}
        </div>
        <div style={{ fontSize:'10px',color:theme.subtext }}>{label}</div>
      </div>
    );
  };

  return (
    <div>
      {/* Filter + AI Report Bar */}
      <div style={{ display:'flex',alignItems:'center',gap:'10px',marginBottom:'18px',flexWrap:'wrap',
        background:theme.card,borderRadius:'12px',border:`1px solid ${theme.border}`,padding:'12px 16px' }}>
        <span style={{ fontSize:'13px',fontWeight:'700',color:theme.text }}>View:</span>
        <select value={selTid} onChange={e=>setSelTid(e.target.value)}
          style={{ padding:'8px 12px',borderRadius:'9px',border:`1px solid ${theme.border}`,background:theme.bg,color:theme.text,fontSize:'13px' }}>
          <option value="">🌐 All Mentors Combined</option>
          {trainers.filter(t=>t.name).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <span style={{ fontSize:'12px',color:theme.subtext,flex:1 }}>
          {selectedName ? `Showing data for ${selectedName}` : `Showing combined data for all ${data?.total||'…'} students`}
        </span>

        {/* Report buttons */}
        <div style={{ display:'flex',gap:'8px',flexWrap:'wrap' }}>
          {/* Full Program Report — new structured report */}
          <button onClick={loadFullProgData} disabled={fullProgLoading} style={{
            padding:'8px 14px',borderRadius:'9px',border:'none',
            background: fullProgLoading ? '#94a3b8' : '#1b3a6b',
            color:'#fff',cursor:'pointer',fontSize:'12px',fontWeight:'600',whiteSpace:'nowrap',
            boxShadow:'0 2px 6px rgba(27,58,107,0.3)'
          }}>
            {fullProgLoading ? '⏳ Loading…' : '📊 Full Program Report'}
          </button>
          {/* Individual trainer AI report */}
          {selTid && (
            <button onClick={()=>genAIReport('individual')} disabled={aiLoading} style={{
              padding:'8px 14px',borderRadius:'9px',border:'none',
              background:aiLoading&&aiType==='individual'?'#94a3b8':'#7c3aed',
              color:'#fff',cursor:'pointer',fontSize:'12px',fontWeight:'600',whiteSpace:'nowrap'
            }}>
              {aiLoading&&aiType==='individual'?'Generating…':`🤖 ${selectedName} Report`}
            </button>
          )}
        </div>
      </div>

      {/* AI Report Panel */}
      {showAI && (
        <div style={{ background:theme.card,borderRadius:'12px',border:`1px solid ${theme.border}`,padding:'20px',marginBottom:'18px' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px' }}>
            <div style={{ fontWeight:'700',fontSize:'15px',color:theme.text }}>
              🤖 {aiType==='combined'?'Full Program Performance Report':`Trainer Report — ${selectedName||''}`}
            </div>
            <div style={{ display:'flex',gap:'8px' }}>
              {!aiLoading && aiReport && !aiReport.startsWith('Error') && (
                <>
                  <button onClick={downloadWord} style={{ padding:'7px 14px',borderRadius:'8px',border:'none',background:'#1e3a5f',color:'#fff',cursor:'pointer',fontSize:'12px',fontWeight:'600' }}>
                    ⬇️ Word
                  </button>
                  <button onClick={printHTML} style={{ padding:'7px 14px',borderRadius:'8px',border:'none',background:'#059669',color:'#fff',cursor:'pointer',fontSize:'12px',fontWeight:'600' }}>
                    📄 PDF (Print)
                  </button>
                </>
              )}
              <button onClick={()=>setShowAI(false)} style={{ background:'none',border:'none',fontSize:'18px',cursor:'pointer',color:theme.subtext }}>✕</button>
            </div>
          </div>
          {aiLoading ? (
            <div style={{ textAlign:'center',padding:'40px' }}>
              <div style={{ fontSize:'36px',marginBottom:'10px' }}>🤖</div>
              <div style={{ fontWeight:'600',color:theme.text }}>Analysing data and generating report...</div>
              <div style={{ fontSize:'12px',color:theme.subtext,marginTop:'4px' }}>This takes about 15 seconds</div>
            </div>
          ) : (
            <div style={{ fontSize:'13px',lineHeight:'1.8',color:theme.text,whiteSpace:'pre-wrap',fontFamily:'Georgia,serif',maxHeight:'400px',overflowY:'auto' }}>
              {aiReport}
            </div>
          )}
        </div>
      )}

      {/* ── FULL PROGRAM REPORT PANEL ─────────────────────────── */}
      {showFullProg && (
        <div style={{ background:theme.card,borderRadius:'14px',border:`2px solid #1b3a6b`,padding:'24px',marginBottom:'20px',boxShadow:'0 4px 20px rgba(27,58,107,0.12)' }}>
          {/* Panel Header */}
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px',paddingBottom:'14px',borderBottom:`2px solid #e2e8f0` }}>
            <div>
              <div style={{ fontWeight:'800',fontSize:'16px',color:'#1b3a6b' }}>📊 CMP 2026 — Full Program Report</div>
              <div style={{ fontSize:'12px',color:theme.subtext,marginTop:'2px' }}>{fullProgData?.generatedAt || ''} · Career Development Centre, MREI</div>
            </div>
            <div style={{ display:'flex',gap:'8px',alignItems:'center' }}>
              {fullProgData && !fullProgLoading && (
                <>
                  <button onClick={downloadFullDocx} style={{ padding:'8px 14px',borderRadius:'8px',border:'none',background:'#1b3a6b',color:'#fff',cursor:'pointer',fontSize:'12px',fontWeight:'700',display:'flex',alignItems:'center',gap:'5px' }}>
                    ⬇️ DOCX
                  </button>
                  <button onClick={printFullHTML} style={{ padding:'8px 14px',borderRadius:'8px',border:'none',background:'#059669',color:'#fff',cursor:'pointer',fontSize:'12px',fontWeight:'700',display:'flex',alignItems:'center',gap:'5px' }}>
                    📄 HTML / PDF
                  </button>
                </>
              )}
              <button onClick={()=>setShowFullProg(false)} style={{ background:'none',border:`1px solid ${theme.border}`,borderRadius:'8px',padding:'6px 10px',fontSize:'16px',cursor:'pointer',color:theme.subtext }}>✕</button>
            </div>
          </div>

          {fullProgLoading ? (
            <div style={{ textAlign:'center',padding:'50px' }}>
              <div style={{ fontSize:'40px',marginBottom:'12px' }}>📊</div>
              <div style={{ fontWeight:'700',color:theme.text,fontSize:'15px' }}>Building Full Program Report…</div>
              <div style={{ fontSize:'12px',color:theme.subtext,marginTop:'6px' }}>Fetching data from all mentors</div>
            </div>
          ) : fullProgData ? (() => {
            const t   = fullProgData.totals     || {};
            const gs  = fullProgData.grpSummary || {};
            const sc  = fullProgData.scores     || {};
            const mw  = fullProgData.mentorwise || [];
            const total = parseInt(t.total)||1;
            const pct = (n,d) => d ? Math.round((parseInt(n)||0)/parseInt(d)*100) : 0;
            const scColor = v => !v?theme.subtext:parseFloat(v)<=2?'#dc2626':parseFloat(v)<4?'#d97706':'#059669';
            const scBg    = v => !v?'#f3f4f6':parseFloat(v)<=2?'#fee2e2':parseFloat(v)<4?'#fef3c7':'#d1fae5';
            const scLabel = v => !v?'—':(['','Poor','Below Avg','Average','Good','Excellent'][Math.round(parseFloat(v))]||'');
            const getBarColor = p => p>=80?'#059669':p>=50?'#d97706':'#dc2626';
            const totalDone   = mw.reduce((a,r)=>a+(parseInt(r.i1_done)||0),0);
            const totalAssign = mw.reduce((a,r)=>a+(parseInt(r.assigned)||0),0);
            const totalPct    = pct(totalDone,totalAssign);

            return (
              <div>
                {/* KPI Strip */}
                <div style={{ display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'8px',marginBottom:'20px' }}>
                  {[
                    { label:'Total Students',    val:total,                                    color:'#1b3a6b' },
                    { label:'Group Mtg Present', val:`${t.grp_present||0}/${total}`,           color:'#0f7173' },
                    { label:'Session 1 Done',    val:`${t.i1_done||0}/${total}`,               color:'#059669' },
                    { label:'Session 2 Done',    val:`${t.i2_done||0}/${total}`,               color:'#d97706' },
                    { label:'Mentors w/ Grp Mtg',val:`${gs.mentors_with_meeting||0}/${gs.total_mentors||0}`, color:'#243f7a' },
                    { label:'S1 Coverage',       val:`${totalPct}%`,                           color:getBarColor(totalPct) },
                  ].map(k=>(
                    <div key={k.label} style={{ background:theme.bg||'#f8fafc',borderRadius:'10px',padding:'12px 10px',textAlign:'center',border:`1px solid #e2e8f0`,borderTop:`3px solid ${k.color}` }}>
                      <div style={{ fontSize:'20px',fontWeight:'800',color:k.color }}>{k.val}</div>
                      <div style={{ fontSize:'10px',color:theme.subtext,marginTop:'3px',lineHeight:'1.3' }}>{k.label}</div>
                    </div>
                  ))}
                </div>

                {/* Group Meeting Table */}
                <div style={{ marginBottom:'20px' }}>
                  <div style={{ fontWeight:'700',fontSize:'13px',color:'#1b3a6b',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.5px',borderBottom:'2px solid #0f7173',paddingBottom:'4px' }}>
                    👥 Group Meeting — Consolidated
                  </div>
                  <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'13px' }}>
                    <thead>
                      <tr style={{ background:'#1b3a6b',color:'white' }}>
                        {['Activity','Total Students','Present','Absent','Attendance %'].map(h=>(
                          <th key={h} style={{ padding:'9px 12px',textAlign:h==='Activity'?'left':'center',fontWeight:'700',fontSize:'12px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding:'9px 12px',fontWeight:'600',borderBottom:'1px solid #e2e8f0' }}>Group Orientation Meeting</td>
                        <td style={{ padding:'9px 12px',textAlign:'center',borderBottom:'1px solid #e2e8f0' }}>{total}</td>
                        <td style={{ padding:'9px 12px',textAlign:'center',fontWeight:'700',color:'#059669',borderBottom:'1px solid #e2e8f0' }}>{t.grp_present||0}</td>
                        <td style={{ padding:'9px 12px',textAlign:'center',fontWeight:'700',color:(t.grp_absent||0)>0?'#dc2626':'#059669',borderBottom:'1px solid #e2e8f0' }}>{t.grp_absent||0}</td>
                        <td style={{ padding:'9px 12px',textAlign:'center',fontWeight:'800',fontSize:'15px',color:getBarColor(pct(t.grp_present,total)),background:scBg(pct(t.grp_present,total)/20),borderBottom:'1px solid #e2e8f0' }}>
                          {pct(t.grp_present,total)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Session 1 Mentor Table */}
                <div style={{ marginBottom:'20px' }}>
                  <div style={{ fontWeight:'700',fontSize:'13px',color:'#1b3a6b',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.5px',borderBottom:'2px solid #0f7173',paddingBottom:'4px' }}>
                    📋 Session 1 — Mentor-wise 1-on-1 Compliance
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'12px',minWidth:'580px' }}>
                      <thead>
                        <tr style={{ background:'#1b3a6b',color:'white' }}>
                          {['Mentor Name','Assigned','Done','Pending','%','Avg Score'].map((h,i)=>(
                            <th key={h} style={{ padding:'9px 12px',textAlign:i===0?'left':'center',fontWeight:'700',fontSize:'12px' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {mw.map((r,i)=>{
                          const done=parseInt(r.i1_done)||0,assign=parseInt(r.assigned)||1;
                          const pending=assign-done, p=pct(done,assign);
                          const avg=r.avg_overall?parseFloat(r.avg_overall).toFixed(1):'—';
                          return (
                            <tr key={r.id} style={{ background:i%2===0?theme.card:'#f8fafc' }}>
                              <td style={{ padding:'8px 12px',fontWeight:'600',color:theme.text,borderBottom:'1px solid #e2e8f0' }}>{r.name}</td>
                              <td style={{ padding:'8px 12px',textAlign:'center',borderBottom:'1px solid #e2e8f0',color:theme.text }}>{assign}</td>
                              <td style={{ padding:'8px 12px',textAlign:'center',fontWeight:'700',color:done>0?'#059669':'#dc2626',borderBottom:'1px solid #e2e8f0' }}>{done}</td>
                              <td style={{ padding:'8px 12px',textAlign:'center',fontWeight:'700',color:pending>0?'#d97706':'#059669',borderBottom:'1px solid #e2e8f0' }}>{pending}</td>
                              <td style={{ padding:'8px 12px',textAlign:'center',fontWeight:'800',color:getBarColor(p),background:scBg(p/20),borderBottom:'1px solid #e2e8f0' }}>{p}%</td>
                              <td style={{ padding:'8px 12px',textAlign:'center',fontWeight:'700',color:scColor(r.avg_overall),background:scBg(r.avg_overall),borderBottom:'1px solid #e2e8f0' }}>{avg}</td>
                            </tr>
                          );
                        })}
                        {/* Totals row */}
                        <tr style={{ background:'#1b3a6b' }}>
                          <td style={{ padding:'9px 12px',fontWeight:'800',color:'white' }}>TOTAL / OVERALL</td>
                          <td style={{ padding:'9px 12px',textAlign:'center',fontWeight:'800',color:'white' }}>{totalAssign}</td>
                          <td style={{ padding:'9px 12px',textAlign:'center',fontWeight:'800',color:'white' }}>{totalDone}</td>
                          <td style={{ padding:'9px 12px',textAlign:'center',fontWeight:'800',color:'white' }}>{totalAssign-totalDone}</td>
                          <td style={{ padding:'9px 12px',textAlign:'center',fontWeight:'800',color:'white' }}>{totalPct}%</td>
                          <td style={{ padding:'9px 12px',textAlign:'center',fontWeight:'800',color:'white' }}>{sc.resume?parseFloat(sc.resume).toFixed(1):'—'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bar Chart */}
                <div style={{ marginBottom:'20px' }}>
                  <div style={{ fontWeight:'700',fontSize:'13px',color:'#1b3a6b',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.5px',borderBottom:'2px solid #0f7173',paddingBottom:'4px' }}>
                    📊 Session 1 Compliance — Bar Chart
                  </div>
                  <div style={{ background:'white',borderRadius:'10px',border:'1px solid #e2e8f0',padding:'16px',overflowX:'auto' }}>
                    {mw.map((r,i)=>{
                      const done=parseInt(r.i1_done)||0,assign=parseInt(r.assigned)||1;
                      const p=pct(done,assign);
                      return (
                        <div key={r.id} style={{ marginBottom:'10px' }}>
                          <div style={{ display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'4px' }}>
                            <span style={{ fontWeight:'600',color:theme.text,minWidth:'160px' }}>{r.name}</span>
                            <span style={{ fontWeight:'800',color:getBarColor(p),fontSize:'12px' }}>{done}/{assign} ({p}%)</span>
                          </div>
                          <div style={{ height:'20px',background:'#f1f5f9',borderRadius:'4px',overflow:'hidden' }}>
                            <div style={{ width:`${Math.max(p,done>0?2:0)}%`,height:'100%',background:getBarColor(p),borderRadius:'4px',transition:'width 0.5s ease' }}/>
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ display:'flex',gap:'16px',marginTop:'10px',fontSize:'11px',color:theme.subtext }}>
                      <span style={{ color:'#059669' }}>■ ≥80% On Track</span>
                      <span style={{ color:'#d97706' }}>■ 50–79% Needs Attention</span>
                      <span style={{ color:'#dc2626' }}>■ &lt;50% Critical</span>
                    </div>
                  </div>
                </div>

                {/* Score Cards */}
                <div style={{ marginBottom:'20px' }}>
                  <div style={{ fontWeight:'700',fontSize:'13px',color:'#1b3a6b',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.5px',borderBottom:'2px solid #0f7173',paddingBottom:'4px' }}>
                    🎯 Session 1 — Overall Assessment Scores
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'10px' }}>
                    {[['Resume',sc.resume],['Communication',sc.comm],['Grooming',sc.grooming],['Attitude',sc.attitude],['Technical',sc.tech]].map(([lbl,v])=>(
                      <div key={lbl} style={{ background:scBg(v),borderRadius:'10px',padding:'14px',textAlign:'center',border:'1px solid #e2e8f0' }}>
                        <div style={{ fontSize:'11px',fontWeight:'700',color:'#374151',marginBottom:'4px' }}>{lbl}</div>
                        <div style={{ fontSize:'24px',fontWeight:'800',color:scColor(v) }}>{v?parseFloat(v).toFixed(1)+'/5':'—'}</div>
                        <div style={{ fontSize:'11px',color:scColor(v),fontStyle:'italic' }}>{scLabel(v)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Analysis */}
                {(fullProgAILoading || fullProgAI) && (
                  <div style={{ marginBottom:'8px' }}>
                    <div style={{ fontWeight:'700',fontSize:'13px',color:'#1b3a6b',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.5px',borderBottom:'2px solid #0f7173',paddingBottom:'4px' }}>
                      🤖 AI Analysis & Recommendations
                    </div>
                    {fullProgAILoading ? (
                      <div style={{ textAlign:'center',padding:'24px',color:theme.subtext }}>
                        <div style={{ fontSize:'24px',marginBottom:'6px' }}>🤖</div>
                        Generating AI analysis…
                      </div>
                    ) : (
                      <div style={{ fontSize:'13px',lineHeight:'1.8',color:theme.text,whiteSpace:'pre-wrap',fontFamily:'Georgia,serif',maxHeight:'350px',overflowY:'auto',padding:'4px 0' }}>
                        {fullProgAI}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })() : null}
        </div>
      )}

      {loading ? (
        <div style={{ padding:'60px',textAlign:'center',color:theme.subtext }}>Loading analytics...</div>
      ) : !data ? (
        <div style={{ padding:'60px',textAlign:'center',color:theme.subtext }}>No data available</div>
      ) : (
        <>
          {/* KPI Strip */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'10px',marginBottom:'16px' }}>
            {[
              { label:'Total Students',     value:data.total,                                      color:'#3b82f6', icon:'👥' },
              { label:'Group Present',      value:`${data.overview.grp_present||0} (${Math.round((data.overview.grp_present||0)/data.total*100)}%)`, color:'#06b6d4', icon:'🤝' },
              { label:'1st 1-on-1 Done',   value:`${data.overview.i1_done||0} (${Math.round((data.overview.i1_done||0)/data.total*100)}%)`,           color:'#10b981', icon:'✅' },
              { label:'Resumes Uploaded',  value:data.overview.resumes_uploaded||0,               color:'#8b5cf6', icon:'📄' },
              { label:'Referrals Made',    value:data.overview.refs_given||0,                      color:'#f59e0b', icon:'🔀' },
              { label:'Not Interacted Yet',value:data.total-(data.overview.total_interacted||0),   color:'#ef4444', icon:'⚠️' },
            ].map(s=>(
              <div key={s.label} style={{ ...card,padding:'12px 13px',borderLeft:`4px solid ${s.color}` }}>
                <div style={{ fontSize:'18px',fontWeight:'800',color:s.color }}>{s.value}</div>
                <div style={{ fontSize:'10px',color:theme.subtext,marginTop:'2px' }}>{s.icon} {s.label}</div>
              </div>
            ))}
          </div>

          {/* Row 1: Funnel + Career Goals */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px' }}>
            <div style={card}>
              <div style={{ fontSize:'13px',fontWeight:'700',color:theme.text,marginBottom:'12px' }}>📊 Interaction Funnel</div>
              {[
                { label:'Group Meeting', val:parseInt(data.overview.grp_present)||0, color:'#06b6d4' },
                ...[1,2,3,4,5].map(n=>({
                  label:`Session ${n}`,
                  val:parseInt(data.progression.find(p=>p.interaction_no===n)?.done)||0,
                  color:['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ec4899'][n-1]
                }))
              ].map((b,i)=>{
                const pct=Math.round(b.val/data.total*100);
                return (
                  <div key={i} style={{ marginBottom:'7px' }}>
                    <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'2px' }}>
                      <span style={{ fontSize:'11px',fontWeight:'600',color:theme.text }}>{b.label}</span>
                      <span style={{ fontSize:'11px',fontWeight:'800',color:b.color }}>{b.val}/{data.total} ({pct}%)</span>
                    </div>
                    <div style={{ height:'18px',background:'#f1f5f9',borderRadius:'4px',overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`,height:'100%',background:b.color,borderRadius:'4px',transition:'width 0.5s',minWidth:b.val>0?'3px':'0' }}/>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={card}>
              <div style={{ fontSize:'13px',fontWeight:'700',color:theme.text,marginBottom:'12px' }}>🎯 Career Goal Distribution</div>
              {data.careers.length===0
                ? <div style={{ color:theme.subtext,textAlign:'center',padding:'20px',fontSize:'12px' }}>No career goal data yet</div>
                : <BarChart data={data.careers} valueKey="cnt" labelKey="career_goal" color="#3b82f6"/>}
            </div>
          </div>

          {/* Row 2: Scores */}
          {data.scores.length > 0 && (
            <div style={{ ...card,marginBottom:'14px' }}>
              <div style={{ fontSize:'13px',fontWeight:'700',color:theme.text,marginBottom:'12px' }}>📈 Average Assessment Scores Per Session</div>
              <div style={{ display:'flex',flexDirection:'column',gap:'14px' }}>
                {data.scores.map(s=>(
                  <div key={s.interaction_no}>
                    <div style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,marginBottom:'6px' }}>
                      Session {s.interaction_no} — {s.count} students scored
                    </div>
                    <div style={{ display:'flex',gap:'12px' }}>
                      <ScoreCircle val={s.resume}   label="Resume"/>
                      <ScoreCircle val={s.comm}     label="Comm"/>
                      <ScoreCircle val={s.grooming} label="Grm"/>
                      <ScoreCircle val={s.attitude} label="Att"/>
                      <ScoreCircle val={s.technical}label="Tech"/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Row 3: CGPA + Backlogs + Certifications + Internships */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',marginBottom:'14px' }}>
            <div style={card}>
              <div style={{ fontSize:'12px',fontWeight:'700',color:theme.text,marginBottom:'10px' }}>🎓 CGPA Bands</div>
              <BarChart data={data.cgpa_dist} valueKey="cnt" labelKey="band" color="#8b5cf6"/>
            </div>
            <div style={card}>
              <div style={{ fontSize:'12px',fontWeight:'700',color:theme.text,marginBottom:'10px' }}>⚠️ Backlog Status</div>
              {data.backlog_dist.length>0
                ? <DonutSlices slices={data.backlog_dist.map(d=>({label:d.band,val:parseInt(d.cnt)||0}))}/>
                : <div style={{ color:theme.subtext,fontSize:'12px',textAlign:'center',padding:'20px' }}>No data</div>}
            </div>
            <div style={card}>
              <div style={{ fontSize:'12px',fontWeight:'700',color:theme.text,marginBottom:'10px' }}>📜 Certifications</div>
              {data.cert_dist.length>0
                ? <DonutSlices slices={data.cert_dist.map(d=>({label:d.status,val:parseInt(d.cnt)||0}))}/>
                : <div style={{ color:theme.subtext,fontSize:'12px',textAlign:'center',padding:'20px' }}>No data</div>}
            </div>
            <div style={card}>
              <div style={{ fontSize:'12px',fontWeight:'700',color:theme.text,marginBottom:'10px' }}>💼 Internship Status</div>
              {data.intro_dist.length>0
                ? <DonutSlices slices={data.intro_dist.map(d=>({label:d.status,val:parseInt(d.cnt)||0}))}/>
                : <div style={{ color:theme.subtext,fontSize:'12px',textAlign:'center',padding:'20px' }}>No data</div>}
            </div>
          </div>

          {/* Row 4: Top students */}
          {data.top_students.length > 0 && (
            <div style={card}>
              <div style={{ fontSize:'13px',fontWeight:'700',color:theme.text,marginBottom:'12px' }}>🏆 Top Students by Score</div>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'12px' }}>
                <thead>
                  <tr style={{ background:theme.bg }}>
                    {['#','Name','Roll No','Program','Mentor','Career Goal','Avg Score','Sessions'].map(h=>(
                      <th key={h} style={{ padding:'8px 10px',textAlign:'left',color:theme.subtext,fontWeight:'700',fontSize:'11px',textTransform:'uppercase',borderBottom:`1px solid ${theme.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.top_students.map((s,i)=>(
                    <tr key={i} style={{ borderBottom:`1px solid ${theme.border}`,background:i%2===0?theme.card:theme.bg }}>
                      <td style={{ padding:'8px 10px',fontWeight:'800',color:i<3?'#f59e0b':theme.subtext }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td>
                      <td style={{ padding:'8px 10px',fontWeight:'600',color:theme.text }}>{s.name}</td>
                      <td style={{ padding:'8px 10px',color:theme.subtext,fontSize:'11px' }}>{s.roll_no}</td>
                      <td style={{ padding:'8px 10px',color:theme.subtext,fontSize:'11px' }}>{s.program}</td>
                      <td style={{ padding:'8px 10px',color:theme.subtext,fontSize:'11px' }}>{s.mentor_name}</td>
                      <td style={{ padding:'8px 10px',color:theme.subtext,fontSize:'11px',maxWidth:'110px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{s.career_goal||'—'}</td>
                      <td style={{ padding:'8px 10px' }}><span style={{ background:'#d1fae5',color:'#065f46',padding:'2px 8px',borderRadius:'10px',fontWeight:'800',fontSize:'12px' }}>{s.avg_score}/5</span></td>
                      <td style={{ padding:'8px 10px',fontWeight:'600',color:theme.text }}>{s.sessions_done}/5</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}


export default function CMPPage() {
  const { theme } = useOutletContext();
  const user      = getUser();
  const isAdmin   = user?.role === 'super_admin';

  // Main view: 'home' | 'mentees' | 'student:ID' | 'group' | 'referrals' | 'compliance'
  const [view,       setView]       = useState('home');
  const [mentees,    setMentees]    = useState([]);
  const [links,      setLinks]      = useState([]);
  const [trainers,   setTrainers]   = useState([]);
  const [stats,      setStats]      = useState(null);
  const [groupData,  setGroupData]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [showSync,    setShowSync]    = useState(false);
  const [gSyncing,    setGSyncing]    = useState(false);
  const [syncStatus,  setSyncStatus]  = useState(null);
  const [showStatus,  setShowStatus]  = useState(false);

  // Load sync status
  useEffect(() => {
    api('/cmp/sync-status').then(setSyncStatus).catch(()=>{});
  }, []);

  const syncFromGSheet = async () => {
    setGSyncing(true);
    try {
      const data = await api('/cmp/sync-gsheet', { method:'POST' });
      setSyncStatus(prev => ({ ...prev, last_sync: data.last_sync || new Date().toISOString(), stats: data }));
      alert(`✅ Sync complete!\n🆕 ${data.mentees_new} new students\n🔄 ${data.mentees_updated} updated\n📝 ${data.interactions_new} interactions`);
      loadAll();
    } catch(e) { alert('❌ Sync failed: ' + e.message); }
    finally { setGSyncing(false); }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [m, l, t, s, g] = await Promise.all([
        api('/cmp/mentees'),
        api('/cmp/links'),
        api('/cmp/trainers'),
        api('/cmp/my-stats'),
        api('/cmp/group-meeting'),
      ]);
      setMentees(m); setLinks(l); setTrainers(t); setStats(s); setGroupData(g);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ loadAll(); },[]);

  const card = { background:theme.card,borderRadius:'14px',border:`1px solid ${theme.border}`,boxShadow:'0 1px 4px rgba(0,0,0,0.06)' };

  // ── Student profile view ──
  if (view.startsWith('student:')) {
    const menteeId = parseInt(view.split(':')[1]);
    return (
      <div>
        <StudentProfile menteeId={menteeId} trainers={trainers} theme={theme}
          onBack={()=>setView('mentees')}/>
      </div>
    );
  }

  // ── My Mentees view ──
  if (view === 'mentees') {
    const filtered = mentees.filter(m =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.roll_no.toLowerCase().includes(search.toLowerCase())
    );
    return (
      <div>
        <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px' }}>
          <button onClick={()=>setView('home')} style={{ padding:'8px 14px',borderRadius:'9px',border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,cursor:'pointer',fontSize:'13px',fontWeight:'600' }}>← Back</button>
          <h1 style={{ margin:0,fontSize:'22px',fontWeight:'700',color:theme.text }}>👥 My Mentees ({mentees.length})</h1>
        </div>
        <div style={{ ...card,padding:'10px 14px',marginBottom:'14px' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`🔍 Search by name or roll number...`}
            style={{ width:'100%',border:'none',outline:'none',background:'transparent',fontSize:'13px',color:theme.text }}/>
        </div>
        <div style={{ ...card,overflow:'hidden' }}>
          {loading ? <div style={{ padding:'40px',textAlign:'center',color:theme.subtext }}>Loading...</div>
          : filtered.length === 0 ? (
            <div style={{ padding:'40px',textAlign:'center',color:theme.subtext }}>
              <div style={{ fontSize:'32px',marginBottom:'8px' }}>👥</div>
              <div>{mentees.length===0?'No students found. Upload your sheet first.':'No results.'}</div>
            </div>
          ) : (
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'13px' }}>
              <thead>
                <tr style={{ background:theme.bg }}>
                  {['Student','Phone','Program','CGPA','Career Goal','Group','Progress','Action'].map(h=>(
                    <th key={h} style={{ padding:'10px 12px',textAlign:'left',color:theme.subtext,fontWeight:'700',fontSize:'11px',textTransform:'uppercase',borderBottom:`1px solid ${theme.border}`,whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m,i)=>(
                  <tr key={m.id} style={{ background:i%2===0?theme.card:theme.bg,borderBottom:`1px solid ${theme.border}`,cursor:'pointer' }}
                    onMouseEnter={e=>e.currentTarget.style.background=theme.accent+'0a'}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?theme.card:theme.bg}>
                    <td style={{ padding:'10px 12px' }} onClick={()=>setView(`student:${m.id}`)}>
                      <div style={{ display:'flex',alignItems:'center',gap:'8px' }}>
                        <Avatar name={m.name} size={30}/>
                        <div style={{ fontWeight:'600',color:theme.text,fontSize:'12px' }}>{m.name}</div>
                      </div>
                    </td>
                    <td style={{ padding:'10px 12px' }}>
                      {m.phone ? (
                        <div>
                          <div style={{ fontSize:'11px',fontWeight:'600',color:theme.text,marginBottom:'4px',fontFamily:'monospace' }}>{m.phone}</div>
                          <div style={{ display:'flex',gap:'4px' }}>
                            <a href={`https://wa.me/91${m.phone}`} target="_blank" rel="noopener noreferrer"
                              style={{ padding:'3px 8px',borderRadius:'5px',background:'#d1fae5',color:'#065f46',textDecoration:'none',fontSize:'11px',fontWeight:'700',display:'flex',alignItems:'center',gap:'3px' }}
                              onClick={e=>e.stopPropagation()}>💬 WA</a>
                            <a href={`tel:${m.phone}`}
                              style={{ padding:'3px 8px',borderRadius:'5px',background:'#dbeafe',color:'#1e40af',textDecoration:'none',fontSize:'11px',fontWeight:'700',display:'flex',alignItems:'center',gap:'3px' }}
                              onClick={e=>e.stopPropagation()}>📞 Call</a>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize:'10px',color:'#94a3b8',fontStyle:'italic',marginBottom:'2px' }}>Not in system</div>
                          <div style={{ fontSize:'10px',color:theme.subtext }}>{m.roll_no}</div>
                        </div>
                      )}
                    </td>
                    <td style={{ padding:'10px 12px',color:theme.subtext,fontSize:'11px' }}>{m.program}<br/>{m.university}</td>
                    <td style={{ padding:'10px 12px',fontWeight:'700',color:theme.text }}>{m.cgpa||'—'}</td>
                    <td style={{ padding:'10px 12px',fontSize:'11px',color:theme.subtext,maxWidth:'120px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{m.career_goal||'—'}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <span style={{ background:m.grp_attended?'#d1fae5':'#fee2e2',color:m.grp_attended?'#065f46':'#991b1b',padding:'2px 7px',borderRadius:'10px',fontSize:'10px',fontWeight:'700' }}>
                        {m.grp_attended?'✅':'❌'}
                      </span>
                    </td>
                    <td style={{ padding:'10px 12px' }}>
                      <InteractionDots last={m.last_interaction}/>
                    </td>
                    <td style={{ padding:'10px 12px' }}>
                      <button onClick={()=>setView(`student:${m.id}`)}
                        style={{ padding:'5px 12px',borderRadius:'7px',border:'none',background:theme.accent,color:'#fff',cursor:'pointer',fontSize:'11px',fontWeight:'600' }}>
                        Open →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ── Group meeting view ──
  if (view === 'group') {
    return (
      <div>
        <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px' }}>
          <button onClick={()=>setView('home')} style={{ padding:'8px 14px',borderRadius:'9px',border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,cursor:'pointer',fontSize:'13px',fontWeight:'600' }}>← Back</button>
          <h1 style={{ margin:0,fontSize:'22px',fontWeight:'700',color:theme.text }}>👥 Group Meeting</h1>
        </div>
        {groupData?.meeting ? (
          <div>
            <div style={{ ...card,padding:'16px',marginBottom:'16px' }}>
              <div style={{ display:'flex',gap:'16px',flexWrap:'wrap' }}>
                <div><div style={{ fontSize:'11px',color:theme.subtext,textTransform:'uppercase',fontWeight:'700' }}>Date</div>
                  <div style={{ fontSize:'14px',fontWeight:'600',color:theme.text }}>{new Date(groupData.meeting.held_date).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</div></div>
                <div><div style={{ fontSize:'11px',color:theme.subtext,textTransform:'uppercase',fontWeight:'700' }}>Present</div>
                  <div style={{ fontSize:'14px',fontWeight:'600',color:'#10b981' }}>{groupData.attendance.filter(a=>a.attended).length}/{groupData.attendance.length}</div></div>
                {groupData.meeting.notes && <div><div style={{ fontSize:'11px',color:theme.subtext,textTransform:'uppercase',fontWeight:'700' }}>Notes</div>
                  <div style={{ fontSize:'13px',color:theme.text }}>{groupData.meeting.notes}</div></div>}
              </div>
            </div>
            <div style={{ ...card,overflow:'hidden' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'13px' }}>
                <thead><tr style={{ background:theme.bg }}>
                  {['Student','Roll No','Program','Attendance','Observation'].map(h=>(
                    <th key={h} style={{ padding:'10px 12px',textAlign:'left',color:theme.subtext,fontWeight:'700',fontSize:'11px',textTransform:'uppercase',borderBottom:`1px solid ${theme.border}` }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {groupData.attendance.map((a,i)=>(
                    <AttendanceRow key={a.mentee_id} a={a} theme={theme} i={i} onToggle={loadAll}/>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop:'12px' }}>
              <button onClick={()=>document.getElementById('grpModal').click()}
                style={{ padding:'9px 16px',borderRadius:'9px',border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,cursor:'pointer',fontSize:'13px' }}>
                ✏️ Edit Group Meeting
              </button>
            </div>
          </div>
        ) : (
          <div style={{ ...card,padding:'40px',textAlign:'center' }}>
            <div style={{ fontSize:'40px',marginBottom:'12px' }}>👥</div>
            <div style={{ fontSize:'15px',fontWeight:'600',color:theme.text,marginBottom:'8px' }}>Group meeting not logged yet</div>
            <div style={{ fontSize:'13px',color:theme.subtext,marginBottom:'16px' }}>Log the group meeting to mark attendance for all students</div>
          </div>
        )}
        <div id="grpModal" style={{ display:'none' }}/>
        <div style={{ marginTop:'12px' }}>
          <button onClick={()=>{ /* trigger group meeting modal */ document.dispatchEvent(new CustomEvent('openGroupModal')); }}
            style={{ padding:'10px 20px',borderRadius:'9px',border:'none',background:theme.accent,color:'#fff',cursor:'pointer',fontSize:'13px',fontWeight:'600' }}
            id="openGroupBtn">
            {groupData?.meeting ? '✏️ Edit Meeting' : '➕ Log Group Meeting'}
          </button>
        </div>
        {/* Group meeting modal triggered from button */}
        <GroupMeetingModalWrapper mentees={mentees} groupData={groupData} theme={theme} onDone={loadAll}/>
      </div>
    );
  }

  // ── Compliance view ──
  if (view === 'analytics' && isAdmin) {
    return (
      <div>
        <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px' }}>
          <button onClick={()=>setView('home')} style={{ padding:'8px 14px',borderRadius:'9px',border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,cursor:'pointer',fontSize:'13px',fontWeight:'600' }}>← Back</button>
          <h1 style={{ margin:0,fontSize:'22px',fontWeight:'700',color:theme.text }}>📈 Analytics & Insights</h1>
        </div>
        <AnalyticsView trainers={trainers} theme={theme}/>
      </div>
    );
  }

  if (view === 'compliance' && isAdmin) {
    return (
      <div>
        <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px' }}>
          <button onClick={()=>setView('home')} style={{ padding:'8px 14px',borderRadius:'9px',border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,cursor:'pointer',fontSize:'13px',fontWeight:'600' }}>← Back</button>
        </div>
        <ComplianceView theme={theme}/>
      </div>
    );
  }

  // ── Referrals view ──
  if (view === 'referrals') {
    return (
      <div>
        <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px' }}>
          <button onClick={()=>setView('home')} style={{ padding:'8px 14px',borderRadius:'9px',border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,cursor:'pointer',fontSize:'13px',fontWeight:'600' }}>← Back</button>
        </div>
        <ReferralsInbox theme={theme}/>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // HOME VIEW
  // ══════════════════════════════════════════════════════════════
  const statCards = stats ? [
    { label:'Total Mentees',   value: stats.total_mentees,  color:'#3b82f6', icon:'👥' },
    { label:'Group Present',   value: `${stats.grp_present}/${stats.total_mentees}`, color:'#06b6d4', icon:'👋', sub: stats.grp_date ? `${new Date(stats.grp_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}` : 'Not logged' },
    { label:'1-on-1 Done',     value: `${stats.i1}/${stats.total_mentees}`,  color:'#10b981', icon:'✅' },
    { label:'Session 2',       value: `${stats.i2}/${stats.total_mentees}`,  color:'#8b5cf6', icon:'📈' },
    { label:'Session 3+',      value: `${stats.i3}/${stats.total_mentees}`,  color:'#f59e0b', icon:'🚀' },
    { label:'Refs In/Out',     value: `${stats.referrals_received}↓ ${stats.referrals_given}↑`, color:'#ec4899', icon:'🔀' },
  ] : [];

  const navBtns = [
    { id:'mentees',    icon:'👥', label:'My Mentees',     sub:`${mentees.length} students`, color:'#3b82f6', show: true },
    { id:'group',      icon:'🤝', label:'Group Meeting',   sub: groupData?.meeting ? `✅ ${groupData.attendance.filter(a=>a.attended).length} present` : '❌ Not logged', color:'#06b6d4', show: true },
    { id:'referrals',  icon:'🔀', label:'Referrals Inbox', sub:'Students referred to you', color:'#8b5cf6', show: true },
    { id:'compliance', icon:'📊', label:'Compliance',      sub:'All mentors status',    color:'#1e3a5f', show: isAdmin },
    { id:'analytics',  icon:'📈', label:'Analytics',       sub:'Graphs & insights',     color:'#7c3aed', show: isAdmin },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'18px',flexWrap:'wrap',gap:'10px' }}>
        <div>
          <h1 style={{ margin:0,fontSize:'24px',fontWeight:'700',color:theme.text }}>🎓 CMP 2026</h1>
          <p style={{ margin:'4px 0 0',fontSize:'13px',color:theme.subtext }}>CDC Mentorship Program 2026 — Manav Rachna</p>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
          {/* Last sync status */}
          {syncStatus?.last_sync && (
            <span style={{ fontSize:'11px', color:theme.subtext, background:theme.bg, padding:'4px 10px', borderRadius:'20px', border:`1px solid ${theme.border}` }}>
              🔄 Last sync: {new Date(syncStatus.last_sync).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
            </span>
          )}
          {/* Auto-sync from Google Sheets */}
          {isAdmin && (
            <button onClick={syncFromGSheet} disabled={gSyncing}
              style={{ padding:'9px 16px', borderRadius:'9px', border:'none',
                background: gSyncing ? '#9ca3af' : '#1d4ed8',
                color:'#fff', cursor: gSyncing ? 'not-allowed' : 'pointer',
                fontSize:'13px', fontWeight:'600', display:'flex', alignItems:'center', gap:'6px' }}>
              {gSyncing ? '🔄 Syncing...' : '☁️ Sync from Google Sheet'}
            </button>
          )}
          <button onClick={()=>setShowSync(true)} style={{ padding:'9px 16px',borderRadius:'9px',border:'none',background:'#059669',color:'#fff',cursor:'pointer',fontSize:'13px',fontWeight:'600' }}>
            📤 Upload Excel
          </button>
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ display:'flex',gap:'8px',marginBottom:'18px',flexWrap:'wrap' }}>
        {links.map(l=>(
          <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
            style={{ display:'flex',alignItems:'center',gap:'6px',padding:'8px 14px',borderRadius:'9px',background:theme.card,border:`1px solid ${theme.border}`,textDecoration:'none',color:theme.text,fontSize:'12px',fontWeight:'600',boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize:'15px' }}>{l.icon}</span>{l.label}
          </a>
        ))}
      </div>

      {/* Stats strip */}
      {stats && (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'10px',marginBottom:'20px' }}>
          {statCards.map(s=>(
            <div key={s.label} style={{ ...card,padding:'12px 14px',borderLeft:`4px solid ${s.color}` }}>
              <div style={{ fontSize:'20px',fontWeight:'800',color:s.color }}>{s.value}</div>
              <div style={{ fontSize:'11px',color:theme.text,fontWeight:'600',marginTop:'2px' }}>{s.icon} {s.label}</div>
              {s.sub && <div style={{ fontSize:'10px',color:theme.subtext,marginTop:'1px' }}>{s.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Main navigation buttons */}
      <div style={{ display:'grid',gridTemplateColumns:isAdmin?'repeat(3,1fr)':'repeat(2,1fr)',gap:'14px',marginBottom:'20px' }}>
        {navBtns.filter(b=>b.show).map(b=>(
          <button key={b.id} onClick={()=>setView(b.id)} style={{
            ...card, padding:'22px 20px', cursor:'pointer', border:`1px solid ${theme.border}`,
            display:'flex', alignItems:'center', gap:'14px', textAlign:'left',
            transition:'all 0.15s', background:theme.card,
          }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor=b.color; e.currentTarget.style.transform='translateY(-2px)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor=theme.border; e.currentTarget.style.transform='translateY(0)'; }}>
            <div style={{ width:'48px',height:'48px',borderRadius:'12px',background:b.color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px',flexShrink:0 }}>
              {b.icon}
            </div>
            <div>
              <div style={{ fontSize:'15px',fontWeight:'700',color:theme.text }}>{b.label}</div>
              <div style={{ fontSize:'12px',color:theme.subtext,marginTop:'2px' }}>{b.sub}</div>
            </div>
            <div style={{ marginLeft:'auto',fontSize:'18px',color:theme.subtext }}>→</div>
          </button>
        ))}
      </div>

      {/* Recent mentees quick access */}
      {mentees.length > 0 && (
        <div style={{ ...card,padding:'16px' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px' }}>
            <div style={{ fontSize:'13px',fontWeight:'700',color:theme.text }}>Recent Mentees</div>
            <button onClick={()=>setView('mentees')} style={{ fontSize:'12px',color:theme.accent,background:'none',border:'none',cursor:'pointer',fontWeight:'600' }}>View all →</button>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px' }}>
            {mentees.slice(0,6).map(m=>(
              <button key={m.id} onClick={()=>setView(`student:${m.id}`)} style={{
                display:'flex',alignItems:'center',gap:'8px',padding:'9px 11px',borderRadius:'9px',
                border:`1px solid ${theme.border}`,background:theme.bg,cursor:'pointer',textAlign:'left',
              }}>
                <Avatar name={m.name} size={28}/>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:'12px',fontWeight:'600',color:theme.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{m.name}</div>
                  <InteractionDots last={m.last_interaction}/>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sync modal */}
      {showSync && <SyncModal isAdmin={isAdmin} theme={theme} onClose={()=>setShowSync(false)} onDone={loadAll}/>}
    </div>
  );
}

// Helper wrapper for group meeting in group view
function GroupMeetingModalWrapper({ mentees, groupData, theme, onDone }) {
  const [open, setOpen] = useState(false);
  useEffect(()=>{
    const h = () => setOpen(true);
    document.addEventListener('openGroupModal', h);
    return () => document.removeEventListener('openGroupModal', h);
  },[]);
  if (!open) return null;
  return <GroupMeetingModal mentees={mentees} existing={groupData} theme={theme}
    onClose={()=>setOpen(false)} onDone={()=>{ setOpen(false); onDone(); }}/>;
}
