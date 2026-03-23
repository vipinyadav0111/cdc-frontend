import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useOutletContext } from 'react-router-dom';

function timeAgo(dateStr) {
  if(!dateStr) return '';
  const d = new Date(dateStr);
  if(isNaN(d)) return '';
  const s = (Date.now() - d) / 1000;
  if(s < 3600)  return `${Math.floor(s/60)}m ago`;
  if(s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function getSource(item) {
  if(item.source) return item.source;
  try { return new URL(item.link).hostname.replace('www.',''); } catch { return ''; }
}

// ── NEWS CARD ─────────────────────────────────────────
function NewsCard({ item, theme, accent }) {
  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer"
      style={{ display:'block', textDecoration:'none', background:theme.card, border:`1px solid ${theme.border}`,
        borderRadius:'10px', padding:'12px 14px', transition:'border-color 0.15s', cursor:'pointer' }}
      onMouseEnter={e=>e.currentTarget.style.borderColor=accent}
      onMouseLeave={e=>e.currentTarget.style.borderColor=theme.border}>
      <div style={{ fontSize:'13px', fontWeight:'600', color:theme.text, lineHeight:'1.5', marginBottom:'6px',
        display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
        {item.title}
      </div>
      {item.desc && (
        <div style={{ fontSize:'11px', color:theme.subtext, lineHeight:'1.5', marginBottom:'7px',
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {item.desc}
        </div>
      )}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:'10px', fontWeight:'600', color:accent, background:accent+'15', padding:'2px 7px', borderRadius:'20px' }}>
          {getSource(item)}
        </span>
        <span style={{ fontSize:'10px', color:theme.subtext }}>{timeAgo(item.pubDate)}</span>
      </div>
    </a>
  );
}

// ── SECTION WRAPPER ───────────────────────────────────
function Section({ icon, title, badge, loading, error, children, theme, onRefresh, lastUpdated }) {
  return (
    <div style={{ background:theme.card, borderRadius:'14px', border:`1px solid ${theme.border}`,
      overflow:'hidden', display:'flex', flexDirection:'column', minHeight:'400px' }}>
      {/* Header */}
      <div style={{ padding:'14px 18px', borderBottom:`1px solid ${theme.border}`,
        display:'flex', alignItems:'center', gap:'10px', background:theme.bg }}>
        <span style={{ fontSize:'20px' }}>{icon}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:'700', fontSize:'14px', color:theme.text }}>{title}</div>
          {lastUpdated && <div style={{ fontSize:'10px', color:theme.subtext, marginTop:'1px' }}>
            Updated {timeAgo(lastUpdated)} · auto-refreshes every 15 min
          </div>}
        </div>
        {badge && <span style={{ background:'#fee2e2', color:'#dc2626', padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>{badge}</span>}
        <button onClick={onRefresh} title="Refresh" style={{ background:'none', border:`1px solid ${theme.border}`, borderRadius:'7px', padding:'5px 8px', cursor:'pointer', fontSize:'13px', color:theme.subtext }}>🔄</button>
      </div>
      {/* Body */}
      <div style={{ flex:1, overflowY:'auto', maxHeight:'480px' }}>
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px', padding:'14px' }}>
            {[1,2,3,4].map(i=>(
              <div key={i} style={{ height:'80px', background:theme.bg, borderRadius:'8px', border:`1px solid ${theme.border}`, animation:'pulse 1.5s infinite' }}/>
            ))}
          </div>
        ) : error ? (
          <div style={{ padding:'32px', textAlign:'center', color:theme.subtext }}>
            <div style={{ fontSize:'28px', marginBottom:'8px' }}>⚠️</div>
            <p style={{ margin:0, fontSize:'12px' }}>Could not load data. Check connection.</p>
            <button onClick={onRefresh} style={{ marginTop:'10px', padding:'6px 14px', background:theme.accent, color:'#fff', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'12px' }}>Retry</button>
          </div>
        ) : children}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
export default function HiringTrendsPage() {
  const { theme } = useOutletContext();
  const accent = theme.accent;

  const [news,       setNews]       = useState([]);
  const [companies,  setCompanies]  = useState([]);
  const [unis,       setUnis]       = useState([]);
  const [skills,     setSkills]     = useState(null);
  const [jobs,       setJobs]       = useState([]);

  const [loadingNews,  setLoadingNews]  = useState(true);
  const [loadingCo,    setLoadingCo]    = useState(true);
  const [loadingUni,   setLoadingUni]   = useState(true);
  const [loadingSkills,setLoadingSkills]= useState(true);
  const [loadingJobs,  setLoadingJobs]  = useState(true);

  const [errNews,  setErrNews]  = useState(false);
  const [errCo,    setErrCo]    = useState(false);
  const [errUni,   setErrUni]   = useState(false);
  const [errSkills,setErrSkills]= useState(false);
  const [errJobs,  setErrJobs]  = useState(false);

  const [tsNews,   setTsNews]   = useState(null);
  const [tsCo,     setTsCo]     = useState(null);
  const [tsUni,    setTsUni]    = useState(null);
  const [tsSkills, setTsSkills] = useState(null);
  const [tsJobs,   setTsJobs]   = useState(null);

  const [newsFilter,   setNewsFilter]   = useState('all');
  const [jobsFilter,   setJobsFilter]   = useState('all');
  const [companyFilter,setCompanyFilter]= useState('all');

  const fetchNews = useCallback(() => {
    setLoadingNews(true); setErrNews(false);
    api('/hiring/news').then(d=>{ setNews(d); setTsNews(new Date()); }).catch(()=>setErrNews(true)).finally(()=>setLoadingNews(false));
  },[]);
  const fetchCompanies = useCallback(() => {
    setLoadingCo(true); setErrCo(false);
    api('/hiring/companies').then(d=>{ setCompanies(d); setTsCo(new Date()); }).catch(()=>setErrCo(true)).finally(()=>setLoadingCo(false));
  },[]);
  const fetchUnis = useCallback(() => {
    setLoadingUni(true); setErrUni(false);
    api('/hiring/universities').then(d=>{ setUnis(d); setTsUni(new Date()); }).catch(()=>setErrUni(true)).finally(()=>setLoadingUni(false));
  },[]);
  const fetchSkills = useCallback(() => {
    setLoadingSkills(true); setErrSkills(false);
    api('/hiring/skills').then(d=>{ setSkills(d); setTsSkills(new Date()); }).catch(()=>setErrSkills(true)).finally(()=>setLoadingSkills(false));
  },[]);
  const fetchJobs = useCallback(() => {
    setLoadingJobs(true); setErrJobs(false);
    api('/hiring/jobs').then(d=>{ setJobs(d); setTsJobs(new Date()); }).catch(()=>setErrJobs(true)).finally(()=>setLoadingJobs(false));
  },[]);

  // Initial load
  useEffect(() => {
    fetchNews(); fetchCompanies(); fetchUnis(); fetchSkills(); fetchJobs();
  }, []);

  // Auto-refresh every 15 min
  useEffect(() => {
    const t = setInterval(() => {
      fetchNews(); fetchCompanies(); fetchUnis(); fetchSkills(); fetchJobs();
    }, 15*60*1000);
    return () => clearInterval(t);
  }, []);

  // Filter helpers
  const NEWS_FILTERS = [
    { v:'all',        l:'All' },
    { v:'placement',  l:'Placement' },
    { v:'hiring',     l:'Hiring' },
    { v:'skills',     l:'Skills' },
    { v:'it',         l:'IT' },
    { v:'mba',        l:'MBA' },
  ];
  const filterNews = (items) => {
    if(newsFilter==='all') return items;
    const kw = { placement:['placement','campus','recruit'], hiring:['hiring','job offer','appoint'], skills:['skill','training','learn'], it:['IT','software','tech','engineer'], mba:['MBA','management','business'] }[newsFilter]||[];
    return items.filter(i => kw.some(k => (i.title+i.desc).toLowerCase().includes(k.toLowerCase())));
  };

  const COMPANY_LIST = [...new Set(companies.map(c=>c.company).filter(Boolean))].sort();
  const filterCompanies = (items) => companyFilter==='all' ? items : items.filter(i=>i.company===companyFilter);

  const JOB_FILTERS = [
    { v:'all', l:'All' },
    { v:'cse',    l:'CSE / IT' },
    { v:'eng',    l:'Engineering' },
    { v:'mba',    l:'MBA' },
  ];
  const filterJobs = (items) => {
    if(jobsFilter==='all') return items;
    const kw = { cse:['software','CSE','developer','programmer','IT','computer'], eng:['engineer','mechanical','civil','electrical','electronics'], mba:['MBA','management','finance','marketing','business','HR'] }[jobsFilter]||[];
    return items.filter(i => kw.some(k => (i.title+i.desc).toLowerCase().includes(k.toLowerCase())));
  };

  const FilterBar = ({ filters, value, onChange }) => (
    <div style={{ display:'flex', gap:'4px', padding:'8px 14px', borderBottom:`1px solid ${theme.border}`, flexWrap:'wrap', background:theme.bg }}>
      {filters.map(f=>(
        <button key={f.v} onClick={()=>onChange(f.v)} style={{ padding:'3px 10px', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'11px', fontWeight:value===f.v?'700':'400', background:value===f.v?accent:'transparent', color:value===f.v?'#fff':theme.subtext }}>
          {f.l}
        </button>
      ))}
    </div>
  );

  const SkillBar = ({ skill, score, count, rank }) => {
    const colors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899'];
    const color = colors[rank % colors.length];
    return (
      <div style={{ marginBottom:'8px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <span style={{ background:color+'22', color, padding:'1px 7px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>#{rank+1}</span>
            <span style={{ fontSize:'13px', fontWeight:'600', color:theme.text }}>{skill}</span>
          </div>
          <span style={{ fontSize:'11px', color:theme.subtext }}>trending</span>
        </div>
        <div style={{ height:'6px', background:theme.bg, borderRadius:'3px', overflow:'hidden', border:`1px solid ${theme.border}` }}>
          <div style={{ height:'100%', width:`${Math.min(score,100)}%`, background:color, borderRadius:'3px', transition:'width 1s' }}/>
        </div>
      </div>
    );
  };

  const filteredNews     = filterNews(news);
  const filteredJobs     = filterJobs(jobs);
  const filteredCompanies = filterCompanies(companies);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:'20px' }}>
        <h1 style={{ margin:'0 0 4px', fontSize:'24px', fontWeight:'700', color:theme.text }}>📈 Hiring Trends</h1>
        <p style={{ margin:0, fontSize:'13px', color:theme.subtext }}>Live industry intelligence — auto-refreshes every 15 minutes</p>
      </div>

      {/* 5-section equal grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>

        {/* ── 1. LIVE NEWS FEED ── */}
        <Section icon="📰" title="Live News Feed" loading={loadingNews} error={errNews}
          onRefresh={fetchNews} lastUpdated={tsNews} theme={theme}
          badge={filteredNews.length > 0 ? `${filteredNews.length} stories` : undefined}>
          <FilterBar filters={NEWS_FILTERS} value={newsFilter} onChange={setNewsFilter}/>
          {filteredNews.length === 0 ? (
            <div style={{ padding:'32px', textAlign:'center', color:theme.subtext }}>
              <div style={{ fontSize:'28px', marginBottom:'8px' }}>📭</div>
              <p style={{ margin:0, fontSize:'12px' }}>No news found for this filter</p>
            </div>
          ) : (
            <div style={{ padding:'10px', display:'flex', flexDirection:'column', gap:'7px' }}>
              {filteredNews.map((item,i)=><NewsCard key={i} item={item} theme={theme} accent={accent}/>)}
            </div>
          )}
        </Section>

        {/* ── 2. JOB ALERTS ── */}
        <Section icon="💼" title="Live Job Alerts" loading={loadingJobs} error={errJobs}
          onRefresh={fetchJobs} lastUpdated={tsJobs} theme={theme}
          badge={filteredJobs.length > 0 ? `${filteredJobs.length} openings` : undefined}>
          <FilterBar filters={JOB_FILTERS} value={jobsFilter} onChange={setJobsFilter}/>
          {filteredJobs.length === 0 ? (
            <div style={{ padding:'32px', textAlign:'center', color:theme.subtext }}>
              <div style={{ fontSize:'28px', marginBottom:'8px' }}>💼</div>
              <p style={{ margin:0, fontSize:'12px' }}>No job alerts found</p>
            </div>
          ) : (
            <div style={{ padding:'10px', display:'flex', flexDirection:'column', gap:'7px' }}>
              {filteredJobs.map((item,i)=>(
                <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                  style={{ display:'block', textDecoration:'none', background:theme.card, border:`1px solid ${theme.border}`,
                    borderRadius:'10px', padding:'12px 14px', borderLeft:`4px solid #10b981` }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='#10b981'}
                  onMouseLeave={e=>e.currentTarget.style.borderLeftColor='#10b981'}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:'8px' }}>
                    <span style={{ fontSize:'18px', flexShrink:0 }}>🟢</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:'600', color:theme.text, lineHeight:'1.5', marginBottom:'4px',
                        display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                        {item.title}
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontSize:'10px', fontWeight:'600', color:'#10b981', background:'#d1fae5', padding:'2px 7px', borderRadius:'20px' }}>
                          {getSource(item)}
                        </span>
                        <span style={{ fontSize:'10px', color:theme.subtext }}>{timeAgo(item.pubDate)}</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </Section>

        {/* ── 3. SKILLS IN DEMAND ── */}
        <Section icon="🔥" title="Skills in Demand" loading={loadingSkills} error={errSkills}
          onRefresh={fetchSkills} lastUpdated={tsSkills} theme={theme}>
          {skills && (
            <div style={{ padding:'14px 18px' }}>
              <div style={{ fontSize:'11px', color:theme.subtext, marginBottom:'14px' }}>
                Based on latest hiring news and job postings — updated automatically
              </div>
              {(skills.skills||[]).map((s,i)=>(
                <SkillBar key={s.skill} skill={s.skill} score={s.score} count={s.count} rank={i}/>
              ))}
              {skills.articles?.length > 0 && (
                <div style={{ marginTop:'16px', borderTop:`1px solid ${theme.border}`, paddingTop:'14px' }}>
                  <div style={{ fontSize:'11px', fontWeight:'700', color:theme.subtext, marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Related Articles</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                    {skills.articles.slice(0,5).map((item,i)=>(
                      <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize:'12px', color:accent, textDecoration:'none', lineHeight:'1.5',
                          display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                        → {item.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* ── 4. COMPANY WATCH ── */}
        <Section icon="🏢" title="Company Watch" loading={loadingCo} error={errCo}
          onRefresh={fetchCompanies} lastUpdated={tsCo} theme={theme}
          badge={filteredCompanies.length > 0 ? `${filteredCompanies.length} stories` : undefined}>
          {/* Company filter pills */}
          {COMPANY_LIST.length > 0 && (
            <div style={{ padding:'8px 12px', borderBottom:`1px solid ${theme.border}`, display:'flex', gap:'5px', flexWrap:'wrap', background:theme.bg }}>
              <button onClick={()=>setCompanyFilter('all')} style={{ padding:'3px 10px', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'11px', fontWeight:companyFilter==='all'?'700':'400', background:companyFilter==='all'?accent:'transparent', color:companyFilter==='all'?'#fff':theme.subtext }}>All</button>
              {COMPANY_LIST.map(co=>(
                <button key={co} onClick={()=>setCompanyFilter(co)} style={{ padding:'3px 9px', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'11px', fontWeight:companyFilter===co?'700':'400', background:companyFilter===co?accent+'22':theme.bg, color:companyFilter===co?accent:theme.subtext, border:companyFilter===co?`1px solid ${accent}`:`1px solid ${theme.border}` }}>
                  {co}
                </button>
              ))}
            </div>
          )}
          {filteredCompanies.length === 0 ? (
            <div style={{ padding:'32px', textAlign:'center', color:theme.subtext }}>
              <div style={{ fontSize:'28px', marginBottom:'8px' }}>🏢</div>
              <p style={{ margin:0, fontSize:'12px' }}>No company news found</p>
            </div>
          ) : (
            <div style={{ padding:'10px', display:'flex', flexDirection:'column', gap:'7px' }}>
              {filteredCompanies.map((item,i)=>(
                <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                  style={{ display:'block', textDecoration:'none', background:theme.card, border:`1px solid ${theme.border}`, borderRadius:'10px', padding:'11px 13px' }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=accent}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=theme.border}>
                  <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'5px' }}>
                    <span style={{ background:accent+'22', color:accent, padding:'1px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:'700' }}>{item.company}</span>
                    <span style={{ fontSize:'10px', color:theme.subtext, marginLeft:'auto' }}>{timeAgo(item.pubDate)}</span>
                  </div>
                  <div style={{ fontSize:'12px', fontWeight:'600', color:theme.text, lineHeight:'1.5',
                    display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                    {item.title}
                  </div>
                </a>
              ))}
            </div>
          )}
        </Section>

        {/* ── 5. UNIVERSITY PLACEMENT WATCH — full width ── */}
        <div style={{ gridColumn:'1 / -1' }}>
          <Section icon="🎓" title="University Placement Watch" loading={loadingUni} error={errUni}
            onRefresh={fetchUnis} lastUpdated={tsUni} theme={theme}
            badge={unis.length > 0 ? `${unis.length} stories` : undefined}>
            {unis.length === 0 ? (
              <div style={{ padding:'32px', textAlign:'center', color:theme.subtext }}>
                <div style={{ fontSize:'28px', marginBottom:'8px' }}>🎓</div>
                <p style={{ margin:0, fontSize:'12px' }}>No university placement news found</p>
              </div>
            ) : (
              <div style={{ padding:'10px', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'7px' }}>
                {unis.map((item,i)=><NewsCard key={i} item={item} theme={theme} accent='#8b5cf6'/>)}
              </div>
            )}
          </Section>
        </div>

      </div>
    </div>
  );
}
