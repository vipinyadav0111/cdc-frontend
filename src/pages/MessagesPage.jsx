import { useState, useEffect, useRef, useCallback } from 'react';
import { api, getUser } from '../api';
import { useOutletContext } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const REACTIONS = ['👍','✅','👀','🎉','❤️','😂'];
const FILE_ICONS = { 'pdf':'📄','word':'📝','excel':'📊','ppt':'📑','image':'🖼️','default':'📎' };

function getFileIcon(type) {
  if(!type) return FILE_ICONS.default;
  if(type.includes('pdf')) return FILE_ICONS.pdf;
  if(type.includes('word')||type.includes('docx')||type.includes('doc')) return FILE_ICONS.word;
  if(type.includes('excel')||type.includes('xlsx')||type.includes('xls')||type.includes('spreadsheet')) return FILE_ICONS.excel;
  if(type.includes('powerpoint')||type.includes('pptx')||type.includes('presentation')) return FILE_ICONS.ppt;
  if(type.includes('image')) return FILE_ICONS.image;
  return FILE_ICONS.default;
}

function formatSize(bytes) {
  if(!bytes) return '';
  if(bytes < 1024) return bytes+'B';
  if(bytes < 1024*1024) return (bytes/1024).toFixed(1)+'KB';
  return (bytes/(1024*1024)).toFixed(1)+'MB';
}

