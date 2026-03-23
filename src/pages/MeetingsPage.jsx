import { useState, useEffect, useRef } from 'react';
import { api, getUser } from '../api';
import { useOutletContext } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const COURSES = [
  'All CDC Staff',
  'CSE 2 MRU', 'CSE 4 MRU', 'CSE 6 MRU',
  'CSE 2 MRIIRS', 'CSE 4 MRIIRS', 'CSE 6 MRIIRS',
  'BCA 2 MRIIRS', 'BCA 4 MRIIRS',
  'BBA 2 MRIIRS', 'BBA 4 MRIIRS',
  'BCOM 2 MRIIRS', 'BCOM 4 MRIIRS',
  'MCA 2 MRIIRS', 'MBA 2 MRIIRS',
  'ECE 4 MRU', 'ECE 6 MRU',
  'ME 4 MRU', 'ME 6 MRU',
  'LAW 4 MRU', 'LAW 6 MRU', 'LAW 8 MRU',
  'MBA 2 MRU', 'BED 2 MRU',
  'Other',
];

const STATUS_COLORS = {
  scheduled: { bg:'#dbeafe', text:'#1d4ed8', label:'📅 Scheduled' },
  completed:  { bg:'#d1fae5', text:'#065f46', label:'✅ Completed' },
  cancelled:  { bg:'#fee2e2', text:'#991b1b', label:'❌ Cancelled' },
};

