/* Local assets are embedded at build time; no network or filesystem access at runtime. */
function createAvatarRenderer() {
  const key='sub2api-wecom-avatar-seed-v1';
  let seed;
  try { seed=localStorage.getItem(key); } catch { /* Session-stable fallback. */ }
  if(!seed){
    const bytes=new Uint32Array(2);
    try { crypto.getRandomValues(bytes); seed=Array.from(bytes).join('-'); }
    catch { seed=String(Math.random()); }
    try { localStorage.setItem(key,seed); } catch { /* Images remain usable without storage. */ }
  }
  const assignments=new Map();
  function selection(identity,group) {
    const cacheKey=`${group?'group':'person'}:${identity}`;
    if(assignments.has(cacheKey))return assignments.get(cacheKey);
    let state=2166136261;
    for(const c of seed+cacheKey)state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
    const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
    const shuffled=AVATAR_IMAGES.slice();
    for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
    const images=shuffled.slice(0,group?Math.min(9,shuffled.length):1);assignments.set(cacheKey,images);return images;
  }
  return function avatar(name,group=false,size='',identity=name){
    const box=document.createElement('span');box.className=`s2wc-im-avatar ${group?'is-group':''} ${size}`;box.setAttribute('aria-hidden','true');
    const images=selection(identity,group);
    for(const asset of images){
      const img=document.createElement('img');img.src=asset.src;img.alt='';img.draggable=false;img.decoding='async';
      img.dataset.avatar=asset.name;
      img.onerror=()=>{img.hidden=true;if(!group){box.textContent=[...name][0]||'S';box.style.background='#6096da';}};
      box.append(img);
    }
    if(!images.length){box.textContent=[...name][0]||'S';box.style.background='#6096da';}
    return box;
  };
}
