// Hindi Subbed Anime - Core JS - Fixed & Optimized
const $ = id => document.getElementById(id);
const esc = s => String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const kk = s => String(s||'').trim().toLowerCase();

// Auto Genre Detection: Handles "#Action #Adventure", "Action, Adventure", and "Action Adventure" automatically.
const gens = p => {
  let raw = (p.gen||[]).join(',');
  raw = raw.replace(/#/g, ','); // Hashtag to comma
  if(!raw.includes(',') && raw.includes(' ')) raw = raw.replace(/\s+/g, ','); // Space to comma if no comma exist
  return raw.split(/[,.;\/|]+/).map(s=>s.trim()).filter(Boolean);
};

const isUrl = u => /^https?:\/\//i.test(u);

// SHA-256 hash for VIP / verify
const H = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');

// AES-GCM Encrypt / Decrypt
async function enc(t,p){
  const e=new TextEncoder();
  const s=crypto.getRandomValues(new Uint8Array(16));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:s,iterations:100000,hash:'SHA-256'},await crypto.subtle.importKey('raw',e.encode(p),'PBKDF2',false,['deriveKey']),{name:'AES-GCM',length:256},false,['encrypt']);
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},k,e.encode(t)));
  const all=new Uint8Array(s.length+iv.length+ct.length);
  all.set(s,0); all.set(iv,s.length); all.set(ct,s.length+iv.length);
  return btoa(String.fromCharCode(...all));
}
async function dec(b,p){
  try{
    const a=Uint8Array.from(atob(b),c=>c.charCodeAt(0)), e=new TextEncoder();
    const k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:a.slice(0,16),iterations:100000,hash:'SHA-256'},await crypto.subtle.importKey('raw',e.encode(p),'PBKDF2',false,['deriveKey']),{name:'AES-GCM',length:256},false,['decrypt']);
    return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:a.slice(16,28)},k,a.slice(28)));
  }catch(e){ return null; }
}

function inj(h,el){
  if(!h) return;
  const t=document.createElement('template'); t.innerHTML=h;
  t.content.querySelectorAll('script').forEach(s=>{
    const n=document.createElement('script'); [...s.attributes].forEach(a=>n.setAttribute(a.name,a.value)); n.text=s.text; s.replaceWith(n);
  });
  el.append(t.content);
}

function cdnImg(u){
  if(!u) return 'https://placehold.co/600x338/232326/9f9fa9?text=No+Image';
  if(u.includes('wsrv.nl')) return u;
  return `https://wsrv.nl/?url=${encodeURIComponent(u)}&output=jpg&q=80`;
}

let CFG={};
async function load(){
  try{
    const r=await fetch('data/data.json?'+Date.now(),{cache:'no-store'});
    if(!r.ok) throw new Error('data.json missing');
    const d=await r.json();
    CFG=d.cfg||{};
    if(CFG.head) inj(CFG.head, document.head);
    if(CFG.body) inj(CFG.body, document.body);
    const ban=$('ban'); if(ban && CFG.ban) inj(CFG.ban, ban);
    const now=Date.now();
    if(d.posts) d.posts=d.posts.filter(p=>!p.expiry || p.expiry>now);
    return d;
  }catch(e){
    console.error(e);
    return {posts:[],vip:[],cfg:{}};
  }
}

// Security: LocalStorage taaki New Tab shortener issue na aaye
function setPending(epId){
  localStorage.setItem('pending_ep', epId);
  localStorage.setItem('pending_time', Date.now().toString());
}
function isHumanVerified(){
  return localStorage.getItem('human_verified')==='1';
}

// PWA Support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(()=>{}); });
}
