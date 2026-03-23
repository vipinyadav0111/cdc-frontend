import { useState, useEffect } from 'react';
import { api, getUser } from '../api';
import { useOutletContext } from 'react-router-dom';

const SLOTS = [
  {n:1,t:'9:00–9:50'},{n:2,t:'9:50–10:40'},{n:3,t:'10:40–11:30'},{n:4,t:'11:30–12:20'},
  {n:5,t:'12:20–1:10'},{n:6,t:'1:10–2:00'},{n:7,t:'2:00–2:50'},{n:8,t:'2:50–3:40'},{n:9,t:'3:40–4:30'},
];
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const TYPE_COLORS = {
  adjustment:{bg:'#dbeafe',border:'#3b82f6',text:'#1d4ed8',label:'🔄 Adjustment'},
  duty:{bg:'#fef3c7',border:'#f59e0b',text:'#92400e',label:'📋 Duty'},
  extra_class:{bg:'#d1fae5',border:'#10b981',text:'#065f46',label:'➕ Extra Class'},
  cancellation:{bg:'#fee2e2',border:'#ef4444',text:'#991b1b',label:'❌ Cancellation'},
};
const instBg   = (inst) => { if(!inst) return '#f1f5f9'; if(inst.includes('MRU')) return '#dbeafe'; if(inst.includes('MRIIRS')) return '#ede9fe'; return '#d1fae5'; };
const instBord = (inst) => { if(!inst) return '#cbd5e1'; if(inst.includes('MRU')) return '#3b82f6'; if(inst.includes('MRIIRS')) return '#8b5cf6'; return '#10b981'; };

const EMPTY_FORM = { trainer_id:'', date:new Date().toISOString().split('T')[0], slot_number:'1', type:'adjustment', class_name:'', room:'', topic:'', instructions:'', note:'' };

// Get day name from date string
function getDayFromDate(dateStr) {
  if(!dateStr) return null;
  const d = new Date(dateStr);
  return DAYS[d.getDay()-1] || null;
}

