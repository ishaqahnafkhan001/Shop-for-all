const assert=require('node:assert/strict');
const test=require('node:test');
const {Shop,Product,Order,createLaunchSafetyContext,makeCheckoutPayload,addCheckoutProof}=require('../helpers/launchSafetyHarness');
const Draft=require('../../models/StoreBuilderDraft');
const Revision=require('../../models/StoreBuilderRevision');
const OTP=require('../../models/OTP');
const {resolvePrebuiltTheme}=require('@scaleup/storefront-theme/prebuilt');
const {sms}=require('../helpers/isolatedAcceptance.cjs');
const candidate=currentTheme=>resolvePrebuiltTheme({currentTheme,presetId:'atelier-editorial',appliedAt:'2026-10-20T00:00:00Z'});
function policy(t,mode='off',ids=''){
    const keys=['ATELIER_EDITORIAL_ROLLOUT','ATELIER_EDITORIAL_TEST_SHOP_IDS'];const previous=keys.map(k=>process.env[k]);
    process.env[keys[0]]=mode;process.env[keys[1]]=ids;
    t.after(()=>keys.forEach((k,i)=>previous[i]===undefined?delete process.env[k]:process.env[k]=previous[i]));
}
test('real MongoDB unique indexes exist for draft, revision and OTP claims',async t=>{
    await createLaunchSafetyContext(t);await Promise.all([Draft.init(),Revision.init(),OTP.init()]);
    for(const [model,keys] of [[Draft,{shop_id:1}],[Revision,{shop_id:1,revision:-1}],[OTP,{key:1}]]){
        const indexes=await model.collection.indexes();assert.ok(indexes.some(i=>i.unique && JSON.stringify(i.key)===JSON.stringify(keys)),model.modelName);
    }
});
test('zero/null/positive/base prices persist correctly through guest and authenticated HTTP checkout',async t=>{
    const ctx=await createLaunchSafetyContext(t);const {productA}=ctx.data.products;
    for(const [index,override] of [0,null,200,undefined].entries()){
        const base={'variants.0.priceOverride':override??null,'variants.0.pricing.price':override??null};
        await Product.updateOne({_id:productA.product._id},{$set:base});
        const expected=override===0?0:override===200?200:1200;
        const guest=await addCheckoutProof({shop:ctx.data.shops.shopA,payload:{...makeCheckoutPayload({product:productA.product,variant:productA.variant,customerEmail:'price-'+index+'@example.invalid'}),totalAmount:-99999}});
        guest.items[0].quantity=1;guest.items[0].price='invalid';
        const response=await ctx.client().unsafePost('/api/public/orders',guest);
        assert.equal(response.status,201,JSON.stringify(response.body));assert.equal(response.body.total,expected+80);
        const persisted=await Order.findById(response.body.orderId).lean();assert.equal(persisted.items[0].price,expected);assert.equal(persisted.pricing.subtotal,expected);assert.equal(persisted.pricing.total,expected+80);
        const auth=await addCheckoutProof({shop:ctx.data.shops.shopA,payload:{items:[{productId:productA.product._id,variantId:productA.variant._id,quantity:1}],shipping:{zone:'Inside Dhaka',address:{fullName:'Customer A',phone:'01700000000',addressLine:'Test address',city:'Dhaka'}},payment:{method:'COD'},consent:{checkoutPolicyAccepted:true}}});
        const created=await ctx.customerAClient().unsafePost('/api/storefront/launchshopa/orders',auth);
        assert.equal(created.status,201,JSON.stringify(created.body));assert.equal(created.body.total,expected+80);
        assert.equal((await Order.findById(created.body.orderId).lean()).items[0].price,expected);
    }
});
test('default-off guard rejects raw/full/forged/client-policy adoption and ignores SEO marker injection',async t=>{
    policy(t);const ctx=await createLaunchSafetyContext(t);const vendor=ctx.vendorAClient();const full=candidate(ctx.data.shops.shopA.theme);
    for(const payload of [{theme:{presentationVariant:'atelier-editorial'}},{theme:full},{theme:{preset:{id:'atelier-editorial',version:99}}},{theme:full,ATELIER_EDITORIAL_ROLLOUT:'on',themeAvailability:{'atelier-editorial':{available:true}}}]){
        const response=await vendor.unsafePatch('/api/store-builder/admin',payload);assert.equal(response.status,403,JSON.stringify(response.body));assert.equal(response.body.code,'THEME_NOT_AVAILABLE');
    }
    const draft=await vendor.unsafePut('/api/store-builder/admin/draft',{theme:full,basedOnRevision:0});assert.equal(draft.status,403);assert.equal(await Draft.countDocuments(),0);
    const seo=await vendor.unsafePut('/api/store-builder/admin/seo/draft',{theme:full,seo:{title:'Safe merchant SEO'},basedOnRevision:0});assert.equal(seo.status,200,JSON.stringify(seo.body));
    assert.notEqual((await Draft.findOne({shop_id:ctx.data.shops.shopA._id}).lean()).theme.presentationVariant,'atelier-editorial');
    assert.notEqual((await Shop.findById(ctx.data.shops.shopA._id).lean()).theme.presentationVariant,'atelier-editorial');
});
test('allowlist, real draft/publish/reload/restore and recovery preserve tenant content',async t=>{
    const ctx=await createLaunchSafetyContext(t);const {shopA,shopB}=ctx.data.shops;policy(t,'allowlist',String(shopA._id));const vendor=ctx.vendorAClient();
    const full=candidate(shopA.theme);full.hero.title='Latest merchant content';
    const denied=await ctx.vendorBClient().unsafePatch('/api/store-builder/admin',{theme:full});assert.equal(denied.status,403);
    const saved=await vendor.unsafePut('/api/store-builder/admin/draft',{theme:full,basedOnRevision:0,expectedDraftUpdatedAt:null});assert.equal(saved.status,200,JSON.stringify(saved.body));
    assert.equal((await Shop.findById(shopA._id).lean()).theme.presentationVariant,undefined);
    const publish=await vendor.unsafePatch('/api/store-builder/admin',{theme:saved.body.data.theme,expectedRevision:0});assert.equal(publish.status,200,JSON.stringify(publish.body));
    assert.equal((await Shop.findById(shopA._id).lean()).theme.presentationVariant,'atelier-editorial');assert.equal(await Draft.countDocuments({shop_id:shopA._id}),0);
    const revision=await Revision.findOne({shop_id:shopA._id,revision:1}).lean();assert.ok(revision);
    const foreign=await ctx.vendorBClient().unsafePost('/api/store-builder/admin/revisions/'+revision._id+'/restore',{expectedRevision:0});assert.equal(foreign.status,404);
    process.env.ATELIER_EDITORIAL_ROLLOUT='off';
    const edit=await vendor.unsafePatch('/api/store-builder/admin',{theme:{hero:{title:'Newer content'}},expectedRevision:1});assert.equal(edit.status,200);
    const legacy=resolvePrebuiltTheme({currentTheme:edit.body.data.theme,presetId:'modern-general',appliedAt:'2026-10-20T00:00:01Z'});
    const recovered=await vendor.unsafePatch('/api/store-builder/admin',{theme:legacy,expectedRevision:2});assert.equal(recovered.status,200);assert.equal(recovered.body.data.theme.hero.title,'Newer content');assert.equal(recovered.body.data.theme.presentationVariant,undefined);
    const blocked=await vendor.unsafePost('/api/store-builder/admin/revisions/'+revision._id+'/restore',{expectedRevision:3});assert.equal(blocked.status,403);
    process.env.ATELIER_EDITORIAL_ROLLOUT='allowlist';
    const restored=await vendor.unsafePost('/api/store-builder/admin/revisions/'+revision._id+'/restore',{expectedRevision:3});assert.equal(restored.status,200,JSON.stringify(restored.body));assert.equal(restored.body.data.theme.presentationVariant,'atelier-editorial');assert.equal(restored.body.data.themeRevision,4);
    assert.equal((await Shop.findById(shopB._id).lean()).theme.presentationVariant,undefined);
});
test('concurrent publication claims one revision and returns a conflict for the loser',async t=>{
    const ctx=await createLaunchSafetyContext(t);policy(t,'allowlist',String(ctx.data.shops.shopA._id));await Revision.init();
    const a=ctx.vendorAClient(),b=ctx.vendorAClient();const full=candidate(ctx.data.shops.shopA.theme);
    const results=await Promise.all([a.unsafePatch('/api/store-builder/admin',{theme:full,expectedRevision:0}),b.unsafePatch('/api/store-builder/admin',{theme:full,expectedRevision:0})]);
    assert.deepEqual(results.map(r=>r.status).sort(),[200,409],JSON.stringify(results.map(r=>r.body)));
    assert.equal(await Revision.countDocuments({shop_id:ctx.data.shops.shopA._id,revision:1}),1);assert.equal((await Shop.findById(ctx.data.shops.shopA._id).lean()).themeRevision,1);
});
test('real OTP concurrency, cooldown, code expiry and bound proof use existing HTTP contract',async t=>{
    const ctx=await createLaunchSafetyContext(t);await OTP.init();sms.calls=0;sms.lastCode='';t.after(()=>{sms.lastCode='';});
    const client=ctx.client();const product=ctx.data.products.productA;const payload={phone:'01712345678',checkoutSessionId:'isolated-otp-session',items:[{productId:product.product._id,variantId:product.variant._id,quantity:1}]};
    const csrfToken=await client.getCsrfToken();const send=()=>client.unsafePost('/api/storefront/launchshopa/checkout/send-otp',payload,{csrfToken});
    const sent=await Promise.all([send(),send()]);assert.deepEqual(sent.map(r=>r.status).sort(),[200,429]);assert.equal(sms.calls,1);assert.match(sms.lastCode,/^\d{6}$/);
    assert.ok(sent.find(r=>r.status===429).body.retryAfterSeconds>0);
    const verify=body=>client.unsafePost('/api/storefront/launchshopa/checkout/verify-otp',body,{csrfToken});
    const wrong=await verify({...payload,otp:sms.lastCode==='000000'?'111111':'000000'});assert.equal(wrong.status,400);
    const foreign=await client.unsafePost('/api/storefront/launchshopb/checkout/verify-otp',{...payload,otp:sms.lastCode},{csrfToken});assert.equal(foreign.status,400);
    const cart=await verify({...payload,items:[{...payload.items[0],quantity:2}],otp:sms.lastCode});assert.equal(cart.status,400);
    const valid=await verify({...payload,otp:sms.lastCode});assert.equal(valid.status,200);assert.ok(valid.body.phoneVerificationToken);assert.equal(valid.body.otp,undefined);
    await OTP.updateMany({purpose:'customer_order_phone'},{$set:{resendAvailableAt:new Date(0),usedAt:null,consumedAt:null}});
    const resend=await send();assert.equal(resend.status,200);assert.equal(sms.calls,2);
    await OTP.updateMany({purpose:'customer_order_phone'},{$set:{expiresAt:new Date(0)}});
    const expired=await verify({...payload,otp:sms.lastCode});assert.equal(expired.status,400);
});
