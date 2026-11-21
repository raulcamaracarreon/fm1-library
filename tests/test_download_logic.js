// Verificaciones de interfaz de descargas sin navegador ni red.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync('public/app.js','utf8');
const stop=app.indexOf("for(const id of ['search'");
assert(stop>0,'Fin de definiciones no encontrado');
const dom={getElementById:()=>({})};
const ctx={document:dom,URL};
vm.runInNewContext(app.slice(0,stop)+';this.check={hasDirectAsset,hasVerifiedPages,downloadActionLabel};',ctx);
const {hasDirectAsset,hasVerifiedPages,downloadActionLabel}=ctx.check;
const catalog=JSON.parse(fs.readFileSync('public/catalog.json','utf8'));
const jiant=catalog.firmwares.find(f=>f.id==='jiant');
assert(jiant,'JIANT registrado');
assert.equal(hasDirectAsset(jiant),false);
assert.equal(downloadActionLabel(jiant),'Opciones JIANT ↗');
const page={...jiant,downloadKind:'github_pages',
  downloadUrl:'https://juanjiant-bit.github.io/JIANT/firmware/felucca-V10.7.58.fwsc',
  downloadVerifiedAt:'2026-11-21'};
assert.equal(hasVerifiedPages(page),true);
assert.equal(downloadActionLabel(page),'JIANT · .fwsc / opciones ↗');
assert.equal(hasVerifiedPages({...page,downloadUrl:'https://example.com/fake.fwsc'}),false);
assert.equal(hasDirectAsset({assetId:'1234',repoSlug:'author/repo'}),true);
assert.equal(hasDirectAsset({assetId:'',repoSlug:'author/repo'}),false);
assert.equal(downloadActionLabel({id:'another',assetId:'',repoSlug:'a/b'}),'Ver opciones ↗');
assert.equal(downloadActionLabel({id:'another',assetId:'1234',repoSlug:'a/b'}),'Descargar .fwsc ↗');
const html=fs.readFileSync('public/index.html','utf8');
assert(html.includes('id="downloadDialog"'));
assert(html.includes('id="downloadHelpContent"'));
console.log('Descargas: estados y cuadro de ayuda OK');
