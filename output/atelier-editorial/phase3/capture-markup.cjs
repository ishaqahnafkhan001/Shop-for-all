const fs = require('node:fs');
const crypto = require('node:crypto');
const root = "C:/Users/user/WebstormProjects/Shop-for-all";
const {loadRoutes} = require(root + '/ecommerce-backend/backend/tests/helpers/atelier-routes.cjs');
const {getPrebuiltThemes,resolvePrebuiltTheme} = require(root + '/packages/storefront-theme/prebuilt.cjs');
(async()=>{
 const old=await loadRoutes({baseline:true}); const current=await loadRoutes(); const data={}; let same=0;
 for(const preset of getPrebuiltThemes()) {
  const theme=resolvePrebuiltTheme({presetId:preset.id,appliedAt:'2026-01-01T00:00:00Z'});
  for(const page of ['product','category','collection']) {
   const key=preset.id+'/'+page;
   const html=old.render(old.React.createElement(old.ui.Phase3Case,{page,theme}));
   data[key]=crypto.createHash('sha256').update(html).digest('hex');
   const actual=current.render(current.React.createElement(current.ui.Phase3Case,{page,theme}));
   if(html===actual)same++;else fs.writeFileSync(root+'/output/atelier-editorial/phase3/'+preset.id+'-'+page+'-mismatch.txt',actual);
  }
 }
 fs.writeFileSync(root+'/ecommerce-backend/backend/tests/fixtures/atelier-legacy/phase3-markup-sha256.json',JSON.stringify(data,null,2)+'\n');
 console.log({cases:Object.keys(data).length,identical:same});
})().catch(e=>{console.error(e);process.exitCode=1;});
