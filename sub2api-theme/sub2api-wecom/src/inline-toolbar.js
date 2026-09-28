/* Position original Vue controls over toolbar slots; never move their DOM nodes. */
function createInlineToolbar({toolbar,tabs,sort,selectedInfo,getContext,active,beforeAction}){
  const root=document.documentElement,entries=new Map();
  const strip=document.createElement('div');strip.className='s2wc-toolbar-scroll';
  const fields=document.createElement('div');fields.className='s2wc-toolbar-fields';
  strip.append(tabs,fields,sort,selectedInfo);
  const arrow=(label,value)=>{const b=document.createElement('button');b.type='button';b.className='s2wc-toolbar-arrow';b.textContent=value<0?'‹':'›';b.setAttribute('aria-label',label);b.onclick=()=>{
    const bounds=strip.getBoundingClientRect(),items=[tabs,...fields.children,sort,search].filter(el=>el&&el.getBoundingClientRect().width>0);
    const target=value>0?items.find(el=>el.getBoundingClientRect().left>bounds.left+1):items.filter(el=>el.getBoundingClientRect().left<bounds.left-1).pop();
    strip.scrollBy({left:target?target.getBoundingClientRect().left-bounds.left:value,behavior:'smooth'});
  };return b;};
  toolbar.replaceChildren(arrow('工具栏向左滚动',-280),strip,arrow('工具栏向右滚动',280));
  toolbar.setAttribute('aria-label','会话工具栏');toolbar.setAttribute('role','toolbar');
  let search=null,hovered=false,raf=0,destroyed=false;
  const setClass=(el,key,value)=>{if(el.classList.contains(key)!==value)el.classList.toggle(key,value);};
  const text=el=>(el?.textContent||'').replace(/\s+/g,' ').trim();
  function popupOpen(){return [...entries.keys()].some(el=>el.querySelector('[aria-expanded="true"],.date-picker-trigger-open,.select-trigger-open,.date-picker-dropdown'))||!!document.querySelector('.select-dropdown-portal');}
  function reveal(){
    if(destroyed||!root.classList.contains('s2wc')){root.classList.remove('s2wc-toolbar-revealed');return;}
    const focused=toolbar.contains(document.activeElement)||[...entries.keys()].some(el=>el.contains(document.activeElement));
    const overNative=[...entries.keys()].some(el=>el.matches(':hover'));
    setClass(root,'s2wc-toolbar-revealed',!!(hovered||focused||overNative||popupOpen()));
  }
  toolbar.addEventListener('pointerenter',()=>{hovered=true;reveal();});
  toolbar.addEventListener('pointerleave',()=>{hovered=false;reveal();});
  const schedule=()=>{if(!raf&&!destroyed)raf=requestAnimationFrame(()=>{raf=0;layout();reveal();});};
  const onFocus=()=>schedule();document.addEventListener('focusin',onFocus);document.addEventListener('focusout',onFocus);
  const onPointer=e=>{if(!toolbar.contains(e.target)&&![...entries.keys()].some(el=>el.contains(e.target)))schedule();};
  document.addEventListener('pointerover',onPointer);
  document.addEventListener('pointermove',e=>{const r=toolbar.getBoundingClientRect();const inside=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;if(inside!==hovered){hovered=inside;reveal();}},{passive:true});
  strip.addEventListener('scroll',()=>{schedule();if(popupOpen())window.dispatchEvent(new Event('resize'));},{passive:true});
  window.addEventListener('resize',schedule);
  const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;resizeObserver?.observe(toolbar);
  const styleNames=['position','left','top','width','height','min-width','max-width','margin','z-index','--s2wc-label-width','--s2wc-popup-shift'];
  function capture(el){return new Map(styleNames.map(k=>[k,[el.style.getPropertyValue(k),el.style.getPropertyPriority(k)]]));}
  function write(el,key,value){if(el.style.getPropertyValue(key)!==value||el.style.getPropertyPriority(key)!=='important')el.style.setProperty(key,value,'important');}
  function unregister(el,entry){
    el.classList.remove('s2wc-docked-control','s2wc-dock-visible','s2wc-dock-outside','s2wc-inline-labelled');el.removeAttribute('data-s2wc-dock-label');
    if(entry.title===null)el.removeAttribute('title');else el.setAttribute('title',entry.title);
    for(const [key,[value,priority]] of entry.styles){if(value)el.style.setProperty(key,value,priority);else el.style.removeProperty(key);}
    if(entry.trigger&&entry.aria!==undefined){if(entry.aria===null)entry.trigger.removeAttribute('aria-label');else entry.trigger.setAttribute('aria-label',entry.aria);}
    el.removeEventListener('pointerenter',entry.enter);el.removeEventListener('pointerleave',entry.leave);for(const name of ['click','input','change'])el.removeEventListener(name,entry.action,true);
    entry.slot.remove();entries.delete(el);
  }
  function controlRoot(control,main){
    const searchGroup=control.closest('.usage-filter-dropdown');if(searchGroup)return searchGroup;
    if(control.matches('.date-picker-trigger'))return control.parentElement;
    if(control.matches('.select-trigger')){
      const component=control.parentElement;
      return component.parentElement?.querySelector(':scope > .input-label')?component.parentElement:component;
    }
    if(control.matches('input,select')){
      const parent=control.parentElement;
      if(parent!==main&&(parent.matches('label,.relative')||parent.querySelector(':scope > .input-label')))return parent;
    }
    if(control.matches('button')&&control.parentElement?.classList.contains('relative')&&control.parentElement!==main)return control.parentElement;
    return control;
  }
  function discover(){
    const {main}=getContext();if(!main)return[];
    const candidates=[];
    for(const control of main.querySelectorAll('input:not([type="file"]):not([type="hidden"]),select,.select-trigger,.date-picker-trigger,button.btn')){
      if(!active(control)||control.closest('table,.s2wc-tool-record,[data-field],.s2wc-chart-hidden,[role="dialog"],.date-picker-dropdown,.select-dropdown-portal,[role="listbox"]'))continue;
      if(control.matches('.select-trigger')&&/按小时|按天|Hourly|Daily/i.test(text(control))&&control.closest('.card')?.querySelector('.date-picker-trigger'))continue;
      if(control.closest('.absolute')&&!control.matches('.select-trigger,.date-picker-trigger'))continue;
      const el=controlRoot(control,main);if(!candidates.includes(el))candidates.push(el);
    }
    return candidates.filter(el=>!candidates.some(other=>other!==el&&other.contains(el)));
  }
  function register(el){
    const slot=document.createElement('span');slot.className='s2wc-native-control-slot';
    const trigger=el.matches('input,select,button')?el:el.querySelector('input,select,button');
    let label=text(el.querySelector?.(':scope > .input-label'))||trigger?.getAttribute('aria-label')||trigger?.getAttribute('placeholder')||trigger?.title||text(trigger);
    if(label==='Select option')label=el.closest('.page-size-select')?'每页':text(el.parentElement?.querySelector(':scope > .input-label'))||'选择';
    const isField=!!el.querySelector?.('input,select,.select-trigger,.date-picker-trigger')||el.matches('input,select');
    const width=isField?(el.querySelector?.('.date-picker-trigger')?158:el.querySelector?.('input')||el.matches('input')?174:Math.min(196,Math.max(136,label.length*11+82))):Math.max(54,Math.min(142,label.length*12+20));
    slot.style.width=width+'px';slot.title=label;
    const entry={slot,styles:capture(el),trigger,aria:undefined,title:el.getAttribute('title'),enter:()=>reveal(),leave:()=>schedule(),action:()=>beforeAction?.()};
    if(!entry.title)el.title=label;
    if(trigger?.matches('.select-trigger')&&label!=='选择'){el.classList.add('s2wc-inline-labelled');el.setAttribute('data-s2wc-dock-label',label);el.style.setProperty('--s2wc-label-width',(Math.min(label.length,8)*11+14)+'px');}
    if(trigger?.matches('.select-trigger')&&trigger.getAttribute('aria-label')==='Select option'&&label!=='选择'){entry.aria=trigger.getAttribute('aria-label');trigger.setAttribute('aria-label',label);}
    el.addEventListener('pointerenter',entry.enter);el.addEventListener('pointerleave',entry.leave);el.classList.add('s2wc-docked-control');
    for(const name of ['click','input','change'])el.addEventListener(name,entry.action,true);
    entries.set(el,entry);return entry;
  }
  function sync(){
    destroyed=false;
    const controls=discover(),wanted=new Set(controls);
    for(const [el,entry] of entries)if(!wanted.has(el))unregister(el,entry);
    let previous=null;
    for(const el of controls){const entry=entries.get(el)||register(el);const desired=previous?previous.nextSibling:fields.firstChild;if(desired!==entry.slot)fields.insertBefore(entry.slot,desired);previous=entry.slot;}
    setClass(root,'s2wc-inline-controls',entries.size>0);schedule();
  }
  function layout(){
    const bounds=strip.getBoundingClientRect(),bar=toolbar.getBoundingClientRect();
    const enabled=root.classList.contains('s2wc')&&!root.classList.contains('s2wc-native-open')&&bar.width>0;
    for(const [el,entry] of entries){
      const r=entry.slot.getBoundingClientRect();const inView=enabled&&r.left>=bounds.left-1&&r.right<=bounds.right+1&&r.width>0;
      setClass(el,'s2wc-dock-outside',!inView);setClass(el,'s2wc-dock-visible',enabled);
      if(!enabled){for(const [key,[value,priority]] of entry.styles){if(value)el.style.setProperty(key,value,priority);else el.style.removeProperty(key);}continue;}
      write(el,'position','fixed');write(el,'left',Math.round(r.left)+'px');write(el,'top',Math.round(bar.top+(bar.height-32)/2)+'px');write(el,'width',Math.round(r.width)+'px');write(el,'height','32px');write(el,'min-width','0px');write(el,'max-width',Math.round(r.width)+'px');write(el,'margin','0px');write(el,'z-index','48');
      write(el,'--s2wc-popup-shift',Math.min(0,innerWidth-10-r.left-Math.min(320,innerWidth-80))+'px');
    }
  }
  function focus(source){
    const match=[...entries].find(([el])=>el===source||el.contains(source)||source?.contains(el));
    if(match){const [el,entry]=match;strip.scrollLeft+=entry.slot.getBoundingClientRect().left-strip.getBoundingClientRect().left;layout();(source?.matches('input,button,select')?source:entry.trigger)?.focus();}
    else{strip.scrollLeft=0;layout();toolbar.querySelector('button,select,input')?.focus();}
    reveal();
  }
  function attachSearch(el){search=el;el.classList.add('s2wc-toolbar-local-search');strip.append(el);}
  function restore(){for(const [el,entry] of [...entries])unregister(el,entry);root.classList.remove('s2wc-inline-controls','s2wc-toolbar-revealed');hovered=false;destroyed=true;cancelAnimationFrame(raf);raf=0;}
  return {sync,focus,attachSearch,restore,hasControls:()=>entries.size>0,has:source=>[...entries.keys()].some(el=>el===source||el.contains(source)||source?.contains(el)),layout,reveal,schedule};
}
