import { useState, useEffect } from 'react';
import { TIMETABLE_SECTIONS } from './timetableSections';
import { api } from '../api';
import { useOutletContext } from 'react-router-dom';

// All streams from Excel pre-loaded
const STREAM_DATA = [
  // MRIIRS
  { institution:'MRIIRS', program:'B.Tech', semester:'6', stream_name:'CSE (ALL)' },
  { institution:'MRIIRS', program:'B.Tech', semester:'6', stream_name:'ME+Civil' },
  { institution:'MRIIRS', program:'B.Tech', semester:'6', stream_name:'Biotech' },
  { institution:'MRIIRS', program:'B.Tech', semester:'6', stream_name:'ECE+IOT+EE+BT' },
  { institution:'MRIIRS', program:'B.Tech', semester:'4', stream_name:'CSE (ALL)' },
  { institution:'MRIIRS', program:'B.Tech', semester:'4', stream_name:'ME+Civil' },
  { institution:'MRIIRS', program:'B.Tech', semester:'4', stream_name:'BT+Microbiology' },
  { institution:'MRIIRS', program:'B.Tech', semester:'4', stream_name:'ECE+EE' },
  { institution:'MRIIRS', program:'B.Tech', semester:'2', stream_name:'CSE/ECE/ME/CE/EE/BT/MicroBio' },
  { institution:'MRIIRS', program:'MBA',    semester:'2', stream_name:'SLM-MBA' },
  { institution:'MRIIRS', program:'MBA',    semester:'4', stream_name:'SLM-MBA' },
  { institution:'MRIIRS', program:'BBA',    semester:'2', stream_name:'SLM BBA' },
  { institution:'MRIIRS', program:'B.Com',  semester:'4', stream_name:'B.Com (ALL)' },
  { institution:'MRIIRS', program:'B.Com',  semester:'2', stream_name:'B.Com (ALL)' },
  { institution:'MRIIRS', program:'B.SC ID+B.Des', semester:'6', stream_name:'B.SC ID+B.Des' },
  { institution:'MRIIRS', program:'B.SC ID+B.Des', semester:'4', stream_name:'B.SC ID+B.Des' },
  { institution:'MRIIRS', program:'B.SC ID+B.Des', semester:'2', stream_name:'B.SC ID+B.Des' },
  { institution:'MRIIRS', program:'BCA & BSc IT',  semester:'4', stream_name:'All' },
  { institution:'MRIIRS', program:'BCA & BSc IT',  semester:'2', stream_name:'All' },
  { institution:'MRIIRS', program:'MCA',    semester:'2', stream_name:'MCA' },
  { institution:'MRIIRS', program:'B.Sc-HHA+CA',   semester:'6', stream_name:'SCHM' },
  { institution:'MRIIRS', program:'B.Sc-HHA+CA',   semester:'4', stream_name:'SCHM' },
  { institution:'MRIIRS', program:'B.Sc-HHA+CA',   semester:'2', stream_name:'SCHM' },
  { institution:'MRIIRS', program:'B.Sc N&D+FST',  semester:'4', stream_name:'B.Sc N&D+FST' },
  { institution:'MRIIRS', program:'B.Sc N&D+FST',  semester:'2', stream_name:'B.Sc N&D+FST' },
  { institution:'MRIIRS', program:'M.Sc N&D+FST',  semester:'2', stream_name:'M.Sc N&D+FST' },
  { institution:'MRIIRS', program:'SBSS(UG)',  semester:'4', stream_name:'SBSS(UG)' },
  { institution:'MRIIRS', program:'SBSS(UG)',  semester:'2', stream_name:'SBSS(UG)' },
  { institution:'MRIIRS', program:'SBSS(PG)',  semester:'2', stream_name:'SBSS(PG)' },
  { institution:'MRIIRS', program:'SMEH(UG)',  semester:'4', stream_name:'SMEH(UG)' },
  { institution:'MRIIRS', program:'SMEH(UG)',  semester:'2', stream_name:'SMEH(UG)' },
  { institution:'MRIIRS', program:'SMEH(PG)',  semester:'2', stream_name:'All' },
  // MRU
  { institution:'MRU', program:'BTech', semester:'6', stream_name:'CSE (All)' },
  { institution:'MRU', program:'BTech', semester:'6', stream_name:'ECE+ME' },
  { institution:'MRU', program:'BTech', semester:'4', stream_name:'CSE (All)' },
  { institution:'MRU', program:'BTech', semester:'4', stream_name:'ECE+ME' },
  { institution:'MRU', program:'BTech', semester:'2', stream_name:'CSE (All)' },
  { institution:'MRU', program:'BTech', semester:'2', stream_name:'ECE+ME+R&I' },
  { institution:'MRU', program:'BCA',   semester:'2', stream_name:'CC+Fintech' },
  { institution:'MRU', program:'MBA',   semester:'2', stream_name:'MBA' },
  { institution:'MRU', program:'M.Sc',  semester:'2', stream_name:'PCM' },
  { institution:'MRU', program:'LLB',   semester:'10', stream_name:'All' },
  { institution:'MRU', program:'LLB',   semester:'8',  stream_name:'All' },
  { institution:'MRU', program:'LLB',   semester:'6',  stream_name:'All' },
  { institution:'MRU', program:'LLB',   semester:'4',  stream_name:'All' },
  { institution:'MRU', program:'LLB',   semester:'2',  stream_name:'All' },
  { institution:'MRU', program:'B.Ed',  semester:'2',  stream_name:'Education' },
];


