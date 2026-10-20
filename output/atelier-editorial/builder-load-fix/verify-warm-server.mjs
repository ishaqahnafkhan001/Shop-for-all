import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
const file=new URL('../../../packages/storefront-renderer/__store_builder_watch_probe__.mjs',import.meta.url);
const url='http://127.0.0.1:5173/node_modules/@scaleup/storefront-renderer/__store_builder_watch_probe__.mjs';
const metadata=new URL('../../../ecommerce-admin/node_modules/.vite/deps/_metadata.json',import.meta.url);
async function waitFor(marker) {
  const deadline=Date.now()+15000;
  while(Date.now()<deadline) {
    try { const r=await fetch(url); const text=await r.text(); if(r.ok&&text.includes(marker))return text; } catch {}
    await delay(200);
  }
  throw new Error('Vite did not serve '+marker);
}
let created=false;
try {
  await fs.writeFile(file,'export const marker = "store-builder-probe-before";\n',{flag:'wx'});
  created=true;
  await waitFor('store-builder-probe-before');
  await delay(500);
  const before=JSON.parse(await fs.readFile(metadata,'utf8')).browserHash;
  await fs.writeFile(file,'export const marker = "store-builder-probe-after";\n');
  const response=await waitFor('store-builder-probe-after');
  const deadline=Date.now()+15000;
  let after=before;
  while(Date.now()<deadline&&after===before){await delay(200);after=JSON.parse(await fs.readFile(metadata,'utf8')).browserHash;}
  assert.notEqual(after,before,'Shared source edit must force dependency optimization');
  assert.ok(response.includes('store-builder-probe-after'));
  const result={passed:true,servedUpdatedSource:true,optimizedDependencyHashChanged:true};
  console.log(JSON.stringify(result,null,2));
  await fs.writeFile(new URL('./warm-server-probe.json',import.meta.url),JSON.stringify(result,null,2));
} finally {
  if(created)await fs.unlink(file);
}
