import { useState, useEffect, useRef } from 'react';
import { api, getUser } from '../api';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const REACTIONS = ['👍','✅','👀','🎉','❤️','😂'];

function timeStr(dateStr) {
  if(!dateStr) return '';
  const d = new Date(dateStr);
  const diff = (Date.now()-d)/1000;
  if(diff<60) return 'now';
  if(diff<3600) return `${Math.floor(diff/60)}m`;
  if(diff<86400) return d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  return d.toLocaleDateString('en-IN',{day:'numeric',month:'short'});
}

function Avatar({ name, pic, size=32, online }) {
  const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899'];
  const color = colors[(name||'').charCodeAt(0) % colors.length];
  return (
    <div style={{ position:'relative', flexShrink:0 }}>
      {pic ? <img src={pic} alt="" style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover' }} />
        : <div style={{ width:size, height:size, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38+'px', fontWeight:'700', color:'#fff' }}>{(name||'?')[0].toUpperCase()}</div>
      }
      {online !== undefined && <div style={{ position:'absolute', bottom:0, right:0, width:9, height:9, borderRadius:'50%', background:online?'#10b981':'#94a3b8', border:'2px solid white' }} />}
    </div>
  );
}

export default function ChatBubble() {
  const user = getUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [presence, setPresence] = useState([]);
  const pollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if(!user) return;
    loadData();
    api('/messages/presence', { method:'POST' }).catch(()=>{});
    pollRef.current = setInterval(() => {
      loadUnread();
      if(open) loadConversations();
      if(open && activeConv) loadMessages(activeConv.id, true);
      api('/messages/presence', { method:'POST' }).catch(()=>{});
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [open, activeConv?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const loadData = async () => {
    try {
      const [convs, pres] = await Promise.all([api('/messages/conversations'), api('/messages/presence')]);
      setConversations(convs); setPresence(pres); loadUnread();
    } catch(e) {}
  };

  const loadConversations = async () => {
    try { setConversations(await api('/messages/conversations')); } catch(e) {}
  };

  const loadMessages = async (convId, silent=false) => {
    try { setMessages(await api(`/messages/conversations/${convId}/messages`)); } catch(e) {}
  };

  const loadUnread = async () => {
    try { const d = await api('/messages/unread'); setUnread(d.unread||0); } catch(e) {}
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if(!input.trim() || !activeConv) return;
    setSending(true);
    try {
      const msg = await api(`/messages/conversations/${activeConv.id}/messages`, { method:'POST', body:JSON.stringify({content:input.trim()}) });
      setMessages(m=>[...m,{...msg,reactions:null}]); setInput(''); loadConversations(); loadUnread();
    } catch(e) {} finally { setSending(false); }
  };

  const openConv = async (conv) => {
    setActiveConv(conv);
    setMessages([]);
    await loadMessages(conv.id);
  };

  const getConvName = (conv) => {
    if(conv.type==='direct') return (conv.other_members||[])[0]?.name||'Unknown';
    return conv.name||'Group';
  };

  const isOnline = (uid) => presence.find(p=>p.id===uid)?.is_online||false;

  return (
    <div style={{ position:'fixed', bottom:'24px', right:'24px', zIndex:9999 }}>
      {/* Chat window */}
      {open && (
        <div style={{
          position:'absolute', bottom:'68px', right:0,
          width:'340px', height:'480px',
          background:'#ffffff', borderRadius:'16px',
          boxShadow:'0 8px 32px rgba(0,0,0,0.18)',
          border:'1px solid #e2e8f0',
          display:'flex', flexDirection:'column',
          overflow:'hidden'
        }}>
          {/* Header */}
          <div style={{ padding:'12px 16px', background:'#1e3a5f', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ color:'#fff', fontWeight:'700', fontSize:'14px' }}>
              {activeConv ? getConvName(activeConv) : '💬 Messages'}
            </div>
            <div style={{ display:'flex', gap:'6px' }}>
              {activeConv && <button onClick={()=>setActiveConv(null)} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'6px', padding:'3px 8px', cursor:'pointer', color:'#fff', fontSize:'12px' }}>← Back</button>}
              <button onClick={()=>navigate('/messages')} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'6px', padding:'3px 8px', cursor:'pointer', color:'#fff', fontSize:'12px' }}>⤢ Full</button>
              <button onClick={()=>setOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:'16px', lineHeight:1 }}>✕</button>
            </div>
          </div>

          {!activeConv ? (
            /* Conversation list */
            <div style={{ flex:1, overflowY:'auto' }}>
              {conversations.length === 0 ? (
                <div style={{ padding:'32px', textAlign:'center', color:'#94a3b8' }}>
                  <div style={{ fontSize:'28px', marginBottom:'8px' }}>💬</div>
                  <p style={{ margin:0, fontSize:'13px' }}>No conversations yet</p>
                  <button onClick={()=>navigate('/messages')} style={{ marginTop:'12px', padding:'8px 16px', background:'#1e3a5f', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'12px' }}>Open Messages</button>
                </div>
              ) : conversations.map(conv => {
                const unreadCount = parseInt(conv.unread_count)||0;
                const lastMsg = conv.last_message;
                const convName = getConvName(conv);
                const online = conv.type==='direct' ? isOnline((conv.other_members||[])[0]?.id) : false;
                return (
                  <div key={conv.id} onClick={()=>openConv(conv)} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'11px 14px', cursor:'pointer', borderBottom:'1px solid #f1f5f9', background:'white' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e=>e.currentTarget.style.background='white'}>
                    <Avatar name={conv.type==='group'?(conv.name||'G'):convName} pic={(conv.other_members||[])[0]?.profile_picture} size={36} online={conv.type==='direct'?online:undefined} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontSize:'13px', fontWeight:unreadCount>0?'700':'600', color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'150px' }}>{convName}</span>
                        <span style={{ fontSize:'11px', color:'#94a3b8' }}>{lastMsg?timeStr(lastMsg.created_at):''}</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:'1px' }}>
                        <span style={{ fontSize:'11px', color:unreadCount>0?'#0f172a':'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'180px', fontWeight:unreadCount>0?'600':'400' }}>
                          {lastMsg?(lastMsg.file_name?`📎 ${lastMsg.file_name}`:lastMsg.content?.slice(0,35)):conv.type==='group'?`${conv.member_count} members`:''}
                        </span>
                        {unreadCount>0 && <span style={{ background:'#3b82f6', color:'#fff', borderRadius:'20px', padding:'1px 6px', fontSize:'10px', fontWeight:'700' }}>{unreadCount}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Messages */
            <>
              <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:'4px', background:'#f8fafc' }}>
                {messages.map(msg => {
                  const isMine = msg.sender_id === parseInt(user?.id);
                  return (
                    <div key={msg.id} style={{ display:'flex', flexDirection:'column', alignItems:isMine?'flex-end':'flex-start' }}>
                      {!isMine && activeConv.type!=='direct' && <span style={{ fontSize:'10px', color:'#94a3b8', marginBottom:'2px', paddingLeft:'8px' }}>{msg.sender_name}</span>}
                      <div style={{
                        maxWidth:'80%', padding: msg.file_url&&msg.file_type?.includes('image')?'3px':'8px 12px',
                        background:isMine?'#1e3a5f':'#fff',
                        color:isMine?'#fff':'#0f172a',
                        borderRadius:isMine?'14px 3px 14px 14px':'3px 14px 14px 14px',
                        fontSize:'13px', lineHeight:'1.5',
                        border:'1px solid #e2e8f0',
                        opacity: msg.is_deleted ? 0.5 : 1
                      }}>
                        {msg.is_deleted ? <span style={{ fontStyle:'italic', opacity:0.7, fontSize:'12px' }}>Deleted</span>
                          : msg.file_type?.includes('image') ? <img src={msg.file_url} alt={msg.file_name} style={{ maxWidth:'200px', borderRadius:'10px', display:'block' }} />
                          : msg.file_url ? (
                            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                              <span style={{ fontSize:'20px' }}>📎</span>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:'12px', fontWeight:'600', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{msg.file_name}</div>
                              </div>
                              <a href={msg.file_url} download={msg.file_name} target="_blank" rel="noopener noreferrer" style={{ color:isMine?'#fff':'#3b82f6', fontSize:'14px' }}>📥</a>
                            </div>
                          ) : msg.content
                        }
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'4px', marginTop:'1px' }}>
                        <span style={{ fontSize:'10px', color:'#94a3b8' }}>{timeStr(msg.created_at)}</span>
                        {isMine && <span style={{ fontSize:'10px', color: parseInt(msg.read_count)>1?'#3b82f6':'#94a3b8' }}>{parseInt(msg.read_count)>1?'✓✓':'✓'}</span>}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              {/* Input */}
              <div style={{ padding:'10px 12px', borderTop:'1px solid #e2e8f0', background:'#fff' }}>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg" onChange={async e=>{ if(e.target.files[0]){ const fd=new FormData();fd.append('file',e.target.files[0]);const token=localStorage.getItem('token');const r=await fetch(`${API_BASE}/messages/conversations/${activeConv.id}/upload`,{method:'POST',headers:{'Authorization':'Bearer '+token},body:fd});const d=await r.json();if(r.ok){setMessages(m=>[...m,{...d,reactions:null}]);}e.target.value=''; }}} style={{display:'none'}} />
                <form onSubmit={sendMessage} style={{ display:'flex', gap:'6px' }}>
                  <button type="button" onClick={()=>fileRef.current.click()} style={{ background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:'8px', padding:'7px 10px', cursor:'pointer', fontSize:'14px', color:'#64748b' }}>📎</button>
                  <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Message..." style={{ flex:1, padding:'8px 12px', border:'2px solid #e2e8f0', borderRadius:'10px', fontSize:'13px', outline:'none' }}
                    onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey)sendMessage(e);}} />
                  <button type="submit" disabled={!input.trim()} style={{ background:input.trim()?'#1e3a5f':'#9ca3af', color:'#fff', border:'none', borderRadius:'10px', padding:'7px 14px', cursor:input.trim()?'pointer':'not-allowed', fontSize:'14px' }}>➤</button>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {/* Bubble button */}
      <button onClick={()=>{setOpen(!open); if(!open) loadData();}} style={{
        width:'56px', height:'56px', borderRadius:'50%',
        background:'#1e3a5f', color:'#fff', border:'none',
        cursor:'pointer', fontSize:'22px',
        boxShadow:'0 4px 16px rgba(0,0,0,0.25)',
        display:'flex', alignItems:'center', justifyContent:'center',
        position:'relative', transition:'transform 0.2s'
      }}
      onMouseEnter={e=>e.currentTarget.style.transform='scale(1.08)'}
      onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
        {open ? '✕' : '💬'}
        {unread > 0 && !open && (
          <div style={{ position:'absolute', top:'-2px', right:'-2px', width:'20px', height:'20px', background:'#ef4444', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'700', border:'2px solid white' }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </button>
    </div>
  );
}
