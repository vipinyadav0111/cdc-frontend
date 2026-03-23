import { useState, useEffect, useRef } from 'react';
import { api, getUser } from '../api';
import { useOutletContext, useNavigate } from 'react-router-dom';

const SLOT_LABELS = {
  1:'9:00–9:50',2:'9:50–10:40',3:'10:40–11:30',4:'11:30–12:20',
  5:'12:20–1:10',6:'1:10–2:00',7:'2:00–2:50',8:'2:50–3:40',9:'3:40–4:30'
};
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const CATEGORIES = [
  { id:'general',  label:'📢 General',  color:'#3b82f6' },
  { id:'urgent',   label:'🚨 Urgent',   color:'#ef4444' },
  { id:'event',    label:'🎉 Event',    color:'#8b5cf6' },
  { id:'academic', label:'📚 Academic', color:'#10b981' },
  { id:'admin',    label:'🏢 Admin',    color:'#f59e0b' },
];

function timeAgo(d) {
  if(!d) return '';
  const s = (Date.now() - new Date(d)) / 1000;
  if(s < 60) return 'just now';
  if(s < 3600) return `${Math.floor(s/60)}m ago`;
  if(s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function getBirthdayInfo(str) {
  if(!str) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const b = new Date(str);
  const same = new Date(today.getFullYear(), b.getMonth(), b.getDate());
  let days = Math.round((same - today) / 86400000);
  if(days < 0) days += 365;
  if(days > 31) return null;
  if(days === 0) return { days:0, label:'🎂 Today!', color:'#f59e0b', isToday:true };
  return { days, label:`in ${days}d`, color:'#10b981', isToday:false };
}
function fmtBDay(str) {
  if(!str) return '';
  return new Date(str).toLocaleDateString('en-IN',{day:'numeric',month:'long'});
}

function getWishes(first, sender) {
  return [
    `Happy Birthday ${first}! 🎂 May this year bring you immense joy, success, and everything you deserve. It's a privilege working alongside you!\n\nWarm regards,\n${sender}`,
    `Wishing you a wonderful Birthday, ${first}! 🎉 Your dedication and passion at CDC inspire all of us. Hope your special day is as amazing as you are!\n\nBest wishes,\n${sender}`,
    `Many happy returns of the day, ${first}! 🌟 Your contributions to the team are truly valued. Wishing you a year of great health, happiness, and achievements!\n\nWith warm wishes,\n${sender}`,
    `Happy Birthday ${first}! 🎈 May this new year of your life open exciting doors — professionally and personally. Keep shining every single day!\n\nRegards,\n${sender}`,
    `Warmest birthday greetings, ${first}! 🌺 May you be surrounded by people who love and appreciate you. Wishing you continued success in all you do!\n\nKind regards,\n${sender}`,
    `Happy Birthday, ${first}! ✨ You bring so much energy and professionalism to our team. Here's to a year full of milestones and beautiful memories!\n\nWith best wishes,\n${sender}`,
    `Many more happy returns, ${first}! 🥳 Your commitment to your work is truly inspiring. Wishing you a day as special as your contributions to CDC!\n\nWarmly,\n${sender}`,
    `Sending warmest birthday wishes, ${first}! 🎂 May this year be your best one yet — filled with learning, laughter, and outstanding achievements!\n\nWith warm regards,\n${sender}`,
    `Happy Birthday ${first}! 🌟 Colleagues like you make the workplace a brighter space. Hope you have a fantastic day and a remarkable year ahead!\n\nBest wishes,\n${sender}`,
    `Wishing you a blessed birthday, ${first}! 🎉 Your expertise is a pillar of our team. May this day bring you all the joy and recognition you truly deserve!\n\nRegards,\n${sender}`,
    `Happy Birthday, ${first}! 🌸 May this new year of your life be filled with new goals achieved, new heights reached, and cherished memories!\n\nWarm wishes,\n${sender}`,
    `Many happy returns, ${first}! 🎊 Thank you for being such an incredible team member. Here's wishing you outstanding success and good health throughout the year!\n\nBest regards,\n${sender}`,
    `Warmest wishes on your birthday, ${first}! 🥂 You bring immense value to our work at CDC. May today be filled with smiles, celebrations, and wonderful surprises!\n\nWith warm regards,\n${sender}`,
    `Happy Birthday ${first}! 🎈 May this special day mark the beginning of a wonderful new chapter — full of achievement and happiness at work and beyond!\n\nBest,\n${sender}`,
    `Wishing you a very Happy Birthday, ${first}! 🎂 Your positive energy makes a real difference to everyone around you. Have a truly spectacular day!\n\nWarm regards,\n${sender}`,
  ];
}

function WishModal({ person, sender, theme, onClose, onSend }) {
  const first = person.name.split(' ')[0];
  const wishes = getWishes(first, sender);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'20px' }} onClick={onClose}>
      <div style={{ background:theme.card,borderRadius:'16px',width:'100%',maxWidth:'580px',maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'18px 22px 14px',borderBottom:`1px solid ${theme.border}`,display:'flex',alignItems:'center',gap:'12px' }}>
          <span style={{ fontSize:'34px' }}>🎂</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:'700',fontSize:'16px',color:theme.text }}>Send Birthday Wishes to {first}</div>
            <div style={{ fontSize:'12px',color:theme.subtext,marginTop:'2px' }}>{person.designation} · {fmtBDay(person.birthday)}</div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:'20px',cursor:'pointer',color:theme.subtext }}>✕</button>
        </div>
        <div style={{ flex:1,overflowY:'auto',padding:'14px 20px' }}>
          <p style={{ margin:'0 0 10px',fontSize:'12px',color:theme.subtext }}>Choose one — it will be sent directly in chat to {first}:</p>
          <div style={{ display:'flex',flexDirection:'column',gap:'7px' }}>
            {wishes.map((w,i)=>(
              <div key={i} onClick={()=>setSel(i)} style={{ padding:'11px 13px',borderRadius:'10px',cursor:'pointer',border:`2px solid ${sel===i?theme.accent:theme.border}`,background:sel===i?theme.accent+'12':theme.bg,transition:'all 0.12s' }}>
                <div style={{ display:'flex',gap:'10px',alignItems:'flex-start' }}>
                  <div style={{ width:'18px',height:'18px',borderRadius:'50%',flexShrink:0,marginTop:'2px',border:`2px solid ${sel===i?theme.accent:theme.border}`,background:sel===i?theme.accent:'transparent',display:'flex',alignItems:'center',justifyContent:'center' }}>
                    {sel===i&&<div style={{ width:'7px',height:'7px',borderRadius:'50%',background:'white' }}/>}
                  </div>
                  <div style={{ fontSize:'12px',color:theme.text,lineHeight:'1.6',whiteSpace:'pre-wrap' }}>{w}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding:'14px 20px',borderTop:`1px solid ${theme.border}`,display:'flex',gap:'9px',justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px',borderRadius:'8px',border:`1px solid ${theme.border}`,background:'transparent',color:theme.text,cursor:'pointer',fontSize:'13px' }}>Cancel</button>
          <button onClick={async()=>{ setBusy(true); await onSend(person,wishes[sel]); setBusy(false); onClose(); }} disabled={busy} style={{ padding:'9px 20px',borderRadius:'8px',border:'none',background:theme.accent,color:'#fff',cursor:'pointer',fontSize:'13px',fontWeight:'600',opacity:busy?.7:1 }}>
            {busy?'Sending...':'💬 Send in Chat'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExamModal({ exam, theme, onClose, onSave }) {
  const blank = { institution:'MRU',exam_type:'midterm',title:'',start_date:'',end_date:'',session:'Even Semester 2026' };
  const [f, setF] = useState(exam ? { ...exam, start_date: exam.start_date?.slice(0,10), end_date: exam.end_date?.slice(0,10) } : blank);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const inp = { width:'100%',padding:'8px 11px',borderRadius:'8px',fontSize:'13px',border:`1px solid ${theme.border}`,background:theme.bg,color:theme.text,boxSizing:'border-box' };
  const save = async () => {
    if(!f.start_date||!f.end_date){setErr('Start and end dates required');return;}
    if(new Date(f.end_date)<new Date(f.start_date)){setErr('End date must be after start date');return;}
    setBusy(true); setErr('');
    try { await onSave(f); onClose(); } catch(e){ setErr(e.message); }
    setBusy(false);
  };
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'20px' }} onClick={onClose}>
      <div style={{ background:theme.card,borderRadius:'14px',width:'100%',maxWidth:'400px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px 12px',borderBottom:`1px solid ${theme.border}`,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div style={{ fontWeight:'700',fontSize:'15px',color:theme.text }}>{exam?'Edit':'Add'} Exam Dates</div>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:'18px',cursor:'pointer',color:theme.subtext }}>✕</button>
        </div>
        <div style={{ padding:'16px 20px',display:'flex',flexDirection:'column',gap:'12px' }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px' }}>
            <div>
              <label style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,display:'block',marginBottom:'4px',textTransform:'uppercase' }}>Institution</label>
              <select value={f.institution} onChange={e=>setF({...f,institution:e.target.value})} style={inp}><option value="MRU">MRU</option><option value="MRIIRS">MRIIRS</option></select>
            </div>
            <div>
              <label style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,display:'block',marginBottom:'4px',textTransform:'uppercase' }}>Exam Type</label>
              <select value={f.exam_type} onChange={e=>setF({...f,exam_type:e.target.value})} style={inp}><option value="midterm">Mid Term</option><option value="endterm">End Term</option></select>
            </div>
          </div>
          <div>
            <label style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,display:'block',marginBottom:'4px',textTransform:'uppercase' }}>Session</label>
            <input value={f.session} onChange={e=>setF({...f,session:e.target.value})} style={inp} placeholder="Even Semester 2026"/>
          </div>
          <div>
            <label style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,display:'block',marginBottom:'4px',textTransform:'uppercase' }}>Title (optional)</label>
            <input value={f.title} onChange={e=>setF({...f,title:e.target.value})} style={inp} placeholder="e.g. Minor Test 1"/>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px' }}>
            <div>
              <label style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,display:'block',marginBottom:'4px',textTransform:'uppercase' }}>Start Date</label>
              <input type="date" value={f.start_date} onChange={e=>setF({...f,start_date:e.target.value})} style={inp}/>
            </div>
            <div>
              <label style={{ fontSize:'11px',fontWeight:'700',color:theme.subtext,display:'block',marginBottom:'4px',textTransform:'uppercase' }}>End Date</label>
              <input type="date" value={f.end_date} onChange={e=>setF({...f,end_date:e.target.value})} style={inp}/>
            </div>
          </div>
          {err&&<div style={{ background:'#fee2e2',color:'#dc2626',padding:'8px 11px',borderRadius:'7px',fontSize:'12px' }}>⚠️ {err}</div>}
        </div>
        <div style={{ padding:'12px 20px 16px',borderTop:`1px solid ${theme.border}`,display:'flex',gap:'9px',justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'8px 16px',borderRadius:'8px',border:`1px solid ${theme.border}`,background:'transparent',color:theme.text,cursor:'pointer',fontSize:'13px' }}>Cancel</button>
          <button onClick={save} disabled={busy} style={{ padding:'8px 18px',borderRadius:'8px',border:'none',background:theme.accent,color:'#fff',cursor:'pointer',fontSize:'13px',fontWeight:'600',opacity:busy?.7:1 }}>
            {busy?'Saving…':exam?'Update':'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}



// ── DAILY QUOTE ──────────────────────────────────────
const GITA_QUOTES = [
  {
    original: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥',
    hindi: 'कर्म करते रहो, फल की चिंता मत करो।',
    english: 'You have a right to perform your duty, but not to the fruits of your actions.',
    ref: 'Bhagavad Gita 2.47'
  },
  {
    original: 'योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय। सिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते॥',
    hindi: 'सफलता और असफलता में समभाव रखकर कर्म करो — यही योग है।',
    english: 'Perform your actions with equanimity, abandoning attachment to success or failure.',
    ref: 'Bhagavad Gita 2.48'
  },
  {
    original: 'श्रद्धावाँल्लभते ज्ञानं तत्परः संयतेन्द्रियः। ज्ञानं लब्ध्वा परां शान्तिमचिरेणाधिगच्छति॥',
    hindi: 'जो श्रद्धा और लगन से ज्ञान प्राप्त करता है, उसे शीघ्र ही परम शांति मिलती है।',
    english: 'One who has faith and devotion quickly attains supreme peace through knowledge.',
    ref: 'Bhagavad Gita 4.39'
  },
  {
    original: 'नैनं छिन्दन्ति शस्त्राणि नैनं दहति पावकः। न चैनं क्लेदयन्त्यापो न शोषयति मारुतः॥',
    hindi: 'आत्मा को न शस्त्र काट सकते हैं, न अग्नि जला सकती है — वह अविनाशी है।',
    english: 'The soul cannot be cut, burned, wetted, or dried — it is eternal and immovable.',
    ref: 'Bhagavad Gita 2.23'
  },
  {
    original: 'उद्धरेदात्मनात्मानं नात्मानमवसादयेत्। आत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः॥',
    hindi: 'अपना उद्धार स्वयं करो, स्वयं को कभी हीन मत समझो — तुम ही अपने मित्र हो, तुम ही शत्रु।',
    english: 'Lift yourself up — you are your own best friend and your own worst enemy.',
    ref: 'Bhagavad Gita 6.5'
  },
  {
    original: 'सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज। अहं त्वा सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः॥',
    hindi: 'सब कुछ छोड़ कर मेरी शरण में आओ — मैं तुम्हें सभी पापों से मुक्त करूंगा।',
    english: 'Surrender unto Me alone. I shall liberate you from all sins — do not grieve.',
    ref: 'Bhagavad Gita 18.66'
  },
  {
    original: 'यदा यदा हि धर्मस्य ग्लानिर्भवति भारत। अभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम्॥',
    hindi: 'जब-जब धर्म का पतन होता है, तब-तब मैं अवतार लेता हूं।',
    english: 'Whenever righteousness declines and evil rises, I manifest myself on earth.',
    ref: 'Bhagavad Gita 4.7'
  },
  {
    original: 'मनुष्याणां सहस्रेषु कश्चिद्यतति सिद्धये। यततामपि सिद्धानां कश्चिन्मां वेत्ति तत्त्वतः॥',
    hindi: 'हजारों में कोई एक सिद्धि के लिए प्रयास करता है और उनमें से कोई एक ही मुझे वास्तव में जान पाता है।',
    english: 'Among thousands, barely one strives for perfection — and of those, barely one truly knows Me.',
    ref: 'Bhagavad Gita 7.3'
  },
  {
    original: 'अनन्याश्चिन्तयन्तो मां ये जनाः पर्युपासते। तेषां नित्याभियुक्तानां योगक्षेमं वहाम्यहम्॥',
    hindi: 'जो अनन्य भाव से मेरी उपासना करते हैं, उनका योगक्षेम मैं स्वयं वहन करता हूं।',
    english: 'For those who worship Me with devotion, I carry what they lack and preserve what they have.',
    ref: 'Bhagavad Gita 9.22'
  },
  {
    original: "समो'हं सर्वभूतेषु न मे द्वेष्योऽस्ति न प्रियः। ये भजन्ति तु मां भक्त्या मयि ते तेषु चाप्यहम्॥",
    hindi: 'मैं सभी प्राणियों में समान हूं — कोई मुझे प्रिय नहीं, कोई अप्रिय नहीं। जो मुझे भजते हैं, वे मुझमें हैं।',
    english: 'I am equal to all beings — none is hateful or dear to Me. But those who worship Me with devotion live in Me.',
    ref: 'Bhagavad Gita 9.29'
  },
  {
    original: 'ध्यायतो विषयान्पुंसः सङ्गस्तेषूपजायते। सङ्गात्सञ्जायते कामः कामात्क्रोधोऽभिजायते॥',
    hindi: 'विषयों के चिंतन से आसक्ति, आसक्ति से कामना, और कामना से क्रोध उत्पन्न होता है।',
    english: 'Thinking of sense objects breeds attachment; attachment breeds desire; desire breeds anger.',
    ref: 'Bhagavad Gita 2.62'
  },
  {
    original: 'विद्याविनयसम्पन्ने ब्राह्मणे गवि हस्तिनि। शुनि चैव श्वपाके च पण्डिताः समदर्शिनः॥',
    hindi: 'ज्ञानी पुरुष विद्वान, पशु और साधारण व्यक्ति — सभी में समान दृष्टि रखते हैं।',
    english: 'The wise see equally a learned scholar, a cow, an elephant, a dog, and an outcast.',
    ref: 'Bhagavad Gita 5.18'
  },
  {
    original: 'न हि ज्ञानेन सदृशं पवित्रमिह विद्यते।',
    hindi: 'इस संसार में ज्ञान के समान कोई पवित्र वस्तु नहीं है।',
    english: 'There is nothing in this world as purifying as knowledge.',
    ref: 'Bhagavad Gita 4.38'
  },
  {
    original: 'दुःखेष्वनुद्विग्नमनाः सुखेषु विगतस्पृहः। वीतरागभयक्रोधः स्थितधीर्मुनिरुच्यते॥',
    hindi: 'दुःख में विचलित न हो, सुख में लालायित न हो — जो राग, भय और क्रोध से मुक्त है, वही स्थितप्रज्ञ है।',
    english: 'Undisturbed in sorrow, not elated by joy, free from attachment and fear — such a person is a sage of steady wisdom.',
    ref: 'Bhagavad Gita 2.56'
  },
  {
    original: 'आत्मसंयमयोगाग्नौ जुह्वति ज्ञानदीपिते।',
    hindi: 'आत्म-संयम की अग्नि में, ज्ञान के प्रकाश से प्रज्वलित, समर्पण करो।',
    english: 'Offer your actions into the fire of self-discipline, illumined by the light of knowledge.',
    ref: 'Bhagavad Gita 4.27'
  },
  {
    original: 'ये हि संस्पर्शजा भोगा दुःखयोनय एव ते। आद्यन्तवन्तः कौन्तेय न तेषु रमते बुधः॥',
    hindi: 'इंद्रियों के भोग दुःख के ही स्रोत हैं, उनका अंत होता है — बुद्धिमान उनमें नहीं रमते।',
    english: 'Pleasures born of the senses are sources of suffering — they have a beginning and end. The wise do not delight in them.',
    ref: 'Bhagavad Gita 5.22'
  },
  {
    original: 'जातस्य हि ध्रुवो मृत्युर्ध्रुवं जन्म मृतस्य च। तस्मादपरिहार्येऽर्थे न त्वं शोचितुमर्हसि॥',
    hindi: 'जो जन्मा है उसकी मृत्यु निश्चित है — इस अपरिहार्य सत्य के लिए शोक मत करो।',
    english: 'Death is certain for the born, and rebirth is certain for the dead. Grieve not over what is inevitable.',
    ref: 'Bhagavad Gita 2.27'
  },
  {
    original: 'नायमात्मा बलहीनेन लभ्यः।',
    hindi: 'यह आत्मा बलहीन व्यक्ति को प्राप्त नहीं होती।',
    english: 'The Self cannot be attained by the weak — it requires strength of spirit.',
    ref: 'Bhagavad Gita / Upanishad'
  },
  {
    original: 'तेजस्विनावधीतमस्तु मा विद्विषावहै।',
    hindi: 'हम दोनों साथ पढ़ें, साथ बढ़ें, कभी द्वेष न हो।',
    english: 'May our learning be brilliant. May we never have enmity between us.',
    ref: 'Shanti Mantra (Taittiriya Upanishad)'
  },
  {
    original: 'सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः। सर्वे भद्राणि पश्यन्तु मा कश्चिद्दुःखभाग्भवेत्॥',
    hindi: 'सभी सुखी हों, सभी रोगमुक्त हों, सभी का कल्याण हो, कोई दुःखी न हो।',
    english: 'May all be happy. May all be free from illness. May all see auspiciousness. May none suffer.',
    ref: 'Brihadaranyaka Upanishad'
  },
];

const GURBANI_QUOTES = [
  {
    original: 'ਇਕ ਓਅੰਕਾਰ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ ਨਿਰਵੈਰੁ।',
    hindi: 'एक ईश्वर है, सत्य उसका नाम है, वह निडर और निर्वैर है।',
    english: 'One God exists — Truth is His Name. He is fearless and without enmity.',
    ref: 'Guru Granth Sahib — Japji Sahib (Mool Mantar)'
  },
  {
    original: 'ਸੇਵਾ ਕਰਤ ਹੋਇ ਨਿਹਕਾਮੀ। ਤਿਸ ਕਉ ਹੋਤ ਪਰਾਪਤਿ ਸੁਆਮੀ॥',
    hindi: 'जो निस्वार्थ सेवा करता है, उसे ही ईश्वर की प्राप्ति होती है।',
    english: 'One who serves selflessly, without desire — that person finds the Lord.',
    ref: 'Guru Granth Sahib — Sukhmani Sahib'
  },
  {
    original: 'ਮਨੁ ਜੀਤੈ ਜਗੁ ਜੀਤੁ।',
    hindi: 'मन को जीत लो, तो सारा जग जीत लोगे।',
    english: 'Conquer your mind, and you conquer the world.',
    ref: 'Guru Granth Sahib — Japji Sahib'
  },
  {
    original: 'ਨਾਨਕ ਨਾਮੁ ਚੜ੍ਹਦੀ ਕਲਾ। ਤੇਰੇ ਭਾਣੇ ਸਰਬਤ ਦਾ ਭਲਾ॥',
    hindi: 'हे नानक, ईश्वर के नाम से सदा उत्साह बना रहे — सबका भला हो।',
    english: 'O Nanak, may the Name keep us in high spirits — and may all of humanity be blessed.',
    ref: 'Guru Granth Sahib — Ardas'
  },
  {
    original: 'ਕਿਰਤੁ ਕਰੋ, ਨਾਮੁ ਜਪੋ, ਵੰਡ ਛਕੋ।',
    hindi: 'मेहनत करो, प्रभु का नाम जपो, और मिल-बांटकर खाओ।',
    english: "Work honestly, meditate on God's name, and share with others.",
    ref: 'Guru Nanak Dev Ji — Three Pillars of Sikhism'
  },
  {
    original: 'ਸਭੁ ਕੋ ਊਚਾ ਆਖੀਐ ਨੀਚੁ ਨ ਦੀਸੈ ਕੋਇ।',
    hindi: 'सभी को ऊंचा समझो, कोई नीचा नहीं है।',
    english: 'Call everyone exalted — none appears lowly.',
    ref: 'Guru Granth Sahib — Raag Dhanasari'
  },
  {
    original: 'ਅਵਲਿ ਅਲਹ ਨੂਰੁ ਉਪਾਇਆ ਕੁਦਰਤਿ ਕੇ ਸਭ ਬੰਦੇ। ਏਕ ਨੂਰ ਤੇ ਸਭੁ ਜਗੁ ਉਪਜਿਆ ਕਉਨੁ ਭਲੇ ਕੋ ਮੰਦੇ॥',
    hindi: 'पहले ईश्वर ने प्रकाश बनाया, फिर सब जीव बनाए — सब एक ही ज्योति से हैं, कौन ऊंचा कौन नीचा?',
    english: 'First, God created Light — then all of mankind. From one Light, all the world came forth — who then is high, who is low?',
    ref: 'Guru Granth Sahib — Raag Prabhaati'
  },
  {
    original: 'ਵਿਦਿਆ ਵੀਚਾਰੀ ਤਾਂ ਪਰਉਪਕਾਰੀ।',
    hindi: 'जो विद्या सोच-समझकर ग्रहण की जाए, वही दूसरों के काम आती है।',
    english: 'Knowledge gained through reflection enables one to serve others.',
    ref: 'Guru Granth Sahib'
  },
  {
    original: 'ਸੁਣਿਐ ਲਾਗੈ ਸਹਜਿ ਧਿਆਨੁ।',
    hindi: 'सुनने से ध्यान स्वतः लग जाता है।',
    english: 'By listening, the mind naturally falls into meditation.',
    ref: 'Guru Granth Sahib — Japji Sahib'
  },
  {
    original: 'ਮੈ ਕੋਈ ਬੁਰਾ ਨਹੀ, ਸਭ ਮਹਿ ਰਾਮੁ।',
    hindi: 'मुझे कोई बुरा नहीं लगता, क्योंकि सबमें ईश्वर है।',
    english: 'I see no one as evil — for God dwells within all.',
    ref: 'Guru Granth Sahib — Bhagat Kabir'
  },
  {
    original: 'ਹਉਮੈ ਦੀਰਘ ਰੋਗੁ ਹੈ ਦਾਰੂ ਭੀ ਇਸੁ ਮਾਹਿ।',
    hindi: 'अहंकार एक गंभीर बीमारी है — पर इसकी दवा भी इसी के भीतर है।',
    english: 'Ego is a chronic disease — but the cure for it also lies within.',
    ref: 'Guru Granth Sahib — Raag Vadhans'
  },
  {
    original: 'ਜਿਉ ਕਰਤਾ ਹਰਿ ਰਾਖੈ ਤਿਉ ਰਹੀਐ।',
    hindi: 'जैसे ईश्वर रखे, वैसे रहो — संतोष में ही शांति है।',
    english: 'Live as God keeps you — in contentment lies true peace.',
    ref: 'Guru Granth Sahib'
  },
];

function DailyQuote({ userName, theme }) {
  const isHarmeet = (userName||'').toLowerCase().includes('harmeet');
  const pool = isHarmeet ? GURBANI_QUOTES : GITA_QUOTES;

  // Pick quote based on day of year — changes daily, same all day
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(),0,0)) / 86400000);
  const quote = pool[dayOfYear % pool.length];

  const accentColor = isHarmeet ? '#f59e0b' : '#f97316';
  const bgColor     = isHarmeet ? '#fef3c7' : '#fff7ed';
  const borderColor = isHarmeet ? '#fcd34d' : '#fed7aa';
  const labelText   = isHarmeet ? '🪯 Gurbani — Daily Shabad' : '🕉️ Bhagavad Gita — Daily Shloka';

  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: '12px',
      padding: '10px 16px',
      maxWidth: '480px',
      maxHeight: '90px',
      overflowY: 'auto',
      flex: '1 1 300px',
    }}>
      <div style={{ fontSize:'9px', fontWeight:'700', color:accentColor, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:'5px' }}>
        {labelText}
      </div>
      <div style={{ fontSize:'12px', fontWeight:'600', color:'#1c1917', lineHeight:'1.5', marginBottom:'4px', fontFamily:'serif' }}>
        {quote.original}
      </div>
      <div style={{ fontSize:'11px', color:'#57534e', lineHeight:'1.5', marginBottom:'2px' }}>
        {quote.hindi}
      </div>
      <div style={{ fontSize:'11px', color:'#57534e', lineHeight:'1.5', marginBottom:'3px' }}>
        {quote.english}
      </div>
      <div style={{ fontSize:'9px', color:accentColor, fontWeight:'600' }}>{quote.ref}</div>
    </div>
  );
}

