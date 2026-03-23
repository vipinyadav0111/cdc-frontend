import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const STATS = [
  { target: 1000, suffix: '+', label: 'Job Offers (2024)' },
  { target: 290,  suffix: '+', label: 'Companies Visited' },
  { target: 85,   suffix: '%', label: 'Placement Rate'    },
  { target: 60,   suffix: 'L', label: 'Highest Package'   },
];

const TICKER_ITEMS = [
  '🏆 QS 5-Star Rating for Employability',
  '📈 85% Placement Rate — 2024',
  '🏢 290+ Companies | 1000+ Job Offers',
  '💰 Highest Package: ₹60 LPA',
  '🎓 549 Pre-Placement Offers — 2023',
  '🌟 Top Recruiters: TCS · Accenture · Wipro · Capgemini · HCL · Amazon',
  '📊 Median Package: ₹5.5 LPA (NIRF 2024)',
];

const COMPANIES = ['TCS','Accenture','Wipro','Capgemini','HCL','Amazon','Infosys','Google','Nokia','Coforge','IBM','Genpact'];

const BARS = [
  { label:'Soft Skills',  pct:92, color:'#3b82f6' },
  { label:'Aptitude',     pct:87, color:'#10b981' },
  { label:'Technical',    pct:83, color:'#f59e0b' },
  { label:'Communication',pct:95, color:'#8b5cf6' },
];

function useCountUp(target, duration = 1600, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now() + delay;
    const tick = (now) => {
      const elapsed = Math.max(0, now - start);
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    const timeout = setTimeout(() => { raf = requestAnimationFrame(tick); }, delay);
    return () => { clearTimeout(timeout); cancelAnimationFrame(raf); };
  }, [target, duration, delay]);
  return val;
}

function AnimStat({ target, suffix, label, delay }) {
  const val = useCountUp(target, 1600, delay);
  return (
    <div style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'12px', padding:'14px 16px' }}>
      <div style={{ fontSize:'26px', fontWeight:'800', color:'#fff', lineHeight:1, fontFamily:'Segoe UI,Arial,sans-serif' }}>
        {val}{suffix === 'L' ? <span style={{ fontSize:'16px', color:'#fbbf24' }}>L</span> : <span style={{ color:'#3b82f6' }}>{suffix}</span>}
      </div>
      <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'4px', textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
    </div>
  );
}

function AnimBar({ label, pct, color, delay }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), delay + 300);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div style={{ marginBottom:'10px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#94a3b8', marginBottom:'5px' }}>
        <span>{label}</span>
        <span style={{ color, fontWeight:'600' }}>{pct}%</span>
      </div>
      <div style={{ height:'5px', background:'rgba(255,255,255,0.1)', borderRadius:'3px', overflow:'hidden' }}>
        <div style={{ height:'100%', background:color, borderRadius:'3px', width:`${width}%`, transition:'width 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
    </div>
  );
}


const MD_PHOTO   = "data:image/jpeg;base64,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";
const HANU_PHOTO = "data:image/jpeg;base64,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";

const MESSAGES = [
  {
    photo: MD_PHOTO,
    name:  'Mr. Rajiv Kapoor',
    title: 'Managing Director & CEO, MREI',
    color: '#b91c1c',
    message: "At Manav Rachna, we don't just prepare students for jobs — we shape leaders for tomorrow. With MRIIRS ranked 55th globally and MRU recognised with the QS I-Gauge Diamond Rating, our academic excellence speaks for itself. The CDC is the engine driving this transformation — connecting talent with opportunity, building careers that last, and delivering outcomes that make our students and institution proud. I am confident that together, we will continue raising the bar every single year.",
  },
  {
    photo: HANU_PHOTO,
    name:  'Dr. Hanu Bhardwaj',
    title: 'Director — Career Development Centre, MREI',
    color: '#6d28d9',
    message: "At the Career Development Centre, our commitment is simple — to make every Manav Rachna student truly industry-ready. Through our four pillars of Aptitude, Verbal, Soft Skills and Technical training, we ensure students are not just qualified on paper but confident, capable and career-ready in the real world. Every session, every interaction, every lesson plan is a step towards a brighter future for our students. I am immensely proud of our dedicated team of trainers who bring this vision to life each day. Together, let us continue building futures — one student at a time.",
  },
];