export default function DutiesPage() {
  const { theme } = useOutletContext();
  const user = getUser();
  const isAdmin = user?.role === 'super_admin';
  const [duties, setDuties] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [allTimetable, setAllTimetable] = useState([]);
  const [allDuties, setAllDuties] = useState([]);
  const [freeTrainers, setFreeTrainers] = useState([]);
  const [busyTrainers, setBusyTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  // Timetable preview state
  const [previewTrainer, setPreviewTrainer] = useState(null); // trainer object being previewed
  const [myTimetableDay, setMyTimetableDay] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [d, u, tt] = await Promise.all([
        api('/duties'),
        api('/users'),
        api('/timetable'),
      ]);
      setDuties(d);
      setAllDuties(d);
      setTrainers(u.filter(u => u.role !== 'viewer'));
      setAllTimetable(tt);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const checkFree = async () => {
    if(!form.date || !form.slot_number) return;
    try {
      const data = await api(`/duties/free-trainers?date=${form.date}&slot=${form.slot_number}`);
      setFreeTrainers(data.free || []);
      setBusyTrainers(data.busy || []);
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    if(showForm) {
      checkFree();
      setPreviewTrainer(null);
      // Set my timetable day based on selected date
      const day = getDayFromDate(form.date);
      setMyTimetableDay(day);
    }
  }, [form.date, form.slot_number, showForm]);

  // Get timetable for a specific trainer on a specific day
  const getTrainerDaySlots = (trainerId, dayName) => {
    if(!trainerId || !dayName) return [];
    return allTimetable.filter(t => t.trainer_id === trainerId && t.day === dayName);
  };

  // Get duties for a specific trainer on a specific date
  const getTrainerDayDuties = (trainerId, dateStr) => {
    if(!trainerId || !dateStr) return [];
    return allDuties.filter(d =>
      String(d.trainer_id) === String(trainerId) &&
      new Date(d.date).toDateString() === new Date(dateStr).toDateString()
    );
  };

  // Render a mini day timetable for a trainer
  const MiniTimetable = ({ trainerId, trainerName, dateStr, highlightSlot }) => {
    const dayName = getDayFromDate(dateStr);
    if(!dayName) return null;
    const ttSlots = getTrainerDaySlots(trainerId, dayName);
    const dutySlots = getTrainerDayDuties(trainerId, dateStr);
    const totalClasses = ttSlots.length + dutySlots.length;
    const selectedSlotNum = parseInt(highlightSlot);

    return (
      <div style={{
        background: theme.bg, borderRadius:'10px', border:`1px solid ${theme.border}`,
        overflow:'hidden', marginTop:'8px'
      }}>
        {/* Header */}
        <div style={{
          padding:'8px 12px', background: theme.accent,
          display:'flex', justifyContent:'space-between', alignItems:'center'
        }}>
          <div style={{ color:'#fff', fontSize:'12px', fontWeight:'700' }}>
            📅 {trainerName} — {dayName} ({dateStr})
          </div>
          <div style={{
            background:'rgba(255,255,255,0.25)', color:'#fff',
            padding:'2px 8px', borderRadius:'10px', fontSize:'11px', fontWeight:'600'
          }}>
            {totalClasses} class{totalClasses!==1?'es':''} today
          </div>
        </div>

        {/* Slots grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(9,1fr)', gap:'4px', padding:'10px' }}>
          {SLOTS.map(s => {
            const ttCell = ttSlots.find(t => t.slot_number === s.n);
            const dutyCell = dutySlots.find(d => d.slot_number === s.n);
            const isHighlight = s.n === selectedSlotNum;
            const isEmpty = !ttCell && !dutyCell;

            return (
              <div key={s.n} style={{
                borderRadius:'6px', padding:'5px 4px', textAlign:'center',
                border: isHighlight ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`,
                background: isHighlight
                  ? theme.accent + '22'
                  : dutyCell
                    ? TYPE_COLORS[dutyCell.type]?.bg || '#fef3c7'
                    : ttCell
                      ? instBg(ttCell.institution)
                      : theme.card,
                minHeight:'52px', display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'flex-start', cursor:'default'
              }}>
                <div style={{
                  fontSize:'9px', fontWeight:'700',
                  color: isHighlight ? theme.accent : theme.subtext,
                  marginBottom:'3px'
                }}>
                  {s.n}
                </div>
                {dutyCell ? (
                  <div style={{ fontSize:'9px', color: TYPE_COLORS[dutyCell.type]?.text || '#92400e', fontWeight:'600', lineHeight:'1.2', wordBreak:'break-word' }}>
                    <div style={{ background: TYPE_COLORS[dutyCell.type]?.border, color:'#fff', borderRadius:'2px', padding:'1px 3px', fontSize:'8px', marginBottom:'1px' }}>
                      {TYPE_COLORS[dutyCell.type]?.label.split(' ')[0]}
                    </div>
                    {(dutyCell.class_name||'').slice(0,10)}
                  </div>
                ) : ttCell ? (
                  <div style={{ fontSize:'9px', color:instBord(ttCell.institution), fontWeight:'600', lineHeight:'1.2', wordBreak:'break-word' }}>
                    {ttCell.class_name?.slice(0,14)}
                    {ttCell.room && <div style={{ fontSize:'8px', color:theme.subtext, marginTop:'1px' }}>{ttCell.room}</div>}
                  </div>
                ) : (
                  <div style={{ fontSize:'9px', color: isHighlight ? theme.accent : '#d1d5db' }}>
                    {isHighlight ? '← here' : 'free'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Slot time legend */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(9,1fr)', gap:'4px', padding:'0 10px 8px' }}>
          {SLOTS.map(s => (
            <div key={s.n} style={{ fontSize:'8px', color:theme.subtext, textAlign:'center', lineHeight:'1.2' }}>
              {s.t.split('–')[0]}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // MY timetable panel
  const MyTimetablePanel = () => {
    if(!myTimetableDay) return null;
    const myId = parseInt(user?.id);
    const mySlots = getTrainerDaySlots(myId, myTimetableDay);
    const myDuties = getTrainerDayDuties(myId, form.date);
    const allAssigned = [...duties].filter(d =>
      new Date(d.date).toDateString() === new Date(form.date).toDateString()
    );

    return (
      <div style={{
        background: theme.bg, borderRadius:'10px',
        border:`2px solid ${theme.accent}`, overflow:'hidden', marginBottom:'16px'
      }}>
        <div style={{ padding:'10px 14px', background: theme.accent + '22', borderBottom:`1px solid ${theme.accent}33` }}>
          <div style={{ fontSize:'13px', fontWeight:'700', color:theme.accent }}>
            👤 My Schedule — {myTimetableDay} · {form.date}
          </div>
          <div style={{ fontSize:'11px', color:theme.subtext, marginTop:'2px' }}>
            {mySlots.length} regular classes · {myDuties.length} duties assigned
          </div>
        </div>

        <div style={{ padding:'10px 12px' }}>
          {/* My slots */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(9,1fr)', gap:'4px', marginBottom:'4px' }}>
            {SLOTS.map(s => {
              const ttCell = mySlots.find(t => t.slot_number === s.n);
              const dutyCell = myDuties.find(d => d.slot_number === s.n);
              const selectedSlotNum = parseInt(form.slot_number);
              const isSelected = s.n === selectedSlotNum;

              return (
                <div key={s.n} style={{
                  borderRadius:'6px', padding:'5px 4px', textAlign:'center',
                  border: isSelected ? `2px solid #f59e0b` : `1px solid ${theme.border}`,
                  background: isSelected ? '#fffbeb'
                    : dutyCell ? TYPE_COLORS[dutyCell.type]?.bg || '#fef3c7'
                    : ttCell ? instBg(ttCell.institution)
                    : theme.card,
                  minHeight:'52px', display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'flex-start'
                }}>
                  <div style={{ fontSize:'9px', fontWeight:'700', color: isSelected ? '#f59e0b' : theme.subtext, marginBottom:'3px' }}>
                    {s.n}
                  </div>
                  {dutyCell ? (
                    <div style={{ fontSize:'9px', color:TYPE_COLORS[dutyCell.type]?.text, fontWeight:'600', lineHeight:'1.2' }}>
                      <div style={{ background:TYPE_COLORS[dutyCell.type]?.border, color:'#fff', borderRadius:'2px', padding:'1px 3px', fontSize:'8px', marginBottom:'1px' }}>ADJ</div>
                      {(dutyCell.class_name||'').slice(0,10)}
                    </div>
                  ) : ttCell ? (
                    <div style={{ fontSize:'9px', color:instBord(ttCell.institution), fontWeight:'600', lineHeight:'1.2', wordBreak:'break-word' }}>
                      {ttCell.class_name?.slice(0,14)}
                      {ttCell.room && <div style={{ fontSize:'8px', color:theme.subtext }}>{ttCell.room}</div>}
                    </div>
                  ) : (
                    <div style={{ fontSize:'9px', color: isSelected ? '#f59e0b' : '#d1d5db' }}>
                      {isSelected ? '◀ assigning' : 'free'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(9,1fr)', gap:'4px' }}>
            {SLOTS.map(s => (
              <div key={s.n} style={{ fontSize:'8px', color:theme.subtext, textAlign:'center' }}>{s.t.split('–')[0]}</div>
            ))}
          </div>

          {/* Duties assigned today by me */}
          {allAssigned.length > 0 && (
            <div style={{ marginTop:'10px', borderTop:`1px solid ${theme.border}`, paddingTop:'8px' }}>
              <div style={{ fontSize:'11px', fontWeight:'600', color:theme.subtext, marginBottom:'6px' }}>Duties assigned for this day:</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                {allAssigned.map((d,i) => {
                  const tc = TYPE_COLORS[d.type] || TYPE_COLORS.duty;
                  return (
                    <div key={i} style={{ background:tc.bg, border:`1px solid ${tc.border}`, borderRadius:'6px', padding:'4px 8px', fontSize:'11px' }}>
                      <span style={{ color:tc.text, fontWeight:'600' }}>{d.trainer_name}</span>
                      <span style={{ color:theme.subtext }}> · Slot {d.slot_number}</span>
                      {d.class_name && <span style={{ color:theme.subtext }}> · {d.class_name}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const openNew = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); setMsg(''); setPreviewTrainer(null); };
  const openEdit = (duty) => {
    setEditingId(duty.id);
    setForm({
      trainer_id: String(duty.trainer_id),
      date: new Date(duty.date).toISOString().split('T')[0],
      slot_number: String(duty.slot_number),
      type: duty.type,
      class_name: duty.class_name||'',
      room: duty.room||'',
      topic: duty.topic||'',
      instructions: duty.instructions||'',
      note: duty.note||'',
    });
    setShowForm(true); setMsg('');
    setPreviewTrainer(trainers.find(t => String(t.id) === String(duty.trainer_id)) || null);
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!form.trainer_id) return setMsg('⚠️ Please select a trainer');
    setSaving(true);
    try {
      if(editingId) {
        await api(`/duties/${editingId}`, { method:'DELETE' });
        await api('/duties', { method:'POST', body:JSON.stringify({...form, slot_number:parseInt(form.slot_number)}) });
        setMsg('✅ Duty updated!');
      } else {
        await api('/duties', { method:'POST', body:JSON.stringify({...form, slot_number:parseInt(form.slot_number)}) });
        setMsg('✅ Duty assigned!');
      }
      setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setPreviewTrainer(null);
      loadData();
    } catch(e) { setMsg('❌ '+e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if(!confirm('Delete?')) return;
    try { await api(`/duties/${id}`, {method:'DELETE'}); loadData(); setMsg('✅ Deleted'); }
    catch(e) { alert(e.message); }
  };

  const cancelForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setMsg(''); setPreviewTrainer(null); };

  const filteredDuties = duties.filter(d => {
    if(filterType !== 'all' && d.type !== filterType) return false;
    if(filterDate && new Date(d.date).toISOString().split('T')[0] !== filterDate) return false;
    return true;
  });

  const inp = { width:'100%', padding:'9px 12px', border:`2px solid ${theme.border}`, borderRadius:'8px', fontSize:'14px', boxSizing:'border-box', outline:'none', background:theme.card, color:theme.text };
  const card = { background:theme.card, borderRadius:'14px', boxShadow:'0 1px 4px rgba(0,0,0,0.07)', border:`1px solid ${theme.border}` };
  const label = { display:'block', fontSize:'12px', fontWeight:'600', color:theme.subtext, marginBottom:'5px' };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <h1 style={{ margin:0, fontSize:'24px', fontWeight:'700', color:theme.text }}>📋 Duties & Adjustments</h1>
        {!showForm && (
          <button onClick={openNew} style={{ padding:'10px 20px', background:theme.accent, color:'white', border:'none', borderRadius:'10px', cursor:'pointer', fontWeight:'600', fontSize:'14px' }}>
            + Assign Duty
          </button>
        )}
      </div>

      {msg && <div style={{ background:msg.startsWith('❌')?'#fee2e2':'#d1fae5', color:msg.startsWith('❌')?'#991b1b':'#065f46', padding:'12px', borderRadius:'8px', marginBottom:'16px', fontWeight:'500' }}>{msg}</div>}

      {/* ── ASSIGNMENT FORM ── */}
      {showForm && (
        <div style={{ ...card, padding:'28px', marginBottom:'24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
            <h2 style={{ margin:0, fontSize:'17px', fontWeight:'700', color:theme.text }}>
              {editingId ? '✏️ Edit Assignment' : '➕ New Assignment'}
            </h2>
            <button onClick={cancelForm} style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:theme.subtext }}>✕</button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Row 1 — Type, Date, Slot, Class */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'14px', marginBottom:'16px' }}>
              <div>
                <label style={label}>Type</label>
                <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={inp}>
                  {Object.entries(TYPE_COLORS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Date</label>
                <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inp} />
              </div>
              <div>
                <label style={label}>Time Slot</label>
                <select value={form.slot_number} onChange={e=>setForm({...form,slot_number:e.target.value})} style={inp}>
                  {SLOTS.map(s=><option key={s.n} value={s.n}>Slot {s.n} · {s.t}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Class / Description</label>
                <input value={form.class_name} onChange={e=>setForm({...form,class_name:e.target.value})} placeholder="e.g. MRU CSE 6A" style={inp} />
              </div>
            </div>

            {/* MY TIMETABLE for this day */}
            <MyTimetablePanel />

            {/* Free / Busy trainer picker with preview */}
            <div style={{ marginBottom:'16px' }}>
              <label style={{ ...label, fontSize:'13px', color:theme.text }}>
                Select Trainer
                {form.trainer_id && trainers.find(t=>String(t.id)===form.trainer_id) && (
                  <span style={{ marginLeft:'8px', background:theme.accent, color:'#fff', padding:'2px 10px', borderRadius:'10px', fontSize:'11px' }}>
                    ✓ {trainers.find(t=>String(t.id)===form.trainer_id)?.name}
                  </span>
                )}
              </label>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom: previewTrainer ? '12px' : '0' }}>
                {/* FREE */}
                <div>
                  <div style={{ fontSize:'12px', color:'#16a34a', fontWeight:'700', marginBottom:'6px' }}>
                    ✅ FREE — {freeTrainers.length} trainers
                  </div>
                  <div style={{ border:`1px solid ${theme.border}`, borderRadius:'8px', overflow:'hidden', maxHeight:'200px', overflowY:'auto' }}>
                    {freeTrainers.length === 0
                      ? <div style={{ padding:'12px', color:theme.subtext, fontSize:'13px' }}>No free trainers this slot</div>
                      : freeTrainers.map(t => (
                        <div key={t.id}
                          onClick={()=>{ setForm({...form,trainer_id:String(t.id)}); setPreviewTrainer(t); }}
                          style={{
                            padding:'10px 12px', cursor:'pointer', fontSize:'13px',
                            background: form.trainer_id===String(t.id) ? '#d1fae5' : theme.card,
                            borderBottom:`1px solid ${theme.border}`,
                            display:'flex', justifyContent:'space-between', alignItems:'center',
                            fontWeight: form.trainer_id===String(t.id) ? '700' : '400',
                            color: theme.text
                          }}>
                          <span>{t.name}</span>
                          <span style={{ fontSize:'11px', color: form.trainer_id===String(t.id) ? '#16a34a' : theme.subtext }}>
                            {form.trainer_id===String(t.id) ? '✓ selected' : 'tap to see →'}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </div>

                {/* BUSY */}
                <div>
                  <div style={{ fontSize:'12px', color:'#dc2626', fontWeight:'700', marginBottom:'6px' }}>
                    🔴 BUSY — {busyTrainers.length} trainers
                  </div>
                  <div style={{ border:`1px solid ${theme.border}`, borderRadius:'8px', overflow:'hidden', maxHeight:'200px', overflowY:'auto', background:theme.bg }}>
                    {busyTrainers.map(t => (
                      <div key={t.id}
                        onClick={()=>{ setForm({...form,trainer_id:String(t.id)}); setPreviewTrainer(t); }}
                        style={{
                          padding:'10px 12px', cursor:'pointer', fontSize:'13px',
                          background: form.trainer_id===String(t.id) ? '#fee2e2' : theme.bg,
                          borderBottom:`1px solid ${theme.border}`,
                          display:'flex', justifyContent:'space-between', alignItems:'center',
                          color:theme.subtext
                        }}>
                        <span style={{ fontWeight:'500' }}>{t.name}</span>
                        <span style={{ fontSize:'11px', color:'#94a3b8' }}>{t.current_class}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── TRAINER TIMETABLE PREVIEW ── */}
              {previewTrainer && (
                <div style={{
                  border:`2px solid ${form.trainer_id===String(previewTrainer.id) ? '#10b981' : theme.border}`,
                  borderRadius:'12px', overflow:'hidden'
                }}>
                  <MiniTimetable
                    trainerId={previewTrainer.id}
                    trainerName={previewTrainer.name}
                    dateStr={form.date}
                    highlightSlot={form.slot_number}
                  />
                </div>
              )}
            </div>

            {/* Row 2 — Details */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'14px', marginBottom:'20px' }}>
              <div>
                <label style={label}>Room</label>
                <input value={form.room} onChange={e=>setForm({...form,room:e.target.value})} placeholder="e.g. HF09" style={inp} />
              </div>
              <div>
                <label style={label}>Topic to Cover</label>
                <input value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})} placeholder="Chapter / topic" style={inp} />
              </div>
              <div>
                <label style={label}>Instructions</label>
                <input value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})} placeholder="Special notes" style={inp} />
              </div>
              <div>
                <label style={label}>Internal Note</label>
                <input value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Admin note" style={inp} />
              </div>
            </div>

            <div style={{ display:'flex', gap:'12px' }}>
              <button type="submit" disabled={saving||!form.trainer_id} style={{
                padding:'12px 32px', background:saving||!form.trainer_id?'#9ca3af':theme.accent,
                color:'white', border:'none', borderRadius:'10px', fontWeight:'700',
                cursor:saving||!form.trainer_id?'not-allowed':'pointer', fontSize:'15px'
              }}>
                {saving ? 'Saving...' : editingId ? '✏️ Update Duty' : '✅ Assign Duty'}
              </button>
              <button type="button" onClick={cancelForm} style={{ padding:'12px 20px', background:theme.bg, color:theme.subtext, border:`1px solid ${theme.border}`, borderRadius:'10px', cursor:'pointer', fontSize:'14px' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── FILTERS ── */}
      <div style={{ display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap', alignItems:'center' }}>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{ ...inp, width:'auto', minWidth:'160px' }}>
          <option value="all">All Types</option>
          {Object.entries(TYPE_COLORS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)} style={{ ...inp, width:'auto' }} />
        {(filterType!=='all'||filterDate) && (
          <button onClick={()=>{setFilterType('all');setFilterDate('');}} style={{ padding:'9px 14px', background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>
            ✕ Clear
          </button>
        )}
        <span style={{ color:theme.subtext, fontSize:'13px' }}>{filteredDuties.length} record{filteredDuties.length!==1?'s':''}</span>
      </div>

      {/* ── DUTIES TABLE ── */}
      <div style={card}>
        {loading ? <p style={{ padding:'24px', color:theme.subtext }}>Loading...</p> :
        filteredDuties.length===0 ? (
          <div style={{ padding:'48px', textAlign:'center', color:theme.subtext }}>
            <div style={{ fontSize:'36px', marginBottom:'8px' }}>📋</div>
            <p style={{ margin:0 }}>No duties found</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:theme.bg }}>
                  {['Type','Trainer','Date','Slot','Class','Room','Topic','Instructions','By',...(isAdmin?['Actions']:[])].map(h=>(
                    <th key={h} style={{ padding:'11px 12px', textAlign:'left', fontSize:'12px', fontWeight:'600', color:theme.subtext, borderBottom:`2px solid ${theme.border}`, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDuties.map((d,i) => {
                  const tc = TYPE_COLORS[d.type] || TYPE_COLORS.duty;
                  const isEditing = editingId===d.id;
                  return (
                    <tr key={d.id} style={{ background: isEditing ? theme.accent+'11' : (i%2===0?theme.card:theme.bg) }}>
                      <td style={{ padding:'10px 12px', borderBottom:`1px solid ${theme.border}`, whiteSpace:'nowrap' }}>
                        <span style={{ background:tc.bg, color:tc.text, border:`1px solid ${tc.border}`, padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600' }}>{tc.label}</span>
                      </td>
                      <td style={{ padding:'10px 12px', fontSize:'13px', fontWeight:'600', color:theme.text, borderBottom:`1px solid ${theme.border}`, whiteSpace:'nowrap' }}>{d.trainer_name}</td>
                      <td style={{ padding:'10px 12px', fontSize:'13px', color:theme.text, borderBottom:`1px solid ${theme.border}`, whiteSpace:'nowrap' }}>
                        {new Date(d.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                        <div style={{ fontSize:'10px', color:theme.subtext }}>{getDayFromDate(new Date(d.date).toISOString().split('T')[0])}</div>
                      </td>
                      <td style={{ padding:'10px 12px', fontSize:'13px', color:theme.text, borderBottom:`1px solid ${theme.border}`, whiteSpace:'nowrap' }}>
                        Slot {d.slot_number}
                        <div style={{ fontSize:'10px', color:theme.subtext }}>{SLOTS.find(s=>s.n===d.slot_number)?.t}</div>
                      </td>
                      <td style={{ padding:'10px 12px', fontSize:'13px', color:theme.text, borderBottom:`1px solid ${theme.border}`, maxWidth:'130px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.class_name||'—'}</td>
                      <td style={{ padding:'10px 12px', fontSize:'13px', color:theme.text, borderBottom:`1px solid ${theme.border}`, whiteSpace:'nowrap' }}>{d.room||'—'}</td>
                      <td style={{ padding:'10px 12px', fontSize:'13px', color:theme.subtext, borderBottom:`1px solid ${theme.border}`, maxWidth:'150px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.topic||'—'}</td>
                      <td style={{ padding:'10px 12px', fontSize:'13px', color:theme.subtext, borderBottom:`1px solid ${theme.border}`, maxWidth:'150px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.instructions||'—'}</td>
                      <td style={{ padding:'10px 12px', fontSize:'13px', color:theme.subtext, borderBottom:`1px solid ${theme.border}`, whiteSpace:'nowrap' }}>{d.assigned_by_name||'—'}</td>
                      {isAdmin && (
                        <td style={{ padding:'10px 12px', borderBottom:`1px solid ${theme.border}`, whiteSpace:'nowrap' }}>
                          <div style={{ display:'flex', gap:'6px' }}>
                            <button onClick={()=>openEdit(d)} style={{ background:isEditing?theme.accent:'#dbeafe', color:isEditing?'#fff':'#1d4ed8', border:'none', borderRadius:'6px', padding:'5px 12px', cursor:'pointer', fontSize:'12px', fontWeight:'600' }}>
                              {isEditing ? '📝 Editing' : '✏️ Edit'}
                            </button>
                            <button onClick={()=>handleDelete(d.id)} style={{ background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:'6px', padding:'5px 12px', cursor:'pointer', fontSize:'12px', fontWeight:'600' }}>
                              🗑️
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
