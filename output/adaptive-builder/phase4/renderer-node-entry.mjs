import { createContext, memo, useContext, useEffect, useId, useMemo, useRef, useState } from "file:///C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/node_modules/react/index.js";
import { ArrowLeft, ArrowUpRight, BadgeCheck, BarChart3, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleCheck, ClipboardList, CreditCard, FileText, Headphones, Heart, Home, ImageOff, Loader2, Lock, Mail, MapPin, Menu, Minus, Package, Phone, Plus, RefreshCcw, Search, ShieldCheck, ShoppingBag, ShoppingCart, Sparkles, Star, Trash2, Truck, User, Wallet, X, Zap } from "file:///C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/node_modules/lucide-react/dist/cjs/lucide-react.js";
import { Fragment, jsx, jsxs } from "file:///C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/node_modules/react/jsx-runtime.js";
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
//#region packages/storefront-theme/homepage-seo.cjs
var require_homepage_seo = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const TITLE_MAX = 70;
	const DESCRIPTION_MAX = 170;
	const DEFAULT_PLATFORM_DOMAIN = "scaleup.codes";
	const cleanSeoText = (value = "", maxLength = 500) => String(value || "").normalize("NFKC").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
	const truncateSeoText = (value = "", maxLength = 160) => {
		const text = cleanSeoText(value, maxLength + 80);
		if (text.length <= maxLength) return text;
		const clipped = text.slice(0, maxLength - 1).trim();
		const lastSpace = clipped.lastIndexOf(" ");
		return `${(lastSpace > Math.floor(maxLength * .55) ? clipped.slice(0, lastSpace) : clipped).trim()}…`;
	};
	const normalizeSearchText = (value = "") => cleanSeoText(value, 120).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
	const SPELLING_GROUPS = Object.freeze([
		[
			"jewellery",
			"jewelry",
			"jewelery",
			"jewellry"
		],
		["colour", "color"],
		["personalised", "personalized"],
		["centre", "center"]
	]);
	const SPELLING_CANONICAL = SPELLING_GROUPS.reduce((map, group) => {
		group.forEach((value) => map.set(value, group[0]));
		return map;
	}, /* @__PURE__ */ new Map());
	const canonicalizeSearchTokens = (value = "") => normalizeSearchText(value).split(" ").filter(Boolean).map((token) => SPELLING_CANONICAL.get(token) || token);
	const expandSearchSynonyms = (value = "") => {
		const normalized = normalizeSearchText(value);
		if (!normalized) return [];
		const tokens = normalized.split(" ");
		const variants = new Set([normalized]);
		tokens.forEach((token, index) => {
			const canonical = SPELLING_CANONICAL.get(token);
			(SPELLING_GROUPS.find((items) => items[0] === canonical) || []).forEach((replacement) => {
				const next = [...tokens];
				next[index] = replacement;
				variants.add(next.join(" "));
			});
		});
		return [...variants].slice(0, 12);
	};
	const areBrandAliasesRelated = (officialName = "", alias = "") => {
		const officialTokens = new Set(canonicalizeSearchTokens(officialName));
		const aliasTokens = canonicalizeSearchTokens(alias);
		if (!officialTokens.size || !aliasTokens.length) return false;
		return aliasTokens.some((token) => officialTokens.has(token));
	};
	const normalizeSearchAliases = ({ aliases = [], officialName = "", maxAliases = 8 } = {}) => {
		const source = Array.isArray(aliases) ? aliases : String(aliases || "").split(/[\n,]/);
		const cleanAliases = [];
		const normalizedAliases = [];
		const errors = [];
		const seen = /* @__PURE__ */ new Set();
		const officialNormalized = normalizeSearchText(officialName);
		source.slice(0, Math.max(maxAliases * 2, maxAliases)).forEach((rawAlias, index) => {
			const alias = cleanSeoText(rawAlias, 60);
			const normalized = normalizeSearchText(alias);
			if (!alias || !normalized || normalized === officialNormalized || seen.has(normalized)) return;
			let message = "";
			if (/https?:\/\/|www\.|@[^\s]+\.|\.(?:com|net|org|bd)\b/i.test(alias)) message = "Search aliases cannot contain URLs or email addresses.";
			else if (/\+?\d[\d\s().-]{7,}/.test(alias)) message = "Search aliases cannot contain phone numbers.";
			else if ((alias.match(/[^\p{L}\p{N}\s'.&-]/gu) || []).length > 2) message = "Search aliases contain too much punctuation.";
			else if (normalized.split(" ").length > 6) message = "Search aliases must be short brand-name variants, not keyword phrases.";
			else if (!areBrandAliasesRelated(officialName, alias)) message = "Search aliases must be genuine spelling variants of the official store name.";
			if (message) {
				errors.push({
					index,
					alias,
					code: "SEARCH_ALIAS_NOT_ALLOWED",
					message
				});
				return;
			}
			seen.add(normalized);
			cleanAliases.push(alias);
			normalizedAliases.push(normalized);
		});
		if (cleanAliases.length > maxAliases) errors.push({
			code: "INVALID_SEARCH_ALIAS",
			message: `Add no more than ${maxAliases} search aliases.`
		});
		return {
			aliases: cleanAliases.slice(0, maxAliases),
			normalized: normalizedAliases.slice(0, maxAliases),
			errors
		};
	};
	const stableValue = (value) => {
		if (Array.isArray(value)) return value.map(stableValue);
		if (value && typeof value === "object") return Object.keys(value).sort().reduce((output, key) => {
			output[key] = stableValue(value[key]);
			return output;
		}, {});
		return value;
	};
	const hashText = (value = "") => {
		let hash = 2166136261;
		for (let index = 0; index < value.length; index += 1) {
			hash ^= value.charCodeAt(index);
			hash = Math.imul(hash, 16777619);
		}
		return (hash >>> 0).toString(16).padStart(8, "0");
	};
	const buildSeoInputSnapshot = ({ shopIdentity = {}, storefrontContent = {}, catalogSummary = {}, commerce = {} } = {}) => ({
		officialName: cleanSeoText(shopIdentity.displayName || shopIdentity.shopName || shopIdentity.name, 80),
		heroTitle: cleanSeoText(storefrontContent.heroTitle, 140),
		heroDescription: cleanSeoText(storefrontContent.heroDescription, 280),
		primaryCategory: cleanSeoText(shopIdentity.primaryCategory || catalogSummary.primaryCategory, 80),
		collections: [...new Set((catalogSummary.collections || []).map((value) => cleanSeoText(value?.title || value, 80)).filter(Boolean))].sort(),
		categories: [...new Set((catalogSummary.categories || []).map((value) => cleanSeoText(value?.name || value, 80)).filter(Boolean))].sort(),
		sellingProposition: cleanSeoText(storefrontContent.sellingProposition, 200),
		serviceArea: cleanSeoText(shopIdentity.serviceArea, 100),
		language: cleanSeoText(shopIdentity.language || "en-BD", 20),
		currency: cleanSeoText(commerce.currency || shopIdentity.currency || "BDT", 10),
		topics: [...new Set((catalogSummary.topics || []).map((value) => normalizeSearchText(value)).filter(Boolean))].sort()
	});
	const computeSeoInputHash = (context = {}) => hashText(JSON.stringify(stableValue(buildSeoInputSnapshot(context))));
	const normalizeHost = (value = "") => String(value || "").trim().replace(/^https?:\/\//i, "").split(/[/?#]/)[0].replace(/\.+$/, "").toLowerCase();
	const isVerifiedCustomDomain = (customDomain = {}) => customDomain?.status === "Verified" && Boolean(normalizeHost(customDomain.domain)) && customDomain.ownershipVerified === true && (customDomain.routingVerified === true || customDomain.manuallyVerifiedRouting === true);
	const resolveCanonicalOrigin = ({ canonicalUrl = "", customDomain = {}, subdomain = "", platformDomain = DEFAULT_PLATFORM_DOMAIN } = {}) => {
		if (canonicalUrl) try {
			const url = new URL(canonicalUrl);
			return `${url.protocol === "http:" && /localhost|127\.0\.0\.1/i.test(url.hostname) ? "http:" : "https:"}//${url.host}`;
		} catch {}
		if (isVerifiedCustomDomain(customDomain)) return `https://${normalizeHost(customDomain.domain)}`;
		const cleanSubdomain = normalizeSearchText(subdomain).replace(/\s+/g, "-");
		const cleanPlatformDomain = normalizeHost(platformDomain) || DEFAULT_PLATFORM_DOMAIN;
		return cleanSubdomain ? `https://${cleanSubdomain}.${cleanPlatformDomain}` : `https://${cleanPlatformDomain}`;
	};
	const normalizeSocialImage = (seo = {}, fallbackImage = {}) => {
		const source = seo.socialImage && typeof seo.socialImage === "object" ? seo.socialImage : {
			url: seo.socialImage || "",
			assetId: seo.socialImageAssetId || null,
			alt: seo.socialImageAlt || "",
			width: seo.socialImageWidth || null,
			height: seo.socialImageHeight || null,
			type: seo.socialImageMimeType || ""
		};
		const fallback = typeof fallbackImage === "string" ? { url: fallbackImage } : fallbackImage || {};
		const selected = cleanSeoText(source.url, 1e3) ? source : fallback;
		const url = cleanSeoText(selected.url, 1e3);
		if (!url) return null;
		return {
			url,
			assetId: selected.assetId || null,
			alt: cleanSeoText(selected.alt, 160),
			width: Number(selected.width) > 0 ? Number(selected.width) : void 0,
			height: Number(selected.height) > 0 ? Number(selected.height) : void 0,
			type: cleanSeoText(selected.type || selected.mimeType, 80) || void 0
		};
	};
	const SEO_ORIGINS = [
		"provider",
		"deterministic_fallback",
		"mixed",
		"manual",
		"unknown_legacy"
	];
	const normalizeAcceptedSeoProvenance = (seo = {}) => Object.fromEntries(["title", "description"].map((field) => {
		const max = field === "title" ? TITLE_MAX : DESCRIPTION_MAX;
		const current = cleanSeoText(seo[field], max);
		const origin = seo.aiSuggestion?.acceptedOrigins?.[field];
		if (!origin || typeof origin !== "object") return [field, null];
		const acceptedValue = cleanSeoText(origin.value, max);
		const matches = acceptedValue === current && origin.valueHash === hashText(acceptedValue);
		return [field, {
			source: matches && SEO_ORIGINS.includes(origin.source) ? origin.source : "manual",
			value: current,
			valueHash: hashText(current),
			operationId: matches ? cleanSeoText(origin.operationId, 120) : "",
			promptVersion: matches ? cleanSeoText(origin.promptVersion, 30) : "",
			acceptedAt: matches ? cleanSeoText(origin.acceptedAt, 40) : ""
		}];
	}));
	const applySeoSuggestion = (seo, result, option, fields = ["title", "description"], now = (/* @__PURE__ */ new Date()).toISOString()) => {
		const selected = fields.filter((field) => ["title", "description"].includes(field) && typeof option?.[field] === "string");
		const source = SEO_ORIGINS.includes(result?.meta?.source) ? result.meta.source : "unknown_legacy";
		const origins = { ...normalizeAcceptedSeoProvenance(seo) };
		const values = {};
		for (const field of selected) {
			values[field] = cleanSeoText(option[field], field === "title" ? TITLE_MAX : DESCRIPTION_MAX);
			origins[field] = {
				source,
				value: values[field],
				valueHash: hashText(values[field]),
				operationId: cleanSeoText(result.meta?.operationId, 120),
				promptVersion: cleanSeoText(result.meta?.promptVersion, 30),
				acceptedAt: now
			};
		}
		return {
			...seo,
			...values,
			aiSuggestion: {
				alternatives: result.alternatives || [],
				generatedAt: result.generatedAt || now,
				generatedFromHash: result.generatedFromHash || "",
				inputSnapshot: result.inputSnapshot || null,
				acceptedOptionId: option.id || "",
				acceptedFields: [...new Set([...seo.aiSuggestion?.acceptedFields || [], ...selected])],
				acceptedAt: now,
				acceptedOrigins: origins
			}
		};
	};
	const editSeoField = (seo, field, value) => {
		const next = {
			...seo,
			[field]: value
		};
		if (["title", "description"].includes(field) && value !== seo[field]) {
			const current = cleanSeoText(value, field === "title" ? TITLE_MAX : DESCRIPTION_MAX);
			next.aiSuggestion = {
				...seo.aiSuggestion,
				acceptedOrigins: {
					...normalizeAcceptedSeoProvenance(seo),
					[field]: {
						source: "manual",
						value: current,
						valueHash: hashText(current)
					}
				}
			};
		}
		return next;
	};
	const findAcceptedAiSource = (seo = {}, field, value) => {
		const suggestion = seo.aiSuggestion || {};
		const origin = normalizeAcceptedSeoProvenance(seo)[field];
		if (origin) return origin.source;
		const acceptedFields = Array.isArray(suggestion.acceptedFields) ? suggestion.acceptedFields : [];
		if (!suggestion.acceptedAt || !acceptedFields.includes(field)) return "manual";
		return cleanSeoText((suggestion.alternatives || []).find((option) => String(option?.id) === String(suggestion.acceptedOptionId))?.[field], field === "title" ? TITLE_MAX : DESCRIPTION_MAX) === value ? "unknown_legacy" : "manual";
	};
	const resolveTextField = ({ seo = {}, field, generated = "", fallback = "" }) => {
		const max = ["title", "socialTitle"].includes(field) ? TITLE_MAX : DESCRIPTION_MAX;
		const manual = truncateSeoText(seo[field], max);
		if (manual) {
			const origin = findAcceptedAiSource(seo, field, manual);
			return {
				value: manual,
				origin,
				source: origin === "provider" ? "ai" : origin === "deterministic_fallback" ? "fallback" : origin
			};
		}
		const generatedValue = truncateSeoText(generated, max);
		if (generatedValue) return {
			value: generatedValue,
			source: "generated"
		};
		const fallbackValue = truncateSeoText(fallback, max);
		return {
			value: fallbackValue,
			source: fallbackValue ? "fallback" : "missing"
		};
	};
	const compactObject = (value) => JSON.parse(JSON.stringify(value));
	const resolveHomepageSeo = ({ seo = {}, shopIdentity = {}, storefrontContent = {}, catalogSummary = {}, domain = {}, indexing = {}, socialProfiles = {}, commerce = {}, publicContact = {}, platform = {} } = {}) => {
		const officialName = cleanSeoText(shopIdentity.displayName || shopIdentity.shopName || shopIdentity.name, 80);
		const canonicalOrigin = resolveCanonicalOrigin({
			canonicalUrl: domain.canonicalUrl,
			customDomain: domain.customDomain,
			subdomain: shopIdentity.subdomain,
			platformDomain: platform.domain
		});
		const canonical = `${canonicalOrigin.replace(/\/$/, "")}/`;
		const domainFallbackName = normalizeHost(domain.customDomain?.domain || `${shopIdentity.subdomain || ""}.${platform.domain || DEFAULT_PLATFORM_DOMAIN}`);
		const siteName = truncateSeoText(seo.siteName || officialName || domainFallbackName || "Store", 80);
		const siteNameSource = seo.siteName ? "manual" : officialName ? "generated" : "fallback";
		const primaryCategory = cleanSeoText(shopIdentity.primaryCategory || catalogSummary.primaryCategory || catalogSummary.categories?.[0]?.name || catalogSummary.categories?.[0], 80);
		const titleCategory = primaryCategory && !normalizeSearchText(siteName).includes(normalizeSearchText(primaryCategory)) ? primaryCategory : "";
		const generatedTitle = `${siteName}${titleCategory ? ` - ${titleCategory}` : " - Online Store"}`;
		const generatedDescription = primaryCategory ? `Shop ${primaryCategory.toLowerCase()} from ${officialName || siteName}. Browse public collections, new arrivals, and available products online.` : `Shop products from ${officialName || siteName}. Browse public collections, new arrivals, and available products online.`;
		const title = resolveTextField({
			seo,
			field: "title",
			generated: generatedTitle,
			fallback: storefrontContent.heroTitle || siteName
		});
		const description = resolveTextField({
			seo,
			field: "description",
			generated: generatedDescription,
			fallback: storefrontContent.heroDescription
		});
		const socialTitle = resolveTextField({
			seo,
			field: "socialTitle",
			generated: title.value,
			fallback: title.value
		});
		const socialDescription = resolveTextField({
			seo,
			field: "socialDescription",
			generated: description.value,
			fallback: description.value
		});
		const socialImage = normalizeSocialImage(seo, storefrontContent.fallbackSocialImage);
		const socialImageSource = (typeof seo.socialImage === "object" ? seo.socialImage?.url : seo.socialImage) ? "manual" : socialImage ? "fallback" : "missing";
		const vendorVisible = seo.searchEngineVisibility !== false && indexing.vendorVisible !== false;
		const platformIndexable = indexing.shopPublished !== false && indexing.platformAllowed !== false && indexing.environmentAllowsIndexing !== false;
		const indexable = vendorVisible && platformIndexable;
		const follow = platformIndexable;
		const approvedAliases = (shopIdentity.searchAliases || []).map((value) => cleanSeoText(value, 60)).filter(Boolean).slice(0, 5);
		const websiteAlternateNames = [...new Set([...officialName && officialName !== siteName ? [officialName] : [], ...approvedAliases])].filter((value) => value !== siteName).slice(0, 5);
		const storeAlternateNames = [...new Set([...siteName && siteName !== officialName ? [siteName] : [], ...approvedAliases])].filter((value) => value !== officialName).slice(0, 5);
		const sameAs = [...new Set(Object.values(socialProfiles || {}).map((value) => cleanSeoText(value, 500)).filter((value) => /^https:\/\//i.test(value)))].slice(0, 10);
		const inputContext = {
			shopIdentity,
			storefrontContent,
			catalogSummary: {
				...catalogSummary,
				topics: seo.topics || seo.keywords || []
			},
			commerce
		};
		const currentInputHash = computeSeoInputHash(inputContext);
		const generatedFromHash = cleanSeoText(seo.aiSuggestion?.generatedFromHash, 100);
		const previousSnapshot = seo.aiSuggestion?.inputSnapshot || null;
		const currentSnapshot = buildSeoInputSnapshot(inputContext);
		const changedAreas = previousSnapshot ? Object.keys(currentSnapshot).filter((key) => JSON.stringify(stableValue(currentSnapshot[key])) !== JSON.stringify(stableValue(previousSnapshot[key]))) : [];
		const freshnessStatus = !generatedFromHash ? "never-generated" : generatedFromHash === currentInputHash ? "fresh" : "possibly-outdated";
		const logo = cleanSeoText(storefrontContent.logoUrl, 1e3) || void 0;
		const contactPoint = cleanSeoText(publicContact.email, 160) || cleanSeoText(publicContact.phone, 40) ? {
			"@type": "ContactPoint",
			...cleanSeoText(publicContact.email, 160) ? { email: cleanSeoText(publicContact.email, 160) } : {},
			...cleanSeoText(publicContact.phone, 40) ? { telephone: cleanSeoText(publicContact.phone, 40) } : {},
			contactType: "customer service"
		} : void 0;
		const websiteJsonLd = {
			"@context": "https://schema.org",
			"@type": "WebSite",
			"@id": `${canonicalOrigin}/#website`,
			name: siteName,
			...websiteAlternateNames.length ? { alternateName: websiteAlternateNames } : {},
			url: canonical,
			description: description.value,
			publisher: { "@id": `${canonicalOrigin}/#store` },
			...indexing.searchUrlTemplate ? { potentialAction: {
				"@type": "SearchAction",
				target: {
					"@type": "EntryPoint",
					urlTemplate: indexing.searchUrlTemplate
				},
				"query-input": "required name=search_term_string"
			} } : {}
		};
		const storeJsonLd = {
			"@context": "https://schema.org",
			"@type": "OnlineStore",
			"@id": `${canonicalOrigin}/#store`,
			name: officialName || siteName,
			...storeAlternateNames.length ? { alternateName: storeAlternateNames } : {},
			url: canonical,
			description: description.value,
			mainEntityOfPage: { "@id": `${canonicalOrigin}/#website` },
			...logo ? { logo } : {},
			...socialImage?.url ? { image: socialImage.url } : {},
			...sameAs.length ? { sameAs } : {},
			...contactPoint ? { contactPoint } : {},
			...cleanSeoText(commerce.currency, 10) ? { currenciesAccepted: cleanSeoText(commerce.currency, 10) } : {},
			...cleanSeoText(shopIdentity.serviceArea, 100) ? { areaServed: cleanSeoText(shopIdentity.serviceArea, 100) } : {}
		};
		return compactObject({
			siteName,
			title: title.value,
			description: description.value,
			canonical,
			robots: {
				index: indexable,
				follow,
				nocache: !indexable
			},
			socialImage,
			openGraph: {
				title: socialTitle.value,
				description: socialDescription.value,
				url: canonical,
				siteName,
				images: socialImage ? [socialImage] : []
			},
			twitter: {
				card: socialImage ? "summary_large_image" : "summary",
				title: socialTitle.value,
				description: socialDescription.value,
				images: socialImage ? [socialImage.url] : []
			},
			websiteJsonLd,
			storeJsonLd,
			source: {
				siteName: siteNameSource,
				title: title.source,
				description: description.source,
				socialTitle: socialTitle.source,
				socialDescription: socialDescription.source,
				socialImage: socialImageSource
			},
			origin: {
				title: title.origin || "deterministic_fallback",
				description: description.origin || "deterministic_fallback"
			},
			freshness: {
				status: freshnessStatus,
				generatedFromHash,
				currentInputHash,
				changedAreas
			}
		});
	};
	const buildNextHomepageMetadata = (resolvedSeo = {}, { icons, googleSiteVerification = "" } = {}) => {
		const metadata = {
			title: { absolute: resolvedSeo.title || "Online Store" },
			description: resolvedSeo.description || "",
			alternates: { canonical: resolvedSeo.canonical },
			robots: {
				...resolvedSeo.robots || {
					index: false,
					follow: false
				},
				googleBot: {
					index: Boolean(resolvedSeo.robots?.index),
					follow: Boolean(resolvedSeo.robots?.follow)
				}
			},
			openGraph: {
				type: "website",
				...resolvedSeo.openGraph || {}
			},
			twitter: resolvedSeo.twitter || {}
		};
		if (icons) metadata.icons = icons;
		if (googleSiteVerification) metadata.verification = { google: cleanSeoText(googleSiteVerification, 200).replace(/[<>"'`\s]/g, "") };
		return metadata;
	};
	const buildSeoPreviewModel = (resolvedSeo = {}) => ({
		siteName: resolvedSeo.siteName || "",
		title: resolvedSeo.title || "",
		description: resolvedSeo.description || "",
		url: resolvedSeo.canonical || "",
		canonical: resolvedSeo.canonical || "",
		robots: resolvedSeo.robots || {
			index: false,
			follow: false
		},
		socialImage: resolvedSeo.socialImage || null,
		openGraph: resolvedSeo.openGraph || {},
		twitter: resolvedSeo.twitter || {},
		source: resolvedSeo.source || {},
		freshness: resolvedSeo.freshness || {}
	});
	const isGenericTitle = (value = "") => /^(?:home|online store|welcome|shop now)$/i.test(cleanSeoText(value));
	const weakAltText = (value = "") => /^(?:image|photo|product|img[_-]?\d+)$/i.test(cleanSeoText(value));
	const statusForResolvedSource = (source = "", valid = true) => {
		if (!valid) return "invalid";
		if (source === "generated") return "generated";
		if (source === "fallback") return "fallback";
		if (source === "missing") return "missing";
		return "complete";
	};
	const evaluateHomepageSeo = (resolvedSeo = {}, context = {}) => {
		const sourceScore = {
			manual: 1,
			ai: .9,
			mixed: .8,
			unknown_legacy: .8,
			generated: .75,
			fallback: .45,
			missing: 0
		};
		const checks = [];
		const add = (check) => checks.push({
			fieldPath: "",
			severity: "medium",
			weight: 5,
			...check
		});
		const titleLength = cleanSeoText(resolvedSeo.title).length;
		const descriptionLength = cleanSeoText(resolvedSeo.description).length;
		const image = resolvedSeo.socialImage;
		const imageRatio = image?.width && image?.height ? image.width / image.height : null;
		const titleQuality = Boolean(resolvedSeo.title) && !isGenericTitle(resolvedSeo.title);
		const descriptionQuality = descriptionLength >= 80 && normalizeSearchText(resolvedSeo.description) !== normalizeSearchText(resolvedSeo.title);
		const h1 = cleanSeoText(context.h1, 140);
		const titleTokens = new Set(normalizeSearchText(resolvedSeo.title).split(" ").filter((token) => token.length > 2));
		const h1Relevant = Boolean(h1) && normalizeSearchText(h1).split(" ").some((token) => titleTokens.has(token));
		const supportedImageType = !image?.type || /^(?:image\/jpeg|image\/png|image\/webp|image\/gif)$/i.test(image.type);
		const imageLargeEnough = !image?.width || !image?.height || image.width >= 600 && image.height >= 315;
		add({
			id: "site-name",
			group: "content",
			status: statusForResolvedSource(resolvedSeo.source?.siteName),
			source: resolvedSeo.source?.siteName,
			weight: 8,
			fieldPath: "seo.siteName",
			message: resolvedSeo.source?.siteName === "manual" ? "Google site name is explicitly configured." : "The official store name is being used as a generated site name."
		});
		add({
			id: "homepage-title",
			group: "content",
			status: statusForResolvedSource(resolvedSeo.source?.title, titleQuality),
			source: resolvedSeo.source?.title,
			severity: "high",
			weight: 14,
			fieldPath: "seo.title",
			message: titleQuality ? `Homepage title uses a ${resolvedSeo.source?.title || "resolved"} value.` : "Add a specific homepage title instead of a generic label."
		});
		add({
			id: "title-length",
			group: "content",
			status: titleLength >= 30 && titleLength <= TITLE_MAX ? "complete" : "warning",
			source: resolvedSeo.source?.title,
			weight: 6,
			fieldPath: "seo.title",
			message: `Homepage title is ${titleLength} characters. Length guidance is an estimate, not a fixed Google limit.`
		});
		add({
			id: "homepage-description",
			group: "content",
			status: descriptionQuality ? statusForResolvedSource(resolvedSeo.source?.description) : "warning",
			source: resolvedSeo.source?.description,
			severity: "high",
			weight: 12,
			fieldPath: "seo.description",
			message: descriptionQuality ? `Homepage description uses a ${resolvedSeo.source?.description || "resolved"} value.` : "Write a useful description that explains what shoppers can find."
		});
		add({
			id: "description-length",
			group: "content",
			status: descriptionLength >= 100 && descriptionLength <= DESCRIPTION_MAX ? "complete" : "warning",
			source: resolvedSeo.source?.description,
			weight: 6,
			fieldPath: "seo.description",
			message: `Meta description is ${descriptionLength} characters.`
		});
		add({
			id: "indexability",
			group: "indexing",
			status: resolvedSeo.robots?.index ? "complete" : "blocked",
			source: "platform",
			severity: "high",
			weight: 16,
			fieldPath: "seo.searchEngineVisibility",
			message: resolvedSeo.robots?.index ? "The homepage is currently indexable." : "The homepage is currently noindex because of store or platform visibility rules."
		});
		add({
			id: "canonical",
			group: "technical",
			status: /^https:\/\//i.test(resolvedSeo.canonical || "") ? "complete" : "invalid",
			source: "platform",
			severity: "high",
			weight: 10,
			fieldPath: "canonical",
			message: /^https:\/\//i.test(resolvedSeo.canonical || "") ? "Canonical URL uses an authoritative HTTPS origin." : "Canonical URL is missing or invalid."
		});
		add({
			id: "social-image",
			group: "social",
			status: image?.url ? resolvedSeo.source?.socialImage === "manual" ? "complete" : "fallback" : "missing",
			source: resolvedSeo.source?.socialImage,
			weight: 9,
			fieldPath: "seo.socialImage",
			message: image?.url ? "A social sharing image is available." : "Upload a social sharing image."
		});
		add({
			id: "social-image-alt",
			group: "social",
			status: image?.alt && !weakAltText(image.alt) ? "complete" : "warning",
			source: resolvedSeo.source?.socialImage,
			weight: 4,
			fieldPath: "seo.socialImageAlt",
			message: image?.alt && !weakAltText(image.alt) ? "Social image alt text is useful." : "Add descriptive social image alt text."
		});
		add({
			id: "social-image-ratio",
			group: "social",
			status: !imageRatio ? "warning" : Math.abs(imageRatio - 1200 / 630) <= .2 ? "complete" : "warning",
			source: resolvedSeo.source?.socialImage,
			weight: 4,
			fieldPath: "seo.socialImage",
			message: !imageRatio ? "Image dimensions are unavailable." : `Social image ratio is ${imageRatio.toFixed(2)}:1; approximately 1.91:1 is recommended.`
		});
		add({
			id: "social-image-format",
			group: "social",
			status: !image?.url ? "missing" : supportedImageType && imageLargeEnough ? "complete" : "warning",
			source: resolvedSeo.source?.socialImage,
			weight: 3,
			fieldPath: "seo.socialImage",
			message: !image?.url ? "Upload a social image before checking its format." : !supportedImageType ? "Use JPEG, PNG, WebP, or GIF for social sharing." : !imageLargeEnough ? "Use a larger social image for clearer sharing previews." : "Social image format and available dimensions are usable."
		});
		add({
			id: "structured-data",
			group: "structuredData",
			status: resolvedSeo.websiteJsonLd?.name && resolvedSeo.storeJsonLd?.name ? "complete" : "missing",
			source: "platform",
			weight: 8,
			fieldPath: "structuredData",
			message: "WebSite and OnlineStore structured data use resolved public store identity."
		});
		add({
			id: "public-h1",
			group: "content",
			status: h1 ? h1Relevant ? "complete" : "warning" : "missing",
			source: "content",
			weight: 6,
			fieldPath: "hero.title",
			message: !h1 ? "Add a visible homepage heading." : h1Relevant ? "The homepage heading is relevant to the resolved title." : "Align the homepage heading more closely with the SEO title."
		});
		add({
			id: "active-collections",
			group: "content",
			status: Number(context.collectionCount || 0) > 0 ? "complete" : "warning",
			source: "catalog",
			weight: 5,
			fieldPath: "collections",
			message: Number(context.collectionCount || 0) > 0 ? "Public collection pages support internal discovery." : "Add at least one active public collection."
		});
		add({
			id: "internal-links",
			group: "technical",
			status: Number(context.internalLinkCount || 0) >= 3 ? "complete" : "warning",
			source: "content",
			weight: 4,
			fieldPath: "navigation",
			message: Number(context.internalLinkCount || 0) >= 3 ? "Homepage navigation provides useful internal links." : "Add useful links to products, collections, policies, or account pages."
		});
		add({
			id: "image-alt-coverage",
			group: "content",
			status: Number(context.imageAltCoverage || 0) >= 60 ? "complete" : "warning",
			source: "catalog",
			weight: 5,
			fieldPath: "products.imageAltText",
			message: `${Number(context.imageAltCoverage || 0)}% of products have image alt text.`
		});
		add({
			id: "google-verification",
			group: "technical",
			status: context.googleSiteVerification ? "complete" : "warning",
			source: "manual",
			weight: 3,
			fieldPath: "seo.googleSiteVerification",
			message: context.googleSiteVerification ? "Google verification code is configured." : "Google Search Console verification is not configured."
		});
		add({
			id: "preferred-domain",
			group: "technical",
			status: context.customDomainConnected ? "complete" : "generated",
			source: context.customDomainConnected ? "manual" : "platform",
			weight: 3,
			fieldPath: "domain",
			message: context.customDomainConnected ? "A verified custom domain is used as the canonical origin." : "The verified platform subdomain is used as the canonical origin."
		});
		add({
			id: "social-profiles",
			group: "structuredData",
			status: resolvedSeo.storeJsonLd?.sameAs?.length ? "complete" : "warning",
			source: "manual",
			weight: 3,
			fieldPath: "footer.social",
			message: resolvedSeo.storeJsonLd?.sameAs?.length ? "Public social profiles are connected to store structured data." : "Add a public social profile when available."
		});
		add({
			id: "sitemap",
			group: "indexing",
			status: /^https:\/\//i.test(resolvedSeo.canonical || "") ? "complete" : "invalid",
			source: "platform",
			weight: 4,
			fieldPath: "sitemap",
			message: `Sitemap should use ${String(resolvedSeo.canonical || "").replace(/\/$/, "")}/sitemap.xml.`
		});
		add({
			id: "metadata-freshness",
			group: "technical",
			status: resolvedSeo.freshness?.status === "fresh" ? "complete" : resolvedSeo.freshness?.status === "possibly-outdated" ? "warning" : "generated",
			source: "platform",
			weight: 4,
			fieldPath: "seo.aiSuggestion",
			message: resolvedSeo.freshness?.status === "possibly-outdated" ? `SEO suggestions may be outdated${resolvedSeo.freshness.changedAreas?.length ? ` because ${resolvedSeo.freshness.changedAreas.join(", ")} changed` : ""}.` : "SEO freshness has been evaluated."
		});
		const groups = [
			"content",
			"technical",
			"social",
			"structuredData",
			"indexing"
		].reduce((output, group) => {
			const groupChecks = checks.filter((check) => check.group === group);
			const total = groupChecks.reduce((sum, check) => sum + check.weight, 0) || 1;
			output[group] = Math.round(groupChecks.reduce((sum, check) => {
				const stateFactor = check.status === "complete" ? sourceScore[check.source] ?? 1 : check.status === "generated" ? .75 : check.status === "fallback" ? .45 : 0;
				return sum + check.weight * stateFactor;
			}, 0) / total * 100);
			return output;
		}, {});
		const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0) || 1;
		let score = Math.round(checks.reduce((sum, check) => {
			const stateFactor = check.status === "complete" ? sourceScore[check.source] ?? 1 : check.status === "generated" ? .75 : check.status === "fallback" ? .45 : 0;
			return sum + check.weight * stateFactor;
		}, 0) / totalWeight * 100);
		if (!resolvedSeo.robots?.index) score = Math.min(score, 69);
		const status = !resolvedSeo.robots?.index ? "blocked" : score >= 85 ? "optimized" : score >= 60 ? "needs-improvement" : "poor";
		return {
			score,
			status,
			indexable: Boolean(resolvedSeo.robots?.index),
			groups,
			checks,
			tasks: checks.map((check) => ({
				label: check.message,
				done: check.status === "complete",
				status: check.status,
				source: check.source,
				action: ["complete", "generated"].includes(check.status) ? "" : check.message,
				fieldPath: check.fieldPath
			})),
			missing: checks.filter((check) => !["complete", "generated"].includes(check.status))
		};
	};
	module.exports = {
		normalizeAcceptedSeoProvenance,
		applySeoSuggestion,
		editSeoField,
		TITLE_MAX,
		DESCRIPTION_MAX,
		SPELLING_GROUPS,
		cleanSeoText,
		truncateSeoText,
		normalizeSearchText,
		expandSearchSynonyms,
		areBrandAliasesRelated,
		normalizeSearchAliases,
		buildSeoInputSnapshot,
		computeSeoInputHash,
		isVerifiedCustomDomain,
		resolveCanonicalOrigin,
		resolveHomepageSeo,
		buildNextHomepageMetadata,
		buildSeoPreviewModel,
		evaluateHomepageSeo
	};
}));
//#endregion
//#region packages/storefront-theme/composition.cjs
var require_composition = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const HOMEPAGE_COMPOSITIONS = Object.freeze({
		standard: Object.freeze({
			label: "Standard",
			slots: Object.freeze({})
		}),
		discovery: Object.freeze({
			label: "Product discovery",
			slots: Object.freeze({ companion: Object.freeze(["CategoryList"]) })
		}),
		editorial: Object.freeze({
			label: "Editorial",
			slots: Object.freeze({ companion: Object.freeze(["BrandStory"]) })
		}),
		boutique: Object.freeze({
			label: "Boutique",
			slots: Object.freeze({
				collection: Object.freeze(["CollectionShowcase", "Collection"]),
				story: Object.freeze(["BrandStory"])
			})
		})
	});
	const getHomepageComposition = (value) => Object.hasOwn(HOMEPAGE_COMPOSITIONS, value) ? value : "standard";
	const planHomepageComposition = ({ composition, sections = [], isAvailable = () => true } = {}) => {
		const id = getHomepageComposition(composition);
		const remaining = sections.map((section, index) => ({
			section,
			index
		}));
		const slots = {};
		for (const [slot, types] of Object.entries(HOMEPAGE_COMPOSITIONS[id].slots)) {
			const index = remaining.findIndex(({ section }) => types.includes(section.type) && section.isEnabled !== false && section.desktopSettings?.isVisible !== false && section.mobileSettings?.isVisible !== false && isAvailable(section));
			if (index >= 0) slots[slot] = remaining.splice(index, 1)[0];
		}
		return {
			id,
			slots,
			remaining
		};
	};
	module.exports = {
		HOMEPAGE_COMPOSITIONS,
		getHomepageComposition,
		planHomepageComposition
	};
}));
//#endregion
//#region packages/storefront-theme/adaptiveData.cjs
var require_adaptiveData = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const LIMITS = Object.freeze({
		templates: 12,
		nodesPerTemplate: 50,
		totalNodes: 200,
		layoutDepth: 3,
		savedSections: 20,
		stylePresets: 20,
		bytes: 256 * 1024,
		jsonDepth: 16
	});
	const own = (value, key) => typeof key === "string" && Object.prototype.hasOwnProperty.call(value, key);
	const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
	const safeKey = (key) => ![
		"__proto__",
		"prototype",
		"constructor"
	].includes(key) && !/[.$\u0000-\u001f\u007f]/u.test(key);
	const id = (value) => typeof value === "string" && /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(value) && safeKey(value);
	const issue = (errors, path, code, message) => {
		if (errors.length < 100) errors.push({
			path: [...path],
			code,
			message
		});
	};
	const utf8Bytes = (text) => {
		let bytes = 0;
		for (const char of text) {
			const point = char.codePointAt(0);
			bytes += point < 128 ? 1 : point < 2048 ? 2 : point < 65536 ? 3 : 4;
		}
		return bytes;
	};
	function inspectJson(value, maxBytes = LIMITS.bytes) {
		const errors = [], ancestors = /* @__PURE__ */ new Set();
		let entries = 0, stringCharacters = 0;
		function walk(item, path, depth) {
			if (++entries > 2e4) {
				issue(errors, path, "JSON_LIMIT", "Too many JSON values.");
				return;
			}
			if (depth > LIMITS.jsonDepth) {
				issue(errors, path, "JSON_DEPTH", "JSON nesting exceeds the contract limit.");
				return;
			}
			if (typeof item === "string") {
				stringCharacters += item.length;
				if (stringCharacters > maxBytes) issue(errors, path, "BYTE_LIMIT", "String content exceeds the byte budget.");
				return;
			}
			if (item === null || typeof item === "boolean") return;
			if (typeof item === "number" && Number.isFinite(item)) return;
			if (typeof item !== "object" || !Array.isArray(item) && !record(item)) {
				issue(errors, path, "JSON_TYPE", "Use plain JSON objects, arrays and finite primitive values.");
				return;
			}
			if (ancestors.has(item)) {
				issue(errors, path, "JSON_CYCLE", "Cyclic JSON is not supported.");
				return;
			}
			ancestors.add(item);
			const keys = Reflect.ownKeys(item);
			if (keys.length > 2e3) {
				issue(errors, path, "JSON_LIMIT", "Too many object properties.");
				ancestors.delete(item);
				return;
			}
			for (const key of keys) {
				if (entries > 2e4) break;
				if (Array.isArray(item) && key === "length") continue;
				if (typeof key !== "string" || key.length > 128 || !safeKey(key)) {
					issue(errors, path, "UNSAFE_KEY", "Unsafe object key.");
					continue;
				}
				const descriptor = Object.getOwnPropertyDescriptor(item, key);
				if (!descriptor.enumerable || !own(descriptor, "value") || Array.isArray(item) && !/^(0|[1-9][0-9]*)$/.test(key)) {
					issue(errors, [...path, key], "JSON_PROPERTY", "Accessors and non-JSON properties are not allowed.");
					continue;
				}
				walk(descriptor.value, [...path, key], depth + 1);
			}
			if (Array.isArray(item) && (item.length > 2e3 || Object.keys(item).length !== item.length)) issue(errors, path, "JSON_ARRAY", "Use bounded, dense arrays.");
			ancestors.delete(item);
		}
		let bytes = null;
		try {
			walk(value, [], 0);
			if (!errors.length) bytes = utf8Bytes(JSON.stringify(value));
		} catch {
			issue(errors, [], "JSON_TYPE", "Input must be ordinary JSON without custom behavior.");
		}
		if (bytes !== null && bytes > maxBytes) issue(errors, [], "BYTE_LIMIT", `Configuration exceeds ${maxBytes} UTF-8 bytes.`);
		return {
			valid: errors.length === 0,
			errors,
			bytes
		};
	}
	function shape(value, keys, errors, path) {
		if (!record(value)) {
			issue(errors, path, "OBJECT_REQUIRED", "Expected a plain object.");
			return false;
		}
		for (const key of Object.keys(value)) if (!keys.includes(key)) issue(errors, [...path, key], "UNKNOWN_PROPERTY", "Property is not registered.");
		return true;
	}
	const clone = (value) => JSON.parse(JSON.stringify(value));
	function deepFreeze(value) {
		if (value && typeof value === "object" && !Object.isFrozen(value)) {
			Object.values(value).forEach(deepFreeze);
			Object.freeze(value);
		}
		return value;
	}
	module.exports = {
		LIMITS,
		own,
		record,
		safeKey,
		id,
		issue,
		inspectJson,
		shape,
		clone,
		deepFreeze
	};
}));
//#endregion
//#region packages/storefront-theme/responsiveStyles.cjs
var require_responsiveStyles = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { inspectJson, shape, issue, own, clone, deepFreeze } = require_adaptiveData();
	const { FALLBACK_THEME, normalizeHexColor, contrastRatio } = require_storefront_theme();
	const ADAPTIVE_BREAKPOINTS = Object.freeze({
		base: 0,
		tablet: 768,
		desktop: 1024
	});
	const TIERS = Object.freeze(Object.keys(ADAPTIVE_BREAKPOINTS));
	const APPROVED_FONTS = Object.freeze([
		"Inter",
		"Arial",
		"Georgia",
		"Roboto",
		"DM Sans"
	]);
	const COLOR_TOKENS = Object.freeze(Object.keys(FALLBACK_THEME.colors).filter((key) => typeof FALLBACK_THEME.colors[key] === "string"));
	const DEFAULT_COLOR_TOKENS = Object.freeze(Object.fromEntries(COLOR_TOKENS.map((key) => [key, FALLBACK_THEME.colors[key]])));
	const TEXT_STYLES = Object.freeze([
		"color",
		"fontFamily",
		"fontSize",
		"fontWeight",
		"lineHeight",
		"letterSpacing",
		"textAlign"
	]);
	const BOX_STYLES = Object.freeze([
		"background",
		"width",
		"maxWidth",
		"paddingBlockStart",
		"paddingBlockEnd",
		"paddingInlineStart",
		"paddingInlineEnd",
		"marginBlockStart",
		"marginBlockEnd",
		"marginInlineStart",
		"marginInlineEnd",
		"borderColor",
		"borderWidth",
		"borderRadius"
	]);
	const CORE_STYLES = Object.freeze([
		...TEXT_STYLES,
		"background",
		"paddingBlockStart",
		"paddingBlockEnd",
		"paddingInlineStart",
		"paddingInlineEnd",
		"borderColor",
		"borderWidth",
		"borderRadius"
	]);
	const PAGE_STYLES = Object.freeze([...CORE_STYLES, "maxWidth"]);
	const STYLE_PROPERTIES = deepFreeze({
		color: { kind: "color" },
		background: { kind: "color" },
		borderColor: { kind: "color" },
		fontFamily: { values: APPROVED_FONTS },
		fontSize: {
			kind: "px",
			min: 12,
			max: 96
		},
		fontWeight: {
			kind: "number",
			min: 100,
			max: 900,
			step: 100
		},
		lineHeight: {
			kind: "number",
			min: 1.1,
			max: 2.5
		},
		letterSpacing: {
			kind: "px",
			min: -1,
			max: 4
		},
		textAlign: { values: [
			"start",
			"center",
			"end"
		] },
		width: { kind: "dimension" },
		maxWidth: { kind: "dimension" },
		height: {
			kind: "px",
			min: 64,
			max: 1200
		},
		minHeight: {
			kind: "px",
			min: 0,
			max: 600
		},
		aspectRatio: { kind: "ratio" },
		objectFit: { values: ["contain", "cover"] },
		...Object.fromEntries(BOX_STYLES.filter((key) => /^(padding|margin)/.test(key)).map((key) => [key, {
			kind: "px",
			min: 0,
			max: 160
		}])),
		borderWidth: {
			kind: "px",
			min: 0,
			max: 8
		},
		borderRadius: {
			kind: "px",
			min: 0,
			max: 64
		},
		gap: {
			kind: "px",
			min: 0,
			max: 80
		},
		columns: { values: [
			1,
			2,
			3,
			4
		] },
		alignItems: { values: [
			"start",
			"center",
			"end",
			"stretch"
		] },
		justifyContent: { values: [
			"start",
			"center",
			"end",
			"space-between"
		] },
		stackOnMobile: { kind: "boolean" },
		visible: { kind: "boolean" }
	});
	function validateValue(property, value, errors, path, functional, outerWidth) {
		const rule = STYLE_PROPERTIES[property];
		if (!rule) return issue(errors, path, "STYLE_PROPERTY", "Unregistered style property.");
		let valid = false;
		if (rule.values) valid = rule.values.includes(value);
		else if (rule.kind === "boolean") valid = typeof value === "boolean";
		else if (rule.kind === "number") valid = typeof value === "number" && Number.isFinite(value) && value >= rule.min && value <= rule.max && (!rule.step || value % rule.step === 0);
		else if (rule.kind === "color") {
			if (value && typeof value === "object") if (own(value, "token")) valid = shape(value, ["token"], errors, path) && COLOR_TOKENS.includes(value.token);
			else valid = shape(value, ["hex"], errors, path) && typeof value.hex === "string" && Boolean(normalizeHexColor(value.hex));
		} else if (rule.kind === "ratio") valid = shape(value, ["width", "height"], errors, path) && ["width", "height"].every((key) => Number.isInteger(value[key]) && value[key] >= 1 && value[key] <= 32) && value.width / value.height >= .25 && value.width / value.height <= 4;
		else if (rule.kind === "dimension") valid = shape(value, ["unit", "value"], errors, path) && typeof value.value === "number" && Number.isFinite(value.value) && (value.unit === "percent" && value.value >= 25 && value.value <= 100 || value.unit === "px" && value.value >= 160 && value.value <= 1920);
		else if (rule.kind === "px") valid = shape(value, ["unit", "value"], errors, path) && value.unit === "px" && typeof value.value === "number" && Number.isFinite(value.value) && value.value >= rule.min && value.value <= rule.max;
		if (functional && valid) {
			if (property === "fontSize") valid = value.value >= 14 && value.value <= 48;
			if (property === "fontWeight") valid = value >= 400;
			if (property === "lineHeight") valid = value >= 1.25;
			if (property === "letterSpacing") valid = value.value >= 0 && value.value <= 2;
			if (/^padding/.test(property)) valid = value.value <= 48;
			if ([
				"height",
				"minHeight",
				"aspectRatio",
				"objectFit",
				"width",
				"maxWidth",
				"visible",
				"stackOnMobile",
				"columns"
			].includes(property)) valid = property === "maxWidth" && outerWidth === true && (value.unit === "percent" ? value.value === 100 : value.value >= 320);
		}
		if (!valid) issue(errors, path, "STYLE_VALUE", "Use a typed value within this component’s approved bounds.");
	}
	function checkStyles(styles, capability = {}, errors = [], path = []) {
		if (!shape(capability, [
			"properties",
			"functional",
			"outerWidth"
		], errors, [...path, "capability"])) return errors;
		if (own(capability, "properties") && (!Array.isArray(capability.properties) || !capability.properties.every((property) => own(STYLE_PROPERTIES, property))) || own(capability, "functional") && typeof capability.functional !== "boolean" || own(capability, "outerWidth") && typeof capability.outerWidth !== "boolean") {
			issue(errors, [...path, "capability"], "STYLE_CAPABILITY", "Use a trusted property allowlist and boolean functional flag.");
			return errors;
		}
		const allowed = capability.properties || Object.keys(STYLE_PROPERTIES);
		if (!shape(styles, TIERS, errors, path)) return errors;
		for (const tier of Object.keys(styles)) {
			if (!TIERS.includes(tier) || !shape(styles[tier], Object.keys(STYLE_PROPERTIES), errors, [...path, tier])) continue;
			for (const [property, value] of Object.entries(styles[tier])) if (!allowed.includes(property)) issue(errors, [
				...path,
				tier,
				property
			], "STYLE_CAPABILITY", "This component does not permit this property.");
			else validateValue(property, value, errors, [
				...path,
				tier,
				property
			], capability.functional, capability.outerWidth);
		}
		return errors;
	}
	function validateResponsiveStyles(styles, capability = {}) {
		const scan = inspectJson(styles);
		if (!scan.valid) return scan;
		const errors = checkStyles(styles, capability);
		return {
			valid: errors.length === 0,
			errors
		};
	}
	function tierForWidth(width) {
		if (typeof width !== "number" || !Number.isFinite(width) || width < 0) throw new RangeError("Width must be a finite nonnegative number.");
		return width >= 1024 ? "desktop" : width >= 768 ? "tablet" : "base";
	}
	const resolveTier = (styles, tier) => Object.assign({}, ...TIERS.slice(0, TIERS.indexOf(tier) + 1).map((key) => styles?.[key] || {}));
	function resolveResponsiveStyles(layers, tier = "base", capability = {}) {
		const scan = inspectJson(layers);
		const errors = [...scan.errors];
		if (scan.valid && shape(layers, [
			"defaults",
			"page",
			"preset",
			"node",
			"part"
		], errors, [])) for (const [key, styles] of Object.entries(layers)) checkStyles(styles, key === "page" ? {
			properties: PAGE_STYLES,
			functional: true,
			outerWidth: true
		} : capability, errors, [key]);
		if (!TIERS.includes(tier)) issue(errors, ["tier"], "STYLE_TIER", "Use base, tablet or desktop.");
		if (errors.length) return {
			valid: false,
			errors
		};
		const inherited = Object.fromEntries(Object.entries(resolveTier(layers.page, tier)).filter(([key]) => TEXT_STYLES.includes(key)));
		return {
			valid: true,
			errors: [],
			value: clone({
				...resolveTier(layers.defaults, tier),
				...inherited,
				...resolveTier(layers.preset, tier),
				...resolveTier(layers.node, tier),
				...resolveTier(layers.part, tier)
			})
		};
	}
	function checkKnownContrast(styles, errors, path, colorTokens = DEFAULT_COLOR_TOKENS) {
		const color = (value) => value?.hex || (own(colorTokens, value?.token) ? colorTokens[value.token] : void 0);
		const foreground = color(styles.color), background = color(styles.background);
		if (foreground && background && contrastRatio(foreground, background) < 4.5) issue(errors, path, "CONTRAST", "Functional foreground/background colors require at least 4.5:1 contrast.");
	}
	module.exports = {
		ADAPTIVE_BREAKPOINTS,
		TIERS,
		APPROVED_FONTS,
		COLOR_TOKENS,
		DEFAULT_COLOR_TOKENS,
		STYLE_PROPERTIES,
		TEXT_STYLES,
		BOX_STYLES,
		CORE_STYLES,
		PAGE_STYLES,
		checkStyles,
		validateResponsiveStyles,
		tierForWidth,
		resolveResponsiveStyles,
		checkKnownContrast,
		resolveTier
	};
}));
//#endregion
//#region packages/storefront-theme/pageTemplates.cjs
var require_pageTemplates = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { id, own, deepFreeze, LIMITS } = require_adaptiveData();
	const { TEXT_STYLES, BOX_STYLES, CORE_STYLES, PAGE_STYLES } = require_responsiveStyles();
	const PAGE_KINDS = Object.freeze([
		"home",
		"product",
		"category",
		"collection",
		"cart",
		"checkout",
		"account",
		"track",
		"policiesIndex",
		"policy",
		"header",
		"footer"
	]);
	const DEFAULT_PAGE_KINDS = Object.freeze(PAGE_KINDS.slice(0, 10));
	const SOURCE_BINDINGS = deepFreeze({
		currentProduct: {
			fields: ["kind"],
			required: ["kind"],
			context: "route",
			private: false
		},
		currentCategory: {
			fields: ["kind"],
			required: ["kind"],
			context: "route",
			private: false
		},
		currentCollection: {
			fields: ["kind"],
			required: ["kind"],
			context: "route",
			private: false
		},
		currentPolicy: {
			fields: ["kind"],
			required: ["kind"],
			context: "route",
			private: false
		},
		manualProducts: {
			fields: ["kind", "productIds"],
			required: ["kind", "productIds"],
			minItems: 1,
			maxItems: 24,
			ownershipRequired: true
		},
		catalog: {
			fields: ["kind", "limit"],
			required: ["kind", "limit"],
			minItems: 1,
			maxItems: 24,
			ownershipRequired: true
		},
		categories: {
			fields: ["kind", "limit"],
			required: ["kind", "limit"],
			minItems: 1,
			maxItems: 12,
			ownershipRequired: true
		}
	});
	const ADAPTIVE_CONTRACT_VERSION = 1;
	const optional = [
		"add",
		"remove",
		"copy",
		"move",
		"style",
		"reset",
		"preset"
	];
	const richPages = [
		"home",
		"product",
		"category",
		"collection",
		"policiesIndex",
		"policy"
	];
	const leafTypes = [
		"content.text",
		"content.image",
		"content.link",
		"catalog.products",
		"catalog.categories"
	];
	const groupTypes = ["layout.stack", "layout.columns"];
	const definition = (fields) => {
		const block = {
			pageKinds: PAGE_KINDS,
			parentSlots: [
				"root",
				"content.section.body",
				"layout.stack.body",
				"layout.columns.columns"
			],
			slots: {},
			minChildren: 0,
			maxChildren: 0,
			contentFields: [],
			requiredContent: [],
			sourceKinds: [],
			sourceRequired: false,
			styles: [
				...TEXT_STYLES,
				...BOX_STYLES,
				"visible"
			],
			parts: {},
			operations: optional,
			optional: true,
			protected: false,
			...fields
		};
		if (block.optional) block.operations = [
			...optional,
			...block.contentFields.length ? ["content"] : [],
			...block.sourceKinds.length ? ["source"] : []
		];
		return block;
	};
	const blocks = {
		"content.section": definition({
			parentSlots: ["root"],
			slots: { body: {
				allowedTypes: [...leafTypes, ...groupTypes],
				min: 1,
				max: 12
			} },
			minChildren: 1,
			maxChildren: 12,
			styles: [
				...BOX_STYLES,
				...TEXT_STYLES,
				"minHeight",
				"gap",
				"visible"
			]
		}),
		"layout.stack": definition({
			parentSlots: ["content.section.body"],
			slots: { body: {
				allowedTypes: leafTypes,
				min: 1,
				max: 12
			} },
			minChildren: 1,
			maxChildren: 12,
			styles: [
				...BOX_STYLES,
				...TEXT_STYLES,
				"gap",
				"alignItems",
				"justifyContent",
				"visible"
			]
		}),
		"layout.columns": definition({
			pageKinds: richPages,
			parentSlots: ["content.section.body"],
			slots: { columns: {
				allowedTypes: leafTypes,
				min: 2,
				max: 4
			} },
			minChildren: 2,
			maxChildren: 4,
			styles: [
				...BOX_STYLES,
				...TEXT_STYLES,
				"gap",
				"columns",
				"alignItems",
				"stackOnMobile",
				"visible"
			]
		}),
		"content.text": definition({
			contentFields: ["text", "kind"],
			requiredContent: ["text"]
		}),
		"content.link": definition({
			contentFields: ["label", "destination"],
			requiredContent: ["label", "destination"],
			parts: { label: TEXT_STYLES }
		}),
		"content.image": definition({
			pageKinds: richPages,
			contentFields: ["assetId", "alt"],
			assetFields: ["assetId"],
			requiredContent: ["assetId", "alt"],
			styles: [
				...BOX_STYLES,
				"height",
				"aspectRatio",
				"objectFit",
				"visible"
			]
		}),
		"catalog.products": definition({
			pageKinds: [
				"home",
				"product",
				"category",
				"collection"
			],
			sourceKinds: ["manualProducts", "catalog"],
			sourceRequired: true,
			legacySectionType: "FeaturedProducts",
			parts: {
				title: TEXT_STYLES,
				card: CORE_STYLES
			},
			styles: [
				...BOX_STYLES,
				"gap",
				"visible"
			]
		}),
		"catalog.categories": definition({
			pageKinds: ["home"],
			sourceKinds: ["categories"],
			sourceRequired: true,
			legacySectionType: "CategoryList",
			styles: [
				...BOX_STYLES,
				"gap",
				"visible"
			]
		})
	};
	const coreParts = {
		product: [
			"surface",
			"title",
			"price",
			"options",
			"quantity",
			"primaryButton",
			"error"
		],
		category: [
			"surface",
			"title",
			"filters",
			"listing",
			"pagination",
			"error"
		],
		collection: [
			"surface",
			"title",
			"sort",
			"listing",
			"pagination",
			"error"
		],
		cart: [
			"surface",
			"heading",
			"items",
			"totals",
			"primaryButton",
			"error"
		],
		checkout: [
			"surface",
			"heading",
			"label",
			"input",
			"summary",
			"primaryButton",
			"error"
		],
		account: [
			"surface",
			"heading",
			"label",
			"input",
			"primaryButton",
			"error"
		],
		track: [
			"surface",
			"heading",
			"label",
			"input",
			"summary",
			"primaryButton",
			"error"
		],
		policiesIndex: [
			"surface",
			"heading",
			"links"
		],
		policy: [
			"surface",
			"heading",
			"body",
			"links"
		],
		header: [
			"surface",
			"identity",
			"navigation",
			"utilities"
		],
		footer: [
			"surface",
			"identity",
			"navigation",
			"policies"
		]
	};
	const bindings = {
		product: "currentProduct",
		category: "currentCategory",
		collection: "currentCollection",
		policy: "currentPolicy"
	};
	const states = {
		product: [
			"loading",
			"missing",
			"available",
			"unavailable",
			"variantRequired"
		],
		category: [
			"loading",
			"missing",
			"populated",
			"empty",
			"filtered"
		],
		collection: [
			"loading",
			"missing",
			"populated",
			"empty"
		],
		cart: [
			"empty",
			"populated",
			"refreshing",
			"error"
		],
		checkout: [
			"empty",
			"form",
			"otp",
			"busy",
			"error",
			"success"
		],
		account: [
			"anonymous",
			"customer",
			"vendor",
			"registration",
			"reset",
			"security"
		],
		track: [
			"lookup",
			"unverified",
			"verified",
			"cancelEligible",
			"returnEligible",
			"ineligible"
		],
		policiesIndex: ["index"],
		policy: ["content", "notFound"],
		header: ["navigation"],
		footer: ["policyAccess"]
	};
	const pages = {};
	for (const kind of PAGE_KINDS) {
		const coreType = kind === "home" ? null : `${kind}.core`;
		if (coreType) blocks[coreType] = definition({
			pageKinds: [kind],
			parentSlots: ["root"],
			optional: false,
			protected: true,
			operations: [
				"style",
				"reset",
				"preset"
			],
			styles: CORE_STYLES,
			sourceKinds: bindings[kind] ? [bindings[kind]] : [],
			sourceRequired: Boolean(bindings[kind]),
			parts: Object.fromEntries(coreParts[kind].map((part) => [part, [
				"error",
				"label",
				"price"
			].includes(part) ? TEXT_STYLES : CORE_STYLES])),
			runtimeStates: states[kind]
		});
		pages[kind] = {
			pageKind: kind,
			blueprintId: kind === "checkout" ? "checkout-default-v1" : `${kind}-standard-v1`,
			blueprintVersion: 1,
			requiredCore: coreType,
			corePosition: coreType ? 0 : null,
			rootTypes: [
				coreType,
				"content.section",
				"content.text",
				"content.link",
				...richPages.includes(kind) ? [
					"content.image",
					"catalog.products",
					"catalog.categories"
				] : []
			].filter(Boolean),
			maxRoots: kind === "checkout" || ["header", "footer"].includes(kind) ? 3 : LIMITS.nodesPerTemplate,
			runtimeStates: states[kind] || ["content"],
			styles: PAGE_STYLES,
			surroundingContent: {
				beforeCore: false,
				afterCore: true
			}
		};
	}
	const BLOCK_REGISTRY = deepFreeze(blocks);
	const PAGE_TEMPLATES = deepFreeze(pages);
	const coreNodeId = (templateId) => {
		if (!id(templateId) || templateId.length > 48) throw new TypeError("Use a safe template ID of at most 48 characters.");
		return `core_${templateId}`;
	};
	function createPageTemplate(templateId, pageKind) {
		if (!id(templateId) || templateId.length > 48 || !own(PAGE_TEMPLATES, pageKind)) throw new TypeError("Use a registered page kind and a template ID of at most 48 characters.");
		const page = PAGE_TEMPLATES[pageKind], coreId = coreNodeId(templateId), core = page.requiredCore;
		return {
			pageKind,
			blueprintId: page.blueprintId,
			rootOrder: core ? [coreId] : [],
			nodes: core ? { [coreId]: {
				type: core,
				...bindings[pageKind] ? { source: { kind: bindings[pageKind] } } : {}
			} } : {}
		};
	}
	function createPageTemplateDocument() {
		return {
			version: ADAPTIVE_CONTRACT_VERSION,
			defaultTemplates: {},
			globals: {},
			templates: {},
			savedSections: {},
			stylePresets: {}
		};
	}
	module.exports = {
		ADAPTIVE_CONTRACT_VERSION,
		PAGE_KINDS,
		DEFAULT_PAGE_KINDS,
		SOURCE_BINDINGS,
		PAGE_TEMPLATES,
		BLOCK_REGISTRY,
		coreNodeId,
		createPageTemplate,
		createPageTemplateDocument
	};
}));
//#endregion
//#region packages/storefront-theme/pageTemplateValidation.cjs
var require_pageTemplateValidation = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { LIMITS, own, id, record, issue, inspectJson, shape } = require_adaptiveData();
	const { ADAPTIVE_CONTRACT_VERSION, PAGE_KINDS, DEFAULT_PAGE_KINDS, SOURCE_BINDINGS, PAGE_TEMPLATES, BLOCK_REGISTRY, coreNodeId } = require_pageTemplates();
	const { CORE_STYLES, TIERS, COLOR_TOKENS, DEFAULT_COLOR_TOKENS, checkStyles, resolveResponsiveStyles, checkKnownContrast, resolveTier } = require_responsiveStyles();
	const { isSafeThemeUrl, normalizeHexColor } = require_storefront_theme();
	const assetId = (value) => typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
	function plainText(value, max, errors, path, empty = false) {
		if (typeof value !== "string" || value.length > max || !empty && !value.trim() || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]|&(?:lt|gt|#0*60|#x0*3c);|\$\{|\{\{/iu.test(value)) issue(errors, path, "CONTENT_TEXT", `Use plain text of at most ${max} characters.`);
	}
	function checkDestination(value, pageKind, errors, path) {
		if (!record(value)) return issue(errors, path, "DESTINATION", "Use a typed destination.");
		const fields = {
			storePath: "path",
			https: "url",
			email: "address",
			phone: "number"
		};
		const field = own(fields, value.kind) ? fields[value.kind] : null;
		if (!field || !shape(value, ["kind", field], errors, path)) return issue(errors, path, "DESTINATION", "Destination kind is not registered.");
		const raw = value[field];
		let decoded = raw, valid = typeof raw === "string" && raw.length > 0 && raw.length <= 1e3;
		if (valid) try {
			for (let n = 0; n < 4 && decoded.includes("%"); n++) decoded = decodeURIComponent(decoded);
			valid = !decoded.includes("%") && !/[\s\\\u0000-\u001f\u007f<>]/u.test(decoded);
		} catch {
			valid = false;
		}
		if (valid && value.kind === "storePath") valid = raw.startsWith("/") && decoded.startsWith("/") && !decoded.startsWith("//") && isSafeThemeUrl(decoded);
		else if (valid && value.kind === "https") try {
			const url = new URL(raw);
			valid = /^https:\/\//i.test(raw) && url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password && isSafeThemeUrl(decoded);
		} catch {
			valid = false;
		}
		else if (valid && value.kind === "email") valid = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(raw) && raw.length <= 254;
		else if (valid && value.kind === "phone") valid = /^\+?[0-9]{7,15}$/.test(raw);
		if (pageKind === "checkout" && value.kind !== "storePath") valid = false;
		if (!valid) issue(errors, path, "UNSAFE_DESTINATION", "Use an approved canonical store path or typed safe destination.");
	}
	function checkContent(node, block, pageKind, errors, path) {
		if (!own(node, "content")) {
			if (block.requiredContent.length) issue(errors, [...path, "content"], "CONTENT_REQUIRED", "Required content is missing.");
			return;
		}
		if (!shape(node.content, block.contentFields, errors, [...path, "content"])) return;
		for (const field of block.requiredContent) if (!own(node.content, field)) issue(errors, [
			...path,
			"content",
			field
		], "CONTENT_REQUIRED", "Required content is missing.");
		for (const [field, value] of Object.entries(node.content)) {
			const location = [
				...path,
				"content",
				field
			];
			if (field === "text") plainText(value, 6e3, errors, location);
			if (field === "label") plainText(value, 120, errors, location);
			if (field === "alt") plainText(value, 240, errors, location, true);
			if (field === "kind" && !["paragraph", "heading"].includes(value)) issue(errors, location, "CONTENT_ENUM", "Use paragraph or heading.");
			if (field === "assetId" && !assetId(value)) issue(errors, location, "ASSET_REFERENCE", "Use a valid asset ID; tenant ownership is checked by the backend in Phase 2.");
			if (field === "destination") checkDestination(value, pageKind, errors, location);
		}
	}
	function checkSource(node, block, errors, path) {
		if (!own(node, "source")) {
			if (block.sourceRequired) issue(errors, [...path, "source"], "SOURCE_REQUIRED", "Required registered source is missing.");
			return;
		}
		const source = node.source, kind = source?.kind;
		if (!record(source) || !block.sourceKinds.includes(kind)) return issue(errors, [...path, "source"], "SOURCE_BINDING", "Source binding is not permitted for this block.");
		const binding = SOURCE_BINDINGS[kind];
		shape(source, binding.fields, errors, [...path, "source"]);
		for (const field of binding.required) if (!own(source, field)) issue(errors, [
			...path,
			"source",
			field
		], "SOURCE_REQUIRED", "Required source field is missing.");
		if (kind === "manualProducts" && (!Array.isArray(source.productIds) || source.productIds.length < binding.minItems || source.productIds.length > binding.maxItems || !source.productIds.every(assetId) || new Set(source.productIds).size !== source.productIds.length)) issue(errors, [
			...path,
			"source",
			"productIds"
		], "SOURCE_IDS", "Use 1–24 distinct product IDs; ownership/public eligibility is a Phase 2 check.");
		if (["catalog", "categories"].includes(kind) && (!Number.isInteger(source.limit) || source.limit < binding.minItems || source.limit > binding.maxItems)) issue(errors, [
			...path,
			"source",
			"limit"
		], "SOURCE_LIMIT", "Source count exceeds its registered range.");
	}
	function checkParts(value, block, errors, path) {
		if (!shape(value, Object.keys(block.parts), errors, path)) return;
		for (const [part, styles] of Object.entries(value)) if (own(block.parts, part)) checkStyles(styles, {
			properties: block.parts[part],
			functional: block.protected
		}, errors, [...path, part]);
	}
	function checkPresets(presets, errors) {
		if (!record(presets)) return;
		for (const [presetId, preset] of Object.entries(presets)) {
			const path = ["stylePresets", presetId];
			if (!id(presetId)) issue(errors, path, "ID", "Invalid preset ID.");
			if (!shape(preset, [
				"name",
				"blockTypes",
				"styles",
				"partStyles"
			], errors, path)) continue;
			plainText(preset.name, 80, errors, [...path, "name"]);
			if (!Array.isArray(preset.blockTypes) || preset.blockTypes.length < 1 || preset.blockTypes.length > 20 || new Set(preset.blockTypes).size !== preset.blockTypes.length) {
				issue(errors, [...path, "blockTypes"], "PRESET_TYPES", "Declare 1–20 distinct registered block types.");
				continue;
			}
			for (const type of preset.blockTypes) {
				if (!own(BLOCK_REGISTRY, type)) {
					issue(errors, [...path, "blockTypes"], "BLOCK_TYPE", "Unregistered preset target.");
					continue;
				}
				const block = BLOCK_REGISTRY[type];
				if (own(preset, "styles")) checkStyles(preset.styles, {
					properties: block.styles,
					functional: block.protected
				}, errors, [...path, "styles"]);
				if (own(preset, "partStyles")) checkParts(preset.partStyles, block, errors, [...path, "partStyles"]);
			}
		}
	}
	function validatePageTemplates(candidate, colorTokens = DEFAULT_COLOR_TOKENS) {
		const scan = inspectJson(candidate);
		if (!scan.valid) return scan;
		const errors = [];
		const colorScan = inspectJson(colorTokens);
		if (!colorScan.valid) return {
			valid: false,
			errors: colorScan.errors.map((error) => ({
				...error,
				path: ["colorTokens", ...error.path]
			}))
		};
		if (shape(colorTokens, COLOR_TOKENS, errors, ["colorTokens"])) {
			for (const token of COLOR_TOKENS) if (typeof colorTokens[token] !== "string" || !normalizeHexColor(colorTokens[token])) issue(errors, ["colorTokens", token], "COLOR_CONTEXT", "Provide every approved effective color token as a solid hex color.");
		}
		if (errors.length) return {
			valid: false,
			errors
		};
		if (!shape(candidate, [
			"version",
			"defaultTemplates",
			"globals",
			"templates",
			"savedSections",
			"stylePresets"
		], errors, [])) return {
			valid: false,
			errors
		};
		if (candidate.version !== ADAPTIVE_CONTRACT_VERSION) issue(errors, ["version"], "CONTRACT_VERSION", "Unsupported inactive page-template contract version.");
		for (const field of [
			"defaultTemplates",
			"globals",
			"templates",
			"savedSections",
			"stylePresets"
		]) if (!record(candidate[field])) issue(errors, [field], "OBJECT_REQUIRED", "A bounded map is required.");
		if (errors.length) return {
			valid: false,
			errors
		};
		for (const [field, maximum] of [
			["templates", LIMITS.templates],
			["savedSections", LIMITS.savedSections],
			["stylePresets", LIMITS.stylePresets]
		]) if (Object.keys(candidate[field]).length > maximum) issue(errors, [field], "COUNT_LIMIT", `At most ${maximum} records are supported.`);
		if (errors.length) return {
			valid: false,
			errors
		};
		checkPresets(candidate.stylePresets, errors);
		for (const [field, kinds] of [["defaultTemplates", DEFAULT_PAGE_KINDS], ["globals", ["header", "footer"]]]) for (const [kind, templateId] of Object.entries(candidate[field])) if (!kinds.includes(kind) || !id(templateId) || !own(candidate.templates, templateId) || candidate.templates[templateId]?.pageKind !== kind) issue(errors, [field, kind], "ASSIGNMENT", "Assignment must reference a template of the matching registered page kind.");
		const scopes = [...Object.entries(candidate.templates).map(([key, value]) => ({
			key,
			value,
			saved: false,
			path: ["templates", key]
		})), ...Object.entries(candidate.savedSections).map(([key, value]) => ({
			key,
			value,
			saved: true,
			path: ["savedSections", key]
		}))];
		const globalIds = /* @__PURE__ */ new Map();
		let totalNodes = 0;
		for (const scope of scopes) {
			if (!id(scope.key) || scope.key.length > 48) issue(errors, scope.path, "ID", "Template/library IDs must contain at most 48 safe characters.");
			if (!record(scope.value)) continue;
			if (record(scope.value.nodes)) for (const nodeId of Object.keys(scope.value.nodes)) {
				totalNodes++;
				if (!id(nodeId)) issue(errors, [
					...scope.path,
					"nodes",
					nodeId
				], "ID", "Invalid node ID.");
				if (globalIds.has(nodeId)) issue(errors, [
					...scope.path,
					"nodes",
					nodeId
				], "NODE_COLLISION", "Node IDs must be unique across templates and saved sections.");
				globalIds.set(nodeId, scope);
			}
		}
		if (totalNodes > LIMITS.totalNodes) {
			issue(errors, [], "TOTAL_NODES", `At most ${LIMITS.totalNodes} nodes across templates and saved sections are supported.`);
			return {
				valid: false,
				errors
			};
		}
		for (const scope of scopes) checkTree(scope, candidate, globalIds, errors, colorTokens);
		return {
			valid: errors.length === 0,
			errors,
			bytes: scan.bytes,
			counts: {
				templates: Object.keys(candidate.templates).length,
				nodes: totalNodes
			}
		};
	}
	function checkTree(scope, candidate, globalIds, errors, colorTokens) {
		const { value: tree, path, saved, key } = scope;
		if (!id(key) || key.length > 48) return;
		if (!shape(tree, saved ? [
			"name",
			"pageKind",
			"rootOrder",
			"nodes"
		] : [
			"pageKind",
			"blueprintId",
			"rootOrder",
			"nodes",
			"styles"
		], errors, path)) return;
		if (!PAGE_KINDS.includes(tree.pageKind)) {
			issue(errors, [...path, "pageKind"], "PAGE_KIND", "Unregistered page kind.");
			return;
		}
		const page = PAGE_TEMPLATES[tree.pageKind];
		if (saved) plainText(tree.name, 80, errors, [...path, "name"]);
		else if (tree.blueprintId !== page.blueprintId) issue(errors, [...path, "blueprintId"], "BLUEPRINT", "Use the registered versioned blueprint.");
		if (!record(tree.nodes) || !Array.isArray(tree.rootOrder)) {
			issue(errors, path, "TREE_SHAPE", "A node map and ordered roots are required.");
			return;
		}
		const nodeIds = Object.keys(tree.nodes);
		if (nodeIds.length > LIMITS.nodesPerTemplate) {
			issue(errors, [...path, "nodes"], "NODE_LIMIT", `At most ${LIMITS.nodesPerTemplate} nodes per tree are supported.`);
			return;
		}
		if (tree.rootOrder.length > (saved ? 1 : page.maxRoots) || saved && tree.rootOrder.length !== 1) issue(errors, [...path, "rootOrder"], "ROOT_LIMIT", "Root count exceeds this blueprint’s limit.");
		if (own(tree, "styles")) checkStyles(tree.styles, {
			properties: page.styles,
			functional: true,
			outerWidth: true
		}, errors, [...path, "styles"]);
		const owners = /* @__PURE__ */ new Map(), edges = /* @__PURE__ */ new Map();
		const connect = (reference, parentSlot, location) => {
			if (!id(reference) || !own(tree.nodes, reference)) {
				issue(errors, location, globalIds.has(reference) ? "CROSS_TEMPLATE_REFERENCE" : "MISSING_NODE", "Node must exist in this same tree.");
				return;
			}
			owners.set(reference, (owners.get(reference) || 0) + 1);
			const target = tree.nodes[reference], block = own(BLOCK_REGISTRY, target?.type) ? BLOCK_REGISTRY[target.type] : null;
			if (block && !block.parentSlots.includes(parentSlot)) issue(errors, location, "PARENT_SLOT", "Block is incompatible with this parent slot.");
		};
		tree.rootOrder.forEach((reference, index) => {
			connect(reference, "root", [
				...path,
				"rootOrder",
				index
			]);
			if (own(tree.nodes, reference) && !page.rootTypes.includes(tree.nodes[reference]?.type)) issue(errors, [
				...path,
				"rootOrder",
				index
			], "ROOT_TYPE", "This blueprint does not permit this root type.");
		});
		let coreCount = 0;
		for (const [nodeId, node] of Object.entries(tree.nodes)) {
			const location = [
				...path,
				"nodes",
				nodeId
			];
			if (!shape(node, [
				"type",
				"content",
				"source",
				"slots",
				"styles",
				"partStyles",
				"stylePresetId"
			], errors, location)) continue;
			if (!own(BLOCK_REGISTRY, node.type)) {
				issue(errors, [...location, "type"], "BLOCK_TYPE", "Unregistered block type.");
				continue;
			}
			const block = BLOCK_REGISTRY[node.type];
			if (!block.pageKinds.includes(tree.pageKind)) issue(errors, location, "PAGE_COMPATIBILITY", "Block is incompatible with this page family.");
			if (block.protected) {
				coreCount++;
				if (saved || node.type !== page.requiredCore || nodeId !== coreNodeId(key)) issue(errors, location, "PROTECTED_CORE", "Only the blueprint’s required root core and reserved ID are permitted.");
			} else if (nodeId.startsWith("core_")) issue(errors, location, "RESERVED_ID", "Core IDs are reserved by trusted code.");
			checkContent(node, block, tree.pageKind, errors, location);
			checkSource(node, block, errors, location);
			if (own(node, "styles")) checkStyles(node.styles, {
				properties: block.styles,
				functional: block.protected
			}, errors, [...location, "styles"]);
			if (own(node, "partStyles")) checkParts(node.partStyles, block, errors, [...location, "partStyles"]);
			let preset;
			if (own(node, "stylePresetId")) {
				preset = own(candidate.stylePresets, node.stylePresetId) ? candidate.stylePresets[node.stylePresetId] : void 0;
				if (!id(node.stylePresetId) || !own(candidate.stylePresets, node.stylePresetId) || !Array.isArray(preset?.blockTypes) || !preset.blockTypes.includes(node.type)) issue(errors, [...location, "stylePresetId"], "PRESET_REFERENCE", "Use an existing preset compatible with this block.");
			}
			if (block.protected) for (const tier of TIERS) {
				const resolved = resolveResponsiveStyles({
					page: tree.styles || {},
					preset: preset?.styles || {},
					node: node.styles || {}
				}, tier, {
					properties: CORE_STYLES,
					functional: true
				});
				if (resolved.valid) {
					const surface = {
						color: { token: "foreground" },
						background: { token: "background" },
						...resolved.value
					};
					const pageBackground = resolveTier(tree.styles, tier).background;
					if (!resolved.value.background && pageBackground) surface.background = pageBackground;
					checkKnownContrast(surface, errors, [
						...location,
						"styles",
						tier
					], colorTokens);
					for (const part of Object.keys(block.parts)) {
						const partResult = resolveResponsiveStyles({
							defaults: { base: surface },
							preset: preset?.partStyles?.[part] || {},
							part: node.partStyles?.[part] || {}
						}, tier);
						if (partResult.valid) checkKnownContrast(partResult.value, errors, [
							...location,
							"partStyles",
							part,
							tier
						], colorTokens);
					}
				}
			}
			const childRefs = [];
			const slots = own(node, "slots") ? node.slots : {};
			if (shape(slots, Object.keys(block.slots), errors, [...location, "slots"])) for (const [slotName, slot] of Object.entries(block.slots)) {
				const refs = slots[slotName];
				if (!Array.isArray(refs) || refs.length < slot.min || refs.length > slot.max) {
					issue(errors, [
						...location,
						"slots",
						slotName
					], "SLOT_COUNT", "Slot children must satisfy its declared count bounds.");
					continue;
				}
				refs.forEach((reference, index) => {
					connect(reference, node.type + "." + slotName, [
						...location,
						"slots",
						slotName,
						index
					]);
					if (own(tree.nodes, reference) && !slot.allowedTypes.includes(tree.nodes[reference]?.type)) issue(errors, [
						...location,
						"slots",
						slotName,
						index
					], "CHILD_TYPE", "Child type is not allowed in this slot.");
					childRefs.push(reference);
				});
			}
			edges.set(nodeId, childRefs);
			if (childRefs.length < block.minChildren || childRefs.length > block.maxChildren) issue(errors, location, "CHILD_COUNT", "Block child count violates the manifest.");
		}
		if (!saved && page.requiredCore && (coreCount !== 1 || tree.rootOrder[page.corePosition] !== coreNodeId(key))) issue(errors, [...path, "rootOrder"], "REQUIRED_CORE", "Keep exactly one required core in its fixed blueprint position.");
		const active = /* @__PURE__ */ new Set(), reached = /* @__PURE__ */ new Set();
		function visit(nodeId, depth) {
			if (!own(tree.nodes, nodeId)) return;
			if (active.has(nodeId)) {
				issue(errors, [
					...path,
					"nodes",
					nodeId
				], "GRAPH_CYCLE", "Node cycles are not permitted.");
				return;
			}
			if (depth > LIMITS.layoutDepth) issue(errors, [
				...path,
				"nodes",
				nodeId
			], "LAYOUT_DEPTH", "Layout depth exceeds three levels.");
			if (reached.has(nodeId)) return;
			reached.add(nodeId);
			active.add(nodeId);
			for (const reference of edges.get(nodeId) || []) visit(reference, depth + 1);
			active.delete(nodeId);
		}
		tree.rootOrder.forEach((nodeId) => visit(nodeId, 1));
		const rootReachable = new Set(reached);
		for (const nodeId of nodeIds) {
			if ((owners.get(nodeId) || 0) > 1) issue(errors, [
				...path,
				"nodes",
				nodeId
			], "MULTIPLE_OWNERS", "A node can have only one owning root/slot.");
			if (!rootReachable.has(nodeId)) {
				issue(errors, [
					...path,
					"nodes",
					nodeId
				], "UNREACHABLE_NODE", "Every node must be reachable from an ordered root.");
				visit(nodeId, 1);
			}
		}
	}
	const validateCompleteThemeBudget = (candidate) => inspectJson(candidate, LIMITS.bytes);
	module.exports = {
		validatePageTemplates,
		validateCompleteThemeBudget
	};
}));
//#endregion
//#region packages/storefront-theme/pageTemplateCommands.cjs
var require_pageTemplateCommands = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { inspectJson, shape, issue, own, id, clone } = require_adaptiveData();
	const { BLOCK_REGISTRY, PAGE_TEMPLATES, createPageTemplateDocument } = require_pageTemplates();
	const { validatePageTemplates } = require_pageTemplateValidation();
	const COMMAND_FIELDS = Object.freeze({
		add: ["fragment", "placement"],
		remove: ["nodeId"],
		copy: [
			"nodeId",
			"placement",
			"sourceTemplateId"
		],
		move: ["nodeId", "placement"],
		content: ["nodeId", "content"],
		source: ["nodeId", "source"],
		setStyle: [
			"nodeId",
			"partId",
			"tier",
			"property",
			"value"
		],
		resetStyle: [
			"nodeId",
			"partId",
			"tier",
			"property"
		],
		resetSectionStyles: ["nodeId"],
		applyPreset: ["nodeId", "presetId"],
		insertSaved: ["savedSectionId", "placement"],
		saveSection: [
			"nodeId",
			"savedSectionId",
			"name"
		],
		renameSaved: ["savedSectionId", "name"],
		deleteSaved: ["savedSectionId"],
		savePreset: [
			"nodeId",
			"presetId",
			"name"
		],
		deletePreset: ["presetId"],
		resetPageStyles: []
	});
	const OPTIONAL_FIELDS = Object.freeze({
		copy: ["sourceTemplateId"],
		setStyle: ["nodeId", "partId"],
		resetStyle: [
			"nodeId",
			"partId",
			"property"
		]
	});
	function subtree(tree, rootId) {
		const ids = [];
		const walk = (nodeId) => {
			ids.push(nodeId);
			Object.values(tree.nodes[nodeId].slots || {}).flat().forEach(walk);
		};
		walk(rootId);
		return ids;
	}
	function applyPageTemplateCommand(document, command, colorTokens) {
		const before = validatePageTemplates(document, colorTokens);
		if (!before.valid) return {
			valid: false,
			errors: before.errors
		};
		const scan = inspectJson(command);
		if (!scan.valid) return {
			valid: false,
			errors: scan.errors
		};
		const errors = [], fields = own(COMMAND_FIELDS, command?.kind) ? COMMAND_FIELDS[command.kind] : null;
		if (!fields || !shape(command, [
			"kind",
			"templateId",
			...fields
		], errors, ["command"])) {
			issue(errors, ["command"], "COMMAND", "Use a registered command and its declared properties.");
			return {
				valid: false,
				errors
			};
		}
		const required = fields.filter((field) => !(OPTIONAL_FIELDS[command.kind] || []).includes(field));
		for (const field of required) if (!own(command, field)) issue(errors, ["command", field], "COMMAND_REQUIRED", "Required command field is missing.");
		if (errors.length) return {
			valid: false,
			errors
		};
		if (!id(command.templateId) || !own(document.templates, command.templateId)) {
			issue(errors, ["command", "templateId"], "COMMAND_TARGET", "Target template does not exist.");
			return {
				valid: false,
				errors
			};
		}
		const value = clone(document), tree = value.templates[command.templateId], kind = command.kind;
		const sourceTemplateId = kind === "copy" && own(command, "sourceTemplateId") ? command.sourceTemplateId : command.templateId;
		if (!id(sourceTemplateId) || !own(value.templates, sourceTemplateId)) {
			issue(errors, ["command", "sourceTemplateId"], "COMMAND_TARGET", "Source template does not exist.");
			return {
				valid: false,
				errors
			};
		}
		const sourceTree = value.templates[sourceTemplateId];
		const node = own(sourceTree.nodes, command.nodeId) ? sourceTree.nodes[command.nodeId] : null;
		if ((![
			"add",
			"insertSaved",
			"setStyle",
			"resetStyle",
			"renameSaved",
			"deleteSaved",
			"deletePreset",
			"resetPageStyles"
		].includes(kind) || own(command, "nodeId")) && !node) issue(errors, ["command", "nodeId"], "COMMAND_TARGET", "Target node does not exist.");
		const operation = {
			setStyle: "style",
			resetStyle: "reset",
			resetSectionStyles: "reset",
			applyPreset: "preset"
		}[kind] || kind;
		const libraryOperation = ["saveSection", "savePreset"].includes(kind);
		if (node && (!libraryOperation && !BLOCK_REGISTRY[node.type].operations.includes(operation) || kind === "saveSection" && BLOCK_REGISTRY[node.type].protected)) issue(errors, ["command", "nodeId"], "PROTECTED_OPERATION", "This operation is not permitted for the registered block.");
		if (errors.length) return {
			valid: false,
			errors
		};
		const detach = (nodeId) => {
			tree.rootOrder = tree.rootOrder.filter((reference) => reference !== nodeId);
			for (const item of Object.values(tree.nodes)) for (const [slot, refs] of Object.entries(item.slots || {})) item.slots[slot] = refs.filter((reference) => reference !== nodeId);
		};
		const place = (nodeId) => {
			const placement = command.placement;
			if (!shape(placement, [
				"parentId",
				"slot",
				"index"
			], errors, ["command", "placement"])) return;
			let order;
			if (!own(placement, "parentId")) {
				if (own(placement, "slot")) issue(errors, [
					"command",
					"placement",
					"slot"
				], "POSITION", "Root insertion has no child slot.");
				order = tree.rootOrder;
			} else {
				const parent = own(tree.nodes, placement.parentId) ? tree.nodes[placement.parentId] : null;
				const block = parent && own(BLOCK_REGISTRY, parent.type) ? BLOCK_REGISTRY[parent.type] : null;
				if (!block || !own(block.slots, placement.slot)) {
					issue(errors, ["command", "placement"], "POSITION", "Target slot does not exist.");
					return;
				}
				parent.slots ||= {};
				parent.slots[placement.slot] ||= [];
				order = parent.slots[placement.slot];
			}
			if (!Number.isInteger(placement.index) || placement.index < 0 || placement.index > order.length) issue(errors, [
				"command",
				"placement",
				"index"
			], "POSITION", "Use an insertion index in the target list after removal.");
			else order.splice(placement.index, 0, nodeId);
		};
		const insertedIds = {};
		const insert = (sourceTree, rootId, fresh) => {
			const ids = subtree(sourceTree, rootId);
			const occupied = new Set([...Object.values(value.templates), ...Object.values(value.savedSections)].flatMap((item) => Object.keys(item.nodes)));
			let counter = 1;
			for (const oldId of ids) {
				let nextId = oldId;
				if (fresh) {
					while (occupied.has(`node_${counter}`)) counter++;
					nextId = `node_${counter++}`;
				}
				if (occupied.has(nextId)) {
					issue(errors, ["command", "fragment"], "NODE_COLLISION", "Added node IDs must be fresh across the document.");
					return;
				}
				insertedIds[oldId] = nextId;
				occupied.add(nextId);
			}
			for (const oldId of ids) {
				const copied = clone(sourceTree.nodes[oldId]);
				if (copied.slots) for (const [slot, refs] of Object.entries(copied.slots)) copied.slots[slot] = refs.map((reference) => insertedIds[reference]);
				tree.nodes[insertedIds[oldId]] = copied;
			}
			place(insertedIds[rootId]);
		};
		if (kind === "remove") {
			detach(command.nodeId);
			subtree(tree, command.nodeId).forEach((nodeId) => delete tree.nodes[nodeId]);
		}
		if (kind === "resetPageStyles") delete tree.styles;
		if (kind === "move") {
			detach(command.nodeId);
			place(command.nodeId);
		}
		if (kind === "copy") insert(sourceTree, command.nodeId, true);
		if (kind === "insertSaved") {
			const saved = own(value.savedSections, command.savedSectionId) ? value.savedSections[command.savedSectionId] : null;
			if (!saved) issue(errors, ["command", "savedSectionId"], "SAVED_REFERENCE", "Use an existing saved section.");
			else insert(saved, saved.rootOrder[0], true);
		}
		if (kind === "add") {
			const fragment = command.fragment;
			if (shape(fragment, ["rootId", "nodes"], errors, ["command", "fragment"]) && id(fragment.rootId) && fragment.nodes && own(fragment.nodes, fragment.rootId)) {
				const test = createPageTemplateDocument();
				test.stylePresets = value.stylePresets;
				test.savedSections.command_fragment = {
					name: "Command fragment",
					pageKind: tree.pageKind,
					rootOrder: [fragment.rootId],
					nodes: fragment.nodes
				};
				const checked = validatePageTemplates(test, colorTokens);
				if (!checked.valid) errors.push(...checked.errors);
				else insert({ nodes: fragment.nodes }, fragment.rootId, false);
			} else issue(errors, ["command", "fragment"], "COMMAND_FRAGMENT", "A valid root ID and complete optional subtree are required.");
		}
		if (kind === "content" || kind === "source") node[kind] = clone(command[kind]);
		if (kind === "applyPreset") node.stylePresetId = command.presetId;
		if (["setStyle", "resetStyle"].includes(kind)) {
			const target = node || tree;
			let styles;
			if (own(command, "partId")) if (!node || !own(BLOCK_REGISTRY[node.type].parts, command.partId)) issue(errors, ["command", "partId"], "PART", "Use a registered semantic part.");
			else {
				if (kind === "setStyle") {
					target.partStyles ||= {};
					target.partStyles[command.partId] ||= {};
				}
				styles = target.partStyles?.[command.partId];
			}
			else {
				if (kind === "setStyle") target.styles ||= {};
				styles = target.styles;
			}
			const blockParts = node ? BLOCK_REGISTRY[node.type].parts : {};
			const properties = node ? own(command, "partId") ? own(blockParts, command.partId) ? blockParts[command.partId] : [] : BLOCK_REGISTRY[node.type].styles : PAGE_TEMPLATES[tree.pageKind].styles;
			if (![
				"base",
				"tablet",
				"desktop"
			].includes(command.tier) || own(command, "property") && !properties.includes(command.property)) issue(errors, ["command"], "STYLE_COMMAND", "Use a registered tier/property.");
			else if (styles) {
				if (kind === "setStyle") if (!own(command, "property") || !own(command, "value")) issue(errors, ["command"], "STYLE_COMMAND", "Property and value are required.");
				else {
					styles[command.tier] ||= {};
					styles[command.tier][command.property] = clone(command.value);
				}
				else if (own(command, "property")) {
					if (styles[command.tier]) delete styles[command.tier][command.property];
				} else delete styles[command.tier];
				if (kind === "resetStyle") {
					if (styles[command.tier] && !Object.keys(styles[command.tier]).length) delete styles[command.tier];
					if (!Object.keys(styles).length) if (own(command, "partId")) {
						delete target.partStyles[command.partId];
						if (!Object.keys(target.partStyles).length) delete target.partStyles;
					} else delete target.styles;
				}
			}
		}
		if (kind === "resetSectionStyles") for (const nodeId of subtree(tree, command.nodeId)) {
			delete tree.nodes[nodeId].styles;
			delete tree.nodes[nodeId].partStyles;
			delete tree.nodes[nodeId].stylePresetId;
		}
		if (["saveSection", "savePreset"].includes(kind)) {
			const key = kind === "saveSection" ? command.savedSectionId : command.presetId;
			const library = kind === "saveSection" ? value.savedSections : value.stylePresets;
			if (!id(key) || own(library, key)) issue(errors, ["command"], "LIBRARY_ID", "Use a fresh, safe library identity.");
			else if (kind === "savePreset") library[key] = {
				name: command.name,
				blockTypes: [node.type],
				...node.styles ? { styles: clone(node.styles) } : {},
				...node.partStyles ? { partStyles: clone(node.partStyles) } : {}
			};
			else {
				const occupied = new Set([...Object.values(value.templates), ...Object.values(value.savedSections)].flatMap((item) => Object.keys(item.nodes)));
				const ids = subtree(tree, command.nodeId), mapping = {};
				let counter = 1;
				for (const oldId of ids) {
					while (occupied.has(`library_${counter}`)) counter++;
					const next = `library_${counter++}`;
					occupied.add(next);
					mapping[oldId] = next;
				}
				const nodes = Object.fromEntries(ids.map((oldId) => {
					const copied = clone(tree.nodes[oldId]);
					if (copied.slots) for (const slot of Object.keys(copied.slots)) copied.slots[slot] = copied.slots[slot].map((reference) => mapping[reference]);
					return [mapping[oldId], copied];
				}));
				library[key] = {
					name: command.name,
					pageKind: tree.pageKind,
					rootOrder: [mapping[command.nodeId]],
					nodes
				};
			}
		}
		if (["renameSaved", "deleteSaved"].includes(kind)) if (!id(command.savedSectionId) || !own(value.savedSections, command.savedSectionId)) issue(errors, ["command"], "SAVED_REFERENCE", "Select an existing saved section.");
		else if (kind === "renameSaved") value.savedSections[command.savedSectionId].name = command.name;
		else delete value.savedSections[command.savedSectionId];
		if (kind === "deletePreset") {
			const used = [...Object.values(value.templates), ...Object.values(value.savedSections)].some((item) => Object.values(item.nodes).some((node) => node.stylePresetId === command.presetId));
			if (!id(command.presetId) || !own(value.stylePresets, command.presetId) || used) issue(errors, ["command"], "PRESET_IN_USE", "Remove references before deleting this preset.");
			else delete value.stylePresets[command.presetId];
		}
		if (errors.length) return {
			valid: false,
			errors
		};
		const after = validatePageTemplates(value, colorTokens);
		return after.valid ? {
			valid: true,
			errors: [],
			value,
			insertedIds
		} : {
			valid: false,
			errors: after.errors
		};
	}
	module.exports = { applyPageTemplateCommand };
}));
//#endregion
//#region packages/storefront-theme/adaptive.cjs
var require_adaptive = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { LIMITS } = require_adaptiveData();
	const { ADAPTIVE_CONTRACT_VERSION, PAGE_KINDS, DEFAULT_PAGE_KINDS, SOURCE_BINDINGS, PAGE_TEMPLATES, BLOCK_REGISTRY, coreNodeId, createPageTemplate, createPageTemplateDocument } = require_pageTemplates();
	const { validatePageTemplates, validateCompleteThemeBudget } = require_pageTemplateValidation();
	const { ADAPTIVE_BREAKPOINTS, APPROVED_FONTS, COLOR_TOKENS, STYLE_PROPERTIES, validateResponsiveStyles, tierForWidth, resolveResponsiveStyles } = require_responsiveStyles();
	const { applyPageTemplateCommand } = require_pageTemplateCommands();
	module.exports = {
		LIMITS,
		ADAPTIVE_CONTRACT_VERSION,
		PAGE_KINDS,
		DEFAULT_PAGE_KINDS,
		SOURCE_BINDINGS,
		PAGE_TEMPLATES,
		BLOCK_REGISTRY,
		coreNodeId,
		createPageTemplate,
		createPageTemplateDocument,
		validatePageTemplates,
		validateCompleteThemeBudget,
		ADAPTIVE_BREAKPOINTS,
		APPROVED_FONTS,
		COLOR_TOKENS,
		STYLE_PROPERTIES,
		validateResponsiveStyles,
		tierForWidth,
		resolveResponsiveStyles,
		applyPageTemplateCommand
	};
}));
//#endregion
//#region packages/storefront-theme/storage.cjs
var require_storage = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const legacy = require_storefront_theme();
	const { validatePageTemplates, validateCompleteThemeBudget, BLOCK_REGISTRY, SOURCE_BINDINGS } = require_adaptive();
	const READABLE_THEME_VERSION = 5;
	const isAdaptiveTheme = (theme) => Number(theme?.version) === 5 && Object.hasOwn(theme || {}, "siteBuilder");
	const failure = (message, code = "INVALID_ADAPTIVE_THEME", validation = []) => Object.assign(new Error(message), {
		code,
		statusCode: 409,
		validation
	});
	const assertReadableThemeVersion = (theme = {}) => {
		if (!theme || typeof theme !== "object" || Array.isArray(theme)) throw failure("A theme must be an object.");
		if (theme.version !== void 0 && (!Number.isInteger(Number(theme.version)) || Number(theme.version) < 1 || Number(theme.version) > READABLE_THEME_VERSION)) throw failure("Update the application before reading this theme version.", "UNSUPPORTED_THEME_VERSION");
		if (Number(theme.version) === 5 && !Object.hasOwn(theme, "siteBuilder")) throw failure("A v5 theme requires its complete siteBuilder document.", "UNSUPPORTED_THEME_VERSION");
		if (Number(theme.version) === 5 && theme.version !== 5) throw failure("Theme version 5 must be a number.", "UNSUPPORTED_THEME_VERSION");
		if (Number(theme.version) !== 5 && Object.hasOwn(theme, "siteBuilder")) throw failure("Adaptive configuration requires explicit theme version 5.");
	};
	const legacyFields = (theme) => {
		const rest = { ...theme };
		delete rest.siteBuilder;
		return {
			...rest,
			version: 4
		};
	};
	const tokensFor = (theme) => {
		const colors = legacy.normalizeThemeColors(theme);
		return Object.fromEntries(Object.keys(legacy.FALLBACK_THEME.colors).filter((key) => typeof legacy.FALLBACK_THEME.colors[key] === "string").map((key) => [key, colors[key]]));
	};
	const validateStoredTheme = (theme = {}) => {
		try {
			assertReadableThemeVersion(theme);
		} catch (error) {
			return {
				valid: false,
				errors: [{
					path: ["version"],
					code: error.code,
					message: error.message
				}]
			};
		}
		if (!isAdaptiveTheme(theme)) return legacy.validateTheme(theme);
		const budget = validateCompleteThemeBudget(theme);
		if (!budget.valid) return budget;
		const graph = validatePageTemplates(theme.siteBuilder, tokensFor(theme));
		const errors = [...legacy.validateTheme(legacyFields(theme)).errors, ...graph.errors.map((error) => ({
			...error,
			path: ["siteBuilder", ...error.path]
		}))];
		return {
			valid: errors.length === 0,
			errors
		};
	};
	const normalizeStoredTheme = (theme = {}) => {
		assertReadableThemeVersion(theme);
		if (!isAdaptiveTheme(theme)) return legacy.normalizeTheme(theme);
		const result = validateStoredTheme(theme);
		if (!result.valid) throw failure("The adaptive theme is invalid. Correct the indicated fields.", "INVALID_ADAPTIVE_THEME", result.errors);
		const normalized = {
			...legacy.normalizeTheme(legacyFields(theme)),
			version: 5,
			siteBuilder: JSON.parse(JSON.stringify(theme.siteBuilder))
		};
		const budget = validateCompleteThemeBudget(normalized);
		if (!budget.valid) throw failure("The complete normalized theme exceeds the supported budget.", "INVALID_ADAPTIVE_THEME", budget.errors);
		return normalized;
	};
	const collectAdaptiveReferences = (theme) => {
		if (!isAdaptiveTheme(theme)) return {
			assetIds: [],
			productIds: []
		};
		const validation = validateStoredTheme(theme);
		if (!validation.valid) throw failure("Cannot collect references from an invalid theme.", "INVALID_ADAPTIVE_THEME", validation.errors);
		const assets = /* @__PURE__ */ new Set(), products = /* @__PURE__ */ new Set();
		for (const tree of [...Object.values(theme.siteBuilder.templates), ...Object.values(theme.siteBuilder.savedSections)]) for (const node of Object.values(tree.nodes)) {
			const definition = BLOCK_REGISTRY[node.type];
			for (const field of definition.assetFields || []) if (node.content?.[field]) assets.add(node.content[field]);
			const source = SOURCE_BINDINGS[node.source?.kind];
			if (source?.ownershipRequired && source.fields.includes("productIds")) for (const id of node.source.productIds || []) products.add(id);
		}
		return {
			assetIds: [...assets],
			productIds: [...products]
		};
	};
	const projectAdaptiveTheme = (theme) => {
		const normalized = normalizeStoredTheme(theme);
		if (!isAdaptiveTheme(normalized)) return null;
		const graph = normalized.siteBuilder;
		const assigned = new Set([...Object.values(graph.defaultTemplates), ...Object.values(graph.globals)]);
		const templates = Object.fromEntries([...assigned].map((id) => [id, graph.templates[id]]));
		const usedPresets = new Set(Object.values(templates).flatMap((tree) => Object.values(tree.nodes).map((node) => node.stylePresetId).filter(Boolean)));
		return JSON.parse(JSON.stringify({
			version: graph.version,
			defaultTemplates: graph.defaultTemplates,
			globals: graph.globals,
			templates,
			stylePresets: Object.fromEntries([...usedPresets].map((id) => [id, graph.stylePresets[id]]))
		}));
	};
	module.exports = {
		READABLE_THEME_VERSION,
		isAdaptiveTheme,
		assertReadableThemeVersion,
		validateStoredTheme,
		normalizeStoredTheme,
		collectAdaptiveReferences,
		projectAdaptiveTheme
	};
}));
//#endregion
//#region packages/storefront-theme/policies.cjs
var require_policies = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const POLICY_TYPES = [
		"refund",
		"shipping",
		"privacy",
		"terms"
	];
	const DEFAULT_POLICY_TEMPLATES = {
		refund: {
			title: "Refund Policy",
			body: `Thank you for shopping with {{STORE_NAME}}. We want our customers to have a smooth and reliable shopping experience.

Refund or return requests must be made within 24 hours of receiving the product. To be eligible for a return, the product must be unused, undamaged, and in its original packaging.

Refunds or exchanges may be accepted if:

* the product is damaged during delivery
* the wrong product is delivered
* the product is significantly different from the description
* the product has a verified quality issue

Refunds may not be accepted if:

* the product has been used
* the product is damaged after delivery
* the original packaging is missing
* the return request is made after the allowed return period
* the product is listed as non-returnable

Customers may need to provide order details, photos, or other proof when requesting a refund or return.

Approved refunds will be processed using the available payment or refund method agreed with the customer.

For refund or return support, please contact us using the contact information provided on our store.`
		},
		shipping: {
			title: "Shipping Policy",
			body: `At {{STORE_NAME}}, we try to deliver orders safely and on time.

After an order is confirmed, we usually process it within 1-3 business days. Delivery time may vary depending on the customer's location, courier availability, holidays, weather, or other operational conditions.

Estimated delivery time:

* Inside major city areas: 2-5 business days
* Outside major city areas: 3-7 business days
* Remote areas may take longer

Delivery charges may vary based on location, product size, product weight, and courier service.

Customers should provide correct delivery information, including name, phone number, and full address. {{STORE_NAME}} is not responsible for delivery delays caused by incorrect or incomplete customer information.

If a parcel is delayed, lost, or damaged during delivery, customers should contact us so we can coordinate with the courier service.`
		},
		privacy: {
			title: "Privacy Policy",
			body: `{{STORE_NAME}} respects customer privacy and is committed to protecting personal information.

We may collect customer information such as name, phone number, email address, delivery address, order details, and payment-related information when customers place an order or contact us.

We use this information to:

* process and deliver orders
* contact customers about their orders
* provide customer support
* improve our products and services
* prevent fraud or misuse

We do not sell customer personal information. Customer information may be shared only with necessary service providers such as delivery/courier partners, payment support providers, or platform service providers when required to complete an order or provide support.

Customers are responsible for providing accurate information. Customers may contact us to update or request information related to their orders.

By using this store, customers agree to the collection and use of information as described in this Privacy Policy.`
		},
		terms: {
			title: "Terms & Conditions",
			body: `Welcome to {{STORE_NAME}}. By using this store and placing an order, customers agree to the following terms and conditions.

Customers should review product details, price, size, color, quantity, and delivery information before placing an order.

Product availability, pricing, and offers may change without prior notice. We try to keep all product information accurate, but small differences in color, packaging, or appearance may occur due to photography, screen settings, or supplier changes.

An order may be cancelled if:

* the product is out of stock
* payment information is invalid or incomplete
* delivery information is incorrect
* suspicious or fraudulent activity is detected
* the customer cannot be reached for confirmation

Customers must provide accurate contact and delivery details. {{STORE_NAME}} is not responsible for failed delivery caused by incorrect customer information.

All refunds, returns, and deliveries are handled according to our Refund Policy and Shipping Policy.

{{STORE_NAME}} reserves the right to update these terms when necessary. Continued use of the store means customers accept the updated terms.`
		}
	};
	const cleanPlaceholderValue = (value, fallback = "") => String(value || fallback || "").trim();
	const injectPolicyPlaceholders = (body = "", context = {}) => {
		const storeName = cleanPlaceholderValue(context.storeName || context.shopName, "this store");
		const contactEmail = cleanPlaceholderValue(context.contactEmail);
		const contactPhone = cleanPlaceholderValue(context.contactPhone);
		return String(body).replace(/\{\{STORE_NAME\}\}/g, storeName).replace(/\{\{CONTACT_EMAIL\}\}/g, contactEmail).replace(/\{\{CONTACT_PHONE\}\}/g, contactPhone).trim();
	};
	const getDefaultPolicyText = (type, context = {}) => {
		const template = DEFAULT_POLICY_TEMPLATES[type];
		if (!template) return "";
		return injectPolicyPlaceholders(template.body, context);
	};
	const buildDefaultPolicies = (context = {}) => POLICY_TYPES.reduce((acc, type) => {
		acc[type] = getDefaultPolicyText(type, context);
		return acc;
	}, {});
	const hasPolicyText = (value) => typeof value === "string" && value.trim().length > 0;
	const fillMissingPolicyDefaults = (existingPolicies = {}, context = {}) => {
		const policies = { ...existingPolicies || {} };
		const added = [];
		const skipped = [];
		POLICY_TYPES.forEach((type) => {
			if (hasPolicyText(policies[type])) {
				skipped.push(type);
				return;
			}
			policies[type] = getDefaultPolicyText(type, context);
			added.push(type);
		});
		return {
			policies,
			added,
			skipped
		};
	};
	module.exports = {
		POLICY_TYPES,
		DEFAULT_POLICY_TEMPLATES,
		injectPolicyPlaceholders,
		getDefaultPolicyText,
		buildDefaultPolicies,
		hasPolicyText,
		fillMissingPolicyDefaults
	};
}));
//#endregion
//#region packages/storefront-theme/effective.cjs
var require_effective = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { fillMissingPolicyDefaults } = require_policies();
	module.exports = ({ normalizeTheme, mergeThemePatch, FALLBACK_THEME, cloneTheme, THEME_SCHEMA_VERSION }) => {
		const getPublicThemeForPlan = (theme = {}, planAccess = {}) => {
			if (planAccess?.storeBuilderAccess === "full") return theme;
			if (planAccess?.storeBuilderAccess === "none") {
				const normalized = normalizeTheme(theme);
				const defaults = cloneTheme(FALLBACK_THEME);
				return normalizeTheme({
					...defaults,
					logoUrl: normalized.logoUrl,
					faviconUrl: normalized.faviconUrl,
					checkoutBranding: {
						...defaults.checkoutBranding,
						logoUrl: normalized.logoUrl
					},
					paymentSettings: normalized.paymentSettings,
					footer: {
						...defaults.footer,
						text: normalized.footer?.text || "",
						contactLabel: normalized.footer?.contactLabel || defaults.footer.contactLabel,
						contactEmail: normalized.footer?.contactEmail || "",
						facebookUrl: normalized.footer?.facebookUrl || "",
						instagramUrl: normalized.footer?.instagramUrl || "",
						twitterUrl: normalized.footer?.twitterUrl || "",
						youtubeUrl: normalized.footer?.youtubeUrl || "",
						tiktokUrl: normalized.footer?.tiktokUrl || "",
						links: []
					},
					policies: normalized.policies
				});
			}
			return {
				...theme,
				homepageSections: (Array.isArray(theme.homepageSections) ? theme.homepageSections : []).filter((section) => section?.type === "FeaturedProducts")
			};
		};
		const applyBrandingToPublicTheme = ({ theme = {}, branding, storeBuilderEnabled = false }) => {
			if (!branding) return theme;
			if (storeBuilderEnabled) {
				const hero = theme.hero || {};
				const hasPremiumHero = Boolean(hero.imageUrl || hero.title || Array.isArray(hero.bannerSlides) && hero.bannerSlides.some((slide) => slide?.desktopImage || slide?.mobileImage || slide?.title));
				return {
					...theme,
					logoUrl: theme.logoUrl || branding.logoUrl,
					faviconUrl: theme.faviconUrl || branding.faviconUrl,
					hero: hasPremiumHero ? hero : {
						...hero,
						title: branding.heroTitle,
						subtitle: branding.heroSubtitle,
						imageUrl: branding.heroImageUrl,
						ctaLabel: branding.heroCta?.label || "",
						ctaUrl: branding.heroCta?.url || "",
						hidden: branding.heroHidden
					}
				};
			}
			const ctaLabel = branding.heroCta?.label || "";
			const ctaUrl = branding.heroCta?.url || "";
			return {
				...theme,
				logoUrl: branding.logoUrl || "",
				faviconUrl: branding.faviconUrl || "",
				hero: {
					...theme.hero || {},
					title: branding.heroTitle,
					subtitle: branding.heroSubtitle,
					imageUrl: branding.heroImageUrl || "",
					ctaLabel,
					ctaUrl,
					hidden: branding.heroHidden,
					height: branding.heroImageUrl ? "Medium" : "Compact",
					bannerSlides: [{
						id: "essential-branding-hero",
						enabled: true,
						desktopImage: branding.heroImageUrl || "",
						mobileImage: branding.heroImageUrl || "",
						title: branding.heroTitle,
						subtitle: branding.heroSubtitle,
						badgeText: "",
						discountText: "",
						primaryCtaText: ctaLabel,
						primaryCtaLink: ctaUrl,
						secondaryCtaText: "",
						secondaryCtaLink: ""
					}]
				}
			};
		};
		const createThemeInput = (storedTheme = {}, { defaults = {}, overrides = {} } = {}) => ({
			version: Number(storedTheme?.version) || 1,
			defaults: mergeThemePatch({}, cloneTheme(defaults)),
			overrides: mergeThemePatch(cloneTheme(storedTheme), cloneTheme(overrides))
		});
		const assertSupportedThemeVersion = (theme = {}) => {
			if (theme.version !== void 0 && (!Number.isInteger(Number(theme.version)) || Number(theme.version) < 1 || Number(theme.version) > THEME_SCHEMA_VERSION)) {
				const error = /* @__PURE__ */ new Error("This theme uses an unsupported schema version. Update the application before editing it.");
				error.code = "UNSUPPORTED_THEME_VERSION";
				error.statusCode = 409;
				throw error;
			}
		};
		const resolveEffectiveTheme = (candidate = {}, context = {}) => {
			if (Number(candidate?.version) === 5 && candidate.siteBuilder) {
				const fallback = require_storage().normalizeStoredTheme(candidate);
				delete fallback.siteBuilder;
				candidate = {
					...fallback,
					version: THEME_SCHEMA_VERSION
				};
			}
			const input = createThemeInput(candidate, context);
			let theme = normalizeTheme(mergeThemePatch(input.defaults, input.overrides));
			if (context.planAccess) theme = getPublicThemeForPlan(theme, context.planAccess);
			theme = applyBrandingToPublicTheme({
				theme,
				branding: context.branding,
				storeBuilderEnabled: context.planAccess?.features?.storeBuilder ?? context.planAccess?.storeBuilderAccess !== "none"
			});
			theme.policies = fillMissingPolicyDefaults(theme.policies, { storeName: context.shopName }).policies;
			theme = normalizeTheme(theme);
			delete theme.extensions;
			return theme;
		};
		return {
			createThemeInput,
			assertSupportedThemeVersion,
			resolveEffectiveTheme,
			getPublicThemeForPlan,
			applyBrandingToPublicTheme
		};
	};
}));
//#endregion
//#region packages/storefront-theme/capabilities.cjs
var require_capabilities = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = ({ STRUCTURAL_VARIANTS, SECTION_REGISTRY, HOMEPAGE_COMPOSITIONS, getHomepageComposition, normalizeTheme, normalizeHomepageSections, PRODUCT_CARD_STYLE_FIELDS }) => {
		const limitedEditableSections = Object.freeze(["Hero", "FeaturedProducts"]);
		const restrictedKeys = Object.freeze(["layout", "productGridStyle"]);
		const restrictedVariants = Object.freeze([Object.freeze(["header", "variant"]), Object.freeze(["hero", "variant"])]);
		const safe = {
			level: "safe",
			classification: "fully-customizable"
		};
		const structural = {
			level: "structural",
			classification: "partially-customizable"
		};
		const identity = {
			level: "identity",
			classification: "theme-controlled",
			commandOnly: true
		};
		const locked = {
			level: "identity",
			classification: "locked",
			commandOnly: true
		};
		const responsive = {
			level: "structural",
			classification: "responsive-only"
		};
		const rules = Object.freeze(Object.fromEntries(Object.entries({
			logoUrl: safe,
			faviconUrl: safe,
			colors: safe,
			fontFamily: safe,
			typography: safe,
			hero: safe,
			"hero.variant": structural,
			"hero.bannerSlides.*.mobileImage": responsive,
			header: structural,
			"header.logoPosition": locked,
			"header.menuStyle": locked,
			layout: structural,
			"layout.homepageComposition": identity,
			"layout.sectionPaddingTop": safe,
			"layout.sectionPaddingBottom": safe,
			"layout.sectionMarginTop": safe,
			"layout.sectionMarginBottom": safe,
			"layout.contentSpacing": safe,
			"layout.sectionSpacing": safe,
			"layout.productColumnsMobile": responsive,
			"layout.productColumnsTablet": responsive,
			productGridStyle: structural,
			productCard: safe,
			"productCard.style": structural,
			"productCard.inheritedStyleFields": identity,
			navigation: structural,
			footer: structural,
			allProducts: structural,
			"allProducts.tabletColumns": responsive,
			"allProducts.mobileColumns": responsive,
			checkoutBranding: safe,
			mobile: responsive,
			paymentSettings: structural,
			"mobile.stickyCheckoutButton": {
				...locked,
				reason: "Sticky checkout customization is not available."
			},
			policies: safe,
			seo: safe,
			"seo.aiSuggestion": locked,
			homepageSections: structural,
			"homepageSections.*": {
				level: "safe",
				classification: "section-specific"
			},
			"homepageSections.*.type": structural,
			"homepageSections.*.sortOrder": structural,
			"homepageSections.*.settings.variant": structural,
			"homepageSections.*.desktopSettings": responsive,
			"homepageSections.*.mobileSettings": responsive,
			"homepageSections.*.settings.mobileImage": responsive,
			"homepageSections.*.settings.mobileImages": responsive,
			preset: identity,
			presentationVariant: identity,
			version: locked,
			migrations: locked,
			extensions: locked
		}).map(([path, rule]) => [path, Object.freeze({ ...rule })])));
		const getThemeCapabilityMetadata = (planAccess = {}) => {
			const access = ["full", "none"].includes(planAccess.storeBuilderAccess) ? planAccess.storeBuilderAccess : "limited";
			const full = access === "full";
			const planName = planAccess.planName || planAccess.planKey || "your current plan";
			const availability = (enabled, label) => ({
				enabled,
				label: enabled ? "Available" : label
			});
			return {
				access,
				planName,
				editing: availability(access !== "none", "Store Builder is not included in the current plan."),
				sections: availability(full, `Requires a plan with advanced homepage sections (current: ${planName})`),
				advancedDesign: availability(full, `Requires full Store Builder access (current: ${planName})`),
				customDomain: availability(planAccess.features?.customDomain !== false, `Custom domains are not included in ${planName}`),
				scheduledBanners: availability(Boolean(planAccess.storeBuilderCapabilities?.scheduledBanners), `Scheduled banners are not included in ${planName}`)
			};
		};
		const getThemeCapabilities = (theme = {}, planAccess = {}) => {
			const plan = getThemeCapabilityMetadata(planAccess);
			const full = plan.access === "full";
			const editable = plan.editing.enabled;
			const compositionId = getHomepageComposition(theme.layout?.homepageComposition);
			const composition = HOMEPAGE_COMPOSITIONS[compositionId];
			const variants = (contract) => ({
				allowed: [...contract.values],
				merchantSelectable: full,
				reason: full ? "" : plan.advancedDesign.label
			});
			const atelier = theme.presentationVariant === "atelier-editorial";
			const atelierSectionTypes = [
				"CategoryList",
				"BrandStory",
				"PromoBlock"
			];
			const sections = Object.fromEntries(Object.entries(SECTION_REGISTRY).map(([type, definition]) => [type, {
				editable: editable && (full || limitedEditableSections.includes(type)),
				addable: full && definition.editorEnabled,
				variants: STRUCTURAL_VARIANTS.sections[type] ? {
					...variants(STRUCTURAL_VARIANTS.sections[type]),
					...atelier && atelierSectionTypes.includes(type) ? {
						merchantSelectable: false,
						classification: "theme-controlled",
						reason: "Atelier Editorial controls this section structure; content, visibility and spacing remain editable."
					} : {}
				} : null
			}]));
			return {
				plan,
				composition: {
					id: compositionId,
					label: composition.label,
					classification: "theme-controlled",
					merchantSelectable: false,
					changeCommand: "apply-theme",
					slots: Object.fromEntries(Object.entries(composition.slots).map(([slot, types]) => [slot, [...types]])),
					orderingHelp: Object.keys(composition.slots).length ? "The first eligible section for each theme slot occupies that position. Other sections follow your list order. Hidden or empty sections do not reserve a slot." : "Sections follow your list order between the hero and catalog."
				},
				header: {
					...variants(STRUCTURAL_VARIANTS.header),
					...theme.presentationVariant === "atelier-editorial" ? {
						merchantSelectable: false,
						reason: "Atelier Editorial controls its header structure."
					} : {}
				},
				hero: {
					...variants(STRUCTURAL_VARIANTS.hero),
					...theme.presentationVariant === "atelier-editorial" ? {
						merchantSelectable: false,
						reason: "Atelier Editorial controls its hero structure."
					} : {}
				},
				sections,
				sectionStructure: {
					editable: full,
					reason: full ? "" : plan.sections.label
				},
				layout: {
					editable: full,
					reason: full ? "" : plan.advancedDesign.label
				},
				colors: { editable },
				mobile: { editable }
			};
		};
		const getThemePropertyCapability = (path, { theme = {}, planAccess = {}, sectionType } = {}) => {
			const normalizedPath = String(path).replace(/\.\d+(?=\.|$)/g, ".*");
			const rule = rules[Object.keys(rules).filter((key) => normalizedPath === key || normalizedPath.startsWith(`${key}.`)).sort((a, b) => b.length - a.length)[0]] || locked;
			const capabilities = getThemeCapabilities(theme, planAccess);
			const root = normalizedPath.split(".")[0];
			let allowedByPlan = capabilities.plan.editing.enabled;
			if (root === "presentationVariant" || restrictedKeys.includes(root) || restrictedVariants.some((parts) => parts.join(".") === normalizedPath)) allowedByPlan = capabilities.plan.access === "full";
			if (root === "homepageSections") {
				const index = Number(String(path).split(".")[1]);
				const type = sectionType || theme.homepageSections?.[index]?.type;
				allowedByPlan = capabilities.sections[type]?.editable === true;
				if (normalizedPath === root || /\.(type|sortOrder)$/.test(normalizedPath)) allowedByPlan = capabilities.sectionStructure.editable;
			}
			const inherited = root === "productCard" && PRODUCT_CARD_STYLE_FIELDS.includes(normalizedPath.split(".")[1]) && theme.productCard?.inheritedStyleFields?.includes(normalizedPath.split(".")[1]);
			let allowed;
			if (normalizedPath === "header.variant") allowed = capabilities.header.allowed;
			if (normalizedPath === "hero.variant") allowed = capabilities.hero.allowed;
			if (normalizedPath === "layout.homepageComposition") allowed = [...STRUCTURAL_VARIANTS.homepage.values];
			if (normalizedPath === "homepageSections.*.settings.variant") {
				const type = sectionType || theme.homepageSections?.[Number(String(path).split(".")[1])]?.type;
				allowed = capabilities.sections[type]?.variants?.allowed;
			}
			const presentationControlled = theme.presentationVariant === "atelier-editorial" && (["header.variant", "hero.variant"].includes(normalizedPath) || normalizedPath === "homepageSections.*.settings.variant" && capabilities.sections[sectionType || theme.homepageSections?.[Number(String(path).split(".")[1])]?.type]?.variants?.merchantSelectable === false);
			return {
				...rule,
				classification: presentationControlled ? "theme-controlled" : inherited ? "inherited" : rule.classification,
				merchantEditable: allowedByPlan && !rule.commandOnly && !presentationControlled,
				allowedByPlan,
				...allowed ? { allowed } : {},
				...presentationControlled ? { reason: "Atelier Editorial controls this structure." } : {}
			};
		};
		const getThemeEditorRestriction = (group, { theme = {}, planAccess = {}, sectionIndex = -1 } = {}) => {
			const caps = getThemeCapabilities(theme, planAccess);
			if (!caps.plan.editing.enabled) return caps.plan.editing.label;
			if (group === "layout" && !caps.layout.editable) return caps.layout.reason;
			if (group === "sections" && !caps.sections[theme.homepageSections?.[sectionIndex]?.type]?.editable && !caps.sectionStructure.editable) return caps.sectionStructure.reason;
			return "";
		};
		const deepEqual = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
		const assertStoreBuilderUpdateAllowed = ({ currentTheme = {}, incomingTheme = {}, planAccess = {}, completeSnapshot = false }) => {
			if (!incomingTheme) return;
			const caps = getThemeCapabilities(currentTheme, planAccess);
			const reject = (message, capability) => {
				const error = new Error(message);
				error.statusCode = 403;
				error.code = capability ? "STORE_BUILDER_CAPABILITY_REQUIRED" : "FEATURE_NOT_INCLUDED";
				if (capability) error.capability = capability;
				else error.feature = "storeBuilder";
				throw error;
			};
			if (!caps.plan.editing.enabled) reject(caps.plan.editing.label);
			if (caps.plan.access === "full") return;
			const current = normalizeTheme(currentTheme);
			const incoming = normalizeTheme(incomingTheme);
			if ((completeSnapshot || incomingTheme.presentationVariant !== void 0) && !deepEqual(incoming.presentationVariant, current.presentationVariant)) reject(caps.layout.reason, "advancedDesign");
			for (const key of restrictedKeys) if ((completeSnapshot || incomingTheme[key] !== void 0) && !deepEqual(incoming[key], current[key])) reject(caps.layout.reason, "advancedDesign");
			for (const [group, key] of restrictedVariants) if ((completeSnapshot || incomingTheme[group]?.[key] !== void 0) && !deepEqual(incoming[group]?.[key], current[group]?.[key])) reject(caps.layout.reason, "advancedDesign");
			if (completeSnapshot || Array.isArray(incomingTheme.homepageSections)) {
				const before = normalizeHomepageSections(completeSnapshot ? current.homepageSections : currentTheme.homepageSections);
				const after = normalizeHomepageSections(completeSnapshot ? incoming.homepageSections : incomingTheme.homepageSections);
				if (!deepEqual(before.map((section) => section.id), after.map((section) => section.id))) reject(caps.sectionStructure.reason, "sectionReordering");
				after.forEach((section, index) => {
					const previous = before[index];
					if (!deepEqual(section, previous) && (section.type !== previous?.type || !limitedEditableSections.includes(section.type) || !limitedEditableSections.includes(previous?.type))) reject(caps.plan.sections.label, "advancedSections");
				});
			}
		};
		return {
			THEME_CAPABILITY_RULES: rules,
			LIMITED_EDITABLE_SECTION_TYPES: limitedEditableSections,
			RESTRICTED_THEME_KEYS: restrictedKeys,
			RESTRICTED_VARIANT_PATHS: restrictedVariants,
			getThemeCapabilities,
			getThemePropertyCapability,
			getThemeEditorRestriction,
			getThemeCapabilityMetadata,
			assertStoreBuilderUpdateAllowed
		};
	};
}));
//#endregion
//#region packages/storefront-theme/index.cjs
var require_storefront_theme = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const homepageSeo = require_homepage_seo();
	const { HOMEPAGE_COMPOSITIONS, getHomepageComposition, planHomepageComposition } = require_composition();
	const THEME_SCHEMA_VERSION = 4;
	const normalizeStoredTheme = (...args) => require_storage().normalizeStoredTheme(...args);
	const validateStoredTheme = (...args) => require_storage().validateStoredTheme(...args);
	const assertReadableThemeVersion = (...args) => require_storage().assertReadableThemeVersion(...args);
	const structuralVariant = (defaultValue, values) => Object.freeze({
		default: defaultValue,
		values: Object.freeze(values)
	});
	const STRUCTURAL_VARIANTS = Object.freeze({
		homepage: structuralVariant("standard", Object.keys(HOMEPAGE_COMPOSITIONS)),
		header: structuralVariant("standard", [
			"standard",
			"minimal",
			"centered"
		]),
		hero: structuralVariant("fullBleed", [
			"fullBleed",
			"split",
			"centered",
			"editorial",
			"minimal"
		]),
		sections: Object.freeze({
			Banner: structuralVariant("overlay", [
				"overlay",
				"split",
				"minimal"
			]),
			CategoryList: structuralVariant("cards", [
				"cards",
				"imageGrid",
				"circles",
				"editorial"
			]),
			BrandStory: structuralVariant("standard", [
				"standard",
				"imageLeft",
				"imageRight",
				"fullWidth",
				"editorial"
			]),
			Collection: structuralVariant("grid", [
				"grid",
				"spacious",
				"mosaic"
			]),
			CollectionShowcase: structuralVariant("grid", [
				"grid",
				"spacious",
				"mosaic"
			]),
			Reviews: structuralVariant("cards", [
				"cards",
				"quote",
				"minimal"
			]),
			Newsletter: structuralVariant("boxed", [
				"boxed",
				"fullWidth",
				"minimal"
			]),
			PromoBlock: structuralVariant("boxed", [
				"boxed",
				"strip",
				"split"
			])
		})
	});
	const normalizeStructuralVariant = (value, contract) => contract?.values?.includes(value) ? value : contract?.default;
	const sectionDefinition = ({ label, category, defaultSettings = {}, renderer = "generic", editorEnabled = true, productSource = false, supportsMedia = false, supportsFocalPoint = false, previewOnlyAction = false, migrationAliases = [] }) => Object.freeze({
		label,
		category,
		defaultSettings: Object.freeze(defaultSettings),
		renderer,
		editorEnabled,
		capability: "advancedSections",
		supportsResponsiveVisibility: true,
		productSource,
		supportsMedia,
		supportsFocalPoint,
		previewOnlyAction,
		migrationAliases: Object.freeze(migrationAliases)
	});
	const SECTION_REGISTRY = Object.freeze({
		FeaturedProducts: sectionDefinition({
			label: "Featured products",
			category: "commerce",
			renderer: "products",
			productSource: true,
			defaultSettings: {
				productIds: [],
				source: {
					type: "manual",
					productIds: []
				}
			}
		}),
		Collection: sectionDefinition({
			label: "Collection",
			category: "commerce",
			renderer: "generic",
			productSource: true,
			editorEnabled: false,
			defaultSettings: {
				variant: "grid",
				productIds: [],
				source: {
					type: "manual",
					productIds: []
				}
			}
		}),
		CategoryList: sectionDefinition({
			label: "Category list",
			category: "commerce",
			renderer: "categories",
			defaultSettings: {
				variant: "cards",
				maxCategories: 10,
				columns: 4
			}
		}),
		Banner: sectionDefinition({
			label: "Image banner",
			category: "content",
			renderer: "banner",
			supportsMedia: true,
			supportsFocalPoint: true,
			migrationAliases: ["BannerGrid"],
			defaultSettings: {
				variant: "overlay",
				desktopImage: "",
				mobileImage: "",
				desktopImages: [],
				mobileImages: [],
				title: "",
				subtitle: "",
				buttonText: "",
				buttonLink: "/"
			}
		}),
		TextBlock: sectionDefinition({
			label: "Text block",
			category: "content",
			renderer: "generic",
			defaultSettings: { text: "" }
		}),
		Newsletter: sectionDefinition({
			label: "Newsletter",
			category: "content",
			renderer: "generic",
			previewOnlyAction: true,
			defaultSettings: {
				variant: "boxed",
				text: ""
			}
		}),
		Reviews: sectionDefinition({
			label: "Reviews",
			category: "content",
			renderer: "reviews",
			defaultSettings: {
				variant: "cards",
				mode: "text",
				reviewIds: [],
				text: ""
			}
		}),
		FAQ: sectionDefinition({
			label: "FAQ",
			category: "content",
			renderer: "faq",
			defaultSettings: { text: "" }
		}),
		TrustBadges: sectionDefinition({
			label: "Trust badges",
			category: "content",
			renderer: "trustBadges",
			defaultSettings: { text: "" }
		}),
		BrandStory: sectionDefinition({
			label: "Brand story",
			category: "content",
			renderer: "brandStory",
			supportsMedia: true,
			supportsFocalPoint: true,
			defaultSettings: {
				variant: "standard",
				text: "",
				imageUrl: ""
			}
		}),
		PromoBlock: sectionDefinition({
			label: "Promotion block",
			category: "content",
			renderer: "generic",
			defaultSettings: {
				variant: "boxed",
				text: ""
			}
		}),
		BrandShowcase: sectionDefinition({
			label: "Brand showcase",
			category: "content",
			renderer: "generic",
			supportsMedia: true,
			editorEnabled: false,
			defaultSettings: {
				text: "",
				imageUrl: ""
			}
		}),
		CollectionShowcase: sectionDefinition({
			label: "Collection showcase",
			category: "commerce",
			renderer: "generic",
			productSource: true,
			editorEnabled: false,
			defaultSettings: {
				variant: "grid",
				productIds: [],
				source: {
					type: "manual",
					productIds: []
				}
			}
		})
	});
	const SECTION_TYPES = Object.freeze(Object.keys(SECTION_REGISTRY));
	const ALLOWED_THEME_KEYS = Object.freeze([
		"version",
		"extensions",
		"preset",
		"presentationVariant",
		"logoUrl",
		"faviconUrl",
		"fontFamily",
		"productGridStyle",
		"colors",
		"header",
		"typography",
		"hero",
		"layout",
		"productCard",
		"checkoutBranding",
		"mobile",
		"paymentSettings",
		"seo",
		"homepageSections",
		"allProducts",
		"migrations",
		"navigation",
		"footer",
		"policies"
	]);
	const DEFAULT_COLORS = {
		accent: "#0f766e",
		accentHover: "#115e59",
		accentSoft: "#99f6e4",
		accentBg: "#ecfdf5",
		accentStrong: "#042f2e",
		accentMuted: "#14b8a6",
		accentLight: "#5eead4",
		accentRing: "#ccfbf1",
		background: "#ffffff",
		foreground: "#111827",
		headerBackground: "#ffffff",
		primaryButtonBg: "#0f766e",
		primaryButtonText: "#ffffff",
		primaryButtonHoverBg: "#115e59",
		secondaryButtonBg: "#ffffff",
		secondaryButtonText: "#0f172a",
		secondaryButtonHoverBg: "#f8fafc",
		navbarBackground: "#ffffff",
		navbarText: "#0f172a",
		navbarHover: "#0f766e",
		cardBackground: "#ffffff",
		cardBorder: "#e2e8f0",
		cardHoverBorder: "#99f6e4",
		priceColor: "#0f172a",
		saleBadgeBg: "#dc2626",
		saleBadgeText: "#ffffff",
		ratingColor: "#f59e0b",
		footerBackground: "#ffffff",
		footerText: "#64748b",
		footerLink: "#0f172a",
		brand: {
			primary: "#0f766e",
			secondary: "#0f172a",
			accent: "#0f766e",
			hover: "#115e59",
			soft: "#ecfdf5",
			ring: "#ccfbf1"
		},
		header: {
			background: "#ffffff",
			text: "#0f172a",
			mutedText: "#64748b",
			icon: "#0f172a",
			border: "#e2e8f0",
			hover: "#0f766e",
			cartBadgeBackground: "#0f766e",
			cartBadgeText: "#ffffff"
		},
		hero: {
			background: "#020617",
			title: "#ffffff",
			subtitle: "#e2e8f0",
			overlay: "#020617",
			primaryButtonBackground: "#ffffff",
			primaryButtonText: "#0f172a",
			secondaryButtonBackground: "#ffffff",
			secondaryButtonText: "#0f172a"
		},
		productCard: {
			background: "#ffffff",
			border: "#e2e8f0",
			shadow: "#e2e8f0",
			title: "#0f172a",
			category: "#64748b",
			price: "#0f172a",
			compareAtPrice: "#94a3b8",
			saleBadgeBackground: "#dc2626",
			saleBadgeText: "#ffffff",
			ratingStar: "#f59e0b",
			ratingText: "#94a3b8",
			wishlistIcon: "#64748b",
			wishlistActive: "#e11d48",
			addToCartBackground: "#0f766e",
			addToCartText: "#ffffff",
			buyNowBackground: "#0f172a",
			buyNowText: "#ffffff",
			outOfStockBackground: "#fff1f2",
			outOfStockText: "#e11d48",
			stockBackground: "#ecfdf5",
			stockText: "#047857",
			variantChipBackground: "#f8fafc",
			variantChipText: "#475569",
			variantChipSelectedBackground: "#0f766e",
			variantChipSelectedText: "#ffffff"
		},
		allProducts: {
			background: "#f8fafc",
			title: "#0f172a",
			subtitle: "#64748b",
			filterBackground: "#ffffff",
			filterText: "#475569",
			dropdownBackground: "#ffffff",
			paginationBackground: "#ffffff",
			paginationText: "#475569",
			paginationActiveBackground: "#0f766e",
			paginationActiveText: "#ffffff"
		},
		sections: {
			background: "#ffffff",
			title: "#0f172a",
			subtitle: "#64748b",
			bannerOverlay: "#020617",
			bannerText: "#ffffff",
			faqBackground: "#f8fafc",
			faqText: "#475569",
			testimonialBackground: "#f8fafc",
			testimonialText: "#475569",
			trustIcon: "#0f766e",
			trustText: "#475569"
		},
		footer: {
			background: "#ffffff",
			heading: "#0f172a",
			text: "#64748b",
			link: "#0f172a",
			linkHover: "#0f766e",
			border: "#e2e8f0",
			poweredBy: "#64748b"
		},
		checkout: {
			background: "#f8fafc",
			cardBackground: "#ffffff",
			text: "#0f172a",
			buttonBackground: "#0f172a",
			buttonText: "#ffffff",
			accent: "#0f766e",
			inputBackground: "#ffffff",
			inputBorder: "#cbd5e1",
			inputFocus: "#0f766e",
			error: "#dc2626",
			success: "#047857"
		}
	};
	const FALLBACK_THEME = Object.freeze({
		version: THEME_SCHEMA_VERSION,
		preset: null,
		logoUrl: "",
		faviconUrl: "",
		fontFamily: "Inter",
		productGridStyle: "Comfortable",
		colors: DEFAULT_COLORS,
		header: {
			variant: "standard",
			logoPosition: "Left",
			menuStyle: "Simple"
		},
		typography: {
			headingFont: "Inter",
			bodyFont: "Inter",
			baseSize: 16,
			headingWeight: "800"
		},
		hero: {
			variant: "fullBleed",
			title: "",
			subtitle: "",
			imageUrl: "",
			ctaLabel: "Shop Now",
			ctaUrl: "/",
			overlayOpacity: 25,
			height: "Medium",
			bannerSlides: []
		},
		layout: {
			homepageComposition: "standard",
			maxWidth: "Wide",
			containerWidth: "Wide",
			sectionSpacing: "Comfortable",
			contentSpacing: "Comfortable",
			sectionWidth: "Full Width",
			sectionPaddingTop: 40,
			sectionPaddingBottom: 40,
			sectionMarginTop: 0,
			sectionMarginBottom: 40,
			productColumnsDesktop: 3,
			productColumnsMobile: 2,
			productGap: "Comfortable",
			cardAlignment: "Left"
		},
		productCard: {
			style: "Modern",
			imageFit: "Contain",
			aspectRatio: "Square",
			imageRadius: "Rounded",
			hoverZoom: true,
			showCategory: true,
			showRating: true,
			showReviews: true,
			showStock: true,
			showSku: false,
			showDiscountBadge: true,
			showQuickBuy: true,
			showWishlist: true,
			borderRadius: "Rounded",
			shadow: "Soft",
			titleSize: "Medium",
			titleWeight: "800",
			priceSize: "Medium",
			priceColor: "#0f172a",
			buttonStyle: "Solid",
			buttonShape: "Rounded",
			buttonColor: "#0f766e"
		},
		checkoutBranding: {
			logoUrl: "",
			bannerText: "",
			buttonStyle: "Rounded",
			trustMessage: "Secure checkout"
		},
		mobile: {
			stickyCheckoutButton: true,
			compactHeader: true,
			showBottomNavigation: false,
			heroComposition: "Theme",
			sectionSpacing: "Theme"
		},
		paymentSettings: {
			additionalMethodsEnabled: false,
			providers: {
				stripe: false,
				sslcommerz: false,
				bkash: false,
				nagad: false,
				rocket: false,
				paypal: false
			}
		},
		seo: {
			mode: "auto",
			siteName: "",
			title: "",
			description: "",
			keywords: [],
			topics: [],
			socialTitle: "",
			socialDescription: "",
			socialImage: "",
			socialImageAssetId: null,
			socialImageAlt: "",
			socialImageWidth: null,
			socialImageHeight: null,
			socialImageMimeType: "",
			facebookUrl: "",
			searchEngineVisibility: true,
			googleSiteVerification: "",
			language: "en-BD",
			spellingPreference: "british",
			primaryCategory: "",
			aiSuggestion: {
				alternatives: [],
				generatedAt: null,
				generatedFromHash: "",
				inputSnapshot: null,
				acceptedOptionId: "",
				acceptedFields: [],
				acceptedAt: null,
				acceptedOrigins: {}
			},
			autoUpdate: false
		},
		homepageSections: [{
			id: "featured-products",
			type: "FeaturedProducts",
			title: "Featured Products",
			sortOrder: 0,
			isEnabled: true,
			settings: {
				source: {
					type: "manual",
					productIds: []
				},
				productIds: []
			},
			desktopSettings: { isVisible: true },
			mobileSettings: {
				columns: 2,
				isVisible: true
			}
		}],
		allProducts: {
			title: "All Products",
			subtitle: "Browse this shop's latest catalog",
			isEnabled: true,
			desktopColumns: 3,
			tabletColumns: 2,
			mobileColumns: 2,
			spacing: "Comfortable"
		},
		migrations: { bannerSectionsV1: false },
		navigation: [
			{
				label: "Shop",
				url: "/",
				sortOrder: 0,
				children: [],
				megaMenu: false
			},
			{
				label: "Policies",
				url: "/policies",
				sortOrder: 1,
				children: [],
				megaMenu: false
			},
			{
				label: "Track Order",
				url: "/track",
				sortOrder: 2,
				children: [],
				megaMenu: false
			}
		],
		footer: {
			text: "",
			contactLabel: "Contact store",
			contactEmail: "",
			facebookUrl: "",
			instagramUrl: "",
			twitterUrl: "",
			youtubeUrl: "",
			tiktokUrl: "",
			links: []
		},
		policies: {
			refund: "",
			shipping: "",
			privacy: "",
			terms: ""
		}
	});
	const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
	const LEGACY_LOW_CONTRAST_FOOTER_TEXT = "#94a3b8";
	const UNSAFE_URL_PATTERN = /^(?:javascript|vbscript|data):/i;
	const URL_FIELD_PATTERN = /(?:url|href|link|image|images|logo|favicon)$/i;
	const LEGACY_DEFAULT_COLORS = {
		accent: "#4f46e5",
		accentHover: "#4338ca",
		accentSoft: "#c7d2fe",
		accentBg: "#eef2ff",
		accentStrong: "#3730a3",
		accentMuted: "#818cf8",
		accentLight: "#a5b4fc",
		accentRing: "#e0e7ff"
	};
	const cloneTheme = (value) => JSON.parse(JSON.stringify(value || {}));
	const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
	const mergeObject = (base, incoming) => ({
		...base,
		...isPlainObject(incoming) ? incoming : {}
	});
	const clamp = (value, min, max, fallback) => {
		const number = Number(value);
		return Number.isFinite(number) ? Math.min(Math.max(number, min), max) : fallback;
	};
	const cleanText = (value = "", maxLength = 5e3) => String(value || "").replace(/\0/g, "").replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, "").trim().slice(0, maxLength);
	const isSafeThemeUrl = (value = "") => {
		const raw = String(value || "").trim();
		if (!raw) return true;
		const compact = raw.replace(/[\u0000-\u001F\u007F\s]+/g, "");
		if (UNSAFE_URL_PATTERN.test(compact) || raw.startsWith("//")) return false;
		return raw.startsWith("#") || raw.startsWith("/") || /^https?:\/\//i.test(raw) || /^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(raw) || /^tel:\+?[0-9().\-\s]{4,30}$/i.test(raw);
	};
	const sanitizeThemeUrl = (value = "") => {
		const raw = cleanText(value, 1e3);
		return isSafeThemeUrl(raw) ? raw : "#";
	};
	const sanitizeThemeValue = (value, key = "", depth = 0) => {
		if (depth > 12) return void 0;
		if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
		if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeThemeValue(item, key, depth + 1)).filter((item) => item !== void 0);
		if (isPlainObject(value)) return Object.entries(value).slice(0, 200).reduce((acc, [childKey, childValue]) => {
			if ([
				"__proto__",
				"constructor",
				"prototype"
			].includes(childKey) || childKey.startsWith("$") || childKey.includes(".")) return acc;
			const sanitized = sanitizeThemeValue(childValue, childKey, depth + 1);
			if (sanitized !== void 0) acc[childKey] = sanitized;
			return acc;
		}, {});
		if (typeof value === "string") return URL_FIELD_PATTERN.test(key) ? sanitizeThemeUrl(value) : cleanText(value);
		if (typeof value === "number") return Number.isFinite(value) ? value : 0;
		if (typeof value === "boolean" || value === null) return value;
	};
	const sanitizeColorObject = (value = {}) => Object.entries(isPlainObject(value) ? value : {}).reduce((acc, [key, color]) => {
		if (isPlainObject(color)) {
			const nested = sanitizeColorObject(color);
			if (Object.keys(nested).length) acc[key] = nested;
		} else if (typeof color === "string" && HEX_COLOR_REGEX.test(color.trim())) acc[key] = color.trim();
		return acc;
	}, {});
	const sanitizeThemePayload = (theme = {}) => {
		const picked = ALLOWED_THEME_KEYS.reduce((acc, key) => {
			if (theme?.[key] !== void 0) acc[key] = sanitizeThemeValue(theme[key], key);
			return acc;
		}, {});
		const unknown = Object.fromEntries(Object.entries(theme || {}).filter(([key]) => !ALLOWED_THEME_KEYS.includes(key) && ![
			"__proto__",
			"constructor",
			"prototype"
		].includes(key) && !key.startsWith("$") && !key.includes(".")));
		if (Object.keys(unknown).length) picked.extensions = {
			...picked.extensions || {},
			unknown: {
				...picked.extensions?.unknown || {},
				...sanitizeThemeValue(unknown)
			}
		};
		if (picked.colors) picked.colors = sanitizeColorObject(picked.colors);
		if (picked.presentationVariant !== "atelier-editorial") delete picked.presentationVariant;
		if (picked.preset) {
			const presetId = cleanText(picked.preset.id, 80).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
			const presetVersion = Number(picked.preset.version);
			const appliedAtValue = picked.preset.appliedAt ? cleanText(picked.preset.appliedAt, 40) : "";
			const appliedAtTimestamp = Date.parse(appliedAtValue);
			picked.preset = presetId && Number.isInteger(presetVersion) && presetVersion > 0 ? {
				id: presetId,
				version: Math.min(presetVersion, 1e5),
				appliedAt: Number.isFinite(appliedAtTimestamp) ? new Date(appliedAtTimestamp).toISOString() : null
			} : null;
		}
		if (picked.seo) {
			picked.seo.mode = ["auto", "manual"].includes(picked.seo.mode) ? picked.seo.mode : "auto";
			picked.seo.siteName = cleanText(picked.seo.siteName, 80);
			picked.seo.title = cleanText(picked.seo.title, 70);
			picked.seo.description = cleanText(picked.seo.description, 170);
			const topics = Array.isArray(picked.seo.topics) ? picked.seo.topics : Array.isArray(picked.seo.keywords) ? picked.seo.keywords : [];
			picked.seo.topics = [...new Set(topics.map((topic) => cleanText(topic, 60)).filter(Boolean))].slice(0, 20);
			picked.seo.keywords = [...picked.seo.topics];
			picked.seo.socialTitle = cleanText(picked.seo.socialTitle, 70);
			picked.seo.socialDescription = cleanText(picked.seo.socialDescription, 170);
			picked.seo.socialImageAlt = cleanText(picked.seo.socialImageAlt, 160);
			picked.seo.socialImageWidth = Number(picked.seo.socialImageWidth) > 0 ? Number(picked.seo.socialImageWidth) : null;
			picked.seo.socialImageHeight = Number(picked.seo.socialImageHeight) > 0 ? Number(picked.seo.socialImageHeight) : null;
			picked.seo.socialImageMimeType = /^(?:image\/jpeg|image\/png|image\/webp|image\/gif)$/i.test(String(picked.seo.socialImageMimeType || "")) ? String(picked.seo.socialImageMimeType).toLowerCase() : "";
			picked.seo.language = /^(?:en|bn)(?:-BD)?$/i.test(String(picked.seo.language || "")) ? picked.seo.language : "en-BD";
			picked.seo.spellingPreference = ["british", "american"].includes(String(picked.seo.spellingPreference || "").toLowerCase()) ? String(picked.seo.spellingPreference).toLowerCase() : "british";
			picked.seo.primaryCategory = cleanText(picked.seo.primaryCategory, 80);
			const suggestion = isPlainObject(picked.seo.aiSuggestion) ? picked.seo.aiSuggestion : {};
			picked.seo.aiSuggestion = {
				alternatives: (Array.isArray(suggestion.alternatives) ? suggestion.alternatives : []).slice(0, 3).map((option, index) => ({
					id: cleanText(option?.id || `option-${index + 1}`, 40),
					title: cleanText(option?.title, 70),
					description: cleanText(option?.description, 170),
					explanation: cleanText(option?.explanation, 240),
					tone: cleanText(option?.tone, 40),
					topics: (Array.isArray(option?.topics) ? option.topics : []).map((topic) => cleanText(topic, 60)).filter(Boolean).slice(0, 10),
					limitations: cleanText(option?.limitations, 180)
				})),
				generatedAt: suggestion.generatedAt ? cleanText(suggestion.generatedAt, 40) : null,
				generatedFromHash: cleanText(suggestion.generatedFromHash, 100),
				inputSnapshot: isPlainObject(suggestion.inputSnapshot) ? sanitizeThemeValue(suggestion.inputSnapshot, "inputSnapshot") : null,
				acceptedOptionId: cleanText(suggestion.acceptedOptionId, 40),
				acceptedFields: (Array.isArray(suggestion.acceptedFields) ? suggestion.acceptedFields : []).filter((field) => ["title", "description"].includes(field)),
				acceptedAt: suggestion.acceptedAt ? cleanText(suggestion.acceptedAt, 40) : null,
				acceptedOrigins: homepageSeo.normalizeAcceptedSeoProvenance(picked.seo)
			};
			picked.seo.autoUpdate = false;
			picked.seo.googleSiteVerification = cleanText(picked.seo.googleSiteVerification, 500).replace(/^.*?content\s*=\s*["']([^"']+)["'].*$/i, "$1").replace(/[<>"'`\s]/g, "").slice(0, 200);
		}
		return picked;
	};
	const mergeColorGroup = (base = {}, incoming = {}) => Object.keys(base).reduce((acc, key) => {
		acc[key] = HEX_COLOR_REGEX.test(String(incoming?.[key] || "")) ? incoming[key] : base[key];
		return acc;
	}, {});
	const normalizeHexColor = (value = "") => {
		const color = String(value || "").trim().toLowerCase();
		if (!HEX_COLOR_REGEX.test(color)) return "";
		if (color.length === 4) return `#${color.slice(1).split("").map((channel) => `${channel}${channel}`).join("")}`;
		return color;
	};
	const hexToRgb = (value = "") => {
		const color = normalizeHexColor(value);
		if (!color) return null;
		return {
			r: Number.parseInt(color.slice(1, 3), 16),
			g: Number.parseInt(color.slice(3, 5), 16),
			b: Number.parseInt(color.slice(5, 7), 16)
		};
	};
	const rgbToHex = ({ r, g, b }) => `#${[
		r,
		g,
		b
	].map((channel) => Math.min(255, Math.max(0, Math.round(channel))).toString(16).padStart(2, "0")).join("")}`;
	const relativeLuminance = (value = "") => {
		const rgb = hexToRgb(value);
		if (!rgb) return null;
		const linear = (channel) => {
			const normalized = channel / 255;
			return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
		};
		return .2126 * linear(rgb.r) + .7152 * linear(rgb.g) + .0722 * linear(rgb.b);
	};
	const contrastRatio = (foreground = "", background = "") => {
		const foregroundLuminance = relativeLuminance(foreground);
		const backgroundLuminance = relativeLuminance(background);
		if (foregroundLuminance === null || backgroundLuminance === null) return null;
		const lighter = Math.max(foregroundLuminance, backgroundLuminance);
		const darker = Math.min(foregroundLuminance, backgroundLuminance);
		return (lighter + .05) / (darker + .05);
	};
	const mixHexColors = (from = "", to = "", amount = 0) => {
		const fromRgb = hexToRgb(from);
		const toRgb = hexToRgb(to);
		if (!fromRgb || !toRgb) return "";
		const weight = Math.min(1, Math.max(0, Number(amount) || 0));
		return rgbToHex({
			r: fromRgb.r + (toRgb.r - fromRgb.r) * weight,
			g: fromRgb.g + (toRgb.g - fromRgb.g) * weight,
			b: fromRgb.b + (toRgb.b - fromRgb.b) * weight
		});
	};
	const suggestAccessibleForeground = (foreground = "", background = "", minimumRatio = 4.5) => {
		const normalizedForeground = normalizeHexColor(foreground);
		const normalizedBackground = normalizeHexColor(background);
		if (!normalizedForeground || !normalizedBackground) return "";
		if ((contrastRatio(normalizedForeground, normalizedBackground) || 0) >= minimumRatio) return normalizedForeground;
		const target = (contrastRatio("#000000", normalizedBackground) || 0) >= (contrastRatio("#ffffff", normalizedBackground) || 0) ? "#000000" : "#ffffff";
		for (let step = 1; step <= 20; step += 1) {
			const candidate = mixHexColors(normalizedForeground, target, step / 20);
			if ((contrastRatio(candidate, normalizedBackground) || 0) >= minimumRatio) return candidate;
		}
		return target;
	};
	const THEME_CONTRAST_PAIRS = Object.freeze([
		[
			"header.text",
			"header.background",
			"Header text"
		],
		[
			"header.mutedText",
			"header.background",
			"Header subtitle"
		],
		[
			"header.icon",
			"header.background",
			"Header icons"
		],
		[
			"header.cartBadgeText",
			"header.cartBadgeBackground",
			"Cart badge text"
		],
		[
			"hero.title",
			"hero.background",
			"Hero title"
		],
		[
			"hero.subtitle",
			"hero.background",
			"Hero subtitle"
		],
		[
			"hero.primaryButtonText",
			"hero.primaryButtonBackground",
			"Hero primary button"
		],
		[
			"hero.secondaryButtonText",
			"hero.secondaryButtonBackground",
			"Hero secondary button"
		],
		[
			"productCard.title",
			"productCard.background",
			"Product title"
		],
		[
			"productCard.category",
			"productCard.background",
			"Product category"
		],
		[
			"productCard.price",
			"productCard.background",
			"Product price"
		],
		[
			"productCard.saleBadgeText",
			"productCard.saleBadgeBackground",
			"Sale badge"
		],
		[
			"productCard.addToCartText",
			"productCard.addToCartBackground",
			"Add to Cart button"
		],
		[
			"productCard.buyNowText",
			"productCard.buyNowBackground",
			"Buy Now button"
		],
		[
			"allProducts.title",
			"allProducts.background",
			"Catalog title"
		],
		[
			"allProducts.subtitle",
			"allProducts.background",
			"Catalog subtitle"
		],
		[
			"sections.title",
			"sections.background",
			"Section title"
		],
		[
			"sections.subtitle",
			"sections.background",
			"Section subtitle"
		],
		[
			"footer.heading",
			"footer.background",
			"Footer headings"
		],
		[
			"footer.text",
			"footer.background",
			"Footer text"
		],
		[
			"footer.link",
			"footer.background",
			"Footer links"
		],
		[
			"footer.poweredBy",
			"footer.background",
			"Footer powered-by text"
		],
		[
			"checkout.text",
			"checkout.cardBackground",
			"Checkout text"
		],
		[
			"checkout.buttonText",
			"checkout.buttonBackground",
			"Checkout button"
		]
	]);
	const getPathValue = (value = {}, path = "") => String(path || "").split(".").filter(Boolean).reduce((current, key) => current?.[key], value);
	const evaluateThemeContrast = (themeCandidate = {}, minimumRatio = 4.5) => {
		const colors = normalizeTheme(themeCandidate).colors;
		return THEME_CONTRAST_PAIRS.map(([foregroundPath, backgroundPath, label]) => {
			const foreground = getPathValue(colors, foregroundPath);
			const background = getPathValue(colors, backgroundPath);
			const ratio = contrastRatio(foreground, background);
			return {
				label,
				foregroundPath,
				backgroundPath,
				foreground,
				background,
				ratio,
				minimumRatio,
				passes: ratio !== null && ratio >= minimumRatio,
				suggestedForeground: suggestAccessibleForeground(foreground, background, minimumRatio)
			};
		});
	};
	const normalizeThemeColors = (theme = {}) => {
		const raw = isPlainObject(theme.colors) ? theme.colors : {};
		const colors = {
			...Object.keys(DEFAULT_COLORS).reduce((acc, key) => {
				if (!isPlainObject(DEFAULT_COLORS[key])) {
					const value = raw[key];
					acc[key] = HEX_COLOR_REGEX.test(String(value || "")) ? value : DEFAULT_COLORS[key];
				}
				return acc;
			}, {}),
			brand: mergeColorGroup(DEFAULT_COLORS.brand, {
				primary: raw.brand?.primary || raw.accent,
				secondary: raw.brand?.secondary || raw.foreground,
				accent: raw.brand?.accent || raw.accent,
				hover: raw.brand?.hover || raw.accentHover,
				soft: raw.brand?.soft || raw.accentBg,
				ring: raw.brand?.ring || raw.accentRing
			}),
			header: mergeColorGroup(DEFAULT_COLORS.header, {
				...raw.header || {},
				background: raw.header?.background || raw.navbarBackground || raw.headerBackground,
				text: raw.header?.text || raw.navbarText,
				icon: raw.header?.icon || raw.navbarText,
				hover: raw.header?.hover || raw.navbarHover || raw.accent,
				border: raw.header?.border || raw.cardBorder,
				cartBadgeBackground: raw.header?.cartBadgeBackground || raw.accent,
				cartBadgeText: raw.header?.cartBadgeText || raw.primaryButtonText
			}),
			hero: mergeColorGroup(DEFAULT_COLORS.hero, raw.hero || {}),
			productCard: mergeColorGroup(DEFAULT_COLORS.productCard, {
				...raw.productCard || {},
				background: raw.productCard?.background || raw.cardBackground,
				border: raw.productCard?.border || raw.cardBorder,
				price: raw.productCard?.price || raw.priceColor || theme.productCard?.priceColor,
				saleBadgeBackground: raw.productCard?.saleBadgeBackground || raw.saleBadgeBg,
				saleBadgeText: raw.productCard?.saleBadgeText || raw.saleBadgeText,
				ratingStar: raw.productCard?.ratingStar || raw.ratingColor,
				addToCartBackground: raw.productCard?.addToCartBackground || raw.primaryButtonBg || theme.productCard?.buttonColor,
				addToCartText: raw.productCard?.addToCartText || raw.primaryButtonText
			}),
			allProducts: mergeColorGroup(DEFAULT_COLORS.allProducts, raw.allProducts || {}),
			sections: mergeColorGroup(DEFAULT_COLORS.sections, raw.sections || {}),
			footer: mergeColorGroup(DEFAULT_COLORS.footer, {
				...raw.footer || {},
				background: raw.footer?.background || raw.footerBackground,
				heading: raw.footer?.heading || raw.footerLink,
				text: raw.footer?.text || raw.footerText,
				link: raw.footer?.link || raw.footerLink,
				linkHover: raw.footer?.linkHover || raw.accent,
				border: raw.footer?.border || raw.cardBorder
			}),
			checkout: mergeColorGroup(DEFAULT_COLORS.checkout, raw.checkout || {})
		};
		if (normalizeHexColor(raw.footer?.poweredBy) === LEGACY_LOW_CONTRAST_FOOTER_TEXT && (contrastRatio(colors.footer.poweredBy, colors.footer.background) || 0) < 4.5) colors.footer.poweredBy = DEFAULT_COLORS.footer.poweredBy;
		Object.entries(LEGACY_DEFAULT_COLORS).forEach(([key, legacyValue]) => {
			if (String(colors[key]).toLowerCase() === legacyValue) colors[key] = DEFAULT_COLORS[key];
		});
		return colors;
	};
	const normalizeFocalPoint = (value = {}) => ({
		x: clamp(value?.x, 0, 100, 50),
		y: clamp(value?.y, 0, 100, 50)
	});
	const normalizeProductSource = (section = {}) => {
		const settings = isPlainObject(section.settings) ? section.settings : {};
		const source = isPlainObject(settings.source) ? settings.source : isPlainObject(section.source) ? section.source : {};
		const productIds = Array.isArray(settings.productIds) ? settings.productIds : Array.isArray(source.productIds) ? source.productIds : [];
		if (![
			"FeaturedProducts",
			"Collection",
			"CollectionShowcase"
		].includes(section.type)) return {
			settings,
			source: section.source || {}
		};
		const ids = [...new Set(productIds.map(String).filter(Boolean))].slice(0, 50);
		return {
			settings: {
				...settings,
				productIds: ids,
				source: {
					type: source.type || "manual",
					productIds: ids
				}
			},
			source: {
				type: source.type || "manual",
				productIds: ids
			}
		};
	};
	const isLegacyAllProductsSection = (section = {}) => {
		if (!["FeaturedProducts", "Collection"].includes(section.type)) return false;
		const settings = section.settings || {};
		const source = settings.source || section.source || {};
		const productIds = settings.productIds || source.productIds || [];
		return !source.type && (!Array.isArray(productIds) || productIds.length === 0);
	};
	const normalizeHomepageSections = (sections = []) => (Array.isArray(sections) ? sections : []).filter((section) => section && section.type !== "Hero" && !isLegacyAllProductsSection(section)).map((rawSection, index) => {
		const type = rawSection.type === "BannerGrid" ? "Banner" : rawSection.type;
		if (!SECTION_REGISTRY[type]) return null;
		const { _id: databaseId, __v: databaseVersion, ...portableSection } = rawSection;
		const section = {
			...portableSection,
			type
		};
		const productSource = normalizeProductSource(section);
		const settings = {
			...cloneTheme(SECTION_REGISTRY[type].defaultSettings),
			...productSource.settings,
			...STRUCTURAL_VARIANTS.sections[type] ? { variant: normalizeStructuralVariant(productSource.settings?.variant, STRUCTURAL_VARIANTS.sections[type]) } : {},
			...SECTION_REGISTRY[type].supportsFocalPoint ? { focalPoint: normalizeFocalPoint(productSource.settings?.focalPoint) } : {}
		};
		return {
			...section,
			id: cleanText(section.id || (databaseId ? String(databaseId) : "") || `${type}-${index}`, 80),
			title: cleanText(section.title || SECTION_REGISTRY[type].label, 120),
			type,
			isEnabled: section.isEnabled !== false,
			sortOrder: Number.isFinite(Number(section.sortOrder)) ? Number(section.sortOrder) : index,
			settings,
			desktopSettings: {
				...isPlainObject(section.desktopSettings) ? section.desktopSettings : {},
				isVisible: section.desktopSettings?.isVisible !== false
			},
			mobileSettings: {
				...isPlainObject(section.mobileSettings) ? section.mobileSettings : {},
				isVisible: section.mobileSettings?.isVisible !== false,
				...SECTION_REGISTRY[type].supportsFocalPoint ? { focalPoint: normalizeFocalPoint(section.mobileSettings?.focalPoint) } : {}
			},
			source: productSource.source
		};
	}).filter(Boolean).sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 30).map((section, index) => ({
		...section,
		sortOrder: index
	}));
	const resolveHeroSlideFields = (slide = {}, index = 0, hero = {}) => ({
		...slide,
		id: slide.id || `hero-slide-${index + 1}`,
		enabled: slide.enabled !== false,
		desktopImage: slide.desktopImage ?? slide.imageUrl ?? (index === 0 ? hero.imageUrl : "") ?? "",
		mobileImage: slide.mobileImage ?? "",
		title: slide.title ?? (index === 0 ? hero.title : "") ?? "",
		subtitle: slide.subtitle ?? (index === 0 ? hero.subtitle : "") ?? "",
		badgeText: slide.badgeText ?? (index === 0 ? hero.badgeText : "") ?? "",
		discountText: slide.discountText ?? "",
		primaryCtaText: slide.primaryCtaText ?? (index === 0 ? hero.ctaLabel : void 0) ?? "Shop Now",
		primaryCtaLink: slide.primaryCtaLink ?? (index === 0 ? hero.ctaUrl : void 0) ?? "#products",
		secondaryCtaText: slide.secondaryCtaText ?? "Explore Collection",
		secondaryCtaLink: slide.secondaryCtaLink ?? "#products",
		desktopFocalPoint: normalizeFocalPoint({
			x: slide.desktopFocalPoint?.x ?? void 0,
			y: slide.desktopFocalPoint?.y ?? void 0
		}),
		mobileFocalPoint: normalizeFocalPoint({
			x: slide.mobileFocalPoint?.x ?? void 0,
			y: slide.mobileFocalPoint?.y ?? void 0
		})
	});
	const normalizeHeroSlide = (slide = {}, index = 0, hero = {}) => {
		const resolved = resolveHeroSlideFields(slide, index, hero);
		return {
			...resolved,
			id: cleanText(resolved.id, 80),
			desktopImage: sanitizeThemeUrl(resolved.desktopImage),
			mobileImage: sanitizeThemeUrl(resolved.mobileImage),
			title: cleanText(resolved.title, 140),
			subtitle: cleanText(resolved.subtitle, 280),
			badgeText: cleanText(resolved.badgeText, 80),
			discountText: cleanText(resolved.discountText, 80),
			primaryCtaText: cleanText(resolved.primaryCtaText, 80),
			primaryCtaLink: sanitizeThemeUrl(resolved.primaryCtaLink),
			secondaryCtaText: cleanText(resolved.secondaryCtaText, 80),
			secondaryCtaLink: sanitizeThemeUrl(resolved.secondaryCtaLink)
		};
	};
	const ensurePolicyNavigationLink = (navigation = []) => {
		const links = Array.isArray(navigation) ? navigation : [];
		if (links.some((item) => /polic/i.test(String(item?.label || "")) || /^\/policies(?:\/|$)/i.test(String(item?.url || "")))) return links;
		return [...links, {
			label: "Policies",
			url: "/policies",
			sortOrder: links.length,
			children: [],
			megaMenu: false
		}];
	};
	const normalizeNavigation = (navigation = []) => ensurePolicyNavigationLink(Array.isArray(navigation) ? navigation : FALLBACK_THEME.navigation).slice(0, 20).map((item, index) => ({
		...item,
		label: cleanText(item?.label, 80),
		url: sanitizeThemeUrl(item?.url || "#"),
		sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index,
		isExternal: item?.isExternal === true,
		megaMenu: item?.megaMenu === true,
		children: (Array.isArray(item?.children) ? item.children : []).slice(0, 20).map((child, childIndex) => ({
			...child,
			label: cleanText(child?.label, 80),
			url: sanitizeThemeUrl(child?.url || "#"),
			sortOrder: Number.isFinite(Number(child?.sortOrder)) ? Number(child.sortOrder) : childIndex
		}))
	})).sort((a, b) => a.sortOrder - b.sortOrder);
	const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
	const SUPPORTED_THEME_FONTS = new Set([
		"Inter",
		"Arial",
		"Georgia",
		"Roboto",
		"DM Sans"
	]);
	const SUPPORTED_HEADING_WEIGHTS = new Set([
		"600",
		"700",
		"800",
		"900"
	]);
	const PRODUCT_CARD_STYLE_DEFAULTS = Object.freeze({
		Minimal: {
			shadow: "None",
			buttonStyle: "Outline",
			titleWeight: "700"
		},
		Modern: {},
		Premium: {
			shadow: "Elevated",
			titleWeight: "800"
		}
	});
	const PRODUCT_CARD_STYLE_FIELDS = Object.freeze([
		"shadow",
		"titleWeight",
		"buttonStyle"
	]);
	const NULLABLE_THEME_PATCH_PATHS = new Set([
		"preset",
		"preset.appliedAt",
		"presentationVariant",
		"seo.socialImageAssetId",
		"seo.socialImageWidth",
		"seo.socialImageHeight",
		"seo.aiSuggestion.generatedAt",
		"seo.aiSuggestion.inputSnapshot",
		"seo.aiSuggestion.acceptedAt"
	]);
	const isThemePatchObject = (value) => value !== null && typeof value === "object" && [Object.prototype, null].includes(Object.getPrototypeOf(value));
	const isThemePatchKey = (key) => ![
		"__proto__",
		"constructor",
		"prototype"
	].includes(key) && !key.startsWith("$") && !key.includes(".");
	const mergeThemePatch = (base = {}, patch = {}) => {
		const checkDepth = (depth) => {
			if (depth > 12) throw new RangeError("Theme patch exceeds the supported nesting depth.");
		};
		const copy = (value, depth) => {
			checkDepth(depth);
			if (Array.isArray(value)) return value.map((item) => copy(item, depth + 1));
			if (isThemePatchObject(value)) return Object.fromEntries(Object.entries(value).filter(([key, item]) => isThemePatchKey(key) && item !== void 0).map(([key, item]) => [key, copy(item, depth + 1)]));
			if (value !== null && typeof value === "object") throw new TypeError("Theme patches require plain JSON values.");
			return value;
		};
		const apply = (current, incoming, path, depth) => {
			checkDepth(depth);
			const result = isThemePatchObject(current) ? current : {};
			for (const [key, value] of Object.entries(incoming)) {
				if (!isThemePatchKey(key) || value === void 0) continue;
				const fieldPath = path ? `${path}.${key}` : key;
				if (value === null && !NULLABLE_THEME_PATCH_PATHS.has(fieldPath)) continue;
				result[key] = isThemePatchObject(value) ? apply(result[key], value, fieldPath, depth + 1) : copy(value, depth + 1);
			}
			return result;
		};
		const result = apply(copy(isThemePatchObject(base) ? base : {}, 0), isThemePatchObject(patch) ? patch : {}, "", 0);
		const cardPatch = isThemePatchObject(patch?.productCard) ? patch.productCard : {};
		if (Array.isArray(result.productCard?.inheritedStyleFields) && !Array.isArray(cardPatch.inheritedStyleFields)) result.productCard.inheritedStyleFields = result.productCard.inheritedStyleFields.filter((key) => !PRODUCT_CARD_STYLE_FIELDS.includes(key) || !hasOwn(cardPatch, key) || cardPatch[key] == null);
		return result;
	};
	const normalizeLayout = (theme = {}) => {
		const raw = isPlainObject(theme.layout) ? theme.layout : {};
		const layout = mergeObject(FALLBACK_THEME.layout, raw);
		const legacyContainerWidth = {
			Contained: "Narrow",
			Wide: "Wide",
			Full: "Full Width"
		}[raw.maxWidth];
		const containerWidth = [
			"Narrow",
			"Standard",
			"Wide",
			"Full Width"
		].includes(raw.containerWidth) ? raw.containerWidth : legacyContainerWidth || FALLBACK_THEME.layout.containerWidth;
		const sectionSpacing = [
			"Compact",
			"Comfortable",
			"Spacious"
		].includes(raw.sectionSpacing) ? raw.sectionSpacing : [
			"Compact",
			"Comfortable",
			"Spacious"
		].includes(raw.contentSpacing) ? raw.contentSpacing : FALLBACK_THEME.layout.sectionSpacing;
		const contentSpacing = [
			"Compact",
			"Comfortable",
			"Spacious"
		].includes(raw.contentSpacing) ? raw.contentSpacing : sectionSpacing;
		return {
			...layout,
			homepageComposition: getHomepageComposition(raw.homepageComposition),
			containerWidth,
			maxWidth: containerWidth === "Narrow" ? "Contained" : containerWidth === "Full Width" ? "Full" : "Wide",
			sectionSpacing,
			contentSpacing,
			sectionWidth: [
				"Narrow",
				"Standard",
				"Wide",
				"Full Width"
			].includes(raw.sectionWidth) ? raw.sectionWidth : FALLBACK_THEME.layout.sectionWidth,
			sectionPaddingTop: clamp(raw.sectionPaddingTop, 0, 160, FALLBACK_THEME.layout.sectionPaddingTop),
			sectionPaddingBottom: clamp(raw.sectionPaddingBottom, 0, 160, FALLBACK_THEME.layout.sectionPaddingBottom),
			sectionMarginTop: clamp(raw.sectionMarginTop, 0, 160, FALLBACK_THEME.layout.sectionMarginTop),
			sectionMarginBottom: clamp(raw.sectionMarginBottom, 0, 160, FALLBACK_THEME.layout.sectionMarginBottom),
			productColumnsDesktop: Math.round(clamp(raw.productColumnsDesktop, 2, 5, FALLBACK_THEME.layout.productColumnsDesktop)),
			...raw.productColumnsTablet != null ? { productColumnsTablet: Math.round(clamp(raw.productColumnsTablet, 1, 4, 2)) } : {},
			productColumnsMobile: Math.round(clamp(raw.productColumnsMobile, 1, 2, FALLBACK_THEME.layout.productColumnsMobile)),
			productGap: [
				"Compact",
				"Comfortable",
				"Spacious",
				"Editorial"
			].includes(raw.productGap) ? raw.productGap : [
				"Compact",
				"Comfortable",
				"Spacious",
				"Editorial"
			].includes(theme.productGridStyle) ? theme.productGridStyle : FALLBACK_THEME.layout.productGap,
			cardAlignment: [
				"Left",
				"Center",
				"Right"
			].includes(raw.cardAlignment) ? raw.cardAlignment : FALLBACK_THEME.layout.cardAlignment
		};
	};
	const normalizeTypography = (theme = {}) => {
		const raw = isPlainObject(theme.typography) ? theme.typography : {};
		const legacyFont = SUPPORTED_THEME_FONTS.has(theme.fontFamily) ? theme.fontFamily : FALLBACK_THEME.fontFamily;
		return {
			headingFont: SUPPORTED_THEME_FONTS.has(raw.headingFont) ? raw.headingFont : legacyFont,
			bodyFont: SUPPORTED_THEME_FONTS.has(raw.bodyFont) ? raw.bodyFont : legacyFont,
			baseSize: clamp(raw.baseSize, 12, 20, FALLBACK_THEME.typography.baseSize),
			headingWeight: SUPPORTED_HEADING_WEIGHTS.has(String(raw.headingWeight)) ? String(raw.headingWeight) : FALLBACK_THEME.typography.headingWeight
		};
	};
	const normalizeProductCard = (theme = {}) => {
		const raw = isPlainObject(theme.productCard) ? theme.productCard : {};
		const { inheritedStyleFields, ...values } = raw;
		const style = Object.prototype.hasOwnProperty.call(PRODUCT_CARD_STYLE_DEFAULTS, raw.style) ? raw.style : FALLBACK_THEME.productCard.style;
		const card = mergeObject(FALLBACK_THEME.productCard, {
			...PRODUCT_CARD_STYLE_DEFAULTS[style],
			...values,
			style
		});
		if (Array.isArray(inheritedStyleFields)) {
			card.inheritedStyleFields = PRODUCT_CARD_STYLE_FIELDS.filter((key) => inheritedStyleFields.includes(key));
			for (const key of card.inheritedStyleFields) card[key] = PRODUCT_CARD_STYLE_DEFAULTS[style][key] ?? FALLBACK_THEME.productCard[key];
		}
		return card;
	};
	const updateProductCardSetting = (candidate = {}, key, value) => {
		const card = normalizeProductCard({ productCard: candidate });
		const next = {
			...card,
			[key]: value
		};
		if (key === "style") next.inheritedStyleFields = [...PRODUCT_CARD_STYLE_FIELDS];
		else if (PRODUCT_CARD_STYLE_FIELDS.includes(key) && Array.isArray(card.inheritedStyleFields)) next.inheritedStyleFields = card.inheritedStyleFields.filter((field) => field !== key);
		return normalizeProductCard({ productCard: next });
	};
	const normalizeAllProducts = ({ theme, layout, legacyAllProducts }) => {
		const raw = isPlainObject(theme.allProducts) ? theme.allProducts : {};
		const spacing = [
			"Compact",
			"Comfortable",
			"Spacious",
			"Editorial"
		].includes(raw.spacing) ? raw.spacing : layout.productGap;
		return mergeObject(FALLBACK_THEME.allProducts, {
			...legacyAllProducts?.title ? { title: legacyAllProducts.title } : {},
			...raw,
			desktopColumns: Math.round(clamp(hasOwn(raw, "desktopColumns") ? raw.desktopColumns : layout.productColumnsDesktop, 2, 5, FALLBACK_THEME.allProducts.desktopColumns)),
			tabletColumns: Math.round(clamp(raw.tabletColumns, 1, 4, FALLBACK_THEME.allProducts.tabletColumns)),
			mobileColumns: Math.round(clamp(hasOwn(raw, "mobileColumns") ? raw.mobileColumns : layout.productColumnsMobile, 1, 2, FALLBACK_THEME.allProducts.mobileColumns)),
			spacing
		});
	};
	const normalizeTheme = (candidate = {}) => {
		const theme = mergeThemePatch({}, sanitizeThemePayload(isPlainObject(candidate) ? candidate : {}));
		const legacyAllProducts = (Array.isArray(theme.homepageSections) ? theme.homepageSections : []).find(isLegacyAllProductsSection);
		const hero = mergeObject(FALLBACK_THEME.hero, theme.hero);
		hero.variant = normalizeStructuralVariant(theme.hero?.variant, STRUCTURAL_VARIANTS.hero);
		hero.overlayOpacity = clamp(theme.hero?.overlayOpacity, 0, 80, FALLBACK_THEME.hero.overlayOpacity);
		hero.height = [
			"Compact",
			"Medium",
			"Tall"
		].includes(theme.hero?.height) ? theme.hero.height : FALLBACK_THEME.hero.height;
		hero.bannerSlides = (Array.isArray(hero.bannerSlides) ? hero.bannerSlides : []).slice(0, 5).map((slide, index) => normalizeHeroSlide(slide, index, hero));
		if (!Array.isArray(theme.hero?.bannerSlides) && hero.imageUrl) hero.bannerSlides = [normalizeHeroSlide({}, 0, hero)];
		if (hero.bannerSlides[0]) {
			hero.imageUrl = hero.bannerSlides[0].desktopImage;
			hero.ctaLabel = hero.bannerSlides[0].primaryCtaText;
			hero.ctaUrl = hero.bannerSlides[0].primaryCtaLink;
		}
		const layout = normalizeLayout(theme);
		const typography = normalizeTypography(theme);
		return {
			...cloneTheme(FALLBACK_THEME),
			...theme,
			version: Math.max(THEME_SCHEMA_VERSION, Number(theme.version) || 0),
			colors: normalizeThemeColors(theme),
			header: {
				...FALLBACK_THEME.header,
				...theme.header || {},
				variant: normalizeStructuralVariant(theme.header?.variant, STRUCTURAL_VARIANTS.header),
				logoPosition: "Left"
			},
			typography,
			hero,
			layout,
			productCard: normalizeProductCard(theme),
			checkoutBranding: mergeObject(FALLBACK_THEME.checkoutBranding, theme.checkoutBranding),
			mobile: {
				...mergeObject(FALLBACK_THEME.mobile, theme.mobile),
				heroComposition: [
					"Theme",
					"Image first",
					"Text first"
				].includes(theme.mobile?.heroComposition) ? theme.mobile.heroComposition : "Theme",
				sectionSpacing: [
					"Theme",
					"Compact",
					"Comfortable",
					"Spacious"
				].includes(theme.mobile?.sectionSpacing) ? theme.mobile.sectionSpacing : "Theme"
			},
			allProducts: normalizeAllProducts({
				theme,
				layout,
				legacyAllProducts
			}),
			migrations: mergeObject(FALLBACK_THEME.migrations, theme.migrations),
			paymentSettings: {
				...FALLBACK_THEME.paymentSettings,
				...theme.paymentSettings || {},
				providers: {
					...FALLBACK_THEME.paymentSettings.providers,
					...theme.paymentSettings?.providers || {}
				}
			},
			seo: {
				...FALLBACK_THEME.seo,
				...theme.seo || {},
				topics: Array.isArray(theme.seo?.topics) ? theme.seo.topics : Array.isArray(theme.seo?.keywords) ? theme.seo.keywords : [],
				keywords: Array.isArray(theme.seo?.topics) ? theme.seo.topics : Array.isArray(theme.seo?.keywords) ? theme.seo.keywords : [],
				aiSuggestion: mergeObject(FALLBACK_THEME.seo.aiSuggestion, theme.seo?.aiSuggestion)
			},
			homepageSections: normalizeHomepageSections(Array.isArray(theme.homepageSections) ? theme.homepageSections : FALLBACK_THEME.homepageSections),
			navigation: normalizeNavigation(theme.navigation),
			footer: mergeObject(FALLBACK_THEME.footer, theme.footer),
			policies: mergeObject(FALLBACK_THEME.policies, theme.policies)
		};
	};
	const validateTheme = (candidate = {}) => {
		const errors = [];
		if (candidate.presentationVariant != null && candidate.presentationVariant !== "atelier-editorial") errors.push({
			path: "presentationVariant",
			code: "UNSUPPORTED_VARIANT",
			message: "Unsupported storefront presentation variant."
		});
		if (candidate.version !== void 0 && (!Number.isInteger(Number(candidate.version)) || Number(candidate.version) < 1 || Number(candidate.version) > THEME_SCHEMA_VERSION)) errors.push({
			path: "version",
			code: "UNSUPPORTED_THEME_VERSION",
			message: "Unsupported theme schema version."
		});
		const inheritedStyleFields = candidate?.productCard?.inheritedStyleFields;
		if (inheritedStyleFields !== void 0 && (!Array.isArray(inheritedStyleFields) || inheritedStyleFields.some((key) => !PRODUCT_CARD_STYLE_FIELDS.includes(key)))) errors.push({
			path: "productCard.inheritedStyleFields",
			code: "INVALID_STYLE_INHERITANCE",
			message: "Only shadow, titleWeight, and buttonStyle can inherit card style defaults."
		});
		const validateVariant = (value, contract, path) => {
			if (value !== void 0 && !contract.values.includes(value)) errors.push({
				path,
				code: "UNSUPPORTED_VARIANT",
				message: `Unsupported structural variant: ${String(value || "unknown")}.`
			});
		};
		validateVariant(candidate?.layout?.homepageComposition, STRUCTURAL_VARIANTS.homepage, "layout.homepageComposition");
		validateVariant(candidate?.header?.variant, STRUCTURAL_VARIANTS.header, "header.variant");
		validateVariant(candidate?.hero?.variant, STRUCTURAL_VARIANTS.hero, "hero.variant");
		validateVariant(candidate?.mobile?.heroComposition, { values: [
			"Theme",
			"Image first",
			"Text first"
		] }, "mobile.heroComposition");
		validateVariant(candidate?.mobile?.sectionSpacing, { values: [
			"Theme",
			"Compact",
			"Comfortable",
			"Spacious"
		] }, "mobile.sectionSpacing");
		if (candidate?.preset !== void 0 && candidate.preset !== null) {
			if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(candidate.preset?.id || ""))) errors.push({
				path: "preset.id",
				code: "INVALID_PRESET",
				message: "Theme preset ID must be a lowercase slug."
			});
			if (!Number.isInteger(Number(candidate.preset?.version)) || Number(candidate.preset?.version) < 1) errors.push({
				path: "preset.version",
				code: "INVALID_PRESET",
				message: "Theme preset version must be a positive integer."
			});
			if (candidate.preset?.appliedAt && Number.isNaN(Date.parse(candidate.preset.appliedAt))) errors.push({
				path: "preset.appliedAt",
				code: "INVALID_PRESET",
				message: "Theme preset applied time must be a valid ISO date."
			});
		}
		const rawSections = Array.isArray(candidate?.homepageSections) ? candidate.homepageSections : [];
		rawSections.forEach((section, index) => {
			const type = section?.type === "BannerGrid" ? "Banner" : section?.type;
			if (!SECTION_REGISTRY[type]) errors.push({
				path: `homepageSections.${index}.type`,
				code: "UNSUPPORTED_SECTION",
				message: `Unsupported homepage section: ${type || "unknown"}.`,
				sectionIndex: index
			});
			else if (STRUCTURAL_VARIANTS.sections[type]) validateVariant(section?.settings?.variant, STRUCTURAL_VARIANTS.sections[type], `homepageSections.${index}.settings.variant`);
		});
		const checkUrls = (value, path = "", depth = 0) => {
			if (depth > 12) return;
			if (Array.isArray(value)) return value.forEach((item, index) => checkUrls(item, `${path}.${index}`, depth + 1));
			if (isPlainObject(value)) return Object.entries(value).forEach(([key, child]) => {
				const childPath = path ? `${path}.${key}` : key;
				if (typeof child === "string" && URL_FIELD_PATTERN.test(key) && !isSafeThemeUrl(child)) errors.push({
					path: childPath,
					code: "UNSAFE_URL",
					message: "Use a safe HTTPS, store-relative, email, phone, or anchor link."
				});
				checkUrls(child, childPath, depth + 1);
			});
		};
		checkUrls(candidate);
		if (candidate?.seo?.siteName && cleanText(candidate.seo.siteName, 1e3).length > 80) errors.push({
			path: "seo.siteName",
			code: "MAX_LENGTH",
			message: "Google site name must be 80 characters or fewer."
		});
		if (candidate?.seo?.title && cleanText(candidate.seo.title, 1e3).length > 70) errors.push({
			path: "seo.title",
			code: "MAX_LENGTH",
			message: "Homepage SEO title must be 70 characters or fewer."
		});
		if (candidate?.seo?.description && cleanText(candidate.seo.description, 1e3).length > 170) errors.push({
			path: "seo.description",
			code: "MAX_LENGTH",
			message: "Homepage SEO description must be 170 characters or fewer."
		});
		if (rawSections.length > 30) errors.push({
			path: "homepageSections",
			code: "MAX_ITEMS",
			message: "A storefront can contain up to 30 homepage sections."
		});
		return {
			valid: errors.length === 0,
			errors
		};
	};
	const createDefaultSection = (type, overrides = {}) => {
		const definition = SECTION_REGISTRY[type];
		if (!definition) return null;
		return normalizeHomepageSections([{
			id: `${type}-section`,
			type,
			title: definition.label,
			isEnabled: true,
			sortOrder: 0,
			settings: cloneTheme(definition.defaultSettings),
			desktopSettings: { isVisible: true },
			mobileSettings: { isVisible: true },
			...overrides
		}])[0] || null;
	};
	const getEnabledHomepageSections = (theme = {}) => normalizeTheme(theme).homepageSections.filter((section) => section.isEnabled !== false).sort((a, b) => a.sortOrder - b.sortOrder);
	const getSortedNavigation = (theme = {}) => normalizeTheme(theme).navigation.filter((item) => item.label && (item.url || item.children?.length));
	const getThemeCssVars = (themeCandidate = {}) => {
		const theme = normalizeTheme(themeCandidate);
		const colors = theme.colors;
		const safeColors = Object.keys(FALLBACK_THEME.colors).reduce((acc, key) => {
			if (isPlainObject(FALLBACK_THEME.colors[key])) return acc;
			acc[key] = HEX_COLOR_REGEX.test(String(colors[key] || "")) ? colors[key] : FALLBACK_THEME.colors[key];
			return acc;
		}, {});
		const baseSize = clamp(theme.typography?.baseSize, 12, 20, 16);
		const buttonStyle = theme.checkoutBranding?.buttonStyle;
		return {
			...safeColors,
			colorGroups: {
				brand: mergeColorGroup(FALLBACK_THEME.colors.brand, colors.brand),
				header: mergeColorGroup(FALLBACK_THEME.colors.header, colors.header),
				hero: mergeColorGroup(FALLBACK_THEME.colors.hero, colors.hero),
				productCard: mergeColorGroup(FALLBACK_THEME.colors.productCard, colors.productCard),
				allProducts: mergeColorGroup(FALLBACK_THEME.colors.allProducts, colors.allProducts),
				sections: mergeColorGroup(FALLBACK_THEME.colors.sections, colors.sections),
				footer: mergeColorGroup(FALLBACK_THEME.colors.footer, colors.footer),
				checkout: mergeColorGroup(FALLBACK_THEME.colors.checkout, colors.checkout)
			},
			fontFamily: theme.typography?.bodyFont || theme.fontFamily || FALLBACK_THEME.fontFamily,
			headingFont: theme.typography?.headingFont || theme.fontFamily || FALLBACK_THEME.fontFamily,
			baseSize,
			headingWeight: theme.typography?.headingWeight || FALLBACK_THEME.typography.headingWeight,
			checkoutButtonRadius: buttonStyle === "Pill" ? "999px" : buttonStyle === "Solid" ? "10px" : "16px"
		};
	};
	const extractThemeAssetUrls = (theme = {}) => {
		const urls = /* @__PURE__ */ new Set();
		const walk = (value, key = "", depth = 0) => {
			if (depth > 12 || value === null || value === void 0) return;
			if (Array.isArray(value)) return value.forEach((item) => walk(item, key, depth + 1));
			if (isPlainObject(value)) return Object.entries(value).forEach(([childKey, child]) => walk(child, childKey, depth + 1));
			if (typeof value === "string" && URL_FIELD_PATTERN.test(key) && /^https?:\/\//i.test(value)) urls.add(value);
		};
		walk(theme);
		return [...urls];
	};
	const summarizeThemeChanges = (before = {}, after = {}) => {
		const previous = normalizeTheme(before);
		const next = normalizeTheme(after);
		const summaries = [];
		const changed = (key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key]);
		if (changed("header") || changed("logoUrl") || changed("navigation")) summaries.push({
			area: "Header",
			message: "Store logo or navigation changed."
		});
		if (changed("hero")) summaries.push({
			area: "Hero",
			message: "Hero content, links, or media changed."
		});
		if (changed("homepageSections")) summaries.push({
			area: "Homepage",
			message: "Homepage sections changed or were reordered."
		});
		if (changed("colors") || changed("typography") || changed("layout")) summaries.push({
			area: "Design",
			message: "Store colors, typography, or layout changed."
		});
		if (changed("preset")) summaries.push({
			area: "Theme",
			message: "A prebuilt storefront theme was applied."
		});
		if (changed("productCard") || changed("allProducts")) summaries.push({
			area: "Catalog",
			message: "Product grid or card styling changed."
		});
		if (changed("seo")) summaries.push({
			area: "SEO",
			message: "Homepage search metadata changed."
		});
		if (changed("footer")) summaries.push({
			area: "Footer",
			message: "Footer content or links changed."
		});
		if (changed("checkoutBranding") || changed("paymentSettings")) summaries.push({
			area: "Checkout",
			message: "Checkout branding or payment display changed."
		});
		if (changed("mobile")) summaries.push({
			area: "Mobile",
			message: "Mobile storefront behavior changed."
		});
		if (changed("policies")) summaries.push({
			area: "Policies",
			message: "Store policy content changed."
		});
		return summaries;
	};
	const getStorefrontPresentationVariant = (theme = {}) => theme?.presentationVariant === "atelier-editorial" ? "atelier-editorial" : "default";
	module.exports = {
		normalizeStoredTheme,
		validateStoredTheme,
		assertReadableThemeVersion,
		getStorefrontPresentationVariant,
		HOMEPAGE_COMPOSITIONS,
		getHomepageComposition,
		planHomepageComposition,
		THEME_SCHEMA_VERSION,
		STRUCTURAL_VARIANTS,
		SECTION_REGISTRY,
		SECTION_TYPES,
		ALLOWED_THEME_KEYS,
		FALLBACK_THEME,
		cloneTheme,
		normalizeTheme,
		mergeThemePatch,
		resolveHeroSlideFields,
		PRODUCT_CARD_STYLE_FIELDS,
		updateProductCardSetting,
		createDefaultSection,
		normalizeHomepageSections,
		normalizeThemeColors,
		sanitizeThemePayload,
		validateTheme,
		getEnabledHomepageSections,
		getSortedNavigation,
		getThemeCssVars,
		extractThemeAssetUrls,
		summarizeThemeChanges,
		isSafeThemeUrl,
		sanitizeThemeUrl,
		normalizeHexColor,
		relativeLuminance,
		contrastRatio,
		suggestAccessibleForeground,
		evaluateThemeContrast,
		...homepageSeo
	};
	const policies = require_policies();
	const effective = require_effective()(module.exports);
	module.exports.createThemeInput = effective.createThemeInput;
	module.exports.assertSupportedThemeVersion = effective.assertSupportedThemeVersion;
	module.exports.resolveEffectiveTheme = effective.resolveEffectiveTheme;
	module.exports.getPublicThemeForPlan = effective.getPublicThemeForPlan;
	module.exports.applyBrandingToPublicTheme = effective.applyBrandingToPublicTheme;
	module.exports.POLICY_TYPES = policies.POLICY_TYPES;
	module.exports.DEFAULT_POLICY_TEMPLATES = policies.DEFAULT_POLICY_TEMPLATES;
	module.exports.injectPolicyPlaceholders = policies.injectPolicyPlaceholders;
	module.exports.getDefaultPolicyText = policies.getDefaultPolicyText;
	module.exports.buildDefaultPolicies = policies.buildDefaultPolicies;
	module.exports.hasPolicyText = policies.hasPolicyText;
	module.exports.fillMissingPolicyDefaults = policies.fillMissingPolicyDefaults;
	const capabilities = require_capabilities()(module.exports);
	module.exports.THEME_CAPABILITY_RULES = capabilities.THEME_CAPABILITY_RULES;
	module.exports.LIMITED_EDITABLE_SECTION_TYPES = capabilities.LIMITED_EDITABLE_SECTION_TYPES;
	module.exports.RESTRICTED_THEME_KEYS = capabilities.RESTRICTED_THEME_KEYS;
	module.exports.RESTRICTED_VARIANT_PATHS = capabilities.RESTRICTED_VARIANT_PATHS;
	module.exports.getThemeCapabilities = capabilities.getThemeCapabilities;
	module.exports.getThemePropertyCapability = capabilities.getThemePropertyCapability;
	module.exports.getThemeEditorRestriction = capabilities.getThemeEditorRestriction;
	module.exports.getThemeCapabilityMetadata = capabilities.getThemeCapabilityMetadata;
	module.exports.assertStoreBuilderUpdateAllowed = capabilities.assertStoreBuilderUpdateAllowed;
}));
//#endregion
//#region packages/storefront-theme/index.mjs
var import_storefront_theme = /* @__PURE__ */ __toESM(require_storefront_theme(), 1);
const { normalizeStoredTheme, validateStoredTheme, assertReadableThemeVersion, getStorefrontPresentationVariant, HOMEPAGE_COMPOSITIONS, getHomepageComposition, planHomepageComposition, createThemeInput, assertSupportedThemeVersion, resolveEffectiveTheme, getPublicThemeForPlan, applyBrandingToPublicTheme, POLICY_TYPES, DEFAULT_POLICY_TEMPLATES, injectPolicyPlaceholders, getDefaultPolicyText, buildDefaultPolicies, hasPolicyText, fillMissingPolicyDefaults, THEME_SCHEMA_VERSION, STRUCTURAL_VARIANTS, SECTION_REGISTRY, SECTION_TYPES, ALLOWED_THEME_KEYS, FALLBACK_THEME, cloneTheme, normalizeTheme, mergeThemePatch, resolveHeroSlideFields, PRODUCT_CARD_STYLE_FIELDS, updateProductCardSetting, createDefaultSection, normalizeHomepageSections, normalizeThemeColors, sanitizeThemePayload, validateTheme, getEnabledHomepageSections, getSortedNavigation, getThemeCssVars, THEME_CAPABILITY_RULES, LIMITED_EDITABLE_SECTION_TYPES, RESTRICTED_THEME_KEYS, RESTRICTED_VARIANT_PATHS, getThemeCapabilities, getThemePropertyCapability, getThemeEditorRestriction, assertStoreBuilderUpdateAllowed, getThemeCapabilityMetadata, extractThemeAssetUrls, summarizeThemeChanges, isSafeThemeUrl, sanitizeThemeUrl, normalizeHexColor, relativeLuminance, contrastRatio, suggestAccessibleForeground, evaluateThemeContrast, TITLE_MAX, DESCRIPTION_MAX, SPELLING_GROUPS, cleanSeoText, truncateSeoText, normalizeSearchText, expandSearchSynonyms, areBrandAliasesRelated, normalizeSearchAliases, buildSeoInputSnapshot, computeSeoInputHash, isVerifiedCustomDomain, resolveCanonicalOrigin, resolveHomepageSeo, buildNextHomepageMetadata, buildSeoPreviewModel, evaluateHomepageSeo, normalizeAcceptedSeoProvenance, applySeoSuggestion, editSeoField } = import_storefront_theme.default || import_storefront_theme;
//#endregion
//#region packages/storefront-renderer/designTokens.js
const BASE_CONTAINER_CLASS = "mx-auto w-full px-3 sm:px-4 md:px-6 lg:px-8 2xl:px-10";
const CONTAINER_WIDTH_CLASSES = Object.freeze({
	Narrow: "max-w-5xl",
	Standard: "max-w-7xl",
	Wide: "max-w-screen-2xl",
	"Full Width": "max-w-none"
});
const LEGACY_CONTAINER_WIDTHS = Object.freeze({
	Contained: "Narrow",
	Wide: "Wide",
	Full: "Full Width"
});
const SECTION_WIDTH_CLASSES = Object.freeze({
	Narrow: "mx-auto w-full max-w-4xl",
	Standard: "mx-auto w-full max-w-6xl",
	Wide: "mx-auto w-full max-w-7xl",
	"Full Width": "w-full"
});
const SECTION_SPACING_CLASSES = Object.freeze({
	Compact: "mt-6 md:mt-8",
	Comfortable: "mt-8 md:mt-12",
	Spacious: "mt-10 md:mt-16"
});
Object.freeze({
	Compact: "py-5 sm:py-8",
	Comfortable: "py-6 sm:py-12",
	Spacious: "py-8 sm:py-16",
	Editorial: "py-8 sm:py-16"
});
const CONTENT_GAP_CLASSES = Object.freeze({
	Compact: "gap-2.5 sm:gap-3",
	Comfortable: "gap-3 sm:gap-4 lg:gap-5",
	Spacious: "gap-4 sm:gap-5 lg:gap-6",
	Editorial: "gap-4 sm:gap-5 lg:gap-6"
});
const CARD_ALIGNMENT = Object.freeze({
	Left: {
		textClass: "text-left",
		flexClass: "justify-start"
	},
	Center: {
		textClass: "text-center",
		flexClass: "justify-center"
	},
	Right: {
		textClass: "text-right",
		flexClass: "justify-end"
	}
});
const DEFAULT_SECTION_BOX = Object.freeze({
	sectionPaddingTop: 40,
	sectionPaddingBottom: 40,
	sectionMarginTop: 0,
	sectionMarginBottom: 40
});
const clampNumber = (value, min, max, fallback) => {
	const number = Number(value);
	return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};
const firstSupported = (values, supported, fallback) => values.find((value) => supported[value]) || fallback;
const resolveContainerWidth = (layout = {}) => firstSupported([layout.containerWidth, LEGACY_CONTAINER_WIDTHS[layout.maxWidth]], CONTAINER_WIDTH_CLASSES, "Wide");
const getContainerClass = (layout = {}) => `${BASE_CONTAINER_CLASS} ${CONTAINER_WIDTH_CLASSES[resolveContainerWidth(layout)]}`;
const resolveSectionWidth = (layout = {}) => firstSupported([layout.sectionWidth], SECTION_WIDTH_CLASSES, "Full Width");
const getSectionWidthClass = (layout = {}) => SECTION_WIDTH_CLASSES[resolveSectionWidth(layout)];
const resolveSectionSpacing = (layout = {}) => firstSupported([layout.sectionSpacing, layout.contentSpacing], SECTION_SPACING_CLASSES, "Comfortable");
const resolveGridSpacing = (...values) => firstSupported(values, CONTENT_GAP_CLASSES, "Comfortable");
const getContentGapClass = (...values) => CONTENT_GAP_CLASSES[resolveGridSpacing(...values)];
const getSectionLayout = (layout = {}, mobile = {}) => {
	const paddingTop = clampNumber(layout.sectionPaddingTop, 0, 160, DEFAULT_SECTION_BOX.sectionPaddingTop);
	const paddingBottom = clampNumber(layout.sectionPaddingBottom, 0, 160, DEFAULT_SECTION_BOX.sectionPaddingBottom);
	const marginTop = clampNumber(layout.sectionMarginTop, 0, 160, DEFAULT_SECTION_BOX.sectionMarginTop);
	const marginBottom = clampNumber(layout.sectionMarginBottom, 0, 160, DEFAULT_SECTION_BOX.sectionMarginBottom);
	const hasCustomPadding = paddingTop !== DEFAULT_SECTION_BOX.sectionPaddingTop || paddingBottom !== DEFAULT_SECTION_BOX.sectionPaddingBottom;
	const hasCustomMargins = marginTop !== DEFAULT_SECTION_BOX.sectionMarginTop || marginBottom !== DEFAULT_SECTION_BOX.sectionMarginBottom;
	const mobileMargin = {
		Compact: "24px",
		Comfortable: "32px",
		Spacious: "40px"
	}[mobile.sectionSpacing];
	return {
		className: `${getSectionWidthClass(layout)} ${hasCustomMargins ? "" : SECTION_SPACING_CLASSES[resolveSectionSpacing(layout)]} ${!hasCustomMargins && mobileMargin ? "sf-mobile-section-spacing" : ""}`.trim(),
		style: {
			...!hasCustomMargins && mobileMargin ? { "--sf-mobile-section-margin": mobileMargin } : {},
			...hasCustomPadding ? {
				paddingTop: `${paddingTop}px`,
				paddingBottom: `${paddingBottom}px`
			} : {},
			...hasCustomMargins ? {
				marginTop: `${marginTop}px`,
				marginBottom: `${marginBottom}px`
			} : {}
		}
	};
};
const resolveProductColumns = ({ desktop, tablet, mobile } = {}) => {
	const safeDesktop = Math.round(clampNumber(desktop, 2, 5, 3));
	return {
		desktop: safeDesktop,
		tablet: Math.round(clampNumber(tablet, 1, 4, safeDesktop >= 4 ? 3 : Math.max(2, safeDesktop))),
		mobile: Math.round(clampNumber(mobile, 1, 2, 2))
	};
};
const resolveFeaturedProductColumns = (section = {}, layout = {}) => resolveProductColumns({
	desktop: section.desktopSettings?.columns ?? layout.productColumnsDesktop,
	tablet: section.desktopSettings?.tabletColumns ?? layout.productColumnsTablet,
	mobile: section.mobileSettings?.columns ?? layout.productColumnsMobile
});
const resolveCardAlignment = (value) => CARD_ALIGNMENT[value] || CARD_ALIGNMENT.Left;
const headingStyle = Object.freeze({
	fontFamily: "var(--sf-heading-font)",
	fontWeight: "var(--sf-heading-weight)"
});
//#endregion
//#region packages/storefront-renderer/media.js
const cleanTextForMeta = (text = "") => {
	return String(text || "").replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, "\"").replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim();
};
const getImageUrlFromValue = (image) => {
	if (!image) return "";
	if (typeof image === "string") return image;
	return image.url || image.src || image.secureUrl || image.secure_url || image.imageUrl || "";
};
const getImageAltFromValue = (image) => {
	if (!image || typeof image === "string") return "";
	return cleanTextForMeta(image.alt || image.altText || image.title || "");
};
const getProductImageAlt = ({ product, image, shop } = {}) => {
	const safeProduct = product || {};
	const safeShop = shop || {};
	return getImageAltFromValue(image) || cleanTextForMeta(safeProduct.imageAltText) || cleanTextForMeta(safeProduct.title) || cleanTextForMeta(safeShop.shopName || safeShop.name) || "Product image";
};
//#endregion
//#region packages/storefront-renderer/reference/referenceCore.jsx
const productGridGapClasses = {
	Compact: "gap-2.5 min-[430px]:gap-3.5 sm:gap-4",
	Comfortable: "gap-3 min-[430px]:gap-4 lg:gap-5",
	Spacious: "gap-4 sm:gap-5 lg:gap-6",
	Editorial: "gap-4 sm:gap-5 lg:gap-6"
};
const tabletGridClasses = {
	1: "md:grid-cols-1",
	2: "md:grid-cols-2",
	3: "md:grid-cols-3",
	4: "md:grid-cols-4"
};
const desktopGridClasses = {
	2: "lg:grid-cols-2",
	3: "lg:grid-cols-3",
	4: "lg:grid-cols-3 xl:grid-cols-4",
	5: "lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
};
const plainGridClasses = {
	1: "grid-cols-1",
	2: "grid-cols-2",
	3: "grid-cols-2 md:grid-cols-3",
	4: "grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
	5: "grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
};
const cardRadiusClasses = {
	Soft: "rounded-xl",
	Rounded: "rounded-[1.35rem]",
	Square: "rounded-none"
};
const imageRadiusClasses = {
	Soft: "rounded-xl",
	Rounded: "rounded-[1.15rem]",
	Square: "rounded-none"
};
const cardShadowClasses = {
	None: "shadow-none hover:shadow-none",
	Soft: "shadow-sm hover:shadow-xl hover:shadow-slate-200/70",
	Elevated: "shadow-lg shadow-slate-200/70 hover:shadow-2xl hover:shadow-slate-300/70"
};
const imageAspectClasses = {
	Square: "aspect-square",
	Portrait: "aspect-[3/4]",
	Landscape: "aspect-[4/3]"
};
const titleSizeClasses = {
	Small: "text-xs sm:text-sm",
	Medium: "text-sm sm:text-base",
	Large: "text-base sm:text-lg"
};
const priceSizeClasses = {
	Small: "text-sm sm:text-base",
	Medium: "text-base sm:text-lg",
	Large: "text-lg sm:text-xl md:text-2xl"
};
const buttonShapeClasses = {
	Soft: "rounded-lg",
	Rounded: "rounded-xl",
	Pill: "rounded-full",
	Square: "rounded-none"
};
const categoryGridClasses = {
	1: "grid-cols-1",
	2: "grid-cols-2",
	3: "grid-cols-3",
	4: "grid-cols-4"
};
const categoryDesktopGridClasses = {
	1: "md:grid-cols-1",
	2: "md:grid-cols-2",
	3: "md:grid-cols-3",
	4: "md:grid-cols-4"
};
const normalizeCategoryIdentity = (value = "") => String(value || "").normalize("NFKC").replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const noop = () => {};
const formatPrice = (value) => {
	return `৳ ${Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
};
const getImageUrl = (product) => getImageUrlFromValue(product?.coverMediaId) || getImageUrlFromValue(product?.imageUrl) || getImageUrlFromValue(product?.images?.[0]) || "";
const getCardImageAlt = (product) => getProductImageAlt({
	product,
	image: product?.coverMediaId || product?.images?.[0]
});
const optimizeCloudinaryImage = (src = "", { width = 900, quality = "auto:eco", crop = "limit", noUpscale = false } = {}) => {
	if (!src || typeof src !== "string" || src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) return src;
	try {
		const url = new URL(src);
		const uploadSegment = "/image/upload/";
		if (url.hostname !== "res.cloudinary.com" || !url.pathname.includes(uploadSegment)) return src;
		const [prefix, suffix] = url.pathname.split(uploadSegment);
		url.pathname = `${prefix}${uploadSegment}${`f_auto,q_${quality},c_${crop},w_${width}${noUpscale ? ",fl_no_overflow" : ""}`}/${suffix}`;
		return url.toString();
	} catch {
		return src;
	}
};
const getResponsiveImageSrcSet = (src = "", widths = [], options = {}) => {
	if (!src || !Array.isArray(widths)) return "";
	return [...new Set(widths)].map(Number).filter((width) => Number.isFinite(width) && width > 0).sort((left, right) => left - right).map((width) => `${optimizeCloudinaryImage(src, {
		...options,
		width
	})} ${width}w`).join(", ");
};
const getPrice = (product) => product?.finalPrice ?? product?.sellingPrice ?? product?.pricing?.sellingPrice ?? product?.price ?? 0;
const normalizeImageList = (...lists) => [...new Set(lists.flat().filter(Boolean).map(String))];
const getSectionDisplayLabel = (section) => section?.settings?.visualLabel || section?.title || section?.type || "Section";
const getReferenceThemeStyle = (themeCandidate = {}) => {
	const theme = themeCandidate;
	const mobileNavOffset = theme.mobile?.showBottomNavigation === false ? "0px" : "calc(4rem + env(safe-area-inset-bottom))";
	const cssTheme = getThemeCssVars(themeCandidate);
	const groups = cssTheme.colorGroups || {};
	const brand = groups.brand || {};
	const header = groups.header || {};
	const hero = groups.hero || {};
	const productCard = groups.productCard || {};
	const allProducts = groups.allProducts || {};
	const sections = groups.sections || {};
	const footer = groups.footer || {};
	const checkout = groups.checkout || {};
	const storefrontForeground = brand.secondary || cssTheme.foreground;
	return {
		"--sf-brand-primary": brand.primary || cssTheme.accent,
		...getStorefrontPresentationVariant(theme) === "atelier-editorial" ? { "--sf-atelier-max-width": {
			Narrow: "1024px",
			Standard: "1200px",
			Wide: "1272px",
			"Full Width": "none"
		}[theme.layout?.containerWidth] || "1272px" } : {},
		"--sf-accent": brand.accent || cssTheme.accent,
		"--sf-accent-hover": brand.hover || cssTheme.accentHover,
		"--sf-accent-soft": brand.soft || cssTheme.accentSoft,
		"--sf-accent-bg": brand.soft || cssTheme.accentBg,
		"--sf-primary-button-bg": cssTheme.primaryButtonBg,
		"--sf-primary-button-text": cssTheme.primaryButtonText,
		"--sf-navbar-background": header.background || cssTheme.navbarBackground,
		"--sf-navbar-text": header.text || cssTheme.navbarText,
		"--sf-navbar-muted-text": header.mutedText || cssTheme.navbarText,
		"--sf-navbar-hover": header.hover || cssTheme.navbarHover,
		"--sf-header-icon": header.icon || cssTheme.navbarText,
		"--sf-header-border": header.border || cssTheme.cardBorder,
		"--sf-header-cart-badge-bg": header.cartBadgeBackground || brand.primary || cssTheme.accent,
		"--sf-header-cart-badge-text": header.cartBadgeText || "#ffffff",
		"--sf-hero-background": hero.background || "#020617",
		"--sf-hero-title": hero.title || "#ffffff",
		"--sf-hero-subtitle": hero.subtitle || "#e2e8f0",
		"--sf-hero-overlay": hero.overlay || "#020617",
		"--sf-hero-primary-button-bg": hero.primaryButtonBackground || "#ffffff",
		"--sf-hero-primary-button-text": hero.primaryButtonText || "#0f172a",
		"--sf-hero-secondary-button-bg": hero.secondaryButtonBackground || "#ffffff",
		"--sf-hero-secondary-button-text": hero.secondaryButtonText || "#0f172a",
		"--sf-card-background": productCard.background || cssTheme.cardBackground,
		"--sf-card-border": productCard.border || cssTheme.cardBorder,
		"--sf-card-hover-border": cssTheme.cardHoverBorder,
		"--sf-product-card-background": productCard.background || cssTheme.cardBackground,
		"--sf-product-card-border": productCard.border || cssTheme.cardBorder,
		"--sf-product-card-shadow": productCard.shadow || cssTheme.cardBorder,
		"--sf-variant-chip-bg": productCard.variantChipBackground || "#ffffff",
		"--sf-variant-chip-text": productCard.variantChipText || "#334155",
		"--sf-variant-chip-selected-bg": productCard.variantChipSelectedBackground || cssTheme.accent,
		"--sf-variant-chip-selected-text": productCard.variantChipSelectedText || "#ffffff",
		"--sf-product-card-title": productCard.title || storefrontForeground,
		"--sf-product-card-category": productCard.category || cssTheme.footerText,
		"--sf-product-card-price": productCard.price || cssTheme.priceColor,
		"--sf-product-card-compare-at-price": productCard.compareAtPrice || "#94a3b8",
		"--sf-product-card-sale-badge-bg": productCard.saleBadgeBackground || cssTheme.saleBadgeBg,
		"--sf-product-card-sale-badge-text": productCard.saleBadgeText || cssTheme.saleBadgeText,
		"--sf-product-card-rating-star": productCard.ratingStar || cssTheme.ratingColor,
		"--sf-product-card-rating-text": productCard.ratingText || "#94a3b8",
		"--sf-product-card-wishlist-icon": productCard.wishlistIcon || "#64748b",
		"--sf-product-card-wishlist-active": productCard.wishlistActive || "#e11d48",
		"--sf-product-card-add-to-cart-bg": productCard.addToCartBackground || brand.primary || cssTheme.accent,
		"--sf-product-card-add-to-cart-text": productCard.addToCartText || "#ffffff",
		"--sf-product-card-buy-now-bg": productCard.buyNowBackground || "#0f172a",
		"--sf-product-card-buy-now-text": productCard.buyNowText || "#ffffff",
		"--sf-product-card-out-of-stock-bg": productCard.outOfStockBackground || "#fff1f2",
		"--sf-product-card-out-of-stock-text": productCard.outOfStockText || "#e11d48",
		"--sf-product-card-stock-bg": productCard.stockBackground || "#ecfdf5",
		"--sf-product-card-stock-text": productCard.stockText || "#047857",
		"--sf-sale-badge-bg": productCard.saleBadgeBackground || cssTheme.saleBadgeBg,
		"--sf-sale-badge-text": productCard.saleBadgeText || cssTheme.saleBadgeText,
		"--sf-price-color": productCard.price || cssTheme.priceColor,
		"--sf-rating-color": productCard.ratingStar || cssTheme.ratingColor,
		"--sf-all-products-background": allProducts.background || cssTheme.background,
		"--sf-all-products-title": allProducts.title || storefrontForeground,
		"--sf-all-products-subtitle": allProducts.subtitle || cssTheme.footerText,
		"--sf-all-products-filter-bg": allProducts.filterBackground || "#ffffff",
		"--sf-all-products-filter-text": allProducts.filterText || "#475569",
		"--sf-all-products-dropdown-bg": allProducts.dropdownBackground || "#ffffff",
		"--sf-all-products-pagination-bg": allProducts.paginationBackground || "#ffffff",
		"--sf-all-products-pagination-text": allProducts.paginationText || "#475569",
		"--sf-all-products-pagination-active-bg": allProducts.paginationActiveBackground || brand.primary || cssTheme.accent,
		"--sf-all-products-pagination-active-text": allProducts.paginationActiveText || "#ffffff",
		"--sf-section-background": sections.background || "#ffffff",
		"--sf-section-title": sections.title || storefrontForeground,
		"--sf-section-subtitle": sections.subtitle || cssTheme.footerText,
		"--sf-section-banner-overlay": sections.bannerOverlay || "#020617",
		"--sf-section-banner-text": sections.bannerText || "#ffffff",
		"--sf-section-faq-bg": sections.faqBackground || "#f8fafc",
		"--sf-section-faq-text": sections.faqText || "#475569",
		"--sf-section-testimonial-bg": sections.testimonialBackground || "#f8fafc",
		"--sf-section-testimonial-text": sections.testimonialText || "#475569",
		"--sf-section-trust-icon": sections.trustIcon || brand.primary || cssTheme.accent,
		"--sf-section-trust-text": sections.trustText || "#475569",
		"--sf-footer-background": footer.background || cssTheme.footerBackground,
		"--sf-footer-heading": footer.heading || cssTheme.footerLink,
		"--sf-footer-text": footer.text || cssTheme.footerText,
		"--sf-footer-link": footer.link || cssTheme.footerLink,
		"--sf-footer-link-hover": footer.linkHover || brand.primary || cssTheme.accent,
		"--sf-footer-border": footer.border || cssTheme.cardBorder,
		"--sf-footer-powered-by": footer.poweredBy || "#64748b",
		"--sf-checkout-background": checkout.background || "#f8fafc",
		"--sf-checkout-card-background": checkout.cardBackground || "#ffffff",
		"--sf-checkout-text": checkout.text || "#0f172a",
		"--sf-checkout-button-background": checkout.buttonBackground || "#0f172a",
		"--sf-checkout-button-text": checkout.buttonText || "#ffffff",
		"--sf-checkout-accent": checkout.accent || brand.primary || cssTheme.accent,
		"--sf-checkout-input-background": checkout.inputBackground || "#ffffff",
		"--sf-checkout-input-border": checkout.inputBorder || "#cbd5e1",
		"--sf-checkout-input-focus": checkout.inputFocus || brand.primary || cssTheme.accent,
		"--sf-checkout-error": checkout.error || "#dc2626",
		"--sf-checkout-success": checkout.success || "#047857",
		"--sf-body-font": cssTheme.fontFamily === "DM Sans" ? "\"DM Sans\", Inter, Arial, sans-serif" : cssTheme.fontFamily,
		"--background": cssTheme.background,
		"--foreground": storefrontForeground,
		"--sf-ink": storefrontForeground,
		"--sf-surface": productCard.background || checkout.cardBackground || cssTheme.cardBackground,
		"--sf-surface-subtle": allProducts.background || sections.background || checkout.background || cssTheme.accentBg,
		"--sf-surface-raised": sections.faqBackground || allProducts.filterBackground || "#f1f5f9",
		"--sf-border": productCard.border || header.border || cssTheme.cardBorder,
		"--sf-border-strong": checkout.inputBorder || "#cbd5e1",
		"--sf-text-muted": header.mutedText || allProducts.subtitle || footer.text || "#64748b",
		"--sf-success": checkout.success || "#047857",
		"--sf-success-bg": productCard.stockBackground || "#ecfdf5",
		"--sf-warning": "#d97706",
		"--sf-warning-bg": "#fffbeb",
		"--sf-danger": checkout.error || "#dc2626",
		"--sf-danger-bg": productCard.outOfStockBackground || "#fff1f2",
		"--sf-accent-strong": cssTheme.accentStrong,
		"--sf-accent-muted": cssTheme.accentMuted,
		"--sf-accent-light": cssTheme.accentLight,
		"--sf-accent-ring": brand.ring || cssTheme.accentRing,
		"--sf-background": cssTheme.background,
		"--sf-foreground": storefrontForeground,
		"--sf-header-background": header.background || cssTheme.headerBackground,
		"--sf-primary-button-hover-bg": cssTheme.primaryButtonHoverBg,
		"--sf-secondary-button-bg": cssTheme.secondaryButtonBg,
		"--sf-secondary-button-text": cssTheme.secondaryButtonText,
		"--sf-secondary-button-hover-bg": cssTheme.secondaryButtonHoverBg,
		"--sf-navbar-bg": header.background || cssTheme.navbarBackground,
		"--sf-card-bg": productCard.background || cssTheme.cardBackground,
		"--sf-footer-bg": footer.background || cssTheme.footerBackground,
		"--sf-mobile-nav-offset": mobileNavOffset,
		"--sf-heading-font": cssTheme.headingFont === "DM Sans" ? "\"DM Sans\", Inter, Arial, sans-serif" : cssTheme.headingFont,
		"--sf-heading-weight": cssTheme.headingWeight,
		"--sf-base-size": `${cssTheme.baseSize}px`,
		"--sf-checkout-radius": cssTheme.checkoutButtonRadius,
		fontFamily: "var(--sf-body-font)",
		fontSize: "var(--sf-base-size)",
		color: storefrontForeground,
		backgroundColor: cssTheme.background
	};
};
const DefaultLink = ({ href, children, className, onClick, prefetch, ...props }) => {
	return /* @__PURE__ */ jsx("a", {
		href,
		className,
		onClick,
		...props,
		children
	});
};
const LinkSlot = ({ LinkComponent = DefaultLink, href, children, className, onClick, ...props }) => /* @__PURE__ */ jsx(LinkComponent, {
	href,
	className,
	onClick,
	...props,
	children
});
getContainerClass();
const isPreviewMobile = (device) => device === "mobile" || device === "smallMobile";
const isPreviewNarrow = (device) => isPreviewMobile(device) || device === "tablet";
const EditorSelectionFrame = ({ editor, id, label, locked = false, children }) => {
	if (!editor || !id) return children;
	const selected = editor.selectedId === id;
	const handleSelect = () => editor.onSelect?.(id);
	const handleKeyDown = (event) => {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		handleSelect();
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "group/builder-section relative min-w-0",
		"data-builder-section": id,
		role: "button",
		tabIndex: 0,
		"aria-label": `Edit ${label || id}`,
		onClick: handleSelect,
		onKeyDown: handleKeyDown,
		children: [
			/* @__PURE__ */ jsx("div", {
				className: `pointer-events-none absolute inset-0 z-[70] rounded-[1.5rem] transition ${selected ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-white" : "opacity-0 ring-2 ring-indigo-300 ring-offset-2 ring-offset-white group-hover/builder-section:opacity-100"}`,
				children: /* @__PURE__ */ jsxs("span", {
					className: `absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-black shadow-sm ${selected ? "bg-indigo-600 text-white" : "bg-white text-indigo-700"}`,
					children: [label, locked ? " · Locked layout" : ""]
				})
			}),
			selected && editor.renderToolbar?.(id, {
				label,
				locked
			}),
			children
		]
	});
};
//#endregion
//#region packages/storefront-renderer/presentation/Runtime.jsx
const NativeImage = ({ fill, priority, unoptimized, quality, sizes, style, ...props }) => {
	return /* @__PURE__ */ jsx("img", {
		...props,
		sizes,
		loading: priority ? "eager" : "lazy",
		decoding: "async",
		style: {
			...fill ? {
				position: "absolute",
				inset: 0,
				width: "100%",
				height: "100%"
			} : {},
			...style
		}
	});
};
const Context = createContext({
	Link: DefaultLink,
	Image: NativeImage
});
const PresentationRuntime = Context.Provider;
function Link(props) {
	return /* @__PURE__ */ jsx(useContext(Context).Link, { ...props });
}
function Image(props) {
	return /* @__PURE__ */ jsx(useContext(Context).Image, { ...props });
}
//#endregion
//#region packages/storefront-renderer/atelier/AtelierProductCard.jsx
function AtelierProductCard({ product, index = 0, config, model, LinkComponent }) {
	const { price, originalPrice, activeDiscount, hasDiscount, stockText, isOutOfStock, rating, reviewCount, showRating, showReviews, sku, wishlisted, imageUrl, imageFailed, onImageError, handleAdd, handleBuyNow, handleWishlist, canBuyNow, cardColors, aspectClass, imageRadiusClass, cardAlignment, buttonInlineStyle, buttonShapeClass, titleSizeClass, priceSizeClass } = model;
	return /* @__PURE__ */ jsxs("article", {
		className: `atelier-product-card ${cardAlignment.textClass} ${model.cardRadiusClass} ${model.shadowClass}`,
		style: {
			"--atelier-card-field": [
				"var(--sf-atelier-peach)",
				"var(--sf-atelier-mint)",
				"var(--sf-atelier-lilac)",
				"var(--sf-atelier-sage)"
			][index % 4],
			backgroundColor: cardColors.background,
			color: cardColors.title
		},
		children: [
			/* @__PURE__ */ jsxs(LinkSlot, {
				LinkComponent,
				href: `/products/${product.slug || product._id}`,
				className: `atelier-product-media ${aspectClass} ${imageRadiusClass}`,
				"aria-label": `View ${product.title}`,
				children: [imageUrl && !imageFailed ? /* @__PURE__ */ jsx("img", {
					src: optimizeCloudinaryImage(imageUrl, { width: 640 }),
					srcSet: getResponsiveImageSrcSet(imageUrl, [
						180,
						280,
						360,
						640
					]),
					sizes: "(max-width: 767px) 46vw, (max-width: 1023px) 30vw, 24vw",
					alt: getCardImageAlt(product),
					width: "640",
					height: "690",
					loading: "lazy",
					decoding: "async",
					onError: onImageError,
					style: { objectFit: config?.imageFit === "Contain" ? "contain" : "cover" },
					className: config?.hoverZoom === false ? "" : "atelier-zoom"
				}) : /* @__PURE__ */ jsx(ShoppingBag, {
					size: 36,
					"aria-hidden": "true"
				}), hasDiscount && config?.showDiscountBadge !== false && /* @__PURE__ */ jsxs("span", {
					className: "atelier-sale-badge",
					style: {
						background: cardColors.saleBadgeBackground,
						color: cardColors.saleBadgeText
					},
					children: [activeDiscount, "% off"]
				})]
			}),
			/* @__PURE__ */ jsx("h3", {
				className: titleSizeClass,
				style: { fontWeight: config?.titleWeight || 700 },
				children: /* @__PURE__ */ jsx(LinkSlot, {
					LinkComponent,
					href: `/products/${product.slug || product._id}`,
					children: product.title
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: `atelier-price-row ${cardAlignment.flexClass}`,
				children: [/* @__PURE__ */ jsx("p", {
					className: priceSizeClass,
					style: { color: cardColors.price },
					children: formatPrice(price)
				}), hasDiscount && originalPrice > price && /* @__PURE__ */ jsx("del", {
					style: { color: cardColors.compareAtPrice },
					children: formatPrice(originalPrice)
				})]
			}),
			(showRating || showReviews) && /* @__PURE__ */ jsxs("p", {
				className: "atelier-card-meta",
				style: { color: cardColors.ratingText },
				children: [showRating && /* @__PURE__ */ jsxs("span", {
					style: { color: cardColors.ratingStar },
					children: [/* @__PURE__ */ jsx(Star, {
						size: 13,
						fill: "currentColor"
					}), rating.toFixed(1)]
				}), showReviews && /* @__PURE__ */ jsxs("span", { children: [
					"(",
					reviewCount,
					" reviews)"
				] })]
			}),
			config?.showCategory !== false && product.category && /* @__PURE__ */ jsx("p", {
				className: "atelier-card-meta",
				style: { color: cardColors.category },
				children: product.category
			}),
			config?.showStock !== false && /* @__PURE__ */ jsx("p", {
				className: "atelier-card-meta",
				style: { color: isOutOfStock ? cardColors.outOfStockText : cardColors.stockText },
				children: stockText
			}),
			config?.showSku && sku && /* @__PURE__ */ jsxs("p", {
				className: "atelier-card-meta",
				children: ["SKU: ", sku]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: `atelier-card-actions ${cardAlignment.flexClass}`,
				children: [config?.showWishlist !== false && /* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: handleWishlist,
					"aria-pressed": wishlisted,
					"aria-label": `${wishlisted ? "Remove" : "Save"} ${product.title} ${wishlisted ? "from" : "to"} wishlist`,
					style: { color: wishlisted ? cardColors.wishlistActive : cardColors.wishlistIcon },
					children: /* @__PURE__ */ jsx(Heart, {
						size: 18,
						fill: wishlisted ? "currentColor" : "none"
					})
				}), config?.showQuickBuy !== false && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("button", {
					type: "button",
					className: buttonShapeClass,
					style: buttonInlineStyle,
					onClick: handleAdd,
					disabled: isOutOfStock,
					"aria-label": `${isOutOfStock ? "Unavailable" : "Add"} ${product.title} to cart`,
					children: isOutOfStock ? "Unavailable" : "+ Bag"
				}), canBuyNow && /* @__PURE__ */ jsxs("button", {
					type: "button",
					className: buttonShapeClass,
					style: {
						backgroundColor: cardColors.buyNowBackground,
						color: cardColors.buyNowText
					},
					onClick: handleBuyNow,
					disabled: isOutOfStock,
					"aria-label": `${isOutOfStock ? "Unavailable" : "Buy"} ${product.title} now`,
					children: ["Buy now", /* @__PURE__ */ jsx(ArrowUpRight, { size: 14 })]
				})] })]
			})
		]
	});
}
//#endregion
//#region packages/storefront-renderer/reference/StorefrontProductCard.jsx
const ProductCard = memo(function ProductCard({ adaptiveParts = false, product, index, storewideDiscount, productCard, onProductAdd, onProductBuyNow, onWishlistToggle, isWishlisted, LinkComponent, previewDevice, presentationVariant }) {
	const price = getPrice(product);
	const originalPrice = product.compareAtPrice || product.pricing?.compareAtPrice || product.sellingPrice || product.pricing?.sellingPrice || price;
	const activeDiscount = originalPrice > price ? Math.round((originalPrice - price) / originalPrice * 100) : 0;
	const hasDiscount = activeDiscount > 0;
	const stock = product.stock ?? product.totalStock ?? 0;
	const rating = Number(product.averageRating || 0);
	const reviewCount = Math.max(Number(product.numReviews || 0), 0);
	const showReviews = productCard?.showReviews !== false && reviewCount > 0;
	const showRating = productCard?.showRating !== false && rating > 0;
	const wishlisted = typeof isWishlisted === "function" ? isWishlisted(product) : Boolean(isWishlisted);
	const imageUrl = getImageUrl(product);
	const [imageFailed, setImageFailed] = useState(false);
	const cardRadiusClass = cardRadiusClasses[productCard?.borderRadius || "Rounded"] || cardRadiusClasses.Rounded;
	const imageRadiusClass = imageRadiusClasses[productCard?.imageRadius || "Rounded"] || imageRadiusClasses.Rounded;
	const shadowClass = cardShadowClasses[productCard?.shadow || "Soft"] || cardShadowClasses.Soft;
	const aspectClass = imageAspectClasses[productCard?.aspectRatio || "Square"] || imageAspectClasses.Square;
	const forceMobilePreview = isPreviewMobile(previewDevice);
	const titleSize = productCard?.titleSize || "Medium";
	const priceSize = productCard?.priceSize || "Medium";
	const titleSizeClass = forceMobilePreview ? {
		Small: "text-xs",
		Medium: "text-sm",
		Large: "text-base"
	}[titleSize] || "text-sm" : titleSizeClasses[titleSize] || titleSizeClasses.Medium;
	const priceSizeClass = forceMobilePreview ? {
		Small: "text-sm",
		Medium: "text-base",
		Large: "text-lg"
	}[priceSize] || "text-base" : priceSizeClasses[priceSize] || priceSizeClasses.Medium;
	const buttonShapeClass = buttonShapeClasses[productCard?.buttonShape || "Pill"] || buttonShapeClasses.Pill;
	const cardAlignment = resolveCardAlignment(productCard?.cardAlignment);
	const productCardColors = productCard?.colors || {};
	const cardColors = {
		background: productCardColors.background || "var(--sf-product-card-background)",
		border: productCardColors.border || "var(--sf-product-card-border)",
		title: productCardColors.title || "var(--sf-product-card-title)",
		category: productCardColors.category || "var(--sf-product-card-category)",
		price: productCardColors.price || "var(--sf-product-card-price)",
		compareAtPrice: productCardColors.compareAtPrice || "var(--sf-product-card-compare-at-price)",
		saleBadgeBackground: productCardColors.saleBadgeBackground || "var(--sf-product-card-sale-badge-bg)",
		saleBadgeText: productCardColors.saleBadgeText || "var(--sf-product-card-sale-badge-text)",
		ratingStar: productCardColors.ratingStar || "var(--sf-product-card-rating-star)",
		ratingText: productCardColors.ratingText || "var(--sf-product-card-rating-text)",
		wishlistIcon: productCardColors.wishlistIcon || "var(--sf-product-card-wishlist-icon)",
		wishlistActive: productCardColors.wishlistActive || "var(--sf-product-card-wishlist-active)",
		addToCartBackground: productCardColors.addToCartBackground || "var(--sf-product-card-add-to-cart-bg)",
		addToCartText: productCardColors.addToCartText || "var(--sf-product-card-add-to-cart-text)",
		buyNowBackground: productCardColors.buyNowBackground || "var(--sf-product-card-buy-now-bg)",
		buyNowText: productCardColors.buyNowText || "var(--sf-product-card-buy-now-text)",
		outOfStockBackground: productCardColors.outOfStockBackground || "var(--sf-product-card-out-of-stock-bg)",
		outOfStockText: productCardColors.outOfStockText || "var(--sf-product-card-out-of-stock-text)",
		stockBackground: productCardColors.stockBackground || "var(--sf-product-card-stock-bg)",
		stockText: productCardColors.stockText || "var(--sf-product-card-stock-text)"
	};
	const imageFitClass = productCard?.imageFit === "Contain" ? "object-contain" : "object-cover";
	const imagePaddingClass = productCard?.imageFit === "Contain" ? "p-3" : "";
	const buttonStyle = productCard?.buttonStyle || "Solid";
	const buttonInlineStyle = buttonStyle === "Solid" ? {
		backgroundColor: cardColors.addToCartBackground,
		color: cardColors.addToCartText,
		borderColor: cardColors.addToCartBackground
	} : {
		color: cardColors.addToCartBackground,
		borderColor: buttonStyle === "Ghost" ? "transparent" : cardColors.addToCartBackground,
		backgroundColor: buttonStyle === "Ghost" ? "transparent" : "#ffffff"
	};
	const stockText = stock > 0 ? `${stock} in stock` : "Out of stock";
	const sku = product.sku || product.variants?.[0]?.sku || (product._id ? `ID ${String(product._id).slice(-6)}` : "");
	const isOutOfStock = stock <= 0;
	const imageFrameSpacing = imageRadiusClass === "rounded-none" ? "" : forceMobilePreview ? "m-2.5 mb-0" : "m-2.5 mb-0 sm:m-3 sm:mb-0";
	const cardContentClass = forceMobilePreview ? "p-3 pt-2.5" : "p-3 pt-2.5 sm:p-4 sm:pt-3";
	const wishlistClass = forceMobilePreview ? "right-2 top-2 h-10 w-10" : "right-2 top-2 h-10 w-10 sm:right-3 sm:top-3 sm:h-11 sm:w-11";
	const quickBuyButtonClass = forceMobilePreview ? "h-11 px-1.5 text-[11px]" : "h-11 px-1.5 text-[11px] min-[430px]:px-2 min-[430px]:text-xs sm:px-3 sm:text-sm";
	useEffect(() => {
		setImageFailed(false);
	}, [imageUrl]);
	const handleAdd = (event) => {
		event.preventDefault();
		event.stopPropagation();
		onProductAdd(product);
	};
	const handleBuyNow = (event) => {
		event.preventDefault();
		event.stopPropagation();
		onProductBuyNow?.(product);
	};
	const handleWishlist = (event) => {
		event.preventDefault();
		event.stopPropagation();
		onWishlistToggle?.(product);
	};
	if (presentationVariant === "atelier-editorial") return /* @__PURE__ */ jsx(AtelierProductCard, {
		product,
		index,
		config: productCard,
		LinkComponent,
		model: {
			price,
			originalPrice,
			activeDiscount,
			hasDiscount,
			stockText,
			isOutOfStock,
			rating,
			reviewCount,
			showRating,
			showReviews,
			sku,
			wishlisted,
			imageUrl,
			imageFailed,
			onImageError: () => setImageFailed(true),
			handleAdd,
			handleBuyNow,
			handleWishlist,
			canBuyNow: Boolean(onProductBuyNow),
			cardColors,
			aspectClass,
			imageRadiusClass,
			cardRadiusClass,
			shadowClass,
			cardAlignment,
			buttonInlineStyle,
			buttonShapeClass,
			titleSizeClass,
			priceSizeClass
		}
	});
	return /* @__PURE__ */ jsxs("article", {
		className: `group relative flex min-h-full min-w-0 flex-col overflow-hidden border border-[var(--sf-card-border-color)] transition duration-300 ease-out hover:-translate-y-1 hover:border-[var(--sf-card-hover-border)] ${cardRadiusClass} ${shadowClass}`,
		style: {
			animationDelay: `${index % 8 * 35}ms`,
			backgroundColor: cardColors.background,
			"--sf-card-border-color": cardColors.border
		},
		children: [
			/* @__PURE__ */ jsx(LinkSlot, {
				LinkComponent,
				href: `/products/${product.slug || product._id}`,
				prefetch: false,
				className: "absolute inset-0 z-10",
				"aria-label": `View ${product.title}`
			}),
			/* @__PURE__ */ jsxs("div", {
				"data-ab-surface": adaptiveParts ? "" : void 0,
				className: `relative overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 ring-1 ring-slate-900/5 ${aspectClass} ${imageFrameSpacing} ${imageRadiusClass}`,
				children: [
					imageUrl && !imageFailed ? /* @__PURE__ */ jsx("img", {
						src: optimizeCloudinaryImage(imageUrl, { width: 560 }),
						srcSet: getResponsiveImageSrcSet(imageUrl, [
							180,
							280,
							360,
							560
						]),
						sizes: "(max-width: 639px) calc((100vw - 44px) / 2), (max-width: 1023px) 30vw, (max-width: 1535px) 22vw, 280px",
						alt: getCardImageAlt(product),
						width: "560",
						height: "560",
						onError: () => setImageFailed(true),
						className: `h-full w-full ${imageFitClass} ${imagePaddingClass} transition-transform duration-500 ${productCard?.hoverZoom === false ? "" : "group-hover:scale-105"}`,
						loading: "lazy",
						decoding: "async"
					}) : /* @__PURE__ */ jsx("div", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						className: "flex h-full w-full items-center justify-center bg-slate-100 text-slate-300",
						children: /* @__PURE__ */ jsx(ShoppingBag, { size: 34 })
					}),
					productCard?.showWishlist !== false && /* @__PURE__ */ jsx("button", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						type: "button",
						onClick: handleWishlist,
						"aria-pressed": wishlisted,
						"aria-label": `${wishlisted ? "Remove" : "Save"} ${product.title} ${wishlisted ? "from" : "to"} wishlist`,
						className: `absolute z-20 flex items-center justify-center rounded-full bg-white/95 shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur transition hover:scale-105 ${wishlistClass}`,
						style: { color: wishlisted ? cardColors.wishlistActive : cardColors.wishlistIcon },
						children: /* @__PURE__ */ jsx(Heart, {
							size: 16,
							fill: wishlisted ? "currentColor" : "none",
							className: "sm:h-[18px] sm:w-[18px]"
						})
					}),
					hasDiscount && productCard?.showDiscountBadge !== false && /* @__PURE__ */ jsxs("span", {
						className: "absolute left-2 top-2 z-20 rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase text-white shadow-lg shadow-slate-950/20 ring-1 ring-white/40 sm:left-3 sm:top-3 sm:px-3 sm:text-[11px]",
						style: {
							backgroundColor: cardColors.saleBadgeBackground,
							color: cardColors.saleBadgeText
						},
						children: [activeDiscount, "% off"]
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: `flex flex-1 flex-col ${cardContentClass} ${cardAlignment.textClass}`,
				children: [
					/* @__PURE__ */ jsx("h3", {
						className: `line-clamp-2 min-h-[2.25em] leading-snug ${titleSizeClass}`,
						style: {
							fontWeight: productCard?.titleWeight || 800,
							color: cardColors.title
						},
						children: product.title
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-2 min-w-0",
						children: [/* @__PURE__ */ jsx("p", {
							className: `${priceSizeClass} font-black`,
							style: { color: cardColors.price },
							children: formatPrice(price)
						}), hasDiscount && originalPrice > price && /* @__PURE__ */ jsx("p", {
							className: "text-[11px] font-semibold line-through sm:text-xs",
							style: { color: cardColors.compareAtPrice },
							children: formatPrice(originalPrice)
						})]
					}),
					(showRating || showReviews) && /* @__PURE__ */ jsxs("div", {
						className: `mt-2 flex min-w-0 items-center gap-1 text-[10px] font-bold leading-none sm:text-xs ${cardAlignment.flexClass}`,
						children: [showRating && /* @__PURE__ */ jsx("span", {
							className: "flex shrink-0 items-center gap-0.5",
							style: { color: cardColors.ratingStar },
							children: [
								1,
								2,
								3,
								4,
								5
							].map((star) => /* @__PURE__ */ jsx(Star, {
								size: 11,
								fill: star <= Math.round(rating) ? "currentColor" : "none",
								className: star <= Math.round(rating) ? "" : "text-slate-300"
							}, star))
						}), /* @__PURE__ */ jsxs("span", {
							className: "min-w-0 truncate",
							style: { color: cardColors.ratingText },
							children: [
								showRating && rating.toFixed(1),
								showRating && showReviews ? " " : "",
								showReviews && `(${reviewCount} reviews)`
							]
						})]
					}),
					productCard?.showCategory !== false && product.category && /* @__PURE__ */ jsx("p", {
						className: "mt-1 line-clamp-1 text-[11px] font-semibold capitalize sm:text-xs",
						style: { color: cardColors.category },
						children: product.category
					}),
					(productCard?.showStock !== false || productCard?.showSku) && /* @__PURE__ */ jsxs("div", {
						className: `mt-2.5 flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-500 sm:text-[11px] ${cardAlignment.flexClass}`,
						children: [productCard?.showStock !== false && /* @__PURE__ */ jsx("p", {
							className: "max-w-full truncate rounded-full px-2.5 py-1.5 leading-none",
							style: {
								backgroundColor: stock > 0 ? cardColors.stockBackground : cardColors.outOfStockBackground,
								color: stock > 0 ? cardColors.stockText : cardColors.outOfStockText
							},
							children: stockText
						}), productCard?.showSku && sku && /* @__PURE__ */ jsxs("p", {
							"data-ab-surface": adaptiveParts ? "" : void 0,
							className: "hidden max-w-full truncate rounded-full bg-slate-50 px-2 py-1 text-slate-400 sm:block",
							children: ["SKU: ", sku]
						})]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "mt-auto flex flex-col gap-3 pt-4",
						children: productCard?.showQuickBuy !== false && /* @__PURE__ */ jsxs("div", {
							className: "relative z-20 grid w-full grid-cols-2 gap-2",
							children: [/* @__PURE__ */ jsxs("button", {
								"data-ab-surface": adaptiveParts ? "" : void 0,
								type: "button",
								disabled: isOutOfStock,
								onClick: handleAdd,
								"aria-label": `${stock > 0 ? "Add" : "Unavailable"} ${product.title} to cart`,
								className: `inline-flex w-full min-w-0 items-center justify-center gap-1 whitespace-nowrap border font-black transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)] disabled:bg-slate-300 disabled:text-white ${quickBuyButtonClass} ${buttonShapeClass}`,
								style: isOutOfStock ? {
									backgroundColor: cardColors.outOfStockBackground,
									borderColor: cardColors.outOfStockBackground,
									color: cardColors.outOfStockText
								} : buttonInlineStyle,
								children: [!forceMobilePreview && /* @__PURE__ */ jsx(ShoppingBag, {
									size: 14,
									className: "hidden shrink-0 sm:block"
								}), /* @__PURE__ */ jsx("span", {
									className: "truncate",
									children: isOutOfStock ? "Unavailable" : "Add"
								})]
							}), onProductBuyNow && /* @__PURE__ */ jsxs("button", {
								"data-ab-surface": adaptiveParts ? "" : void 0,
								type: "button",
								disabled: isOutOfStock,
								onClick: handleBuyNow,
								"aria-label": `${stock > 0 ? "Buy" : "Unavailable"} ${product.title} now`,
								className: `inline-flex w-full min-w-0 items-center justify-center gap-1 whitespace-nowrap border font-black shadow-md shadow-slate-950/15 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)] disabled:border-slate-300 disabled:bg-slate-300 ${quickBuyButtonClass} ${buttonShapeClass}`,
								style: isOutOfStock ? {
									backgroundColor: cardColors.outOfStockBackground,
									borderColor: cardColors.outOfStockBackground,
									color: cardColors.outOfStockText
								} : {
									backgroundColor: cardColors.buyNowBackground,
									borderColor: cardColors.buyNowBackground,
									color: cardColors.buyNowText
								},
								children: [!forceMobilePreview && /* @__PURE__ */ jsx(Zap, {
									size: 14,
									className: "hidden shrink-0 sm:block"
								}), forceMobilePreview ? /* @__PURE__ */ jsx("span", {
									className: "truncate",
									children: "Buy"
								}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("span", {
									className: "hidden truncate min-[480px]:inline",
									children: "Buy Now"
								}), /* @__PURE__ */ jsx("span", {
									className: "truncate min-[480px]:hidden",
									children: "Buy"
								})] })]
							})]
						})
					})
				]
			})
		]
	});
});
//#endregion
//#region packages/storefront-renderer/atelier/AtelierSections.jsx
function AtelierCategories({ section, items, responsiveClass, sectionLayout, colors, LinkComponent, gridClass }) {
	return /* @__PURE__ */ jsxs("section", {
		className: `${responsiveClass} ${sectionLayout.className} atelier-categories`,
		style: {
			...sectionLayout.style,
			color: colors.title || "var(--sf-section-title)"
		},
		children: [
			section.settings?.visualLabel && /* @__PURE__ */ jsx("p", {
				className: "atelier-eyebrow",
				children: section.settings.visualLabel
			}),
			/* @__PURE__ */ jsx("h2", {
				className: "atelier-section-title",
				children: section.title || "Shop by category"
			}),
			/* @__PURE__ */ jsx("div", {
				className: `atelier-category-grid grid ${gridClass}`,
				children: items.map((item, index) => /* @__PURE__ */ jsxs(LinkSlot, {
					LinkComponent,
					href: item.href,
					className: "atelier-category",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "atelier-category-media",
							style: { backgroundColor: [
								"var(--sf-atelier-sage)",
								"var(--sf-atelier-lilac)",
								"var(--sf-atelier-peach)",
								"var(--sf-atelier-mint)"
							][index % 4] },
							children: item.image ? /* @__PURE__ */ jsx("img", {
								src: optimizeCloudinaryImage(item.image, {
									width: 640,
									noUpscale: true
								}),
								srcSet: getResponsiveImageSrcSet(item.image, [
									180,
									320,
									480,
									640
								], { noUpscale: true }),
								sizes: "(max-width: 767px) 46vw, 24vw",
								alt: `${item.name} category`,
								width: "640",
								height: "540",
								loading: "lazy",
								decoding: "async"
							}) : /* @__PURE__ */ jsx("span", {
								"aria-hidden": "true",
								children: item.name.slice(0, 1)
							})
						}),
						/* @__PURE__ */ jsxs("span", {
							className: "atelier-category-label",
							children: [/* @__PURE__ */ jsx("span", { children: item.name }), /* @__PURE__ */ jsx(ArrowUpRight, {
								size: 17,
								"aria-hidden": "true"
							})]
						}),
						item.productCount > 0 && /* @__PURE__ */ jsxs("span", {
							className: "atelier-card-meta",
							children: [
								item.productCount,
								" product",
								item.productCount === 1 ? "" : "s"
							]
						})
					]
				}, item.id))
			})
		]
	});
}
function AtelierStory({ section, image, focalPoint, responsiveClass, sectionLayout, LinkComponent }) {
	const settings = section.settings || {};
	if (!settings.text && !image) return null;
	return /* @__PURE__ */ jsxs("section", {
		className: `${responsiveClass} ${sectionLayout.className} atelier-story`,
		style: sectionLayout.style,
		children: [
			/* @__PURE__ */ jsxs("div", { children: [settings.visualLabel && /* @__PURE__ */ jsx("p", {
				className: "atelier-eyebrow",
				children: settings.visualLabel
			}), /* @__PURE__ */ jsx("h2", { children: section.title || "Our story" })] }),
			/* @__PURE__ */ jsxs("div", { children: [settings.text && /* @__PURE__ */ jsx("p", {
				className: "atelier-story-copy",
				children: settings.text
			}), settings.buttonText && settings.buttonLink && /* @__PURE__ */ jsxs(LinkSlot, {
				LinkComponent,
				href: settings.buttonLink,
				className: "atelier-button atelier-button-lime",
				children: [settings.buttonText, /* @__PURE__ */ jsx(ArrowUpRight, { size: 18 })]
			})] }),
			image && /* @__PURE__ */ jsx("img", {
				className: "atelier-story-image",
				src: optimizeCloudinaryImage(image, { width: 1200 }),
				alt: "",
				width: "1200",
				height: "600",
				loading: "lazy",
				decoding: "async",
				style: { objectPosition: `${focalPoint.x}% ${focalPoint.y}%` }
			})
		]
	});
}
//#endregion
//#region packages/storefront-renderer/reference/StorefrontSectionVariants.jsx
const CATEGORY_IMAGE_WIDTHS = Object.freeze({
	circle: [
		96,
		144,
		240,
		360
	],
	card: [
		48,
		72,
		96,
		120
	],
	editorialPrimary: [
		360,
		520,
		720,
		900,
		1200
	],
	editorialSecondary: [
		180,
		260,
		360,
		520,
		720
	]
});
const getCategoryImageSizes = ({ editorial = false, primary = false, mobileColumns = 2, desktopColumns = 4 } = {}) => {
	if (editorial && primary) return "(max-width: 1023px) calc(100vw - 32px), min(50vw, 736px)";
	if (editorial) return "(max-width: 639px) calc((100vw - 44px) / 2), (max-width: 1023px) calc((100vw - 56px) / 2), min(25vw, 360px)";
	return `(max-width: 767px) calc((100vw - 32px) / ${mobileColumns}), min(${Math.ceil(100 / desktopColumns)}vw, ${Math.ceil(1472 / desktopColumns)}px)`;
};
const SectionHeading = ({ title, subtitle, colors, centered = false }) => /* @__PURE__ */ jsxs("div", {
	className: centered ? "text-center" : "",
	children: [/* @__PURE__ */ jsx("h2", {
		className: "text-xl font-black sm:text-3xl",
		style: {
			...headingStyle,
			color: colors.title || "var(--sf-section-title)"
		},
		children: title
	}), subtitle && /* @__PURE__ */ jsx("p", {
		className: `mt-2 text-sm font-semibold ${centered ? "mx-auto max-w-2xl" : ""}`,
		style: { color: colors.subtitle || "var(--sf-section-subtitle)" },
		children: subtitle
	})]
});
const ReviewStars = ({ rating }) => {
	const normalizedRating = Math.min(Math.max(Number(rating) || 0, 0), 5);
	if (normalizedRating <= 0) return null;
	return /* @__PURE__ */ jsx("div", {
		className: "flex text-amber-400",
		"aria-label": `${normalizedRating} out of 5 stars`,
		children: [
			1,
			2,
			3,
			4,
			5
		].map((star) => /* @__PURE__ */ jsx(Star, {
			size: 13,
			fill: star <= Math.round(normalizedRating) ? "currentColor" : "none",
			className: star <= Math.round(normalizedRating) ? "" : "text-slate-300"
		}, star))
	});
};
const getCategoryModel = (category, index, products = []) => {
	const name = typeof category === "string" ? category : category?.name || category?.title || category?.label || "";
	const slug = typeof category === "object" && category?.slug ? category.slug : name;
	const representativeProduct = products.find((product) => String(product?.category || "").toLowerCase() === String(name).toLowerCase());
	return {
		id: typeof category === "object" ? category?._id || category?.id || slug || index : `${name}-${index}`,
		name,
		href: `/categories/${encodeURIComponent(slug)}`,
		image: (typeof category === "object" ? category?.coverImage?.url || category?.image || getImageUrl(category) : "") || getImageUrl(representativeProduct),
		productCount: typeof category === "object" && Number.isFinite(Number(category?.productCount)) ? Math.max(Number(category.productCount), 0) : null
	};
};
const getUniqueCategoryModels = (categories = [], products = [], limit = 24) => {
	const modelsByIdentity = /* @__PURE__ */ new Map();
	categories.forEach((category, index) => {
		const model = getCategoryModel(category, index, products);
		const identity = normalizeCategoryIdentity(model.name);
		if (!identity) return;
		const current = modelsByIdentity.get(identity);
		if (!current) {
			modelsByIdentity.set(identity, model);
			return;
		}
		modelsByIdentity.set(identity, {
			...current,
			image: current.image || model.image,
			productCount: Math.max(Number(current.productCount) || 0, Number(model.productCount) || 0) || null
		});
	});
	return [...modelsByIdentity.values()].slice(0, limit);
};
const CategoryCount = ({ count, onImage = false }) => {
	if (!Number.isFinite(count) || count <= 0) return null;
	return /* @__PURE__ */ jsxs("span", {
		className: `text-[11px] font-bold ${onImage ? "text-white/80" : "text-slate-500"}`,
		children: [
			count,
			" product",
			count === 1 ? "" : "s"
		]
	});
};
function CategoryVariantSection({ adaptiveParts = false, section, categories, catalogProducts, previewDevice, responsiveClass, sectionLayout, contentGapClass, colors, LinkComponent, presentationVariant }) {
	const settings = section.settings || {};
	const variant = settings.variant || "cards";
	const items = getUniqueCategoryModels(categories, catalogProducts, Math.min(Math.max(Number(settings.maxCategories) || 10, 1), 24));
	const mobileColumns = Math.min(Math.max(Number(section.mobileSettings?.columns) || 2, 1), 4);
	const desktopColumns = Math.min(Math.max(Number(settings.columns) || 4, 1), 4);
	const categoryGridClass = previewDevice ? previewDevice === "desktop" ? categoryGridClasses[desktopColumns] : categoryGridClasses[mobileColumns] : `${categoryGridClasses[mobileColumns]} ${categoryDesktopGridClasses[desktopColumns]}`;
	if (!items.length) return null;
	if (presentationVariant === "atelier-editorial") return /* @__PURE__ */ jsx(AtelierCategories, {
		section,
		items,
		responsiveClass,
		sectionLayout,
		colors,
		LinkComponent,
		gridClass: categoryGridClass
	});
	const shellClass = `${responsiveClass} ${sectionLayout.className} rounded-[1.5rem] border border-slate-200 p-4 shadow-sm sm:p-6 md:rounded-[1.75rem]`;
	const shellStyle = {
		...sectionLayout.style,
		backgroundColor: colors.background || "var(--sf-section-background)"
	};
	if (variant === "circles") return /* @__PURE__ */ jsxs("section", {
		"data-section-variant": variant,
		className: `${responsiveClass} ${sectionLayout.className}`,
		style: sectionLayout.style,
		children: [/* @__PURE__ */ jsx(SectionHeading, {
			title: section.title || "Shop by category",
			colors,
			centered: true
		}), /* @__PURE__ */ jsx("div", {
			"data-ab-layout": adaptiveParts ? "catalog" : void 0,
			className: `mt-6 grid ${contentGapClass} ${categoryGridClass}`,
			children: items.map((item) => /* @__PURE__ */ jsxs(LinkSlot, {
				LinkComponent,
				href: item.href,
				prefetch: false,
				className: "group flex min-w-0 flex-col items-center text-center",
				children: [
					/* @__PURE__ */ jsx("span", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						className: "flex aspect-square w-full max-w-36 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-[var(--sf-accent-bg)] text-2xl font-black text-[var(--sf-accent)] shadow-sm transition group-hover:-translate-y-1 group-hover:border-[var(--sf-accent)]",
						children: item.image ? /* @__PURE__ */ jsx("img", {
							src: optimizeCloudinaryImage(item.image, {
								width: 360,
								crop: "fill",
								noUpscale: true
							}),
							srcSet: getResponsiveImageSrcSet(item.image, CATEGORY_IMAGE_WIDTHS.circle, {
								crop: "fill",
								noUpscale: true
							}),
							sizes: "144px",
							alt: `${item.name} category`,
							width: "360",
							height: "360",
							loading: "lazy",
							decoding: "async",
							className: "h-full w-full object-cover"
						}) : item.name.slice(0, 1).toUpperCase()
					}),
					/* @__PURE__ */ jsx("span", {
						className: "mt-3 max-w-full truncate text-sm font-black text-slate-700 group-hover:text-[var(--sf-accent)]",
						children: item.name
					}),
					/* @__PURE__ */ jsx(CategoryCount, { count: item.productCount })
				]
			}, item.id))
		})]
	});
	if (variant === "imageGrid" || variant === "editorial") {
		const editorial = variant === "editorial" && items.length >= 3;
		return /* @__PURE__ */ jsxs("section", {
			"data-section-variant": variant,
			className: `${responsiveClass} ${sectionLayout.className}`,
			style: sectionLayout.style,
			children: [/* @__PURE__ */ jsx(SectionHeading, {
				title: section.title || "Shop by category",
				subtitle: editorial ? "Explore the collections that define this store" : "",
				colors
			}), /* @__PURE__ */ jsx("div", {
				"data-ab-layout": adaptiveParts ? "catalog" : void 0,
				className: `mt-5 grid ${contentGapClass} ${editorial ? previewDevice ? previewDevice === "desktop" ? "grid-cols-4" : "grid-cols-2" : "grid-cols-2 lg:grid-cols-4" : categoryGridClass}`,
				children: items.map((item, index) => {
					const primaryEditorialImage = editorial && index === 0;
					const imageWidths = primaryEditorialImage ? CATEGORY_IMAGE_WIDTHS.editorialPrimary : CATEGORY_IMAGE_WIDTHS.editorialSecondary;
					const imageSizes = getCategoryImageSizes({
						editorial,
						primary: primaryEditorialImage,
						mobileColumns,
						desktopColumns
					});
					return /* @__PURE__ */ jsxs(LinkSlot, {
						LinkComponent,
						href: item.href,
						prefetch: false,
						className: `group relative min-h-40 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 ${primaryEditorialImage ? `col-span-2 row-span-2 ${previewDevice && isPreviewMobile(previewDevice) ? "min-h-64" : "min-h-64 sm:min-h-80"}` : ""}`,
						children: [item.image ? /* @__PURE__ */ jsx("img", {
							src: optimizeCloudinaryImage(item.image, {
								width: primaryEditorialImage ? 900 : 520,
								crop: "fill",
								noUpscale: true
							}),
							srcSet: getResponsiveImageSrcSet(item.image, imageWidths, {
								crop: "fill",
								noUpscale: true
							}),
							sizes: imageSizes,
							alt: `${item.name} category`,
							width: "900",
							height: "680",
							loading: "lazy",
							decoding: "async",
							className: "absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
						}) : /* @__PURE__ */ jsx("span", {
							"data-ab-surface": adaptiveParts ? "" : void 0,
							className: "absolute inset-0 flex items-center justify-center bg-[var(--sf-accent-bg)] text-4xl font-black text-[var(--sf-accent)]",
							children: item.name.slice(0, 1).toUpperCase()
						}), /* @__PURE__ */ jsxs("span", {
							"data-ab-surface": adaptiveParts ? "" : void 0,
							className: "absolute inset-x-0 bottom-0 flex flex-col bg-gradient-to-t from-slate-950/92 via-slate-950/62 to-transparent px-4 pb-4 pt-16 text-sm font-black text-white",
							children: [/* @__PURE__ */ jsx("span", { children: item.name }), /* @__PURE__ */ jsx(CategoryCount, {
								count: item.productCount,
								onImage: true
							})]
						})]
					}, item.id);
				})
			})]
		});
	}
	return /* @__PURE__ */ jsxs("section", {
		"data-section-variant": "cards",
		className: shellClass,
		style: shellStyle,
		children: [/* @__PURE__ */ jsx(SectionHeading, {
			title: section.title || "Shop by category",
			colors
		}), /* @__PURE__ */ jsx("div", {
			"data-ab-layout": adaptiveParts ? "catalog" : void 0,
			className: `mt-4 grid ${contentGapClass} ${categoryGridClass}`,
			children: items.map((item) => /* @__PURE__ */ jsxs(LinkSlot, {
				LinkComponent,
				href: item.href,
				prefetch: false,
				className: "flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-600 transition hover:border-[var(--sf-accent)] hover:bg-[var(--sf-accent-bg)]",
				children: [item.image && /* @__PURE__ */ jsx("img", {
					src: optimizeCloudinaryImage(item.image, {
						width: 120,
						crop: "fill",
						noUpscale: true
					}),
					srcSet: getResponsiveImageSrcSet(item.image, CATEGORY_IMAGE_WIDTHS.card, {
						crop: "fill",
						noUpscale: true
					}),
					sizes: "48px",
					alt: `${item.name} category`,
					width: "48",
					height: "48",
					loading: "lazy",
					decoding: "async",
					className: "h-12 w-12 shrink-0 rounded-xl object-cover"
				}), /* @__PURE__ */ jsxs("span", {
					className: "min-w-0",
					children: [/* @__PURE__ */ jsx("span", {
						className: "block truncate",
						children: item.name
					}), /* @__PURE__ */ jsx(CategoryCount, { count: item.productCount })]
				})]
			}, item.id))
		})]
	});
}
function ReviewsVariantSection({ section, reviews, responsiveClass, sectionLayout, contentGapClass, colors }) {
	const variant = section.settings?.variant || "cards";
	const reviewText = section.settings?.text?.trim();
	const selectedReviews = section.settings?.mode === "text" ? [] : reviews;
	const items = selectedReviews.length ? selectedReviews : reviewText ? [{
		_id: "manual",
		comment: reviewText,
		name: ""
	}] : [];
	if (!items.length) return null;
	const title = section.title || "Customer Reviews";
	if (variant === "quote") return /* @__PURE__ */ jsxs("section", {
		"data-section-variant": variant,
		className: `${responsiveClass} ${sectionLayout.className} py-4 text-center sm:py-8`,
		style: sectionLayout.style,
		children: [/* @__PURE__ */ jsx(SectionHeading, {
			title,
			colors,
			centered: true
		}), /* @__PURE__ */ jsx("div", {
			className: `mx-auto mt-6 grid max-w-4xl ${contentGapClass}`,
			children: items.map((review) => /* @__PURE__ */ jsxs("blockquote", {
				className: "text-xl font-semibold leading-relaxed sm:text-3xl",
				style: {
					...headingStyle,
					color: colors.testimonialText || "var(--sf-section-testimonial-text)"
				},
				children: [
					"“",
					review.comment,
					"”",
					review.name && /* @__PURE__ */ jsxs("footer", {
						className: "mt-4 font-sans text-xs font-black uppercase tracking-widest text-slate-500",
						children: [review.name, review.product?.title ? ` · ${review.product.title}` : ""]
					})
				]
			}, review._id))
		})]
	});
	if (variant === "minimal") return /* @__PURE__ */ jsxs("section", {
		"data-section-variant": variant,
		className: `${responsiveClass} ${sectionLayout.className}`,
		style: sectionLayout.style,
		children: [/* @__PURE__ */ jsx(SectionHeading, {
			title,
			colors
		}), /* @__PURE__ */ jsx("div", {
			className: `mt-5 divide-y divide-slate-200 border-y border-slate-200 ${contentGapClass}`,
			children: items.map((review) => /* @__PURE__ */ jsxs("div", {
				className: "grid gap-3 py-5 sm:grid-cols-[140px_minmax(0,1fr)]",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(ReviewStars, { rating: review.rating }), review.name && /* @__PURE__ */ jsx("p", {
					className: "mt-2 text-sm font-black text-slate-900",
					children: review.name
				})] }), /* @__PURE__ */ jsx("p", {
					className: "text-sm font-semibold leading-7",
					style: { color: colors.testimonialText || "var(--sf-section-testimonial-text)" },
					children: review.comment
				})]
			}, review._id))
		})]
	});
	return /* @__PURE__ */ jsxs("section", {
		"data-section-variant": "cards",
		className: `${responsiveClass} ${sectionLayout.className} rounded-[1.5rem] border border-slate-200 p-4 shadow-sm sm:p-6 md:rounded-[1.75rem] md:p-7`,
		style: {
			...sectionLayout.style,
			backgroundColor: colors.background || "var(--sf-section-background)"
		},
		children: [/* @__PURE__ */ jsx(SectionHeading, {
			title,
			colors
		}), /* @__PURE__ */ jsx("div", {
			className: `mt-5 grid ${contentGapClass} sm:grid-cols-2 lg:grid-cols-3`,
			children: items.map((review) => /* @__PURE__ */ jsxs("div", {
				className: "rounded-2xl p-4",
				style: { backgroundColor: colors.testimonialBackground || "var(--sf-section-testimonial-bg)" },
				children: [
					/* @__PURE__ */ jsx(ReviewStars, { rating: review.rating }),
					/* @__PURE__ */ jsxs("p", {
						className: "mt-3 text-sm font-semibold leading-6",
						style: { color: colors.testimonialText || "var(--sf-section-testimonial-text)" },
						children: [
							"“",
							review.comment,
							"”"
						]
					}),
					(review.name || review.product?.title) && /* @__PURE__ */ jsxs("div", {
						className: "mt-4 border-t border-slate-200 pt-3",
						children: [/* @__PURE__ */ jsx("p", {
							className: "text-sm font-black text-slate-950",
							children: review.name
						}), review.product?.title && /* @__PURE__ */ jsx("p", {
							className: "text-xs font-semibold text-slate-500",
							children: review.product.title
						})]
					})
				]
			}, review._id))
		})]
	});
}
const StoryCopy = ({ section, colors }) => /* @__PURE__ */ jsxs("div", {
	className: "min-w-0",
	children: [
		/* @__PURE__ */ jsxs("div", {
			className: "flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[var(--sf-accent)]",
			children: [/* @__PURE__ */ jsx(BadgeCheck, { size: 15 }), " Our store"]
		}),
		/* @__PURE__ */ jsx("h2", {
			className: "mt-2 text-2xl font-black sm:text-3xl",
			style: {
				...headingStyle,
				color: colors.title || "var(--sf-section-title)"
			},
			children: section.title || "Our story"
		}),
		section.settings?.text && /* @__PURE__ */ jsx("p", {
			className: "mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-7 sm:text-base",
			style: { color: colors.subtitle || "var(--sf-section-subtitle)" },
			children: section.settings.text
		})
	]
});
function BrandStoryVariantSection({ section, responsiveClass, sectionLayout, contentGapClass, colors, presentationVariant, LinkComponent }) {
	const variant = section.settings?.variant || "standard";
	const image = section.settings?.imageUrl || section.settings?.image || section.settings?.desktopImage || "";
	const focalPoint = section.settings?.focalPoint || {
		x: 50,
		y: 50
	};
	if (presentationVariant === "atelier-editorial") return /* @__PURE__ */ jsx(AtelierStory, {
		section,
		image,
		focalPoint,
		responsiveClass,
		sectionLayout,
		LinkComponent
	});
	const baseStyle = {
		...sectionLayout.style,
		backgroundColor: colors.background || "var(--sf-section-background)"
	};
	if (variant === "standard" || !image) return /* @__PURE__ */ jsx("section", {
		"data-section-variant": variant,
		className: `${responsiveClass} ${sectionLayout.className} overflow-hidden rounded-[1.5rem] border border-slate-200 shadow-sm md:rounded-[1.75rem]`,
		style: baseStyle,
		children: /* @__PURE__ */ jsxs("div", {
			className: `grid ${contentGapClass} p-6 sm:p-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center`,
			children: [/* @__PURE__ */ jsx("div", {
				className: "flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--sf-accent-bg)] text-[var(--sf-accent)]",
				children: /* @__PURE__ */ jsx(Sparkles, { size: 28 })
			}), /* @__PURE__ */ jsx(StoryCopy, {
				section,
				colors
			})]
		})
	});
	if (variant === "fullWidth") return /* @__PURE__ */ jsxs("section", {
		"data-section-variant": variant,
		className: `${responsiveClass} ${sectionLayout.className} relative min-h-[360px] overflow-hidden rounded-[1.5rem] sm:min-h-[460px] md:rounded-[1.75rem]`,
		style: sectionLayout.style,
		children: [
			/* @__PURE__ */ jsx("img", {
				src: optimizeCloudinaryImage(image, {
					width: 1600,
					crop: "fill"
				}),
				alt: "",
				width: "1600",
				height: "900",
				loading: "lazy",
				decoding: "async",
				className: "absolute inset-0 h-full w-full object-cover",
				style: { objectPosition: `${focalPoint.x}% ${focalPoint.y}%` }
			}),
			/* @__PURE__ */ jsx("div", {
				className: "absolute inset-0 bg-slate-950/55",
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ jsx("div", {
				className: "relative z-10 flex min-h-[360px] items-end p-6 text-white sm:min-h-[460px] sm:p-10 [&_*]:!text-white",
				children: /* @__PURE__ */ jsx(StoryCopy, {
					section,
					colors
				})
			})
		]
	});
	const imageRight = variant === "imageRight";
	const editorial = variant === "editorial";
	return /* @__PURE__ */ jsx("section", {
		"data-section-variant": variant,
		className: `${responsiveClass} ${sectionLayout.className} overflow-hidden rounded-[1.5rem] border border-slate-200 shadow-sm md:rounded-[1.75rem]`,
		style: baseStyle,
		children: /* @__PURE__ */ jsxs("div", {
			className: `grid lg:grid-cols-2 ${editorial ? "lg:grid-cols-[1.25fr_0.75fr]" : ""}`,
			children: [/* @__PURE__ */ jsx("div", {
				className: `relative min-h-64 bg-slate-100 ${imageRight ? "lg:order-2" : ""}`,
				children: /* @__PURE__ */ jsx("img", {
					src: optimizeCloudinaryImage(image, {
						width: 1e3,
						crop: "fill"
					}),
					alt: "",
					width: "1000",
					height: "800",
					loading: "lazy",
					decoding: "async",
					className: "absolute inset-0 h-full w-full object-cover",
					style: { objectPosition: `${focalPoint.x}% ${focalPoint.y}%` }
				})
			}), /* @__PURE__ */ jsx("div", {
				className: `flex items-center p-6 sm:p-8 lg:p-12 ${imageRight ? "lg:order-1" : ""} ${editorial ? "lg:-ml-10 lg:my-10 lg:relative lg:z-10 lg:rounded-l-[1.75rem] lg:bg-white lg:shadow-xl" : ""}`,
				children: /* @__PURE__ */ jsx(StoryCopy, {
					section,
					colors
				})
			})]
		})
	});
}
function CollectionVariantSection({ section, products, previewDevice, responsiveClass, sectionLayout, contentGapClass, colors, productCard, storewideDiscount, onProductAdd, onProductBuyNow, onWishlistToggle, isProductWishlisted, LinkComponent, presentationVariant }) {
	const variant = section.settings?.variant || "grid";
	if (!products.length) return null;
	const mosaic = variant === "mosaic" && products.length >= 3;
	const gridClass = previewDevice ? mosaic ? previewDevice === "desktop" ? "grid-cols-4" : "grid-cols-2" : variant === "spacious" ? isPreviewMobile(previewDevice) ? "grid-cols-1" : "grid-cols-2" : previewDevice === "desktop" ? "grid-cols-3" : "grid-cols-2" : mosaic ? "grid-cols-2 lg:grid-cols-4" : variant === "spacious" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 lg:grid-cols-3";
	return /* @__PURE__ */ jsxs("section", {
		"data-section-variant": mosaic ? "mosaic" : variant === "mosaic" ? "grid" : variant,
		className: `${responsiveClass} ${sectionLayout.className}`,
		style: sectionLayout.style,
		children: [/* @__PURE__ */ jsx(SectionHeading, {
			title: section.title || "Collection",
			subtitle: variant === "spacious" ? "A considered edit from this store" : "",
			colors
		}), /* @__PURE__ */ jsx("div", {
			className: `mt-5 grid ${contentGapClass} ${gridClass}`,
			children: products.slice(0, variant === "spacious" ? 6 : 8).map((product, index) => /* @__PURE__ */ jsx("div", {
				className: mosaic && index === 0 ? "col-span-2 lg:row-span-2" : "",
				children: /* @__PURE__ */ jsx(ProductCard, {
					product,
					index,
					storewideDiscount,
					productCard,
					presentationVariant,
					onProductAdd,
					onProductBuyNow,
					onWishlistToggle,
					isWishlisted: isProductWishlisted,
					LinkComponent,
					previewDevice
				})
			}, product._id))
		})]
	});
}
function TextualVariantSection({ section, responsiveClass, sectionLayout, colors, presentationVariant }) {
	const variant = section.settings?.variant || "boxed";
	const isNewsletter = section.type === "Newsletter";
	const isPromo = section.type === "PromoBlock";
	const title = section.title || (isNewsletter ? "Store updates" : isPromo ? "Store promotion" : "Store update");
	const text = section.settings?.text;
	if (presentationVariant === "atelier-editorial" && isPromo) {
		if (!text && !section.title) return null;
		return /* @__PURE__ */ jsxs("section", {
			className: `${responsiveClass} ${sectionLayout.className} atelier-promo`,
			style: sectionLayout.style,
			children: [/* @__PURE__ */ jsx("h2", { children: title }), text && /* @__PURE__ */ jsx("p", { children: text })]
		});
	}
	if (variant === "minimal") return /* @__PURE__ */ jsx("section", {
		"data-section-variant": variant,
		className: `${responsiveClass} ${sectionLayout.className} border-y border-slate-200 py-6 text-center`,
		style: sectionLayout.style,
		children: /* @__PURE__ */ jsx(SectionHeading, {
			title,
			subtitle: text,
			colors,
			centered: true
		})
	});
	if (variant === "fullWidth" || variant === "strip") return /* @__PURE__ */ jsxs("section", {
		"data-section-variant": variant,
		className: `${responsiveClass} ${sectionLayout.className} flex flex-col items-center justify-between gap-4 rounded-xl bg-[var(--sf-accent-bg)] px-5 py-6 text-center sm:flex-row sm:text-left`,
		style: sectionLayout.style,
		children: [/* @__PURE__ */ jsx("div", {
			className: "min-w-0",
			children: /* @__PURE__ */ jsx(SectionHeading, {
				title,
				subtitle: text,
				colors
			})
		}), isNewsletter && /* @__PURE__ */ jsx(Mail, {
			className: "shrink-0 text-[var(--sf-accent)]",
			size: 28,
			"aria-hidden": "true"
		})]
	});
	if (variant === "split") return /* @__PURE__ */ jsxs("section", {
		"data-section-variant": variant,
		className: `${responsiveClass} ${sectionLayout.className} grid gap-5 rounded-[1.5rem] border border-slate-200 p-6 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center`,
		style: {
			...sectionLayout.style,
			backgroundColor: colors.background || "var(--sf-section-background)"
		},
		children: [/* @__PURE__ */ jsx("span", {
			className: "flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--sf-accent-bg)] text-[var(--sf-accent)]",
			children: /* @__PURE__ */ jsx(Sparkles, { size: 24 })
		}), /* @__PURE__ */ jsx(SectionHeading, {
			title,
			subtitle: text,
			colors
		})]
	});
	return /* @__PURE__ */ jsx("section", {
		"data-section-variant": "boxed",
		className: `${responsiveClass} ${sectionLayout.className} rounded-[1.5rem] border border-slate-200 p-5 text-center shadow-sm sm:p-10 md:rounded-[1.75rem]`,
		style: {
			...sectionLayout.style,
			backgroundColor: colors.background || "var(--sf-section-background)"
		},
		children: /* @__PURE__ */ jsx(SectionHeading, {
			title,
			subtitle: text,
			colors,
			centered: true
		})
	});
}
function BannerVariantSection({ section, activeImage, setActiveImage, responsiveClass, sectionLayout, colors, LinkComponent }) {
	const settings = section.settings || {};
	const mobileSettings = section.mobileSettings || {};
	const variant = settings.variant || "overlay";
	const desktopImages = normalizeImageList(settings.desktopImages || [], settings.desktopImage, settings.image);
	const mobileImages = normalizeImageList(settings.mobileImages || [], settings.mobileImage, mobileSettings.image);
	const images = desktopImages.length ? desktopImages : mobileImages;
	const mobileDisplayImages = mobileImages.length ? mobileImages : images;
	const imageUrl = images[images.length ? activeImage % images.length : 0] || "";
	const mobileImageUrl = mobileDisplayImages.length ? mobileDisplayImages[activeImage % mobileDisplayImages.length] : imageUrl;
	const media = /* @__PURE__ */ jsxs("div", {
		className: "relative min-h-[220px] overflow-hidden bg-slate-100 sm:min-h-[280px] lg:min-h-[320px]",
		children: [
			mobileImageUrl && mobileImageUrl !== imageUrl && /* @__PURE__ */ jsx("img", {
				src: optimizeCloudinaryImage(mobileImageUrl, {
					width: 760,
					crop: "fill"
				}),
				alt: "",
				width: "760",
				height: "520",
				loading: "lazy",
				decoding: "async",
				className: "absolute inset-0 h-full w-full object-cover md:hidden",
				style: { objectPosition: `${mobileSettings.focalPoint?.x ?? settings.focalPoint?.x ?? 50}% ${mobileSettings.focalPoint?.y ?? settings.focalPoint?.y ?? 50}%` }
			}),
			imageUrl && /* @__PURE__ */ jsx("img", {
				src: optimizeCloudinaryImage(imageUrl, {
					width: 1600,
					crop: "fill"
				}),
				alt: "",
				width: "1600",
				height: "700",
				loading: "lazy",
				decoding: "async",
				className: `${mobileImageUrl && mobileImageUrl !== imageUrl ? "hidden md:block" : ""} absolute inset-0 h-full w-full object-cover`,
				style: { objectPosition: `${settings.focalPoint?.x ?? 50}% ${settings.focalPoint?.y ?? 50}%` }
			}),
			images.length > 1 && /* @__PURE__ */ jsxs("div", {
				className: "absolute bottom-4 right-4 z-20 flex items-center gap-2",
				onClick: (event) => event.preventDefault(),
				children: [/* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: () => setActiveImage((previous) => (previous - 1 + images.length) % images.length),
					className: "flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-950 shadow-sm",
					"aria-label": "Previous banner image",
					children: /* @__PURE__ */ jsx(ChevronLeft, { size: 16 })
				}), /* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: () => setActiveImage((previous) => (previous + 1) % images.length),
					className: "flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-950 shadow-sm",
					"aria-label": "Next banner image",
					children: /* @__PURE__ */ jsx(ChevronRight, { size: 16 })
				})]
			})
		]
	});
	const buttonClass = variant === "minimal" ? "bg-slate-950 text-white" : "bg-white text-slate-950";
	const copy = /* @__PURE__ */ jsxs("div", { children: [
		/* @__PURE__ */ jsx("h2", {
			className: "text-2xl font-black leading-tight sm:text-4xl",
			style: headingStyle,
			children: settings.title || section.title || "Promotional banner"
		}),
		settings.subtitle && /* @__PURE__ */ jsx("p", {
			className: "mt-3 max-w-xl text-sm leading-6 opacity-80 sm:text-base",
			children: settings.subtitle
		}),
		settings.buttonText && /* @__PURE__ */ jsx("span", {
			className: `mt-5 inline-flex w-fit rounded-full px-5 py-3 text-sm font-black ${buttonClass}`,
			children: settings.buttonText
		})
	] });
	if (variant === "split") return /* @__PURE__ */ jsx("section", {
		"data-section-variant": variant,
		className: `${responsiveClass} ${sectionLayout.className}`,
		style: sectionLayout.style,
		children: /* @__PURE__ */ jsxs(LinkSlot, {
			LinkComponent,
			href: settings.buttonLink || "#products",
			className: "grid overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950 text-white shadow-sm lg:grid-cols-2",
			children: [/* @__PURE__ */ jsx("div", {
				className: "flex items-center p-6 sm:p-8 lg:p-10",
				children: copy
			}), media]
		})
	});
	if (variant === "minimal") return /* @__PURE__ */ jsx("section", {
		"data-section-variant": variant,
		className: `${responsiveClass} ${sectionLayout.className}`,
		style: sectionLayout.style,
		children: /* @__PURE__ */ jsxs(LinkSlot, {
			LinkComponent,
			href: settings.buttonLink || "#products",
			className: "grid items-center gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[minmax(0,1fr)_220px]",
			children: [/* @__PURE__ */ jsx("div", {
				className: "text-slate-950",
				children: copy
			}), /* @__PURE__ */ jsx("div", {
				className: "overflow-hidden rounded-xl [&>div]:!min-h-32",
				children: media
			})]
		})
	});
	return /* @__PURE__ */ jsx("section", {
		"data-section-variant": "overlay",
		className: `${responsiveClass} ${sectionLayout.className}`,
		style: sectionLayout.style,
		children: /* @__PURE__ */ jsxs(LinkSlot, {
			LinkComponent,
			href: settings.buttonLink || "#products",
			className: "group relative block min-h-[220px] overflow-hidden rounded-[1.5rem] shadow-sm sm:min-h-[280px] sm:rounded-[1.75rem] lg:min-h-[320px]",
			style: { backgroundColor: colors.bannerOverlay || "var(--sf-section-banner-overlay)" },
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "absolute inset-0",
					children: media
				}),
				/* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-slate-950/78 via-slate-950/36 to-transparent" }),
				/* @__PURE__ */ jsx("div", {
					className: "relative z-10 flex min-h-[220px] max-w-2xl flex-col justify-end p-5 text-white sm:min-h-[280px] sm:p-8 lg:min-h-[320px] lg:p-10",
					style: { color: colors.bannerText || "var(--sf-section-banner-text)" },
					children: copy
				})
			]
		})
	});
}
//#endregion
//#region packages/storefront-renderer/reference/StorefrontSectionRenderer.jsx
const HomepageSection = memo(function HomepageSection({ adaptiveParts = false, section, sectionIndex, categories, sectionProducts, sectionReviews, catalogProducts, storewideDiscount, productCard, presentationVariant, sectionColors = {}, layout, mobile, onProductAdd, onProductBuyNow, onWishlistToggle, isProductWishlisted, LinkComponent, previewDevice, editor }) {
	const mobileSettings = section.mobileSettings || {};
	const desktopSettings = section.desktopSettings || {};
	const [activeImage, setActiveImage] = useState(0);
	const mobileVisible = mobileSettings.isVisible !== false;
	const desktopVisible = desktopSettings.isVisible !== false;
	const responsiveVisibilityClass = previewDevice ? (isPreviewMobile(previewDevice) ? mobileVisible : desktopVisible) ? "" : "hidden" : !mobileVisible && !desktopVisible ? "hidden" : !mobileVisible ? "hidden md:block" : !desktopVisible ? "block md:hidden" : "";
	const stableSectionId = section.id || section._id;
	const editorId = stableSectionId ? `section:${stableSectionId}` : `section-${Number.isFinite(sectionIndex) ? sectionIndex : section.type}`;
	const editorLabel = getSectionDisplayLabel(section);
	const sectionLayout = getSectionLayout(layout, mobile);
	const contentGapClass = getContentGapClass(section.settings?.spacing, layout?.contentSpacing, layout?.productGap);
	const frame = (content) => /* @__PURE__ */ jsx(EditorSelectionFrame, {
		editor,
		id: editorId,
		label: editorLabel,
		children: content
	});
	if (section.type === "FeaturedProducts") {
		const columns = resolveFeaturedProductColumns(section, layout);
		const products = sectionProducts?.[stableSectionId] || catalogProducts.slice(0, Math.max(4, columns.desktop));
		const liveGridClass = `${columns.mobile === 1 ? "grid-cols-1" : "grid-cols-2"} ${tabletGridClasses[columns.tablet]} ${desktopGridClasses[columns.desktop]}`;
		const featuredGridClass = previewDevice ? isPreviewMobile(previewDevice) ? plainGridClasses[columns.mobile] : previewDevice === "tablet" ? plainGridClasses[columns.tablet] : plainGridClasses[columns.desktop] : liveGridClass;
		const featuredSpacing = resolveGridSpacing(section.settings?.spacing, layout?.productGap, layout?.contentSpacing);
		if (!products.length) return null;
		return frame(/* @__PURE__ */ jsxs("section", {
			"data-atelier-section": presentationVariant === "atelier-editorial" ? "FeaturedProducts" : void 0,
			className: `${responsiveVisibilityClass} ${sectionLayout.className}`,
			style: sectionLayout.style,
			children: [/* @__PURE__ */ jsxs("div", {
				className: "mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "text-xl font-black tracking-tight sm:text-3xl",
						style: {
							...headingStyle,
							color: sectionColors.title || "var(--sf-section-title)"
						},
						children: section.title || "Featured Products"
					}), /* @__PURE__ */ jsx("p", {
						className: "mt-1 text-xs font-semibold sm:text-sm",
						style: { color: sectionColors.subtitle || "var(--sf-section-subtitle)" },
						children: "Handpicked products from this store"
					})]
				}), /* @__PURE__ */ jsx(LinkSlot, {
					LinkComponent,
					href: "#products",
					className: "hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-[var(--sf-accent-soft)] hover:text-[var(--sf-accent)] sm:inline-flex",
					children: "View all"
				})]
			}), /* @__PURE__ */ jsx("div", {
				"data-ab-layout": adaptiveParts ? "catalog" : void 0,
				className: `grid ${featuredGridClass} ${productGridGapClasses[featuredSpacing]} ${products.length === 1 ? "mx-auto w-full max-w-[20rem] sm:mx-0 sm:max-w-none" : ""}`,
				children: products.map((product, index) => /* @__PURE__ */ jsx(ProductCard, {
					adaptiveParts,
					product,
					index,
					storewideDiscount,
					productCard,
					presentationVariant,
					onProductAdd,
					onProductBuyNow,
					onWishlistToggle,
					isWishlisted: isProductWishlisted,
					LinkComponent,
					previewDevice
				}, product._id))
			})]
		}));
	}
	if (section.type === "Banner") return frame(/* @__PURE__ */ jsx(BannerVariantSection, {
		section,
		activeImage,
		setActiveImage,
		responsiveClass: responsiveVisibilityClass,
		sectionLayout,
		colors: sectionColors,
		LinkComponent
	}));
	if (section.type === "Reviews") return frame(/* @__PURE__ */ jsx(ReviewsVariantSection, {
		section,
		reviews: sectionReviews?.[stableSectionId] || [],
		responsiveClass: responsiveVisibilityClass,
		sectionLayout,
		contentGapClass,
		colors: sectionColors
	}));
	if (section.type === "CategoryList") return frame(/* @__PURE__ */ jsx(CategoryVariantSection, {
		adaptiveParts,
		section,
		presentationVariant,
		categories,
		catalogProducts,
		previewDevice,
		responsiveClass: responsiveVisibilityClass,
		sectionLayout,
		contentGapClass,
		colors: sectionColors,
		LinkComponent
	}));
	if (["Collection", "CollectionShowcase"].includes(section.type)) {
		const selectedIds = section.settings?.productIds || section.settings?.source?.productIds || [];
		return frame(/* @__PURE__ */ jsx(CollectionVariantSection, {
			section,
			presentationVariant,
			products: sectionProducts?.[stableSectionId] || catalogProducts.filter((product) => selectedIds.map(String).includes(String(product._id))),
			previewDevice,
			responsiveClass: responsiveVisibilityClass,
			sectionLayout,
			contentGapClass,
			colors: sectionColors,
			productCard,
			storewideDiscount,
			onProductAdd,
			onProductBuyNow,
			onWishlistToggle,
			isProductWishlisted,
			LinkComponent
		}));
	}
	if (section.type === "FAQ") {
		const lines = String(section.settings?.text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
		const questions = [];
		lines.forEach((line) => {
			if (/^q(?:uestion)?\s*:/i.test(line)) questions.push({
				question: line.replace(/^q(?:uestion)?\s*:\s*/i, ""),
				answer: ""
			});
			else if (/^a(?:nswer)?\s*:/i.test(line) && questions.length) questions[questions.length - 1].answer = line.replace(/^a(?:nswer)?\s*:\s*/i, "");
			else if (questions.length) questions[questions.length - 1].answer = [questions[questions.length - 1].answer, line].filter(Boolean).join(" ");
		});
		if (!questions.length && lines.length) questions.push({
			question: section.title || "Common question",
			answer: lines.join(" ")
		});
		if (!questions.length) return null;
		return frame(/* @__PURE__ */ jsxs("section", {
			className: `${responsiveVisibilityClass} ${sectionLayout.className} rounded-[1.5rem] border border-slate-200 p-5 shadow-sm sm:p-7`,
			style: {
				...sectionLayout.style,
				backgroundColor: sectionColors.background || "var(--sf-section-background)"
			},
			children: [/* @__PURE__ */ jsx("h2", {
				className: "text-xl font-black sm:text-3xl",
				style: {
					...headingStyle,
					color: sectionColors.title || "var(--sf-section-title)"
				},
				children: section.title || "Frequently asked questions"
			}), /* @__PURE__ */ jsx("div", {
				"data-ab-layout": adaptiveParts ? "catalog" : void 0,
				className: `mt-5 grid ${contentGapClass}`,
				children: questions.map((item, index) => /* @__PURE__ */ jsxs("details", {
					className: "group rounded-2xl p-4",
					style: { backgroundColor: sectionColors.faqBackground || "var(--sf-section-faq-bg)" },
					open: Boolean(previewDevice && index === 0),
					children: [/* @__PURE__ */ jsxs("summary", {
						className: "flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black sm:text-base",
						style: { color: sectionColors.faqText || "var(--sf-section-faq-text)" },
						children: [item.question, /* @__PURE__ */ jsx(ChevronDown, {
							size: 17,
							className: "shrink-0 transition group-open:rotate-180"
						})]
					}), item.answer && /* @__PURE__ */ jsx("p", {
						className: "mt-3 text-sm leading-6 opacity-80",
						style: { color: sectionColors.faqText || "var(--sf-section-faq-text)" },
						children: item.answer
					})]
				}, `${item.question}-${index}`))
			})]
		}));
	}
	if (section.type === "TrustBadges") {
		const badges = String(section.settings?.text || "").split(/\n|·|,/).map((item) => item.trim()).filter(Boolean).slice(0, 8);
		if (!badges.length) return null;
		return frame(/* @__PURE__ */ jsxs("section", {
			"data-atelier-section": presentationVariant === "atelier-editorial" ? "TrustBadges" : void 0,
			className: `${responsiveVisibilityClass} ${sectionLayout.className}`,
			style: sectionLayout.style,
			children: [/* @__PURE__ */ jsx("h2", {
				className: "text-center text-xl font-black sm:text-3xl",
				style: {
					...headingStyle,
					color: sectionColors.title || "var(--sf-section-title)"
				},
				children: section.title || "Why shop with us"
			}), /* @__PURE__ */ jsx("div", {
				"data-ab-layout": adaptiveParts ? "catalog" : void 0,
				className: `mt-5 grid grid-cols-1 ${contentGapClass} sm:grid-cols-2 lg:grid-cols-4`,
				children: badges.map((badge, index) => /* @__PURE__ */ jsxs("div", {
					className: "flex min-h-24 items-center gap-3 rounded-2xl border border-slate-200 p-4 shadow-sm",
					style: {
						backgroundColor: sectionColors.background || "var(--sf-section-background)",
						color: sectionColors.trustText || "var(--sf-section-trust-text)"
					},
					children: [/* @__PURE__ */ jsx("span", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						className: "rounded-full bg-[var(--sf-accent-bg)] p-2.5",
						style: { color: sectionColors.trustIcon || "var(--sf-section-trust-icon)" },
						children: /* @__PURE__ */ jsx(ShieldCheck, { size: 20 })
					}), /* @__PURE__ */ jsx("span", {
						className: "text-sm font-black leading-5",
						children: badge
					})]
				}, `${badge}-${index}`))
			})]
		}));
	}
	if (section.type === "BrandStory") return frame(/* @__PURE__ */ jsx(BrandStoryVariantSection, {
		section,
		presentationVariant,
		LinkComponent,
		responsiveClass: responsiveVisibilityClass,
		sectionLayout,
		contentGapClass,
		colors: sectionColors
	}));
	if ([
		"Newsletter",
		"PromoBlock",
		"TextBlock",
		"BrandShowcase"
	].includes(section.type)) return frame(/* @__PURE__ */ jsx(TextualVariantSection, {
		section,
		presentationVariant,
		responsiveClass: responsiveVisibilityClass,
		sectionLayout,
		colors: sectionColors
	}));
	return null;
});
//#endregion
//#region packages/storefront-renderer/imageDomains.js
const ALLOWED_NEXT_IMAGE_HOSTS = new Set(["res.cloudinary.com"]);
const isNextImageAllowed = (src = "") => {
	if (!src || typeof src !== "string") return false;
	if (src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) return true;
	try {
		const url = new URL(src);
		return url.protocol === "https:" && ALLOWED_NEXT_IMAGE_HOSTS.has(url.hostname);
	} catch {
		return false;
	}
};
const shouldUseUnoptimizedImage = (src = "") => {
	if (!src || typeof src !== "string") return false;
	if (src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) return false;
	try {
		const url = new URL(src);
		if (url.hostname === "res.cloudinary.com" && url.pathname.startsWith("/demo/")) return true;
	} catch {
		return true;
	}
	return !isNextImageAllowed(src);
};
//#endregion
//#region packages/storefront-theme/adaptive.mjs
var import_adaptive = /* @__PURE__ */ __toESM(require_adaptive(), 1);
const { LIMITS, ADAPTIVE_CONTRACT_VERSION, PAGE_KINDS, DEFAULT_PAGE_KINDS, SOURCE_BINDINGS, PAGE_TEMPLATES, BLOCK_REGISTRY, coreNodeId, createPageTemplate, createPageTemplateDocument, validatePageTemplates, validateCompleteThemeBudget, ADAPTIVE_BREAKPOINTS, APPROVED_FONTS, COLOR_TOKENS, STYLE_PROPERTIES, validateResponsiveStyles, tierForWidth, resolveResponsiveStyles, applyPageTemplateCommand } = import_adaptive.default || import_adaptive;
//#endregion
//#region packages/storefront-renderer/adaptive/corePalette.js
const paintKeys = [
	"color",
	"background",
	"borderColor"
];
const hasPaint = (styles) => Object.values(styles || {}).some((tier) => ["color", "background"].some((key) => Object.hasOwn(tier, key)));
const hasControlBorder = (styles) => Object.values(styles || {}).some((tier) => ["borderColor", "borderWidth"].some((key) => Object.hasOwn(tier, key)));
const solid = (value, tokens) => normalizeHexColor(value?.hex || tokens[value?.token]);
const parents = {
	header: {
		surface: [],
		identity: ["surface"],
		navigation: ["surface"],
		utilities: ["surface"]
	},
	footer: {
		surface: [],
		identity: ["surface"],
		navigation: ["surface"],
		policies: ["surface"]
	},
	product: {
		surface: [],
		title: ["surface"],
		price: ["surface"],
		options: ["surface"],
		quantity: ["surface"],
		primaryButton: ["surface"],
		error: ["surface"]
	},
	checkout: {
		surface: [],
		summary: ["surface"],
		heading: ["surface", "summary"],
		label: ["surface", "summary"],
		input: ["surface", "summary"],
		primaryButton: ["surface", "summary"],
		error: ["surface", "summary"]
	}
};
function resolveCorePalette({ node, preset, template, styles, pageStyles, tokens, kind }) {
	const root = hasPaint(node.styles) || hasPaint(preset.styles) || hasPaint(template.styles) || hasPaint(node.partStyles?.surface) || hasPaint(preset.partStyles?.surface);
	const targets = Object.keys(parents[kind]).filter((part) => hasPaint(node.partStyles?.[part]) || hasPaint(preset.partStyles?.[part]) || ["input", "primaryButton"].includes(part) && (hasControlBorder(node.partStyles?.[part]) || hasControlBorder(preset.partStyles?.[part])));
	if (!root && !targets.length) return {
		valid: true,
		value: null
	};
	const value = {
		root,
		targets,
		tiers: {}
	}, errors = [];
	for (const tier of [
		"base",
		"tablet",
		"desktop"
	]) {
		const overrides = {}, borderWidths = {};
		for (const part of Object.keys(parents[kind])) {
			const resolved = resolveResponsiveStyles({
				preset: preset.partStyles?.[part] || {},
				part: node.partStyles?.[part] || {}
			}, tier);
			overrides[part] = Object.fromEntries(Object.entries(resolved.value).filter(([key]) => paintKeys.includes(key)).map(([key, color]) => [key, solid(color, tokens)]));
			borderWidths[part] = resolved.value.borderWidth?.value ?? 1;
		}
		const surface = {
			color: solid(styles[tier].color, tokens) || tokens.foreground,
			background: solid(styles[tier].background || pageStyles[tier].background, tokens) || tokens.background,
			...overrides.surface
		};
		overrides.primaryButton = {
			color: tokens.primaryButtonText,
			background: tokens.primaryButtonBg,
			...overrides.primaryButton
		};
		const contexts = {
			surface,
			summary: {
				...surface,
				...overrides.summary
			}
		};
		for (const [part, placements] of Object.entries(parents[kind])) for (const parent of placements.length ? placements : ["surface"]) {
			const palette = part === "surface" ? surface : {
				...contexts[parent],
				...overrides[part]
			};
			if (contrastRatio(palette.color, palette.background) < 4.5) errors.push({
				code: "CORE_CONTRAST",
				path: [
					"partStyles",
					part,
					tier
				],
				message: `Required ${part} text needs 4.5:1 contrast in its ${parent} surface.`
			});
			const border = overrides[part].borderColor || palette.color;
			if (["input", "primaryButton"].includes(part) && (borderWidths[part] === 0 || contrastRatio(border, contexts[parent].background) < 3) && contrastRatio(palette.background, contexts[parent].background) < 3) errors.push({
				code: "CONTROL_CONTRAST",
				path: [
					"partStyles",
					part,
					tier,
					"borderColor"
				],
				message: "A required control needs a distinguishable border or fill (3:1)."
			});
		}
		value.tiers[tier] = {
			surface,
			overrides
		};
	}
	return errors.length ? {
		valid: false,
		errors
	} : {
		valid: true,
		value
	};
}
function compileCorePalette(palette, selector, tier) {
	if (!palette) return "";
	const { surface, overrides } = palette.tiers[tier];
	let css = `${selector}{--ab-ink:${surface.color};--ab-surface:${surface.background}}`;
	for (const [part, values] of Object.entries(overrides)) {
		const variables = Object.entries(values).filter(([key]) => key !== "borderColor").map(([key, color]) => `${{
			color: "--ab-ink",
			background: "--ab-surface"
		}[key]}:${color}`).join(";");
		if (variables) css += `${selector} [data-ab-part="${part}"]{${variables}}`;
	}
	const scopes = palette.root ? [selector] : palette.targets.map((part) => `${selector} [data-ab-part="${part}"]`);
	for (const scope of scopes) {
		css += `${scope}{background:var(--ab-surface)!important;color:var(--ab-ink)!important}`;
		css += `${scope} :where(*){color:var(--ab-ink)!important;border-color:var(--ab-ink)!important}`;
		css += `${scope} [data-ab-surface],${scope} :where(input:not([type="checkbox"]),textarea,select,button){background:var(--ab-surface)!important}`;
		css += `${scope} :where(input:not([type="checkbox"]),textarea,select,button){border:1px solid var(--ab-ink)}`;
		css += `${scope} input[type="checkbox"]{accent-color:var(--ab-ink)}`;
		css += `${scope} :where(button[aria-pressed="true"],button[aria-selected="true"]){box-shadow:inset 0 -3px currentColor}`;
	}
	return css;
}
//#endregion
//#region packages/storefront-renderer/adaptive/pagePlan.js
const plans = /* @__PURE__ */ new WeakSet();
const tiers = [
	"base",
	"tablet",
	"desktop"
];
const textProperties$1 = [
	"color",
	"fontFamily",
	"fontSize",
	"fontWeight",
	"lineHeight",
	"letterSpacing",
	"textAlign"
];
const ADAPTIVE_RENDERED_PAGES = Object.freeze([
	"home",
	"product",
	"checkout",
	"header",
	"footer"
]);
const failure = (code, message, path = []) => ({
	valid: false,
	errors: [{
		code,
		message,
		path
	}]
});
const freeze = (value) => {
	if (value && typeof value === "object" && !Object.isFrozen(value)) {
		Object.values(value).forEach(freeze);
		Object.freeze(value);
	}
	return value;
};
const isAdaptivePagePlan = (plan) => Boolean(plan && plans.has(plan));
const ADAPTIVE_RENDER_CAPABILITIES = freeze(Object.fromEntries(Object.entries(PAGE_TEMPLATES).map(([kind, page]) => [kind, {
	supported: ADAPTIVE_RENDERED_PAGES.includes(kind),
	...ADAPTIVE_RENDERED_PAGES.includes(kind) ? {
		pageStyles: page.styles,
		corePosition: page.corePosition,
		surroundingContent: page.surroundingContent,
		blocks: Object.fromEntries(Object.entries(BLOCK_REGISTRY).filter(([, block]) => block.pageKinds.includes(kind) && (!block.protected || block.pageKinds[0] === kind)).map(([type, block]) => [type, {
			styles: block.styles,
			parts: block.parts,
			protected: block.protected
		}]))
	} : { reason: "PAGE_ADAPTER" }
}])));
function resolveAdaptivePage({ siteBuilder, pageKind, colorTokens } = {}) {
	if (!ADAPTIVE_RENDERED_PAGES.includes(pageKind)) return failure("PAGE_ADAPTER", "This page family has no approved presentation adapter yet.");
	if (!colorTokens) return failure("COLOR_CONTEXT", "Provide the complete trusted effective color-token map.");
	const descriptor = siteBuilder && typeof siteBuilder === "object" ? Object.getOwnPropertyDescriptor(siteBuilder, "savedSections") : null;
	let document = siteBuilder;
	if (!descriptor && siteBuilder && typeof siteBuilder === "object" && !Array.isArray(siteBuilder)) {
		document = Object.create(Object.getPrototypeOf(siteBuilder), Object.getOwnPropertyDescriptors(siteBuilder));
		Object.defineProperty(document, "savedSections", {
			value: {},
			enumerable: true
		});
	}
	const checked = validatePageTemplates(document, colorTokens);
	if (!checked.valid) return checked;
	const templateId = ["header", "footer"].includes(pageKind) ? document.globals[pageKind] : document.defaultTemplates[pageKind];
	if (!templateId) return failure("PAGE_ASSIGNMENT", "No adaptive assignment exists; retain the legacy route.", ["defaultTemplates", pageKind]);
	const detached = JSON.parse(JSON.stringify(document));
	const template = detached.templates[templateId];
	const nodes = {};
	const paletteErrors = [];
	let ordinal = 0;
	const resolve = (layers, tier, capability) => {
		const result = resolveResponsiveStyles(layers, tier, capability);
		if (!result.valid) throw new TypeError("Validated adaptive styles failed resolution.");
		return result.value;
	};
	const pageStyles = Object.fromEntries(tiers.map((tier) => [tier, resolve({ node: template.styles || {} }, tier, {
		properties: PAGE_TEMPLATES[pageKind].styles,
		functional: true,
		outerWidth: true
	})]));
	const visit = (nodeId, parent) => {
		const node = template.nodes[nodeId], block = BLOCK_REGISTRY[node.type];
		const preset = detached.stylePresets[node.stylePresetId] || {};
		const styles = {}, parts = {}, partOverrides = {};
		for (const tier of tiers) {
			const inherited = parent && Object.fromEntries(Object.entries(nodes[parent].styles[tier]).filter(([key]) => textProperties$1.includes(key) && block.styles.includes(key)));
			styles[tier] = resolve({
				...parent ? { defaults: { base: inherited } } : { page: template.styles || {} },
				preset: preset.styles || {},
				node: node.styles || {}
			}, tier, {
				properties: block.styles,
				functional: block.protected
			});
			for (const [partId, properties] of Object.entries(block.parts)) {
				parts[partId] ||= {};
				partOverrides[partId] ||= {};
				partOverrides[partId][tier] = resolve({
					preset: preset.partStyles?.[partId] || {},
					part: node.partStyles?.[partId] || {}
				}, tier, {
					properties,
					functional: block.protected
				});
				const inheritedText = Object.fromEntries(Object.entries(styles[tier]).filter(([key]) => textProperties$1.includes(key) && properties.includes(key)));
				parts[partId][tier] = resolve({
					defaults: { base: inheritedText },
					preset: preset.partStyles?.[partId] || {},
					part: node.partStyles?.[partId] || {}
				}, tier, {
					properties,
					functional: block.protected
				});
			}
		}
		const palette = block.protected ? resolveCorePalette({
			node,
			preset,
			template,
			styles,
			pageStyles,
			tokens: colorTokens,
			kind: pageKind
		}) : null;
		if (palette && !palette.valid) paletteErrors.push(...palette.errors.map((error) => ({
			...error,
			path: [
				"templates",
				templateId,
				"nodes",
				nodeId,
				...error.path
			]
		})));
		nodes[nodeId] = {
			...node,
			styleId: `n${ordinal++}`,
			styles,
			parts,
			partOverrides,
			...palette?.value ? { palette: palette.value } : {}
		};
		for (const children of Object.values(node.slots || {})) children.forEach((child) => visit(child, nodeId));
	};
	template.rootOrder.forEach((nodeId) => visit(nodeId));
	if (paletteErrors.length) return {
		valid: false,
		errors: paletteErrors.slice(0, 100)
	};
	const plan = freeze({
		version: 1,
		pageKind,
		templateId,
		rootOrder: template.rootOrder,
		nodes,
		pageStyles,
		colorTokens: JSON.parse(JSON.stringify(colorTokens))
	});
	plans.add(plan);
	return {
		valid: true,
		errors: [],
		value: plan
	};
}
//#endregion
//#region packages/storefront-renderer/adaptive/styleCompiler.js
const cssNames = Object.freeze({
	color: "color",
	background: "background",
	fontFamily: "font-family",
	fontSize: "font-size",
	fontWeight: "font-weight",
	lineHeight: "line-height",
	letterSpacing: "letter-spacing",
	textAlign: "text-align",
	width: "width",
	maxWidth: "max-width",
	height: "height",
	minHeight: "min-height",
	aspectRatio: "aspect-ratio",
	paddingBlockStart: "padding-block-start",
	paddingBlockEnd: "padding-block-end",
	paddingInlineStart: "padding-inline-start",
	paddingInlineEnd: "padding-inline-end",
	marginBlockStart: "margin-block-start",
	marginBlockEnd: "margin-block-end",
	marginInlineStart: "margin-inline-start",
	marginInlineEnd: "margin-inline-end",
	borderColor: "border-color",
	borderWidth: "border-width",
	borderRadius: "border-radius",
	gap: "gap",
	alignItems: "align-items",
	justifyContent: "justify-content"
});
const fonts = Object.freeze({
	Inter: "Inter,sans-serif",
	Arial: "Arial,sans-serif",
	Georgia: "Georgia,serif",
	Roboto: "Roboto,sans-serif",
	"DM Sans": "\"DM Sans\",sans-serif"
});
const selectorForPart = (root, kind, part, type) => {
	const marker = `${root} [data-ab-part="${part}"]`;
	if (part === "surface") return marker;
	if (kind === "checkout") {
		if ([
			"heading",
			"label",
			"input",
			"primaryButton",
			"summary"
		].includes(part)) return marker;
	}
	if (type === "catalog.products") {
		if (part === "title") return `${root} h2`;
		if (part === "card") return `${root} article`;
	}
	return marker;
};
const textProperties = [
	"color",
	"fontFamily",
	"fontSize",
	"fontWeight",
	"lineHeight",
	"letterSpacing",
	"textAlign"
];
const textTargets = ":where(p,h1,h2,h3,h4,h5,h6,span,label,a,button,input,textarea,select,summary,dt,dd,small,strong)";
function declarations(styles, node, tier, tokens) {
	const result = [];
	for (const [property, value] of Object.entries(styles)) {
		if (property === "visible") {
			result.push(`display:${value ? node.type === "content.link" ? "inline-flex" : "block" : "none"}`);
			continue;
		}
		if (property === "columns" || property === "stackOnMobile" || property === "objectFit") continue;
		if (node.palette && ["color", "background"].includes(property)) continue;
		const name = cssNames[property];
		if (!name) throw new TypeError("Uncompiled adaptive style property.");
		let compiled = value;
		if ([
			"color",
			"background",
			"borderColor"
		].includes(property)) compiled = normalizeHexColor(value.hex || tokens[value.token]);
		else if (property === "fontFamily") compiled = fonts[value];
		else if (property === "aspectRatio") compiled = `${value.width}/${value.height}`;
		else if (typeof value === "object") compiled = ["fontSize", "letterSpacing"].includes(property) ? `${value.value / 16}rem` : `${value.value}${value.unit === "percent" ? "%" : "px"}`;
		if (property === "width" || property === "maxWidth") compiled = `min(100%,${compiled})`;
		result.push(`${name}:${compiled}`);
		if (property === "borderWidth") result.push("border-style:solid");
	}
	if ([
		"content.section",
		"layout.stack",
		"layout.columns"
	].includes(node.type) && styles.visible !== false) {
		result.push(`display:${node.type === "layout.columns" ? "grid" : "flex"}`);
		if (node.type !== "layout.columns") result.push("flex-direction:column");
	}
	if (node.type === "layout.columns") result.push(`grid-template-columns:repeat(${tier === "base" && styles.stackOnMobile !== false ? 1 : styles.columns || node.slots.columns.length},minmax(0,1fr))`);
	return result.join(";");
}
function typography(styles, selector, tier, tokens) {
	const values = Object.fromEntries(Object.entries(styles).filter(([key]) => textProperties.includes(key) && key !== "color"));
	let css = "";
	for (const [property, value] of Object.entries(values)) {
		const declaration = declarations({ [property]: value }, {}, tier, tokens);
		const compiled = declaration.slice(declaration.indexOf(":") + 1);
		const name = cssNames[property], variable = `--ab-type-${name}`;
		css += `${selector}{${variable}:${compiled};${name}:var(${variable})!important}`;
		css += `${selector} ${textTargets}{${name}:var(${variable})!important}`;
	}
	if (styles.fontSize) css += `${selector},${selector} ${textTargets}{line-height:var(--ab-type-line-height,1.5)!important}`;
	return css;
}
function compileAdaptiveStyles(plan, scope) {
	if (!isAdaptivePagePlan(plan) || !/^ab_[a-f0-9]+$/.test(scope)) throw new TypeError("Use a resolved plan and compiler-owned scope.");
	const root = `.sf-adaptive[data-ab-scope="${scope}"]`;
	let css = `${root}{min-width:0;max-width:100%;overflow-wrap:anywhere;color:${plan.colorTokens.foreground};background-color:${plan.colorTokens.background}}`;
	css += `${root} :where(*, *::before, *::after){box-sizing:border-box;min-width:0}`;
	css += `${root} [data-ab-node]{max-width:100%}${root} img{max-width:100%}`;
	css += `${root} [data-ab-core] .sf-page{background:transparent}`;
	css += `${root} [data-ab-core="header"] header,${root} [data-ab-core="footer"] footer{position:static;overflow:visible}`;
	css += `${root} [data-ab-layout="headerDesktop"],${root} [data-ab-layout="footerDesktop"]{display:none!important}`;
	css += `${root} [data-ab-layout="headerMobile"]{display:flex!important;height:auto;min-height:64px;flex-wrap:wrap}`;
	css += `${root} [data-ab-layout="headerMobileSearch"],${root} [data-ab-layout="footerMobile"]{display:block!important}`;
	css += `${root} [data-ab-layout="footerColumns"]{grid-template-columns:minmax(0,1fr)!important}`;
	css += `${root} .atelier-header-row{display:flex!important;flex-wrap:wrap}${root} .atelier-desktop-navigation{display:none!important}${root} .atelier-menu-toggle{display:inline-flex!important}${root} .atelier-utilities{flex-wrap:wrap}${root} .atelier-utilities span{display:none!important}${root} .atelier-footer-grid{grid-template-columns:minmax(0,1fr)!important}`;
	css += `@container(min-width:1024px){${root} [data-ab-layout="headerDesktop"]{display:block!important;height:auto;min-height:76px}${root} [data-ab-layout="footerDesktop"]{display:contents!important}${root} [data-ab-layout="headerMobile"],${root} [data-ab-layout="headerMobileSearch"],${root} [data-ab-layout="footerMobile"]{display:none!important}${root} [data-ab-layout="footerColumns"]{grid-template-columns:minmax(0,1.25fr) minmax(0,.7fr) minmax(0,1fr)!important}${root} .atelier-desktop-navigation{display:block!important}${root} .atelier-header-row{display:grid!important}${root} .atelier-menu-toggle{display:none!important}${root} .atelier-footer-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}}`;
	css += `${root} [data-ab-part="galleryFrame"]{width:100%;max-width:100%}`;
	css += `${root} [data-ab-core]{container-type:inline-size}${root} [data-ab-layout="product"],${root} [data-ab-layout="checkout"]{grid-template-columns:minmax(0,1fr)}`;
	css += `@container(min-width:1000px){${root} [data-ab-layout="product"],${root} [data-ab-layout="checkout"]{grid-template-columns:repeat(2,minmax(0,1fr))}${root} [data-ab-layout="checkout"]>[data-ab-region="details"]{grid-column:1;grid-row:1}${root} [data-ab-layout="checkout"]>[data-ab-region="summary"]{grid-column:2;grid-row:1/3}${root} [data-ab-layout="checkout"]>[data-ab-region="marketing"]{grid-column:1;grid-row:2}}`;
	css += `${root} [data-ab-type="content.image"] img{display:block;width:100%;height:100%;object-fit:contain;border-radius:inherit}`;
	css += `${root} :is(a,button,input:not([type="checkbox"]),select,summary){min-height:44px}${root} a{align-items:center}`;
	css += `${root} button{min-width:44px}${root} [role="dialog"] form{max-height:100dvh;overflow-y:auto;overscroll-behavior:contain}`;
	css += `${root} :is(a,button,input,textarea,select,summary):focus-visible{outline:2px solid #fff!important;outline-offset:1px;box-shadow:0 0 0 4px #000!important}`;
	css += `${root} [data-ab-core="checkout"] [data-ab-part="error"]{color:#b91c1c}`;
	css += `${root} [data-ab-core] [data-ab-muted]{color:#475569}`;
	css += `@media(prefers-reduced-motion:reduce){${root} *,${root} *::before,${root} *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}`;
	for (const tier of [
		"base",
		"tablet",
		"desktop"
	]) {
		let rules = `${root}{${declarations(plan.pageStyles[tier], {}, tier, plan.colorTokens)}}`;
		for (const node of Object.values(plan.nodes)) {
			const selector = `${root} [data-ab-style="${node.styleId}"]`;
			const core = node.type.endsWith(".core");
			const nodeBox = core ? Object.fromEntries(Object.entries(node.styles[tier]).filter(([key]) => !textProperties.includes(key))) : node.styles[tier];
			rules += `${selector}{${declarations(nodeBox, node, tier, plan.colorTokens)}}`;
			if (node.palette) rules += compileCorePalette(node.palette, selector, tier);
			if (core) rules += typography(node.styles[tier], selector, tier, plan.colorTokens);
			if (node.type.startsWith("catalog.") && node.styles[tier].background) rules += `${selector}>section{${declarations({ background: node.styles[tier].background }, node, tier, plan.colorTokens)}!important}`;
			if (node.type.startsWith("catalog.") && node.styles[tier].gap) rules += `${selector} [data-ab-layout="catalog"]{gap:${node.styles[tier].gap.value}px!important}`;
			if (node.type === "content.image" && node.styles[tier].objectFit) rules += `${selector} img{object-fit:${node.styles[tier].objectFit}}`;
			for (const [part, values] of Object.entries(node.parts)) {
				const target = selectorForPart(selector, plan.pageKind, part, node.type);
				const partCss = declarations(core ? Object.fromEntries(Object.entries(values[tier]).filter(([key]) => !textProperties.includes(key))) : values[tier], node, tier, plan.colorTokens).split(";").filter(Boolean).map((declaration) => `${declaration}!important`).join(";");
				rules += `${target}{${partCss}}`;
				if (core) {
					for (const scope of target.split(",")) rules += typography(node.partOverrides[part][tier], scope, tier, plan.colorTokens);
					continue;
				}
				const partTextCss = declarations(Object.fromEntries(Object.entries(values[tier]).filter(([key]) => textProperties.includes(key) && key !== "color")), node, tier, plan.colorTokens).split(";").filter(Boolean).map((rule) => `${rule}!important`).join(";");
				if (partTextCss) rules += `${target.split(",").map((value) => `${value} ${textTargets}`).join(",")}{${partTextCss}}`;
				if (values[tier].color) {
					const color = declarations({ color: values[tier].color }, node, tier, plan.colorTokens);
					rules += `${target.split(",").map((value) => `${value} ${textTargets}:not(button,button *,input,textarea,select)`).join(",")}{${color}!important}`;
				}
			}
		}
		css += tier === "base" ? rules : `@media(min-width:${tier === "tablet" ? 768 : 1024}px){${rules}}`;
	}
	return css;
}
//#endregion
//#region packages/storefront-renderer/presentation/ProductImageGallery.jsx
const ProductImageGallery = memo(function ProductImageGallery({ images, category, displayDiscount, productTitle, imageAltText, presentationVariant, adaptiveParts = false }) {
	const [activeIdx, setActiveIdx] = useState(0);
	const [isZoomed, setIsZoomed] = useState(false);
	const [failedImages, setFailedImages] = useState(() => /* @__PURE__ */ new Set());
	const safeImages = useMemo(() => (images || []).map((image) => ({
		src: getImageUrlFromValue(image),
		alt: getProductImageAlt({
			product: {
				title: productTitle,
				imageAltText
			},
			image
		})
	})).filter((image) => image.src), [
		imageAltText,
		images,
		productTitle
	]);
	const displayImages = useMemo(() => safeImages.filter((image) => !failedImages.has(image.src)), [safeImages, failedImages]);
	const primaryImage = displayImages?.[0];
	const activeImage = displayImages[activeIdx] || primaryImage;
	useEffect(() => {
		setActiveIdx(0);
	}, [primaryImage]);
	useEffect(() => {
		if (activeIdx > 0 && activeIdx >= displayImages.length) setActiveIdx(0);
	}, [activeIdx, displayImages.length]);
	const handleImageError = (image) => {
		setFailedImages((prev) => {
			const next = new Set(prev);
			next.add(image.src);
			return next;
		});
	};
	return /* @__PURE__ */ jsxs("div", {
		"data-atelier-part": presentationVariant === "atelier-editorial" ? "gallery" : void 0,
		className: "min-w-0 lg:sticky lg:top-28",
		children: [/* @__PURE__ */ jsxs("div", {
			"data-ab-surface": adaptiveParts ? "" : void 0,
			"data-ab-part": adaptiveParts ? "galleryFrame" : void 0,
			className: "group relative flex aspect-[4/5] max-h-[620px] min-h-[320px] cursor-crosshair items-center justify-center overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-teal-50/50 p-4 shadow-sm shadow-slate-200/70 transition-all duration-500 hover:shadow-xl hover:shadow-teal-100/70 sm:aspect-[5/4] sm:p-6 lg:aspect-[4/5] lg:rounded-[2.25rem] xl:aspect-square",
			onMouseEnter: () => setIsZoomed(true),
			onMouseLeave: () => setIsZoomed(false),
			children: [
				activeImage ? /* @__PURE__ */ jsx(Image, {
					src: activeImage.src,
					alt: activeImage.alt,
					fill: true,
					sizes: "(max-width: 768px) 100vw, 50vw",
					priority: activeIdx === 0,
					onError: () => handleImageError(activeImage),
					unoptimized: shouldUseUnoptimizedImage(activeImage.src),
					className: `object-contain p-3 transition-transform duration-700 ease-out sm:p-5 ${isZoomed ? "scale-105" : "scale-100"}`
				}) : /* @__PURE__ */ jsxs("div", {
					"data-ab-surface": adaptiveParts ? "" : void 0,
					className: "flex h-full w-full flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-white/70 text-center text-slate-400",
					children: [
						/* @__PURE__ */ jsx(ImageOff, { size: 48 }),
						/* @__PURE__ */ jsx("p", {
							className: "mt-3 text-sm font-bold text-slate-500",
							children: "Image unavailable"
						}),
						/* @__PURE__ */ jsx("p", {
							"data-ab-muted": adaptiveParts ? "" : void 0,
							className: "mt-1 max-w-xs text-xs leading-5 text-slate-400",
							children: "Add or replace this product image from the admin catalog."
						})
					]
				}),
				category && /* @__PURE__ */ jsx("div", {
					className: "absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-col gap-2 sm:left-6 sm:top-6",
					children: /* @__PURE__ */ jsx("span", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						className: "truncate rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-slate-700 shadow-sm backdrop-blur-md",
						children: category
					})
				}),
				displayDiscount > 0 && /* @__PURE__ */ jsxs("div", {
					"data-ab-surface": adaptiveParts ? "" : void 0,
					className: "absolute right-4 top-4 flex items-center rounded-full bg-red-600 px-3 py-1.5 text-xs font-black text-white shadow-lg shadow-red-200 sm:right-6 sm:top-6",
					children: [
						/* @__PURE__ */ jsx(Zap, {
							size: 14,
							className: "mr-1.5 fill-current"
						}),
						displayDiscount,
						"% OFF"
					]
				})
			]
		}), displayImages.length > 1 && /* @__PURE__ */ jsxs("div", {
			className: "mt-4",
			children: [/* @__PURE__ */ jsx("div", {
				className: "flex gap-3 overflow-x-auto px-1 py-2 scrollbar-hide",
				children: displayImages.map((img, idx) => /* @__PURE__ */ jsx("button", {
					"data-ab-surface": adaptiveParts ? "" : void 0,
					type: "button",
					onClick: () => setActiveIdx(idx),
					"aria-label": `View product image ${idx + 1}`,
					"aria-pressed": activeIdx === idx,
					className: `relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-2xl bg-white transition-all duration-300 sm:h-20 sm:w-20
                                ${activeIdx === idx ? "ring-2 ring-[var(--sf-accent)] ring-offset-2 scale-105 shadow-md" : "border border-slate-200 opacity-75 hover:border-[var(--sf-accent)]/50 hover:opacity-100"}`,
					children: /* @__PURE__ */ jsx(Image, {
						src: img.src,
						alt: `${img.alt} thumbnail ${idx + 1}`,
						fill: true,
						sizes: "80px",
						onError: () => handleImageError(img),
						unoptimized: shouldUseUnoptimizedImage(img.src),
						className: "object-cover"
					})
				}, img.src))
			}), /* @__PURE__ */ jsx("p", {
				"data-ab-muted": adaptiveParts ? "" : void 0,
				className: "px-1 text-xs font-semibold text-slate-400",
				children: "Swipe or tap thumbnails to preview more angles."
			})]
		})]
	});
});
//#endregion
//#region packages/storefront-renderer/presentation/ProductInfo.jsx
const StarRow = memo(function StarRow({ rating, size = 16 }) {
	return /* @__PURE__ */ jsx("div", {
		className: "flex text-yellow-400",
		children: Array.from({ length: 5 }, (_, i) => /* @__PURE__ */ jsx(Star, {
			size,
			fill: i < Math.round(rating) ? "currentColor" : "none",
			className: i < Math.round(rating) ? "" : "text-gray-300"
		}, i))
	});
});
const ProductInfo = memo(function ProductInfo({ adaptiveParts = false, presentationVariant, title, averageRating, numReviews, currentVariant, baseOriginalPrice, displayFinalPrice, displayDiscount, description }) {
	const [descriptionExpanded, setDescriptionExpanded] = useState(false);
	const displayDescription = description || (presentationVariant === "atelier-editorial" ? "" : "Elevate your daily routine with this premium quality product.");
	const canCollapseDescription = displayDescription.trim().length > 180;
	return /* @__PURE__ */ jsxs("div", {
		"data-atelier-part": presentationVariant === "atelier-editorial" ? "product-info" : void 0,
		className: "space-y-5",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [/* @__PURE__ */ jsx(StarRow, {
					adaptiveParts,
					rating: averageRating
				}), /* @__PURE__ */ jsx("span", {
					className: "text-sm font-semibold text-slate-500",
					children: numReviews > 0 ? `${averageRating} / 5 from ${numReviews} reviews` : "No reviews yet"
				})]
			}),
			/* @__PURE__ */ jsx("h1", {
				"data-ab-part": adaptiveParts ? "title" : void 0,
				className: "text-3xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-4xl lg:text-[2.65rem]",
				children: title
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap gap-2",
				children: [
					currentVariant?.sku && /* @__PURE__ */ jsxs("p", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						className: "inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-500",
						children: ["SKU: ", currentVariant.sku]
					}),
					currentVariant?.barcode && /* @__PURE__ */ jsxs("p", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						className: "inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-500",
						children: ["Barcode: ", currentVariant.barcode]
					}),
					presentationVariant !== "atelier-editorial" && /* @__PURE__ */ jsxs("p", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						className: "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-700",
						children: [/* @__PURE__ */ jsx(BadgeCheck, { size: 13 }), "Verified store item"]
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				"data-ab-surface": adaptiveParts ? "" : void 0,
				"data-atelier-part": presentationVariant === "atelier-editorial" ? "product-price" : void 0,
				className: "flex flex-wrap items-end justify-between gap-5 rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-teal-50/70 p-4 sm:p-5",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex flex-col",
						children: [/* @__PURE__ */ jsx("span", {
							className: "mb-1 text-sm font-bold text-slate-500",
							children: "Price"
						}), /* @__PURE__ */ jsxs("p", {
							"data-ab-part": adaptiveParts ? "price" : void 0,
							className: "text-3xl font-black text-slate-950 sm:text-4xl",
							children: ["৳ ", displayFinalPrice]
						})]
					}),
					displayDiscount > 0 && /* @__PURE__ */ jsxs("div", {
						className: "pb-1",
						children: [/* @__PURE__ */ jsxs("p", {
							className: "text-lg font-semibold text-slate-400 line-through",
							children: ["৳ ", baseOriginalPrice]
						}), /* @__PURE__ */ jsxs("span", {
							"data-ab-surface": adaptiveParts ? "" : void 0,
							className: "sf-badge sf-badge-success mt-2",
							children: [displayDiscount, "% off"]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						className: "rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-sm",
						children: [/* @__PURE__ */ jsxs("p", {
							className: "flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-emerald-700",
							children: [/* @__PURE__ */ jsx(Wallet, { size: 13 }), "Payment"]
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-1 text-sm font-black text-slate-900",
							children: "Cash on delivery"
						})]
					})
				]
			}),
			displayDescription && /* @__PURE__ */ jsxs("div", {
				"data-atelier-part": presentationVariant === "atelier-editorial" ? "product-description" : void 0,
				children: [/* @__PURE__ */ jsx("p", {
					className: `text-base leading-7 text-slate-600 ${canCollapseDescription && !descriptionExpanded ? "line-clamp-4" : ""}`,
					children: displayDescription
				}), canCollapseDescription && /* @__PURE__ */ jsxs("button", {
					type: "button",
					onClick: () => setDescriptionExpanded((expanded) => !expanded),
					"aria-expanded": descriptionExpanded,
					className: "mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-black text-[var(--sf-accent)] transition hover:text-[var(--sf-accent-hover)]",
					children: [descriptionExpanded ? "Show less" : "Show more", descriptionExpanded ? /* @__PURE__ */ jsx(ChevronUp, { size: 16 }) : /* @__PURE__ */ jsx(ChevronDown, { size: 16 })]
				})]
			})
		]
	});
});
//#endregion
//#region packages/storefront-renderer/presentation/VariantSelector.jsx
const variantMatches = (variant, candidate) => {
	if (!variant?.attributes?.length || variant.isActive === false || variant.status === "archived") return false;
	return Object.entries(candidate).every(([name, value]) => {
		if (!value) return true;
		return variant.attributes.some((attr) => attr.name === name && attr.value === value);
	});
};
const VariantSelector = memo(function VariantSelector({ availableAttributes, selectedAttributes, variants = [], onSelect, presentationVariant, adaptiveParts = false }) {
	const optionAvailability = useMemo(() => {
		const availability = {};
		for (const [attrName, values] of Object.entries(availableAttributes)) {
			availability[attrName] = {};
			values.forEach((value) => {
				const candidate = {
					...selectedAttributes,
					[attrName]: value
				};
				availability[attrName][value] = variants.some((variant) => variantMatches(variant, candidate));
			});
		}
		return availability;
	}, [
		availableAttributes,
		selectedAttributes,
		variants
	]);
	if (!Object.keys(availableAttributes).length) return null;
	return /* @__PURE__ */ jsxs("div", {
		"data-ab-surface": adaptiveParts ? "" : void 0,
		"data-ab-part": adaptiveParts ? "options" : void 0,
		"data-atelier-part": presentationVariant === "atelier-editorial" ? "product-options" : void 0,
		className: "space-y-5 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 sm:p-5",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex flex-col gap-2 border-b border-slate-200/70 pb-4 sm:flex-row sm:items-end sm:justify-between",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
				className: "text-sm font-black text-slate-950",
				children: "Choose your options"
			}), /* @__PURE__ */ jsx("p", {
				className: "mt-1 text-xs font-semibold text-slate-500",
				children: "Select a combination to update price, SKU, image, and stock."
			})] }), Object.keys(selectedAttributes).length > 0 && /* @__PURE__ */ jsx("p", {
				"data-ab-surface": adaptiveParts ? "" : void 0,
				className: "max-w-full truncate rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm",
				children: Object.entries(selectedAttributes).filter(([, value]) => value).map(([name, value]) => `${name}: ${value}`).join(" / ")
			})]
		}), Object.entries(availableAttributes).map(([attrName, values]) => /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("h3", {
			className: "mb-3 flex min-w-0 items-center text-xs font-black uppercase tracking-[0.16em] text-slate-500",
			children: [attrName, /* @__PURE__ */ jsx("span", {
				"data-ab-surface": adaptiveParts ? "" : void 0,
				className: "ml-3 h-px flex-1 bg-slate-200"
			})]
		}), /* @__PURE__ */ jsx("div", {
			className: "flex min-w-0 flex-wrap gap-2.5",
			children: values.map((value) => {
				const isSelected = selectedAttributes[attrName] === value;
				const isAvailable = optionAvailability[attrName]?.[value] !== false;
				return /* @__PURE__ */ jsx("button", {
					"data-ab-surface": adaptiveParts ? "" : void 0,
					type: "button",
					onClick: () => onSelect(attrName, value),
					disabled: !isAvailable,
					"aria-pressed": isSelected,
					style: {
						backgroundColor: isSelected ? "var(--sf-variant-chip-selected-bg)" : "var(--sf-variant-chip-bg)",
						color: isSelected ? "var(--sf-variant-chip-selected-text)" : "var(--sf-variant-chip-text)"
					},
					title: isAvailable ? `${attrName}: ${value}` : `${value} is unavailable with current options`,
					className: `min-h-11 max-w-full rounded-xl px-4 py-2.5 text-sm font-black transition-all duration-200
                                        ${isSelected ? "bg-[var(--sf-accent)] text-white shadow-lg shadow-teal-900/15" : "border border-slate-200 bg-white text-slate-700 hover:border-[var(--sf-accent)] hover:bg-slate-50"} disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through`,
					children: /* @__PURE__ */ jsx("span", {
						className: "block max-w-[12rem] truncate",
						children: value
					})
				}, value);
			})
		})] }, attrName))]
	});
});
//#endregion
//#region packages/storefront-renderer/presentation/ActionButtons.jsx
const trustItems = [
	{
		icon: ShieldCheck,
		title: "Secure checkout",
		text: "Encrypted order flow"
	},
	{
		icon: RefreshCcw,
		title: "Easy returns",
		text: "Clear return support"
	},
	{
		icon: Truck,
		title: "Fast delivery",
		text: "Tracked local shipping"
	},
	{
		icon: Wallet,
		title: "Cash on delivery",
		text: "Pay when it arrives"
	}
];
const ActionButtons = memo(function ActionButtons({ displayStock, onAddToCart, onBuyNow, presentationVariant, adaptiveParts = false }) {
	return /* @__PURE__ */ jsxs("div", {
		"data-atelier-part": presentationVariant === "atelier-editorial" ? "product-actions" : void 0,
		className: "space-y-4",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [displayStock > 0 ? /* @__PURE__ */ jsxs("span", {
					"data-ab-surface": adaptiveParts ? "" : void 0,
					className: "sf-badge sf-badge-success",
					children: [
						/* @__PURE__ */ jsxs("span", {
							className: "relative flex h-2 w-2",
							children: [/* @__PURE__ */ jsx("span", {
								"data-ab-surface": adaptiveParts ? "" : void 0,
								className: "absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
							}), /* @__PURE__ */ jsx("span", {
								"data-ab-surface": adaptiveParts ? "" : void 0,
								className: "relative inline-flex h-2 w-2 rounded-full bg-emerald-500"
							})]
						}),
						"In Stock (",
						displayStock,
						" units ready)"
					]
				}) : /* @__PURE__ */ jsx("span", {
					"data-ab-surface": adaptiveParts ? "" : void 0,
					className: "sf-badge bg-red-50 text-red-700",
					children: "Out of Stock"
				}), presentationVariant !== "atelier-editorial" && /* @__PURE__ */ jsx("span", {
					"data-ab-surface": adaptiveParts ? "" : void 0,
					className: "rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-500",
					children: "Ready for checkout"
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "grid gap-3 sm:grid-cols-2",
				children: [/* @__PURE__ */ jsxs("button", {
					type: "button",
					onClick: onAddToCart,
					"data-ab-part": adaptiveParts ? "primaryButton" : void 0,
					disabled: displayStock <= 0,
					className: "sf-btn sf-btn-primary w-full px-8 py-4 text-base disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2",
					children: [/* @__PURE__ */ jsx(ShoppingCart, { size: 22 }), /* @__PURE__ */ jsx("span", { children: displayStock > 0 ? "Add to Cart" : "Currently Unavailable" })]
				}), displayStock > 0 && /* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: onBuyNow,
					"data-ab-part": adaptiveParts ? "primaryButton" : void 0,
					className: "sf-btn sf-btn-secondary w-full py-4 sm:col-span-2",
					children: "Buy now"
				})]
			}),
			presentationVariant !== "atelier-editorial" && /* @__PURE__ */ jsx("div", {
				className: "grid grid-cols-1 gap-3 pt-3 min-[420px]:grid-cols-2",
				children: trustItems.map(({ icon: Icon, title, text }) => /* @__PURE__ */ jsx("div", {
					"data-ab-surface": adaptiveParts ? "" : void 0,
					className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50",
					children: /* @__PURE__ */ jsxs("div", {
						className: "flex items-start gap-3",
						children: [/* @__PURE__ */ jsx("div", {
							"data-ab-surface": adaptiveParts ? "" : void 0,
							className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sf-accent-bg)] text-[var(--sf-accent)]",
							children: /* @__PURE__ */ jsx(Icon, { size: 18 })
						}), /* @__PURE__ */ jsxs("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ jsx("span", {
								className: "block text-sm font-black text-slate-800",
								children: title
							}), /* @__PURE__ */ jsx("span", {
								className: "mt-0.5 block text-xs font-semibold leading-5 text-slate-500",
								children: text
							})]
						})]
					})
				}, title))
			}),
			presentationVariant !== "atelier-editorial" && /* @__PURE__ */ jsx("div", {
				"data-ab-surface": adaptiveParts ? "" : void 0,
				className: "rounded-2xl border border-emerald-200 bg-emerald-50 p-4",
				children: /* @__PURE__ */ jsxs("div", {
					className: "flex items-start gap-3",
					children: [/* @__PURE__ */ jsx(Headphones, {
						size: 19,
						className: "mt-0.5 shrink-0 text-emerald-600"
					}), /* @__PURE__ */ jsx("p", {
						className: "text-sm font-semibold leading-6 text-emerald-800",
						children: "Need help before ordering? Customer support is available for sizing, delivery, and payment questions."
					})]
				})
			})
		]
	});
});
//#endregion
//#region packages/storefront-renderer/presentation/ProductExtras.jsx
const normalizeFeatures = (features) => Array.isArray(features) ? features.map((feature) => {
	if (typeof feature === "string") {
		const reason = feature.trim();
		return reason ? {
			point: "Product benefit",
			reason
		} : null;
	}
	const point = String(feature?.point || feature?.title || feature?.label || feature?.name || "").trim();
	const reason = String(feature?.reason || feature?.value || feature?.description || feature?.text || "").trim();
	return point && reason ? {
		point,
		reason
	} : null;
}).filter(Boolean) : [];
memo(function ProductFeatures({ adaptiveParts = false, features }) {
	const normalizedFeatures = normalizeFeatures(features);
	if (!normalizedFeatures.length) return null;
	return /* @__PURE__ */ jsxs("section", {
		"data-ab-surface": adaptiveParts ? "" : void 0,
		className: "rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 sm:p-6",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "mb-5 flex items-start gap-3",
			children: [/* @__PURE__ */ jsx("span", {
				"data-ab-surface": adaptiveParts ? "" : void 0,
				className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--sf-accent-bg)] text-[var(--sf-accent)]",
				children: /* @__PURE__ */ jsx(Sparkles, { size: 22 })
			}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
				className: "sf-kicker",
				children: "Highlights"
			}), /* @__PURE__ */ jsx("h2", {
				className: "text-2xl font-black text-slate-950",
				children: "Why you'll love it"
			})] })]
		}), /* @__PURE__ */ jsx("div", {
			className: "grid grid-cols-1 gap-3 sm:grid-cols-2",
			children: normalizedFeatures.map((feature, idx) => /* @__PURE__ */ jsxs("div", {
				"data-ab-surface": adaptiveParts ? "" : void 0,
				className: "rounded-2xl border border-slate-200 bg-slate-50 p-4",
				children: [/* @__PURE__ */ jsx("h4", {
					className: "mb-2 text-base font-black text-slate-950",
					children: feature.point
				}), /* @__PURE__ */ jsx("p", {
					className: "text-sm leading-6 text-slate-600",
					children: feature.reason
				})]
			}, idx))
		})]
	});
});
memo(function ProductSpecifications({ adaptiveParts = false, specifications }) {
	if (!specifications?.length) return null;
	return /* @__PURE__ */ jsxs("section", {
		"data-ab-surface": adaptiveParts ? "" : void 0,
		className: "rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 sm:p-6",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "mb-5 flex items-start gap-3",
			children: [/* @__PURE__ */ jsx("span", {
				"data-ab-surface": adaptiveParts ? "" : void 0,
				className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--sf-accent-bg)] text-[var(--sf-accent)]",
				children: /* @__PURE__ */ jsx(ClipboardList, { size: 22 })
			}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
				className: "sf-kicker",
				children: "Details"
			}), /* @__PURE__ */ jsx("h2", {
				className: "text-2xl font-black text-slate-950",
				children: "Specifications"
			})] })]
		}), /* @__PURE__ */ jsx("div", {
			"data-ab-surface": adaptiveParts ? "" : void 0,
			className: "overflow-hidden rounded-2xl border border-slate-200 bg-slate-50",
			children: specifications.map((spec, idx) => /* @__PURE__ */ jsxs("div", {
				"data-ab-surface": adaptiveParts ? "" : void 0,
				className: "flex flex-col border-b border-slate-200/70 bg-white px-4 py-4 transition-colors last:border-0 hover:bg-slate-50 sm:flex-row sm:px-5",
				children: [/* @__PURE__ */ jsx("dt", {
					className: "mb-1 text-xs font-black uppercase tracking-widest text-slate-500 sm:mb-0 sm:w-1/3",
					children: spec.title
				}), /* @__PURE__ */ jsx("dd", {
					className: "text-sm font-bold text-slate-950 sm:w-2/3",
					children: spec.value
				})]
			}, idx))
		})]
	});
});
memo(function ExpertNotes({ adaptiveParts = false, comments }) {
	if (!comments?.length) return null;
	return /* @__PURE__ */ jsx("aside", {
		className: "lg:sticky lg:top-24",
		children: /* @__PURE__ */ jsxs("div", {
			"data-ab-surface": adaptiveParts ? "" : void 0,
			className: "overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 shadow-2xl shadow-slate-900/20",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "border-b border-white/10 p-5 sm:p-6",
				children: [/* @__PURE__ */ jsx("p", {
					className: "text-xs font-black uppercase tracking-[0.16em] text-cyan-200",
					children: "Buying guide"
				}), /* @__PURE__ */ jsxs("h3", {
					className: "mt-2 flex items-center text-xl font-black text-white",
					children: [/* @__PURE__ */ jsx(Zap, {
						size: 22,
						className: "mr-3 fill-current text-yellow-400"
					}), "Extra notes"]
				})]
			}), /* @__PURE__ */ jsx("div", {
				className: "divide-y divide-white/10",
				children: comments.map((comment, idx) => /* @__PURE__ */ jsxs("details", {
					"data-ab-surface": adaptiveParts ? "" : void 0,
					className: "group p-5 open:bg-white/[0.03] sm:p-6",
					open: idx === 0,
					children: [/* @__PURE__ */ jsxs("summary", {
						className: "flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black uppercase tracking-wider text-cyan-200",
						children: [/* @__PURE__ */ jsx("span", { children: comment.title }), /* @__PURE__ */ jsx(ChevronDown, {
							size: 17,
							className: "shrink-0 transition group-open:rotate-180"
						})]
					}), /* @__PURE__ */ jsx("p", {
						className: "mt-3 text-sm leading-6 text-white/70",
						children: comment.value
					})]
				}, idx))
			})]
		})
	});
});
const EmptyTabState = ({ adaptiveParts = false, label }) => /* @__PURE__ */ jsx("div", {
	"data-ab-surface": adaptiveParts ? "" : void 0,
	className: "rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center",
	children: /* @__PURE__ */ jsxs("p", {
		className: "text-sm font-bold text-slate-500",
		children: [label, " have not been added for this product yet."]
	})
});
const ProductInformationTabs = memo(function ProductInformationTabs({ adaptiveParts = false, presentationVariant, features, specifications, comments }) {
	const [activeTab, setActiveTab] = useState("details");
	const normalizedFeatures = useMemo(() => normalizeFeatures(features), [features]);
	const normalizedSpecifications = Array.isArray(specifications) ? specifications.filter((spec) => spec?.title && spec?.value) : [];
	const normalizedComments = Array.isArray(comments) ? comments.filter((comment) => comment?.title && comment?.value) : [];
	const tabs = [
		{
			id: "highlights",
			label: "Highlights",
			icon: Sparkles
		},
		{
			id: "details",
			label: "Details",
			icon: ClipboardList
		},
		{
			id: "buying-guide",
			label: "Buying guide",
			icon: Zap
		}
	];
	const handleTabKeyDown = (event, index) => {
		if (![
			"ArrowLeft",
			"ArrowRight",
			"Home",
			"End"
		].includes(event.key)) return;
		event.preventDefault();
		const nextTab = tabs[event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
		setActiveTab(nextTab.id);
		document.getElementById(`product-info-tab-${nextTab.id}`)?.focus();
	};
	return /* @__PURE__ */ jsxs("section", {
		"data-ab-surface": adaptiveParts ? "" : void 0,
		"data-atelier-part": presentationVariant === "atelier-editorial" ? "product-information" : void 0,
		className: "overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/60",
		children: [/* @__PURE__ */ jsx("div", {
			"data-ab-surface": adaptiveParts ? "" : void 0,
			role: "tablist",
			"aria-label": "Product information",
			className: "grid grid-cols-3 border-b border-slate-200 bg-slate-50",
			children: tabs.map((tab, index) => {
				const Icon = tab.icon;
				const selected = activeTab === tab.id;
				return /* @__PURE__ */ jsxs("button", {
					"data-ab-surface": adaptiveParts ? "" : void 0,
					id: `product-info-tab-${tab.id}`,
					type: "button",
					role: "tab",
					"aria-selected": selected,
					"aria-controls": `product-info-panel-${tab.id}`,
					tabIndex: selected ? 0 : -1,
					onClick: () => setActiveTab(tab.id),
					onKeyDown: (event) => handleTabKeyDown(event, index),
					className: `flex min-h-14 min-w-0 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-xs font-black transition sm:gap-2 sm:px-4 sm:text-sm ${selected ? "border-[var(--sf-accent)] bg-white text-[var(--sf-accent)]" : "border-transparent text-slate-500 hover:bg-white hover:text-slate-900"}`,
					children: [/* @__PURE__ */ jsx(Icon, {
						size: 16,
						className: "shrink-0"
					}), /* @__PURE__ */ jsx("span", {
						className: "min-w-0 leading-4",
						children: tab.label
					})]
				}, tab.id);
			})
		}), /* @__PURE__ */ jsxs("div", {
			id: `product-info-panel-${activeTab}`,
			role: "tabpanel",
			"aria-labelledby": `product-info-tab-${activeTab}`,
			className: "p-4 sm:p-6",
			children: [
				activeTab === "details" && (normalizedSpecifications.length ? /* @__PURE__ */ jsx("dl", {
					className: "overflow-hidden rounded-lg border border-slate-200",
					children: normalizedSpecifications.map((spec, index) => /* @__PURE__ */ jsxs("div", {
						className: "grid gap-1 border-b border-slate-200 px-4 py-4 last:border-0 sm:grid-cols-[minmax(130px,0.35fr)_1fr] sm:gap-5",
						children: [/* @__PURE__ */ jsx("dt", {
							className: "text-xs font-black uppercase tracking-wider text-slate-500",
							children: spec.title
						}), /* @__PURE__ */ jsx("dd", {
							className: "text-sm font-bold text-slate-950",
							children: spec.value
						})]
					}, `${spec.title}-${index}`))
				}) : /* @__PURE__ */ jsx(EmptyTabState, {
					adaptiveParts,
					label: "Product details"
				})),
				activeTab === "highlights" && (normalizedFeatures.length ? /* @__PURE__ */ jsx("div", {
					className: "grid grid-cols-1 gap-3 sm:grid-cols-2",
					children: normalizedFeatures.map((feature, index) => /* @__PURE__ */ jsxs("div", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						className: "rounded-lg border border-slate-200 bg-slate-50 p-4",
						children: [/* @__PURE__ */ jsx("h3", {
							className: "text-sm font-black text-slate-950",
							children: feature.point
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-2 text-sm leading-6 text-slate-600",
							children: feature.reason
						})]
					}, `${feature.point}-${index}`))
				}) : /* @__PURE__ */ jsx(EmptyTabState, {
					adaptiveParts,
					label: "Product highlights"
				})),
				activeTab === "buying-guide" && (normalizedComments.length ? /* @__PURE__ */ jsx("div", {
					className: "divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200",
					children: normalizedComments.map((comment, index) => /* @__PURE__ */ jsxs("details", {
						className: "group px-4 py-4",
						open: index === 0,
						children: [/* @__PURE__ */ jsxs("summary", {
							className: "flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black text-slate-950",
							children: [/* @__PURE__ */ jsx("span", { children: comment.title }), /* @__PURE__ */ jsx(ChevronDown, {
								size: 17,
								className: "shrink-0 text-[var(--sf-accent)] transition group-open:rotate-180"
							})]
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-3 text-sm leading-6 text-slate-600",
							children: comment.value
						})]
					}, `${comment.title}-${index}`))
				}) : /* @__PURE__ */ jsx(EmptyTabState, {
					adaptiveParts,
					label: "Buying guide notes"
				}))
			]
		})]
	});
});
//#endregion
//#region packages/storefront-renderer/presentation/ProductDetailsView.jsx
function ProductDetailsView({ product, currentVariant, displayStock, baseOriginalPrice, displayDiscount, displayFinalPrice, availableAttributes, selectedAttributes, handleVariantSelect, quantity, setQuantity, handleAddToCart, handleBuyNow, relatedContent, reviewContent, presentationVariant, adaptiveParts = false }) {
	const atelier = presentationVariant === "atelier-editorial";
	const maxQuantity = Math.max(Number(displayStock) || 0, 1);
	const decreaseQuantity = () => setQuantity((prev) => Math.max(1, prev - 1));
	const increaseQuantity = () => setQuantity((prev) => Math.min(maxQuantity, prev + 1));
	const productImages = Array.isArray(product.images) ? product.images : [];
	const galleryImages = currentVariant?.image ? [currentVariant.image, ...productImages.filter((image) => image !== currentVariant.image)] : productImages;
	return /* @__PURE__ */ jsxs("div", {
		className: atelier ? "sf-page sf-mobile-action-page atelier-product" : "sf-page sf-mobile-action-page",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "sf-shell-wide py-5 sm:py-8 lg:py-10",
			children: [
				/* @__PURE__ */ jsxs(Link, {
					href: "/",
					className: "mb-6 inline-flex items-center text-sm font-bold text-slate-500 transition-colors hover:text-[var(--sf-accent)] group",
					children: [/* @__PURE__ */ jsx("div", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						className: "mr-3 rounded-full bg-white p-2 shadow-sm transition-colors group-hover:bg-[var(--sf-accent)] group-hover:text-white",
						children: /* @__PURE__ */ jsx(ArrowLeft, { size: 16 })
					}), "Continue Shopping"]
				}),
				/* @__PURE__ */ jsxs("div", {
					"data-ab-layout": adaptiveParts ? "product" : void 0,
					"data-atelier-part": atelier ? "product-grid" : void 0,
					className: "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.82fr)] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.72fr)]",
					children: [/* @__PURE__ */ jsx(ProductImageGallery, {
						adaptiveParts,
						presentationVariant,
						images: galleryImages,
						category: product.category,
						displayDiscount,
						productTitle: product.title,
						imageAltText: product.imageAltText
					}), /* @__PURE__ */ jsx("aside", {
						className: "lg:sticky lg:top-28",
						children: /* @__PURE__ */ jsxs("div", {
							"data-ab-surface": adaptiveParts ? "" : void 0,
							"data-atelier-part": atelier ? "purchase-panel" : void 0,
							className: "rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-6 lg:rounded-[2.25rem] lg:p-7",
							children: [
								/* @__PURE__ */ jsx(ProductInfo, {
									adaptiveParts,
									presentationVariant,
									title: product.title,
									averageRating: product.averageRating,
									numReviews: product.numReviews,
									currentVariant,
									baseOriginalPrice,
									displayFinalPrice,
									displayDiscount,
									description: product.description
								}),
								/* @__PURE__ */ jsx("div", {
									"data-ab-surface": adaptiveParts ? "" : void 0,
									className: "my-6 h-px bg-slate-200"
								}),
								/* @__PURE__ */ jsx(VariantSelector, {
									adaptiveParts,
									presentationVariant,
									availableAttributes,
									selectedAttributes,
									variants: product.variants,
									onSelect: handleVariantSelect
								}),
								displayStock > 0 && /* @__PURE__ */ jsxs("div", {
									"data-ab-surface": adaptiveParts ? "" : void 0,
									"data-ab-part": adaptiveParts ? "quantity" : void 0,
									"data-atelier-part": atelier ? "quantity" : void 0,
									className: "my-5 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4",
									children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
										className: "text-sm font-black text-slate-950",
										children: "Quantity"
									}), /* @__PURE__ */ jsx("p", {
										className: "mt-1 text-xs font-semibold text-slate-500",
										children: "Choose how many units to add."
									})] }), /* @__PURE__ */ jsxs("div", {
										"data-ab-surface": adaptiveParts ? "" : void 0,
										className: "flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
										children: [
											/* @__PURE__ */ jsx("button", {
												"data-ab-surface": adaptiveParts ? "" : void 0,
												type: "button",
												onClick: decreaseQuantity,
												disabled: quantity <= 1,
												className: "flex h-11 w-11 items-center justify-center text-slate-500 transition hover:bg-slate-100 disabled:opacity-35",
												"aria-label": "Decrease quantity",
												children: /* @__PURE__ */ jsx(Minus, { size: 16 })
											}),
											/* @__PURE__ */ jsx("span", {
												className: "flex h-11 w-12 items-center justify-center border-x border-slate-200 text-sm font-black text-slate-950",
												children: quantity
											}),
											/* @__PURE__ */ jsx("button", {
												"data-ab-surface": adaptiveParts ? "" : void 0,
												type: "button",
												onClick: increaseQuantity,
												disabled: quantity >= maxQuantity,
												className: "flex h-11 w-11 items-center justify-center text-slate-500 transition hover:bg-slate-100 disabled:opacity-35",
												"aria-label": "Increase quantity",
												children: /* @__PURE__ */ jsx(Plus, { size: 16 })
											})
										]
									})]
								}),
								/* @__PURE__ */ jsx(ActionButtons, {
									adaptiveParts,
									presentationVariant,
									displayStock,
									onAddToCart: handleAddToCart,
									onBuyNow: handleBuyNow
								})
							]
						})
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "mt-12 border-t border-slate-200 pt-8",
					children: /* @__PURE__ */ jsx(ProductInformationTabs, {
						adaptiveParts,
						presentationVariant,
						features: product.features,
						specifications: product.specifications,
						comments: product.comments
					})
				}),
				relatedContent,
				reviewContent
			]
		}), displayStock > 0 && /* @__PURE__ */ jsx("div", {
			"data-ab-surface": adaptiveParts ? "" : void 0,
			className: "sf-mobile-action-bar fixed inset-x-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden",
			children: /* @__PURE__ */ jsxs("div", {
				className: "mx-auto grid max-w-xl gap-2 min-[390px]:grid-cols-[minmax(0,1fr)_auto] min-[390px]:items-center min-[390px]:gap-3",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ jsx("p", {
						className: "line-clamp-1 text-sm font-black text-slate-950",
						children: product.title
					}), /* @__PURE__ */ jsxs("p", {
						className: "text-base font-black text-[var(--sf-accent)]",
						children: ["৳ ", displayFinalPrice]
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "grid grid-cols-2 gap-2 min-[390px]:flex",
					children: [/* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: handleAddToCart,
						"data-ab-part": adaptiveParts ? "primaryButton" : void 0,
						"aria-label": `Add ${product.title} to cart`,
						className: "sf-btn sf-btn-secondary min-h-0 rounded-full px-4 py-3 text-sm",
						children: [/* @__PURE__ */ jsx(ShoppingCart, { size: 17 }), /* @__PURE__ */ jsx("span", { children: "Add" })]
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: handleBuyNow,
						"data-ab-part": adaptiveParts ? "primaryButton" : void 0,
						"aria-label": `Buy ${product.title} now`,
						className: "sf-btn sf-btn-primary min-h-0 rounded-full px-4 py-3 text-sm",
						children: "Buy now"
					})]
				})]
			})
		})]
	});
}
//#endregion
//#region packages/storefront-renderer/atelier/AtelierHeader.jsx
function AtelierHeader({ adaptiveParts = false, theme, brandName, badges, navigation, links, cartCount, onSearch, open, onToggle, onClose, LinkComponent }) {
	return /* @__PURE__ */ jsxs("header", {
		"data-ab-surface": adaptiveParts ? "" : void 0,
		className: "atelier-header",
		"data-compact": theme.mobile?.compactHeader !== false,
		onKeyDown: (event) => {
			if (event.key === "Escape") onClose();
		},
		children: [/* @__PURE__ */ jsxs("div", {
			"data-ab-surface": adaptiveParts ? "" : void 0,
			className: "atelier-container atelier-header-row",
			children: [
				/* @__PURE__ */ jsxs(LinkSlot, {
					"data-ab-part": adaptiveParts ? "identity" : void 0,
					LinkComponent,
					href: "/",
					prefetch: false,
					className: "atelier-wordmark",
					children: [theme.logoUrl && /* @__PURE__ */ jsx("img", {
						src: optimizeCloudinaryImage(theme.logoUrl, { width: 160 }),
						alt: "",
						width: "64",
						height: "64",
						decoding: "async"
					}), /* @__PURE__ */ jsxs("span", { children: [brandName, badges && /* @__PURE__ */ jsx("span", {
						className: "atelier-brand-badges",
						children: badges
					})] })]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "atelier-desktop-navigation",
					children: navigation
				}),
				/* @__PURE__ */ jsxs("div", {
					"data-ab-part": adaptiveParts ? "utilities" : void 0,
					className: "atelier-utilities",
					children: [
						/* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: onSearch,
							"aria-label": "Search products",
							children: [/* @__PURE__ */ jsx(Search, { size: 18 }), /* @__PURE__ */ jsx("span", { children: "Search" })]
						}),
						/* @__PURE__ */ jsxs(LinkSlot, {
							LinkComponent,
							href: "/account",
							"aria-label": "Customer account",
							children: [/* @__PURE__ */ jsx(User, { size: 18 }), /* @__PURE__ */ jsx("span", { children: "Account" })]
						}),
						/* @__PURE__ */ jsxs(LinkSlot, {
							LinkComponent,
							href: "/track",
							"aria-label": "Track order",
							children: [/* @__PURE__ */ jsx(Truck, { size: 18 }), /* @__PURE__ */ jsx("span", { children: "Track" })]
						}),
						/* @__PURE__ */ jsxs(LinkSlot, {
							LinkComponent,
							href: "/cart",
							"aria-label": `Cart, ${cartCount} items`,
							children: [
								/* @__PURE__ */ jsx(ShoppingBag, { size: 18 }),
								/* @__PURE__ */ jsx("span", { children: "Bag" }),
								/* @__PURE__ */ jsxs("b", {
									className: "atelier-cart-count",
									children: [
										"(",
										cartCount,
										")"
									]
								})
							]
						}),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							className: "atelier-menu-toggle",
							onClick: onToggle,
							"aria-label": open ? "Close menu" : "Open menu",
							"aria-expanded": open,
							"aria-controls": "atelier-mobile-navigation",
							children: open ? /* @__PURE__ */ jsx(X, { size: 22 }) : /* @__PURE__ */ jsx(Menu, { size: 22 })
						})
					]
				})
			]
		}), open && /* @__PURE__ */ jsx("nav", {
			"data-ab-part": adaptiveParts ? "navigation" : void 0,
			id: "atelier-mobile-navigation",
			className: "atelier-mobile-navigation atelier-container",
			"aria-label": "Store navigation",
			children: links.map((item, index) => /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(LinkSlot, {
				LinkComponent,
				href: item.url || "#",
				onClick: onClose,
				children: item.label
			}), item.children?.length > 0 && /* @__PURE__ */ jsx("ul", { children: item.children.map((child, childIndex) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(LinkSlot, {
				LinkComponent,
				href: child.url,
				onClick: onClose,
				children: child.label
			}) }, `${child.label}-${childIndex}`)) })] }, `${item.label}-${index}`))
		})]
	});
}
//#endregion
//#region packages/storefront-renderer/reference/StorefrontHeader.jsx
const TrustedBadge = ({ adaptiveParts = false, badge }) => {
	if (!badge?.active) return null;
	return /* @__PURE__ */ jsxs("span", {
		"data-ab-surface": adaptiveParts ? "" : void 0,
		className: "mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase text-emerald-800 ring-1 ring-emerald-200",
		title: badge.tooltip || "Verified by ScaleUp based on identity verification, sales history, store age, and customer review quality.",
		"aria-label": `${badge.label || "ScaleUp Trusted"}: ${badge.tooltip || "Verified by ScaleUp"}`,
		children: [/* @__PURE__ */ jsx(ShieldCheck, { className: "h-3 w-3 shrink-0" }), /* @__PURE__ */ jsx("span", {
			className: "truncate",
			children: badge.label || "ScaleUp Trusted"
		})]
	});
};
const VerifiedSellerBadge = ({ adaptiveParts = false, verification }) => {
	if (!verification?.isVerified) return null;
	return /* @__PURE__ */ jsxs("span", {
		"data-ab-surface": adaptiveParts ? "" : void 0,
		className: "mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-black uppercase text-sky-800 ring-1 ring-sky-200",
		title: "This seller has completed Scaleup identity and phone verification.",
		"aria-label": "Verified seller: completed Scaleup identity and phone verification",
		children: [/* @__PURE__ */ jsx(ShieldCheck, { className: "h-3 w-3 shrink-0" }), /* @__PURE__ */ jsx("span", {
			className: "truncate",
			children: verification.label || "Verified seller"
		})]
	});
};
const BrandMark = ({ adaptiveParts = false, theme, brandName, trustedBadge, shopVerification, compact = false }) => /* @__PURE__ */ jsxs("span", {
	"data-ab-part": adaptiveParts ? "identity" : void 0,
	className: `flex min-w-0 items-center ${compact ? "gap-2" : "gap-2.5 sm:gap-3"}`,
	children: [theme.logoUrl ? /* @__PURE__ */ jsx("img", {
		src: optimizeCloudinaryImage(theme.logoUrl, { width: 96 }),
		alt: brandName,
		width: "48",
		height: "48",
		className: `${compact ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl sm:h-12 sm:w-12"} border border-slate-200 object-cover shadow-sm`,
		loading: "eager",
		decoding: "async"
	}) : /* @__PURE__ */ jsx("span", {
		"data-ab-surface": adaptiveParts ? "" : void 0,
		className: `flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-teal-600 text-sm font-black text-white shadow-sm shadow-teal-900/20 ${compact ? "h-9 w-9" : "h-11 w-11 sm:h-12 sm:w-12"}`,
		children: brandName.slice(0, 1).toUpperCase()
	}), /* @__PURE__ */ jsxs("span", {
		className: "min-w-0",
		children: [
			/* @__PURE__ */ jsx("span", {
				className: "block truncate text-base font-black leading-tight text-[var(--sf-navbar-text)] sm:text-lg",
				children: brandName
			}),
			/* @__PURE__ */ jsx("span", {
				className: "hidden truncate text-xs font-semibold text-[var(--sf-navbar-muted-text)] sm:block",
				children: "Storefront"
			}),
			/* @__PURE__ */ jsx(VerifiedSellerBadge, {
				adaptiveParts,
				verification: shopVerification
			}),
			/* @__PURE__ */ jsx(TrustedBadge, {
				adaptiveParts,
				badge: trustedBadge
			})
		]
	})]
});
const HeaderNavItem = ({ adaptiveParts = false, item, LinkComponent, onClick }) => {
	const children = item.children || [];
	if (!(children.length > 0)) return /* @__PURE__ */ jsx(LinkSlot, {
		LinkComponent,
		href: item.url || "#",
		prefetch: false,
		onClick,
		className: "inline-flex max-w-32 items-center rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-[var(--sf-navbar-hover)]",
		title: item.label,
		children: /* @__PURE__ */ jsx("span", {
			className: "truncate whitespace-nowrap",
			children: item.label
		})
	});
	return /* @__PURE__ */ jsxs("div", {
		className: item.megaMenu ? "group" : "group relative",
		"data-navigation-layout": item.megaMenu ? "mega" : "dropdown",
		children: [/* @__PURE__ */ jsxs(LinkSlot, {
			LinkComponent,
			href: item.url || "#",
			prefetch: false,
			onClick,
			className: "inline-flex max-w-36 items-center gap-1 rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-[var(--sf-navbar-hover)]",
			title: item.label,
			children: [/* @__PURE__ */ jsx("span", {
				className: "truncate whitespace-nowrap",
				children: item.label
			}), /* @__PURE__ */ jsx(ChevronDown, {
				size: 14,
				className: "shrink-0 transition group-hover:rotate-180"
			})]
		}), /* @__PURE__ */ jsx("div", {
			"data-ab-surface": adaptiveParts ? "" : void 0,
			className: `invisible absolute top-full z-40 translate-y-2 rounded-2xl border p-2 opacity-0 shadow-xl shadow-slate-900/10 transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 ${item.megaMenu ? "inset-x-4 grid grid-cols-2 gap-2 lg:grid-cols-3" : "left-0 min-w-56"}`,
			style: {
				backgroundColor: "var(--sf-header-background)",
				borderColor: "var(--sf-header-border)"
			},
			children: children.map((child, index) => /* @__PURE__ */ jsx(LinkSlot, {
				LinkComponent,
				href: child.url,
				prefetch: false,
				onClick,
				className: "block rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-[var(--sf-navbar-hover)]",
				children: child.label
			}, `${child.label}-${index}`))
		})]
	});
};
const HeaderOverflowMenu = ({ adaptiveParts = false, items, LinkComponent }) => {
	if (!items.length) return null;
	return /* @__PURE__ */ jsxs("div", {
		className: "group relative",
		children: [/* @__PURE__ */ jsxs("button", {
			"data-ab-surface": adaptiveParts ? "" : void 0,
			type: "button",
			className: "inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm font-bold text-[var(--sf-navbar-text)] transition hover:bg-slate-100 hover:text-[var(--sf-navbar-hover)]",
			"aria-label": "Open more navigation links",
			"aria-haspopup": "menu",
			children: ["More", /* @__PURE__ */ jsx(ChevronDown, {
				size: 14,
				className: "transition group-hover:rotate-180 group-focus-within:rotate-180"
			})]
		}), /* @__PURE__ */ jsx("div", {
			"data-ab-surface": adaptiveParts ? "" : void 0,
			role: "menu",
			className: "invisible absolute right-0 top-full z-40 min-w-56 max-w-72 translate-y-2 rounded-2xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl shadow-slate-900/10 transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100",
			children: items.map((item, index) => /* @__PURE__ */ jsxs("div", {
				role: "none",
				children: [/* @__PURE__ */ jsx(LinkSlot, {
					LinkComponent,
					href: item.url || "#",
					prefetch: false,
					className: "block truncate rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-[var(--sf-navbar-hover)]",
					role: "menuitem",
					title: item.label,
					children: item.label
				}), (item.children || []).map((child, childIndex) => /* @__PURE__ */ jsx(LinkSlot, {
					LinkComponent,
					href: child.url || "#",
					prefetch: false,
					className: "ml-3 block truncate rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-[var(--sf-navbar-hover)]",
					role: "menuitem",
					title: child.label,
					children: child.label
				}, `${child.label}-${childIndex}`))]
			}, `${item.label}-${index}`))
		})]
	});
};
function ReferenceStorefrontHeader({ adaptiveParts = false, theme: themeCandidate, shopName, subdomain, cartCount = 0, onSearch = noop, LinkComponent = DefaultLink, preview = false, previewDevice, editor, trustedBadge, shopVerification }) {
	const theme = resolveEffectiveTheme(themeCandidate);
	const headerVariant = theme.header?.variant || "standard";
	const storefrontContainerClass = getContainerClass(theme.layout);
	const compactMobileHeader = theme.mobile?.compactHeader !== false;
	const brandName = shopName || subdomain || "Storefront";
	const headerNavLinks = getSortedNavigation(theme).filter((item) => ![
		"track order",
		"account",
		"cart"
	].includes(String(item.label || "").toLowerCase()));
	const visibleHeaderNavLinks = headerNavLinks.slice(0, 3);
	const overflowHeaderNavLinks = headerNavLinks.slice(3);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const forcedDesktopLayoutClass = "grid-cols-[minmax(190px,0.8fr)_minmax(0,1fr)_minmax(260px,1.05fr)]";
	const desktopLayoutClass = "lg:grid-cols-[minmax(190px,0.8fr)_minmax(0,1fr)_minmax(260px,1.05fr)]";
	const brandSlot = /* @__PURE__ */ jsx(LinkSlot, {
		LinkComponent,
		href: "/",
		prefetch: false,
		className: "min-w-0",
		children: /* @__PURE__ */ jsx(BrandMark, {
			adaptiveParts,
			theme,
			brandName,
			trustedBadge,
			shopVerification
		})
	});
	const searchSlot = /* @__PURE__ */ jsx("div", {
		"data-ab-part": adaptiveParts ? "utilities" : void 0,
		className: "flex min-w-0 justify-center",
		children: /* @__PURE__ */ jsxs("button", {
			"data-ab-surface": adaptiveParts ? "" : void 0,
			type: "button",
			onClick: onSearch,
			"aria-label": "Search products",
			className: "flex h-11 w-full max-w-[420px] min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-500 transition hover:border-[var(--sf-accent-soft)] hover:bg-white hover:text-slate-900 xl:px-5",
			children: [/* @__PURE__ */ jsx(Search, {
				size: 17,
				className: "shrink-0"
			}), /* @__PURE__ */ jsx("span", {
				className: "truncate",
				children: "Search products"
			})]
		})
	});
	const navigationSlot = /* @__PURE__ */ jsxs("nav", {
		"data-ab-part": adaptiveParts ? "navigation" : void 0,
		className: "flex min-w-0 items-center justify-center gap-0.5 overflow-visible text-sm font-bold text-[var(--sf-navbar-text)] 2xl:gap-1",
		children: [visibleHeaderNavLinks.map((item, index) => /* @__PURE__ */ jsx(HeaderNavItem, {
			adaptiveParts,
			item,
			LinkComponent
		}, `${item.label}-${index}`)), /* @__PURE__ */ jsx(HeaderOverflowMenu, {
			adaptiveParts,
			items: overflowHeaderNavLinks,
			LinkComponent
		})]
	});
	const utilitySlot = /* @__PURE__ */ jsxs("div", {
		"data-ab-part": adaptiveParts ? "utilities" : void 0,
		className: "flex shrink-0 items-center justify-end gap-1 xl:gap-2",
		children: [
			/* @__PURE__ */ jsxs(LinkSlot, {
				LinkComponent,
				href: "/track",
				prefetch: false,
				className: "inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-2 text-sm font-bold text-[var(--sf-navbar-text)] transition hover:bg-slate-100 hover:text-[var(--sf-navbar-hover)] xl:px-3",
				children: [/* @__PURE__ */ jsx(Truck, {
					size: 17,
					className: "shrink-0"
				}), /* @__PURE__ */ jsx("span", {
					className: "hidden 2xl:inline",
					children: "Track Order"
				})]
			}),
			/* @__PURE__ */ jsxs(LinkSlot, {
				LinkComponent,
				href: "/account",
				prefetch: false,
				className: "inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-2 text-sm font-bold text-[var(--sf-navbar-text)] transition hover:bg-slate-100 hover:text-[var(--sf-navbar-hover)] xl:px-3",
				children: [/* @__PURE__ */ jsx(User, {
					size: 17,
					className: "shrink-0"
				}), /* @__PURE__ */ jsx("span", {
					className: "hidden 2xl:inline",
					children: "Account"
				})]
			}),
			/* @__PURE__ */ jsxs(LinkSlot, {
				LinkComponent,
				href: "/cart",
				prefetch: false,
				className: "relative inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--sf-primary-button-bg)] px-3 text-sm font-black text-[var(--sf-primary-button-text)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--sf-primary-button-hover-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)] xl:px-4",
				children: [
					/* @__PURE__ */ jsx(ShoppingBag, {
						size: 17,
						className: "shrink-0"
					}),
					/* @__PURE__ */ jsx("span", {
						className: "hidden 2xl:inline",
						children: "Cart"
					}),
					cartCount > 0 && /* @__PURE__ */ jsx("span", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						className: "absolute -right-1.5 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black",
						style: {
							backgroundColor: "var(--sf-header-cart-badge-bg)",
							color: "var(--sf-header-cart-badge-text)"
						},
						children: cartCount
					})
				]
			})
		]
	});
	const compactSearchSlot = /* @__PURE__ */ jsx("button", {
		"data-ab-part": adaptiveParts ? "utilities" : void 0,
		"data-ab-surface": adaptiveParts ? "" : void 0,
		type: "button",
		onClick: onSearch,
		"aria-label": "Search products",
		className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-[var(--sf-accent-soft)] hover:bg-white hover:text-[var(--sf-navbar-hover)]",
		children: /* @__PURE__ */ jsx(Search, { size: 18 })
	});
	const standardActionSlot = /* @__PURE__ */ jsxs("div", {
		className: "flex min-w-0 items-center justify-end gap-1 xl:gap-2",
		children: [/* @__PURE__ */ jsx("div", {
			className: "mr-1 hidden min-w-0 xl:block 2xl:mr-2",
			children: navigationSlot
		}), utilitySlot]
	});
	const forceNarrowHeader = isPreviewNarrow(previewDevice);
	const desktopHeaderClass = previewDevice ? forceNarrowHeader ? "hidden" : headerVariant === "centered" ? "block py-4" : "flex h-[76px] items-center gap-6" : headerVariant === "centered" ? "hidden py-4 lg:block" : "hidden h-[76px] items-center gap-6 lg:flex";
	const mobileHeaderClass = previewDevice ? forceNarrowHeader ? `flex items-center justify-between gap-2.5 ${compactMobileHeader ? "h-[58px] sm:h-[64px]" : "h-[72px] sm:h-[80px]"}` : "hidden" : `flex items-center justify-between gap-2.5 lg:hidden ${compactMobileHeader ? "h-[58px] sm:h-[64px]" : "h-[72px] sm:h-[80px]"}`;
	const mobileSearchClass = headerVariant === "minimal" ? "hidden" : previewDevice ? forceNarrowHeader ? compactMobileHeader ? "pb-2.5" : "pb-4" : "hidden" : `${compactMobileHeader ? "pb-2.5" : "pb-4"} lg:hidden`;
	const desktopHeader = headerVariant === "minimal" ? /* @__PURE__ */ jsxs("div", {
		className: "grid w-full min-w-0 grid-cols-[minmax(170px,0.7fr)_minmax(0,1fr)_auto] items-center gap-4",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "min-w-0",
				children: brandSlot
			}),
			/* @__PURE__ */ jsx("div", {
				className: "min-w-0",
				children: navigationSlot
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-1",
				children: [compactSearchSlot, utilitySlot]
			})
		]
	}) : headerVariant === "centered" ? /* @__PURE__ */ jsxs("div", {
		className: "min-w-0",
		"data-header-composition": "centered",
		children: [/* @__PURE__ */ jsx("div", {
			className: "flex justify-center",
			children: brandSlot
		}), /* @__PURE__ */ jsxs("div", {
			className: "mt-3 grid grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)_minmax(0,1fr)] items-center gap-4 border-t pt-3",
			style: { borderColor: "var(--sf-header-border)" },
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "min-w-0 justify-self-start",
					children: navigationSlot
				}),
				/* @__PURE__ */ jsx("div", {
					className: "min-w-0",
					children: searchSlot
				}),
				/* @__PURE__ */ jsx("div", {
					className: "justify-self-end",
					children: utilitySlot
				})
			]
		})]
	}) : /* @__PURE__ */ jsx("div", {
		className: `grid w-full min-w-0 items-center gap-6 ${previewDevice ? forcedDesktopLayoutClass : desktopLayoutClass}`,
		children: [
			brandSlot,
			searchSlot,
			standardActionSlot
		].map((slot, index) => /* @__PURE__ */ jsx("div", {
			className: "min-w-0",
			children: slot
		}, index))
	});
	if (getStorefrontPresentationVariant(theme) === "atelier-editorial") return /* @__PURE__ */ jsx(EditorSelectionFrame, {
		editor,
		id: "header",
		label: "Navbar",
		locked: true,
		children: /* @__PURE__ */ jsx(AtelierHeader, {
			adaptiveParts,
			theme,
			brandName,
			badges: /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(VerifiedSellerBadge, {
				adaptiveParts,
				verification: shopVerification
			}), /* @__PURE__ */ jsx(TrustedBadge, {
				adaptiveParts,
				badge: trustedBadge
			})] }),
			navigation: navigationSlot,
			links: [
				...headerNavLinks,
				{
					label: "Track Order",
					url: "/track"
				},
				{
					label: "Account",
					url: "/account"
				},
				{
					label: "Cart",
					url: "/cart"
				}
			],
			cartCount,
			onSearch,
			open: mobileMenuOpen,
			onToggle: () => setMobileMenuOpen((value) => !value),
			onClose: () => setMobileMenuOpen(false),
			LinkComponent
		})
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(EditorSelectionFrame, {
		editor,
		id: "header",
		label: "Navbar",
		locked: true,
		children: /* @__PURE__ */ jsx("header", {
			"data-ab-surface": adaptiveParts ? "" : void 0,
			"data-structural-variant": headerVariant,
			className: "sticky top-0 z-50 border-b bg-[var(--sf-navbar-background)] text-[var(--sf-navbar-text)] backdrop-blur-xl",
			style: { borderColor: "var(--sf-header-border)" },
			children: /* @__PURE__ */ jsxs("div", {
				className: storefrontContainerClass,
				children: [
					/* @__PURE__ */ jsx("div", {
						"data-ab-layout": adaptiveParts ? "headerDesktop" : void 0,
						className: desktopHeaderClass,
						children: desktopHeader
					}),
					/* @__PURE__ */ jsxs("div", {
						"data-ab-layout": adaptiveParts ? "headerMobile" : void 0,
						className: mobileHeaderClass,
						children: [
							/* @__PURE__ */ jsx("button", {
								"data-ab-surface": adaptiveParts ? "" : void 0,
								type: "button",
								onClick: () => setMobileMenuOpen(true),
								className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--sf-header-border)] bg-[var(--sf-header-background)] text-[var(--sf-header-icon)] sm:h-11 sm:w-11",
								"aria-label": "Open menu",
								children: /* @__PURE__ */ jsx(Menu, { size: 20 })
							}),
							/* @__PURE__ */ jsx(LinkSlot, {
								LinkComponent,
								href: "/",
								prefetch: false,
								className: `min-w-0 flex-1 ${headerVariant === "centered" ? "flex justify-center" : ""}`,
								children: /* @__PURE__ */ jsx(BrandMark, {
									adaptiveParts,
									theme,
									brandName,
									trustedBadge,
									shopVerification,
									compact: compactMobileHeader
								})
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "flex shrink-0 items-center gap-1",
								children: [headerVariant === "minimal" && /* @__PURE__ */ jsx("button", {
									"data-ab-surface": adaptiveParts ? "" : void 0,
									type: "button",
									onClick: onSearch,
									"aria-label": "Search products",
									className: "flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--sf-header-border)] bg-[var(--sf-header-background)] text-[var(--sf-header-icon)] sm:h-11 sm:w-11",
									children: /* @__PURE__ */ jsx(Search, { size: 18 })
								}), /* @__PURE__ */ jsxs(LinkSlot, {
									LinkComponent,
									href: "/cart",
									prefetch: false,
									className: "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--sf-primary-button-bg)] text-[var(--sf-primary-button-text)] shadow-sm sm:h-11 sm:w-11",
									"aria-label": "Cart",
									children: [/* @__PURE__ */ jsx(ShoppingBag, { size: 18 }), cartCount > 0 && /* @__PURE__ */ jsx("span", {
										"data-ab-surface": adaptiveParts ? "" : void 0,
										className: "absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black",
										style: {
											backgroundColor: "var(--sf-header-cart-badge-bg)",
											color: "var(--sf-header-cart-badge-text)"
										},
										children: cartCount
									})]
								})]
							})
						]
					}),
					/* @__PURE__ */ jsx("div", {
						"data-ab-layout": adaptiveParts && headerVariant !== "minimal" ? "headerMobileSearch" : void 0,
						className: mobileSearchClass,
						children: /* @__PURE__ */ jsxs("button", {
							"data-ab-surface": adaptiveParts ? "" : void 0,
							type: "button",
							onClick: onSearch,
							"aria-label": "Search products",
							className: "flex h-10 w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-500 shadow-sm shadow-slate-200/50",
							children: [/* @__PURE__ */ jsx(Search, {
								size: 16,
								className: "shrink-0"
							}), /* @__PURE__ */ jsx("span", {
								className: "truncate",
								children: "Search products"
							})]
						})
					})
				]
			})
		})
	}), mobileMenuOpen && !preview && /* @__PURE__ */ jsx("div", {
		"data-ab-surface": adaptiveParts ? "" : void 0,
		className: "fixed inset-0 z-[90] bg-slate-950/50 backdrop-blur-sm lg:hidden",
		onClick: () => setMobileMenuOpen(false),
		children: /* @__PURE__ */ jsxs("aside", {
			"data-ab-surface": adaptiveParts ? "" : void 0,
			className: "h-full w-[86vw] max-w-sm bg-white p-5 shadow-2xl",
			onClick: (event) => event.stopPropagation(),
			children: [/* @__PURE__ */ jsxs("div", {
				className: "mb-6 flex items-center justify-between gap-4",
				children: [/* @__PURE__ */ jsx(BrandMark, {
					adaptiveParts,
					theme,
					brandName,
					trustedBadge,
					shopVerification
				}), /* @__PURE__ */ jsx("button", {
					"data-ab-surface": adaptiveParts ? "" : void 0,
					type: "button",
					onClick: () => setMobileMenuOpen(false),
					className: "flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700",
					"aria-label": "Close menu",
					children: /* @__PURE__ */ jsx(X, { size: 20 })
				})]
			}), /* @__PURE__ */ jsx("nav", {
				"data-ab-part": adaptiveParts ? "navigation" : void 0,
				className: "grid gap-2",
				children: [
					...headerNavLinks,
					{
						label: "Track Order",
						url: "/track"
					},
					{
						label: "Account",
						url: "/account"
					}
				].map((item, index) => /* @__PURE__ */ jsxs("div", {
					"data-ab-surface": adaptiveParts ? "" : void 0,
					className: "rounded-2xl border border-slate-200 bg-white",
					children: [/* @__PURE__ */ jsx(LinkSlot, {
						LinkComponent,
						href: item.url || "#",
						prefetch: false,
						onClick: () => setMobileMenuOpen(false),
						className: "block px-4 py-3 text-sm font-black text-slate-800 transition hover:text-[var(--sf-navbar-hover)]",
						children: item.label
					}), (item.children || []).length > 0 && /* @__PURE__ */ jsx("div", {
						className: "border-t border-slate-100 px-3 pb-3",
						children: item.children.map((child, childIndex) => /* @__PURE__ */ jsx(LinkSlot, {
							LinkComponent,
							href: child.url,
							prefetch: false,
							onClick: () => setMobileMenuOpen(false),
							className: "mt-2 block rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600",
							children: child.label
						}, `${child.label}-${childIndex}`))
					})]
				}, `${item.label}-${index}`))
			})]
		})
	})] });
}
//#endregion
//#region packages/storefront-renderer/atelier/AtelierFooter.jsx
function AtelierFooter({ adaptiveParts = false, theme, brandName, storeLinks, supportLinks, contactHref, socialLinks, shopVerification, LinkComponent }) {
	const column = (title, links) => /* @__PURE__ */ jsxs("div", {
		"data-ab-part": adaptiveParts ? title === "Support" ? "policies" : "navigation" : void 0,
		children: [/* @__PURE__ */ jsx("h3", { children: title }), /* @__PURE__ */ jsx("ul", { children: links.map((item, index) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(LinkSlot, {
			LinkComponent,
			href: item.href,
			children: item.label
		}) }, `${item.href}-${index}`)) })]
	});
	return /* @__PURE__ */ jsx("footer", {
		"data-ab-surface": adaptiveParts ? "" : void 0,
		className: "atelier-footer",
		children: /* @__PURE__ */ jsxs("div", {
			className: "atelier-container",
			children: [/* @__PURE__ */ jsxs("div", {
				"data-ab-surface": adaptiveParts ? "" : void 0,
				className: "atelier-footer-grid",
				children: [
					/* @__PURE__ */ jsxs("div", {
						"data-ab-part": adaptiveParts ? "identity" : void 0,
						"data-ab-surface": adaptiveParts ? "" : void 0,
						className: "atelier-footer-identity",
						children: [
							/* @__PURE__ */ jsx("h2", { children: brandName }),
							theme.footer?.text && /* @__PURE__ */ jsx("p", { children: theme.footer.text }),
							shopVerification?.isVerified && /* @__PURE__ */ jsxs("span", {
								className: "atelier-verified",
								children: [/* @__PURE__ */ jsx(CircleCheck, { size: 16 }), shopVerification.label || "Verified seller"]
							})
						]
					}),
					column("Store", storeLinks),
					column("Support", supportLinks),
					(contactHref || socialLinks.length > 0) && /* @__PURE__ */ jsxs("div", { children: [
						/* @__PURE__ */ jsx("h3", { children: "Connect" }),
						contactHref && /* @__PURE__ */ jsx(LinkSlot, {
							LinkComponent,
							href: contactHref,
							children: theme.footer?.contactLabel || "Contact store"
						}),
						/* @__PURE__ */ jsx("ul", { children: socialLinks.map((item) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(LinkSlot, {
							LinkComponent,
							href: item.href,
							target: "_blank",
							rel: "noopener noreferrer",
							children: item.label
						}) }, item.key)) })
					] })
				]
			}), /* @__PURE__ */ jsxs("div", {
				"data-ab-surface": adaptiveParts ? "" : void 0,
				className: "atelier-footer-bottom",
				children: [/* @__PURE__ */ jsxs("p", { children: [
					"© ",
					(/* @__PURE__ */ new Date()).getFullYear(),
					" ",
					brandName,
					". Powered by Scaleup."
				] }), /* @__PURE__ */ jsx("p", { children: "Secure checkout · Privacy-friendly analytics" })]
			})]
		})
	});
}
//#endregion
//#region packages/storefront-renderer/reference/StorefrontFooter.jsx
const FooterColumn = ({ adaptiveParts = false, title, links, LinkComponent }) => /* @__PURE__ */ jsxs("div", {
	"data-ab-part": adaptiveParts ? "navigation" : void 0,
	children: [/* @__PURE__ */ jsx("h3", {
		className: "text-sm font-black",
		style: {
			...headingStyle,
			color: "var(--sf-footer-heading)"
		},
		children: title
	}), /* @__PURE__ */ jsx("div", {
		className: "mt-4 grid gap-3 text-sm font-semibold text-[var(--sf-footer-link)]",
		children: links.map((link) => /* @__PURE__ */ jsx(LinkSlot, {
			LinkComponent,
			href: link.href,
			prefetch: false,
			className: "transition hover:text-[var(--sf-footer-link-hover)]",
			children: link.label
		}, link.label))
	})]
});
const FooterSupportColumn = ({ adaptiveParts = false, links, contactHref, contactLabel, socialLinks, LinkComponent }) => /* @__PURE__ */ jsxs("div", {
	"data-ab-part": adaptiveParts ? "policies" : void 0,
	children: [
		/* @__PURE__ */ jsx("h3", {
			className: "text-sm font-black",
			style: {
				...headingStyle,
				color: "var(--sf-footer-heading)"
			},
			children: "Support"
		}),
		/* @__PURE__ */ jsx("div", {
			className: "mt-4 grid gap-3 text-sm font-semibold text-[var(--sf-footer-link)]",
			children: links.map((link) => /* @__PURE__ */ jsx(LinkSlot, {
				LinkComponent,
				href: link.href,
				prefetch: false,
				className: "transition hover:text-[var(--sf-footer-link-hover)]",
				children: link.label
			}, link.label))
		}),
		contactHref && /* @__PURE__ */ jsxs(LinkSlot, {
			LinkComponent,
			href: contactHref,
			prefetch: false,
			className: "mt-6 inline-flex items-center gap-2 text-base font-black text-[var(--sf-footer-link)] transition hover:text-[var(--sf-footer-link-hover)]",
			children: [/* @__PURE__ */ jsx(Mail, { size: 18 }), contactLabel]
		}),
		socialLinks.length > 0 && /* @__PURE__ */ jsx("div", {
			className: "mt-7 flex flex-wrap items-center gap-3",
			children: socialLinks.map((item) => /* @__PURE__ */ jsx(LinkSlot, {
				LinkComponent,
				href: item.href,
				prefetch: false,
				target: "_blank",
				rel: "noreferrer",
				"aria-label": item.label,
				className: "flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-xs font-black uppercase text-[var(--sf-footer-link)] transition hover:bg-[var(--sf-footer-link-hover)] hover:text-white",
				children: item.short
			}, item.key))
		})
	]
});
const FooterAccordion = ({ adaptiveParts = false, title, links, LinkComponent }) => /* @__PURE__ */ jsxs("details", {
	"data-ab-part": adaptiveParts ? title === "Support" ? "policies" : "navigation" : void 0,
	className: "group border-b py-3.5",
	style: { borderColor: "var(--sf-footer-border)" },
	children: [/* @__PURE__ */ jsxs("summary", {
		className: "flex cursor-pointer list-none items-center justify-between text-sm font-black",
		style: {
			...headingStyle,
			color: "var(--sf-footer-heading)"
		},
		children: [title, /* @__PURE__ */ jsx(ChevronDown, {
			size: 17,
			className: "transition group-open:rotate-180"
		})]
	}), /* @__PURE__ */ jsx("div", {
		className: "mt-3 grid gap-2.5 pb-1 text-sm font-semibold text-[var(--sf-footer-link)]",
		children: links.map((link) => /* @__PURE__ */ jsx(LinkSlot, {
			LinkComponent,
			href: link.href,
			prefetch: false,
			className: "transition hover:text-[var(--sf-footer-link-hover)]",
			children: link.label
		}, link.label))
	})]
});
const socialPlatforms = [
	{
		key: "facebookUrl",
		label: "Facebook",
		short: "f"
	},
	{
		key: "instagramUrl",
		label: "Instagram",
		short: "ig"
	},
	{
		key: "twitterUrl",
		label: "X / Twitter",
		short: "x"
	},
	{
		key: "youtubeUrl",
		label: "YouTube",
		short: "yt"
	},
	{
		key: "tiktokUrl",
		label: "TikTok",
		short: "tt"
	}
];
const policyLinks = [
	{
		label: "Shipping Policy",
		href: "/policies/shipping"
	},
	{
		label: "Refund Policy",
		href: "/policies/refund"
	},
	{
		label: "Privacy Policy",
		href: "/policies/privacy"
	},
	{
		label: "Terms & Conditions",
		href: "/policies/terms"
	}
];
const getInitials = (name = "") => {
	const words = String(name || "Storefront").trim().split(/\s+/).filter(Boolean);
	if (!words.length) return "S";
	return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
};
const buildMailto = (email = "") => {
	const cleanEmail = String(email || "").trim();
	return cleanEmail ? `mailto:${cleanEmail}` : "";
};
function ReferenceStorefrontFooter({ adaptiveParts = false, theme: themeCandidate, shopName, subdomain, cartCount = 0, LinkComponent = DefaultLink, preview = false, previewDevice, editor, shopVerification }) {
	const theme = resolveEffectiveTheme(themeCandidate);
	const storefrontContainerClass = getContainerClass(theme.layout);
	const brandName = shopName || subdomain || "Storefront";
	const footerLinks = (theme.footer?.links || []).filter((item) => item?.label && item?.url);
	const navigationLinks = getSortedNavigation(theme).map((item) => ({
		label: item.label,
		href: item.url
	}));
	const storeLinks = [
		...navigationLinks.length ? navigationLinks : [
			{
				label: "Shop",
				href: "/"
			},
			{
				label: "Policies",
				href: "/policies"
			},
			{
				label: "Track Order",
				href: "/track"
			}
		],
		{
			label: "Account",
			href: "/account"
		},
		{
			label: "Cart",
			href: "/cart"
		}
	].slice(0, 8);
	const supportLinks = [...policyLinks, ...footerLinks.map((item) => ({
		label: item.label,
		href: item.url
	}))].slice(0, 10);
	const contactHref = buildMailto(theme.footer?.contactEmail);
	const socialLinks = socialPlatforms.map((item) => ({
		...item,
		href: theme.footer?.[item.key] || ""
	})).filter((item) => item.href);
	const forceNarrowFooter = isPreviewNarrow(previewDevice);
	const footerGridClass = `grid min-w-0 gap-6 sm:gap-9 ${forceNarrowFooter ? "" : "lg:grid-cols-[1.25fr_0.7fr_1fr] xl:gap-20"}`;
	const desktopColumnsClass = forceNarrowFooter ? "hidden" : "hidden lg:contents";
	const mobileColumnsClass = forceNarrowFooter ? "block" : "lg:hidden";
	const bottomNavClass = `${preview ? "sticky bottom-0" : "fixed inset-x-0 bottom-0"} z-50 ${previewDevice ? previewDevice === "desktop" ? "hidden" : "grid" : "grid md:hidden"} grid-cols-5 border-t border-slate-200 bg-white/95 px-1 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur`;
	const bottomNavStyle = preview ? { minHeight: "4rem" } : {
		height: "var(--sf-mobile-nav-offset, calc(4rem + env(safe-area-inset-bottom)))",
		paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))"
	};
	const mobileLinks = [
		{
			label: "Home",
			href: "/",
			icon: Home
		},
		{
			label: "Search",
			href: "/#products",
			icon: Search
		},
		{
			label: "Track",
			href: "/track",
			icon: Truck
		},
		{
			label: "Account",
			href: "/account",
			icon: User
		},
		{
			label: "Cart",
			href: "/cart",
			icon: ShoppingBag,
			badge: cartCount
		}
	];
	const isVerifiedSeller = Boolean(shopVerification?.isVerified);
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(EditorSelectionFrame, {
		editor,
		id: "footer",
		label: "Footer",
		locked: true,
		children: getStorefrontPresentationVariant(theme) === "atelier-editorial" ? /* @__PURE__ */ jsx(AtelierFooter, {
			adaptiveParts,
			theme,
			brandName,
			storeLinks,
			supportLinks,
			contactHref,
			socialLinks,
			shopVerification,
			LinkComponent
		}) : /* @__PURE__ */ jsx("footer", {
			"data-ab-surface": adaptiveParts ? "" : void 0,
			className: "min-w-0 overflow-x-hidden border-t pb-20 pt-7 text-[var(--sf-footer-text)] sm:pt-10 md:pb-8 md:pt-12 lg:pt-14",
			style: {
				...getReferenceThemeStyle(theme),
				borderColor: "var(--sf-footer-border)",
				backgroundColor: "var(--sf-footer-background)"
			},
			children: /* @__PURE__ */ jsxs("div", {
				className: storefrontContainerClass,
				children: [/* @__PURE__ */ jsxs("div", {
					"data-ab-layout": adaptiveParts ? "footerColumns" : void 0,
					className: footerGridClass,
					children: [
						/* @__PURE__ */ jsxs("div", {
							"data-ab-part": adaptiveParts ? "identity" : void 0,
							className: "min-w-0",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "flex min-w-0 items-center gap-3",
									children: [/* @__PURE__ */ jsx("span", {
										"data-ab-surface": adaptiveParts ? "" : void 0,
										className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--sf-accent)] text-base font-black text-white sm:h-12 sm:w-12",
										children: getInitials(brandName)
									}), /* @__PURE__ */ jsxs("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ jsx("h2", {
											className: "truncate text-lg font-black sm:text-xl",
											style: {
												...headingStyle,
												color: "var(--sf-footer-heading)"
											},
											children: brandName
										}), /* @__PURE__ */ jsx("p", {
											className: "text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-footer-text)] sm:text-sm",
											children: "Storefront"
										})]
									})]
								}),
								theme.footer?.text && /* @__PURE__ */ jsx("p", {
									className: "mt-4 max-w-sm text-sm leading-7 text-[var(--sf-footer-text)] sm:mt-6 sm:text-base sm:leading-8",
									children: theme.footer.text
								}),
								isVerifiedSeller && /* @__PURE__ */ jsxs("span", {
									"data-ab-surface": adaptiveParts ? "" : void 0,
									className: "mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-black text-emerald-700 sm:mt-6 sm:px-4",
									children: [/* @__PURE__ */ jsx(CircleCheck, { size: 17 }), shopVerification?.label || "Verified seller"]
								})
							]
						}),
						/* @__PURE__ */ jsxs("div", {
							"data-ab-layout": adaptiveParts ? "footerDesktop" : void 0,
							className: desktopColumnsClass,
							children: [/* @__PURE__ */ jsx(FooterColumn, {
								adaptiveParts,
								title: "Store",
								links: storeLinks,
								LinkComponent
							}), /* @__PURE__ */ jsx(FooterSupportColumn, {
								adaptiveParts,
								links: supportLinks,
								contactHref,
								contactLabel: theme.footer?.contactLabel || "Contact store",
								socialLinks,
								LinkComponent
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							"data-ab-layout": adaptiveParts ? "footerMobile" : void 0,
							className: mobileColumnsClass,
							children: [
								/* @__PURE__ */ jsx(FooterAccordion, {
									adaptiveParts,
									title: "Store",
									links: storeLinks,
									LinkComponent
								}),
								/* @__PURE__ */ jsx(FooterAccordion, {
									adaptiveParts,
									title: "Support",
									links: supportLinks,
									LinkComponent
								}),
								contactHref && /* @__PURE__ */ jsxs(LinkSlot, {
									LinkComponent,
									href: contactHref,
									prefetch: false,
									className: "mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-black text-[var(--sf-footer-link)]",
									children: [/* @__PURE__ */ jsx(Mail, { size: 17 }), theme.footer?.contactLabel || "Contact store"]
								}),
								socialLinks.length > 0 && /* @__PURE__ */ jsx("div", {
									className: "mt-4 flex flex-wrap items-center gap-2.5 sm:gap-3",
									children: socialLinks.map((item) => /* @__PURE__ */ jsx(LinkSlot, {
										LinkComponent,
										href: item.href,
										prefetch: false,
										target: "_blank",
										rel: "noreferrer",
										"aria-label": item.label,
										className: "flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-black uppercase text-[var(--sf-footer-link)] transition hover:bg-[var(--sf-footer-link-hover)] hover:text-white",
										children: item.short
									}, item.key))
								})
							]
						})
					]
				}), /* @__PURE__ */ jsxs("div", {
					className: "mt-7 flex min-w-0 flex-col gap-3 border-t pt-4 text-xs font-semibold text-[var(--sf-footer-text)] sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:text-sm",
					style: { borderColor: "var(--sf-footer-border)" },
					children: [/* @__PURE__ */ jsxs("p", {
						className: "min-w-0 break-words",
						style: { color: "var(--sf-footer-powered-by)" },
						children: [
							"© ",
							(/* @__PURE__ */ new Date()).getFullYear(),
							" ",
							brandName,
							". Powered by Scaleup."
						]
					}), /* @__PURE__ */ jsxs("div", {
						className: "flex flex-wrap items-center gap-x-3 gap-y-2",
						children: [
							/* @__PURE__ */ jsxs("span", {
								className: "inline-flex items-center gap-2",
								children: [/* @__PURE__ */ jsx(Lock, {
									size: 16,
									className: "text-[var(--sf-footer-link)]"
								}), "Secure checkout"]
							}),
							isVerifiedSeller && /* @__PURE__ */ jsxs("span", {
								className: "inline-flex items-center gap-2",
								children: [/* @__PURE__ */ jsx(CircleCheck, {
									size: 16,
									className: "text-[var(--sf-footer-link)]"
								}), "Verified seller"]
							}),
							/* @__PURE__ */ jsxs("span", {
								className: "inline-flex items-center gap-2",
								children: [/* @__PURE__ */ jsx(BarChart3, {
									size: 16,
									className: "text-[var(--sf-footer-link)]"
								}), "Privacy-friendly analytics"]
							})
						]
					})]
				})]
			})
		})
	}), theme.mobile?.showBottomNavigation && /* @__PURE__ */ jsx("nav", {
		"data-ab-part": adaptiveParts ? "navigation" : void 0,
		className: bottomNavClass,
		style: bottomNavStyle,
		children: mobileLinks.map((item) => {
			const Icon = item.icon;
			return /* @__PURE__ */ jsxs(LinkSlot, {
				LinkComponent,
				href: item.href,
				prefetch: false,
				className: "relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-bold text-slate-500 transition hover:text-[var(--sf-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--sf-accent)]",
				children: [
					/* @__PURE__ */ jsx(Icon, { size: 20 }),
					/* @__PURE__ */ jsx("span", { children: item.label }),
					item.badge > 0 && /* @__PURE__ */ jsx("span", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						className: "absolute right-4 top-0 h-4 min-w-4 rounded-full bg-[var(--sf-accent)] px-1 text-[10px] leading-4 text-white",
						children: item.badge
					})
				]
			}, item.label);
		})
	})] });
}
//#endregion
//#region packages/storefront-renderer/normalizeProduct.js
const getValidPrice = (...values) => {
	for (const value of values) {
		if (typeof value !== "number" && typeof value !== "string") continue;
		if (typeof value === "string" && !value.trim()) continue;
		const price = Number(value);
		if (Number.isFinite(price) && price >= 0) return price;
	}
	return null;
};
const getCartItemPrice = (item = {}) => getValidPrice(item.cartPrice, item.finalPrice, item.sellingPrice, item.pricing?.sellingPrice) ?? 0;
//#endregion
//#region packages/storefront-renderer/atelier/useAtelierDialog.js
function useAtelierDialog({ enabled, open, onClose, busy = false }) {
	const dialogRef = useRef(null);
	const actions = useRef({
		onClose,
		busy
	});
	useEffect(() => {
		actions.current = {
			onClose,
			busy
		};
	}, [onClose, busy]);
	useEffect(() => {
		const dialog = dialogRef.current;
		if (!enabled || !open || !dialog) return void 0;
		const doc = dialog.ownerDocument;
		const previous = doc.activeElement;
		const previousOverflow = doc.body.style.overflow;
		const focusable = () => Array.from(dialog.querySelectorAll("a[href],button,input,textarea,select,[tabindex]")).filter((el) => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length > 0);
		doc.body.style.overflow = "hidden";
		(dialog.querySelector("input:not([disabled]):not([type=\"checkbox\"]):not([type=\"file\"]),textarea:not([disabled])") || focusable()[0])?.focus();
		const keydown = (event) => {
			if (event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				if (!actions.current.busy) actions.current.onClose?.();
				return;
			}
			if (event.key !== "Tab") return;
			const items = focusable();
			if (!items.length) {
				event.preventDefault();
				return;
			}
			const first = items[0], last = items[items.length - 1];
			if (!dialog.contains(doc.activeElement)) {
				event.preventDefault();
				(event.shiftKey ? last : first).focus();
			} else if (event.shiftKey && doc.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && doc.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};
		doc.addEventListener("keydown", keydown, true);
		return () => {
			doc.removeEventListener("keydown", keydown, true);
			doc.body.style.overflow = previousOverflow;
			if (previous?.isConnected) previous.focus();
		};
	}, [enabled, open]);
	return dialogRef;
}
//#endregion
//#region packages/storefront-renderer/presentation/SafeProductImage.jsx
function SafeProductImage({ src, alt = "Product image", fill = false, width, height, sizes, priority = false, className = "", fallbackClassName = "", iconClassName = "", unoptimized, ...props }) {
	const [failedSrc, setFailedSrc] = useState("");
	const safeSrc = String(getImageUrlFromValue(src) || "").trim();
	if (!safeSrc || Boolean(safeSrc && failedSrc === safeSrc)) return /* @__PURE__ */ jsx("div", {
		className: fallbackClassName || "flex h-full w-full items-center justify-center bg-slate-100 text-slate-300",
		"aria-label": alt,
		role: "img",
		children: /* @__PURE__ */ jsx(ShoppingBag, {
			size: 24,
			className: iconClassName
		})
	});
	if (fill) return /* @__PURE__ */ jsx(Image, {
		...props,
		src: safeSrc,
		alt,
		fill: true,
		sizes,
		priority,
		className,
		onError: () => setFailedSrc(safeSrc),
		unoptimized: unoptimized ?? shouldUseUnoptimizedImage(safeSrc)
	});
	return /* @__PURE__ */ jsx(Image, {
		...props,
		src: safeSrc,
		alt,
		width,
		height,
		sizes,
		priority,
		className,
		onError: () => setFailedSrc(safeSrc),
		unoptimized: unoptimized ?? shouldUseUnoptimizedImage(safeSrc)
	});
}
//#endregion
//#region packages/storefront-renderer/presentation/CheckoutSections.jsx
function CheckoutSuccessState({ adaptiveParts = false, orderId }) {
	return /* @__PURE__ */ jsx("div", {
		className: "sf-checkout-page sf-page flex min-h-screen items-center justify-center px-4",
		children: /* @__PURE__ */ jsxs("div", {
			"data-ab-surface": adaptiveParts ? "" : void 0,
			className: "w-full max-w-lg rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] p-8 text-center shadow-2xl shadow-slate-200/70 sm:p-10",
			children: [
				/* @__PURE__ */ jsx(CheckCircle, {
					size: 90,
					className: "mx-auto mb-6 text-[var(--sf-checkout-success)]"
				}),
				/* @__PURE__ */ jsx("h1", {
					"data-ab-part": adaptiveParts ? "heading" : void 0,
					className: "mb-3 text-4xl font-black text-[var(--sf-checkout-text)]",
					children: "Order Confirmed"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "leading-relaxed text-slate-600",
					children: "Thank you for your purchase."
				}),
				/* @__PURE__ */ jsxs("div", {
					"data-ab-surface": adaptiveParts ? "" : void 0,
					className: "mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5",
					children: [
						/* @__PURE__ */ jsx("p", {
							className: "mb-2 text-sm font-black uppercase tracking-[0.16em] text-slate-500",
							children: "ORDER ID FOR TRACKING"
						}),
						/* @__PURE__ */ jsxs("p", {
							className: "text-2xl font-black tracking-wider text-[var(--sf-checkout-accent)]",
							children: ["#", orderId?.slice(-6)?.toUpperCase()]
						}),
						/* @__PURE__ */ jsxs("p", {
							className: "mt-2 break-all text-xs text-slate-500",
							children: ["Full ID: ", orderId]
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-3 text-xs text-slate-500",
							children: "Use the short ID and your delivery phone number on the Track Order page."
						})
					]
				}),
				/* @__PURE__ */ jsx(Link, {
					href: "/",
					className: "sf-btn sf-btn-primary mt-8 px-8",
					children: "Continue Shopping"
				})
			]
		})
	});
}
function CheckoutEmptyCartState({ adaptiveParts = false } = {}) {
	return /* @__PURE__ */ jsxs("div", {
		className: "sf-checkout-page sf-page flex min-h-[70vh] flex-col items-center justify-center px-4 text-center",
		children: [
			/* @__PURE__ */ jsx(Package, {
				size: 80,
				className: "mb-6 text-slate-300"
			}),
			/* @__PURE__ */ jsx("h2", {
				"data-ab-part": adaptiveParts ? "heading" : void 0,
				className: "mb-3 text-3xl font-black text-[var(--sf-checkout-text)]",
				children: "Your cart is empty"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "mb-8 text-slate-500",
				children: "Add some products first"
			}),
			/* @__PURE__ */ jsx(Link, {
				href: "/",
				className: "sf-btn sf-btn-primary px-7",
				children: "Continue Shopping"
			})
		]
	});
}
function CheckoutBrandingBanner({ adaptiveParts = false, checkoutBranding }) {
	if (!checkoutBranding.logoUrl && !checkoutBranding.bannerText) return null;
	return /* @__PURE__ */ jsxs("div", {
		"data-ab-surface": adaptiveParts ? "" : void 0,
		className: "mb-8 rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] p-6 text-center shadow-sm",
		children: [checkoutBranding.logoUrl && /* @__PURE__ */ jsx(Image, {
			src: checkoutBranding.logoUrl,
			alt: "",
			width: 180,
			height: 48,
			unoptimized: shouldUseUnoptimizedImage(checkoutBranding.logoUrl),
			className: "mx-auto mb-3 h-12 w-auto object-contain"
		}), checkoutBranding.bannerText && /* @__PURE__ */ jsx("p", {
			className: "text-sm font-bold text-slate-700",
			children: checkoutBranding.bannerText
		})]
	});
}
function CheckoutHeader({ adaptiveParts = false } = {}) {
	return /* @__PURE__ */ jsxs("div", {
		className: "mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
		children: [/* @__PURE__ */ jsxs("div", { children: [
			/* @__PURE__ */ jsxs(Link, {
				href: "/cart",
				className: "mb-4 inline-flex items-center text-sm font-bold text-slate-500 transition hover:text-[var(--sf-checkout-accent)]",
				children: [/* @__PURE__ */ jsx(ArrowLeft, {
					size: 16,
					className: "mr-2"
				}), "Back to Cart"]
			}),
			/* @__PURE__ */ jsx("p", {
				className: "sf-kicker",
				children: "Checkout"
			}),
			/* @__PURE__ */ jsx("h1", {
				"data-ab-part": adaptiveParts ? "heading" : void 0,
				className: "sf-heading mt-1 text-3xl sm:text-4xl",
				style: { color: "var(--sf-checkout-text)" },
				children: "Complete your order"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500",
				children: "Confirm delivery details, review your items, and place the order securely."
			})
		] }), /* @__PURE__ */ jsx(CheckoutTrustBadges, { adaptiveParts })]
	});
}
function CheckoutTrustBadges({ adaptiveParts = false } = {}) {
	return /* @__PURE__ */ jsxs("div", {
		className: "grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-3",
		children: [
			/* @__PURE__ */ jsxs("span", {
				"data-ab-surface": adaptiveParts ? "" : void 0,
				className: "inline-flex items-center gap-2 rounded-full bg-[var(--sf-checkout-card-background)] px-3 py-2 shadow-sm",
				children: [/* @__PURE__ */ jsx(Lock, {
					size: 14,
					className: "text-[var(--sf-checkout-success)]"
				}), " Secure"]
			}),
			/* @__PURE__ */ jsxs("span", {
				"data-ab-surface": adaptiveParts ? "" : void 0,
				className: "inline-flex items-center gap-2 rounded-full bg-[var(--sf-checkout-card-background)] px-3 py-2 shadow-sm",
				children: [/* @__PURE__ */ jsx(CreditCard, {
					size: 14,
					className: "text-[var(--sf-checkout-accent)]"
				}), " COD"]
			}),
			/* @__PURE__ */ jsxs("span", {
				"data-ab-surface": adaptiveParts ? "" : void 0,
				className: "inline-flex items-center gap-2 rounded-full bg-[var(--sf-checkout-card-background)] px-3 py-2 shadow-sm",
				children: [/* @__PURE__ */ jsx(Truck, {
					size: 14,
					className: "text-sky-600"
				}), " Delivery"]
			})
		]
	});
}
function CheckoutPageShell({ adaptiveParts = false, checkoutBranding, children, mobileStickyBar, onSubmit }) {
	return /* @__PURE__ */ jsx("div", {
		className: "sf-checkout-page sf-page sf-mobile-action-page",
		children: /* @__PURE__ */ jsxs("div", {
			className: "sf-shell-wide py-8 sm:py-10",
			children: [
				/* @__PURE__ */ jsx(CheckoutBrandingBanner, {
					adaptiveParts,
					checkoutBranding
				}),
				/* @__PURE__ */ jsx(CheckoutHeader, { adaptiveParts }),
				/* @__PURE__ */ jsxs("form", {
					"data-ab-layout": adaptiveParts ? "checkout" : void 0,
					onSubmit,
					className: "grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_450px]",
					children: [children, mobileStickyBar]
				})
			]
		})
	});
}
function CheckoutCustomerInfo({ adaptiveParts = false, formData, onInputChange }) {
	return /* @__PURE__ */ jsxs("div", {
		"data-ab-surface": adaptiveParts ? "" : void 0,
		className: "rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] p-6 shadow-sm sm:p-8",
		children: [/* @__PURE__ */ jsx("h2", {
			"data-ab-part": adaptiveParts ? "heading" : void 0,
			className: "mb-6 text-2xl font-black text-[var(--sf-checkout-text)]",
			children: "Customer Information"
		}), /* @__PURE__ */ jsxs("div", {
			className: "grid grid-cols-1 gap-5 md:grid-cols-2",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "md:col-span-2",
					children: [/* @__PURE__ */ jsxs("label", {
						"data-ab-part": adaptiveParts ? "label" : void 0,
						htmlFor: "checkout-full-name",
						className: "mb-2 flex items-center gap-2 text-sm font-bold text-slate-700",
						children: [/* @__PURE__ */ jsx(User, { size: 16 }), "Full Name"]
					}), /* @__PURE__ */ jsx("input", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						"data-ab-part": adaptiveParts ? "input" : void 0,
						id: "checkout-full-name",
						required: true,
						type: "text",
						name: "fullName",
						value: formData.fullName,
						onChange: onInputChange,
						placeholder: "Enter your full name",
						className: "sf-field"
					})]
				}),
				/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("label", {
					"data-ab-part": adaptiveParts ? "label" : void 0,
					htmlFor: "checkout-email",
					className: "mb-2 flex items-center gap-2 text-sm font-bold text-slate-700",
					children: [/* @__PURE__ */ jsx(Mail, { size: 16 }), "Email"]
				}), /* @__PURE__ */ jsx("input", {
					"data-ab-surface": adaptiveParts ? "" : void 0,
					"data-ab-part": adaptiveParts ? "input" : void 0,
					id: "checkout-email",
					required: true,
					type: "email",
					name: "email",
					value: formData.email,
					onChange: onInputChange,
					placeholder: "example@gmail.com",
					className: "sf-field"
				})] }),
				/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("label", {
					"data-ab-part": adaptiveParts ? "label" : void 0,
					htmlFor: "checkout-phone",
					className: "mb-2 flex items-center gap-2 text-sm font-bold text-slate-700",
					children: [/* @__PURE__ */ jsx(Phone, { size: 16 }), "Phone Number"]
				}), /* @__PURE__ */ jsx("input", {
					"data-ab-surface": adaptiveParts ? "" : void 0,
					"data-ab-part": adaptiveParts ? "input" : void 0,
					id: "checkout-phone",
					required: true,
					type: "tel",
					name: "phone",
					value: formData.phone,
					onChange: onInputChange,
					placeholder: "+8801XXXXXXXXX",
					className: "sf-field"
				})] }),
				/* @__PURE__ */ jsxs("div", {
					className: "md:col-span-2",
					children: [/* @__PURE__ */ jsxs("label", {
						"data-ab-part": adaptiveParts ? "label" : void 0,
						htmlFor: "checkout-address",
						className: "mb-2 flex items-center gap-2 text-sm font-bold text-slate-700",
						children: [/* @__PURE__ */ jsx(MapPin, { size: 16 }), "Full Address"]
					}), /* @__PURE__ */ jsx("textarea", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						"data-ab-part": adaptiveParts ? "input" : void 0,
						id: "checkout-address",
						required: true,
						rows: 4,
						name: "address",
						value: formData.address,
						onChange: onInputChange,
						placeholder: "House, road, area, thana",
						className: "sf-field resize-none"
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "md:col-span-2",
					children: [/* @__PURE__ */ jsx("label", {
						"data-ab-part": adaptiveParts ? "label" : void 0,
						htmlFor: "checkout-city",
						className: "mb-2 block text-sm font-bold text-slate-700",
						children: "Delivery area"
					}), /* @__PURE__ */ jsxs("select", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						"data-ab-part": adaptiveParts ? "input" : void 0,
						id: "checkout-city",
						required: true,
						name: "city",
						value: formData.city,
						onChange: onInputChange,
						className: "sf-field",
						children: [
							/* @__PURE__ */ jsx("option", {
								value: "",
								children: "Select delivery area"
							}),
							/* @__PURE__ */ jsx("option", {
								value: "Inside Dhaka",
								children: "Inside Dhaka"
							}),
							/* @__PURE__ */ jsx("option", {
								value: "Outside Dhaka",
								children: "Outside Dhaka"
							})
						]
					})]
				})
			]
		})]
	});
}
function CheckoutDeliveryChargeNotice({ adaptiveParts = false } = {}) {
	return /* @__PURE__ */ jsxs("div", {
		"data-ab-surface": adaptiveParts ? "" : void 0,
		className: "flex gap-5 rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] p-6 shadow-sm",
		children: [/* @__PURE__ */ jsx(Truck, {
			size: 32,
			className: "mt-1 text-[var(--sf-checkout-accent)]"
		}), /* @__PURE__ */ jsxs("div", { children: [
			/* @__PURE__ */ jsx("h3", {
				className: "mb-1 text-lg font-black text-[var(--sf-checkout-text)]",
				children: "Delivery Charge"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-sm font-semibold text-slate-600",
				children: "Inside Dhaka → ৳ 80"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-sm font-semibold text-slate-600",
				children: "Outside Dhaka → ৳ 120"
			})
		] })]
	});
}
function CheckoutDeliveryMethod({ adaptiveParts = false, isDhaka }) {
	const hasSelection = typeof isDhaka === "boolean";
	return /* @__PURE__ */ jsxs("div", {
		"data-ab-surface": adaptiveParts ? "" : void 0,
		className: "rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] p-6 shadow-sm sm:p-8",
		children: [/* @__PURE__ */ jsx("h2", {
			"data-ab-part": adaptiveParts ? "heading" : void 0,
			className: "mb-5 text-2xl font-black text-[var(--sf-checkout-text)]",
			children: "Delivery Method"
		}), /* @__PURE__ */ jsxs("div", {
			className: "grid gap-3 sm:grid-cols-2",
			children: [/* @__PURE__ */ jsxs("div", {
				"data-ab-surface": adaptiveParts ? "" : void 0,
				className: `rounded-2xl border p-4 ${hasSelection && isDhaka ? "border-[var(--sf-checkout-accent)] bg-[var(--sf-accent-bg)]" : "border-slate-200 bg-slate-50"}`,
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ jsx("span", {
						className: "text-sm font-black text-[var(--sf-checkout-text)]",
						children: "Inside Dhaka"
					}), /* @__PURE__ */ jsx("span", {
						className: "text-sm font-black text-[var(--sf-checkout-accent)]",
						children: "৳ 80"
					})]
				}), /* @__PURE__ */ jsx("p", {
					className: "mt-2 text-xs font-semibold text-slate-500",
					children: "Same-city delivery estimate."
				})]
			}), /* @__PURE__ */ jsxs("div", {
				"data-ab-surface": adaptiveParts ? "" : void 0,
				className: `rounded-2xl border p-4 ${hasSelection && !isDhaka ? "border-[var(--sf-checkout-accent)] bg-[var(--sf-accent-bg)]" : "border-slate-200 bg-slate-50"}`,
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ jsx("span", {
						className: "text-sm font-black text-[var(--sf-checkout-text)]",
						children: "Outside Dhaka"
					}), /* @__PURE__ */ jsx("span", {
						className: "text-sm font-black text-[var(--sf-checkout-accent)]",
						children: "৳ 120"
					})]
				}), /* @__PURE__ */ jsx("p", {
					className: "mt-2 text-xs font-semibold text-slate-500",
					children: "Nationwide delivery estimate."
				})]
			})]
		})]
	});
}
function CheckoutPaymentMethod({ adaptiveParts = false, presentationVariant } = {}) {
	return /* @__PURE__ */ jsxs("div", {
		"data-ab-surface": adaptiveParts ? "" : void 0,
		className: "rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] p-6 shadow-sm sm:p-8",
		children: [/* @__PURE__ */ jsx("h2", {
			"data-ab-part": adaptiveParts ? "heading" : void 0,
			className: "mb-5 text-2xl font-black text-[var(--sf-checkout-text)]",
			children: "Payment Method"
		}), /* @__PURE__ */ jsx("div", {
			"data-ab-surface": adaptiveParts ? "" : void 0,
			className: "rounded-2xl border border-[var(--sf-checkout-accent)] bg-[var(--sf-accent-bg)] p-4",
			children: /* @__PURE__ */ jsxs("div", {
				className: "flex items-start gap-3",
				children: [/* @__PURE__ */ jsx("span", {
					"data-ab-surface": adaptiveParts ? "" : void 0,
					className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--sf-checkout-card-background)] text-[var(--sf-checkout-accent)] shadow-sm",
					children: /* @__PURE__ */ jsx(CreditCard, { size: 19 })
				}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
					className: "text-sm font-black text-[var(--sf-checkout-text)]",
					children: "Cash on Delivery"
				}), /* @__PURE__ */ jsx("p", {
					className: "mt-1 text-xs font-semibold leading-5 text-slate-500",
					children: presentationVariant === "atelier-editorial" ? "Pay when your order arrives." : "Pay securely when your order arrives. Online payment providers can be enabled later from the platform."
				})] })]
			})
		})]
	});
}
function CheckoutPhoneOtpBox({ adaptiveParts = false, maskedPhone, onSendOtp, onVerifyOtp, otp, sending, setOtp, verified, verifying }) {
	return /* @__PURE__ */ jsxs("div", {
		"data-ab-surface": adaptiveParts ? "" : void 0,
		className: "rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] p-6 shadow-sm sm:p-8",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-start gap-3",
				children: [/* @__PURE__ */ jsx("span", {
					"data-ab-surface": adaptiveParts ? "" : void 0,
					className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[var(--sf-checkout-success)]",
					children: /* @__PURE__ */ jsx(ShieldCheck, { size: 20 })
				}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
					"data-ab-part": adaptiveParts ? "heading" : void 0,
					className: "text-2xl font-black text-[var(--sf-checkout-text)]",
					children: "Verify delivery phone"
				}), /* @__PURE__ */ jsx("p", {
					className: "mt-1 text-sm font-semibold leading-6 text-slate-500",
					children: "We send a 6-digit code before placing the order. Stock is reserved only after verification."
				})] })]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "mt-5 flex flex-col gap-3 sm:flex-row",
				children: [/* @__PURE__ */ jsxs("button", {
					type: "button",
					onClick: onSendOtp,
					disabled: sending || verified,
					className: "sf-btn sf-btn-secondary min-h-0 justify-center px-5 py-3 text-sm disabled:opacity-50",
					children: [sending ? /* @__PURE__ */ jsx(Loader2, {
						size: 17,
						className: "animate-spin"
					}) : /* @__PURE__ */ jsx(Phone, { size: 17 }), verified ? "Phone verified" : "Send OTP"]
				}), /* @__PURE__ */ jsxs("div", {
					className: "flex min-w-0 flex-1 gap-2",
					children: [/* @__PURE__ */ jsx("input", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						"data-ab-part": adaptiveParts ? "input" : void 0,
						value: otp,
						onChange: (event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6)),
						placeholder: "000000",
						inputMode: "numeric",
						maxLength: 6,
						disabled: verified,
						className: "sf-field min-w-0 flex-1",
						"aria-label": "Phone verification code"
					}), /* @__PURE__ */ jsx("button", {
						"data-ab-part": adaptiveParts ? "primaryButton" : void 0,
						type: "button",
						onClick: onVerifyOtp,
						disabled: verifying || verified || otp.length !== 6,
						className: "sf-btn sf-btn-primary min-h-0 px-5 py-3 text-sm disabled:opacity-50",
						children: verifying ? /* @__PURE__ */ jsx(Loader2, {
							size: 17,
							className: "animate-spin"
						}) : "Verify"
					})]
				})]
			}),
			/* @__PURE__ */ jsx("p", {
				"data-ab-surface": adaptiveParts ? "" : void 0,
				className: `mt-3 rounded-2xl px-4 py-3 text-xs font-bold ${verified ? "bg-emerald-50 text-[var(--sf-checkout-success)]" : "bg-slate-50 text-slate-500"}`,
				children: verified ? `Verified ${maskedPhone || "delivery phone"}.` : maskedPhone ? `Code sent to ${maskedPhone}.` : "Enter your phone above, then send a verification code."
			})
		]
	});
}
function CheckoutMarketingConsent({ adaptiveParts = false, checked, onChange }) {
	return /* @__PURE__ */ jsxs("label", {
		"data-ab-surface": adaptiveParts ? "" : void 0,
		"data-ab-part": adaptiveParts ? "label" : void 0,
		"data-ab-region": adaptiveParts ? "marketing" : void 0,
		className: "flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700",
		children: [/* @__PURE__ */ jsx("input", {
			type: "checkbox",
			checked,
			onChange: (event) => onChange(event.target.checked),
			className: "mt-1"
		}), /* @__PURE__ */ jsx("span", { children: "Send me a confirmation email to subscribe to this store's offers and product updates. Optional; unsubscribe anytime." })]
	});
}
function CheckoutDetailsColumn({ adaptiveParts = false, formData, isDhaka, onInputChange, presentationVariant }) {
	return /* @__PURE__ */ jsxs("div", {
		"data-atelier-part": presentationVariant === "atelier-editorial" ? "checkout-fields" : void 0,
		className: "space-y-7",
		children: [
			/* @__PURE__ */ jsx(CheckoutCustomerInfo, {
				adaptiveParts,
				formData,
				onInputChange
			}),
			/* @__PURE__ */ jsx(CheckoutDeliveryChargeNotice, { adaptiveParts }),
			/* @__PURE__ */ jsx(CheckoutDeliveryMethod, {
				adaptiveParts,
				isDhaka
			}),
			/* @__PURE__ */ jsx(CheckoutPaymentMethod, {
				adaptiveParts,
				presentationVariant
			})
		]
	});
}
function CheckoutCouponBox({ adaptiveParts = false, onApplyPromotion, promotionCode, promotionMessage, setPromotionCode }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "mb-6",
		children: [
			/* @__PURE__ */ jsx("label", {
				"data-ab-part": adaptiveParts ? "label" : void 0,
				htmlFor: "checkout-coupon-code",
				className: "mb-2 block text-sm font-bold text-slate-700",
				children: "Coupon Code"
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ jsx("input", {
					"data-ab-surface": adaptiveParts ? "" : void 0,
					"data-ab-part": adaptiveParts ? "input" : void 0,
					id: "checkout-coupon-code",
					type: "text",
					value: promotionCode,
					onChange: (event) => setPromotionCode(event.target.value.toUpperCase()),
					placeholder: "SAVE10",
					"aria-describedby": promotionMessage ? "checkout-coupon-feedback" : void 0,
					className: "sf-field min-w-0 flex-1 uppercase"
				}), /* @__PURE__ */ jsx("button", {
					"data-ab-part": adaptiveParts ? "primaryButton" : void 0,
					type: "button",
					onClick: onApplyPromotion,
					className: "sf-btn sf-btn-primary min-h-0 px-4 py-3",
					children: "Apply"
				})]
			}),
			promotionMessage && /* @__PURE__ */ jsx("p", {
				"data-ab-surface": adaptiveParts ? "" : void 0,
				"data-ab-part": adaptiveParts ? "error" : void 0,
				id: "checkout-coupon-feedback",
				className: `mt-2 rounded-xl px-3 py-2 text-xs font-bold ${promotionMessage.type === "error" ? "bg-red-50 text-[var(--sf-checkout-error)]" : promotionMessage.type === "success" ? "bg-emerald-50 text-[var(--sf-checkout-success)]" : "bg-slate-50 text-slate-600"}`,
				children: promotionMessage.text
			})
		]
	});
}
function CheckoutPolicyConsent({ adaptiveParts = false, policyAccepted, setPolicyAccepted }) {
	return /* @__PURE__ */ jsxs("label", {
		"data-ab-surface": adaptiveParts ? "" : void 0,
		"data-ab-part": adaptiveParts ? "label" : void 0,
		className: `mt-6 flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold transition ${policyAccepted ? "border-[var(--sf-checkout-accent)] bg-[var(--sf-accent-bg)] text-slate-700" : "border-slate-200 bg-slate-50 text-slate-600"}`,
		children: [/* @__PURE__ */ jsx("input", {
			id: "checkout-policy-consent",
			type: "checkbox",
			checked: policyAccepted,
			onChange: (event) => setPolicyAccepted(event.target.checked),
			className: "mt-1 h-4 w-4 rounded border-slate-300 text-[var(--sf-checkout-accent)] focus:ring-[var(--sf-checkout-accent)]"
		}), /* @__PURE__ */ jsxs("span", { children: ["I agree to this store's policies before placing my order.", /* @__PURE__ */ jsx("span", {
			className: "mt-1 block text-xs font-medium text-slate-500",
			children: "Review the policy sections below. This confirms you understand delivery, refund, and privacy terms."
		})] })]
	});
}
function CheckoutPolicies({ adaptiveParts = false, policies, visiblePolicies }) {
	if (visiblePolicies.length === 0) return null;
	return /* @__PURE__ */ jsxs("div", {
		className: "mt-6 border-t border-slate-200 pt-5",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "mb-3 flex items-center gap-2 text-sm font-black text-[var(--sf-checkout-text)]",
			children: [/* @__PURE__ */ jsx(FileText, {
				size: 16,
				className: "text-[var(--sf-checkout-accent)]"
			}), "Store Policies"]
		}), /* @__PURE__ */ jsx("div", {
			className: "space-y-2",
			children: visiblePolicies.map(([key, label]) => /* @__PURE__ */ jsxs("details", {
				"data-ab-surface": adaptiveParts ? "" : void 0,
				className: "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3",
				children: [/* @__PURE__ */ jsx("summary", {
					className: "cursor-pointer text-sm font-bold text-slate-800",
					children: label
				}), /* @__PURE__ */ jsx("p", {
					className: "mt-3 whitespace-pre-line text-sm leading-6 text-slate-600",
					children: policies[key]
				})]
			}, key))
		})]
	});
}
function CheckoutOrderItem({ adaptiveParts = false, presentationVariant, item, product, removeFromCart, updateQuantity }) {
	const imageUrl = item.imageUrl || product?.thumbnail || product?.images?.[0] || "";
	return /* @__PURE__ */ jsx("div", {
		"data-atelier-part": presentationVariant === "atelier-editorial" ? "checkout-item" : void 0,
		className: "rounded-3xl border border-slate-200 p-5",
		children: /* @__PURE__ */ jsxs("div", {
			className: "flex gap-4",
			children: [/* @__PURE__ */ jsx(SafeProductImage, {
				src: imageUrl,
				alt: item.title,
				width: 96,
				height: 96,
				className: "h-20 w-20 rounded-2xl border border-slate-200 object-cover sm:h-24 sm:w-24",
				fallbackClassName: "flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-300 sm:h-24 sm:w-24",
				iconClassName: "h-7 w-7"
			}), /* @__PURE__ */ jsxs("div", {
				className: "flex-1",
				children: [
					/* @__PURE__ */ jsx("h3", {
						className: "line-clamp-2 font-black text-[var(--sf-checkout-text)]",
						children: item.title
					}),
					product?.shortDescription && /* @__PURE__ */ jsx("p", {
						className: "mt-1 line-clamp-2 text-sm text-slate-500",
						children: product.shortDescription
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between mt-5",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2",
							children: [
								/* @__PURE__ */ jsx("button", {
									"data-ab-surface": adaptiveParts ? "" : void 0,
									type: "button",
									"aria-label": presentationVariant === "atelier-editorial" ? "Decrease quantity for " + item.title : void 0,
									onClick: () => updateQuantity(item.cartItemId || item._id, item.quantity - 1),
									className: "flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100",
									children: /* @__PURE__ */ jsx(Minus, { size: 16 })
								}),
								/* @__PURE__ */ jsx("div", {
									className: "w-10 text-center font-black text-[var(--sf-checkout-text)]",
									children: item.quantity
								}),
								/* @__PURE__ */ jsx("button", {
									"data-ab-surface": adaptiveParts ? "" : void 0,
									type: "button",
									"aria-label": presentationVariant === "atelier-editorial" ? "Increase quantity for " + item.title : void 0,
									onClick: () => updateQuantity(item.cartItemId || item._id, item.quantity + 1),
									className: "flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100",
									children: /* @__PURE__ */ jsx(Plus, { size: 16 })
								})
							]
						}), /* @__PURE__ */ jsxs("div", {
							className: "text-right",
							children: [/* @__PURE__ */ jsxs("p", {
								className: "text-lg font-black text-[var(--sf-checkout-text)]",
								children: ["৳", getCartItemPrice(item) * item.quantity]
							}), /* @__PURE__ */ jsxs("p", {
								"data-ab-muted": adaptiveParts ? "" : void 0,
								className: "text-xs text-slate-400",
								children: [
									"৳",
									getCartItemPrice(item),
									"each"
								]
							})]
						})]
					}),
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: () => removeFromCart(item.cartItemId || item._id),
						className: "mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--sf-checkout-error)] hover:text-[var(--sf-checkout-error)]",
						children: [/* @__PURE__ */ jsx(Trash2, { size: 14 }), "Remove"]
					})
				]
			})]
		})
	}, item.cartItemId || item._id);
}
function CheckoutOrderSummary({ adaptiveParts = false, presentationVariant, cartItems, checkoutBranding, finalShippingCost, loading, onApplyPromotion, policies, policyAccepted, productsDetails, promotionCode, promotionDiscount, promotionMessage, removeFromCart, setPolicyAccepted, setPromotionCode, phoneVerified, subtotal, totalAmount, updateQuantity, visiblePolicies }) {
	return /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs("div", {
		"data-ab-surface": adaptiveParts ? "" : void 0,
		"data-ab-part": adaptiveParts ? "summary" : void 0,
		"data-atelier-part": presentationVariant === "atelier-editorial" ? "checkout-summary" : void 0,
		className: "sticky top-28 overflow-hidden rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] shadow-xl shadow-slate-200/70",
		children: [
			/* @__PURE__ */ jsx("div", {
				"data-ab-surface": adaptiveParts ? "" : void 0,
				className: "border-b border-slate-200 bg-[var(--sf-checkout-card-background)] p-6 sm:p-7",
				children: /* @__PURE__ */ jsxs("div", {
					className: "flex items-start justify-between gap-4",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
						className: "sf-kicker",
						children: "Review"
					}), /* @__PURE__ */ jsx("h2", {
						"data-ab-part": adaptiveParts ? "heading" : void 0,
						className: "mt-1 text-2xl font-black text-[var(--sf-checkout-text)]",
						children: "Order Summary"
					})] }), /* @__PURE__ */ jsxs("span", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						className: "rounded-full bg-[var(--sf-checkout-card-background)] px-3 py-1.5 text-xs font-black text-[var(--sf-checkout-accent)] shadow-sm",
						children: [
							cartItems.length,
							" item",
							cartItems.length === 1 ? "" : "s"
						]
					})]
				})
			}),
			/* @__PURE__ */ jsx("div", {
				className: "max-h-[460px] space-y-5 overflow-y-auto p-6 sm:p-7",
				children: cartItems.map((item) => /* @__PURE__ */ jsx(CheckoutOrderItem, {
					adaptiveParts,
					presentationVariant,
					item,
					product: productsDetails[item._id],
					removeFromCart,
					updateQuantity
				}, item.cartItemId || item._id))
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "border-t border-slate-200 p-6 sm:p-7",
				children: [
					/* @__PURE__ */ jsx(CheckoutCouponBox, {
						adaptiveParts,
						onApplyPromotion,
						promotionCode,
						promotionMessage,
						setPromotionCode
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-4 text-sm",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex justify-between",
								children: [/* @__PURE__ */ jsx("span", {
									className: "text-slate-500",
									children: "Subtotal"
								}), /* @__PURE__ */ jsxs("span", {
									className: "font-bold text-[var(--sf-checkout-text)]",
									children: ["৳ ", subtotal]
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "flex justify-between",
								children: [/* @__PURE__ */ jsx("span", {
									className: "text-slate-500",
									children: "Delivery Charge"
								}), /* @__PURE__ */ jsxs("span", {
									className: "font-bold text-[var(--sf-checkout-text)]",
									children: ["৳ ", finalShippingCost]
								})]
							}),
							promotionDiscount > 0 && /* @__PURE__ */ jsxs("div", {
								className: "flex justify-between text-[var(--sf-checkout-success)]",
								children: [/* @__PURE__ */ jsx("span", { children: "Coupon Discount" }), /* @__PURE__ */ jsxs("span", {
									className: "font-bold",
									children: ["- ৳ ", promotionDiscount]
								})]
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-5 flex items-center justify-between border-t border-dashed border-slate-200 pt-5",
						children: [/* @__PURE__ */ jsx("span", {
							className: "text-xl font-black text-[var(--sf-checkout-text)]",
							children: "Total"
						}), /* @__PURE__ */ jsxs("span", {
							className: "text-3xl font-black text-[var(--sf-checkout-text)]",
							children: ["৳ ", totalAmount]
						})]
					}),
					/* @__PURE__ */ jsx(CheckoutPolicyConsent, {
						adaptiveParts,
						policyAccepted,
						setPolicyAccepted
					}),
					/* @__PURE__ */ jsx("button", {
						"data-ab-part": adaptiveParts ? "primaryButton" : void 0,
						type: "submit",
						disabled: loading || !policyAccepted,
						className: "sf-btn sf-checkout-submit mt-7 w-full py-5 text-lg disabled:opacity-50",
						style: { borderRadius: "var(--sf-checkout-radius)" },
						children: loading ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Loader2, {
							size: 20,
							className: "animate-spin"
						}), "Processing order"] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Lock, { size: 18 }), phoneVerified ? "Place Order" : "Place Order"] })
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-5 grid gap-3 text-sm font-semibold text-slate-600",
						children: [/* @__PURE__ */ jsxs("p", {
							className: "flex items-center justify-center gap-2",
							children: [/* @__PURE__ */ jsx(ShieldCheck, {
								size: 16,
								className: "text-[var(--sf-checkout-success)]"
							}), checkoutBranding.trustMessage || "Secure Checkout"]
						}), /* @__PURE__ */ jsx("p", {
							"data-ab-surface": adaptiveParts ? "" : void 0,
							className: "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-[var(--sf-checkout-success)]",
							children: "Cash on delivery order. You pay when the product arrives."
						})]
					}),
					/* @__PURE__ */ jsx(CheckoutPolicies, {
						adaptiveParts,
						policies,
						visiblePolicies
					})
				]
			})
		]
	}) });
}
function CheckoutMobileStickyBar({ adaptiveParts = false, loading, phoneVerified, policyAccepted, totalAmount }) {
	return /* @__PURE__ */ jsx("div", {
		"data-ab-surface": adaptiveParts ? "" : void 0,
		className: "sf-mobile-action-bar fixed inset-x-0 z-40 border-t border-slate-200 bg-[var(--sf-checkout-card-background)] p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden",
		children: /* @__PURE__ */ jsxs("div", {
			className: "mx-auto flex max-w-xl items-center gap-3",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ jsx("p", {
					className: "text-xs font-bold uppercase tracking-[0.14em] text-slate-500",
					children: "Pay on delivery"
				}), /* @__PURE__ */ jsxs("p", {
					className: "text-xl font-black text-[var(--sf-checkout-text)]",
					children: ["৳ ", totalAmount]
				})]
			}), /* @__PURE__ */ jsxs("button", {
				"data-ab-part": adaptiveParts ? "primaryButton" : void 0,
				type: "submit",
				disabled: loading || !policyAccepted,
				className: "sf-btn min-h-0 px-5 py-3 text-sm disabled:opacity-50",
				style: {
					borderRadius: "var(--sf-checkout-radius)",
					backgroundColor: "var(--sf-checkout-button-background)",
					color: "var(--sf-checkout-button-text)"
				},
				children: [loading ? /* @__PURE__ */ jsx(Loader2, {
					size: 17,
					className: "animate-spin"
				}) : /* @__PURE__ */ jsx(Lock, { size: 16 }), phoneVerified ? "Place order" : "Place order"]
			})]
		})
	});
}
function AtelierCheckoutDialog({ open, onClose, busy, render }) {
	return render(useAtelierDialog({
		enabled: true,
		open,
		onClose,
		busy
	}));
}
function CheckoutOtpModal({ adaptiveParts = false, presentationVariant, error, message, cooldownSeconds = 0, expired = false, onResendCode, maskedPhone, onCancel, onSendCode, onVerifyCode, open, otp, sending, setOtp, state, verifying }) {
	const atelier = presentationVariant === "atelier-editorial";
	const accessible = atelier || adaptiveParts;
	const isBusy = sending || verifying || state === "placing_order";
	if (!open) return null;
	const isOtpInput = state === "otp_input" || state === "verifying" || state === "error";
	const handleSubmit = (event) => {
		event.preventDefault();
		event.stopPropagation();
		if (isBusy) return;
		if (isOtpInput) {
			if (otp.length === 6 && !expired) onVerifyCode();
			return;
		}
		if (cooldownSeconds === 0) onSendCode();
	};
	const renderModal = (dialogRef) => /* @__PURE__ */ jsx("div", {
		ref: dialogRef,
		"aria-busy": accessible && isBusy ? true : void 0,
		"data-atelier-dialog": atelier ? "checkout-otp" : void 0,
		className: "fixed inset-0 z-[120] flex items-end bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4",
		role: "dialog",
		"aria-modal": "true",
		"aria-labelledby": "checkout-otp-title",
		children: /* @__PURE__ */ jsxs("form", {
			"data-ab-surface": adaptiveParts ? "" : void 0,
			onSubmit: handleSubmit,
			className: "w-full overflow-hidden rounded-t-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] shadow-2xl shadow-slate-950/20 sm:max-w-md sm:rounded-[2rem]",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-start gap-3",
					children: [/* @__PURE__ */ jsx("span", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[var(--sf-checkout-success)]",
						children: /* @__PURE__ */ jsx(ShieldCheck, { size: 20 })
					}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
						"data-ab-part": adaptiveParts ? "heading" : void 0,
						id: "checkout-otp-title",
						className: "text-xl font-black text-[var(--sf-checkout-text)]",
						children: "Verify your phone number"
					}), /* @__PURE__ */ jsx("p", {
						className: "mt-1 text-sm font-semibold leading-6 text-slate-500",
						children: "We need to verify your delivery phone before placing this order."
					})] })]
				}), /* @__PURE__ */ jsx("button", {
					"data-ab-surface": adaptiveParts ? "" : void 0,
					type: "button",
					onClick: onCancel,
					disabled: isBusy,
					className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-[var(--sf-checkout-text)] disabled:opacity-50",
					"aria-label": "Close phone verification",
					children: /* @__PURE__ */ jsx(X, { size: 18 })
				})]
			}), /* @__PURE__ */ jsxs("div", {
				className: "space-y-5 p-5 sm:p-6",
				children: [
					/* @__PURE__ */ jsx("div", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						className: "rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600",
						children: isOtpInput ? /* @__PURE__ */ jsxs(Fragment, { children: [
							"Enter the 6-digit code sent to ",
							/* @__PURE__ */ jsx("span", {
								className: "font-black text-[var(--sf-checkout-text)]",
								children: maskedPhone || "your phone"
							}),
							"."
						] }) : state === "placing_order" ? /* @__PURE__ */ jsx(Fragment, { children: "Phone verified. Placing your order securely now." }) : /* @__PURE__ */ jsxs(Fragment, { children: [
							"Send a verification code to ",
							/* @__PURE__ */ jsx("span", {
								className: "font-black text-[var(--sf-checkout-text)]",
								children: maskedPhone || "your phone number"
							}),
							" to place your order."
						] })
					}),
					isOtpInput && /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
						"data-ab-part": adaptiveParts ? "label" : void 0,
						htmlFor: "checkout-modal-otp",
						className: "mb-2 block text-sm font-bold text-slate-700",
						children: "Verification code"
					}), /* @__PURE__ */ jsx("input", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						"data-ab-part": adaptiveParts ? "input" : void 0,
						id: "checkout-modal-otp",
						autoFocus: accessible || void 0,
						"aria-invalid": accessible && error ? true : void 0,
						"aria-describedby": accessible && error ? "checkout-otp-error" : void 0,
						value: otp,
						onChange: (event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6)),
						placeholder: "000000",
						inputMode: "numeric",
						enterKeyHint: "done",
						autoComplete: "one-time-code",
						pattern: "[0-9]*",
						maxLength: 6,
						disabled: isBusy,
						className: "sf-field text-center text-lg font-black tracking-[0.35em]"
					})] }),
					onResendCode && /* @__PURE__ */ jsxs("div", {
						className: "space-y-2 text-sm",
						children: [
							message && /* @__PURE__ */ jsx("p", {
								role: "status",
								className: "text-[var(--sf-checkout-success)]",
								children: message
							}),
							expired && /* @__PURE__ */ jsx("p", {
								role: "status",
								className: "text-[var(--sf-checkout-error)]",
								children: "Verification code expired. Request a new code."
							}),
							isOtpInput ? /* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: onResendCode,
								disabled: isBusy || cooldownSeconds > 0,
								className: "sf-btn sf-btn-secondary min-h-11 w-full py-3 disabled:opacity-50",
								children: sending ? "Sending code…" : cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : "Resend code"
							}) : cooldownSeconds > 0 && /* @__PURE__ */ jsxs("p", { children: [
								"Request another code in ",
								cooldownSeconds,
								"s."
							] })
						]
					}),
					error && /* @__PURE__ */ jsx("p", {
						"data-ab-surface": adaptiveParts ? "" : void 0,
						"data-ab-part": adaptiveParts ? "error" : void 0,
						id: accessible ? "checkout-otp-error" : void 0,
						role: accessible ? "alert" : void 0,
						className: "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-[var(--sf-checkout-error)]",
						children: error
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "grid gap-3 sm:grid-cols-2",
						children: [/* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: onCancel,
							disabled: isBusy,
							className: "sf-btn sf-btn-secondary justify-center py-3 disabled:opacity-50",
							children: "Cancel"
						}), !isOtpInput ? /* @__PURE__ */ jsxs("button", {
							"data-ab-part": adaptiveParts ? "primaryButton" : void 0,
							type: "submit",
							disabled: isBusy || cooldownSeconds > 0,
							className: "sf-btn sf-btn-primary justify-center py-3 disabled:opacity-50",
							children: [sending ? /* @__PURE__ */ jsx(Loader2, {
								size: 17,
								className: "animate-spin"
							}) : /* @__PURE__ */ jsx(Phone, { size: 17 }), "Send Code"]
						}) : /* @__PURE__ */ jsxs("button", {
							"data-ab-part": adaptiveParts ? "primaryButton" : void 0,
							type: "submit",
							disabled: isBusy || otp.length !== 6 || expired,
							className: "sf-btn sf-btn-primary justify-center py-3 disabled:opacity-50",
							children: [verifying || state === "placing_order" ? /* @__PURE__ */ jsx(Loader2, {
								size: 17,
								className: "animate-spin"
							}) : /* @__PURE__ */ jsx(ShieldCheck, { size: 17 }), state === "placing_order" ? "Placing order" : "Verify & place order"]
						})]
					})
				]
			})]
		})
	});
	return accessible ? /* @__PURE__ */ jsx(AtelierCheckoutDialog, {
		open,
		onClose: onCancel,
		busy: isBusy,
		render: renderModal
	}) : renderModal();
}
//#endregion
//#region packages/storefront-renderer/adaptive/ProtectedCore.jsx
function ProtectedCore({ pageKind, data = {}, actions = {} }) {
	if (pageKind === "header" || pageKind === "footer") return /* @__PURE__ */ jsx(pageKind === "header" ? ReferenceStorefrontHeader : ReferenceStorefrontFooter, {
		adaptiveParts: true,
		theme: data.theme,
		shopName: data.shopName,
		subdomain: data.subdomain,
		cartCount: data.cartCount || 0,
		LinkComponent: Link,
		preview: data.preview === true,
		onSearch: actions.search,
		trustedBadge: data.trustedBadge,
		shopVerification: data.shopVerification
	});
	if (pageKind === "product") {
		if (data.state === "loading") return /* @__PURE__ */ jsx("p", {
			role: "status",
			children: "Loading product…"
		});
		if (data.state === "missing" || !data.product) return /* @__PURE__ */ jsx("p", {
			role: "status",
			children: "Product unavailable"
		});
		return /* @__PURE__ */ jsxs(Fragment, { children: [data.error && /* @__PURE__ */ jsx("p", {
			"data-ab-part": "error",
			role: "alert",
			children: data.error
		}), /* @__PURE__ */ jsx(ProductDetailsView, {
			adaptiveParts: true,
			product: data.product,
			currentVariant: data.currentVariant,
			displayStock: data.displayStock,
			baseOriginalPrice: data.baseOriginalPrice,
			displayDiscount: data.displayDiscount,
			displayFinalPrice: data.displayFinalPrice,
			availableAttributes: data.availableAttributes,
			selectedAttributes: data.selectedAttributes,
			quantity: data.quantity,
			setQuantity: actions.setQuantity,
			handleVariantSelect: actions.selectVariant,
			handleAddToCart: actions.addToCart,
			handleBuyNow: actions.buyNow,
			presentationVariant: data.presentationVariant
		})] });
	}
	if (pageKind === "checkout") {
		if (data.state === "success") return /* @__PURE__ */ jsx(CheckoutSuccessState, {
			adaptiveParts: true,
			orderId: data.orderId
		});
		if (data.state === "empty") return /* @__PURE__ */ jsx(CheckoutEmptyCartState, { adaptiveParts: true });
		if (!data.formData || !Array.isArray(data.cartItems)) return /* @__PURE__ */ jsx("p", {
			role: "alert",
			children: "Checkout data unavailable. Please reload before ordering."
		});
		return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs(CheckoutPageShell, {
			adaptiveParts: true,
			checkoutBranding: data.checkoutBranding,
			onSubmit: actions.submit,
			mobileStickyBar: /* @__PURE__ */ jsx(CheckoutMobileStickyBar, {
				adaptiveParts: true,
				loading: data.loading,
				phoneVerified: data.phoneVerified,
				policyAccepted: data.policyAccepted,
				totalAmount: data.totalAmount
			}),
			children: [
				/* @__PURE__ */ jsxs("div", {
					"data-ab-region": "details",
					children: [data.error && /* @__PURE__ */ jsx("p", {
						"data-ab-part": "error",
						role: "alert",
						children: data.error
					}), /* @__PURE__ */ jsx(CheckoutDetailsColumn, {
						adaptiveParts: true,
						formData: data.formData,
						onInputChange: actions.input,
						isDhaka: data.isDhaka,
						presentationVariant: data.presentationVariant
					})]
				}),
				/* @__PURE__ */ jsx(CheckoutMarketingConsent, {
					adaptiveParts: true,
					checked: data.marketingEmailOptIn,
					onChange: actions.marketingConsent
				}),
				/* @__PURE__ */ jsx("div", {
					"data-ab-region": "summary",
					children: /* @__PURE__ */ jsx(CheckoutOrderSummary, {
						adaptiveParts: true,
						presentationVariant: data.presentationVariant,
						cartItems: data.cartItems,
						checkoutBranding: data.checkoutBranding,
						finalShippingCost: data.finalShippingCost,
						loading: data.loading,
						policies: data.policies,
						policyAccepted: data.policyAccepted,
						productsDetails: data.productsDetails,
						promotionCode: data.promotionCode,
						promotionDiscount: data.promotionDiscount,
						promotionMessage: data.promotionMessage,
						phoneVerified: data.phoneVerified,
						subtotal: data.subtotal,
						totalAmount: data.totalAmount,
						visiblePolicies: data.visiblePolicies,
						onApplyPromotion: actions.applyPromotion,
						removeFromCart: actions.removeFromCart,
						setPolicyAccepted: actions.policyConsent,
						setPromotionCode: actions.promotionCode,
						updateQuantity: actions.updateQuantity
					})
				})
			]
		}), /* @__PURE__ */ jsx(CheckoutOtpModal, {
			adaptiveParts: true,
			presentationVariant: data.presentationVariant,
			open: data.otp.open,
			error: data.otp.error,
			message: data.otp.message,
			cooldownSeconds: data.otp.cooldownSeconds,
			expired: data.otp.expired,
			maskedPhone: data.otp.maskedPhone,
			otp: data.otp.value,
			sending: data.otp.sending,
			state: data.otp.state,
			verifying: data.otp.verifying,
			onResendCode: actions.resendOtp,
			onCancel: actions.cancelOtp,
			onSendCode: actions.sendOtp,
			onVerifyCode: actions.verifyOtp,
			setOtp: actions.otp
		})] });
	}
	return null;
}
//#endregion
//#region packages/storefront-renderer/adaptive/PageTemplateRenderer.jsx
const hrefFor = (destination) => ({
	storePath: destination.path,
	https: destination.url,
	email: `mailto:${destination.address}`,
	phone: `tel:${destination.number}`
})[destination.kind];
const approvedAsset = (asset) => asset && typeof asset.url === "string" && /^(?:\/(?!\/)|https:\/\/)/.test(asset.url) && !/[\\\s<>]/u.test(asset.url) && isNextImageAllowed(asset.url);
function Block({ id, plan, data, actions, editor }) {
	const node = plan.nodes[id];
	const props = {
		"data-ab-node": id,
		"data-ab-type": node.type,
		"data-ab-style": node.styleId,
		...editor ? { tabIndex: 0 } : {}
	};
	if (node.type.endsWith(".core")) return /* @__PURE__ */ jsx("div", {
		...props,
		"data-ab-core": plan.pageKind,
		children: /* @__PURE__ */ jsx("div", {
			"data-ab-part": "surface",
			children: /* @__PURE__ */ jsx(ProtectedCore, {
				pageKind: plan.pageKind,
				data: data.core,
				actions: actions.core
			})
		})
	});
	const children = Object.values(node.slots || {}).flat().map((child) => /* @__PURE__ */ jsx(Block, {
		id: child,
		plan,
		data,
		actions,
		editor
	}, child));
	switch (node.type) {
		case "content.section": return /* @__PURE__ */ jsx("section", {
			...props,
			children
		});
		case "layout.stack":
		case "layout.columns": return /* @__PURE__ */ jsx("div", {
			...props,
			children
		});
		case "content.text": return node.content.kind === "heading" ? /* @__PURE__ */ jsx("h2", {
			...props,
			children: node.content.text
		}) : /* @__PURE__ */ jsx("p", {
			...props,
			children: node.content.text
		});
		case "content.link": return /* @__PURE__ */ jsx(Link, {
			...props,
			href: hrefFor(node.content.destination),
			children: /* @__PURE__ */ jsx("span", {
				"data-ab-part": "label",
				children: node.content.label
			})
		});
		case "content.image": {
			const asset = data.assets?.[node.content.assetId];
			return /* @__PURE__ */ jsx("div", {
				...props,
				children: approvedAsset(asset) ? /* @__PURE__ */ jsx(Image, {
					src: asset.url,
					width: asset.width,
					height: asset.height,
					alt: node.content.alt,
					unoptimized: shouldUseUnoptimizedImage(asset.url)
				}) : /* @__PURE__ */ jsx("span", {
					role: "img",
					"aria-label": node.content.alt || "Image unavailable",
					children: "Image unavailable"
				})
			});
		}
		case "catalog.products":
		case "catalog.categories": {
			const source = data.sources?.[id];
			const products = (source?.products || []).slice(0, node.source.productIds?.length || node.source.limit);
			const categories = (source?.categories || []).slice(0, node.source.limit);
			return /* @__PURE__ */ jsx("div", {
				...props,
				children: /* @__PURE__ */ jsx(HomepageSection, {
					adaptiveParts: true,
					section: {
						id,
						type: node.type === "catalog.products" ? "FeaturedProducts" : "CategoryList"
					},
					sectionProducts: { [id]: products },
					catalogProducts: products,
					categories,
					layout: data.catalogLayout || {},
					productCard: data.productCard || {},
					mobile: {},
					LinkComponent: Link,
					onProductAdd: actions.catalog?.addToCart,
					onProductBuyNow: actions.catalog?.buyNow
				})
			});
		}
		default: throw new TypeError("Resolved plan contained an unsupported block.");
	}
}
function PageTemplateRenderer({ plan, pageKind, data = {}, actions = {}, runtime, editor = false }) {
	const identity = useId();
	const scope = `ab_${Array.from(identity, (char) => char.codePointAt(0).toString(16).padStart(4, "0")).join("")}`;
	const content = isAdaptivePagePlan(plan) && plan.pageKind === pageKind ? /* @__PURE__ */ jsxs("div", {
		className: "sf-adaptive",
		"data-ab-scope": scope,
		"data-ab-template": plan.templateId,
		children: [/* @__PURE__ */ jsx("style", { children: compileAdaptiveStyles(plan, scope) }), plan.rootOrder.map((id) => /* @__PURE__ */ jsx(Block, {
			id,
			plan,
			data,
			actions,
			editor
		}, id))]
	}) : /* @__PURE__ */ jsxs("div", {
		"data-ab-fallback": "invalid-plan",
		children: [/* @__PURE__ */ jsx("p", {
			role: "alert",
			children: "The store design could not load."
		}), /* @__PURE__ */ jsx(ProtectedCore, {
			pageKind,
			data: data.core,
			actions: actions.core
		})]
	});
	return runtime ? /* @__PURE__ */ jsx(PresentationRuntime, {
		value: runtime,
		children: content
	}) : content;
}
//#endregion
export { ADAPTIVE_RENDERED_PAGES, ADAPTIVE_RENDER_CAPABILITIES, CheckoutBrandingBanner, CheckoutCustomerInfo, CheckoutDeliveryChargeNotice, CheckoutDeliveryMethod, CheckoutDetailsColumn, CheckoutEmptyCartState, CheckoutMarketingConsent, CheckoutMobileStickyBar, CheckoutOrderSummary, CheckoutOtpModal, CheckoutPageShell, CheckoutPaymentMethod, CheckoutPhoneOtpBox, CheckoutSuccessState, CheckoutTrustBadges, PageTemplateRenderer, ProductDetailsView, ProtectedCore, compileAdaptiveStyles, resolveAdaptivePage };
