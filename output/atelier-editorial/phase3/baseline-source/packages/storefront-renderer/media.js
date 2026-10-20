export const cleanTextForMeta = (text = "") => {
    return String(text || "")
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, " ")
        .trim();
};

export const getImageUrlFromValue = (image) => {
    if (!image) return "";
    if (typeof image === "string") return image;
    return image.url || image.src || image.secureUrl || image.secure_url || image.imageUrl || "";
};

export const getImageAltFromValue = (image) => {
    if (!image || typeof image === "string") return "";
    return cleanTextForMeta(image.alt || image.altText || image.title || "");
};

export const getProductImageAlt = ({ product, image, shop } = {}) => {
    const safeProduct = product || {};
    const safeShop = shop || {};

    return (
        getImageAltFromValue(image) ||
        cleanTextForMeta(safeProduct.imageAltText) ||
        cleanTextForMeta(safeProduct.title) ||
        cleanTextForMeta(safeShop.shopName || safeShop.name) ||
        "Product image"
    );
};

