'use strict';
/* La web solo consulta archivos publicados en SU PROPIO dominio.
 * Un único workflow diario consulta The Firmware Hub y actualiza estos JSON.
 */
const SOURCE = 'https://thefirmwarehub.com/';
const cats = {groove:'Groovebox',synth:'Sintetizador',drums:'Percusión',tracker:'Tracker',chords:'Acordes',dev:'Desarrollo',other:'Otros',official:'Oficial'};
const $ = id => document.getElementById(id);
const state = {all:[],changes:{new:[],updated:[]},date:'',loaded:false};
const text = (s) => document.createTextNode(String(s ?? ''));
function el(tag, cls, value){const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.append(text(value));return e;}
function link(url,label){const a=el('a','',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function catLabels(value){return String(value).split(',').map(s=>cats[s.trim()]||s.trim()).join(' · ');}
function chipLabel(f){return f.chip==='old'?'Flash antiguo':f.chip==='new'?'Flash nuevo':f.chip==='any'?'Flash universal':'';}
function shortDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)?new Date(s+'T12:00:00Z').toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}):'';}
function validUrl(x){try{return new URL(x).protocol==='https:'}catch{return false;}}
function aButton(label, href, cls=''){const a=link(href,label);a.className='button '+cls;return a;}

// Resolución diferida del activo GitHub al pulsar. No recurre al espejo del Hub.
async function openGitHubFirmware(f){
  const fallback = validUrl(f.release)?f.release:f.repo;
  // Abrir sincronizadamente para evitar bloqueadores de ventanas emergentes.
  const tab=window.open('about:blank','_blank');
  if(!tab){window.location.href=fallback;return;}
  tab.opener = null;
  try{
    if(!f.assetId || !/^\d+$/.test(f.assetId) || !/^[\w.\-]+\/[\w.\-]+$/.test(f.repoSlug))throw Error('Sin identificador de archivo');
    const endpoint=`https://api.github.com/repos/${f.repoSlug}/releases/assets/${f.assetId}`;
    const resp=await fetch(endpoint,{headers:{'Accept':'application/vnd.github+json'}});
    if(!resp.ok)throw Error(`GitHub devolvió ${resp.status}`);
    const info=await resp.json();
    const url=info.browser_download_url;
    if(typeof url!=='string' || !url.startsWith('https://github.com/') || !/\.fwsc(?:\?|$)/i.test(url))throw Error('Enlace no disponible');
    tab.location.replace(url);
  }catch(e){tab.location.replace(fallback);}
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
  const actions=el('div','links');
  if(validUrl(f.play))actions.append(link(f.play,'Probar ↗'));
  if(validUrl(f.editor))actions.append(link(f.editor,'Editor ↗'));
  actions.append(link(f.repo,'Código ↗'));
  if(f.id==='mvave-original-v15'){
    actions.append(aButton('Archivo original ↗',f.release,'primary'));
  }else{
    const btn=el('button','button primary','Obtener .fwsc ↗');btn.type='button';
    btn.title='Busca el archivo original en GitHub; si no se puede, abre la publicación del autor';
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
  const all=state.all.filter(f=>matches(f,q,kind,$('hideBetas').checked,$('onlyPlayable').checked,$('onlyRecent').checked));
  const order=$('order').value;
  all.sort((a,b)=>order==='date'?(b.date||'').localeCompare(a.date||'')||a.name.localeCompare(b.name):order==='author'?a.author.localeCompare(b.author,'es')||a.name.localeCompare(b.name,'es'):a.name.localeCompare(b.name,'es'));
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
  const cols=['Nombre','Versión','Autor','Categoría','Beta','Fecha','Publicación original','Repositorio','Archivo de referencia','SHA-256'];
  const lines=[cols,...filtered().map(f=>[f.name,f.version,f.author,catLabels(f.category),f.beta?'Sí':'No',f.date,f.release,f.repo,f.pkgFile,f.sha256])];
  const csv='\uFEFF'+lines.map(row=>row.map(csvCell).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='FM1_catalogo_actualizado.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
for(const id of ['search','category','order','hideBetas','onlyPlayable','onlyRecent']){
  $(id).addEventListener(id==='search'?'input':'change',render);
}
$('reload').addEventListener('click',load);
$('export').addEventListener('click',exportCsv);
load();