// ── CURRENT TASK BOX ─────────────────────────────────
function CurrentTaskBox({ task, theme, time }) {
  const SLOT_TIMES = ['9:00','9:50','10:40','11:30','12:20','1:10','2:00','2:50','3:40'];
  const nowMins = time.getHours()*60 + time.getMinutes();
  const inSlot = nowMins >= 540 && nowMins <= 990; // 9am - 4:30pm

  return (
    <div style={{
      background: task?.type === 'class' ? '#1e3a5f' : theme.card,
      border: `1px solid ${task?.type === 'class' ? '#1e3a5f' : theme.border}`,
      borderRadius:'12px', padding:'10px 16px', minWidth:'160px', maxWidth:'220px'
    }}>
      {task?.type === 'class' ? (
        <>
          <div style={{ fontSize:'10px', fontWeight:'700', color:'#93c5fd', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'2px' }}>
            🟢 In Class — Slot {task.slot}
          </div>
          <div style={{ fontWeight:'700', fontSize:'13px', color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{task.label}</div>
          <div style={{ fontSize:'11px', color:'#93c5fd', marginTop:'1px' }}>{task.sub}</div>
        </>
      ) : task?.type === 'todo' && task.label ? (
        <>
          <div style={{ fontSize:'10px', fontWeight:'700', color:theme.subtext, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'2px' }}>
            📋 Current Task
          </div>
          <div style={{ fontWeight:'700', fontSize:'13px', color:theme.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{task.label}</div>
          <div style={{ fontSize:'11px', color:theme.subtext, marginTop:'1px' }}>{task.sub}</div>
        </>
      ) : (
        <>
          <div style={{ fontSize:'10px', fontWeight:'700', color:theme.subtext, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'2px' }}>
            {inSlot ? '☕ Free Slot' : '🌙 Off Hours'}
          </div>
          <div style={{ fontWeight:'600', fontSize:'13px', color:theme.subtext }}>
            {inSlot ? 'No class right now' : 'No active slot'}
          </div>
          <div style={{ fontSize:'11px', color:theme.subtext, marginTop:'1px' }}>
            {time.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
          </div>
        </>
      )}
    </div>
  );
}

// ── WEATHER WIDGET ────────────────────────────────────────
const WAQI_TOKEN = '6072f52e0265d840351df7d128f8e1e8ec67f8b5';

function WeatherWidget({ theme }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    // Weather from Open-Meteo (free, no key needed)
    fetch('https://api.open-meteo.com/v1/forecast?latitude=28.4089&longitude=77.3178&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature&forecast_days=1&timezone=Asia/Kolkata')
      .then(r => r.json())
      .then(d => {
        const c = d.current;
        const wc = c.weather_code;
        let icon = '☀️', desc = 'Clear';
        if(wc === 0)       { icon='☀️'; desc='Clear Sky'; }
        else if(wc <= 2)   { icon='⛅'; desc='Partly Cloudy'; }
        else if(wc <= 3)   { icon='☁️'; desc='Overcast'; }
        else if(wc <= 49)  { icon='🌫️'; desc='Foggy'; }
        else if(wc <= 67)  { icon='🌧️'; desc='Rainy'; }
        else if(wc <= 77)  { icon='❄️'; desc='Snow'; }
        else if(wc <= 82)  { icon='🌦️'; desc='Showers'; }
        else if(wc <= 99)  { icon='⛈️'; desc='Thunderstorm'; }
        setWeather({ temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature), humidity: c.relative_humidity_2m, wind: Math.round(c.wind_speed_10m), icon, desc });
        setLoading(false);
      })
      .catch(() => { setError('Weather unavailable'); setLoading(false); });

    // AQI from WAQI — real CPCB government station data for Faridabad
    fetch(`https://api.waqi.info/feed/faridabad/?token=${WAQI_TOKEN}`)
      .then(r => r.json())
      .then(d => {
        if(d.status !== 'ok') return;
        const aqi = d.data?.aqi;
        const station = d.data?.city?.name || 'Faridabad';
        let aqiLabel = 'Good', aqiColor = '#10b981';
        if(aqi > 300)      { aqiLabel = 'Hazardous';         aqiColor = '#7c3aed'; }
        else if(aqi > 200) { aqiLabel = 'Very Unhealthy';    aqiColor = '#dc2626'; }
        else if(aqi > 150) { aqiLabel = 'Unhealthy';         aqiColor = '#ef4444'; }
        else if(aqi > 100) { aqiLabel = 'Unhealthy for Some';aqiColor = '#f59e0b'; }
        else if(aqi > 50)  { aqiLabel = 'Moderate';          aqiColor = '#f59e0b'; }
        setWeather(prev => prev ? { ...prev, aqi, aqiLabel, aqiColor, station } : prev);
      })
      .catch(() => {});
  }, []);

  if(loading) return (
    <div style={{ background:theme.card, borderRadius:'14px', border:`1px solid ${theme.border}`, padding:'14px 18px', display:'flex', alignItems:'center', gap:'10px' }}>
      <div style={{ fontSize:'24px' }}>🌤️</div>
      <div style={{ fontSize:'12px', color:theme.subtext }}>Loading weather…</div>
    </div>
  );
  if(error || !weather) return null;

  return (
    <div style={{ background:theme.card, borderRadius:'14px', border:`1px solid ${theme.border}`, padding:'12px 18px', display:'flex', alignItems:'center', gap:'14px', flexWrap:'wrap' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        <span style={{ fontSize:'28px' }}>{weather.icon}</span>
        <div>
          <div style={{ fontSize:'22px', fontWeight:'800', color:theme.text, lineHeight:1 }}>{weather.temp}°C</div>
          <div style={{ fontSize:'11px', color:theme.subtext, marginTop:'1px' }}>{weather.station||'Faridabad'} · {weather.desc}</div>
        </div>
      </div>
      <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'11px', color:theme.subtext }}>Feels</div>
          <div style={{ fontSize:'13px', fontWeight:'600', color:theme.text }}>{weather.feels}°C</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'11px', color:theme.subtext }}>Humidity</div>
          <div style={{ fontSize:'13px', fontWeight:'600', color:theme.text }}>{weather.humidity}%</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'11px', color:theme.subtext }}>Wind</div>
          <div style={{ fontSize:'13px', fontWeight:'600', color:theme.text }}>{weather.wind} km/h</div>
        </div>
        {weather.aqi && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'11px', color:theme.subtext }}>AQI</div>
            <div style={{ fontSize:'13px', fontWeight:'700', color:weather.aqiColor }}>{weather.aqi} · {weather.aqiLabel}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── WHO'S ONLINE ──────────────────────────────────────────
