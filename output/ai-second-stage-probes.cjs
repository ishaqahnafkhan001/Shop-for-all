// Read-only second-stage probes. VM mocks; no Mongo connection or provider network.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const backend = path.resolve(__dirname, '../ecommerce-backend/backend');
const policyFile = path.join(backend,'services/ai/aiGenerationPolicyService.js');
function loadPolicy(models, usage) {
 const module = {exports:{}};
 const imports = {
  crypto:require('node:crypto'), '../../models/AiGenerationRequest':models,
  '../billing/planAccessService':{getShopPlanAccess:async()=>({limits:{aiProductCreationsPerWeek:10}})},
  '../billing/planUsageService':usage,
  '../billing/subscriptionEvents':{SUBSCRIPTION_EVENTS:{USAGE_CHANGED:'usage'},emitSubscriptionEvent:async()=>{}}
 };
 vm.runInNewContext(fs.readFileSync(policyFile,'utf8'),{module,require:key=>{
  if (!(key in imports)) throw Error('Unexpected import '+key); return imports[key];
 },Date,console},{filename:policyFile});
 return module.exports;
}
const req = {tenantId:'tenant-a',user:{id:'actor-a'},get:()=> 'product.content:fixture-001',planAccess:{limits:{aiProductCreationsPerWeek:10}}};
test('current source leaves reservation when post-reserve status save fails',async()=>{
 let reserved=0, deleted=false, releases=0;
 const p=loadPolicy({create:async()=>({_id:'a',save:async()=>{throw Error('injected save failure');}}),deleteOne:async()=>{deleted=true;}},{reserveWeeklyAiUsage:async()=>{reserved++;return{shopId:'tenant-a'};},releaseWeeklyAiUsage:async()=>{releases++;reserved--;}});
 await assert.rejects(p.beginAiGeneration({req,feature:'product.content'}),/injected/);
 assert.equal(reserved,1); assert.equal(deleted,true); assert.equal(releases,0);
});
test('current source cleanup after settlement can remove second pending reservation',async()=>{
 let reserved=2,used=0;
 const p=loadPolicy({updateOne:async()=>({matchedCount:1})},{completeWeeklyAiUsage:async()=>{reserved--;used++;},releaseWeeklyAiUsage:async()=>{if(reserved>0)reserved--;},getWeeklyAiUsage:async()=>{throw Error('injected usage read failure');}});
 const state={recordId:'a',reservation:{shopId:'tenant-a'},context:req.planAccess,feature:'product.content',startedAt:Date.now()};
 await assert.rejects(p.completeAiGeneration({req,state,result:{success:true},meta:{source:'provider'}}),/injected/);
 await p.failAiGeneration({req,state,error:Error('finalize failed')});
 assert.equal(used,1);assert.equal(reserved,0);
});
test('installed SDK forwards abort to local mocked fetch',async()=>{
 const saved=globalThis.fetch;let calls=0,aborted=false;
 globalThis.fetch=async(_,options)=>{calls++;return new Promise((resolve,reject)=>{
  options.signal.addEventListener('abort',()=>{aborted=true;reject(new DOMException('fixture abort','AbortError'));},{once:true});
 });};
 try{
  const {GoogleGenerativeAI}=require(path.join(backend,'node_modules/@google/generative-ai'));
  const model=new GoogleGenerativeAI('fixture-not-a-real-key').getGenerativeModel({model:'fixture-model'});
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15);
  try{await assert.rejects(model.generateContent('fixture',{signal:controller.signal}),e=>e instanceof require(path.join(backend,'node_modules/@google/generative-ai')).GoogleGenerativeAIAbortError);}finally{clearTimeout(timer);}
  assert.equal(calls,1);assert.equal(aborted,true);
 }finally{globalThis.fetch=saved;}
});
test('installed SDK does not propagate an already-aborted signal at construction',async()=>{
 const saved=globalThis.fetch;let receivedAborted;
 globalThis.fetch=async(_,options)=>{receivedAborted=options.signal.aborted;return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'fixture'}]}}]}),{status:200,headers:{'content-type':'application/json'}});};
 try{
  const {GoogleGenerativeAI}=require(path.join(backend,'node_modules/@google/generative-ai'));
  const controller=new AbortController();controller.abort();
  await new GoogleGenerativeAI('fixture-not-a-real-key').getGenerativeModel({model:'fixture-model'}).generateContent('fixture',{signal:controller.signal});
  assert.equal(receivedAborted,false);
 }finally{globalThis.fetch=saved;}
});
test('current Product description-only request accepts empty parsed object',async()=>{
 const file=path.join(backend,'services/products/productContentAiService.js');const module={exports:{}};
 const sdk=require(path.join(backend,'node_modules/@google/generative-ai'));
 const MockAI=class{getGenerativeModel(){return{generateContent:async()=>({response:{text:()=> '{}'}})};}};
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{module,require:key=>{assert.equal(key,'@google/generative-ai');return{...sdk,GoogleGenerativeAI:MockAI};},process:{env:{GEMINI_API_KEY:'fixture-not-a-real-key'}},Buffer,AbortController,URL,setTimeout,clearTimeout,console},{filename:file});
 const result=await module.exports.generateProductContentSuggestion({body:{title:'Fixture Bag',requestedSections:['description']}});
 assert.equal(result.meta.source,'provider');assert.equal(result.data.description,'');assert.equal(result.fallback,false);
});
test('current Collection normalization fills name but leaves required copy empty',()=>{
 const {normalizeSuggestion}=require(path.join(backend,'services/collections/collectionAiService.js'));
 const result=normalizeSuggestion({},'Fixture Collection');
 assert.equal(result.name,'Fixture Collection');assert.equal(result.description,'');assert.equal(result.seoDescription,'');
});

