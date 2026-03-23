import { useState, useEffect } from 'react';
import { api, getUser } from '../api';
import { useOutletContext } from 'react-router-dom';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const SLOTS = [
  {n:1,t:'9:00–9:50'},{n:2,t:'9:50–10:40'},{n:3,t:'10:40–11:30'},{n:4,t:'11:30–12:20'},
  {n:5,t:'12:20–1:10'},{n:6,t:'1:10–2:00'},{n:7,t:'2:00–2:50'},{n:8,t:'2:50–3:40'},{n:9,t:'3:40–4:30'},
];

const instBg   = (inst) => { if(!inst) return '#f1f5f9'; if(inst.includes('MRU')) return '#dbeafe'; if(inst.includes('MRIIRS')) return '#ede9fe'; if(inst.includes('CDOE')) return '#fef3c7'; return '#d1fae5'; };
const instBord = (inst) => { if(!inst) return '#cbd5e1'; if(inst.includes('MRU')) return '#3b82f6'; if(inst.includes('MRIIRS')) return '#8b5cf6'; if(inst.includes('CDOE')) return '#f59e0b'; return '#10b981'; };

const TYPE_COLORS = {
  adjustment:{bg:'#dbeafe',border:'#3b82f6',label:'ADJ'},
  duty:{bg:'#fef3c7',border:'#f59e0b',label:'DUTY'},
  extra_class:{bg:'#d1fae5',border:'#10b981',label:'EXTRA'},
  cancellation:{bg:'#fee2e2',border:'#ef4444',label:'OFF'},
};

