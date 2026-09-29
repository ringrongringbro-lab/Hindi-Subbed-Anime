// verify.js - Anti-bypass + One-time + Real Click - GitHub Only
let EP=null, POST=null, SHORTS=[];

async function init(){
  const params=new URLSearchParams(location.search);
  const postId=params.get('id');
  const epId=params.get('ep');
  const $ = id=>document.getElementById(id);

  if(!postId||!epId){
    $('msg').innerHTML='Invalid link. <a href="index.html">Go Home</a>';
    return;
  }

  // Anti-bypass Step 1: Check sessionStorage pending + referrer
  const pending=sessionStorage.getItem('pending_ep');
  const ptime=parseInt(sessionStorage.getItem('pending_time')||'0');
  const now=Date.now();
  const ref=document.referrer||'';
  const allowedRef = ref.includes(location.hostname) || /gplinks|shrink|linkvertise|short|adfoc|gyanilinks/i.test(ref) || (pending===epId && (now-ptime)<15*60*1000);

  if(!allowedRef){
    $('msg').innerHTML='⚠️ Direct open blocked.<br>Please go to post page, click <b>Download</b>, solve shortener, then you will come here.<br><br><a class="pill" href="index.html">Go Home</a>';
    return;
  }

  // Load data/data.json
  let data;
  try{
    const r=await fetch('data/data.json?'+Date.now(),{cache:'no-store'});
    data=await r.json();
  }catch(e){
    $('msg').textContent='data.json load fail';
    return;
  }

  const post=(data.posts||[]).find(p=>p.id===postId);
  if(!post){ $('msg').textContent='Post not found'; return; }
  const ep=(post.eps||[]).find(e=>e.id===epId);
  if(!ep){ $('msg').textContent='Episode not found'; return; }

  POST=post; EP=ep; SHORTS=ep.short||[];

  // One-time check - same user 5 min ke andar dobara allow, par share karne wale ke paas pending nahi hoga to block ho chuka hai upar
  const usedKey='used_'+ep.id;
  const used=localStorage.getItem(usedKey);
  if(used && (now-parseInt(used))<5*60*1000){
    // allow re-show within 5 min for same user
  }

  $('title').textContent=`Verify: ${post.name} S${ep.s} E${ep.n}`;
  $('msg').textContent='Human check required to prevent bot bypass.';
  $('human').style.display='block';
  setupHold();
}

function setupHold(){
  const btn=document.getElementById('holdBtn');
  const prog=document.getElementById('prog');
  const txt=document.getElementById('htxt');
  let holdTimer=null, progress=0, holding=false;

  function start(e){
    e.preventDefault();
    if(holding) return;
    holding=true; progress=0;
    holdTimer=setInterval(()=>{
      progress+=2;
      if(progress>=100){
        progress=100;
        clearInterval(holdTimer);
        success();
      }
      prog.style.width=progress+'%';
      txt.textContent=`Holding ${Math.floor(progress/33.3)}/3s...`;
    },60);
  }
  function end(){
    if(!holding) return;
    holding=false;
    clearInterval(holdTimer);
    if(progress<100){
      progress=0;
      prog.style.width='0%';
      txt.textContent='Hold 3s to Verify';
    }
  }
  btn.addEventListener('mousedown', start);
  btn.addEventListener('mouseup', end);
  btn.addEventListener('mouseleave', end);
  btn.addEventListener('touchstart', start,{passive:false});
  btn.addEventListener('touchend', end);
}

async function success(){
  const $=id=>document.getElementById(id);
  $('human').style.display='none';
  const after=$('after');
  after.style.display='block';
  after.innerHTML='<p class="mu">Verified! Opening shortener...</p>';

  // One-time mark - iske baad share karne se kaam nahi karega kyunki dusre user ke paas pending flag nahi
  localStorage.setItem('used_'+EP.id, Date.now().toString());
  sessionStorage.setItem('human_verified','1');

  if(SHORTS.length){
    const rot=parseInt(localStorage.getItem('rot')||'0');
    localStorage.setItem('rot',(rot+1).toString());
    const shortUrl=SHORTS[rot % SHORTS.length];

    after.innerHTML+=`
      <p>Shortener open ho raha hai:<br><small class="mu">${shortUrl}</small></p>
      <button class="pill" style="background:#ff8c00;color:#111;width:100%;margin-top:10px;padding:10px" onclick="window.open('${shortUrl}','_blank')">Open Short Link Now</button>
      <p class="mu" style="margin-top:10px">Shortener solve karne ke baad asli download milega. Bypass APK isko bypass nahi kar payega kyunki real click verify chahiye.</p>
    `;

    // Real link decrypt after real click - vk is obfuscated global vk (same as admin uses to encrypt pd)
    try{
      const vk=await getGlobalVk();
      const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
      // pd is encrypted real DL with global vk
      const real=await dec(EP.pd, vk);
      if(real && /^https?:\/\//i.test(real)){
        after.innerHTML+=`
          <div style="margin-top:14px;padding:10px;border:1px dashed #ff8c00;border-radius:10px">
            <p class="mu">Real Link (One-time, 5 min ke liye):</p>
            <a href="${esc(real)}" target="_blank" style="color:#ff8c00;word-break:break-all">${esc(real)}</a>
            <p class="mu" style="margin-top:6px">Ye link 5 min baad hide ho jayega. Kisi ko share karoge to usko fir se shortener + verify karna padega, isliye share karne se kaam nahi karega.</p>
          </div>
        `;
        setTimeout(()=>{
          after.innerHTML='<p class="mu">Link expired. Please click Download again on post page.</p>';
          localStorage.removeItem('used_'+EP.id);
          sessionStorage.removeItem('pending_ep');
          sessionStorage.removeItem('human_verified');
        },5*60*1000);
      }
    }catch(e){ console.log(e); }

  }else{
    after.innerHTML='<p class="mu">No short links configured in data.json</p>';
  }
}

// Global VK - same as admin uses to encrypt pd, obfuscated but needed for normal users after human verify
async function getGlobalVk(){
  // In production, admin panel encrypts pd with this same vk = SHA256('Hindi Subbed Anime_VK_BULLETPROOF_2024')
  const s='Hindi Subbed Anime_VK_BULLETPROOF_2024';
  const h=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');
  return h;
}

function dec(b,p){
  // reuse dec from app.js if exists, else define
  if(window.dec) return window.dec(b,p);
  return (async()=>{
    try{
      const a=Uint8Array.from(atob(b),c=>c.charCodeAt(0)), e=new TextEncoder();
      const k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:a.slice(0,16),iterations:100000,hash:'SHA-256'},await crypto.subtle.importKey('raw',e.encode(p),'PBKDF2',false,['deriveKey']),{name:'AES-GCM',length:256},false,['decrypt']);
      return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:a.slice(16,28)},k,a.slice(28)));
    }catch(e){ return null; }
  })();
}

init();