function MessageCarousel() {
  const [idx,     setIdx]     = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx(i => (i + 1) % MESSAGES.length); setVisible(true); }, 600);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const msg = MESSAGES[idx];

  return (
    <div style={{ marginTop:'auto', paddingTop:'20px', position:'relative', zIndex:2 }}>
      <div style={{
        background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)',
        borderRadius:'14px', padding:'18px 20px',
        opacity: visible ? 1 : 0, transition:'opacity 0.6s ease',
      }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:'14px' }}>
          <div style={{ flexShrink:0 }}>
            <img src={msg.photo} alt={msg.name}
              style={{ width:'62px', height:'62px', borderRadius:'50%', objectFit:'cover', objectPosition:'top center',
                border:`2px solid ${msg.color}`, boxShadow:`0 0 0 3px ${msg.color}33` }} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:'10px', color:msg.color, fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'7px' }}>
              Message
            </div>
            <p style={{ margin:'0 0 10px', fontSize:'11.5px', color:'#cbd5e1', lineHeight:'1.7', fontStyle:'italic' }}>
              &ldquo;{msg.message}&rdquo;
            </p>
            <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:'8px' }}>
              <div style={{ fontSize:'12px', fontWeight:'700', color:'#fff' }}>{msg.name}</div>
              <div style={{ fontSize:'10px', color:'#64748b', marginTop:'2px' }}>{msg.title}</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'center', gap:'6px', marginTop:'10px' }}>
        {MESSAGES.map((_, i) => (
          <button key={i}
            onClick={() => { setVisible(false); setTimeout(()=>{ setIdx(i); setVisible(true); }, 300); }}
            style={{ width: i===idx ? '22px' : '7px', height:'7px', borderRadius:'4px', border:'none', cursor:'pointer',
              background: i===idx ? msg.color : 'rgba(255,255,255,0.2)', transition:'all 0.35s', padding:0 }} />
        ))}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tickerX, setTickerX] = useState(0);
  const tickerRef = useRef(null);
  const animRef = useRef(null);
  const posRef = useRef(0);

  // Smooth ticker
  useEffect(() => {
    const speed = 0.4;
    const animate = () => {
      posRef.current -= speed;
      if (tickerRef.current) {
        const w = tickerRef.current.scrollWidth / 2;
        if (Math.abs(posRef.current) >= w) posRef.current = 0;
        tickerRef.current.style.transform = `translateX(${posRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) return setError('Email and password are required');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed. Check your credentials.');
      } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate(data.user.must_change_password ? '/change-password' : '/dashboard');
      }
    } catch {
      setError('Cannot connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tickerContent = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:'Segoe UI,Arial,sans-serif', background:'#060e1a' }}>

      {/* ── LEFT PANEL ── */}
      <div style={{ flex:'1 1 0', background:'linear-gradient(160deg,#0a1628 0%,#0f2240 50%,#0a1a34 100%)', display:'flex', flexDirection:'column', padding:'40px 44px', position:'relative', overflow:'hidden', minWidth:0 }}>

        {/* Background orbs */}
        {[
          { w:320, h:320, bg:'#1d4ed8', top:'-80px', right:'-60px', opacity:0.06 },
          { w:200, h:200, bg:'#10b981', bottom:'60px', left:'-40px', opacity:0.06 },
          { w:160, h:160, bg:'#8b5cf6', top:'45%', right:'10%', opacity:0.04 },
        ].map((o, i) => (
          <div key={i} style={{ position:'absolute', width:o.w, height:o.h, borderRadius:'50%', background:o.bg, top:o.top, bottom:o.bottom, left:o.left, right:o.right, opacity:o.opacity, pointerEvents:'none' }} />
        ))}

        {/* Brand */}
        <div style={{ marginBottom:'36px', position:'relative', zIndex:2 }}>
          <div style={{ width:'48px', height:'48px', background:'#1d4ed8', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', marginBottom:'14px' }}>🎓</div>
          <div style={{ fontSize:'20px', fontWeight:'700', color:'#fff' }}>CDC Management System</div>
          <div style={{ fontSize:'13px', color:'#64748b', marginTop:'3px' }}>Manav Rachna Educational Institutions</div>
        </div>

        {/* Ticker */}
        <div style={{ background:'rgba(29,78,216,0.15)', border:'1px solid rgba(29,78,216,0.3)', borderRadius:'8px', padding:'10px 14px', overflow:'hidden', marginBottom:'28px', position:'relative', zIndex:2 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'7px', height:'7px', background:'#3b82f6', borderRadius:'50%', flexShrink:0, animation:'pulse 1.5s infinite' }} />
            <div style={{ overflow:'hidden', flex:1 }}>
              <div ref={tickerRef} style={{ display:'flex', gap:'40px', whiteSpace:'nowrap', willChange:'transform' }}>
                {tickerContent.map((t, i) => (
                  <span key={i} style={{ fontSize:'12px', color:'#93c5fd', flexShrink:0 }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'28px', position:'relative', zIndex:2 }}>
          {STATS.map((s, i) => <AnimStat key={i} {...s} delay={i * 150} />)}
        </div>

        {/* Company logos */}
        <div style={{ position:'relative', zIndex:2 }}>
          <div style={{ fontSize:'11px', color:'#475569', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Our Recruiters</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'7px' }}>
            {COMPANIES.map(c => (
              <span key={c} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'6px', padding:'4px 10px', fontSize:'11px', color:'#94a3b8', fontWeight:'500' }}>{c}</span>
            ))}
          </div>
        </div>

        {/* Message Carousel */}
        <MessageCarousel />
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ width:'380px', flexShrink:0, background:'#fff', display:'flex', flexDirection:'column', justifyContent:'center', padding:'48px 40px' }}>

        {/* MR Logo mark */}
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ width:'60px', height:'60px', background:'#0f2240', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px', margin:'0 auto 14px' }}>🎓</div>
          <h1 style={{ margin:0, fontSize:'22px', fontWeight:'700', color:'#0f172a' }}>Welcome back</h1>
          <p style={{ margin:'5px 0 0', fontSize:'13px', color:'#64748b' }}>Sign in to CDC Management System</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom:'18px' }}>
            <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.4px' }}>Email Address</label>
            <input type="text" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your.email@mriu.edu.in" style={{ width:'100%', padding:'12px 14px', border:'2px solid #e5e7eb', borderRadius:'10px', fontSize:'14px', boxSizing:'border-box', outline:'none', fontFamily:'inherit', transition:'border-color 0.2s' }}
              onFocus={e=>e.target.style.borderColor='#1d4ed8'}
              onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
          </div>

          <div style={{ marginBottom:'24px' }}>
            <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.4px' }}>Password</label>
            <div style={{ position:'relative' }}>
              <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" style={{ width:'100%', padding:'12px 46px 12px 14px', border:'2px solid #e5e7eb', borderRadius:'10px', fontSize:'14px', boxSizing:'border-box', outline:'none', fontFamily:'inherit', transition:'border-color 0.2s' }}
                onFocus={e=>e.target.style.borderColor='#1d4ed8'}
                onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
              <button type="button" onClick={()=>setShowPass(!showPass)} style={{ position:'absolute', right:'13px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:'#9ca3af', padding:0 }}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', padding:'11px 14px', borderRadius:'10px', marginBottom:'16px', fontSize:'13px' }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ width:'100%', padding:'14px', background:loading?'#9ca3af':'#0f2240', color:'white', border:'none', borderRadius:'10px', fontSize:'15px', fontWeight:'700', cursor:loading?'not-allowed':'pointer', fontFamily:'inherit', transition:'background 0.2s' }}
            onMouseEnter={e=>{ if(!loading) e.target.style.background='#1d4ed8'; }}
            onMouseLeave={e=>{ if(!loading) e.target.style.background='#0f2240'; }}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        {/* Trust badges */}
        <div style={{ marginTop:'28px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
          {[
            { icon:'🔒', text:'Secure Login' },
            { icon:'🏛️', text:'MREI Internal' },
            { icon:'📱', text:'Any Device' },
            { icon:'🔄', text:'Live Sync' },
          ].map(b => (
            <div key={b.text} style={{ display:'flex', alignItems:'center', gap:'7px', background:'#f8fafc', borderRadius:'8px', padding:'9px 12px' }}>
              <span style={{ fontSize:'14px' }}>{b.icon}</span>
              <span style={{ fontSize:'12px', color:'#64748b', fontWeight:'500' }}>{b.text}</span>
            </div>
          ))}
        </div>

        <p style={{ textAlign:'center', marginTop:'20px', fontSize:'12px', color:'#9ca3af' }}>
          First time? Use your Employee ID as password
        </p>

        {/* Quick Links */}
        <div style={{ marginTop:'20px' }}>
          <div style={{ fontSize:'11px', color:'#94a3b8', textAlign:'center', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Quick Links</div>
          <div style={{ display:'flex', gap:'8px' }}>
            {[
              { label:'EMS Portal',    icon:'🖥️', url:'https://mrei.icloudems.com/' },
              { label:'HR One',        icon:'👔', url:'https://app.hrone.cloud/login' },
              { label:'CDC Drive',     icon:'📁', url:'https://drive.google.com/drive/my-drive' },
            ].map(link => (
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" style={{
                flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px',
                background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'10px',
                padding:'10px 6px', textDecoration:'none', transition:'all 0.15s',
              }}
              onMouseEnter={e=>{ e.currentTarget.style.background='#eff6ff'; e.currentTarget.style.borderColor='#bfdbfe'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background='#f8fafc'; e.currentTarget.style.borderColor='#e2e8f0'; }}>
                <span style={{ fontSize:'18px' }}>{link.icon}</span>
                <span style={{ fontSize:'10px', color:'#475569', fontWeight:'600', textAlign:'center' }}>{link.label}</span>
              </a>
            ))}
          </div>
        </div>

        <p style={{ textAlign:'center', marginTop:'16px', fontSize:'11px', color:'#cbd5e1' }}>
          © 2026 Manav Rachna Educational Institutions
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.4; transform:scale(0.75); }
        }
      `}</style>
    </div>
  );
}