// Get next 14 days as date objects
function getNext14Days() {
  const days = [];
  for(let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function getISTDate() {
  const now = new Date();
  const istOffset = 5 * 60 + 30;
  const utcMins = now.getUTCHours() * 60 + now.getUTCMinutes();
  const nowMins = (utcMins + istOffset) % (24 * 60);
  const utcTotal = now.getUTCDay() * 24 * 60 + now.getUTCHours() * 60 + now.getUTCMinutes();
  const istDayIdx = Math.floor((utcTotal + istOffset) / (24 * 60)) % 7;
  return { nowMins, istDayIdx };
}

export default function TimetablePage() {
  const { theme } = useOutletContext();
  const user = getUser();
  const [trainers, setTrainers] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [duties, setDuties] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const next14 = getNext14Days();

  // Set today as default selected date
  useEffect(() => {
    setSelectedDate(next14[0]);
  }, []);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [tt, us, du] = await Promise.all([api('/timetable'), api('/users'), api('/duties')]);
      setTimetable(tt);
      setTrainers(us);
      setDuties(du);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getCell = (tid, dayName, slot) => timetable.find(t => t.trainer_id===tid && t.day===dayName && t.slot_number===slot);

  const getDuty = (tid, dateStr, slot) => duties.find(d =>
    String(d.trainer_id)===String(tid) &&
    new Date(d.date).toDateString() === new Date(dateStr).toDateString() &&
    d.slot_number===slot
  );

  const { nowMins, istDayIdx } = getISTDate();
  const slotRanges = [[540,590],[590,640],[640,690],[690,740],[740,790],[790,840],[840,890],[890,940],[940,990]];
  const currentSlot = slotRanges.findIndex(([s,e]) => nowMins>=s && nowMins<=e)+1;

  const displayTrainers = selectedTrainer==='all' ? trainers : trainers.filter(t=>String(t.id)===selectedTrainer);

  const selectedDayName = selectedDate ? DAYS[selectedDate.getDay()-1] || '' : '';
  const todayStr = next14[0]?.toDateString();
  const isToday = selectedDate?.toDateString() === todayStr;

  const formatDate = (d) => {
    if(!d) return '';
    return d.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
  };

  const selectedDateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : '';

  return (
    <div>
      <h1 style={{ margin:'0 0 20px', fontSize:'24px', fontWeight:'700', color:theme.text }}>📅 Timetable</h1>

      {/* Controls */}
      <div style={{ display:'flex', gap:'12px', marginBottom:'16px', flexWrap:'wrap', alignItems:'center' }}>
        <select value={selectedTrainer} onChange={e=>setSelectedTrainer(e.target.value)} style={{
          padding:'9px 14px', border:`2px solid ${theme.border}`, borderRadius:'10px',
          fontSize:'14px', outline:'none', background:theme.card, color:theme.text, minWidth:'200px'
        }}>
          <option value="all">All Trainers</option>
          {trainers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* 14-day date strip */}
      <div style={{ display:'flex', gap:'6px', marginBottom:'16px', overflowX:'auto', paddingBottom:'6px' }}>
        {next14.map((d, i) => {
          const dayName = DAYS[d.getDay()-1];
          const isSelected = selectedDate?.toDateString() === d.toDateString();
          const isWeekend = d.getDay() === 0;
          if(isWeekend) return null; // skip Sundays
          return (
            <button key={i} onClick={()=>setSelectedDate(d)} style={{
              padding:'8px 12px', border:'none', borderRadius:'10px', cursor:'pointer',
              flexShrink:0, textAlign:'center', minWidth:'70px',
              background: isSelected ? theme.accent : (i===0 ? theme.accent+'22' : theme.bg),
              color: isSelected ? '#ffffff' : (i===0 ? theme.accent : theme.subtext),
              outline: isSelected ? 'none' : (i===0 ? `2px solid ${theme.accent}` : 'none'),
              fontWeight: isSelected ? '700' : '500',
            }}>
              <div style={{ fontSize:'11px', opacity:0.8 }}>{dayName?.slice(0,3)}</div>
              <div style={{ fontSize:'15px', fontWeight:'700' }}>{d.getDate()}</div>
              <div style={{ fontSize:'10px', opacity:0.7 }}>{d.toLocaleDateString('en-IN',{month:'short'})}</div>
            </button>
          );
        })}
      </div>

      {/* Selected date info */}
      {selectedDate && (
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
          <span style={{ fontSize:'16px', fontWeight:'700', color:theme.text }}>
            {formatDate(selectedDate)}
          </span>
          {isToday && <span style={{ background:'#dcfce7', color:'#16a34a', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'600' }}>Today</span>}
          {!selectedDayName && <span style={{ background:'#fee2e2', color:'#dc2626', padding:'3px 10px', borderRadius:'20px', fontSize:'12px' }}>No classes (Weekend)</span>}
        </div>
      )}

      {/* Legend */}
      <div style={{ display:'flex', gap:'12px', marginBottom:'14px', flexWrap:'wrap', alignItems:'center' }}>
        {[['MRU','#3b82f6','#dbeafe'],['MRIIRS','#8b5cf6','#ede9fe'],['CDOE','#f59e0b','#fef3c7'],['Other','#10b981','#d1fae5']].map(([l,c,bg])=>(
          <div key={l} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'12px' }}>
            <div style={{ width:'10px', height:'10px', borderRadius:'3px', background:bg, border:`2px solid ${c}` }}></div>
            <span style={{ color:theme.subtext }}>{l}</span>
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'12px' }}>
          <div style={{ width:'10px', height:'10px', borderRadius:'3px', background:'#dbeafe', border:'2px solid #3b82f6', outline:'2px solid #f59e0b', outlineOffset:'1px' }}></div>
          <span style={{ color:theme.subtext }}>Has Adjustment</span>
        </div>
      </div>

      {loading ? <p style={{ color:theme.subtext }}>Loading...</p> : !selectedDayName ? (
        <div style={{ background:theme.card, borderRadius:'14px', padding:'48px', textAlign:'center', color:theme.subtext, border:`1px solid ${theme.border}` }}>
          <div style={{ fontSize:'36px', marginBottom:'8px' }}>🏖️</div>
          <p style={{ margin:0, fontSize:'16px' }}>No classes on Sunday</p>
        </div>
      ) : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ borderCollapse:'collapse', width:'100%', background:theme.card, borderRadius:'14px', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.07)', border:`1px solid ${theme.border}` }}>
            <thead>
              <tr style={{ background:theme.headerBg }}>
                <th style={{ padding:'12px 16px', textAlign:'left', color:theme.headerText, fontSize:'13px', fontWeight:'600', minWidth:'140px', opacity:0.8 }}>Trainer</th>
                {SLOTS.map(s=>(
                  <th key={s.n} style={{
                    padding:'10px 8px', textAlign:'center', minWidth:'105px',
                    color: s.n===currentSlot && isToday ? '#fbbf24' : theme.headerText,
                    fontSize:'11px', fontWeight:'600',
                    opacity: s.n===currentSlot && isToday ? 1 : 0.7,
                    background: s.n===currentSlot && isToday ? 'rgba(251,191,36,0.15)' : 'transparent'
                  }}>
                    <div>Slot {s.n}</div>
                    <div style={{ fontWeight:'400', fontSize:'10px', marginTop:'1px' }}>{s.t}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayTrainers.map((trainer,idx)=>(
                <tr key={trainer.id} style={{ background: idx%2===0 ? theme.card : theme.bg }}>
                  <td style={{ padding:'10px 16px', fontWeight:'600', fontSize:'13px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>
                    {trainer.name}
                  </td>
                  {SLOTS.map(s=>{
                    const cell = getCell(trainer.id, selectedDayName, s.n);
                    const duty = getDuty(trainer.id, selectedDateStr, s.n);
                    const isCurrent = s.n===currentSlot && isToday;
                    const tc = duty ? TYPE_COLORS[duty.type] : null;
                    return (
                      <td key={s.n} style={{ padding:'5px', textAlign:'center', borderBottom:`1px solid ${theme.border}`, background: isCurrent ? '#fffbeb' : 'transparent', position:'relative' }}>
                        {duty ? (
                          <div title={`${tc?.label}: ${duty.class_name||''} ${duty.room||''}`} style={{
                            background: tc?.bg||'#f1f5f9',
                            border: `2px solid ${tc?.border||'#cbd5e1'}`,
                            borderRadius:'6px', padding:'4px 5px', fontSize:'10px',
                            outline: isCurrent ? `2px solid ${tc?.border}` : 'none', outlineOffset:'1px'
                          }}>
                            <div style={{ background:tc?.border, color:'#fff', borderRadius:'3px', padding:'1px 4px', fontSize:'9px', fontWeight:'700', marginBottom:'2px', display:'inline-block' }}>{tc?.label}</div>
                            <div style={{ fontWeight:'600', color:'#0f172a', fontSize:'10px', lineHeight:'1.2' }}>{duty.class_name||duty.note||'—'}</div>
                            {duty.room && <div style={{ color:'#64748b', fontSize:'9px' }}>{duty.room}</div>}
                            {duty.type==='cancellation' && cell && (
                              <div style={{ textDecoration:'line-through', color:'#94a3b8', fontSize:'9px' }}>{cell.class_name}</div>
                            )}
                          </div>
                        ) : cell ? (
                          <div style={{
                            background:instBg(cell.institution), border:`1px solid ${instBord(cell.institution)}`,
                            borderRadius:'6px', padding:'5px 6px', fontSize:'11px',
                            outline: isCurrent ? `2px solid ${instBord(cell.institution)}` : 'none', outlineOffset:'1px'
                          }}>
                            <div style={{ fontWeight:'600', color:'#0f172a' }}>{cell.class_name}</div>
                            {cell.room && <div style={{ color:'#64748b', fontSize:'10px', marginTop:'1px' }}>{cell.room}</div>}
                          </div>
                        ) : (
                          <span style={{ color:theme.border, fontSize:'14px' }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