function timeStr(dateStr) {
  if(!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;
  if(diff < 60) return 'now';
  if(diff < 3600) return `${Math.floor(diff/60)}m`;
  if(diff < 86400) return d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  return d.toLocaleDateString('en-IN',{day:'numeric',month:'short'});
}

function Avatar({ name, pic, size=36, online }) {
  const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899'];
  const color = colors[(name||'').charCodeAt(0) % colors.length];
  return (
    <div style={{ position:'relative', flexShrink:0 }}>
      {pic ? (
        <img src={pic} alt="" style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover' }} />
      ) : (
        <div style={{ width:size, height:size, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.4+'px', fontWeight:'700', color:'#fff', flexShrink:0 }}>
          {(name||'?')[0].toUpperCase()}
        </div>
      )}
      {online !== undefined && (
        <div style={{ position:'absolute', bottom:0, right:0, width:10, height:10, borderRadius:'50%', background:online?'#10b981':'#94a3b8', border:'2px solid white' }} />
      )}
    </div>
  );
}

export default function MessagesPage() {
  const { theme } = useOutletContext();
  const user = getUser();

  const [conversations, setConversations] = useState([]);
  const [presence, setPresence] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showNewConv, setShowNewConv] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [newConvType, setNewConvType] = useState('direct');
  const [newConvName, setNewConvName] = useState('');
  const [newConvMembers, setNewConvMembers] = useState([]);
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcastTargets, setBroadcastTargets] = useState([]);
  const [broadcastAll, setBroadcastAll] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [reactionMsg, setReactionMsg] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [unread, setUnread] = useState(0);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);
  const presencePollRef = useRef(null);
  const convListRef = useRef(null);

  useEffect(() => {
    loadAll();
    startPolling();
    return () => { clearInterval(pollRef.current); clearInterval(presencePollRef.current); };
  }, []);

  useEffect(() => {
    if(activeConv) loadMessages(activeConv.id);
  }, [activeConv?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  const startPolling = () => {
    // Poll messages every 5s
    pollRef.current = setInterval(() => {
      if(activeConv) loadMessages(activeConv.id, true);
      loadConversations();
      loadUnread();
    }, 5000);
    // Presence heartbeat every 30s
    presencePollRef.current = setInterval(() => {
      api('/messages/presence', { method:'POST' }).catch(()=>{});
      loadPresence();
    }, 30000);
    // Initial presence
    api('/messages/presence', { method:'POST' }).catch(()=>{});
  };

  const loadAll = async () => {
    try {
      const [convs, users, pres] = await Promise.all([
        api('/messages/conversations'),
        api('/users'),
        api('/messages/presence'),
      ]);
      setConversations(convs);
      setAllUsers(users.filter(u => u.id !== parseInt(user?.id)));
      setPresence(pres);
      setLoading(false);
      loadUnread();
    } catch(e) { console.error(e); setLoading(false); }
  };

  const loadConversations = async () => {
    try { setConversations(await api('/messages/conversations')); } catch(e) {}
  };

  const loadMessages = async (convId, silent=false) => {
    if(!silent) setMsgLoading(true);
    try {
      const msgs = await api(`/messages/conversations/${convId}/messages`);
      setMessages(msgs);
    } catch(e) { console.error(e); }
    finally { if(!silent) setMsgLoading(false); }
  };

  const loadPresence = async () => {
    try { setPresence(await api('/messages/presence')); } catch(e) {}
  };

  const loadUnread = async () => {
    try { const d = await api('/messages/unread'); setUnread(d.unread||0); } catch(e) {}
  };

  const isOnline = (userId) => presence.find(p => p.id === userId)?.is_online || false;

  const sendMessage = async (e) => {
    e?.preventDefault();
    if(!input.trim() || !activeConv) return;
    setSending(true);
    try {
      const msg = await api(`/messages/conversations/${activeConv.id}/messages`, {
        method:'POST', body:JSON.stringify({ content: input.trim() })
      });
      setMessages(m => [...m, { ...msg, reactions:null }]);
      setInput('');
      loadConversations();
    } catch(e) { console.error(e); }
    finally { setSending(false); }
  };

  const sendFile = async (file) => {
    if(!file || !activeConv) return;
    setUploadingFile(true);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/messages/conversations/${activeConv.id}/upload`, {
        method:'POST', headers:{ 'Authorization':'Bearer '+token }, body: fd
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error);
      setMessages(m => [...m, { ...data, reactions:null }]);
      loadConversations();
    } catch(e) { alert('Upload failed: '+e.message); }
    finally { setUploadingFile(false); }
  };

  const react = async (msgId, emoji) => {
    try {
      await api(`/messages/${msgId}/react`, { method:'POST', body:JSON.stringify({ emoji }) });
      loadMessages(activeConv.id, true);
      setReactionMsg(null);
    } catch(e) {}
  };

  const deleteMsg = async (msgId) => {
    try {
      await api(`/messages/${msgId}`, { method:'DELETE' });
      setMessages(m => m.filter(x => x.id !== msgId));
    } catch(e) {}
  };

  const openConv = async (conv) => {
    setActiveConv(conv);
    setShowSearch(false);
    setShowNewConv(false);
    setShowBroadcast(false);
  };

  const startDirectChat = async (userId) => {
    try {
      const data = await api('/messages/conversations', {
        method:'POST', body:JSON.stringify({ type:'direct', member_ids:[parseInt(userId)] })
      });
      setShowNewConv(false);
      const convs = await api('/messages/conversations');
      setConversations(convs);
      // Find by id or by member
      const conv = convs.find(c => c.id === data.id) ||
                   convs.find(c => c.type==='direct' && (c.other_members||[]).some(m=>m.id===parseInt(userId)));
      if(conv) { setActiveConv(conv); await loadMessages(conv.id); }
    } catch(e) { console.error(e); setMsg('❌ Could not start chat: '+e.message); }
  };

  const createGroup = async () => {
    if(!newConvName.trim() || newConvMembers.length === 0) return setMsg('⚠️ Group needs a name and at least one member');
    try {
      const data = await api('/messages/conversations', {
        method:'POST',
        body:JSON.stringify({ type:'group', name:newConvName, member_ids:newConvMembers.map(id=>parseInt(id)) })
      });
      setNewConvName(''); setNewConvMembers([]); setShowNewConv(false);
      const convs = await api('/messages/conversations');
      setConversations(convs);
      const conv = convs.find(c => c.id === data.id);
      if(conv) { setActiveConv(conv); await loadMessages(conv.id); }
    } catch(e) { console.error(e); setMsg('❌ Could not create group: '+e.message); }
  };

  const sendBroadcast = async () => {
    if(!broadcastContent.trim()) return;
    try {
      const targets = broadcastAll ? [] : broadcastTargets;
      await api('/messages/broadcast', {
        method:'POST', body:JSON.stringify({ content:broadcastContent, user_ids:targets })
      });
      setBroadcastContent(''); setShowBroadcast(false);
      loadConversations();
    } catch(e) { alert('Broadcast failed: '+e.message); }
  };

  const handleSearch = async (q) => {
    setSearchQ(q);
    if(q.length < 2) { setSearchResults([]); return; }
    try { setSearchResults(await api(`/messages/search?q=${encodeURIComponent(q)}`)); } catch(e) {}
  };

  const getConvName = (conv) => {
    if(conv.type === 'direct') {
      const other = (conv.other_members||[])[0];
      return other?.name || 'Unknown';
    }
    return conv.name || 'Group';
  };

  const getConvPic = (conv) => {
    if(conv.type === 'direct') return (conv.other_members||[])[0]?.profile_picture || null;
    return null;
  };

  const getConvOnline = (conv) => {
    if(conv.type === 'direct') {
      const other = (conv.other_members||[])[0];
      return other ? isOnline(other.id) : false;
    }
    return false;
  };

  const inp = { width:'100%', padding:'9px 12px', border:`2px solid ${theme.border}`, borderRadius:'8px', fontSize:'14px', boxSizing:'border-box', outline:'none', background:theme.card, color:theme.text };

  // ── RENDER ──
  return (
    <div style={{ display:'flex', height:'calc(100vh - 120px)', gap:'0', borderRadius:'14px', overflow:'hidden', border:`1px solid ${theme.border}`, background:theme.card }}>

      {/* ── LEFT SIDEBAR ── */}
      <div style={{ width:'300px', flexShrink:0, borderRight:`1px solid ${theme.border}`, display:'flex', flexDirection:'column', background:theme.bg }}>

        {/* Header */}
        <div style={{ padding:'16px', borderBottom:`1px solid ${theme.border}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
            <h2 style={{ margin:0, fontSize:'16px', fontWeight:'700', color:theme.text }}>💬 Messages</h2>
            <div style={{ display:'flex', gap:'6px' }}>
              <button onClick={()=>{setShowBroadcast(!showBroadcast);setShowNewConv(false);setShowSearch(false);}} title="Broadcast" style={{ background:showBroadcast?theme.accent:theme.card, color:showBroadcast?'#fff':theme.subtext, border:`1px solid ${theme.border}`, borderRadius:'7px', padding:'5px 8px', cursor:'pointer', fontSize:'14px' }}>📢</button>
              <button onClick={()=>{setShowNewConv(!showNewConv);setShowBroadcast(false);setShowSearch(false);}} title="New chat" style={{ background:showNewConv?theme.accent:theme.card, color:showNewConv?'#fff':theme.subtext, border:`1px solid ${theme.border}`, borderRadius:'7px', padding:'5px 8px', cursor:'pointer', fontSize:'14px' }}>✏️</button>
              <button onClick={()=>{setShowSearch(!showSearch);setShowNewConv(false);setShowBroadcast(false);}} title="Search" style={{ background:showSearch?theme.accent:theme.card, color:showSearch?'#fff':theme.subtext, border:`1px solid ${theme.border}`, borderRadius:'7px', padding:'5px 8px', cursor:'pointer', fontSize:'14px' }}>🔍</button>
            </div>
          </div>
          {/* Search bar */}
          {showSearch && (
            <input value={searchQ} onChange={e=>handleSearch(e.target.value)} placeholder="Search messages..." style={{ ...inp, fontSize:'13px', padding:'8px 10px' }} autoFocus />
          )}
        </div>

        {/* New conv panel */}
        {showNewConv && (
          <div style={{ padding:'12px', borderBottom:`1px solid ${theme.border}`, background:theme.card }}>
            <div style={{ display:'flex', gap:'6px', marginBottom:'10px' }}>
              {[['direct','👤 Direct'],['group','👥 Group']].map(([t,l])=>(
                <button key={t} onClick={()=>setNewConvType(t)} style={{ flex:1, padding:'6px', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'600', background:newConvType===t?theme.accent:theme.bg, color:newConvType===t?'#fff':theme.subtext }}>
                  {l}
                </button>
              ))}
            </div>
            {newConvType === 'group' && (
              <input value={newConvName} onChange={e=>setNewConvName(e.target.value)} placeholder="Group name..." style={{ ...inp, fontSize:'13px', padding:'7px 10px', marginBottom:'8px' }} />
            )}
            <div style={{ maxHeight:'160px', overflowY:'auto', border:`1px solid ${theme.border}`, borderRadius:'8px' }}>
              {allUsers.map(u => (
                <div key={u.id} onClick={()=> newConvType==='direct' ? startDirectChat(u.id) : setNewConvMembers(m=>m.includes(u.id)?m.filter(x=>x!==u.id):[...m,u.id])}
                  style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', cursor:'pointer', borderBottom:`1px solid ${theme.border}`, background: newConvMembers.includes(u.id)?theme.accent+'22':theme.card }}>
                  <Avatar name={u.name} pic={u.profile_picture} size={28} online={isOnline(u.id)} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:'600', color:theme.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name}</div>
                    <div style={{ fontSize:'10px', color:theme.subtext }}>{u.designation||u.role}</div>
                  </div>
                  {newConvType==='group' && newConvMembers.includes(u.id) && <span style={{ color:theme.accent, fontSize:'14px' }}>✓</span>}
                </div>
              ))}
            </div>
            {newConvType==='group' && newConvMembers.length > 0 && (
              <button onClick={createGroup} style={{ width:'100%', marginTop:'8px', padding:'8px', background:theme.accent, color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>
                Create Group ({newConvMembers.length} members)
              </button>
            )}
          </div>
        )}

        {/* Broadcast panel */}
        {showBroadcast && (
          <div style={{ padding:'12px', borderBottom:`1px solid ${theme.border}`, background:theme.card }}>
            <div style={{ fontSize:'13px', fontWeight:'600', color:theme.text, marginBottom:'8px' }}>📢 Broadcast Message</div>
            <textarea value={broadcastContent} onChange={e=>setBroadcastContent(e.target.value)} placeholder="Type your broadcast message..." rows={3} style={{ ...inp, resize:'none', fontSize:'13px', marginBottom:'8px' }} />
            <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:theme.subtext, marginBottom:'6px', cursor:'pointer' }}>
              <input type="checkbox" checked={broadcastAll} onChange={e=>setBroadcastAll(e.target.checked)} />
              Send to everyone
            </label>
            {!broadcastAll && (
              <div style={{ maxHeight:'120px', overflowY:'auto', border:`1px solid ${theme.border}`, borderRadius:'6px', marginBottom:'8px' }}>
                {allUsers.map(u=>(
                  <label key={u.id} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 8px', cursor:'pointer', borderBottom:`1px solid ${theme.border}`, fontSize:'12px' }}>
                    <input type="checkbox" checked={broadcastTargets.includes(u.id)} onChange={()=>setBroadcastTargets(t=>t.includes(u.id)?t.filter(x=>x!==u.id):[...t,u.id])} />
                    {u.name}
                  </label>
                ))}
              </div>
            )}
            <button onClick={sendBroadcast} disabled={!broadcastContent.trim()} style={{ width:'100%', padding:'8px', background:theme.accent, color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>
              Send Broadcast
            </button>
          </div>
        )}

        {/* Conversation list */}
        <div style={{ flex:1, overflowY:'auto' }}>
          {/* Search results */}
          {showSearch && searchResults.length > 0 && (
            <div>
              <div style={{ padding:'8px 12px', fontSize:'11px', fontWeight:'600', color:theme.subtext, textTransform:'uppercase' }}>Search Results</div>
              {searchResults.map(r=>(
                <div key={r.id} style={{ padding:'10px 12px', borderBottom:`1px solid ${theme.border}`, cursor:'pointer' }}
                  onClick={()=>{ const c = conversations.find(x=>x.id===r.conversation_id); if(c) openConv(c); }}>
                  <div style={{ fontSize:'12px', color:theme.subtext }}>{r.conv_name||'Direct'}</div>
                  <div style={{ fontSize:'13px', color:theme.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.content}</div>
                  <div style={{ fontSize:'11px', color:theme.subtext }}>{timeStr(r.created_at)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Normal conv list */}
          {!showSearch && (loading ? (
            <div style={{ padding:'24px', textAlign:'center', color:theme.subtext, fontSize:'13px' }}>Loading...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding:'32px', textAlign:'center', color:theme.subtext }}>
              <div style={{ fontSize:'32px', marginBottom:'8px' }}>💬</div>
              <p style={{ fontSize:'13px', margin:0 }}>No conversations yet</p>
              <p style={{ fontSize:'12px', margin:'4px 0 0' }}>Start a chat using ✏️</p>
            </div>
          ) : conversations.map(conv => {
            const isActive = activeConv?.id === conv.id;
            const lastMsg = conv.last_message;
            const unreadCount = parseInt(conv.unread_count)||0;
            const convName = getConvName(conv);
            const convPic = getConvPic(conv);
            const online = getConvOnline(conv);
            return (
              <div key={conv.id} onClick={()=>openConv(conv)} style={{
                display:'flex', alignItems:'center', gap:'10px', padding:'12px 14px',
                cursor:'pointer', borderBottom:`1px solid ${theme.border}`,
                background: isActive ? theme.accent+'22' : 'transparent',
                transition:'background 0.1s'
              }}>
                <Avatar name={conv.type==='group'?(conv.name||'G'):convName} pic={convPic} size={40} online={conv.type==='direct'?online:undefined} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'14px', fontWeight: unreadCount>0?'700':'600', color:theme.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'160px' }}>{convName}</span>
                    <span style={{ fontSize:'11px', color:theme.subtext, flexShrink:0 }}>{lastMsg ? timeStr(lastMsg.created_at) : ''}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'2px' }}>
                    <span style={{ fontSize:'12px', color:unreadCount>0?theme.text:theme.subtext, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'180px', fontWeight:unreadCount>0?'600':'400' }}>
                      {lastMsg ? (lastMsg.file_name ? `📎 ${lastMsg.file_name}` : lastMsg.content?.slice(0,40)) : (conv.type==='group'?`${conv.member_count} members`:'')}
                    </span>
                    {unreadCount > 0 && (
                      <span style={{ background:theme.accent, color:'#fff', borderRadius:'20px', padding:'1px 7px', fontSize:'11px', fontWeight:'700', flexShrink:0 }}>{unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          }))}
        </div>

        {/* Online users strip */}
        <div style={{ padding:'10px 12px', borderTop:`1px solid ${theme.border}`, background:theme.bg }}>
          <div style={{ fontSize:'11px', fontWeight:'600', color:theme.subtext, marginBottom:'7px', textTransform:'uppercase' }}>
            Online — {presence.filter(p=>p.is_online && p.id !== parseInt(user?.id)).length}
          </div>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            {presence.filter(p=>p.is_online && p.id !== parseInt(user?.id)).slice(0,8).map(p=>(
              <div key={p.id} title={p.name} style={{ cursor:'pointer' }} onClick={()=>startDirectChat(p.id)}>
                <Avatar name={p.name} pic={p.profile_picture} size={30} online={true} />
              </div>
            ))}
            {presence.filter(p=>p.is_online && p.id !== parseInt(user?.id)).length === 0 && (
              <span style={{ fontSize:'12px', color:theme.subtext }}>No one else online</span>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT: CHAT AREA ── */}
      {activeConv ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
          {/* Chat header */}
          <div style={{ padding:'14px 20px', borderBottom:`1px solid ${theme.border}`, display:'flex', alignItems:'center', gap:'12px', background:theme.card }}>
            <Avatar name={activeConv.type==='group'?(activeConv.name||'G'):getConvName(activeConv)} pic={getConvPic(activeConv)} size={38} online={activeConv.type==='direct'?getConvOnline(activeConv):undefined} />
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:'700', fontSize:'15px', color:theme.text }}>{getConvName(activeConv)}</div>
              <div style={{ fontSize:'12px', color:theme.subtext }}>
                {activeConv.type==='group' ? `${activeConv.member_count} members` :
                  getConvOnline(activeConv) ? '🟢 Online' : 'Offline'}
              </div>
            </div>
            {activeConv.type === 'group' && !activeConv.is_default && (
              <button onClick={async()=>{ if(confirm('Leave this group?')) { await api(`/messages/conversations/${activeConv.id}/leave`,{method:'DELETE'}); setActiveConv(null); loadConversations(); }}} style={{ background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:'8px', padding:'6px 12px', cursor:'pointer', fontSize:'12px' }}>
                Leave
              </button>
            )}
          </div>

          {/* Messages area */}
          <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:'4px' }}>
            {msgLoading ? (
              <div style={{ textAlign:'center', color:theme.subtext, padding:'40px', fontSize:'13px' }}>Loading messages...</div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign:'center', color:theme.subtext, padding:'40px' }}>
                <div style={{ fontSize:'36px', marginBottom:'8px' }}>💬</div>
                <p style={{ margin:0, fontSize:'14px' }}>No messages yet — say hello!</p>
              </div>
            ) : messages.map((msg, i) => {
              const isMine = msg.sender_id === parseInt(user?.id);
              const showName = !isMine && activeConv.type !== 'direct' && (i===0 || messages[i-1]?.sender_id !== msg.sender_id);
              const isDeleted = msg.is_deleted;
              const reactions = msg.reactions || [];
              const readCount = parseInt(msg.read_count)||0;
              const isFile = !!msg.file_url;
              const isImage = msg.file_type?.includes('image');

              return (
                <div key={msg.id} style={{ display:'flex', flexDirection:'column', alignItems:isMine?'flex-end':'flex-start', marginBottom:'2px' }}>
                  {showName && <span style={{ fontSize:'11px', color:theme.subtext, marginLeft:'8px', marginBottom:'2px' }}>{msg.sender_name}</span>}
                  <div style={{ position:'relative', maxWidth:'68%' }}
                    onMouseEnter={()=>setReactionMsg(msg.id)}
                    onMouseLeave={()=>setReactionMsg(null)}>

                    {/* Reaction picker on hover */}
                    {reactionMsg === msg.id && !isDeleted && (
                      <div style={{
                        position:'absolute', [isMine?'left':'right']:'-100%',
                        top:'-36px', zIndex:10,
                        background:theme.card, border:`1px solid ${theme.border}`,
                        borderRadius:'20px', padding:'4px 8px', display:'flex', gap:'4px',
                        boxShadow:'0 2px 8px rgba(0,0,0,0.15)'
                      }}>
                        {REACTIONS.map(e=>(
                          <button key={e} onClick={()=>react(msg.id,e)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'16px', padding:'2px', lineHeight:1 }}>{e}</button>
                        ))}
                        {isMine && (
                          <button onClick={()=>deleteMsg(msg.id)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'13px', padding:'2px', color:'#dc2626' }}>🗑️</button>
                        )}
                      </div>
                    )}

                    <div style={{
                      background: isMine ? theme.accent : theme.bg,
                      color: isMine ? '#fff' : theme.text,
                      borderRadius: isMine ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      padding: isImage ? '4px' : '10px 14px',
                      fontSize:'14px', lineHeight:'1.5',
                      opacity: isDeleted ? 0.5 : 1,
                      border:`1px solid ${theme.border}`
                    }}>
                      {isDeleted ? (
                        <span style={{ fontStyle:'italic', opacity:0.7 }}>Message deleted</span>
                      ) : isImage ? (
                        <img src={msg.file_url} alt={msg.file_name} style={{ maxWidth:'240px', borderRadius:'12px', display:'block' }} />
                      ) : isFile ? (
                        <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'4px 0' }}>
                          <span style={{ fontSize:'28px' }}>{getFileIcon(msg.file_type)}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:'600', fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color: isMine?'#fff':theme.text }}>{msg.file_name}</div>
                            <div style={{ fontSize:'11px', opacity:0.7 }}>{formatSize(msg.file_size)}</div>
                          </div>
                          <a href={msg.file_url} download={msg.file_name} target="_blank" rel="noopener noreferrer"
                            style={{ background: isMine?'rgba(255,255,255,0.25)':'rgba(0,0,0,0.08)', borderRadius:'8px', padding:'5px 10px', fontSize:'12px', color:isMine?'#fff':theme.text, textDecoration:'none', fontWeight:'600' }}>
                            📥
                          </a>
                        </div>
                      ) : msg.content}
                    </div>

                    {/* Reactions display */}
                    {reactions.length > 0 && (
                      <div style={{ display:'flex', gap:'3px', marginTop:'3px', flexWrap:'wrap', justifyContent:isMine?'flex-end':'flex-start' }}>
                        {Object.entries(reactions.reduce((acc,r)=>{ if(r?.emoji){ acc[r.emoji]=(acc[r.emoji]||[]);acc[r.emoji].push(r.user_name); } return acc; },{})).map(([emoji,users])=>(
                          <button key={emoji} onClick={()=>react(msg.id,emoji)} title={users.join(', ')}
                            style={{ background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:'20px', padding:'2px 7px', fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'3px' }}>
                            {emoji} <span style={{ fontSize:'10px', color:theme.subtext }}>{users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Time + read receipt */}
                    <div style={{ fontSize:'10px', color:theme.subtext, marginTop:'2px', textAlign:isMine?'right':'left', paddingRight: isMine?'2px':'0' }}>
                      {timeStr(msg.created_at)}
                      {isMine && <span style={{ marginLeft:'4px', color: readCount>1?'#3b82f6':'#94a3b8' }}>{readCount>1?'✓✓':'✓'}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div style={{ padding:'12px 16px', borderTop:`1px solid ${theme.border}`, background:theme.card }}>
            {uploadingFile && (
              <div style={{ fontSize:'12px', color:theme.subtext, marginBottom:'6px' }}>⏳ Uploading file...</div>
            )}
            <form onSubmit={sendMessage} style={{ display:'flex', gap:'8px', alignItems:'center' }}>
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp" onChange={e=>{if(e.target.files[0]) sendFile(e.target.files[0]); e.target.value='';}} style={{ display:'none' }} />
              <button type="button" onClick={()=>fileInputRef.current.click()} style={{ background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:'8px', padding:'9px 12px', cursor:'pointer', fontSize:'16px', color:theme.subtext, flexShrink:0 }} title="Attach file">📎</button>
              <input
                value={input} onChange={e=>setInput(e.target.value)}
                placeholder="Type a message..."
                style={{ flex:1, padding:'10px 14px', border:`2px solid ${theme.border}`, borderRadius:'10px', fontSize:'14px', outline:'none', background:theme.bg, color:theme.text }}
                onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey) sendMessage(e); }}
              />
              <button type="submit" disabled={sending||!input.trim()} style={{ background:sending||!input.trim()?'#9ca3af':theme.accent, color:'#fff', border:'none', borderRadius:'10px', padding:'10px 18px', cursor:sending||!input.trim()?'not-allowed':'pointer', fontSize:'15px', fontWeight:'700', flexShrink:0 }}>
                ➤
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:theme.subtext }}>
          <div style={{ fontSize:'56px', marginBottom:'16px' }}>💬</div>
          <h3 style={{ margin:'0 0 8px', color:theme.text, fontSize:'18px' }}>Your Messages</h3>
          <p style={{ margin:0, fontSize:'14px' }}>Select a conversation or start a new one</p>
          <button onClick={()=>setShowNewConv(true)} style={{ marginTop:'20px', padding:'10px 24px', background:theme.accent, color:'#fff', border:'none', borderRadius:'10px', cursor:'pointer', fontWeight:'600', fontSize:'14px' }}>
            Start New Chat
          </button>
        </div>
      )}
    </div>
  );
}
