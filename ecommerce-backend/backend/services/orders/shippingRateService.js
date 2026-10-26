const crypto = require('node:crypto');
const Shop = require('../../models/Shop');
const fail = message => Object.assign(new Error(message), { statusCode: 400 });
const districts = 'Bagerhat,Bandarban,Barguna,Barishal,Bhola,Bogura,Brahmanbaria,Chandpur,Chattogram,Chuadanga,Cox\'s Bazar,Cumilla,Dhaka,Dinajpur,Faridpur,Feni,Gaibandha,Gazipur,Gopalganj,Habiganj,Jamalpur,Jashore,Jhalokati,Jhenaidah,Joypurhat,Khagrachhari,Khulna,Kishoreganj,Kurigram,Kushtia,Lakshmipur,Lalmonirhat,Madaripur,Magura,Manikganj,Meherpur,Moulvibazar,Munshiganj,Mymensingh,Naogaon,Narail,Narayanganj,Narsingdi,Natore,Netrokona,Nilphamari,Noakhali,Pabna,Panchagarh,Patuakhali,Pirojpur,Rajbari,Rajshahi,Rangamati,Rangpur,Satkhira,Shariatpur,Sherpur,Sirajganj,Sunamganj,Sylhet,Tangail,Thakurgaon'.split(',');
const districtKey = value => {
    const key = String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
    return ({ chittagong: 'chattogram', comilla: 'cumilla', bogra: 'bogura', jessore: 'jashore', barisal: 'barishal' })[key] || key;
};
const settingsFor = shop => shop?.deliveryRates?.configured ? {
    configured: true, baseArea: shop.deliveryRates.baseArea,
    insideCharge: shop.deliveryRates.insideCharge, outsideCharge: shop.deliveryRates.outsideCharge,
    version: shop.deliveryRates.version, currency: 'BDT', boundary: 'district'
} : { configured: false, baseArea: 'Dhaka', insideCharge: 80, outsideCharge: 120, version: 0, currency: 'BDT', boundary: 'district' };
const normalizeSettings = body => {
    const baseArea = String(body.baseArea || '').trim().replace(/\s+/g, ' ');
    const canonicalArea = districts.find(item => districtKey(item) === districtKey(baseArea));
    if (!canonicalArea) throw fail('Select a supported base district.');
    const charge = value => {
        if (value === '' || value === null || value === undefined || typeof value === 'boolean') throw fail('Enter both delivery charges.');
        const number = Number(value);
        if (!Number.isFinite(number) || number < 0 || number > 100000 || Math.abs(number * 100 - Math.round(number * 100)) > 0.00001) throw fail('Delivery charges must be between 0 and 100000 BDT, with at most two decimals.');
        return number;
    };
    if (!Number.isInteger(body.version) || body.version < 0) throw fail('Reload delivery settings before saving.');
    return { configured: true, baseArea: canonicalArea, insideCharge: charge(body.insideCharge), outsideCharge: charge(body.outsideCharge), version: body.version + 1 };
};
const resolveRate = (settings, district) => {
    const key = districtKey(district);
    if (!districts.some(item => districtKey(item) === key)) throw fail('Select the actual delivery district.');
    const ruleId = key === districtKey(settings.baseArea) ? 'inside' : 'outside';
    return { ruleId, zone: `${ruleId === 'inside' ? 'Inside' : 'Outside'} ${settings.baseArea} district`,
        configurationVersion: settings.version, originalCharge: ruleId === 'inside' ? settings.insideCharge : settings.outsideCharge,
        district: String(district).trim(), currency: 'BDT' };
};
const signature = value => {
    if (!process.env.JWT_SECRET) throw new Error('Shipping quotes are unavailable');
    return crypto.createHmac('sha256', process.env.JWT_SECRET).update(`shipping-quote:${value}`).digest('base64url');
};
const issueQuote = (shopId, rate) => {
    const data = Buffer.from(JSON.stringify({ shopId: String(shopId), ...rate, expiresAt: Date.now() + 15 * 60000 })).toString('base64url');
    return `${data}.${signature(data)}`;
};
const verifyQuote = (token, shopId, rate) => {
    if (typeof token !== 'string' || token.length > 3000) throw fail('Review the delivery charge before ordering.');
    const [data, signed, extra] = token.split('.');
    const expected = signature(data || '');
    if (extra || !signed || Buffer.byteLength(signed) !== Buffer.byteLength(expected) || !crypto.timingSafeEqual(Buffer.from(signed), Buffer.from(expected))) throw fail('Invalid delivery quote. Refresh the delivery charge.');
    let quote;
    try { quote = JSON.parse(Buffer.from(data, 'base64url').toString()); } catch { throw fail('Invalid delivery quote.'); }
    if (quote.shopId !== String(shopId) || quote.expiresAt < Date.now() || quote.configurationVersion !== rate.configurationVersion || quote.originalCharge !== rate.originalCharge || districtKey(quote.district) !== districtKey(rate.district) || quote.ruleId !== rate.ruleId) throw fail('Delivery charges changed or expired. Review the updated charge before ordering.');
};
const getOrderShippingRate = async ({ shopId, district, legacyZone, token, session }) => {
    const shop = await Shop.findById(shopId).select('deliveryRates').session(session || null).lean();
    if (!shop) throw fail('Store not found.');
    const settings = settingsFor(shop);
    // Compatibility for existing clients only until a merchant configures its rates.
    if (!token && !settings.configured && ['Inside Dhaka', 'Outside Dhaka'].includes(legacyZone)) {
        return { ruleId: legacyZone === 'Inside Dhaka' ? 'inside' : 'outside', zone: legacyZone, originalCharge: legacyZone === 'Inside Dhaka' ? 80 : 120, configurationVersion: 0, currency: 'BDT', legacy: true };
    }
    const rate = resolveRate(settings, district);
    verifyQuote(token, shopId, rate);
    return rate;
};
module.exports = { districts, districtKey, settingsFor, normalizeSettings, resolveRate, issueQuote, verifyQuote, getOrderShippingRate };