function timeAgo(dateStr) {
  if(!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if(diff < 60) return 'just now';
  if(diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if(diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

function formatDateTime(date, time) {
  if(!date) return '';
  const d = new Date(`${date}T${time||'00:00'}`);
  return d.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' })
    + (time ? ` · ${time.slice(0,5)}` : '');
}

export default function MeetingsPage() {
  const { theme } = useOutletContext();
  const user = getUser();
  const isAdmin = user?.role === 'super_admin';

  const [meetings, setMeetings] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // upcoming | past | all
  const [showForm, setShowForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [minutesMeeting, setMinutesMeeting] = useState(null); // meeting for minutes
  const [rawNotes, setRawNotes] = useState('');
  const [existingMinutes, setExistingMinutes] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [searchQ, setSearchQ] = useState('');

  const [form, setForm] = useState({
    title:'', course:'All CDC Staff', date:'', time:'10:00',
    venue:'', description:'', attendee_ids:[]
  });

  // Quick Minutes states
  const [showQuickMinutes, setShowQuickMinutes] = useState(false);
  const [qm, setQm] = useState({ title:'', course:'All CDC Staff', date:'', time:'', venue:'', selected_attendees:[], raw_notes:'' });
  const [qmAiLoading, setQmAiLoading] = useState(false);
  const [qmDocLoading, setQmDocLoading] = useState(false);
  const [qmFormatted, setQmFormatted] = useState('');
  const [qmMsg, setQmMsg] = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [m, u] = await Promise.all([api('/meetings'), api('/users')]);
      setMeetings(m);
      setTrainers(u.filter(u => u.is_active));
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openNew = () => {
    setEditingMeeting(null);
    setForm({ title:'', course:'All CDC Staff', date:'', time:'10:00', venue:'', description:'', attendee_ids:[] });
    setShowForm(true); setMsg('');
  };

  const openEdit = (m) => {
    setEditingMeeting(m);
    setForm({
      title: m.title, course: m.course||'All CDC Staff',
      date: m.date?.split('T')[0]||'', time: m.time?.slice(0,5)||'10:00',
      venue: m.venue||'', description: m.description||'',
      attendee_ids: (m.attendees||[]).filter(a=>a.user_id).map(a=>a.user_id)
    });
    setShowForm(true); setMsg('');
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!form.title || !form.date || !form.time) return setMsg('⚠️ Title, date and time required');
    try {
      if(editingMeeting) {
        await api(`/meetings/${editingMeeting.id}`, { method:'PUT', body:JSON.stringify(form) });
        setMsg('✅ Meeting updated!');
      } else {
        await api('/meetings', { method:'POST', body:JSON.stringify(form) });
        setMsg('✅ Meeting scheduled!');
      }
      setShowForm(false); setEditingMeeting(null);
      loadAll();
    } catch(e) { setMsg('❌ '+e.message); }
  };

  const handleDelete = async (id) => {
    if(!confirm('Delete this meeting?')) return;
    try { await api(`/meetings/${id}`, { method:'DELETE' }); loadAll(); }
    catch(e) { alert(e.message); }
  };

  const handleStatusChange = async (m, status) => {
    try {
      await api(`/meetings/${m.id}`, { method:'PUT', body:JSON.stringify({ ...m, status, attendee_ids: (m.attendees||[]).filter(a=>a.user_id).map(a=>a.user_id) }) });
      loadAll();
    } catch(e) { alert(e.message); }
  };

  const openMinutes = async (meeting) => {
    setMinutesMeeting(meeting);
    setRawNotes('');
    setExistingMinutes(null);
    setMsg('');
    try {
      const data = await api(`/meetings/${meeting.id}/minutes`);
      if(data) { setRawNotes(data.raw_notes||''); setExistingMinutes(data); }
    } catch(e) {}
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const saveRawNotes = async () => {
    try {
      await api(`/meetings/${minutesMeeting.id}/minutes`, { method:'POST', body:JSON.stringify({ raw_notes: rawNotes }) });
      setMsg('✅ Notes saved!');
    } catch(e) { setMsg('❌ '+e.message); }
  };

  // AI: generate professional minutes using Claude API
  const generateMinutes = async () => {
    if(!rawNotes.trim()) return setMsg('⚠️ Please enter rough notes first');
    setAiLoading(true); setMsg('');
    try {
      const meeting = minutesMeeting;
      const attendeeNames = (meeting.attendees||[]).filter(a=>a.user_id).map(a=>a.user_name).join(', ');
      const prompt = `You are a professional meeting minutes writer for MREI CDC (Career Development Centre), Manav Rachna Educational Institutions.

Convert the following rough notes into professional, well-structured meeting minutes.

Meeting Details:
- Title: ${meeting.title}
- Course/For: ${meeting.course||'CDC Staff'}
- Date: ${meeting.date?.split('T')[0]} at ${meeting.time?.slice(0,5)}
- Venue: ${meeting.venue||'Not specified'}
- Scheduled by: ${meeting.scheduled_by_name}
- Attendees: ${attendeeNames||'As per attendance'}

Rough Notes:
${rawNotes}

Generate professional meeting minutes with these sections:
1. Meeting Header (title, date, time, venue, attendees)
2. Agenda / Purpose
3. Discussion Points (numbered, clear)
4. Decisions Taken
5. Action Items (with responsible person if mentioned)
6. Next Steps / Follow-up
7. Closing

Format it professionally. Use formal language. Fill in reasonable details where notes are brief. Output ONLY the meeting minutes text, no extra commentary.`;

      const data = await api('/ai/minutes', {
        method: 'POST',
        body: JSON.stringify({ prompt })
      });
      const formatted = data.text || '';

      // Save formatted minutes
      await api(`/meetings/${meeting.id}/minutes`, {
        method:'POST',
        body: JSON.stringify({ raw_notes: rawNotes, formatted_minutes: formatted })
      });
      setExistingMinutes({ raw_notes: rawNotes, formatted_minutes: formatted });
      setMsg('✅ Professional minutes generated!');
    } catch(e) { setMsg('❌ '+e.message); }
    finally { setAiLoading(false); }
  };

  // Generate Word doc and download
  const downloadWord = async () => {
    if(!existingMinutes?.formatted_minutes) return setMsg('⚠️ Generate minutes first');
    setDocLoading(true);
    try {
      const token = localStorage.getItem('token');
      const meeting = minutesMeeting;
      const attendeeNames = (meeting.attendees||[]).filter(a=>a.user_id).map(a=>a.user_name);
      const dateDisplay = meeting.date
        ? new Date(meeting.date.split('T')[0]+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
        : '';
      const details = {
        title: meeting.title,
        course: meeting.course || 'CDC Staff',
        date: meeting.date?.split('T')[0] || '',
        date_display: dateDisplay,
        time: meeting.time?.slice(0,5) || '',
        venue: meeting.venue || '',
        attendees: attendeeNames.join(', ') || 'As per attendance',
        agenda: ''
      };
      const response = await fetch(`${API_BASE}/ai/minutes/download-only`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ aiText: existingMinutes.formatted_minutes, details })
      });
      if(!response.ok) { const err = await response.json(); throw new Error(err.error || 'Download failed'); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Meeting_Minutes_${meeting.title.replace(/\s+/g,'_')}_${meeting.date?.split('T')[0]||''}.docx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMsg('✅ Word document downloaded!');
    } catch(e) { setMsg('❌ '+e.message); console.error(e); }
    finally { setDocLoading(false); }
  };

    // ── QUICK MINUTES FUNCTIONS ──────────────────────────

  const generateQuickMinutes = async () => {
    if(!qm.title.trim()) return setQmMsg('⚠️ Please enter a meeting title');
    if(!qm.raw_notes.trim()) return setQmMsg('⚠️ Please enter rough notes first');
    setQmAiLoading(true); setQmMsg('');
    try {
      const attendeesList = (qm.selected_attendees||[]).join(', ') || 'As per attendance';
      const prompt = `You are a professional meeting minutes writer for MREI CDC (Career Development Centre), Manav Rachna Educational Institutions.

Convert the following rough notes into professional Course Coordinator Meeting Minutes.

Meeting Details:
- Title: ${qm.title}
- Course/For: ${qm.course}
- Date: ${qm.date || 'As per records'} ${qm.time ? 'at ' + qm.time : ''}
- Venue: ${qm.venue || 'Not specified'}
- Attendees Present: ${attendeesList}

Rough Notes:
${qm.raw_notes}

Generate professional Course Coordinator meeting minutes with these exact sections:
1. Purpose of Meeting
2. Discussion Points (numbered, clear and detailed)
3. Decisions Taken
4. Action Items (with responsible person if mentioned)
5. Next Steps and Follow-up
6. Date of Next Meeting (if mentioned)

Use formal institutional language. Be specific and professional. Output ONLY the meeting minutes content, no preamble.`;

      const data = await api('/ai/minutes', {
        method: 'POST',
        body: JSON.stringify({ prompt })
      });
      const formatted = data.text || '';
      setQmFormatted(formatted);
      setQmMsg('✅ Minutes generated! Download below.');
    } catch(e) { setQmMsg('❌ ' + e.message); }
    finally { setQmAiLoading(false); }
  };

  const downloadQuickWord = async () => {
    if(!qmFormatted) return setQmMsg('⚠️ Generate minutes first');
    setQmDocLoading(true);
    try {
      const token = localStorage.getItem('token');
      const attendeesList = (qm.selected_attendees||[]).join(', ') || 'As per attendance';
      const dateDisplay = qm.date ? new Date(qm.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' }) : '';

      const details = {
        title: qm.title,
        course: qm.course,
        date: qm.date,
        date_display: dateDisplay,
        time: qm.time,
        venue: qm.venue,
        attendees: attendeesList,
        agenda: ''
      };

      const response = await fetch(`${API_BASE}/ai/minutes/download-only`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ aiText: qmFormatted, details })
      });

      if(!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CC_Minutes_${qm.title.replace(/\s+/g,'_')}_${qm.date||'date'}.docx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setQmMsg('✅ Word document downloaded!');
    } catch(eIgnored) {
      const e = eIgnored;
      setQmMsg('❌ ' + e.message); console.error(e);
    } finally {
      setQmDocLoading(false);
      return;
    }
    try {
      const UNUSED = true; // dead code below replaced

      const ACCENT = '1E3A5F';
      const LIGHT  = 'EBF2FA';
      const gb = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
      const borders = { top: gb, bottom: gb, left: gb, right: gb };
      const noBorder = { style: BorderStyle.NONE };
      const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
      const attendeesList = (qm.selected_attendees||[]).join(', ') || 'As per attendance';
      const children = [];

      // ── HEADER ──
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: 'Career Development Centre', bold: true, size: 40, font: 'Arial', color: ACCENT })]
      }));
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 80 },
        children: [new TextRun({ text: 'A Unit of Manav Rachna Educational Institutions (MREI)', size: 22, font: 'Arial', color: '666666', italics: true })]
      }));
      children.push(new Paragraph({
        spacing: { after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 1 } },
        children: [new TextRun('')]
      }));
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 280 },
        children: [new TextRun({ text: 'COURSE COORDINATOR MEETING MINUTES', bold: true, size: 28, font: 'Arial', color: ACCENT })]
      }));

      // ── DETAILS TABLE ──
      const dateStr = qm.date ? new Date(qm.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—';
      const rows = [
        ['Meeting Title',      qm.title || '—'],
        ['Course / For',       qm.course || '—'],
        ['Date',               dateStr],
        ['Time',               qm.time || '—'],
        ['Venue',              qm.venue || '—'],
        ['Attendees Present',  attendeesList],
      ];
      children.push(new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [2300, 6726],
        rows: rows.map(([label, value]) => new TableRow({ children: [
          new TableCell({ borders, width: { size: 2300, type: WidthType.DXA },
            shading: { fill: LIGHT, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, font: 'Arial', color: ACCENT })] })] }),
          new TableCell({ borders, width: { size: 6726, type: WidthType.DXA },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [new Paragraph({ children: [new TextRun({ text: value, size: 20, font: 'Arial', color: '222222' })] })] }),
        ]}))
      }));

      children.push(new Paragraph({ spacing: { after: 320 }, children: [new TextRun('')] }));

      // ── CONTENT ──
      const lines = qmFormatted.split('\n');
      for(const line of lines) {
        const t = line.trim();
        if(!t) { children.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun('')] })); continue; }
        const isSection = /^[1-9]\.\s+[A-Z]/.test(t) || (/^[A-Z][A-Z\s\/&]+:?\s*$/.test(t) && t.length < 70);
        const isBullet  = /^[-•*]\s/.test(t);
        const isNum     = /^\d+[.)]\s/.test(t) && !isSection;
        const isSub     = t.endsWith(':') && t.length < 60 && !isBullet && !isSection;

        if(isSection) {
          children.push(new Paragraph({
            spacing: { before: 300, after: 120 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: ACCENT, space: 2 } },
            children: [new TextRun({ text: t.replace(/:$/, ''), bold: true, size: 24, font: 'Arial', color: ACCENT })]
          }));
        } else if(isSub) {
          children.push(new Paragraph({
            spacing: { before: 160, after: 80 },
            children: [new TextRun({ text: t, bold: true, size: 21, font: 'Arial', color: '333333' })]
          }));
        } else if(isBullet) {
          children.push(new Paragraph({
            numbering: { reference: 'bullets', level: 0 }, spacing: { after: 80 },
            children: [new TextRun({ text: t.replace(/^[-•*]\s*/, ''), size: 20, font: 'Arial', color: '222222' })]
          }));
        } else if(isNum) {
          children.push(new Paragraph({
            numbering: { reference: 'numbers', level: 0 }, spacing: { after: 80 },
            children: [new TextRun({ text: t.replace(/^\d+[.)]\s*/, ''), size: 20, font: 'Arial', color: '222222' })]
          }));
        } else {
          children.push(new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: t, size: 20, font: 'Arial', color: '222222' })]
          }));
        }
      }

      // ── SIGNATURE ──
      children.push(new Paragraph({ spacing: { before: 700 }, border: { top: { style: BorderStyle.SINGLE, size: 3, color: 'CCCCCC', space: 1 } }, children: [new TextRun('')] }));
      children.push(new Table({
        width: { size: 9026, type: WidthType.DXA }, columnWidths: [4513, 4513],
        rows: [new TableRow({ children: [
          new TableCell({ borders: noBorders, margins: { top: 200, bottom: 60, left: 0, right: 0 },
            children: [
              new Paragraph({ children: [new TextRun({ text: '________________________', size: 20, font: 'Arial', color: '777777' })] }),
              new Paragraph({ children: [new TextRun({ text: 'Prepared By', bold: true, size: 20, font: 'Arial', color: ACCENT })] }),
              new Paragraph({ children: [new TextRun({ text: 'Course Coordinator / CDC', size: 18, font: 'Arial', color: '888888', italics: true })] }),
            ] }),
          new TableCell({ borders: noBorders, margins: { top: 200, bottom: 60, left: 0, right: 0 },
            children: [
              new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '________________________', size: 20, font: 'Arial', color: '777777' })] }),
              new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Reviewed By', bold: true, size: 20, font: 'Arial', color: ACCENT })] }),
              new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Head — Career Development Centre', size: 18, font: 'Arial', color: '888888', italics: true })] }),
            ] }),
        ]})]
      }));
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { before: 240 },
        children: [new TextRun({ text: 'Generated via CDC Management System · ' + new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), size: 16, font: 'Arial', color: 'BBBBBB', italics: true })]
      }));

      const doc = new Document({
        numbering: { config: [
          { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
          { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        ]},
        styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
        sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1260, bottom: 1440, left: 1440 } } }, children }]
      });

      const buffer = await Packer.toBlob(doc);
      const url = URL.createObjectURL(buffer);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CC_Minutes_' + qm.title.replace(/\s+/g, '_') + '_' + (qm.date || new Date().toISOString().split('T')[0]) + '.docx';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setQmMsg('✅ Word document downloaded!');
    } catch(e) { setQmMsg('❌ ' + e.message); console.error(e); }
    finally { setQmDocLoading(false); }
  };

  // Filter meetings
  const today = new Date().toISOString().split('T')[0];
  const filtered = meetings.filter(m => {
    const mDate = m.date?.split('T')[0]||'';
    if(activeTab==='upcoming') return mDate >= today && m.status !== 'cancelled';
    if(activeTab==='past') return mDate < today || m.status === 'completed';
    return true;
  }).filter(m => {
    if(!searchQ) return true;
    const q = searchQ.toLowerCase();
    return m.title?.toLowerCase().includes(q) || m.course?.toLowerCase().includes(q) || m.venue?.toLowerCase().includes(q) || m.scheduled_by_name?.toLowerCase().includes(q);
  });

  const inp = { width:'100%', padding:'9px 12px', border:`2px solid ${theme.border}`, borderRadius:'8px', fontSize:'14px', boxSizing:'border-box', outline:'none', background:theme.card, color:theme.text };
  const card = { background:theme.card, borderRadius:'14px', border:`1px solid ${theme.border}`, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' };
  const lbl = { display:'block', fontSize:'12px', fontWeight:'600', color:theme.subtext, marginBottom:'5px' };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'24px', fontWeight:'700', color:theme.text }}>📅 Meetings</h1>
          <p style={{ margin:'3px 0 0', fontSize:'13px', color:theme.subtext }}>
            {meetings.filter(m=>m.date?.split('T')[0]>=today&&m.status!=='cancelled').length} upcoming · Schedule, track & generate minutes
          </p>
        </div>
        {!showForm && !minutesMeeting && (
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={()=>{setShowQuickMinutes(!showQuickMinutes);setShowForm(false);setMinutesMeeting(null);setQmMsg('');setQmFormatted('');}} style={{
              padding:'10px 18px', background:showQuickMinutes?'#7c3aed':theme.bg,
              color:showQuickMinutes?'#fff':theme.subtext,
              border:`1px solid ${showQuickMinutes?'#7c3aed':theme.border}`,
              borderRadius:'10px', cursor:'pointer', fontWeight:'600', fontSize:'14px'
            }}>
              ✨ Quick Minutes
            </button>
            <button onClick={openNew} style={{ padding:'10px 20px', background:theme.accent, color:'#fff', border:'none', borderRadius:'10px', cursor:'pointer', fontWeight:'600', fontSize:'14px' }}>
              + Schedule Meeting
            </button>
          </div>
        )}
      </div>

      {msg && <div style={{ background:msg.startsWith('❌')?'#fee2e2':'#d1fae5', color:msg.startsWith('❌')?'#991b1b':'#065f46', padding:'12px', borderRadius:'8px', marginBottom:'16px', fontWeight:'500' }}>{msg}</div>}

      {/* ── QUICK MINUTES PANEL ── */}
      {showQuickMinutes && (
        <div style={{ ...card, padding:'28px', marginBottom:'24px', borderTop:`3px solid #7c3aed` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
            <div>
              <h2 style={{ margin:0, fontSize:'17px', fontWeight:'700', color:theme.text }}>✨ Quick Minutes Generator</h2>
              <p style={{ margin:'4px 0 0', fontSize:'13px', color:theme.subtext }}>Generate professional CC meeting minutes directly — no scheduling needed</p>
            </div>
            <button onClick={()=>{setShowQuickMinutes(false);setQmFormatted('');setQmMsg('');}} style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:theme.subtext }}>✕</button>
          </div>

          {qmMsg && <div style={{ background:qmMsg.startsWith('❌')?'#fee2e2':'#d1fae5', color:qmMsg.startsWith('❌')?'#991b1b':'#065f46', padding:'10px 14px', borderRadius:'8px', marginBottom:'16px', fontSize:'13px', fontWeight:'500' }}>{qmMsg}</div>}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'12px', marginBottom:'14px' }}>
            <div style={{ gridColumn:'1/3' }}>
              <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:theme.subtext, marginBottom:'5px' }}>Meeting Title *</label>
              <input value={qm.title} onChange={e=>setQm({...qm,title:e.target.value})} placeholder="e.g. CSE 4 Sem CC Meeting" style={{...inp}} required />
            </div>
            <div>
              <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:theme.subtext, marginBottom:'5px' }}>Course / For</label>
              <select value={qm.course} onChange={e=>setQm({...qm,course:e.target.value})} style={inp}>
                {COURSES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:theme.subtext, marginBottom:'5px' }}>Date</label>
              <input type="date" value={qm.date} onChange={e=>setQm({...qm,date:e.target.value})} style={inp} />
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'14px' }}>
            <div>
              <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:theme.subtext, marginBottom:'5px' }}>Time</label>
              <input type="time" value={qm.time} onChange={e=>setQm({...qm,time:e.target.value})} style={inp} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:theme.subtext, marginBottom:'5px' }}>Venue</label>
              <input value={qm.venue} onChange={e=>setQm({...qm,venue:e.target.value})} placeholder="Room / Block / Online" style={inp} />
            </div>
          </div>

          <div style={{ marginBottom:'14px' }}>
            <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:theme.subtext, marginBottom:'6px' }}>
              Attendees Present
              <span style={{ marginLeft:'8px', background:theme.accent, color:'#fff', padding:'1px 8px', borderRadius:'10px', fontSize:'11px' }}>
                {qm.selected_attendees?.length||0} selected
              </span>
              <button type="button" onClick={()=>setQm({...qm,selected_attendees:trainers.map(t=>t.name)})} style={{ marginLeft:'6px', fontSize:'11px', background:'#dbeafe', color:'#1d4ed8', border:'none', borderRadius:'6px', padding:'2px 8px', cursor:'pointer' }}>All</button>
              <button type="button" onClick={()=>setQm({...qm,selected_attendees:[]})} style={{ marginLeft:'4px', fontSize:'11px', background:theme.bg, color:theme.subtext, border:`1px solid ${theme.border}`, borderRadius:'6px', padding:'2px 8px', cursor:'pointer' }}>Clear</button>
            </label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:'5px', maxHeight:'140px', overflowY:'auto', border:`1px solid ${theme.border}`, borderRadius:'8px', padding:'8px', background:theme.bg }}>
              {trainers.map(t => {
                const sel = (qm.selected_attendees||[]).includes(t.name);
                return (
                  <label key={t.id} style={{ display:'flex', alignItems:'center', gap:'7px', cursor:'pointer', padding:'5px 8px', borderRadius:'6px', background:sel?theme.accent+'22':theme.card, border:`1px solid ${sel?theme.accent:theme.border}` }}>
                    <input type="checkbox" checked={sel} onChange={()=>setQm({...qm, selected_attendees: sel ? (qm.selected_attendees||[]).filter(n=>n!==t.name) : [...(qm.selected_attendees||[]),t.name]})} style={{ display:'none' }} />
                    <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:sel?theme.accent:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:'700', color:sel?'#fff':theme.subtext, flexShrink:0 }}>
                      {t.name?.[0]}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:'12px', fontWeight:'600', color:theme.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</div>
                      <div style={{ fontSize:'10px', color:theme.subtext, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.designation||t.role}</div>
                    </div>
                    {sel && <span style={{ color:theme.accent, fontSize:'12px', marginLeft:'auto', flexShrink:0 }}>✓</span>}
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            <div>
              <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:theme.subtext, marginBottom:'5px' }}>
                📋 Rough Notes *
                <span style={{ color:theme.subtext, fontWeight:'400', marginLeft:'6px' }}>Type anything — AI will format it</span>
              </label>
              <textarea value={qm.raw_notes} onChange={e=>setQm({...qm,raw_notes:e.target.value})}
                placeholder={"Example:\n- Discussed syllabus coverage for CSE 4\n- Mr. Prakash to cover probability next 2 weeks\n- 12 students below 75% attendance\n- Extra class on Saturday decided\n- Next meeting: 28 March"}
                rows={10} style={{ ...inp, resize:'vertical', lineHeight:'1.7', fontSize:'13px' }} />
              <button onClick={generateQuickMinutes} disabled={qmAiLoading||!qm.raw_notes.trim()||!qm.title.trim()} style={{
                width:'100%', marginTop:'10px', padding:'11px',
                background:qmAiLoading||!qm.raw_notes.trim()||!qm.title.trim()?'#9ca3af':'#7c3aed',
                color:'#fff', border:'none', borderRadius:'8px', fontWeight:'700',
                cursor:qmAiLoading||!qm.raw_notes.trim()||!qm.title.trim()?'not-allowed':'pointer', fontSize:'14px'
              }}>
                {qmAiLoading ? '⏳ AI is writing minutes...' : '✨ Generate Professional Minutes'}
              </button>
            </div>

            <div>
              <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:theme.subtext, marginBottom:'5px' }}>
                ✨ Professional Minutes
                {qmFormatted && <span style={{ marginLeft:'8px', background:'#d1fae5', color:'#065f46', padding:'2px 8px', borderRadius:'10px', fontSize:'11px' }}>Ready</span>}
              </label>
              {qmFormatted ? (
                <>
                  <div style={{ ...inp, height:'260px', overflowY:'auto', resize:'none', fontSize:'12px', lineHeight:'1.8', whiteSpace:'pre-wrap', background:theme.bg, padding:'12px', borderRadius:'8px', border:`1px solid ${theme.border}` }}>
                    {qmFormatted}
                  </div>
                  <button onClick={downloadQuickWord} disabled={qmDocLoading} style={{
                    width:'100%', marginTop:'10px', padding:'12px',
                    background:qmDocLoading?'#9ca3af':'#1e3a5f',
                    color:'#fff', border:'none', borderRadius:'8px', fontWeight:'700',
                    cursor:qmDocLoading?'not-allowed':'pointer', fontSize:'14px'
                  }}>
                    {qmDocLoading ? '⏳ Preparing...' : '📥 Download Word Document (.docx)'}
                  </button>
                </>
              ) : (
                <div style={{ height:'260px', background:theme.bg, borderRadius:'8px', border:`2px dashed ${theme.border}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:theme.subtext }}>
                  <div style={{ fontSize:'36px', marginBottom:'10px' }}>✨</div>
                  <p style={{ margin:0, fontSize:'14px', fontWeight:'500' }}>AI minutes appear here</p>
                  <p style={{ margin:'4px 0 0', fontSize:'12px' }}>Fill details → click Generate</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MEETING FORM ── */}
      {showForm && (
        <div style={{ ...card, padding:'28px', marginBottom:'24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
            <h2 style={{ margin:0, fontSize:'17px', fontWeight:'700', color:theme.text }}>
              {editingMeeting ? '✏️ Edit Meeting' : '📅 Schedule New Meeting'}
            </h2>
            <button onClick={()=>{setShowForm(false);setEditingMeeting(null);}} style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:theme.subtext }}>✕</button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Row 1 */}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:'14px', marginBottom:'14px' }}>
              <div>
                <label style={lbl}>Meeting Title *</label>
                <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. CDC Weekly Review" style={inp} required />
              </div>
              <div>
                <label style={lbl}>For (Course / Team)</label>
                <select value={form.course} onChange={e=>setForm({...form,course:e.target.value})} style={inp}>
                  {COURSES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Date *</label>
                <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inp} required />
              </div>
              <div>
                <label style={lbl}>Time *</label>
                <input type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})} style={inp} required />
              </div>
            </div>

            {/* Row 2 */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'14px', marginBottom:'14px' }}>
              <div>
                <label style={lbl}>Venue</label>
                <input value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})} placeholder="Room / Online / Block" style={inp} />
              </div>
              <div>
                <label style={lbl}>Agenda / Description</label>
                <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Brief agenda or purpose..." style={inp} />
              </div>
            </div>

            {/* Attendees */}
            <div style={{ marginBottom:'20px' }}>
              <label style={lbl}>
                Invite Attendees
                <span style={{ marginLeft:'8px', background:theme.accent, color:'#fff', padding:'1px 8px', borderRadius:'10px', fontSize:'11px' }}>
                  {form.attendee_ids.length} selected
                </span>
                <button type="button" onClick={()=>setForm({...form, attendee_ids: trainers.map(t=>t.id)})} style={{ marginLeft:'8px', fontSize:'11px', background:'#dbeafe', color:'#1d4ed8', border:'none', borderRadius:'6px', padding:'2px 8px', cursor:'pointer' }}>All</button>
                <button type="button" onClick={()=>setForm({...form, attendee_ids:[]})} style={{ marginLeft:'4px', fontSize:'11px', background:theme.bg, color:theme.subtext, border:`1px solid ${theme.border}`, borderRadius:'6px', padding:'2px 8px', cursor:'pointer' }}>Clear</button>
              </label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'6px', maxHeight:'180px', overflowY:'auto', border:`1px solid ${theme.border}`, borderRadius:'8px', padding:'10px', background:theme.bg }}>
                {trainers.map(t => {
                  const selected = form.attendee_ids.includes(t.id);
                  return (
                    <label key={t.id} style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', padding:'6px 8px', borderRadius:'6px', background:selected?theme.accent+'22':theme.card, border:`1px solid ${selected?theme.accent:theme.border}` }}>
                      <input type="checkbox" checked={selected} onChange={()=>setForm({...form, attendee_ids: selected ? form.attendee_ids.filter(id=>id!==t.id) : [...form.attendee_ids, t.id]})} style={{ display:'none' }} />
                      <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:selected?theme.accent:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700', color:selected?'#fff':theme.subtext, flexShrink:0 }}>
                        {t.name?.[0]}
                      </div>
                      <div>
                        <div style={{ fontSize:'12px', fontWeight:'600', color:theme.text }}>{t.name}</div>
                        <div style={{ fontSize:'10px', color:theme.subtext }}>{t.designation||t.role}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ display:'flex', gap:'10px' }}>
              <button type="submit" style={{ padding:'12px 32px', background:theme.accent, color:'#fff', border:'none', borderRadius:'10px', fontWeight:'700', cursor:'pointer', fontSize:'15px' }}>
                {editingMeeting ? '✏️ Update Meeting' : '📅 Schedule Meeting'}
              </button>
              <button type="button" onClick={()=>{setShowForm(false);setEditingMeeting(null);}} style={{ padding:'12px 20px', background:theme.bg, color:theme.subtext, border:`1px solid ${theme.border}`, borderRadius:'10px', cursor:'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── MEETING MINUTES PANEL ── */}
      {minutesMeeting && (
        <div style={{ ...card, padding:'28px', marginBottom:'24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
            <div>
              <h2 style={{ margin:0, fontSize:'17px', fontWeight:'700', color:theme.text }}>📝 Meeting Minutes</h2>
              <p style={{ margin:'4px 0 0', fontSize:'13px', color:theme.subtext }}>{minutesMeeting.title} · {formatDateTime(minutesMeeting.date?.split('T')[0], minutesMeeting.time)}</p>
            </div>
            <button onClick={()=>{setMinutesMeeting(null);setRawNotes('');setExistingMinutes(null);}} style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:theme.subtext }}>✕</button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
            {/* Left: Raw notes */}
            <div>
              <label style={{ ...lbl, fontSize:'13px', color:theme.text }}>📋 Rough Notes</label>
              <p style={{ fontSize:'12px', color:theme.subtext, marginBottom:'8px', marginTop:0 }}>Type your rough notes, bullet points, key decisions — anything. AI will convert to professional minutes.</p>
              <textarea
                value={rawNotes}
                onChange={e=>setRawNotes(e.target.value)}
                placeholder={`Example:\n- Discussed CSE 4 aptitude syllabus\n- Mr. Prakash to cover probability next week\n- Attendance below 75% for 12 students\n- Next meeting on 28th March\n- Venue: HF09`}
                rows={12}
                style={{ ...inp, resize:'vertical', lineHeight:'1.7', fontSize:'13px' }}
              />
              <div style={{ display:'flex', gap:'8px', marginTop:'10px' }}>
                <button onClick={saveRawNotes} style={{ padding:'9px 18px', background:theme.bg, color:theme.subtext, border:`1px solid ${theme.border}`, borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>
                  💾 Save Notes
                </button>
                <button onClick={generateMinutes} disabled={aiLoading} style={{ flex:1, padding:'9px 18px', background:aiLoading?'#9ca3af':theme.accent, color:'#fff', border:'none', borderRadius:'8px', cursor:aiLoading?'not-allowed':'pointer', fontSize:'13px', fontWeight:'700' }}>
                  {aiLoading ? '⏳ AI is writing...' : '✨ Generate Professional Minutes'}
                </button>
              </div>
            </div>

            {/* Right: AI output */}
            <div>
              <label style={{ ...lbl, fontSize:'13px', color:theme.text }}>
                ✨ Professional Minutes
                {existingMinutes?.formatted_minutes && (
                  <span style={{ marginLeft:'8px', background:'#d1fae5', color:'#065f46', padding:'2px 8px', borderRadius:'10px', fontSize:'11px' }}>Ready to download</span>
                )}
              </label>
              {existingMinutes?.formatted_minutes ? (
                <>
                  <div style={{
                    ...inp, height:'280px', overflowY:'auto', resize:'none',
                    fontSize:'12px', lineHeight:'1.8', whiteSpace:'pre-wrap',
                    background:theme.bg, padding:'12px', borderRadius:'8px',
                    border:`1px solid ${theme.border}`
                  }}>
                    {existingMinutes.formatted_minutes}
                  </div>
                  <button onClick={downloadWord} disabled={docLoading} style={{
                    width:'100%', marginTop:'10px', padding:'12px',
                    background:docLoading?'#9ca3af':'#1e3a5f',
                    color:'#fff', border:'none', borderRadius:'8px',
                    cursor:docLoading?'not-allowed':'pointer', fontSize:'14px', fontWeight:'700'
                  }}>
                    {docLoading ? '⏳ Preparing document...' : '📥 Download Word Document (.docx)'}
                  </button>
                </>
              ) : (
                <div style={{ height:'280px', background:theme.bg, borderRadius:'8px', border:`2px dashed ${theme.border}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:theme.subtext }}>
                  <div style={{ fontSize:'36px', marginBottom:'12px' }}>✨</div>
                  <p style={{ margin:0, fontSize:'14px', fontWeight:'500' }}>AI minutes will appear here</p>
                  <p style={{ margin:'6px 0 0', fontSize:'12px' }}>Type rough notes → click Generate</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MEETINGS LIST ── */}
      {!showForm && !minutesMeeting && (
        <>
          {/* Tabs + Search */}
          <div style={{ display:'flex', gap:'12px', marginBottom:'16px', alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ display:'flex', gap:'4px', background:theme.bg, padding:'4px', borderRadius:'10px' }}>
              {[['upcoming','📅 Upcoming'],['past','✅ Past'],['all','All']].map(([id,label])=>(
                <button key={id} onClick={()=>setActiveTab(id)} style={{
                  padding:'7px 16px', border:'none', borderRadius:'8px', cursor:'pointer',
                  background:activeTab===id?theme.card:'transparent',
                  color:activeTab===id?theme.text:theme.subtext,
                  fontWeight:activeTab===id?'600':'400', fontSize:'13px',
                  boxShadow:activeTab===id?'0 1px 4px rgba(0,0,0,0.08)':'none'
                }}>{label}</button>
              ))}
            </div>
            <input
              value={searchQ} onChange={e=>setSearchQ(e.target.value)}
              placeholder="🔍 Search by title, course, venue..."
              style={{ ...inp, width:'280px', flex:'none' }}
            />
            <span style={{ color:theme.subtext, fontSize:'13px' }}>{filtered.length} meeting{filtered.length!==1?'s':''}</span>
          </div>

          {loading ? <p style={{ color:theme.subtext }}>Loading...</p> :
          filtered.length === 0 ? (
            <div style={{ ...card, padding:'48px', textAlign:'center', color:theme.subtext }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>📅</div>
              <p style={{ margin:0, fontSize:'15px' }}>{activeTab==='upcoming' ? 'No upcoming meetings' : 'No meetings found'}</p>
              <button onClick={openNew} style={{ marginTop:'16px', padding:'10px 24px', background:theme.accent, color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'600', fontSize:'14px' }}>
                Schedule your first meeting
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {filtered.map(m => {
                const sc = STATUS_COLORS[m.status] || STATUS_COLORS.scheduled;
                const mDate = m.date?.split('T')[0]||'';
                const isPast = mDate < today;
                const attendees = (m.attendees||[]).filter(a=>a.user_id);
                const isMyMeeting = String(m.scheduled_by) === String(user?.id);

                return (
                  <div key={m.id} style={{ ...card, padding:'20px 24px', borderLeft:`5px solid ${isPast?'#94a3b8':theme.accent}`, opacity: m.status==='cancelled'?0.6:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'16px' }}>
                      <div style={{ flex:1 }}>
                        {/* Header row */}
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px', flexWrap:'wrap' }}>
                          <span style={{ background:sc.bg, color:sc.text, padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'600' }}>{sc.label}</span>
                          {m.course && <span style={{ background:theme.bg, color:theme.subtext, padding:'3px 8px', borderRadius:'20px', fontSize:'11px' }}>📚 {m.course}</span>}
                          {m.has_minutes && <span style={{ background:'#d1fae5', color:'#065f46', padding:'3px 8px', borderRadius:'20px', fontSize:'11px' }}>📄 Minutes ready</span>}
                        </div>

                        <h3 style={{ margin:'0 0 8px', fontSize:'16px', fontWeight:'700', color:theme.text }}>{m.title}</h3>

                        <div style={{ display:'flex', gap:'16px', flexWrap:'wrap', fontSize:'13px', color:theme.subtext, marginBottom:'8px' }}>
                          <span>📅 {formatDateTime(mDate, m.time)}</span>
                          {m.venue && <span>📍 {m.venue}</span>}
                          <span>👤 By {m.scheduled_by_name}</span>
                        </div>

                        {m.description && <p style={{ margin:'0 0 10px', fontSize:'13px', color:theme.subtext, lineHeight:'1.5' }}>{m.description}</p>}

                        {/* Attendees */}
                        {attendees.length > 0 && (
                          <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
                            <span style={{ fontSize:'12px', color:theme.subtext }}>👥 {attendees.length} invited:</span>
                            <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                              {attendees.slice(0,6).map((a,i) => (
                                <span key={i} style={{ background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:'20px', padding:'2px 8px', fontSize:'11px', color:theme.text }}>
                                  {a.user_name}
                                </span>
                              ))}
                              {attendees.length > 6 && <span style={{ fontSize:'11px', color:theme.subtext }}>+{attendees.length-6} more</span>}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display:'flex', flexDirection:'column', gap:'6px', flexShrink:0 }}>
                        <button onClick={()=>openMinutes(m)} style={{ padding:'8px 14px', background:'#dbeafe', color:'#1d4ed8', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:'600', whiteSpace:'nowrap' }}>
                          📝 {m.has_minutes ? 'View Minutes' : 'Add Minutes'}
                        </button>
                        {(isMyMeeting || isAdmin) && (
                          <>
                            <button onClick={()=>openEdit(m)} style={{ padding:'8px 14px', background:theme.bg, color:theme.subtext, border:`1px solid ${theme.border}`, borderRadius:'8px', cursor:'pointer', fontSize:'12px', whiteSpace:'nowrap' }}>
                              ✏️ Edit
                            </button>
                            {m.status === 'scheduled' && (
                              <button onClick={()=>handleStatusChange(m,'completed')} style={{ padding:'8px 14px', background:'#d1fae5', color:'#065f46', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:'600', whiteSpace:'nowrap' }}>
                                ✅ Mark Done
                              </button>
                            )}
                            <button onClick={()=>handleDelete(m.id)} style={{ padding:'8px 14px', background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'12px', whiteSpace:'nowrap' }}>
                              🗑️ Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
