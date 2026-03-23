import { useState, useEffect } from 'react';
import { api, getUser } from '../api';
import { useOutletContext } from 'react-router-dom';

function timeToMins(t) {
  if(!t) return 0;
  const [h,m] = t.slice(0,5).split(':').map(Number);
  return h*60+m;
}
function minsToDisplay(m) {
  const h = Math.floor(m/60);
  const mins = m%60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h-12 : h === 0 ? 12 : h;
  return `${displayH}:${String(mins).padStart(2,'0')} ${ampm}`;
}
function slotDisplay(start, end) {
  return `${minsToDisplay(timeToMins(start))} – ${minsToDisplay(timeToMins(end))}`;
}

const EMS_URL = 'https://mrei.icloudems.com/';

export default function TodoPage() {
  const { theme } = useOutletContext();
  const user = getUser();
  const isAdmin = user?.role === 'super_admin';

  const [todo, setTodo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [punchIn, setPunchIn] = useState('');
  const [showPunchForm, setShowPunchForm] = useState(false);
  const [savingSlot, setSavingSlot] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [editTask, setEditTask] = useState('');
  const [commentSlot, setCommentSlot] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [replySlot, setReplySlot] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState('today'); // today | history | admin
  const [history, setHistory] = useState([]);
  const [adminOverview, setAdminOverview] = useState(null);
  const [adminDate, setAdminDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewingTrainer, setViewingTrainer] = useState(null);
  const [trainerTodo, setTrainerTodo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  // Get next working day (skip Sunday)
  const getNextWorkingDay = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    if(d.getDay() === 0) d.setDate(d.getDate() + 1); // skip Sunday
    return d.toISOString().split('T')[0];
  };

  useEffect(() => { loadToday(); }, [selectedDate]);
  useEffect(() => { if(activeTab==='history') loadHistory(); }, [activeTab]);
  useEffect(() => { if(activeTab==='admin' && isAdmin) loadAdminOverview(); }, [activeTab, adminDate]);

  const loadToday = async () => {
    setLoading(true);
    setTodo(null);
    try {
      const data = selectedDate === today
        ? await api('/todos/today')
        : await api(`/todos/date/${selectedDate}`);
      if(!data || data.needs_setup) { setShowPunchForm(true); setTodo(null); }
      else { setTodo(data); setShowPunchForm(false); }
    } catch(e) { console.error(e); setShowPunchForm(true); }
    finally { setLoading(false); }
  };

  const initTodo = async () => {
    if(!punchIn) return setMsg('⚠️ Please enter your punch-in time');
    try {
      const data = await api('/todos/init', { method:'POST', body:JSON.stringify({ punch_in_time: punchIn, date: selectedDate }) });
      setTodo(data); setShowPunchForm(false); setMsg('✅ To Do initialized!');
    } catch(e) { setMsg('❌ '+e.message); }
  };

  const saveSlot = async (slotId, task) => {
    setSavingSlot(slotId);
    try {
      await api(`/todos/slots/${slotId}`, { method:'PUT', body:JSON.stringify({ task }) });
      setTodo(t => ({ ...t, slots: t.slots.map(s => s.id===slotId ? {...s, task} : s) }));
      setEditingSlot(null);
    } catch(e) { setMsg('❌ '+e.message); }
    finally { setSavingSlot(null); }
  };

  const submitTodo = async () => {
    setSubmitting(true);
    try {
      await api('/todos/submit', { method:'PUT', body:JSON.stringify({ date: selectedDate }) });
      setMsg('✅ To Do submitted!');
      loadToday();
    } catch(e) { setMsg('❌ '+e.message); }
    finally { setSubmitting(false); }
  };

  const addComment = async (slotId) => {
    if(!commentText.trim()) return;
    try {
      await api(`/todos/slots/${slotId}/comment`, { method:'POST', body:JSON.stringify({ comment: commentText, type:'explanation_request' }) });
      setCommentText(''); setCommentSlot(null); setMsg('✅ Explanation requested! Trainer notified.');
      if(viewingTrainer) loadTrainerTodo(viewingTrainer.id, adminDate);
    } catch(e) { setMsg('❌ '+e.message); }
  };

  const addReply = async (slotId) => {
    if(!replyText.trim()) return;
    try {
      await api(`/todos/slots/${slotId}/reply`, { method:'POST', body:JSON.stringify({ comment: replyText }) });
      setReplyText(''); setReplySlot(null); setMsg('✅ Reply sent!');
      loadToday();
    } catch(e) { setMsg('❌ '+e.message); }
  };

  const loadHistory = async () => {
    try { setHistory(await api('/todos/history')); } catch(e) {}
  };

  const loadAdminOverview = async () => {
    try { setAdminOverview(await api(`/todos/admin/overview?date=${adminDate}`)); } catch(e) {}
  };

  const loadTrainerTodo = async (userId, date) => {
    try { setTrainerTodo(await api(`/todos/date/${date}?user_id=${userId}`)); } catch(e) {}
  };

  const card = { background:theme.card, borderRadius:'14px', border:`1px solid ${theme.border}`, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' };
  const inp = { width:'100%', padding:'9px 12px', border:`2px solid ${theme.border}`, borderRadius:'8px', fontSize:'14px', boxSizing:'border-box', outline:'none', background:theme.card, color:theme.text };

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'24px', fontWeight:'700', color:theme.text }}>✅ To Do</h1>
          <p style={{ margin:'3px 0 0', fontSize:'13px', color:theme.subtext }}>Daily task planner — fill every morning</p>
        </div>
        <a href={EMS_URL} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'#1e3a5f', color:'#fff', borderRadius:'8px', textDecoration:'none', fontSize:'13px', fontWeight:'600' }}>
          🖥️ EMS Portal ↗
        </a>
      </div>

      {msg && <div style={{ background:msg.startsWith('❌')?'#fee2e2':'#d1fae5', color:msg.startsWith('❌')?'#991b1b':'#065f46', padding:'12px', borderRadius:'8px', marginBottom:'16px', fontWeight:'500' }}>{msg}</div>}

      {/* Tabs */}
      <div style={{ display:'flex', gap:'4px', background:theme.bg, padding:'4px', borderRadius:'10px', marginBottom:'20px', width:'fit-content' }}>
        {[['today','📋 Today'],['history','📅 History'],...(isAdmin?[['admin','👁️ Admin View']]:[] )].map(([id,label])=>(
          <button key={id} onClick={()=>setActiveTab(id)} style={{ padding:'8px 18px', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:activeTab===id?'600':'400', background:activeTab===id?theme.card:'transparent', color:activeTab===id?theme.text:theme.subtext, boxShadow:activeTab===id?'0 1px 4px rgba(0,0,0,0.08)':'none' }}>{label}</button>
        ))}
      </div>

      {/* ── TODAY TAB ── */}
      {activeTab==='today' && (
        <div>
          {/* Date selector */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap', alignItems:'center' }}>
        <button onClick={()=>setSelectedDate(today)} style={{ padding:'7px 14px', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600', background:selectedDate===today?theme.accent:theme.bg, color:selectedDate===today?'#fff':theme.subtext }}>
          Today
        </button>
        <button onClick={()=>setSelectedDate(getNextWorkingDay())} style={{ padding:'7px 14px', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600', background:selectedDate===getNextWorkingDay()?theme.accent:theme.bg, color:selectedDate===getNextWorkingDay()?'#fff':theme.subtext }}>
          Tomorrow
        </button>
        <input type="date" value={selectedDate} onChange={e=>{ setSelectedDate(e.target.value); setShowPunchForm(false); }} style={{ ...inp, width:'auto', fontSize:'13px', padding:'7px 12px' }} />
        {selectedDate !== today && (
          <span style={{ background:'#fef3c7', color:'#92400e', padding:'5px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'600' }}>
            📅 Filling for {new Date(selectedDate).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}
          </span>
        )}
      </div>

      {loading ? <p style={{ color:theme.subtext }}>Loading...</p> :

          showPunchForm ? (
            <div style={{ ...card, padding:'32px', maxWidth:'400px' }}>
              <div style={{ fontSize:'36px', marginBottom:'12px', textAlign:'center' }}>⏰</div>
              <h2 style={{ margin:'0 0 8px', fontSize:'18px', fontWeight:'700', color:theme.text, textAlign:'center' }}>Good Morning!</h2>
              <p style={{ margin:'0 0 20px', fontSize:'13px', color:theme.subtext, textAlign:'center' }}>Enter your punch-in time to set up today's To Do</p>
              <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:theme.subtext, marginBottom:'6px' }}>Punch-in Time</label>
              <input type="time" value={punchIn} onChange={e=>setPunchIn(e.target.value)} style={{ ...inp, marginBottom:'16px', fontSize:'16px' }} autoFocus />
              <button onClick={initTodo} disabled={!punchIn} style={{ width:'100%', padding:'13px', background:punchIn?theme.accent:'#9ca3af', color:'#fff', border:'none', borderRadius:'10px', fontWeight:'700', cursor:punchIn?'pointer':'not-allowed', fontSize:'15px' }}>
                Start My To Do →
              </button>
            </div>
          ) : todo ? (
            <div>
              {/* Todo header info */}
              <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px', flexWrap:'wrap' }}>
                <div style={{ background:theme.bg, borderRadius:'8px', padding:'8px 14px', fontSize:'13px', color:theme.subtext }}>
                  ⏰ Punch-in: <strong style={{ color:theme.text }}>{minsToDisplay(timeToMins(todo.punch_in_time))}</strong>
                </div>
                <div style={{ background:theme.bg, borderRadius:'8px', padding:'8px 14px', fontSize:'13px', color:theme.subtext }}>
                  📅 {new Date(selectedDate).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
                </div>
                {todo.submitted_at && <span style={{ background:'#d1fae5', color:'#065f46', padding:'6px 14px', borderRadius:'20px', fontSize:'12px', fontWeight:'600' }}>✅ Submitted {new Date(todo.submitted_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>}
                <button onClick={()=>setShowPunchForm(true)} style={{ background:theme.bg, color:theme.subtext, border:`1px solid ${theme.border}`, borderRadius:'8px', padding:'7px 14px', cursor:'pointer', fontSize:'12px' }}>
                  ✏️ Change Punch-in
                </button>
              </div>

              {/* Slots */}
              <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'20px' }}>
                {(todo.slots||[]).filter(s=>s).map(slot => {
                  const isEditing = editingSlot===slot.id;
                  const hasComments = (slot.comments||[]).length > 0;
                  const hasRequest = (slot.comments||[]).some(c=>c.type==='explanation_request');
                  const hasReply = (slot.comments||[]).some(c=>c.type==='reply');

                  return (
                    <div key={slot.id} style={{
                      ...card, padding:'14px 18px',
                      borderLeft:`4px solid ${slot.is_class ? '#3b82f6' : slot.task ? '#10b981' : '#e2e8f0'}`,
                      background: hasRequest && !hasReply ? '#fffbeb' : theme.card
                    }}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:'12px' }}>
                        <div style={{ flexShrink:0, minWidth:'130px' }}>
                          <div style={{ fontSize:'12px', fontWeight:'700', color:theme.accent }}>{slotDisplay(slot.slot_start, slot.slot_end)}</div>
                          <div style={{ fontSize:'11px', color:theme.subtext, marginTop:'2px' }}>{slot.slot_label}</div>
                        </div>

                        <div style={{ flex:1 }}>
                          {slot.is_class ? (
                            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                              <span style={{ background:'#dbeafe', color:'#1d4ed8', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'600' }}>📚 Class</span>
                              <span style={{ fontSize:'13px', fontWeight:'600', color:theme.text }}>{slot.class_name}</span>
                            </div>
                          ) : isEditing ? (
                            <div style={{ display:'flex', gap:'8px' }}>
                              <input value={editTask} onChange={e=>setEditTask(e.target.value)}
                                placeholder="What will you do in this slot?"
                                style={{ ...inp, fontSize:'13px', padding:'7px 10px' }}
                                autoFocus onKeyDown={e=>{ if(e.key==='Enter') saveSlot(slot.id, editTask); if(e.key==='Escape') setEditingSlot(null); }} />
                              <button onClick={()=>saveSlot(slot.id, editTask)} disabled={savingSlot===slot.id} style={{ padding:'7px 14px', background:theme.accent, color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600', flexShrink:0 }}>
                                {savingSlot===slot.id ? '...' : 'Save'}
                              </button>
                              <button onClick={()=>setEditingSlot(null)} style={{ padding:'7px 10px', background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:'8px', cursor:'pointer', fontSize:'13px', color:theme.subtext }}>✕</button>
                            </div>
                          ) : (
                            <div style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer' }}
                              onClick={()=>{ setEditingSlot(slot.id); setEditTask(slot.task||''); }}>
                              {slot.task ? (
                                <span style={{ fontSize:'13px', color:theme.text }}>{slot.task}</span>
                              ) : (
                                <span style={{ fontSize:'13px', color:theme.subtext, fontStyle:'italic' }}>+ Click to add task...</span>
                              )}
                              <span style={{ fontSize:'11px', color:theme.subtext, opacity:0 }} className="edit-hint">✏️</span>
                            </div>
                          )}

                          {/* Comments / Explanation */}
                          {hasComments && (
                            <div style={{ marginTop:'10px', padding:'10px', background:theme.bg, borderRadius:'8px', border:`1px solid ${theme.border}` }}>
                              {(slot.comments||[]).map((c,i)=>(
                                <div key={i} style={{ marginBottom: i<slot.comments.length-1?'8px':'0' }}>
                                  <div style={{ fontSize:'11px', color:theme.subtext, marginBottom:'2px' }}>
                                    <strong style={{ color: c.type==='explanation_request'?'#dc2626':'#16a34a' }}>
                                      {c.type==='explanation_request'?'❓':'✅'} {c.author_name}
                                    </strong>
                                  </div>
                                  <div style={{ fontSize:'13px', color:theme.text }}>{c.comment}</div>
                                </div>
                              ))}
                              {/* Reply option for trainer */}
                              {!isAdmin && hasRequest && !hasReply && (
                                replySlot===slot.id ? (
                                  <div style={{ display:'flex', gap:'6px', marginTop:'8px' }}>
                                    <input value={replyText} onChange={e=>setReplyText(e.target.value)} placeholder="Type your reply..." style={{ ...inp, fontSize:'12px', padding:'6px 10px' }} autoFocus />
                                    <button onClick={()=>addReply(slot.id)} style={{ padding:'6px 12px', background:'#10b981', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'600' }}>Reply</button>
                                    <button onClick={()=>setReplySlot(null)} style={{ padding:'6px 8px', background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:'6px', cursor:'pointer', fontSize:'12px' }}>✕</button>
                                  </div>
                                ) : (
                                  <button onClick={()=>setReplySlot(slot.id)} style={{ marginTop:'6px', padding:'5px 12px', background:'#d1fae5', color:'#065f46', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'600' }}>
                                    ✅ Reply to Explanation Request
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </div>

                        {/* Admin ask explanation */}
                        {isAdmin && (
                          commentSlot===slot.id ? (
                            <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                              <input value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Ask for explanation..." style={{ ...inp, width:'200px', fontSize:'12px', padding:'6px 10px' }} autoFocus />
                              <button onClick={()=>addComment(slot.id)} style={{ padding:'6px 12px', background:'#dc2626', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'600' }}>Ask</button>
                              <button onClick={()=>setCommentSlot(null)} style={{ padding:'6px 8px', background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:'6px', cursor:'pointer' }}>✕</button>
                            </div>
                          ) : (
                            <button onClick={()=>setCommentSlot(slot.id)} title="Ask for explanation" style={{ flexShrink:0, background:'#fef3c7', color:'#92400e', border:'none', borderRadius:'6px', padding:'5px 10px', cursor:'pointer', fontSize:'12px' }}>
                              ❓
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Submit button */}
              {!todo.submitted_at && (
                <button onClick={submitTodo} disabled={submitting} style={{ padding:'12px 32px', background:submitting?'#9ca3af':theme.accent, color:'#fff', border:'none', borderRadius:'10px', fontWeight:'700', cursor:submitting?'not-allowed':'pointer', fontSize:'15px' }}>
                  {submitting ? 'Submitting...' : '✅ Submit Today\'s To Do'}
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab==='history' && (
        <div>
          <h2 style={{ margin:'0 0 16px', fontSize:'16px', fontWeight:'700', color:theme.text }}>Last 10 Working Days</h2>
          {history.length===0 ? (
            <div style={{ ...card, padding:'48px', textAlign:'center', color:theme.subtext }}>
              <div style={{ fontSize:'36px', marginBottom:'8px' }}>📅</div>
              <p style={{ margin:0 }}>No history yet</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {history.map((h,i)=>(
                <div key={i} style={{ ...card, padding:'14px 20px', display:'flex', alignItems:'center', gap:'16px' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:'600', color:theme.text }}>{new Date(h.date).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'short'})}</div>
                    <div style={{ fontSize:'12px', color:theme.subtext, marginTop:'2px' }}>
                      Punch-in: {minsToDisplay(timeToMins(h.punch_in_time))} · {h.filled_slots}/{h.total_slots} slots filled
                    </div>
                  </div>
                  {h.submitted_at ? (
                    <span style={{ background:'#d1fae5', color:'#065f46', padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'600' }}>✅ Submitted</span>
                  ) : (
                    <span style={{ background:'#fef3c7', color:'#92400e', padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'600' }}>⏳ Pending</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ADMIN TAB ── */}
      {activeTab==='admin' && isAdmin && (
        <div style={{ display:'grid', gridTemplateColumns: viewingTrainer ? '300px 1fr' : '1fr', gap:'20px' }}>
          {/* Left: trainer list */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
              <input type="date" value={adminDate} onChange={e=>{ setAdminDate(e.target.value); setViewingTrainer(null); setTrainerTodo(null); }} style={{ ...inp, width:'auto' }} />
              <span style={{ fontSize:'13px', color:theme.subtext }}>{adminOverview?.trainers?.length||0} trainers</span>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {(adminOverview?.trainers||[]).map(t=>(
                <div key={t.id} onClick={()=>{ setViewingTrainer(t); loadTrainerTodo(t.id, adminDate); }}
                  style={{ ...card, padding:'12px 16px', cursor:'pointer', borderLeft:`4px solid ${t.todo_id ? (t.submitted_at?'#10b981':'#f59e0b') : '#ef4444'}`, background: viewingTrainer?.id===t.id ? theme.accent+'22' : theme.card }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontWeight:'600', fontSize:'13px', color:theme.text }}>{t.name}</div>
                      <div style={{ fontSize:'11px', color:theme.subtext, marginTop:'2px' }}>{t.designation||'Trainer'}</div>
                    </div>
                    {t.todo_id ? (
                      <div style={{ textAlign:'right' }}>
                        <span style={{ background: t.submitted_at?'#d1fae5':'#fef3c7', color:t.submitted_at?'#065f46':'#92400e', padding:'2px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:'600' }}>
                          {t.submitted_at ? '✅ Done' : '⏳ In Progress'}
                        </span>
                        {t.pending_explanations > 0 && <div style={{ fontSize:'10px', color:'#dc2626', marginTop:'2px' }}>❓ {t.pending_explanations} pending</div>}
                      </div>
                    ) : (
                      <span style={{ background:'#fee2e2', color:'#dc2626', padding:'2px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:'600' }}>❌ Not filled</span>
                    )}
                  </div>
                  {t.todo_id && <div style={{ fontSize:'11px', color:theme.subtext, marginTop:'4px' }}>{t.filled_slots}/{t.total_slots} slots · Punch-in {minsToDisplay(timeToMins(t.punch_in_time))}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Right: trainer's todo detail */}
          {viewingTrainer && (
            <div>
              <h2 style={{ margin:'0 0 16px', fontSize:'16px', fontWeight:'700', color:theme.text }}>
                {viewingTrainer.name}'s To Do — {new Date(adminDate).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'short'})}
              </h2>
              {!trainerTodo ? (
                <div style={{ ...card, padding:'48px', textAlign:'center', color:theme.subtext }}>
                  <div style={{ fontSize:'36px', marginBottom:'8px' }}>📭</div>
                  <p style={{ margin:0 }}>No To Do filled for this day</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {(trainerTodo.slots||[]).filter(s=>s).map(slot=>{
                    const hasRequest = (slot.comments||[]).some(c=>c.type==='explanation_request');
                    const hasReply = (slot.comments||[]).some(c=>c.type==='reply');
                    return (
                      <div key={slot.id} style={{ ...card, padding:'14px 18px', borderLeft:`4px solid ${slot.is_class?'#3b82f6':slot.task?'#10b981':'#e2e8f0'}`, background: hasRequest&&!hasReply?'#fffbeb':theme.card }}>
                        <div style={{ display:'flex', alignItems:'flex-start', gap:'12px' }}>
                          <div style={{ flexShrink:0, minWidth:'130px' }}>
                            <div style={{ fontSize:'12px', fontWeight:'700', color:theme.accent }}>{slotDisplay(slot.slot_start, slot.slot_end)}</div>
                            <div style={{ fontSize:'11px', color:theme.subtext }}>{slot.slot_label}</div>
                          </div>
                          <div style={{ flex:1 }}>
                            {slot.is_class ? (
                              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                <span style={{ background:'#dbeafe', color:'#1d4ed8', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'600' }}>📚 Class</span>
                                <span style={{ fontSize:'13px', fontWeight:'600', color:theme.text }}>{slot.class_name}</span>
                              </div>
                            ) : slot.task ? (
                              <span style={{ fontSize:'13px', color:theme.text }}>{slot.task}</span>
                            ) : (
                              <span style={{ fontSize:'13px', color:theme.subtext, fontStyle:'italic' }}>Not filled</span>
                            )}
                            {/* Show existing comments */}
                            {(slot.comments||[]).length > 0 && (
                              <div style={{ marginTop:'8px', padding:'8px', background:theme.bg, borderRadius:'6px' }}>
                                {(slot.comments||[]).map((c,i)=>(
                                  <div key={i} style={{ fontSize:'12px', marginBottom:i<slot.comments.length-1?'6px':'0' }}>
                                    <strong style={{ color:c.type==='explanation_request'?'#dc2626':'#16a34a' }}>{c.type==='explanation_request'?'❓':'✅'} {c.author_name}:</strong> {c.comment}
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Ask explanation */}
                            {commentSlot===slot.id ? (
                              <div style={{ display:'flex', gap:'6px', marginTop:'8px' }}>
                                <input value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Ask for explanation..." style={{ ...inp, fontSize:'12px', padding:'6px 10px' }} autoFocus />
                                <button onClick={()=>addComment(slot.id)} style={{ padding:'6px 12px', background:'#dc2626', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'600' }}>Ask</button>
                                <button onClick={()=>setCommentSlot(null)} style={{ padding:'6px 8px', background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:'6px', cursor:'pointer' }}>✕</button>
                              </div>
                            ) : (
                              <button onClick={()=>setCommentSlot(slot.id)} style={{ marginTop:'6px', padding:'4px 10px', background:'#fef3c7', color:'#92400e', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'11px', fontWeight:'600' }}>
                                ❓ Ask Explanation
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
