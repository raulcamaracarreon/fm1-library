'use strict';
/* La web solo consulta archivos publicados en SU PROPIO dominio.
 * Un único workflow diario consulta The Firmware Hub y actualiza estos JSON.
 */
const SOURCE = 'https://thefirmwarehub.com/';
const cats = {groove:'Groovebox',synth:'Sintetizador',drums:'Percusión',tracker:'Tracker',chords:'Acordes',dev:'Desarrollo',other:'Otros',official:'Oficial'};
const $ = id => document.getElementById(id);
const state = {all:[],changes:{new:[],updated:[]},date:'',loaded:false};
const rankingCache = {installs:new Map(),stars:new Map()};
const text = (s) => document.createTextNode(String(s ?? ''));
function el(tag, cls, value){const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.append(text(value));return e;}
function link(url,label){const a=el('a','',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function catLabels(value){return String(value).split(',').map(s=>cats[s.trim()]||s.trim()).join(' · ');}
function chipLabel(f){return f.chip==='old'?'Flash antiguo':f.chip==='new'?'Flash nuevo':f.chip==='any'?'Flash universal':'';}
function shortDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)?new Date(s+'T12:00:00Z').toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}):'';}
function validUrl(x){try{return new URL(x).protocol==='https:'}catch{return false;}}
function metric(f, key){return Number.isInteger(f[key]) && f[key]>=0 ? f[key] : null;}
function metricDesc(a,b,key){
  const av=metric(a,key), bv=metric(b,key);
  if(av===null && bv===null) return a.name.localeCompare(b.name,'es');
  if(av===null) return 1;
  if(bv===null) return -1;
  return (bv-av)||a.name.localeCompare(b.name,'es');
}
function rebuildRankings(){
  for(const key of ['installs','stars']){
    const ranking=state.all.filter(f=>metric(f,key)!==null).sort((a,b)=>metricDesc(a,b,key));
    rankingCache[key]=new Map(ranking.map((f,i)=>[f.id,i+1]));
  }
}
function allowedByRanking(f, value){
  if(value==='all')return true;
  const match=/^(installs|stars)_(top|min)(\d+)$/.exec(value);
  if(!match)return true;
  const [,key,mode,count]=match;
  return mode==='top' ? (rankingCache[key].get(f.id) ?? Infinity) <= Number(count) :
    metric(f,key)!==null && metric(f,key)>=Number(count);
}
function aButton(label, href, cls=''){const a=link(href,label);a.className='button '+cls;return a;}

