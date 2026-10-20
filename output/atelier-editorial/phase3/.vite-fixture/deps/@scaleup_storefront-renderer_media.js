//#region ../ecommerce-storefront/node_modules/@scaleup/storefront-renderer/media.js
var cleanTextForMeta = (text = "") => {
	return String(text || "").replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, "\"").replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim();
};
var getImageUrlFromValue = (image) => {
	if (!image) return "";
	if (typeof image === "string") return image;
	return image.url || image.src || image.secureUrl || image.secure_url || image.imageUrl || "";
};
var getImageAltFromValue = (image) => {
	if (!image || typeof image === "string") return "";
	return cleanTextForMeta(image.alt || image.altText || image.title || "");
};
var getProductImageAlt = ({ product, image, shop } = {}) => {
	const safeProduct = product || {};
	const safeShop = shop || {};
	return getImageAltFromValue(image) || cleanTextForMeta(safeProduct.imageAltText) || cleanTextForMeta(safeProduct.title) || cleanTextForMeta(safeShop.shopName || safeShop.name) || "Product image";
};
//#endregion
export { cleanTextForMeta, getImageAltFromValue, getImageUrlFromValue, getProductImageAlt };

//# sourceMappingURL=@scaleup_storefront-renderer_media.js.map