import { t as __commonJSMin } from "./chunk-B-1-B7_t.js";
//#region node_modules/@scaleup/storefront-theme/homepage-seo.cjs
var require_homepage_seo = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var TITLE_MAX = 70;
	var DESCRIPTION_MAX = 170;
	var DEFAULT_PLATFORM_DOMAIN = "scaleup.codes";
	var cleanSeoText = (value = "", maxLength = 500) => String(value || "").normalize("NFKC").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
	var truncateSeoText = (value = "", maxLength = 160) => {
		const text = cleanSeoText(value, maxLength + 80);
		if (text.length <= maxLength) return text;
		const clipped = text.slice(0, maxLength - 1).trim();
		const lastSpace = clipped.lastIndexOf(" ");
		return `${(lastSpace > Math.floor(maxLength * .55) ? clipped.slice(0, lastSpace) : clipped).trim()}…`;
	};
	var normalizeSearchText = (value = "") => cleanSeoText(value, 120).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
	var SPELLING_GROUPS = Object.freeze([
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
	var SPELLING_CANONICAL = SPELLING_GROUPS.reduce((map, group) => {
		group.forEach((value) => map.set(value, group[0]));
		return map;
	}, /* @__PURE__ */ new Map());
	var canonicalizeSearchTokens = (value = "") => normalizeSearchText(value).split(" ").filter(Boolean).map((token) => SPELLING_CANONICAL.get(token) || token);
	var expandSearchSynonyms = (value = "") => {
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
	var areBrandAliasesRelated = (officialName = "", alias = "") => {
		const officialTokens = new Set(canonicalizeSearchTokens(officialName));
		const aliasTokens = canonicalizeSearchTokens(alias);
		if (!officialTokens.size || !aliasTokens.length) return false;
		return aliasTokens.some((token) => officialTokens.has(token));
	};
	var normalizeSearchAliases = ({ aliases = [], officialName = "", maxAliases = 8 } = {}) => {
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
	var stableValue = (value) => {
		if (Array.isArray(value)) return value.map(stableValue);
		if (value && typeof value === "object") return Object.keys(value).sort().reduce((output, key) => {
			output[key] = stableValue(value[key]);
			return output;
		}, {});
		return value;
	};
	var hashText = (value = "") => {
		let hash = 2166136261;
		for (let index = 0; index < value.length; index += 1) {
			hash ^= value.charCodeAt(index);
			hash = Math.imul(hash, 16777619);
		}
		return (hash >>> 0).toString(16).padStart(8, "0");
	};
	var buildSeoInputSnapshot = ({ shopIdentity = {}, storefrontContent = {}, catalogSummary = {}, commerce = {} } = {}) => ({
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
	var computeSeoInputHash = (context = {}) => hashText(JSON.stringify(stableValue(buildSeoInputSnapshot(context))));
	var normalizeHost = (value = "") => String(value || "").trim().replace(/^https?:\/\//i, "").split(/[/?#]/)[0].replace(/\.+$/, "").toLowerCase();
	var isVerifiedCustomDomain = (customDomain = {}) => customDomain?.status === "Verified" && Boolean(normalizeHost(customDomain.domain)) && customDomain.ownershipVerified === true && (customDomain.routingVerified === true || customDomain.manuallyVerifiedRouting === true);
	var resolveCanonicalOrigin = ({ canonicalUrl = "", customDomain = {}, subdomain = "", platformDomain = DEFAULT_PLATFORM_DOMAIN } = {}) => {
		if (canonicalUrl) try {
			const url = new URL(canonicalUrl);
			return `${url.protocol === "http:" && /localhost|127\.0\.0\.1/i.test(url.hostname) ? "http:" : "https:"}//${url.host}`;
		} catch {}
		if (isVerifiedCustomDomain(customDomain)) return `https://${normalizeHost(customDomain.domain)}`;
		const cleanSubdomain = normalizeSearchText(subdomain).replace(/\s+/g, "-");
		const cleanPlatformDomain = normalizeHost(platformDomain) || DEFAULT_PLATFORM_DOMAIN;
		return cleanSubdomain ? `https://${cleanSubdomain}.${cleanPlatformDomain}` : `https://${cleanPlatformDomain}`;
	};
	var normalizeSocialImage = (seo = {}, fallbackImage = {}) => {
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
	var SEO_ORIGINS = [
		"provider",
		"deterministic_fallback",
		"mixed",
		"manual",
		"unknown_legacy"
	];
	var normalizeAcceptedSeoProvenance = (seo = {}) => Object.fromEntries(["title", "description"].map((field) => {
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
	var applySeoSuggestion = (seo, result, option, fields = ["title", "description"], now = (/* @__PURE__ */ new Date()).toISOString()) => {
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
	var editSeoField = (seo, field, value) => {
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
	var findAcceptedAiSource = (seo = {}, field, value) => {
		const suggestion = seo.aiSuggestion || {};
		const origin = normalizeAcceptedSeoProvenance(seo)[field];
		if (origin) return origin.source;
		const acceptedFields = Array.isArray(suggestion.acceptedFields) ? suggestion.acceptedFields : [];
		if (!suggestion.acceptedAt || !acceptedFields.includes(field)) return "manual";
		return cleanSeoText((suggestion.alternatives || []).find((option) => String(option?.id) === String(suggestion.acceptedOptionId))?.[field], field === "title" ? TITLE_MAX : DESCRIPTION_MAX) === value ? "unknown_legacy" : "manual";
	};
	var resolveTextField = ({ seo = {}, field, generated = "", fallback = "" }) => {
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
	var compactObject = (value) => JSON.parse(JSON.stringify(value));
	var resolveHomepageSeo = ({ seo = {}, shopIdentity = {}, storefrontContent = {}, catalogSummary = {}, domain = {}, indexing = {}, socialProfiles = {}, commerce = {}, publicContact = {}, platform = {} } = {}) => {
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
	var buildNextHomepageMetadata = (resolvedSeo = {}, { icons, googleSiteVerification = "" } = {}) => {
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
	var buildSeoPreviewModel = (resolvedSeo = {}) => ({
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
	var isGenericTitle = (value = "") => /^(?:home|online store|welcome|shop now)$/i.test(cleanSeoText(value));
	var weakAltText = (value = "") => /^(?:image|photo|product|img[_-]?\d+)$/i.test(cleanSeoText(value));
	var statusForResolvedSource = (source = "", valid = true) => {
		if (!valid) return "invalid";
		if (source === "generated") return "generated";
		if (source === "fallback") return "fallback";
		if (source === "missing") return "missing";
		return "complete";
	};
	var evaluateHomepageSeo = (resolvedSeo = {}, context = {}) => {
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
//#region node_modules/@scaleup/storefront-theme/composition.cjs
var require_composition = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var HOMEPAGE_COMPOSITIONS = Object.freeze({
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
	var getHomepageComposition = (value) => Object.hasOwn(HOMEPAGE_COMPOSITIONS, value) ? value : "standard";
	var planHomepageComposition = ({ composition, sections = [], isAvailable = () => true } = {}) => {
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
//#region node_modules/@scaleup/storefront-theme/policies.cjs
var require_policies = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var POLICY_TYPES = [
		"refund",
		"shipping",
		"privacy",
		"terms"
	];
	var DEFAULT_POLICY_TEMPLATES = {
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
	var cleanPlaceholderValue = (value, fallback = "") => String(value || fallback || "").trim();
	var injectPolicyPlaceholders = (body = "", context = {}) => {
		const storeName = cleanPlaceholderValue(context.storeName || context.shopName, "this store");
		const contactEmail = cleanPlaceholderValue(context.contactEmail);
		const contactPhone = cleanPlaceholderValue(context.contactPhone);
		return String(body).replace(/\{\{STORE_NAME\}\}/g, storeName).replace(/\{\{CONTACT_EMAIL\}\}/g, contactEmail).replace(/\{\{CONTACT_PHONE\}\}/g, contactPhone).trim();
	};
	var getDefaultPolicyText = (type, context = {}) => {
		const template = DEFAULT_POLICY_TEMPLATES[type];
		if (!template) return "";
		return injectPolicyPlaceholders(template.body, context);
	};
	var buildDefaultPolicies = (context = {}) => POLICY_TYPES.reduce((acc, type) => {
		acc[type] = getDefaultPolicyText(type, context);
		return acc;
	}, {});
	var hasPolicyText = (value) => typeof value === "string" && value.trim().length > 0;
	var fillMissingPolicyDefaults = (existingPolicies = {}, context = {}) => {
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
//#region node_modules/@scaleup/storefront-theme/effective.cjs
var require_effective = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { fillMissingPolicyDefaults } = require_policies();
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
//#region node_modules/@scaleup/storefront-theme/capabilities.cjs
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
			const sections = Object.fromEntries(Object.entries(SECTION_REGISTRY).map(([type, definition]) => [type, {
				editable: editable && (full || limitedEditableSections.includes(type)),
				addable: full && definition.editorEnabled,
				variants: STRUCTURAL_VARIANTS.sections[type] ? variants(STRUCTURAL_VARIANTS.sections[type]) : null
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
			const presentationControlled = theme.presentationVariant === "atelier-editorial" && ["header.variant", "hero.variant"].includes(normalizedPath);
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
//#region node_modules/@scaleup/storefront-theme/index.cjs
var require_storefront_theme = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var homepageSeo = require_homepage_seo();
	var { HOMEPAGE_COMPOSITIONS, getHomepageComposition, planHomepageComposition } = require_composition();
	var THEME_SCHEMA_VERSION = 4;
	var structuralVariant = (defaultValue, values) => Object.freeze({
		default: defaultValue,
		values: Object.freeze(values)
	});
	var STRUCTURAL_VARIANTS = Object.freeze({
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
	var normalizeStructuralVariant = (value, contract) => contract?.values?.includes(value) ? value : contract?.default;
	var sectionDefinition = ({ label, category, defaultSettings = {}, renderer = "generic", editorEnabled = true, productSource = false, supportsMedia = false, supportsFocalPoint = false, previewOnlyAction = false, migrationAliases = [] }) => Object.freeze({
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
	var SECTION_REGISTRY = Object.freeze({
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
	var SECTION_TYPES = Object.freeze(Object.keys(SECTION_REGISTRY));
	var ALLOWED_THEME_KEYS = Object.freeze([
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
	var DEFAULT_COLORS = {
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
	var FALLBACK_THEME = Object.freeze({
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
	var HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
	var LEGACY_LOW_CONTRAST_FOOTER_TEXT = "#94a3b8";
	var UNSAFE_URL_PATTERN = /^(?:javascript|vbscript|data):/i;
	var URL_FIELD_PATTERN = /(?:url|href|link|image|images|logo|favicon)$/i;
	var LEGACY_DEFAULT_COLORS = {
		accent: "#4f46e5",
		accentHover: "#4338ca",
		accentSoft: "#c7d2fe",
		accentBg: "#eef2ff",
		accentStrong: "#3730a3",
		accentMuted: "#818cf8",
		accentLight: "#a5b4fc",
		accentRing: "#e0e7ff"
	};
	var cloneTheme = (value) => JSON.parse(JSON.stringify(value || {}));
	var isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
	var mergeObject = (base, incoming) => ({
		...base,
		...isPlainObject(incoming) ? incoming : {}
	});
	var clamp = (value, min, max, fallback) => {
		const number = Number(value);
		return Number.isFinite(number) ? Math.min(Math.max(number, min), max) : fallback;
	};
	var cleanText = (value = "", maxLength = 5e3) => String(value || "").replace(/\0/g, "").replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, "").trim().slice(0, maxLength);
	var isSafeThemeUrl = (value = "") => {
		const raw = String(value || "").trim();
		if (!raw) return true;
		const compact = raw.replace(/[\u0000-\u001F\u007F\s]+/g, "");
		if (UNSAFE_URL_PATTERN.test(compact) || raw.startsWith("//")) return false;
		return raw.startsWith("#") || raw.startsWith("/") || /^https?:\/\//i.test(raw) || /^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(raw) || /^tel:\+?[0-9().\-\s]{4,30}$/i.test(raw);
	};
	var sanitizeThemeUrl = (value = "") => {
		const raw = cleanText(value, 1e3);
		return isSafeThemeUrl(raw) ? raw : "#";
	};
	var sanitizeThemeValue = (value, key = "", depth = 0) => {
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
	var sanitizeColorObject = (value = {}) => Object.entries(isPlainObject(value) ? value : {}).reduce((acc, [key, color]) => {
		if (isPlainObject(color)) {
			const nested = sanitizeColorObject(color);
			if (Object.keys(nested).length) acc[key] = nested;
		} else if (typeof color === "string" && HEX_COLOR_REGEX.test(color.trim())) acc[key] = color.trim();
		return acc;
	}, {});
	var sanitizeThemePayload = (theme = {}) => {
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
	var mergeColorGroup = (base = {}, incoming = {}) => Object.keys(base).reduce((acc, key) => {
		acc[key] = HEX_COLOR_REGEX.test(String(incoming?.[key] || "")) ? incoming[key] : base[key];
		return acc;
	}, {});
	var normalizeHexColor = (value = "") => {
		const color = String(value || "").trim().toLowerCase();
		if (!HEX_COLOR_REGEX.test(color)) return "";
		if (color.length === 4) return `#${color.slice(1).split("").map((channel) => `${channel}${channel}`).join("")}`;
		return color;
	};
	var hexToRgb = (value = "") => {
		const color = normalizeHexColor(value);
		if (!color) return null;
		return {
			r: Number.parseInt(color.slice(1, 3), 16),
			g: Number.parseInt(color.slice(3, 5), 16),
			b: Number.parseInt(color.slice(5, 7), 16)
		};
	};
	var rgbToHex = ({ r, g, b }) => `#${[
		r,
		g,
		b
	].map((channel) => Math.min(255, Math.max(0, Math.round(channel))).toString(16).padStart(2, "0")).join("")}`;
	var relativeLuminance = (value = "") => {
		const rgb = hexToRgb(value);
		if (!rgb) return null;
		const linear = (channel) => {
			const normalized = channel / 255;
			return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
		};
		return .2126 * linear(rgb.r) + .7152 * linear(rgb.g) + .0722 * linear(rgb.b);
	};
	var contrastRatio = (foreground = "", background = "") => {
		const foregroundLuminance = relativeLuminance(foreground);
		const backgroundLuminance = relativeLuminance(background);
		if (foregroundLuminance === null || backgroundLuminance === null) return null;
		const lighter = Math.max(foregroundLuminance, backgroundLuminance);
		const darker = Math.min(foregroundLuminance, backgroundLuminance);
		return (lighter + .05) / (darker + .05);
	};
	var mixHexColors = (from = "", to = "", amount = 0) => {
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
	var suggestAccessibleForeground = (foreground = "", background = "", minimumRatio = 4.5) => {
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
	var THEME_CONTRAST_PAIRS = Object.freeze([
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
	var getPathValue = (value = {}, path = "") => String(path || "").split(".").filter(Boolean).reduce((current, key) => current?.[key], value);
	var evaluateThemeContrast = (themeCandidate = {}, minimumRatio = 4.5) => {
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
	var normalizeThemeColors = (theme = {}) => {
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
	var normalizeFocalPoint = (value = {}) => ({
		x: clamp(value?.x, 0, 100, 50),
		y: clamp(value?.y, 0, 100, 50)
	});
	var normalizeProductSource = (section = {}) => {
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
	var isLegacyAllProductsSection = (section = {}) => {
		if (!["FeaturedProducts", "Collection"].includes(section.type)) return false;
		const settings = section.settings || {};
		const source = settings.source || section.source || {};
		const productIds = settings.productIds || source.productIds || [];
		return !source.type && (!Array.isArray(productIds) || productIds.length === 0);
	};
	var normalizeHomepageSections = (sections = []) => (Array.isArray(sections) ? sections : []).filter((section) => section && section.type !== "Hero" && !isLegacyAllProductsSection(section)).map((rawSection, index) => {
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
	var resolveHeroSlideFields = (slide = {}, index = 0, hero = {}) => ({
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
	var normalizeHeroSlide = (slide = {}, index = 0, hero = {}) => {
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
	var ensurePolicyNavigationLink = (navigation = []) => {
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
	var normalizeNavigation = (navigation = []) => ensurePolicyNavigationLink(Array.isArray(navigation) ? navigation : FALLBACK_THEME.navigation).slice(0, 20).map((item, index) => ({
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
	var hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
	var SUPPORTED_THEME_FONTS = new Set([
		"Inter",
		"Arial",
		"Georgia",
		"Roboto",
		"DM Sans"
	]);
	var SUPPORTED_HEADING_WEIGHTS = new Set([
		"600",
		"700",
		"800",
		"900"
	]);
	var PRODUCT_CARD_STYLE_DEFAULTS = Object.freeze({
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
	var PRODUCT_CARD_STYLE_FIELDS = Object.freeze([
		"shadow",
		"titleWeight",
		"buttonStyle"
	]);
	var NULLABLE_THEME_PATCH_PATHS = new Set([
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
	var isThemePatchObject = (value) => value !== null && typeof value === "object" && [Object.prototype, null].includes(Object.getPrototypeOf(value));
	var isThemePatchKey = (key) => ![
		"__proto__",
		"constructor",
		"prototype"
	].includes(key) && !key.startsWith("$") && !key.includes(".");
	var mergeThemePatch = (base = {}, patch = {}) => {
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
	var normalizeLayout = (theme = {}) => {
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
	var normalizeTypography = (theme = {}) => {
		const raw = isPlainObject(theme.typography) ? theme.typography : {};
		const legacyFont = SUPPORTED_THEME_FONTS.has(theme.fontFamily) ? theme.fontFamily : FALLBACK_THEME.fontFamily;
		return {
			headingFont: SUPPORTED_THEME_FONTS.has(raw.headingFont) ? raw.headingFont : legacyFont,
			bodyFont: SUPPORTED_THEME_FONTS.has(raw.bodyFont) ? raw.bodyFont : legacyFont,
			baseSize: clamp(raw.baseSize, 12, 20, FALLBACK_THEME.typography.baseSize),
			headingWeight: SUPPORTED_HEADING_WEIGHTS.has(String(raw.headingWeight)) ? String(raw.headingWeight) : FALLBACK_THEME.typography.headingWeight
		};
	};
	var normalizeProductCard = (theme = {}) => {
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
	var updateProductCardSetting = (candidate = {}, key, value) => {
		const card = normalizeProductCard({ productCard: candidate });
		const next = {
			...card,
			[key]: value
		};
		if (key === "style") next.inheritedStyleFields = [...PRODUCT_CARD_STYLE_FIELDS];
		else if (PRODUCT_CARD_STYLE_FIELDS.includes(key) && Array.isArray(card.inheritedStyleFields)) next.inheritedStyleFields = card.inheritedStyleFields.filter((field) => field !== key);
		return normalizeProductCard({ productCard: next });
	};
	var normalizeAllProducts = ({ theme, layout, legacyAllProducts }) => {
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
	var normalizeTheme = (candidate = {}) => {
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
	var validateTheme = (candidate = {}) => {
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
	var createDefaultSection = (type, overrides = {}) => {
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
	var getEnabledHomepageSections = (theme = {}) => normalizeTheme(theme).homepageSections.filter((section) => section.isEnabled !== false).sort((a, b) => a.sortOrder - b.sortOrder);
	var getSortedNavigation = (theme = {}) => normalizeTheme(theme).navigation.filter((item) => item.label && (item.url || item.children?.length));
	var getThemeCssVars = (themeCandidate = {}) => {
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
	var extractThemeAssetUrls = (theme = {}) => {
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
	var summarizeThemeChanges = (before = {}, after = {}) => {
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
	var getStorefrontPresentationVariant = (theme = {}) => theme?.presentationVariant === "atelier-editorial" ? "atelier-editorial" : "default";
	module.exports = {
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
	var policies = require_policies();
	var effective = require_effective()(module.exports);
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
	var capabilities = require_capabilities()(module.exports);
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
export { require_storefront_theme as t };

//# sourceMappingURL=storefront-theme-rNTy8Z_a.js.map