// Solo se presenta una descarga directa cuando el catálogo identifica un asset de GitHub.
// Si falta o falla, se muestran alternativas en lugar de redirigir sin explicación.
function hasVerifiedPages(f){
  try{
    const url=new URL(f.downloadUrl);
    return f.downloadKind==='github_pages' && url.protocol==='https:'
      && url.hostname.endsWith('.github.io') && /\.fwsc$/i.test(url.pathname)
      && typeof f.downloadVerifiedAt==='string' && /^\d{4}-\d{2}-\d{2}$/.test(f.downloadVerifiedAt);
  }catch{return false;}
}
function hasDirectAsset(f){
  return /^\d+$/.test(String(f.assetId||'')) && /^[\w.\-]+\/[\w.\-]+$/.test(String(f.repoSlug||''));
}
function downloadActionLabel(f){
  if(f.id==='jiant')return hasVerifiedPages(f)?'JIANT · .fwsc / opciones ↗':'Opciones JIANT ↗';
  return (hasVerifiedPages(f)||hasDirectAsset(f))?'Descargar .fwsc ↗':'Ver opciones ↗';
}
function showDownloadHelp(f, error=''){
  const body=$('downloadHelpContent');
  body.replaceChildren();
  body.append(el('h3','',f.name+' · '+f.version));
  const wanted=el('p','help-filename','Archivo del catálogo: ');
  wanted.append(el('code','',f.pkgFile||'no especificado'));
  body.append(wanted);
  const links=el('div','help-links');

  if(f.id==='jiant'){
    body.append(el('p','',
      'JIANT no distribuye el .fwsc como descarga independiente en su página actual. El autor retiró esa opción porque instalar solo el paquete en el FM-1 físico puede dejar incompleta la parte Bluetooth. Para hardware, utiliza su instalador oficial.'));
    if(hasVerifiedPages(f)){
      body.append(el('p','',
        'Para FM-1 Emulator (VST), localizamos un .fwsc en GitHub Pages y verificamos que su SHA-256 coincide con el catálogo. No utilices esta descarga para actualizar el hardware físico.'));
      links.append(aButton('Descargar .fwsc para EMULADOR ↗',f.downloadUrl,'primary'));
      body.append(el('p','',`Archivo verificado: ${f.downloadUrl.split('/').pop()} · Revisión: ${f.downloadVerifiedAt}.`));
    }else{
      body.append(el('p','',
        'El proyecto publica paquetes mediante su instalador web, pero todavía no hemos verificado un .fwsc descargable para la versión del catálogo. El nombre del paquete del autor puede diferir del mostrado por The Firmware Hub.'));
    }
    body.append(el('p','',
      'Para Reason o Reaper también existe JIANT VST3 para Windows (edición experimental). Es un instrumento virtual independiente y NO es un .fwsc que se cargue en FM-1 Emulator.'));
    links.append(aButton('Ver manifiesto de versiones del autor ↗','https://juanjiant-bit.github.io/JIANT/firmware/versions.json'));
    links.append(aButton('Instalador FM-1 (hardware) ↗',
      'https://juanjiant-bit.github.io/JIANT/webapp/installer/'));
    links.append(aButton('Descargar JIANT VST3 Windows (preview) ↗',
      'https://github.com/juanjiant-bit/JIANT/releases/download/ports-v0.9.18-preview1/JIANT-FM-Windows-v0.9.18-preview1.zip','primary'));
    links.append(aButton('Ver todas las versiones del autor ↗',
      'https://github.com/juanjiant-bit/JIANT/releases'));
    links.append(aButton('Probar JIANT en navegador ↗',
      'https://juanjiant-bit.github.io/JIANT/emu/'));
  }else{
    body.append(el('p','',error ||
      'El catálogo no incluye un archivo directo verificado para este proyecto. Puedes revisar la publicación del autor y buscar el nombre indicado arriba; algunos desarrolladores utilizan instaladores web en lugar de adjuntar un .fwsc.'));
    if(hasVerifiedPages(f))links.append(aButton('Descargar .fwsc original ↗',f.downloadUrl,'primary'));
    const releaseUrl=validUrl(f.release)?f.release:f.repo;
    if(validUrl(releaseUrl))links.append(aButton('Publicación del autor ↗',releaseUrl,'primary'));
    if(/^[\w.\-]+\/[\w.\-]+$/.test(String(f.repoSlug||''))){
      const ghReleases=`https://github.com/${f.repoSlug}/releases`;
      if(ghReleases!==releaseUrl)links.append(aButton('Releases de GitHub ↗',ghReleases));
    }
    if(validUrl(f.repo))links.append(aButton('Código fuente ↗',f.repo));
    if(validUrl(f.play))links.append(aButton('Probar en navegador ↗',f.play));
  }
  body.append(links);
  const dialog=$('downloadDialog');
  if(typeof dialog.showModal==='function')dialog.showModal();
  else dialog.setAttribute('open','');
}
async function openGitHubFirmware(f){
  if(f.id==='jiant'){showDownloadHelp(f);return;}
  if(hasVerifiedPages(f)){window.open(f.downloadUrl,'_blank','noopener');return;}
  if(!hasDirectAsset(f)){showDownloadHelp(f);return;}
  // El contexto de clic permite abrir una pestaña antes de la llamada asíncrona.
  const tab=window.open('about:blank','_blank');
  if(tab){
    tab.opener=null;
    const p=tab.document.createElement('p');
    p.textContent='Localizando paquete .fwsc en GitHub…';
    tab.document.body.append(p);
  }
  try{
    const endpoint=`https://api.github.com/repos/${f.repoSlug}/releases/assets/${f.assetId}`;
    const resp=await fetch(endpoint,{headers:{'Accept':'application/vnd.github+json'}});
    if(!resp.ok)throw Error(`GitHub devolvió ${resp.status}`);
    const info=await resp.json();
    const url=info.browser_download_url;
    if(typeof url!=='string' || !url.startsWith('https://github.com/') || !/\.fwsc(?:\?|$)/i.test(url))throw Error('No encontramos un adjunto .fwsc verificado');
    if(tab)tab.location.replace(url);
    else showDownloadHelp(f,'El navegador bloqueó la pestaña de descarga. Abre la publicación del autor para obtener el archivo.');
  }catch(e){
    if(tab)tab.close();
    showDownloadHelp(f,'No pudimos confirmar una descarga directa desde GitHub ('+e.message+'). No significa necesariamente que no exista; revisa las opciones oficiales.');
  }
}