// ── IMPORT SECTIONS BUTTON ───────────────────────────
function ImportSectionsButton({ theme, setMsg, onDone }) {
  const [importing, setImporting] = useState(false);
  const [result,    setResult]    = useState(null);

  const doImport = async () => {
    if(!confirm(`This will create/update 121 sections with trainer-domain mappings from the Jan-Jun 2026 timetable. Continue?`)) return;
    setImporting(true); setMsg(''); setResult(null);
    try {
      const data = await api('/attendance/import-from-timetable', {
        method: 'POST',
        body: JSON.stringify({ sections: TIMETABLE_SECTIONS })
      });
      setResult(data);
      setMsg(`✅ Import complete! ${data.created} sections created, ${data.linked} trainer-domain links set.`);
      if(onDone) onDone();
    } catch(e) { setMsg('❌ Import failed: ' + e.message); }
    finally { setImporting(false); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'6px', alignItems:'flex-end' }}>
      <button onClick={doImport} disabled={importing} style={{
        padding:'9px 18px', background: importing ? '#9ca3af' : '#1e3a5f',
        color:'#fff', border:'none', borderRadius:'8px', cursor: importing?'not-allowed':'pointer',
        fontSize:'13px', fontWeight:'600'
      }}>
        {importing ? '⏳ Importing…' : '📥 Import Sections from Timetable (Jan-Jun 2026)'}
      </button>
      {result && (
        <div style={{ fontSize:'11px', color:'#065f46', background:'#d1fae5', padding:'6px 12px', borderRadius:'6px' }}>
          ✅ {result.created} sections · {result.linked} links
          {result.skipped?.length > 0 && <span style={{ color:'#f59e0b', marginLeft:'8px' }}>⚠️ {result.skipped.length} skipped</span>}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { theme } = useOutletContext();
  const [streams,       setStreams]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [seeding,       setSeeding]       = useState(false);
  const [msg,           setMsg]           = useState('');
  const [editStream,    setEditStream]    = useState(null); // stream being edited
  const [suggestData,   setSuggestData]   = useState(null); // {suggested, all}
  const [selectedSecs,  setSelectedSecs]  = useState([]);
  const [savingEdit,    setSavingEdit]    = useState(false);
  const [filterInst,    setFilterInst]    = useState('all');
  const [filterProg,    setFilterProg]    = useState('all');

  useEffect(() => { loadStreams(); }, []);

  const loadStreams = async () => {
    setLoading(true);
    try { setStreams(await api('/settings/streams')); }
    catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const seedStreams = async () => {
    setSeeding(true); setMsg('');
    try {
      const data = await api('/settings/streams/bulk-seed', { method:'POST', body: JSON.stringify({ streams: STREAM_DATA }) });
      setMsg(`✅ ${data.inserted} streams seeded! Now link sections to each stream.`);
      loadStreams();
    } catch(e) { setMsg('❌ '+e.message); }
    finally { setSeeding(false); }
  };

  const openEdit = async (stream) => {
    setEditStream(stream);
    setSelectedSecs(stream.sections || []);
    setSuggestData(null);
    try {
      const data = await api(`/settings/streams/suggest?institution=${encodeURIComponent(stream.institution)}&program=${encodeURIComponent(stream.program)}&semester=${stream.semester}&stream_name=${encodeURIComponent(stream.stream_name)}`);
      setSuggestData(data);
      // Auto-select suggested if no sections yet
      if(!(stream.sections?.length)) setSelectedSecs(data.suggested || []);
    } catch(e) { console.error(e); }
  };

  const saveEdit = async () => {
    if(!editStream) return;
    setSavingEdit(true);
    try {
      await api(`/settings/streams/${editStream.id}`, { method:'PUT', body: JSON.stringify({ sections: selectedSecs }) });
      setMsg('✅ Sections saved!');
      setEditStream(null); setSuggestData(null); setSelectedSecs([]);
      loadStreams();
    } catch(e) { setMsg('❌ '+e.message); }
    finally { setSavingEdit(false); }
  };

  const deleteStream = async (id) => {
    if(!confirm('Delete this stream?')) return;
    try { await api(`/settings/streams/${id}`, { method:'DELETE' }); loadStreams(); }
    catch(e) { setMsg('❌ '+e.message); }
  };

  const toggleSec = (sec) => setSelectedSecs(s => s.includes(sec) ? s.filter(x=>x!==sec) : [...s, sec]);

  // Filter
  const programs = [...new Set(streams.map(s=>s.program))].sort();
  const filtered = streams.filter(s => {
    if(filterInst !== 'all' && s.institution !== filterInst) return false;
    if(filterProg !== 'all' && s.program !== filterProg) return false;
    return true;
  });

  const card = { background:theme.card, borderRadius:'14px', border:`1px solid ${theme.border}`, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' };
  const inp  = { padding:'8px 11px', border:`1px solid ${theme.border}`, borderRadius:'7px', fontSize:'13px', background:theme.card, color:theme.text, outline:'none' };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'24px', fontWeight:'700', color:theme.text }}>⚙️ Settings</h1>
          <p style={{ margin:'3px 0 0', fontSize:'13px', color:theme.subtext }}>Stream Manager — one-time setup for attendance monitoring filters</p>
        </div>
      </div>

      {msg && <div style={{ background:msg.startsWith('❌')?'#fee2e2':'#d1fae5', color:msg.startsWith('❌')?'#991b1b':'#065f46', padding:'12px', borderRadius:'8px', marginBottom:'16px', fontWeight:'500' }}>{msg}</div>}

      {/* Stream Manager */}
      <div style={{ ...card, overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${theme.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px' }}>
          <div>
            <h2 style={{ margin:0, fontSize:'15px', fontWeight:'700', color:theme.text }}>📚 Stream Manager</h2>
            <p style={{ margin:'3px 0 0', fontSize:'12px', color:theme.subtext }}>{streams.length} streams · Link timetable sections to each stream for filtered reports</p>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            {streams.length === 0 && (
              <button onClick={seedStreams} disabled={seeding} style={{ padding:'9px 18px', background:'#7c3aed', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>
                {seeding ? '⏳ Seeding…' : '🌱 Seed All Streams from Excel'}
              </button>
            )}
            <ImportSectionsButton theme={theme} setMsg={setMsg} onDone={loadStreams} />
          </div>
        </div>

        {/* Filters */}
        <div style={{ padding:'12px 20px', borderBottom:`1px solid ${theme.border}`, display:'flex', gap:'10px', flexWrap:'wrap', background:theme.bg }}>
          <select value={filterInst} onChange={e=>setFilterInst(e.target.value)} style={inp}>
            <option value="all">All Institutions</option>
            <option value="MRU">MRU</option>
            <option value="MRIIRS">MRIIRS</option>
          </select>
          <select value={filterProg} onChange={e=>setFilterProg(e.target.value)} style={inp}>
            <option value="all">All Programs</option>
            {programs.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <span style={{ fontSize:'12px', color:theme.subtext, alignSelf:'center' }}>Showing {filtered.length} streams</span>
        </div>

        {loading ? <div style={{ padding:'32px', textAlign:'center', color:theme.subtext }}>Loading…</div> :
        streams.length === 0 ? (
          <div style={{ padding:'48px', textAlign:'center', color:theme.subtext }}>
            <div style={{ fontSize:'36px', marginBottom:'10px' }}>📚</div>
            <p style={{ margin:'0 0 14px', fontSize:'14px' }}>No streams seeded yet</p>
            <p style={{ margin:'0 0 16px', fontSize:'12px', color:theme.subtext }}>Click "Seed All Streams" to load all streams from your Excel file</p>
            <button onClick={seedStreams} disabled={seeding} style={{ padding:'10px 24px', background:'#7c3aed', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px', fontWeight:'600' }}>
              {seeding ? '⏳ Seeding…' : '🌱 Seed All Streams'}
            </button>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:theme.bg }}>
                {['Institution','Program','Sem','Stream','Sections Linked','Actions'].map(h=>(
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:theme.subtext, borderBottom:`2px solid ${theme.border}`, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s,i) => (
                <tr key={s.id} style={{ background:i%2===0?theme.card:theme.bg }}>
                  <td style={{ padding:'9px 14px', borderBottom:`1px solid ${theme.border}` }}>
                    <span style={{ background:s.institution==='MRU'?'#dbeafe':'#ede9fe', color:s.institution==='MRU'?'#1d4ed8':'#5b21b6', padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600' }}>{s.institution}</span>
                  </td>
                  <td style={{ padding:'9px 14px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{s.program}</td>
                  <td style={{ padding:'9px 14px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}`, fontWeight:'700' }}>Sem {s.semester}</td>
                  <td style={{ padding:'9px 14px', fontSize:'12px', color:theme.text, borderBottom:`1px solid ${theme.border}` }}>{s.stream_name}</td>
                  <td style={{ padding:'9px 14px', borderBottom:`1px solid ${theme.border}` }}>
                    {s.sections?.length > 0 ? (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'3px' }}>
                        {s.sections.slice(0,3).map((sec,j)=>(
                          <span key={j} style={{ background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:'4px', padding:'1px 6px', fontSize:'10px', color:theme.subtext }}>{sec}</span>
                        ))}
                        {s.sections.length > 3 && <span style={{ fontSize:'10px', color:theme.subtext }}>+{s.sections.length-3} more</span>}
                      </div>
                    ) : (
                      <span style={{ color:'#f59e0b', fontSize:'11px', fontWeight:'600' }}>⚠️ Not linked</span>
                    )}
                  </td>
                  <td style={{ padding:'9px 14px', borderBottom:`1px solid ${theme.border}` }}>
                    <div style={{ display:'flex', gap:'5px' }}>
                      <button onClick={()=>openEdit(s)} style={{ padding:'4px 10px', background:'#dbeafe', color:'#1d4ed8', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'11px', fontWeight:'600' }}>
                        ✏️ Link Sections
                      </button>
                      <button onClick={()=>deleteStream(s.id)} style={{ padding:'4px 8px', background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'11px' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editStream && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:'20px' }} onClick={()=>setEditStream(null)}>
          <div style={{ background:theme.card, borderRadius:'16px', width:'100%', maxWidth:'640px', maxHeight:'85vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:'18px 22px', borderBottom:`1px solid ${theme.border}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontWeight:'700', fontSize:'15px', color:theme.text }}>Link Sections — {editStream.stream_name}</div>
                <div style={{ fontSize:'12px', color:theme.subtext, marginTop:'3px' }}>{editStream.institution} · {editStream.program} · Sem {editStream.semester}</div>
              </div>
              <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                <span style={{ background:theme.accent, color:'#fff', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'600' }}>{selectedSecs.length} selected</span>
                <button onClick={()=>setEditStream(null)} style={{ background:'none', border:'none', fontSize:'18px', cursor:'pointer', color:theme.subtext }}>✕</button>
              </div>
            </div>

            <div style={{ padding:'14px 20px', borderBottom:`1px solid ${theme.border}`, display:'flex', gap:'8px', flexWrap:'wrap', background:theme.bg }}>
              <button onClick={()=>setSelectedSecs(suggestData?.suggested||[])} style={{ padding:'5px 12px', background:'#7c3aed', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'600' }}>
                💡 Use Suggested ({suggestData?.suggested?.length||0})
              </button>
              <button onClick={()=>setSelectedSecs(suggestData?.all||[])} style={{ padding:'5px 12px', background:theme.bg, color:theme.subtext, border:`1px solid ${theme.border}`, borderRadius:'6px', cursor:'pointer', fontSize:'12px' }}>Select All</button>
              <button onClick={()=>setSelectedSecs([])} style={{ padding:'5px 12px', background:theme.bg, color:theme.subtext, border:`1px solid ${theme.border}`, borderRadius:'6px', cursor:'pointer', fontSize:'12px' }}>Clear</button>
            </div>

            {!suggestData ? (
              <div style={{ padding:'32px', textAlign:'center', color:theme.subtext, fontSize:'13px' }}>Loading suggestions…</div>
            ) : (
              <div style={{ flex:1, overflowY:'auto', padding:'12px 20px' }}>
                {suggestData.suggested?.length > 0 && (
                  <div style={{ marginBottom:'16px' }}>
                    <div style={{ fontSize:'11px', fontWeight:'700', color:'#7c3aed', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                      💡 Suggested Matches ({suggestData.suggested.length})
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                      {suggestData.suggested.map((sec,i) => (
                        <button key={i} onClick={()=>toggleSec(sec)} style={{ padding:'4px 10px', border:`1px solid ${selectedSecs.includes(sec)?'#7c3aed':theme.border}`, borderRadius:'6px', cursor:'pointer', fontSize:'11px', fontWeight:'500', background:selectedSecs.includes(sec)?'#ede9fe':theme.bg, color:selectedSecs.includes(sec)?'#5b21b6':theme.text }}>
                          {selectedSecs.includes(sec)?'✓ ':''}{sec}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize:'11px', fontWeight:'700', color:theme.subtext, marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                    All Sections — {editStream.institution} ({suggestData.all?.length})
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                    {suggestData.all?.map((sec,i) => (
                      <button key={i} onClick={()=>toggleSec(sec)} style={{ padding:'3px 9px', border:`1px solid ${selectedSecs.includes(sec)?theme.accent:theme.border}`, borderRadius:'5px', cursor:'pointer', fontSize:'11px', background:selectedSecs.includes(sec)?theme.accent+'22':theme.bg, color:selectedSecs.includes(sec)?theme.accent:theme.subtext }}>
                        {selectedSecs.includes(sec)?'✓ ':''}{sec}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div style={{ padding:'14px 20px', borderTop:`1px solid ${theme.border}`, display:'flex', gap:'8px', justifyContent:'flex-end' }}>
              <button onClick={()=>setEditStream(null)} style={{ padding:'9px 18px', background:'transparent', border:`1px solid ${theme.border}`, borderRadius:'8px', cursor:'pointer', fontSize:'13px', color:theme.text }}>Cancel</button>
              <button onClick={saveEdit} disabled={savingEdit} style={{ padding:'9px 22px', background:savingEdit?'#9ca3af':theme.accent, color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>
                {savingEdit?'Saving…':'💾 Save Sections'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