function OnlineUsers({ theme }) {
  const [presence, setPresence] = useState([]);
  const user = getUser();

  useEffect(() => {
    const load = () => api('/messages/presence').then(setPresence).catch(()=>{});
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const online = presence.filter(p => p.is_online && p.id !== parseInt(user?.id));
  const offline = presence.filter(p => !p.is_online && p.id !== parseInt(user?.id)).slice(0, 8);

  return (
    <div style={{ background:theme.card, borderRadius:'14px', border:`1px solid ${theme.border}`, overflow:'hidden' }}>
      <div style={{ padding:'12px 16px', borderBottom:`1px solid ${theme.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2 style={{ margin:0, fontSize:'14px', fontWeight:'700', color:theme.text }}>
          🟢 Who's Online
        </h2>
        <span style={{ background:'#d1fae5', color:'#065f46', padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>
          {online.length} online
        </span>
      </div>
      <div style={{ padding:'10px 12px', maxHeight:'200px', overflowY:'auto' }}>
        {online.length === 0 && offline.length === 0 ? (
          <div style={{ textAlign:'center', padding:'16px', color:theme.subtext, fontSize:'12px' }}>No presence data yet</div>
        ) : (
          <>
            {online.length > 0 && (
              <div style={{ marginBottom:'8px' }}>
                <div style={{ fontSize:'10px', fontWeight:'700', color:theme.subtext, marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Active Now</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                  {online.map(p => (
                    <div key={p.id} style={{ display:'flex', alignItems:'center', gap:'5px', background:'#d1fae5', borderRadius:'20px', padding:'4px 10px 4px 4px' }}>
                      <div style={{ position:'relative' }}>
                        {p.profile_picture
                          ? <img src={p.profile_picture} alt="" style={{ width:'22px', height:'22px', borderRadius:'50%', objectFit:'cover' }}/>
                          : <div style={{ width:'22px', height:'22px', borderRadius:'50%', background:'#10b981', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', fontWeight:'700', color:'#fff' }}>{p.name?.[0]}</div>
                        }
                        <div style={{ position:'absolute', bottom:'-1px', right:'-1px', width:'7px', height:'7px', background:'#10b981', borderRadius:'50%', border:'1px solid white' }}/>
                      </div>
                      <span style={{ fontSize:'11px', fontWeight:'600', color:'#065f46' }}>{p.name.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {offline.length > 0 && (
              <div>
                <div style={{ fontSize:'10px', fontWeight:'700', color:theme.subtext, marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Recently Seen</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                  {offline.map(p => (
                    <div key={p.id} style={{ display:'flex', alignItems:'center', gap:'4px', background:theme.bg, borderRadius:'20px', padding:'3px 8px 3px 3px', border:`1px solid ${theme.border}` }}>
                      {p.profile_picture
                        ? <img src={p.profile_picture} alt="" style={{ width:'18px', height:'18px', borderRadius:'50%', objectFit:'cover' }}/>
                        : <div style={{ width:'18px', height:'18px', borderRadius:'50%', background:'#94a3b8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'8px', fontWeight:'700', color:'#fff' }}>{p.name?.[0]}</div>
                      }
                      <span style={{ fontSize:'11px', color:theme.subtext }}>{p.name.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── PENDING ACTIONS STRIP ─────────────────────────────────
function PendingActionsStrip({ theme }) {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('todo');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/todos/admin/pending-summary')
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const TABS = [
    { id:'todo',       label:'✅ To Do',           badge: data?.todo?.not_filled?.length || 0 },
    { id:'attendance', label:'📊 Attendance & LP',  badge: (data?.lesson_plans?.lp_pending_count || 0) + (data?.attendance?.pending_count || 0) },
    { id:'matrix',     label:'⚠️ Attendance Matrix', badge: data?.lesson_plans?.at_risk_count || 0 },
    { id:'mentorship', label:'🎓 Mentorship',        badge: data?.mentorship?.behind_count || 0 },
  ];

  const totalPending = TABS.reduce((s,t) => s + t.badge, 0);

  if(loading) return (
    <div style={{ background:theme.card, borderRadius:'14px', border:`1px solid ${theme.border}`, padding:'14px 18px', marginBottom:'18px' }}>
      <div style={{ fontSize:'12px', color:theme.subtext }}>Loading pending actions…</div>
    </div>
  );

  return (
    <div style={{ background:theme.card, borderRadius:'14px', border:`2px solid ${totalPending > 0 ? '#ef4444' : '#10b981'}`, marginBottom:'18px', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'12px 16px', background: totalPending > 0 ? '#fef2f2' : '#f0fdf4', borderBottom:`1px solid ${theme.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'16px' }}>{totalPending > 0 ? '🚨' : '✅'}</span>
          <span style={{ fontWeight:'700', fontSize:'14px', color: totalPending > 0 ? '#dc2626' : '#065f46' }}>
            {totalPending > 0 ? `${totalPending} Pending Actions` : 'All Clear — No Pending Actions'}
          </span>
        </div>
        <span style={{ fontSize:'11px', color:theme.subtext }}>Today · {new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}</span>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${theme.border}`, background:theme.bg }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex:1, padding:'9px 6px', border:'none', background:'transparent', cursor:'pointer',
            fontSize:'12px', fontWeight: activeTab===t.id ? '700' : '500',
            color: activeTab===t.id ? theme.accent : theme.subtext,
            borderBottom: activeTab===t.id ? `2px solid ${theme.accent}` : '2px solid transparent',
            display:'flex', alignItems:'center', justifyContent:'center', gap:'4px'
          }}>
            {t.label}
            {t.badge > 0 && (
              <span style={{ background:'#ef4444', color:'#fff', borderRadius:'20px', padding:'0px 5px', fontSize:'9px', fontWeight:'700', minWidth:'14px', textAlign:'center' }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ maxHeight:'200px', overflowY:'auto', padding:'10px 14px' }}>

        {/* TO DO TAB */}
        {activeTab === 'todo' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
              <div style={{ fontSize:'12px', color:theme.subtext }}>
                <span style={{ color:'#10b981', fontWeight:'600' }}>✅ {data?.todo?.submitted_count}/{data?.todo?.total} submitted</span>
                &nbsp;·&nbsp;
                <span style={{ color:'#f59e0b', fontWeight:'600' }}>📝 {data?.todo?.filled_count - data?.todo?.submitted_count} filled not submitted</span>
              </div>
            </div>
            {data?.todo?.not_filled?.length === 0 ? (
              <div style={{ textAlign:'center', padding:'12px', color:'#10b981', fontSize:'12px', fontWeight:'600' }}>🎉 All trainers have filled their To Do today!</div>
            ) : (
              <div>
                <div style={{ fontSize:'11px', fontWeight:'700', color:'#dc2626', marginBottom:'6px' }}>Not filled today ({data.todo.not_filled.length}):</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                  {data.todo.not_filled.map((t,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'5px', background:'#fee2e2', borderRadius:'20px', padding:'3px 10px 3px 4px' }}>
                      {t.pic
                        ? <img src={t.pic} alt="" style={{ width:'18px', height:'18px', borderRadius:'50%', objectFit:'cover' }}/>
                        : <div style={{ width:'18px', height:'18px', borderRadius:'50%', background:'#ef4444', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'8px', fontWeight:'700', color:'#fff' }}>{t.name?.[0]}</div>
                      }
                      <span style={{ fontSize:'11px', color:'#991b1b', fontWeight:'500' }}>{t.name.split(' ').slice(0,2).join(' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ATTENDANCE & LP TAB */}
        {activeTab === 'attendance' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {data?.attendance?.pending_count > 0 && (
              <div>
                <div style={{ fontSize:'11px', fontWeight:'700', color:'#dc2626', marginBottom:'5px' }}>📊 Attendance not marked today ({data.attendance.pending_count} sessions):</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
                  {data.attendance.pending_sessions.slice(0,8).map((s,i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 8px', background:theme.bg, borderRadius:'6px', fontSize:'11px' }}>
                      <span style={{ color:theme.text, fontWeight:'500' }}>{s.trainer_name}</span>
                      <span style={{ color:theme.subtext }}>{s.class_name} · Slot {s.slot_number}</span>
                    </div>
                  ))}
                  {data.attendance.pending_sessions.length > 8 && <div style={{ fontSize:'11px', color:theme.subtext, textAlign:'center' }}>+{data.attendance.pending_sessions.length - 8} more</div>}
                </div>
              </div>
            )}
            {data?.lesson_plans?.lp_pending_count > 0 && (
              <div>
                <div style={{ fontSize:'11px', fontWeight:'700', color:'#f59e0b', marginBottom:'5px' }}>📒 Lesson plans not uploaded ({data.lesson_plans.lp_pending_count} sections):</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                  {[...new Set(data.lesson_plans.lp_pending.map(l => l.trainer_name))].map((name,i) => (
                    <span key={i} style={{ background:'#fef3c7', color:'#92400e', borderRadius:'20px', padding:'2px 8px', fontSize:'11px', fontWeight:'500' }}>{name.split(' ')[0]}</span>
                  ))}
                </div>
              </div>
            )}
            {data?.lesson_plans?.students_pending_count > 0 && (
              <div>
                <div style={{ fontSize:'11px', fontWeight:'700', color:'#8b5cf6', marginBottom:'5px' }}>👥 Student lists not uploaded ({data.lesson_plans.students_pending_count} sections):</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                  {[...new Set(data.lesson_plans.students_pending.map(l => l.trainer_name))].map((name,i) => (
                    <span key={i} style={{ background:'#ede9fe', color:'#5b21b6', borderRadius:'20px', padding:'2px 8px', fontSize:'11px', fontWeight:'500' }}>{name.split(' ')[0]}</span>
                  ))}
                </div>
              </div>
            )}
            {data?.attendance?.pending_count === 0 && data?.lesson_plans?.lp_pending_count === 0 && data?.lesson_plans?.students_pending_count === 0 && (
              <div style={{ textAlign:'center', padding:'12px', color:'#10b981', fontSize:'12px', fontWeight:'600' }}>🎉 All attendance marked and lesson plans uploaded!</div>
            )}
          </div>
        )}

        {/* ATTENDANCE MATRIX TAB */}
        {activeTab === 'matrix' && (
          <div>
            {data?.lesson_plans?.at_risk_count === 0 ? (
              <div style={{ textAlign:'center', padding:'12px', color:'#10b981', fontSize:'12px', fontWeight:'600' }}>🎉 No sections with critical attendance issues!</div>
            ) : (
              <div>
                <div style={{ fontSize:'11px', fontWeight:'700', color:'#dc2626', marginBottom:'6px' }}>Sections with students below 40% attendance:</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
                  {data.lesson_plans.at_risk_sections.map((s,i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 8px', background: i%2===0?theme.bg:theme.card, borderRadius:'6px', fontSize:'11px', border:`1px solid ${theme.border}` }}>
                      <div>
                        <span style={{ fontWeight:'600', color:theme.text }}>{s.section_name}</span>
                        <span style={{ color:theme.subtext, marginLeft:'6px' }}>{s.domain} · {s.trainer_name.split(' ')[0]}</span>
                      </div>
                      <span style={{ background:'#fee2e2', color:'#991b1b', padding:'2px 7px', borderRadius:'10px', fontWeight:'700' }}>
                        {s.critical_count}/{s.total_students} critical
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MENTORSHIP TAB */}
        {activeTab === 'mentorship' && (
          <div>
            {data?.mentorship?.mentors?.length === 0 ? (
              <div style={{ textAlign:'center', padding:'12px', color:theme.subtext, fontSize:'12px' }}>No mentorship data yet — import student data in CMP 2026</div>
            ) : (
              <div>
                <div style={{ fontSize:'11px', color:theme.subtext, marginBottom:'6px' }}>
                  Mentor compliance this month — interaction progress:
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
                  {data.mentorship.mentors.map((m,i) => {
                    const pct = parseInt(m.total_mentees) > 0 ? Math.round(parseInt(m.met_count) / parseInt(m.total_mentees) * 100) : 0;
                    const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
                    return (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 6px' }}>
                        <span style={{ fontSize:'11px', color:theme.text, minWidth:'100px', fontWeight:'500' }}>{m.mentor_name.split(' ').slice(0,2).join(' ')}</span>
                        <div style={{ flex:1, height:'6px', background:theme.bg, borderRadius:'3px', border:`1px solid ${theme.border}` }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:'3px', transition:'width 0.5s' }}/>
                        </div>
                        <span style={{ fontSize:'11px', fontWeight:'700', color, minWidth:'45px', textAlign:'right' }}>{m.met_count}/{m.total_mentees}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { theme } = useOutletContext();
  const user = getUser();
  const navigate = useNavigate();
  const isSA = user?.role === 'super_admin';

  const [currentData, setCurrentData] = useState(null);
  const [stats,       setStats]       = useState(null);
  const [notices,     setNotices]     = useState([]);
  const [profiles,    setProfiles]    = useState([]);
  const [exams,       setExams]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [todoData,    setTodoData]    = useState(null);
  const [time,        setTime]        = useState(new Date());

  const [wishPerson,  setWishPerson]  = useState(null);
  const [examModal,   setExamModal]   = useState(null);
  const [examTab,     setExamTab]     = useState('MRU');

  useEffect(()=>{ const t=setInterval(()=>setTime(new Date()),1000); return()=>clearInterval(t); },[]);
  useEffect(()=>{ load(); const t=setInterval(load,60000); return()=>clearInterval(t); },[]);

  const load = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [cur,st,ntc,prof,ex,td] = await Promise.all([
        api('/timetable/current'),
        api('/reports/stats'),
        api('/notices'),
        api('/profile'),
        api('/exams'),
        api('/todos/date/' + today).catch(()=>null),
      ]);
      setCurrentData(cur); setStats(st); setNotices(ntc); setProfiles(prof); setExams(ex);
      // Find MY current slot from timetable
      const mySlot = (cur?.inClass||[]).find(t => t.trainer_id === parseInt(user?.id));
      if(mySlot) {
        setCurrentTask({ type:'class', label: mySlot.class_name, sub: mySlot.institution, slot: cur.currentSlot });
      } else if(td) {
        // Find current todo slot by time
        const nowMins = new Date().getHours()*60 + new Date().getMinutes();
        const slotRanges = [[540,590],[590,640],[640,690],[690,740],[740,790],[790,840],[840,890],[890,940],[940,990]];
        const slotIdx = slotRanges.findIndex(([s,e]) => nowMins>=s && nowMins<e);
        if(slotIdx >= 0 && td.slots?.[slotIdx]) {
          const slot = td.slots[slotIdx];
          setCurrentTask({ type:'todo', label: slot.task || (slot.is_class ? slot.class_name : null), sub: slot.slot_start?.slice(0,5)+' – '+slot.slot_end?.slice(0,5) });
        } else { setCurrentTask(null); }
      } else { setCurrentTask(null); }
      setTodoData(td);
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  };

  const bdays = profiles
    .map(p=>({...p, bi: getBirthdayInfo(p.birthday)}))
    .filter(p=>p.bi)
    .sort((a,b)=>a.bi.days - b.bi.days);

  const mruExams   = exams.filter(e=>e.institution==='MRU').sort((a,b)=>new Date(a.start_date)-new Date(b.start_date));
  const mriirExams = exams.filter(e=>e.institution==='MRIIRS').sort((a,b)=>new Date(a.start_date)-new Date(b.start_date));
  const visExams   = examTab==='MRU' ? mruExams : mriirExams;

  const today = DAYS[new Date().getDay()-1]||'Weekend';

  const instColor = inst => {
    if(!inst) return theme.accent;
    if(inst.includes('MRU'))    return '#3b82f6';
    if(inst.includes('MRIIRS')) return '#8b5cf6';
    if(inst.includes('CDOE'))   return '#f59e0b';
    return '#10b981';
  };

  const handleSendWish = async (person, message) => {
    try {
      const conv = await api('/messages/conversations',{ method:'POST', body:JSON.stringify({ type:'direct', member_ids:[person.id] }) });
      await api('/messages/send',{ method:'POST', body:JSON.stringify({ conversation_id:conv.id, content:message }) });
      navigate('/messages',{ state:{ openConvId:conv.id } });
    } catch(e) { console.error(e); navigate('/messages'); }
  };

  const examSave = async form => {
    if(form.id) { const up = await api(`/exams/${form.id}`,{method:'PUT',body:JSON.stringify(form)}); setExams(p=>p.map(e=>e.id===form.id?up:e)); }
    else { const cr = await api('/exams',{method:'POST',body:JSON.stringify(form)}); setExams(p=>[...p,cr]); }
  };
  const examDel = async id => {
    if(!window.confirm('Delete this exam entry?')) return;
    await api(`/exams/${id}`,{method:'DELETE'});
    setExams(p=>p.filter(e=>e.id!==id));
  };

  const fmtD = d => new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
  const isActive   = ex => { const t=new Date(); t.setHours(0,0,0,0); return t>=new Date(ex.start_date)&&t<=new Date(ex.end_date); };
  const isUpcoming = ex => { const t=new Date(); t.setHours(0,0,0,0); return new Date(ex.start_date)>t; };

  const card = { background:theme.card, borderRadius:'14px', boxShadow:'0 1px 4px rgba(0,0,0,0.07)', border:`1px solid ${theme.border}` };

  return (
    <div>
      {/* ── top bar ── */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px',gap:'16px',flexWrap:'wrap' }}>
        <div>
          <h1 style={{ margin:0,fontSize:'24px',fontWeight:'700',color:theme.text }}>
            Welcome back, {user?.name?.split(' ').slice(-1)[0]}! 👋
          </h1>
          <p style={{ margin:'4px 0 0',color:theme.subtext,fontSize:'14px' }}>
            {time.toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
          </p>
        </div>
        <div style={{ display:'flex',gap:'8px',flexShrink:0,flexWrap:'wrap',alignItems:'center' }}>
          {/* Weather — for everyone */}
          <WeatherWidget theme={theme} />
          {[
            { href:'https://mrei.icloudems.com/',          label:'🖥️ EMS ↗',    dark:true },
            { href:'https://app.hrone.cloud/login',         label:'👔 HR One ↗', dark:false },
            { href:'https://drive.google.com/drive/my-drive',label:'📁 Drive ↗', dark:false },
          ].map(l=>(
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" style={{ display:'flex',alignItems:'center',gap:'5px',padding:'8px 12px',background:l.dark?'#1e3a5f':theme.card,color:l.dark?'#fff':theme.text,borderRadius:'9px',textDecoration:'none',fontSize:'12px',fontWeight:'600',border:l.dark?'none':`1px solid ${theme.border}` }}>
              {l.label}
            </a>
          ))}
        </div>
      </div>


      {/* ── stats ── */}
      {stats && (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'14px',marginBottom:'18px' }}>
          {[
            { label:'Total Trainers',  value:stats.total_trainers,  icon:'👥', c:'#3b82f6' },
            { label:'Weekly Classes',  value:stats.total_classes,   icon:'📚', c:'#8b5cf6' },
            { label:'Upcoming Duties', value:stats.upcoming_duties, icon:'📋', c:'#f59e0b' },
          ].map(s=>(
            <div key={s.label} style={{ ...card,padding:'16px 20px',display:'flex',alignItems:'center',gap:'14px' }}>
              <div style={{ width:'42px',height:'42px',borderRadius:'11px',background:s.c+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px' }}>{s.icon}</div>
              <div>
                <div style={{ fontSize:'26px',fontWeight:'700',color:theme.text,lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:'12px',color:theme.subtext,marginTop:'2px' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* ── full width — in class + announcements ── */}
      <div style={{ display:'flex',flexDirection:'column',gap:'16px' }}>
        <div style={{ ...card,padding:'18px 20px' }}>
          <h2 style={{ margin:'0 0 12px',fontSize:'15px',fontWeight:'700',color:theme.text }}>
            🟢 Currently In Class
            {currentData?.currentSlot && (
              <span style={{ marginLeft:'10px',fontSize:'11px',fontWeight:'500',background:'#dcfce7',color:'#16a34a',padding:'2px 9px',borderRadius:'20px' }}>
                Slot {currentData.currentSlot} · {SLOT_LABELS[currentData.currentSlot]}
              </span>
            )}
          </h2>
          {loading ? <p style={{ color:theme.subtext,margin:0 }}>Loading…</p>
            : !currentData?.inClass?.length ? (
              <div style={{ textAlign:'center',padding:'20px',color:theme.subtext,background:theme.bg,borderRadius:'10px' }}>
                <div style={{ fontSize:'28px',marginBottom:'5px' }}>☕</div>
                <p style={{ margin:0,fontSize:'12px' }}>{today==='Weekend'?'No classes on weekends':'No class in session right now'}</p>
              </div>
            ) : (
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:'8px' }}>
                {currentData.inClass.map(t=>(
                  <div key={t.id} style={{ border:`1px solid ${theme.border}`,borderRadius:'8px',padding:'10px 12px',borderLeft:`4px solid ${instColor(t.institution)}` }}>
                    <div style={{ fontWeight:'600',color:theme.text,fontSize:'13px' }}>{t.trainer_name}</div>
                    <div style={{ color:instColor(t.institution),fontSize:'12px',marginTop:'2px' }}>{t.class_name}</div>
                    <div style={{ color:theme.subtext,fontSize:'11px',marginTop:'1px' }}>{t.room&&`📍 ${t.room}`} {t.institution&&`· ${t.institution}`}</div>
                  </div>
                ))}
              </div>
            )}
        </div>

        <div style={{ ...card,overflow:'hidden' }}>
          <div style={{ padding:'12px 15px',borderBottom:`1px solid ${theme.border}`,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <h2 style={{ margin:0,fontSize:'14px',fontWeight:'700',color:theme.text }}>📌 Announcements</h2>
            <a href="/noticeboard" style={{ fontSize:'12px',color:theme.accent,textDecoration:'none',fontWeight:'600' }}>View all →</a>
          </div>
          <div style={{ maxHeight:'280px',overflowY:'auto' }}>
            {loading ? <div style={{ padding:'20px',textAlign:'center',color:theme.subtext,fontSize:'13px' }}>Loading…</div>
              : notices.length===0 ? (
                <div style={{ padding:'28px',textAlign:'center',color:theme.subtext }}>
                  <div style={{ fontSize:'26px',marginBottom:'6px' }}>📭</div>
                  <p style={{ margin:0,fontSize:'12px' }}>No announcements yet</p>
                </div>
              ) : notices.map(n=>{
                const cat=CATEGORIES.find(c=>c.id===n.category)||CATEGORIES[0];
                const urg=n.priority==='urgent', hi=n.priority==='high';
                return (
                  <div key={n.id} style={{ padding:'11px 13px',borderBottom:`1px solid ${theme.border}`,borderLeft:`3px solid ${urg?'#ef4444':hi?'#f59e0b':cat.color}` }}>
                    <div style={{ display:'flex',alignItems:'center',gap:'5px',marginBottom:'3px',flexWrap:'wrap' }}>
                      {urg&&<span style={{ background:'#fee2e2',color:'#dc2626',padding:'1px 6px',borderRadius:'20px',fontSize:'10px',fontWeight:'700' }}>🔴 URGENT</span>}
                      {hi&&<span style={{ background:'#fef3c7',color:'#92400e',padding:'1px 6px',borderRadius:'20px',fontSize:'10px',fontWeight:'700' }}>⬆️ HIGH</span>}
                      <span style={{ background:cat.color+'22',color:cat.color,padding:'1px 6px',borderRadius:'20px',fontSize:'10px',fontWeight:'600' }}>{cat.label}</span>
                    </div>
                    <div style={{ fontWeight:'600',fontSize:'12px',color:theme.text,marginBottom:'2px' }}>{n.title}</div>
                    <div style={{ fontSize:'11px',color:theme.subtext,lineHeight:'1.5',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden' }}>{n.content}</div>
                    <div style={{ display:'flex',alignItems:'center',gap:'5px',marginTop:'5px' }}>
                      {n.author_pic?<img src={n.author_pic} alt="" style={{ width:'14px',height:'14px',borderRadius:'50%',objectFit:'cover' }}/>:<div style={{ width:'14px',height:'14px',borderRadius:'50%',background:theme.accent+'33',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'7px',fontWeight:'700',color:theme.accent }}>{n.author_name?.[0]}</div>}
                      <span style={{ fontSize:'10px',color:theme.subtext }}>{n.author_name}</span>
                      <span style={{ fontSize:'10px',color:theme.subtext,marginLeft:'auto' }}>🕐 {timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* ── bottom 3-col ── */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'16px',marginTop:'16px',alignItems:'start' }}>

        {/* Birthdays */}
        <div style={{ ...card,overflow:'hidden' }}>
          <div style={{ padding:'12px 14px',borderBottom:`1px solid ${theme.border}` }}>
            <h2 style={{ margin:'0 0 1px',fontSize:'14px',fontWeight:'700',color:theme.text }}>🎂 Birthdays This Month</h2>
            <p style={{ margin:0,fontSize:'10px',color:theme.subtext }}>Click to send wishes in chat</p>
          </div>
          <div style={{ maxHeight:'520px',overflowY:'auto' }}>
            {loading ? <div style={{ padding:'20px',textAlign:'center',color:theme.subtext,fontSize:'13px' }}>Loading…</div>
              : bdays.length===0 ? (
                <div style={{ padding:'24px',textAlign:'center',color:theme.subtext }}>
                  <div style={{ fontSize:'28px',marginBottom:'5px' }}>🎈</div>
                  <p style={{ margin:0,fontSize:'12px' }}>No birthdays this month</p>
                </div>
              ) : bdays.map(p=>{
                const isMe = p.id===user?.id;
                const isT  = p.bi.isToday;
                return (
                  <div key={p.id}
                    onClick={()=>!isMe&&setWishPerson(p)}
                    style={{ padding:'10px 12px',borderBottom:`1px solid ${theme.border}`,cursor:isMe?'default':'pointer',background:isT?(theme.card==='#ffffff'?'#fffbeb':theme.bg):theme.card,borderLeft:isT?'3px solid #f59e0b':'3px solid transparent' }}
                    onMouseEnter={e=>{ if(!isMe) e.currentTarget.style.background=theme.bg; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background=isT?(theme.card==='#ffffff'?'#fffbeb':theme.bg):theme.card; }}
                  >
                    <div style={{ display:'flex',alignItems:'center',gap:'8px' }}>
                      {p.profile_picture ? <img src={p.profile_picture} alt="" style={{ width:'32px',height:'32px',borderRadius:'50%',objectFit:'cover',flexShrink:0 }}/> : <div style={{ width:'32px',height:'32px',borderRadius:'50%',background:theme.accent+'33',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:'700',color:theme.accent,flexShrink:0 }}>{p.name[0]}</div>}
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontWeight:isT?'800':'600',fontSize:isT?'13px':'12px',color:theme.text,display:'flex',alignItems:'center',gap:'4px' }}>
                          {p.name.split(' ').slice(0,2).join(' ')}
                          {isT&&<span style={{ fontSize:'13px' }}>🎉</span>}
                          {isMe&&<span style={{ fontSize:'10px',color:theme.accent }}>(You)</span>}
                        </div>
                        <div style={{ fontSize:'10px',color:theme.subtext,marginTop:'1px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{p.designation||'Trainer'}</div>
                      </div>
                      <div style={{ flexShrink:0,textAlign:'right' }}>
                        <span style={{ background:isT?'#fef3c7':'#f0fdf4',color:isT?'#92400e':'#166534',padding:'2px 6px',borderRadius:'20px',fontSize:'10px',fontWeight:'700',whiteSpace:'nowrap' }}>{p.bi.label}</span>
                        <div style={{ fontSize:'10px',color:theme.subtext,marginTop:'1px' }}>{fmtBDay(p.birthday)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Exam Dates */}
        <div style={{ ...card,overflow:'hidden' }}>
          <div style={{ padding:'12px 14px',borderBottom:`1px solid ${theme.border}`,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <h2 style={{ margin:0,fontSize:'14px',fontWeight:'700',color:theme.text }}>📅 Exam Dates</h2>
            {isSA&&<button onClick={()=>setExamModal('add')} style={{ background:theme.accent,color:'#fff',border:'none',borderRadius:'7px',padding:'4px 9px',fontSize:'12px',fontWeight:'600',cursor:'pointer' }}>+ Add</button>}
          </div>
          <div style={{ display:'flex',borderBottom:`1px solid ${theme.border}` }}>
            {['MRU','MRIIRS'].map(t=>(
              <button key={t} onClick={()=>setExamTab(t)} style={{ flex:1,padding:'7px',border:'none',background:'transparent',cursor:'pointer',fontSize:'12px',fontWeight:examTab===t?'700':'500',color:examTab===t?theme.accent:theme.subtext,borderBottom:examTab===t?`2px solid ${theme.accent}`:'2px solid transparent' }}>{t}</button>
            ))}
          </div>
          <div style={{ maxHeight:'480px',overflowY:'auto' }}>
            {loading ? <div style={{ padding:'20px',textAlign:'center',color:theme.subtext,fontSize:'13px' }}>Loading…</div>
              : visExams.length===0 ? (
                <div style={{ padding:'24px',textAlign:'center',color:theme.subtext }}>
                  <div style={{ fontSize:'26px',marginBottom:'5px' }}>📭</div>
                  <p style={{ margin:'0 0 7px',fontSize:'12px' }}>No exam dates added yet</p>
                  {isSA&&<button onClick={()=>setExamModal('add')} style={{ background:theme.accent+'22',color:theme.accent,border:`1px solid ${theme.accent}`,borderRadius:'7px',padding:'4px 10px',fontSize:'12px',cursor:'pointer',fontWeight:'600' }}>+ Add Dates</button>}
                </div>
              ) : (
                <div style={{ padding:'8px 10px',display:'flex',flexDirection:'column',gap:'5px' }}>
                  {['midterm','endterm'].map(type=>{
                    const group = visExams.filter(e=>e.exam_type===type);
                    if(!group.length) return null;
                    return (
                      <div key={type}>
                        <div style={{ fontSize:'10px',fontWeight:'700',color:theme.subtext,textTransform:'uppercase',letterSpacing:'0.5px',margin:'7px 0 4px' }}>
                          {type==='midterm'?'📝 Mid Term':'📋 End Term'}
                        </div>
                        {group.map(ex=>{
                          const act=isActive(ex), up=isUpcoming(ex), done=!act&&!up;
                          return (
                            <div key={ex.id} style={{ padding:'9px 10px',borderRadius:'8px',marginBottom:'3px',border:`1px solid ${act?'#f59e0b':up?theme.accent:theme.border}`,background:act?'#fef3c7':theme.bg,opacity:done?.55:1 }}>
                              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'4px' }}>
                                <div style={{ flex:1 }}>
                                  {act&&<span style={{ background:'#f59e0b',color:'#fff',padding:'1px 6px',borderRadius:'20px',fontSize:'10px',fontWeight:'700',display:'inline-block',marginBottom:'3px' }}>🔴 ONGOING</span>}
                                  {up&&<span style={{ background:theme.accent+'22',color:theme.accent,padding:'1px 6px',borderRadius:'20px',fontSize:'10px',fontWeight:'700',display:'inline-block',marginBottom:'3px' }}>🔜 Upcoming</span>}
                                  {done&&<span style={{ background:'#94a3b822',color:theme.subtext,padding:'1px 6px',borderRadius:'20px',fontSize:'10px',fontWeight:'600',display:'inline-block',marginBottom:'3px' }}>✓ Done</span>}
                                  {ex.title&&<div style={{ fontWeight:'600',fontSize:'12px',color:theme.text,marginBottom:'1px' }}>{ex.title}</div>}
                                  <div style={{ fontSize:'10px',color:theme.subtext }}>{ex.session}</div>
                                  <div style={{ fontSize:'11px',fontWeight:'600',color:act?'#92400e':theme.text,marginTop:'3px' }}>📆 {fmtD(ex.start_date)} → {fmtD(ex.end_date)}</div>
                                </div>
                                {isSA&&(
                                  <div style={{ display:'flex',gap:'2px',flexShrink:0 }}>
                                    <button onClick={()=>setExamModal(ex)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:'12px',padding:'2px',color:theme.subtext }}>✏️</button>
                                    <button onClick={()=>examDel(ex.id)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:'12px',padding:'2px',color:'#ef4444' }}>🗑️</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        </div>

        {/* To Do */}
        <div style={{ ...card,overflow:'hidden' }}>
          <div style={{ padding:'12px 14px',borderBottom:`1px solid ${theme.border}`,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <h2 style={{ margin:0,fontSize:'14px',fontWeight:'700',color:theme.text }}>✅ My To Do — Today</h2>
            <a href="/todo" style={{ fontSize:'12px',color:theme.accent,textDecoration:'none',fontWeight:'600' }}>Full view →</a>
          </div>
          <div style={{ maxHeight:'480px',overflowY:'auto' }}>
            {!todoData ? (
              <div style={{ padding:'24px',textAlign:'center',color:theme.subtext }}>
                <div style={{ fontSize:'26px',marginBottom:'7px' }}>📝</div>
                <p style={{ margin:'0 0 9px',fontSize:'12px' }}>No To Do filled for today yet</p>
                <a href="/todo" style={{ background:theme.accent,color:'#fff',padding:'6px 12px',borderRadius:'8px',textDecoration:'none',fontSize:'12px',fontWeight:'600' }}>Fill To Do →</a>
              </div>
            ) : (
              <div>
                <div style={{ padding:'9px 12px',background:theme.bg,borderBottom:`1px solid ${theme.border}`,fontSize:'11px',color:theme.subtext }}>
                  Punch-in: <strong style={{ color:theme.text }}>{todoData.punch_in_time?.slice(0,5)||'—'}</strong>
                  {todoData.submitted_at && <span style={{ marginLeft:'10px',color:'#10b981',fontWeight:'600' }}>✅ Submitted</span>}
                </div>
                {(todoData.slots||[]).map((slot,i)=>(
                  <div key={slot.id} style={{ padding:'8px 12px',borderBottom:`1px solid ${theme.border}`,background:i%2===0?'transparent':theme.bg+'80' }}>
                    <div style={{ display:'flex',alignItems:'flex-start',gap:'7px' }}>
                      <div style={{ flexShrink:0,marginTop:'1px' }}>
                        {slot.is_class
                          ? <span style={{ background:'#dbeafe',color:'#1e40af',padding:'1px 5px',borderRadius:'4px',fontSize:'9px',fontWeight:'700' }}>CLASS</span>
                          : <span style={{ background:theme.bg,color:theme.subtext,padding:'1px 5px',borderRadius:'4px',fontSize:'9px',fontWeight:'600',border:`1px solid ${theme.border}` }}>FREE</span>
                        }
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:'10px',color:theme.subtext }}>{slot.slot_start?.slice(0,5)}–{slot.slot_end?.slice(0,5)}</div>
                        <div style={{ fontSize:'11px',color:theme.text,marginTop:'1px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                          {slot.is_class ? (slot.class_name||'Class') : (slot.task||<span style={{ color:theme.subtext,fontStyle:'italic' }}>Not filled</span>)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── modals ── */}
      {wishPerson&&<WishModal person={wishPerson} sender={user?.name||'CDC Team'} theme={theme} onClose={()=>setWishPerson(null)} onSend={handleSendWish}/>}
      {examModal&&<ExamModal exam={examModal==='add'?null:examModal} theme={theme} onClose={()=>setExamModal(null)} onSave={examSave}/>}
    </div>
  );
}