function newCard(f){
  const row=el('article','firmware');
  const main=el('div');main.append(el('div','name',f.name));main.append(el('div','by',f.author));
  const meta=el('div','meta');meta.style.marginTop='7px';meta.append(el('span','chip',catLabels(f.category)));
  if(f.beta)meta.append(el('span','flag','Beta'));
  if(state.changes.new.includes(f.id))meta.append(el('span','flag new','Nuevo'));
  else if(state.changes.updated.includes(f.id))meta.append(el('span','flag new','Actualizado'));
  main.append(meta);
  const vers=el('div');vers.append(el('div','ver','v'+f.version));
  vers.append(el('div','small',shortDate(f.date)||'Fecha no indicada'));
  const cat=el('div','category');cat.append(el('div','small',f.pkgFile));
  if(chipLabel(f))cat.append(el('div','small',chipLabel(f)));
  const metrics=el('div','ranking-metrics');
  metrics.append(el('span','',`⬇ Hub: ${metric(f,'installs')===null?'—':metric(f,'installs').toLocaleString('es-MX')}`));
  metrics.append(el('span','',`★ GitHub: ${metric(f,'stars')===null?'—':metric(f,'stars').toLocaleString('es-MX')}`));
  main.append(metrics);
  const actions=el('div','links');
  if(validUrl(f.play))actions.append(link(f.play,'Probar ↗'));
  if(validUrl(f.editor))actions.append(link(f.editor,'Editor ↗'));
  actions.append(link(f.repo,'Código ↗'));
  if(f.id==='mvave-original-v15'){
    actions.append(aButton('Sitio oficial ↗',f.release,'primary'));
  }else{
    const direct=hasDirectAsset(f)||hasVerifiedPages(f);
    const btn=el('button',direct?'button primary':'button soft',downloadActionLabel(f));btn.type='button';
    btn.title=direct?'Buscar el adjunto .fwsc original en GitHub':'Ver alternativas y localizar el paquete sin redirecciones inesperadas';
    btn.addEventListener('click',()=>openGitHubFirmware(f));actions.append(btn);
  }
  row.append(main,vers,cat,actions);return row;
}
function matches(f,q,kind,hideBeta,onlyPlayable,onlyRecent){
  if(q && ![f.name,f.author,f.version,f.pkgFile,f.category].join(' ').toLocaleLowerCase().includes(q))return false;
  if(kind!=='all' && !String(f.category).split(',').map(x=>x.trim()).includes(kind))return false;
  if(hideBeta && f.beta)return false;
  if(onlyPlayable && !f.play)return false;
  if(onlyRecent && ![...state.changes.new,...state.changes.updated].includes(f.id))return false;
  return true;
}
function filtered(){
  const q=$('search').value.trim().toLocaleLowerCase(),kind=$('category').value;
  const ranking=$('ranking').value, onlyRanked=$('onlyRanked').checked;
  const all=state.all.filter(f=>matches(f,q,kind,$('hideBetas').checked,$('onlyPlayable').checked,$('onlyRecent').checked)
    && allowedByRanking(f,ranking)
    && (!onlyRanked || metric(f,'installs')!==null || metric(f,'stars')!==null));
  const order=$('order').value;
  all.sort((a,b)=>order==='installs'||order==='stars'?metricDesc(a,b,order):
    order==='date'?(b.date||'').localeCompare(a.date||'')||a.name.localeCompare(b.name,'es'):
    order==='author'?a.author.localeCompare(b.author,'es')||a.name.localeCompare(b.name,'es'):
    a.name.localeCompare(b.name,'es'));
  return all;
}
function render(){
  const rows=filtered();$('results').textContent=`${rows.length} resultados de ${state.all.length}`;
  const frag=document.createDocumentFragment();for(const f of rows)frag.append(newCard(f));
  $('firmwareList').replaceChildren(frag);$('empty').classList.toggle('hidden',rows.length!==0);
}
function populateKinds(){
  const previous=$('category').value;
  const keys=[...new Set(state.all.flatMap(f=>String(f.category).split(',').map(x=>x.trim())))].sort();
  const o=[new Option('Todos','all'),...keys.map(k=>new Option(cats[k]||k,k))];
  $('category').replaceChildren(...o);$('category').value=keys.includes(previous)?previous:'all';
}
async function load(){
  $('syncStatus').textContent='Cargando copia publicada...';$('error').classList.add('hidden');
  try{
    // El query anti-cache afecta solo a nuestro propio Netlify.
    const [catalogResp,changeResp]=await Promise.all([
      fetch('/catalog.json?ts='+Date.now(),{cache:'no-store'}),
      fetch('/changes.json?ts='+Date.now(),{cache:'no-store'})]);
    if(!catalogResp.ok)throw Error('El servidor no tiene catalog.json');
    const data=await catalogResp.json();
    if(!Array.isArray(data.firmwares))throw Error('Estructura del catálogo inesperada');
    const delta=changeResp.ok?await changeResp.json():{};
    state.all=data.firmwares;
    rebuildRankings();
    state.changes={new:delta.new||[],updated:delta.updated||[]};
    state.date=data.sourceUpdated||'no indicada';state.loaded=true;
    $('total').textContent=state.all.length.toLocaleString('es-MX');
    $('betas').textContent=state.all.filter(f=>f.beta).length.toLocaleString('es-MX');
    $('changes').textContent=(state.changes.new.length+state.changes.updated.length).toLocaleString('es-MX');
    $('syncStatus').textContent=`Corte del catálogo fuente: ${state.date} · Actualización automática diaria (GitHub Actions).`;
    populateKinds();render();
  }catch(err){
    $('syncStatus').textContent='No se pudo cargar la última instantánea.';
    $('error').textContent=`No se pudo cargar la biblioteca (${err.message}). Para probarla localmente, inicia un servidor web; no basta con abrir index.html mediante doble clic.`;
    $('error').classList.remove('hidden');
  }
}
function csvCell(v){return '"'+String(v??'').replaceAll('"','""')+'"';}
function exportCsv(){
  if(!state.loaded)return;
  const cols=['Nombre','Versión','Autor','Categoría','Beta','Fecha','Instalaciones Hub','Estrellas GitHub','Publicación original','Repositorio','Archivo de referencia','SHA-256'];
  const lines=[cols,...filtered().map(f=>[f.name,f.version,f.author,catLabels(f.category),f.beta?'Sí':'No',f.date,metric(f,'installs')??'',metric(f,'stars')??'',f.release,f.repo,f.pkgFile,f.sha256])];
  const csv='\uFEFF'+lines.map(row=>row.map(csvCell).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='FM1_catalogo_actualizado.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
for(const id of ['search','category','order','ranking','hideBetas','onlyPlayable','onlyRecent','onlyRanked']){
  $(id).addEventListener(id==='search'?'input':'change',render);
}
$('ranking').addEventListener('change',()=>{ const ranking=$('ranking').value; if(ranking.startsWith('installs_'))$('order').value='installs'; if(ranking.startsWith('stars_'))$('order').value='stars'; render(); });
$('reload').addEventListener('click',load);
$('export').addEventListener('click',exportCsv);
load();
