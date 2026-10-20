const _jsxDEV = __vite__cjsImport5_react_jsxDevRuntime["jsxDEV"]; const _Fragment = __vite__cjsImport5_react_jsxDevRuntime["Fragment"];"use client";
import { useAtelierDialog } from "/node_modules/@scaleup/storefront-renderer/atelier/useAtelierDialog.js?v=d5ed7809";
import { Image, Link } from "/node_modules/@scaleup/storefront-renderer/presentation/Runtime.jsx";
import SafeProductImage from "/node_modules/@scaleup/storefront-renderer/presentation/SafeProductImage.jsx";
import { ArrowLeft, CheckCircle, CreditCard, FileText, Loader2, Lock, Mail, MapPin, Minus, Package, Phone, Plus, ShieldCheck, Trash2, Truck, User, X } from "/node_modules/.vite/deps/lucide-react.js?v=d5ed7809";
import { shouldUseUnoptimizedImage } from "/node_modules/@scaleup/storefront-renderer/imageDomains.js?v=d5ed7809";
var _jsxFileName = "C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/node_modules/@scaleup/storefront-renderer/presentation/CheckoutSections.jsx";
import __vite__cjsImport5_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=d5ed7809";
export function CheckoutSuccessState({ orderId }) {
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "sf-checkout-page sf-page flex min-h-screen items-center justify-center px-4",
		children: /* @__PURE__ */ _jsxDEV("div", {
			className: "w-full max-w-lg rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] p-8 text-center shadow-2xl shadow-slate-200/70 sm:p-10",
			children: [
				/* @__PURE__ */ _jsxDEV(CheckCircle, {
					size: 90,
					className: "mx-auto mb-6 text-[var(--sf-checkout-success)]"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 33,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ _jsxDEV("h1", {
					className: "mb-3 text-4xl font-black text-[var(--sf-checkout-text)]",
					children: "Order Confirmed"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 38,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ _jsxDEV("p", {
					className: "leading-relaxed text-slate-600",
					children: "Thank you for your purchase."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 42,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ _jsxDEV("div", {
					className: "mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5",
					children: [
						/* @__PURE__ */ _jsxDEV("p", {
							className: "mb-2 text-sm font-black uppercase tracking-[0.16em] text-slate-500",
							children: "ORDER ID FOR TRACKING"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 47,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ _jsxDEV("p", {
							className: "text-2xl font-black tracking-wider text-[var(--sf-checkout-accent)]",
							children: ["#", orderId?.slice(-6)?.toUpperCase()]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 51,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ _jsxDEV("p", {
							className: "mt-2 break-all text-xs text-slate-500",
							children: ["Full ID: ", orderId]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 57,
							columnNumber: 21
						}, this),
						/* @__PURE__ */ _jsxDEV("p", {
							className: "mt-3 text-xs text-slate-500",
							children: "Use the short ID and your delivery phone number on the Track Order page."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 60,
							columnNumber: 21
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 46,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ _jsxDEV(Link, {
					href: "/",
					className: "sf-btn sf-btn-primary mt-8 px-8",
					children: "Continue Shopping"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 65,
					columnNumber: 17
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 32,
			columnNumber: 13
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 31,
		columnNumber: 9
	}, this);
}
export function CheckoutEmptyCartState() {
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "sf-checkout-page sf-page flex min-h-[70vh] flex-col items-center justify-center px-4 text-center",
		children: [
			/* @__PURE__ */ _jsxDEV(Package, {
				size: 80,
				className: "mb-6 text-slate-300"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 79,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ _jsxDEV("h2", {
				className: "mb-3 text-3xl font-black text-[var(--sf-checkout-text)]",
				children: "Your cart is empty"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 84,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ _jsxDEV("p", {
				className: "mb-8 text-slate-500",
				children: "Add some products first"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 88,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ _jsxDEV(Link, {
				href: "/",
				className: "sf-btn sf-btn-primary px-7",
				children: "Continue Shopping"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 92,
				columnNumber: 13
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 78,
		columnNumber: 9
	}, this);
}
export function CheckoutBrandingBanner({ checkoutBranding }) {
	if (!checkoutBranding.logoUrl && !checkoutBranding.bannerText) {
		return null;
	}
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "mb-8 rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] p-6 text-center shadow-sm",
		children: [checkoutBranding.logoUrl && /* @__PURE__ */ _jsxDEV(Image, {
			src: checkoutBranding.logoUrl,
			alt: "",
			width: 180,
			height: 48,
			unoptimized: shouldUseUnoptimizedImage(checkoutBranding.logoUrl),
			className: "mx-auto mb-3 h-12 w-auto object-contain"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 110,
			columnNumber: 17
		}, this), checkoutBranding.bannerText && /* @__PURE__ */ _jsxDEV("p", {
			className: "text-sm font-bold text-slate-700",
			children: checkoutBranding.bannerText
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 120,
			columnNumber: 17
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 108,
		columnNumber: 9
	}, this);
}
function CheckoutHeader() {
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
		children: [/* @__PURE__ */ _jsxDEV("div", { children: [
			/* @__PURE__ */ _jsxDEV(Link, {
				href: "/cart",
				className: "mb-4 inline-flex items-center text-sm font-bold text-slate-500 transition hover:text-[var(--sf-checkout-accent)]",
				children: [/* @__PURE__ */ _jsxDEV(ArrowLeft, {
					size: 16,
					className: "mr-2"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 134,
					columnNumber: 21
				}, this), "Back to Cart"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 130,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ _jsxDEV("p", {
				className: "sf-kicker",
				children: "Checkout"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 140,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ _jsxDEV("h1", {
				className: "sf-heading mt-1 text-3xl sm:text-4xl",
				style: { color: "var(--sf-checkout-text)" },
				children: "Complete your order"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 141,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ _jsxDEV("p", {
				className: "mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500",
				children: "Confirm delivery details, review your items, and place the order securely."
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 142,
				columnNumber: 17
			}, this)
		] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 129,
			columnNumber: 13
		}, this), /* @__PURE__ */ _jsxDEV(CheckoutTrustBadges, {}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 146,
			columnNumber: 13
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 128,
		columnNumber: 9
	}, this);
}
export function CheckoutTrustBadges() {
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-3",
		children: [
			/* @__PURE__ */ _jsxDEV("span", {
				className: "inline-flex items-center gap-2 rounded-full bg-[var(--sf-checkout-card-background)] px-3 py-2 shadow-sm",
				children: [/* @__PURE__ */ _jsxDEV(Lock, {
					size: 14,
					className: "text-[var(--sf-checkout-success)]"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 155,
					columnNumber: 17
				}, this), " Secure"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 154,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ _jsxDEV("span", {
				className: "inline-flex items-center gap-2 rounded-full bg-[var(--sf-checkout-card-background)] px-3 py-2 shadow-sm",
				children: [/* @__PURE__ */ _jsxDEV(CreditCard, {
					size: 14,
					className: "text-[var(--sf-checkout-accent)]"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 158,
					columnNumber: 17
				}, this), " COD"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 157,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ _jsxDEV("span", {
				className: "inline-flex items-center gap-2 rounded-full bg-[var(--sf-checkout-card-background)] px-3 py-2 shadow-sm",
				children: [/* @__PURE__ */ _jsxDEV(Truck, {
					size: 14,
					className: "text-sky-600"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 161,
					columnNumber: 17
				}, this), " Delivery"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 160,
				columnNumber: 13
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 153,
		columnNumber: 9
	}, this);
}
export function CheckoutPageShell({ checkoutBranding, children, mobileStickyBar, onSubmit }) {
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "sf-checkout-page sf-page sf-mobile-action-page",
		children: /* @__PURE__ */ _jsxDEV("div", {
			className: "sf-shell-wide py-8 sm:py-10",
			children: [
				/* @__PURE__ */ _jsxDEV(CheckoutBrandingBanner, { checkoutBranding }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 171,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ _jsxDEV(CheckoutHeader, {}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 172,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ _jsxDEV("form", {
					onSubmit,
					className: "grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_450px]",
					children: [children, mobileStickyBar]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 174,
					columnNumber: 17
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 170,
			columnNumber: 13
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 169,
		columnNumber: 9
	}, this);
}
export function CheckoutCustomerInfo({ formData, onInputChange }) {
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] p-6 shadow-sm sm:p-8",
		children: [/* @__PURE__ */ _jsxDEV("h2", {
			className: "mb-6 text-2xl font-black text-[var(--sf-checkout-text)]",
			children: "Customer Information"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 189,
			columnNumber: 13
		}, this), /* @__PURE__ */ _jsxDEV("div", {
			className: "grid grid-cols-1 gap-5 md:grid-cols-2",
			children: [
				/* @__PURE__ */ _jsxDEV("div", {
					className: "md:col-span-2",
					children: [/* @__PURE__ */ _jsxDEV("label", {
						htmlFor: "checkout-full-name",
						className: "mb-2 flex items-center gap-2 text-sm font-bold text-slate-700",
						children: [/* @__PURE__ */ _jsxDEV(User, { size: 16 }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 196,
							columnNumber: 25
						}, this), "Full Name"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 195,
						columnNumber: 21
					}, this), /* @__PURE__ */ _jsxDEV("input", {
						id: "checkout-full-name",
						required: true,
						type: "text",
						name: "fullName",
						value: formData.fullName,
						onChange: onInputChange,
						placeholder: "Enter your full name",
						className: "sf-field"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 200,
						columnNumber: 21
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 194,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("label", {
					htmlFor: "checkout-email",
					className: "mb-2 flex items-center gap-2 text-sm font-bold text-slate-700",
					children: [/* @__PURE__ */ _jsxDEV(Mail, { size: 16 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 214,
						columnNumber: 25
					}, this), "Email"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 213,
					columnNumber: 21
				}, this), /* @__PURE__ */ _jsxDEV("input", {
					id: "checkout-email",
					required: true,
					type: "email",
					name: "email",
					value: formData.email,
					onChange: onInputChange,
					placeholder: "example@gmail.com",
					className: "sf-field"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 218,
					columnNumber: 21
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 212,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("label", {
					htmlFor: "checkout-phone",
					className: "mb-2 flex items-center gap-2 text-sm font-bold text-slate-700",
					children: [/* @__PURE__ */ _jsxDEV(Phone, { size: 16 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 232,
						columnNumber: 25
					}, this), "Phone Number"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 231,
					columnNumber: 21
				}, this), /* @__PURE__ */ _jsxDEV("input", {
					id: "checkout-phone",
					required: true,
					type: "tel",
					name: "phone",
					value: formData.phone,
					onChange: onInputChange,
					placeholder: "+8801XXXXXXXXX",
					className: "sf-field"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 236,
					columnNumber: 21
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 230,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ _jsxDEV("div", {
					className: "md:col-span-2",
					children: [/* @__PURE__ */ _jsxDEV("label", {
						htmlFor: "checkout-address",
						className: "mb-2 flex items-center gap-2 text-sm font-bold text-slate-700",
						children: [/* @__PURE__ */ _jsxDEV(MapPin, { size: 16 }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 250,
							columnNumber: 25
						}, this), "Full Address"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 249,
						columnNumber: 21
					}, this), /* @__PURE__ */ _jsxDEV("textarea", {
						id: "checkout-address",
						required: true,
						rows: 4,
						name: "address",
						value: formData.address,
						onChange: onInputChange,
						placeholder: "House, road, area, thana",
						className: "sf-field resize-none"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 254,
						columnNumber: 21
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 248,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ _jsxDEV("div", {
					className: "md:col-span-2",
					children: [/* @__PURE__ */ _jsxDEV("label", {
						htmlFor: "checkout-city",
						className: "mb-2 block text-sm font-bold text-slate-700",
						children: "Delivery area"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 267,
						columnNumber: 21
					}, this), /* @__PURE__ */ _jsxDEV("select", {
						id: "checkout-city",
						required: true,
						name: "city",
						value: formData.city,
						onChange: onInputChange,
						className: "sf-field",
						children: [
							/* @__PURE__ */ _jsxDEV("option", {
								value: "",
								children: "Select delivery area"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 279,
								columnNumber: 25
							}, this),
							/* @__PURE__ */ _jsxDEV("option", {
								value: "Inside Dhaka",
								children: "Inside Dhaka"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 280,
								columnNumber: 25
							}, this),
							/* @__PURE__ */ _jsxDEV("option", {
								value: "Outside Dhaka",
								children: "Outside Dhaka"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 281,
								columnNumber: 25
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 271,
						columnNumber: 21
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 266,
					columnNumber: 17
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 193,
			columnNumber: 13
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 188,
		columnNumber: 9
	}, this);
}
export function CheckoutDeliveryChargeNotice() {
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "flex gap-5 rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] p-6 shadow-sm",
		children: [/* @__PURE__ */ _jsxDEV(Truck, {
			size: 32,
			className: "mt-1 text-[var(--sf-checkout-accent)]"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 292,
			columnNumber: 13
		}, this), /* @__PURE__ */ _jsxDEV("div", { children: [
			/* @__PURE__ */ _jsxDEV("h3", {
				className: "mb-1 text-lg font-black text-[var(--sf-checkout-text)]",
				children: "Delivery Charge"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 298,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ _jsxDEV("p", {
				className: "text-sm font-semibold text-slate-600",
				children: "Inside Dhaka → ৳ 80"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 302,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ _jsxDEV("p", {
				className: "text-sm font-semibold text-slate-600",
				children: "Outside Dhaka → ৳ 120"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 306,
				columnNumber: 17
			}, this)
		] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 297,
			columnNumber: 13
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 291,
		columnNumber: 9
	}, this);
}
export function CheckoutDeliveryMethod({ isDhaka }) {
	const hasSelection = typeof isDhaka === "boolean";
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] p-6 shadow-sm sm:p-8",
		children: [/* @__PURE__ */ _jsxDEV("h2", {
			className: "mb-5 text-2xl font-black text-[var(--sf-checkout-text)]",
			children: "Delivery Method"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 319,
			columnNumber: 13
		}, this), /* @__PURE__ */ _jsxDEV("div", {
			className: "grid gap-3 sm:grid-cols-2",
			children: [/* @__PURE__ */ _jsxDEV("div", {
				className: `rounded-2xl border p-4 ${hasSelection && isDhaka ? "border-[var(--sf-checkout-accent)] bg-[var(--sf-accent-bg)]" : "border-slate-200 bg-slate-50"}`,
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ _jsxDEV("span", {
						className: "text-sm font-black text-[var(--sf-checkout-text)]",
						children: "Inside Dhaka"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 325,
						columnNumber: 25
					}, this), /* @__PURE__ */ _jsxDEV("span", {
						className: "text-sm font-black text-[var(--sf-checkout-accent)]",
						children: "৳ 80"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 326,
						columnNumber: 25
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 324,
					columnNumber: 21
				}, this), /* @__PURE__ */ _jsxDEV("p", {
					className: "mt-2 text-xs font-semibold text-slate-500",
					children: "Same-city delivery estimate."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 328,
					columnNumber: 21
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 323,
				columnNumber: 17
			}, this), /* @__PURE__ */ _jsxDEV("div", {
				className: `rounded-2xl border p-4 ${hasSelection && !isDhaka ? "border-[var(--sf-checkout-accent)] bg-[var(--sf-accent-bg)]" : "border-slate-200 bg-slate-50"}`,
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ _jsxDEV("span", {
						className: "text-sm font-black text-[var(--sf-checkout-text)]",
						children: "Outside Dhaka"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 332,
						columnNumber: 25
					}, this), /* @__PURE__ */ _jsxDEV("span", {
						className: "text-sm font-black text-[var(--sf-checkout-accent)]",
						children: "৳ 120"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 333,
						columnNumber: 25
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 331,
					columnNumber: 21
				}, this), /* @__PURE__ */ _jsxDEV("p", {
					className: "mt-2 text-xs font-semibold text-slate-500",
					children: "Nationwide delivery estimate."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 335,
					columnNumber: 21
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 330,
				columnNumber: 17
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 322,
			columnNumber: 13
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 318,
		columnNumber: 9
	}, this);
}
export function CheckoutPaymentMethod({ presentationVariant } = {}) {
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] p-6 shadow-sm sm:p-8",
		children: [/* @__PURE__ */ _jsxDEV("h2", {
			className: "mb-5 text-2xl font-black text-[var(--sf-checkout-text)]",
			children: "Payment Method"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 345,
			columnNumber: 13
		}, this), /* @__PURE__ */ _jsxDEV("div", {
			className: "rounded-2xl border border-[var(--sf-checkout-accent)] bg-[var(--sf-accent-bg)] p-4",
			children: /* @__PURE__ */ _jsxDEV("div", {
				className: "flex items-start gap-3",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--sf-checkout-card-background)] text-[var(--sf-checkout-accent)] shadow-sm",
					children: /* @__PURE__ */ _jsxDEV(CreditCard, { size: 19 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 351,
						columnNumber: 25
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 350,
					columnNumber: 21
				}, this), /* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("p", {
					className: "text-sm font-black text-[var(--sf-checkout-text)]",
					children: "Cash on Delivery"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 354,
					columnNumber: 25
				}, this), /* @__PURE__ */ _jsxDEV("p", {
					className: "mt-1 text-xs font-semibold leading-5 text-slate-500",
					children: presentationVariant === "atelier-editorial" ? "Pay when your order arrives." : "Pay securely when your order arrives. Online payment providers can be enabled later from the platform."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 355,
					columnNumber: 25
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 353,
					columnNumber: 21
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 349,
				columnNumber: 17
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 348,
			columnNumber: 13
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 344,
		columnNumber: 9
	}, this);
}
export function CheckoutPhoneOtpBox({ maskedPhone, onSendOtp, onVerifyOtp, otp, sending, setOtp, verified, verifying }) {
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] p-6 shadow-sm sm:p-8",
		children: [
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex items-start gap-3",
				children: [/* @__PURE__ */ _jsxDEV("span", {
					className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[var(--sf-checkout-success)]",
					children: /* @__PURE__ */ _jsxDEV(ShieldCheck, { size: 20 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 379,
						columnNumber: 21
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 378,
					columnNumber: 17
				}, this), /* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("h2", {
					className: "text-2xl font-black text-[var(--sf-checkout-text)]",
					children: "Verify delivery phone"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 382,
					columnNumber: 21
				}, this), /* @__PURE__ */ _jsxDEV("p", {
					className: "mt-1 text-sm font-semibold leading-6 text-slate-500",
					children: "We send a 6-digit code before placing the order. Stock is reserved only after verification."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 383,
					columnNumber: 21
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 381,
					columnNumber: 17
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 377,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "mt-5 flex flex-col gap-3 sm:flex-row",
				children: [/* @__PURE__ */ _jsxDEV("button", {
					type: "button",
					onClick: onSendOtp,
					disabled: sending || verified,
					className: "sf-btn sf-btn-secondary min-h-0 justify-center px-5 py-3 text-sm disabled:opacity-50",
					children: [sending ? /* @__PURE__ */ _jsxDEV(Loader2, {
						size: 17,
						className: "animate-spin"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 396,
						columnNumber: 32
					}, this) : /* @__PURE__ */ _jsxDEV(Phone, { size: 17 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 396,
						columnNumber: 81
					}, this), verified ? "Phone verified" : "Send OTP"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 390,
					columnNumber: 17
				}, this), /* @__PURE__ */ _jsxDEV("div", {
					className: "flex min-w-0 flex-1 gap-2",
					children: [/* @__PURE__ */ _jsxDEV("input", {
						value: otp,
						onChange: (event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6)),
						placeholder: "000000",
						inputMode: "numeric",
						maxLength: 6,
						disabled: verified,
						className: "sf-field min-w-0 flex-1",
						"aria-label": "Phone verification code"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 400,
						columnNumber: 21
					}, this), /* @__PURE__ */ _jsxDEV("button", {
						type: "button",
						onClick: onVerifyOtp,
						disabled: verifying || verified || otp.length !== 6,
						className: "sf-btn sf-btn-primary min-h-0 px-5 py-3 text-sm disabled:opacity-50",
						children: verifying ? /* @__PURE__ */ _jsxDEV(Loader2, {
							size: 17,
							className: "animate-spin"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 416,
							columnNumber: 38
						}, this) : "Verify"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 410,
						columnNumber: 21
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 399,
					columnNumber: 17
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 389,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ _jsxDEV("p", {
				className: `mt-3 rounded-2xl px-4 py-3 text-xs font-bold ${verified ? "bg-emerald-50 text-[var(--sf-checkout-success)]" : "bg-slate-50 text-slate-500"}`,
				children: verified ? `Verified ${maskedPhone || "delivery phone"}.` : maskedPhone ? `Code sent to ${maskedPhone}.` : "Enter your phone above, then send a verification code."
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 421,
				columnNumber: 13
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 376,
		columnNumber: 9
	}, this);
}
export function CheckoutDetailsColumn({ formData, isDhaka, onInputChange, presentationVariant }) {
	return /* @__PURE__ */ _jsxDEV("div", {
		"data-atelier-part": presentationVariant === "atelier-editorial" ? "checkout-fields" : undefined,
		className: "space-y-7",
		children: [
			/* @__PURE__ */ _jsxDEV(CheckoutCustomerInfo, {
				formData,
				onInputChange
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 437,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ _jsxDEV(CheckoutDeliveryChargeNotice, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 441,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ _jsxDEV(CheckoutDeliveryMethod, { isDhaka }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 442,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ _jsxDEV(CheckoutPaymentMethod, { presentationVariant }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 443,
				columnNumber: 13
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 436,
		columnNumber: 9
	}, this);
}
function CheckoutCouponBox({ onApplyPromotion, promotionCode, promotionMessage, setPromotionCode }) {
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "mb-6",
		children: [
			/* @__PURE__ */ _jsxDEV("label", {
				htmlFor: "checkout-coupon-code",
				className: "mb-2 block text-sm font-bold text-slate-700",
				children: "Coupon Code"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 456,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ _jsxDEV("input", {
					id: "checkout-coupon-code",
					type: "text",
					value: promotionCode,
					onChange: (event) => setPromotionCode(event.target.value.toUpperCase()),
					placeholder: "SAVE10",
					"aria-describedby": promotionMessage ? "checkout-coupon-feedback" : undefined,
					className: "sf-field min-w-0 flex-1 uppercase"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 460,
					columnNumber: 17
				}, this), /* @__PURE__ */ _jsxDEV("button", {
					type: "button",
					onClick: onApplyPromotion,
					className: "sf-btn sf-btn-primary min-h-0 px-4 py-3",
					children: "Apply"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 469,
					columnNumber: 17
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 459,
				columnNumber: 13
			}, this),
			promotionMessage && /* @__PURE__ */ _jsxDEV("p", {
				id: "checkout-coupon-feedback",
				className: `mt-2 rounded-xl px-3 py-2 text-xs font-bold ${promotionMessage.type === "error" ? "bg-red-50 text-[var(--sf-checkout-error)]" : promotionMessage.type === "success" ? "bg-emerald-50 text-[var(--sf-checkout-success)]" : "bg-slate-50 text-slate-600"}`,
				children: promotionMessage.text
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 478,
				columnNumber: 17
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 455,
		columnNumber: 9
	}, this);
}
function CheckoutPolicyConsent({ policyAccepted, setPolicyAccepted }) {
	return /* @__PURE__ */ _jsxDEV("label", {
		className: `mt-6 flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold transition ${policyAccepted ? "border-[var(--sf-checkout-accent)] bg-[var(--sf-accent-bg)] text-slate-700" : "border-slate-200 bg-slate-50 text-slate-600"}`,
		children: [/* @__PURE__ */ _jsxDEV("input", {
			id: "checkout-policy-consent",
			type: "checkbox",
			checked: policyAccepted,
			onChange: (event) => setPolicyAccepted(event.target.checked),
			className: "mt-1 h-4 w-4 rounded border-slate-300 text-[var(--sf-checkout-accent)] focus:ring-[var(--sf-checkout-accent)]"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 499,
			columnNumber: 13
		}, this), /* @__PURE__ */ _jsxDEV("span", { children: ["I agree to this store's policies before placing my order.", /* @__PURE__ */ _jsxDEV("span", {
			className: "mt-1 block text-xs font-medium text-slate-500",
			children: "Review the policy sections below. This confirms you understand delivery, refund, and privacy terms."
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 508,
			columnNumber: 17
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 506,
			columnNumber: 13
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 494,
		columnNumber: 9
	}, this);
}
function CheckoutPolicies({ policies, visiblePolicies }) {
	if (visiblePolicies.length === 0) {
		return null;
	}
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "mt-6 border-t border-slate-200 pt-5",
		children: [/* @__PURE__ */ _jsxDEV("div", {
			className: "mb-3 flex items-center gap-2 text-sm font-black text-[var(--sf-checkout-text)]",
			children: [/* @__PURE__ */ _jsxDEV(FileText, {
				size: 16,
				className: "text-[var(--sf-checkout-accent)]"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 524,
				columnNumber: 17
			}, this), "Store Policies"]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 523,
			columnNumber: 13
		}, this), /* @__PURE__ */ _jsxDEV("div", {
			className: "space-y-2",
			children: visiblePolicies.map(([key, label]) => /* @__PURE__ */ _jsxDEV("details", {
				className: "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3",
				children: [/* @__PURE__ */ _jsxDEV("summary", {
					className: "cursor-pointer text-sm font-bold text-slate-800",
					children: label
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 530,
					columnNumber: 25
				}, this), /* @__PURE__ */ _jsxDEV("p", {
					className: "mt-3 whitespace-pre-line text-sm leading-6 text-slate-600",
					children: policies[key]
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 533,
					columnNumber: 25
				}, this)]
			}, key, true, {
				fileName: _jsxFileName,
				lineNumber: 529,
				columnNumber: 21
			}, this))
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 527,
			columnNumber: 13
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 522,
		columnNumber: 9
	}, this);
}
function CheckoutOrderItem({ presentationVariant, item, product, removeFromCart, updateQuantity }) {
	const imageUrl = item.imageUrl || product?.thumbnail || product?.images?.[0] || "";
	return /* @__PURE__ */ _jsxDEV("div", {
		"data-atelier-part": presentationVariant === "atelier-editorial" ? "checkout-item" : undefined,
		className: "rounded-3xl border border-slate-200 p-5",
		children: /* @__PURE__ */ _jsxDEV("div", {
			className: "flex gap-4",
			children: [/* @__PURE__ */ _jsxDEV(SafeProductImage, {
				src: imageUrl,
				alt: item.title,
				width: 96,
				height: 96,
				className: "h-20 w-20 rounded-2xl border border-slate-200 object-cover sm:h-24 sm:w-24",
				fallbackClassName: "flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-300 sm:h-24 sm:w-24",
				iconClassName: "h-7 w-7"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 559,
				columnNumber: 17
			}, this), /* @__PURE__ */ _jsxDEV("div", {
				className: "flex-1",
				children: [
					/* @__PURE__ */ _jsxDEV("h3", {
						className: "line-clamp-2 font-black text-[var(--sf-checkout-text)]",
						children: item.title
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 570,
						columnNumber: 21
					}, this),
					product?.shortDescription && /* @__PURE__ */ _jsxDEV("p", {
						className: "mt-1 line-clamp-2 text-sm text-slate-500",
						children: product.shortDescription
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 575,
						columnNumber: 25
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "flex items-center justify-between mt-5",
						children: [/* @__PURE__ */ _jsxDEV("div", {
							className: "flex items-center gap-2",
							children: [
								/* @__PURE__ */ _jsxDEV("button", {
									type: "button",
									"aria-label": presentationVariant === "atelier-editorial" ? "Decrease quantity for " + item.title : undefined,
									onClick: () => updateQuantity(item.cartItemId || item._id, item.quantity - 1),
									className: "flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100",
									children: /* @__PURE__ */ _jsxDEV(Minus, { size: 16 }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 593,
										columnNumber: 33
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 582,
									columnNumber: 29
								}, this),
								/* @__PURE__ */ _jsxDEV("div", {
									className: "w-10 text-center font-black text-[var(--sf-checkout-text)]",
									children: item.quantity
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 596,
									columnNumber: 29
								}, this),
								/* @__PURE__ */ _jsxDEV("button", {
									type: "button",
									"aria-label": presentationVariant === "atelier-editorial" ? "Increase quantity for " + item.title : undefined,
									onClick: () => updateQuantity(item.cartItemId || item._id, item.quantity + 1),
									className: "flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100",
									children: /* @__PURE__ */ _jsxDEV(Plus, { size: 16 }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 611,
										columnNumber: 33
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 600,
									columnNumber: 29
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 581,
							columnNumber: 25
						}, this), /* @__PURE__ */ _jsxDEV("div", {
							className: "text-right",
							children: [/* @__PURE__ */ _jsxDEV("p", {
								className: "text-lg font-black text-[var(--sf-checkout-text)]",
								children: ["৳", (item.finalPrice || item.sellingPrice) * item.quantity]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 616,
								columnNumber: 29
							}, this), /* @__PURE__ */ _jsxDEV("p", {
								className: "text-xs text-slate-400",
								children: [
									"৳",
									item.finalPrice || item.sellingPrice,
									"each"
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 623,
								columnNumber: 29
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 615,
							columnNumber: 25
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 580,
						columnNumber: 21
					}, this),
					/* @__PURE__ */ _jsxDEV("button", {
						type: "button",
						onClick: () => removeFromCart(item.cartItemId || item._id),
						className: "mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--sf-checkout-error)] hover:text-[var(--sf-checkout-error)]",
						children: [/* @__PURE__ */ _jsxDEV(Trash2, { size: 14 }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 641,
							columnNumber: 25
						}, this), "Remove"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 632,
						columnNumber: 21
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 569,
				columnNumber: 17
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 558,
			columnNumber: 13
		}, this)
	}, item.cartItemId || item._id, false, {
		fileName: _jsxFileName,
		lineNumber: 553,
		columnNumber: 9
	}, this);
}
export function CheckoutOrderSummary({ presentationVariant, cartItems, checkoutBranding, finalShippingCost, loading, onApplyPromotion, policies, policyAccepted, productsDetails, promotionCode, promotionDiscount, promotionMessage, removeFromCart, setPolicyAccepted, setPromotionCode, phoneVerified, subtotal, totalAmount, updateQuantity, visiblePolicies }) {
	return /* @__PURE__ */ _jsxDEV("div", { children: /* @__PURE__ */ _jsxDEV("div", {
		"data-atelier-part": presentationVariant === "atelier-editorial" ? "checkout-summary" : undefined,
		className: "sticky top-28 overflow-hidden rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] shadow-xl shadow-slate-200/70",
		children: [
			/* @__PURE__ */ _jsxDEV("div", {
				className: "border-b border-slate-200 bg-[var(--sf-checkout-card-background)] p-6 sm:p-7",
				children: /* @__PURE__ */ _jsxDEV("div", {
					className: "flex items-start justify-between gap-4",
					children: [/* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("p", {
						className: "sf-kicker",
						children: "Review"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 678,
						columnNumber: 29
					}, this), /* @__PURE__ */ _jsxDEV("h2", {
						className: "mt-1 text-2xl font-black text-[var(--sf-checkout-text)]",
						children: "Order Summary"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 679,
						columnNumber: 29
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 677,
						columnNumber: 25
					}, this), /* @__PURE__ */ _jsxDEV("span", {
						className: "rounded-full bg-[var(--sf-checkout-card-background)] px-3 py-1.5 text-xs font-black text-[var(--sf-checkout-accent)] shadow-sm",
						children: [
							cartItems.length,
							" item",
							cartItems.length === 1 ? "" : "s"
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 683,
						columnNumber: 25
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 676,
					columnNumber: 21
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 675,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "max-h-[460px] space-y-5 overflow-y-auto p-6 sm:p-7",
				children: cartItems.map((item) => /* @__PURE__ */ _jsxDEV(CheckoutOrderItem, {
					presentationVariant,
					item,
					product: productsDetails[item._id],
					removeFromCart,
					updateQuantity
				}, item.cartItemId || item._id, false, {
					fileName: _jsxFileName,
					lineNumber: 691,
					columnNumber: 25
				}, this))
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 689,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: "border-t border-slate-200 p-6 sm:p-7",
				children: [
					/* @__PURE__ */ _jsxDEV(CheckoutCouponBox, {
						onApplyPromotion,
						promotionCode,
						promotionMessage,
						setPromotionCode
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 703,
						columnNumber: 21
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "space-y-4 text-sm",
						children: [
							/* @__PURE__ */ _jsxDEV("div", {
								className: "flex justify-between",
								children: [/* @__PURE__ */ _jsxDEV("span", {
									className: "text-slate-500",
									children: "Subtotal"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 712,
									columnNumber: 29
								}, this), /* @__PURE__ */ _jsxDEV("span", {
									className: "font-bold text-[var(--sf-checkout-text)]",
									children: ["৳ ", subtotal]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 716,
									columnNumber: 29
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 711,
								columnNumber: 25
							}, this),
							/* @__PURE__ */ _jsxDEV("div", {
								className: "flex justify-between",
								children: [/* @__PURE__ */ _jsxDEV("span", {
									className: "text-slate-500",
									children: "Delivery Charge"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 722,
									columnNumber: 29
								}, this), /* @__PURE__ */ _jsxDEV("span", {
									className: "font-bold text-[var(--sf-checkout-text)]",
									children: ["৳ ", finalShippingCost]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 726,
									columnNumber: 29
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 721,
								columnNumber: 25
							}, this),
							promotionDiscount > 0 && /* @__PURE__ */ _jsxDEV("div", {
								className: "flex justify-between text-[var(--sf-checkout-success)]",
								children: [/* @__PURE__ */ _jsxDEV("span", { children: "Coupon Discount" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 733,
									columnNumber: 33
								}, this), /* @__PURE__ */ _jsxDEV("span", {
									className: "font-bold",
									children: ["- ৳ ", promotionDiscount]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 737,
									columnNumber: 33
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 732,
								columnNumber: 29
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 710,
						columnNumber: 21
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "mt-5 flex items-center justify-between border-t border-dashed border-slate-200 pt-5",
						children: [/* @__PURE__ */ _jsxDEV("span", {
							className: "text-xl font-black text-[var(--sf-checkout-text)]",
							children: "Total"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 745,
							columnNumber: 25
						}, this), /* @__PURE__ */ _jsxDEV("span", {
							className: "text-3xl font-black text-[var(--sf-checkout-text)]",
							children: ["৳ ", totalAmount]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 749,
							columnNumber: 25
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 744,
						columnNumber: 21
					}, this),
					/* @__PURE__ */ _jsxDEV(CheckoutPolicyConsent, {
						policyAccepted,
						setPolicyAccepted
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 754,
						columnNumber: 21
					}, this),
					/* @__PURE__ */ _jsxDEV("button", {
						type: "submit",
						disabled: loading || !policyAccepted,
						className: "sf-btn sf-checkout-submit mt-7 w-full py-5 text-lg disabled:opacity-50",
						style: { borderRadius: "var(--sf-checkout-radius)" },
						children: loading ? /* @__PURE__ */ _jsxDEV(_Fragment, { children: [/* @__PURE__ */ _jsxDEV(Loader2, {
							size: 20,
							className: "animate-spin"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 767,
							columnNumber: 33
						}, this), "Processing order"] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 766,
							columnNumber: 29
						}, this) : /* @__PURE__ */ _jsxDEV(_Fragment, { children: [/* @__PURE__ */ _jsxDEV(Lock, { size: 18 }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 772,
							columnNumber: 33
						}, this), phoneVerified ? "Place Order" : "Place Order"] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 771,
							columnNumber: 29
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 759,
						columnNumber: 21
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "mt-5 grid gap-3 text-sm font-semibold text-slate-600",
						children: [/* @__PURE__ */ _jsxDEV("p", {
							className: "flex items-center justify-center gap-2",
							children: [/* @__PURE__ */ _jsxDEV(ShieldCheck, {
								size: 16,
								className: "text-[var(--sf-checkout-success)]"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 780,
								columnNumber: 29
							}, this), checkoutBranding.trustMessage || "Secure Checkout"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 779,
							columnNumber: 25
						}, this), /* @__PURE__ */ _jsxDEV("p", {
							className: "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-[var(--sf-checkout-success)]",
							children: "Cash on delivery order. You pay when the product arrives."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 786,
							columnNumber: 25
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 778,
						columnNumber: 21
					}, this),
					/* @__PURE__ */ _jsxDEV(CheckoutPolicies, {
						policies,
						visiblePolicies
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 791,
						columnNumber: 21
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 702,
				columnNumber: 17
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 674,
		columnNumber: 13
	}, this) }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 673,
		columnNumber: 9
	}, this);
}
export function CheckoutMobileStickyBar({ loading, phoneVerified, policyAccepted, totalAmount }) {
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "sf-mobile-action-bar fixed inset-x-0 z-40 border-t border-slate-200 bg-[var(--sf-checkout-card-background)] p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden",
		children: /* @__PURE__ */ _jsxDEV("div", {
			className: "mx-auto flex max-w-xl items-center gap-3",
			children: [/* @__PURE__ */ _jsxDEV("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ _jsxDEV("p", {
					className: "text-xs font-bold uppercase tracking-[0.14em] text-slate-500",
					children: "Pay on delivery"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 806,
					columnNumber: 21
				}, this), /* @__PURE__ */ _jsxDEV("p", {
					className: "text-xl font-black text-[var(--sf-checkout-text)]",
					children: ["৳ ", totalAmount]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 807,
					columnNumber: 21
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 805,
				columnNumber: 17
			}, this), /* @__PURE__ */ _jsxDEV("button", {
				type: "submit",
				disabled: loading || !policyAccepted,
				className: "sf-btn min-h-0 px-5 py-3 text-sm disabled:opacity-50",
				style: {
					borderRadius: "var(--sf-checkout-radius)",
					backgroundColor: "var(--sf-checkout-button-background)",
					color: "var(--sf-checkout-button-text)"
				},
				children: [loading ? /* @__PURE__ */ _jsxDEV(Loader2, {
					size: 17,
					className: "animate-spin"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 815,
					columnNumber: 32
				}, this) : /* @__PURE__ */ _jsxDEV(Lock, { size: 16 }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 815,
					columnNumber: 81
				}, this), phoneVerified ? "Place order" : "Place order"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 809,
				columnNumber: 17
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 804,
			columnNumber: 13
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 803,
		columnNumber: 9
	}, this);
}
// Keep the original modal callable without React hooks; only Atelier needs focus management.
function AtelierCheckoutDialog({ open, onClose, busy, render }) {
	const dialogRef = useAtelierDialog({
		enabled: true,
		open,
		onClose,
		busy
	});
	return render(dialogRef);
}
export function CheckoutOtpModal({ presentationVariant, error, maskedPhone, onCancel, onSendCode, onVerifyCode, open, otp, sending, setOtp, state, verifying }) {
	const atelier = presentationVariant === "atelier-editorial";
	const isBusy = sending || verifying || state === "placing_order";
	if (!open) return null;
	const isOtpInput = state === "otp_input" || state === "verifying" || state === "error";
	const handleSubmit = (event) => {
		event.preventDefault();
		event.stopPropagation();
		if (isBusy) return;
		if (isOtpInput) {
			if (otp.length === 6) onVerifyCode();
			return;
		}
		onSendCode();
	};
	const renderModal = (dialogRef) => /* @__PURE__ */ _jsxDEV("div", {
		ref: dialogRef,
		"aria-busy": atelier && isBusy ? true : undefined,
		"data-atelier-dialog": atelier ? "checkout-otp" : undefined,
		className: "fixed inset-0 z-[120] flex items-end bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4",
		role: "dialog",
		"aria-modal": "true",
		"aria-labelledby": "checkout-otp-title",
		children: /* @__PURE__ */ _jsxDEV("form", {
			onSubmit: handleSubmit,
			className: "w-full overflow-hidden rounded-t-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] shadow-2xl shadow-slate-950/20 sm:max-w-md sm:rounded-[2rem]",
			children: [/* @__PURE__ */ _jsxDEV("div", {
				className: "flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6",
				children: [/* @__PURE__ */ _jsxDEV("div", {
					className: "flex items-start gap-3",
					children: [/* @__PURE__ */ _jsxDEV("span", {
						className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[var(--sf-checkout-success)]",
						children: /* @__PURE__ */ _jsxDEV(ShieldCheck, { size: 20 }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 864,
							columnNumber: 29
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 863,
						columnNumber: 25
					}, this), /* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("h2", {
						id: "checkout-otp-title",
						className: "text-xl font-black text-[var(--sf-checkout-text)]",
						children: "Verify your phone number"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 867,
						columnNumber: 29
					}, this), /* @__PURE__ */ _jsxDEV("p", {
						className: "mt-1 text-sm font-semibold leading-6 text-slate-500",
						children: "We need to verify your delivery phone before placing this order."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 870,
						columnNumber: 29
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 866,
						columnNumber: 25
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 862,
					columnNumber: 21
				}, this), /* @__PURE__ */ _jsxDEV("button", {
					type: "button",
					onClick: onCancel,
					disabled: isBusy,
					className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-[var(--sf-checkout-text)] disabled:opacity-50",
					"aria-label": "Close phone verification",
					children: /* @__PURE__ */ _jsxDEV(X, { size: 18 }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 882,
						columnNumber: 25
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 875,
					columnNumber: 21
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 861,
				columnNumber: 17
			}, this), /* @__PURE__ */ _jsxDEV("div", {
				className: "space-y-5 p-5 sm:p-6",
				children: [
					/* @__PURE__ */ _jsxDEV("div", {
						className: "rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600",
						children: isOtpInput ? /* @__PURE__ */ _jsxDEV(_Fragment, { children: [
							"Enter the 6-digit code sent to ",
							/* @__PURE__ */ _jsxDEV("span", {
								className: "font-black text-[var(--sf-checkout-text)]",
								children: maskedPhone || "your phone"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 889,
								columnNumber: 62
							}, this),
							"."
						] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 889,
							columnNumber: 29
						}, this) : state === "placing_order" ? /* @__PURE__ */ _jsxDEV(_Fragment, { children: "Phone verified. Placing your order securely now." }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 891,
							columnNumber: 29
						}, this) : /* @__PURE__ */ _jsxDEV(_Fragment, { children: [
							"Send a verification code to ",
							/* @__PURE__ */ _jsxDEV("span", {
								className: "font-black text-[var(--sf-checkout-text)]",
								children: maskedPhone || "your phone number"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 893,
								columnNumber: 59
							}, this),
							" to place your order."
						] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 893,
							columnNumber: 29
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 887,
						columnNumber: 21
					}, this),
					isOtpInput && /* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("label", {
						htmlFor: "checkout-modal-otp",
						className: "mb-2 block text-sm font-bold text-slate-700",
						children: "Verification code"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 899,
						columnNumber: 29
					}, this), /* @__PURE__ */ _jsxDEV("input", {
						id: "checkout-modal-otp",
						autoFocus: atelier || undefined,
						"aria-invalid": atelier && error ? true : undefined,
						"aria-describedby": atelier && error ? "checkout-otp-error" : undefined,
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
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 902,
						columnNumber: 29
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 898,
						columnNumber: 25
					}, this),
					error && /* @__PURE__ */ _jsxDEV("p", {
						id: atelier ? "checkout-otp-error" : undefined,
						role: atelier ? "alert" : undefined,
						className: "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-[var(--sf-checkout-error)]",
						children: error
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 922,
						columnNumber: 25
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						className: "grid gap-3 sm:grid-cols-2",
						children: [/* @__PURE__ */ _jsxDEV("button", {
							type: "button",
							onClick: onCancel,
							disabled: isBusy,
							className: "sf-btn sf-btn-secondary justify-center py-3 disabled:opacity-50",
							children: "Cancel"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 928,
							columnNumber: 25
						}, this), !isOtpInput ? /* @__PURE__ */ _jsxDEV("button", {
							type: "submit",
							disabled: isBusy,
							className: "sf-btn sf-btn-primary justify-center py-3 disabled:opacity-50",
							children: [sending ? /* @__PURE__ */ _jsxDEV(Loader2, {
								size: 17,
								className: "animate-spin"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 943,
								columnNumber: 44
							}, this) : /* @__PURE__ */ _jsxDEV(Phone, { size: 17 }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 943,
								columnNumber: 93
							}, this), "Send Code"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 938,
							columnNumber: 29
						}, this) : /* @__PURE__ */ _jsxDEV("button", {
							type: "submit",
							disabled: isBusy || otp.length !== 6,
							className: "sf-btn sf-btn-primary justify-center py-3 disabled:opacity-50",
							children: [verifying || state === "placing_order" ? /* @__PURE__ */ _jsxDEV(Loader2, {
								size: 17,
								className: "animate-spin"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 952,
								columnNumber: 75
							}, this) : /* @__PURE__ */ _jsxDEV(ShieldCheck, { size: 17 }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 952,
								columnNumber: 124
							}, this), state === "placing_order" ? "Placing order" : "Verify & place order"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 947,
							columnNumber: 29
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 927,
						columnNumber: 21
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 886,
				columnNumber: 17
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 860,
			columnNumber: 13
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 859,
		columnNumber: 9
	}, this);
	return atelier ? /* @__PURE__ */ _jsxDEV(AtelierCheckoutDialog, {
		open,
		onClose: onCancel,
		busy: isBusy,
		render: renderModal
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 962,
		columnNumber: 11
	}, this) : renderModal();
}

//# sourceMappingURL=data:application/json;base64,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LHdCQUFDLHVCQUFEO0VBQTZCO0VBQU0sU0FBUztFQUFVLE1BQU07RUFBUSxRQUFRO0NBQWE7Ozs7WUFDekYsWUFBWTtBQUN0QiIsIm5hbWVzIjpbXSwic291cmNlcyI6WyJDaGVja291dFNlY3Rpb25zLmpzeCJdLCJ2ZXJzaW9uIjozLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBjbGllbnRcIjtcclxuXHJcbmltcG9ydCB7IHVzZUF0ZWxpZXJEaWFsb2cgfSBmcm9tICcuLi9hdGVsaWVyL3VzZUF0ZWxpZXJEaWFsb2cuanMnO1xyXG5pbXBvcnQgeyBJbWFnZSwgTGluayB9IGZyb20gXCIuL1J1bnRpbWUuanN4XCI7XHJcbmltcG9ydCBTYWZlUHJvZHVjdEltYWdlIGZyb20gXCIuL1NhZmVQcm9kdWN0SW1hZ2UuanN4XCI7XHJcblxyXG5pbXBvcnQge1xyXG4gICAgQXJyb3dMZWZ0LFxyXG4gICAgQ2hlY2tDaXJjbGUsXHJcbiAgICBDcmVkaXRDYXJkLFxyXG4gICAgRmlsZVRleHQsXHJcbiAgICBMb2FkZXIyLFxyXG4gICAgTG9jayxcclxuICAgIE1haWwsXHJcbiAgICBNYXBQaW4sXHJcbiAgICBNaW51cyxcclxuICAgIFBhY2thZ2UsXHJcbiAgICBQaG9uZSxcclxuICAgIFBsdXMsXHJcbiAgICBTaGllbGRDaGVjayxcclxuICAgIFRyYXNoMixcclxuICAgIFRydWNrLFxyXG4gICAgVXNlcixcclxuICAgIFgsXHJcbn0gZnJvbSBcImx1Y2lkZS1yZWFjdFwiO1xyXG5cclxuaW1wb3J0IHsgc2hvdWxkVXNlVW5vcHRpbWl6ZWRJbWFnZSB9IGZyb20gXCIuLi9pbWFnZURvbWFpbnMuanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBDaGVja291dFN1Y2Nlc3NTdGF0ZSh7IG9yZGVySWQgfSkge1xyXG4gICAgcmV0dXJuIChcclxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNmLWNoZWNrb3V0LXBhZ2Ugc2YtcGFnZSBmbGV4IG1pbi1oLXNjcmVlbiBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcHgtNFwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctZnVsbCBtYXgtdy1sZyByb3VuZGVkLVsycmVtXSBib3JkZXIgYm9yZGVyLXNsYXRlLTIwMCBiZy1bdmFyKC0tc2YtY2hlY2tvdXQtY2FyZC1iYWNrZ3JvdW5kKV0gcC04IHRleHQtY2VudGVyIHNoYWRvdy0yeGwgc2hhZG93LXNsYXRlLTIwMC83MCBzbTpwLTEwXCI+XHJcbiAgICAgICAgICAgICAgICA8Q2hlY2tDaXJjbGVcclxuICAgICAgICAgICAgICAgICAgICBzaXplPXs5MH1cclxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJteC1hdXRvIG1iLTYgdGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtc3VjY2VzcyldXCJcclxuICAgICAgICAgICAgICAgIC8+XHJcblxyXG4gICAgICAgICAgICAgICAgPGgxIGNsYXNzTmFtZT1cIm1iLTMgdGV4dC00eGwgZm9udC1ibGFjayB0ZXh0LVt2YXIoLS1zZi1jaGVja291dC10ZXh0KV1cIj5cclxuICAgICAgICAgICAgICAgICAgICBPcmRlciBDb25maXJtZWRcclxuICAgICAgICAgICAgICAgIDwvaDE+XHJcblxyXG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibGVhZGluZy1yZWxheGVkIHRleHQtc2xhdGUtNjAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgVGhhbmsgeW91IGZvciB5b3VyIHB1cmNoYXNlLlxyXG4gICAgICAgICAgICAgICAgPC9wPlxyXG5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNyByb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLXNsYXRlLTIwMCBiZy1zbGF0ZS01MCBwLTVcIj5cclxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtYi0yIHRleHQtc20gZm9udC1ibGFjayB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMTZlbV0gdGV4dC1zbGF0ZS01MDBcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgT1JERVIgSUQgRk9SIFRSQUNLSU5HXHJcbiAgICAgICAgICAgICAgICAgICAgPC9wPlxyXG5cclxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LTJ4bCBmb250LWJsYWNrIHRyYWNraW5nLXdpZGVyIHRleHQtW3ZhcigtLXNmLWNoZWNrb3V0LWFjY2VudCldXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICNcclxuICAgICAgICAgICAgICAgICAgICAgICAge29yZGVySWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8uc2xpY2UoLTYpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA/LnRvVXBwZXJDYXNlKCl9XHJcbiAgICAgICAgICAgICAgICAgICAgPC9wPlxyXG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgYnJlYWstYWxsIHRleHQteHMgdGV4dC1zbGF0ZS01MDBcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgRnVsbCBJRDoge29yZGVySWR9XHJcbiAgICAgICAgICAgICAgICAgICAgPC9wPlxyXG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTMgdGV4dC14cyB0ZXh0LXNsYXRlLTUwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBVc2UgdGhlIHNob3J0IElEIGFuZCB5b3VyIGRlbGl2ZXJ5IHBob25lIG51bWJlciBvbiB0aGUgVHJhY2sgT3JkZXIgcGFnZS5cclxuICAgICAgICAgICAgICAgICAgICA8L3A+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgICAgICA8TGlua1xyXG4gICAgICAgICAgICAgICAgICAgIGhyZWY9XCIvXCJcclxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJzZi1idG4gc2YtYnRuLXByaW1hcnkgbXQtOCBweC04XCJcclxuICAgICAgICAgICAgICAgID5cclxuICAgICAgICAgICAgICAgICAgICBDb250aW51ZSBTaG9wcGluZ1xyXG4gICAgICAgICAgICAgICAgPC9MaW5rPlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBDaGVja291dEVtcHR5Q2FydFN0YXRlKCkge1xyXG4gICAgcmV0dXJuIChcclxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNmLWNoZWNrb3V0LXBhZ2Ugc2YtcGFnZSBmbGV4IG1pbi1oLVs3MHZoXSBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcHgtNCB0ZXh0LWNlbnRlclwiPlxyXG4gICAgICAgICAgICA8UGFja2FnZVxyXG4gICAgICAgICAgICAgICAgc2l6ZT17ODB9XHJcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJtYi02IHRleHQtc2xhdGUtMzAwXCJcclxuICAgICAgICAgICAgLz5cclxuXHJcbiAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJtYi0zIHRleHQtM3hsIGZvbnQtYmxhY2sgdGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtdGV4dCldXCI+XHJcbiAgICAgICAgICAgICAgICBZb3VyIGNhcnQgaXMgZW1wdHlcclxuICAgICAgICAgICAgPC9oMj5cclxuXHJcbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm1iLTggdGV4dC1zbGF0ZS01MDBcIj5cclxuICAgICAgICAgICAgICAgIEFkZCBzb21lIHByb2R1Y3RzIGZpcnN0XHJcbiAgICAgICAgICAgIDwvcD5cclxuXHJcbiAgICAgICAgICAgIDxMaW5rXHJcbiAgICAgICAgICAgICAgICBocmVmPVwiL1wiXHJcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJzZi1idG4gc2YtYnRuLXByaW1hcnkgcHgtN1wiXHJcbiAgICAgICAgICAgID5cclxuICAgICAgICAgICAgICAgIENvbnRpbnVlIFNob3BwaW5nXHJcbiAgICAgICAgICAgIDwvTGluaz5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBDaGVja291dEJyYW5kaW5nQmFubmVyKHsgY2hlY2tvdXRCcmFuZGluZyB9KSB7XHJcbiAgICBpZiAoIWNoZWNrb3V0QnJhbmRpbmcubG9nb1VybCAmJiAhY2hlY2tvdXRCcmFuZGluZy5iYW5uZXJUZXh0KSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIChcclxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTggcm91bmRlZC1bMnJlbV0gYm9yZGVyIGJvcmRlci1zbGF0ZS0yMDAgYmctW3ZhcigtLXNmLWNoZWNrb3V0LWNhcmQtYmFja2dyb3VuZCldIHAtNiB0ZXh0LWNlbnRlciBzaGFkb3ctc21cIj5cclxuICAgICAgICAgICAge2NoZWNrb3V0QnJhbmRpbmcubG9nb1VybCAmJiAoXHJcbiAgICAgICAgICAgICAgICA8SW1hZ2VcclxuICAgICAgICAgICAgICAgICAgICBzcmM9e2NoZWNrb3V0QnJhbmRpbmcubG9nb1VybH1cclxuICAgICAgICAgICAgICAgICAgICBhbHQ9XCJcIlxyXG4gICAgICAgICAgICAgICAgICAgIHdpZHRoPXsxODB9XHJcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0PXs0OH1cclxuICAgICAgICAgICAgICAgICAgICB1bm9wdGltaXplZD17c2hvdWxkVXNlVW5vcHRpbWl6ZWRJbWFnZShjaGVja291dEJyYW5kaW5nLmxvZ29VcmwpfVxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cIm14LWF1dG8gbWItMyBoLTEyIHctYXV0byBvYmplY3QtY29udGFpblwiXHJcbiAgICAgICAgICAgICAgICAvPlxyXG4gICAgICAgICAgICApfVxyXG4gICAgICAgICAgICB7Y2hlY2tvdXRCcmFuZGluZy5iYW5uZXJUZXh0ICYmIChcclxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtc20gZm9udC1ib2xkIHRleHQtc2xhdGUtNzAwXCI+e2NoZWNrb3V0QnJhbmRpbmcuYmFubmVyVGV4dH08L3A+XHJcbiAgICAgICAgICAgICl9XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBDaGVja291dEhlYWRlcigpIHtcclxuICAgIHJldHVybiAoXHJcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYi03IGZsZXggZmxleC1jb2wgZ2FwLTUgc206ZmxleC1yb3cgc206aXRlbXMtZW5kIHNtOmp1c3RpZnktYmV0d2VlblwiPlxyXG4gICAgICAgICAgICA8ZGl2PlxyXG4gICAgICAgICAgICAgICAgPExpbmtcclxuICAgICAgICAgICAgICAgICAgICBocmVmPVwiL2NhcnRcIlxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cIm1iLTQgaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIHRleHQtc20gZm9udC1ib2xkIHRleHQtc2xhdGUtNTAwIHRyYW5zaXRpb24gaG92ZXI6dGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtYWNjZW50KV1cIlxyXG4gICAgICAgICAgICAgICAgPlxyXG4gICAgICAgICAgICAgICAgICAgIDxBcnJvd0xlZnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZT17MTZ9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cIm1yLTJcIlxyXG4gICAgICAgICAgICAgICAgICAgIC8+XHJcbiAgICAgICAgICAgICAgICAgICAgQmFjayB0byBDYXJ0XHJcbiAgICAgICAgICAgICAgICA8L0xpbms+XHJcbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJzZi1raWNrZXJcIj5DaGVja291dDwvcD5cclxuICAgICAgICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJzZi1oZWFkaW5nIG10LTEgdGV4dC0zeGwgc206dGV4dC00eGxcIiBzdHlsZT17eyBjb2xvcjogJ3ZhcigtLXNmLWNoZWNrb3V0LXRleHQpJyB9fT5Db21wbGV0ZSB5b3VyIG9yZGVyPC9oMT5cclxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgbWF4LXctMnhsIHRleHQtc20gZm9udC1zZW1pYm9sZCBsZWFkaW5nLTYgdGV4dC1zbGF0ZS01MDBcIj5cclxuICAgICAgICAgICAgICAgICAgICBDb25maXJtIGRlbGl2ZXJ5IGRldGFpbHMsIHJldmlldyB5b3VyIGl0ZW1zLCBhbmQgcGxhY2UgdGhlIG9yZGVyIHNlY3VyZWx5LlxyXG4gICAgICAgICAgICAgICAgPC9wPlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgPENoZWNrb3V0VHJ1c3RCYWRnZXMgLz5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBDaGVja291dFRydXN0QmFkZ2VzKCkge1xyXG4gICAgcmV0dXJuIChcclxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ2FwLTIgdGV4dC14cyBmb250LWJvbGQgdGV4dC1zbGF0ZS02MDAgc206Z3JpZC1jb2xzLTNcIj5cclxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHJvdW5kZWQtZnVsbCBiZy1bdmFyKC0tc2YtY2hlY2tvdXQtY2FyZC1iYWNrZ3JvdW5kKV0gcHgtMyBweS0yIHNoYWRvdy1zbVwiPlxyXG4gICAgICAgICAgICAgICAgPExvY2sgc2l6ZT17MTR9IGNsYXNzTmFtZT1cInRleHQtW3ZhcigtLXNmLWNoZWNrb3V0LXN1Y2Nlc3MpXVwiIC8+IFNlY3VyZVxyXG4gICAgICAgICAgICA8L3NwYW4+XHJcbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImlubGluZS1mbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiByb3VuZGVkLWZ1bGwgYmctW3ZhcigtLXNmLWNoZWNrb3V0LWNhcmQtYmFja2dyb3VuZCldIHB4LTMgcHktMiBzaGFkb3ctc21cIj5cclxuICAgICAgICAgICAgICAgIDxDcmVkaXRDYXJkIHNpemU9ezE0fSBjbGFzc05hbWU9XCJ0ZXh0LVt2YXIoLS1zZi1jaGVja291dC1hY2NlbnQpXVwiIC8+IENPRFxyXG4gICAgICAgICAgICA8L3NwYW4+XHJcbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImlubGluZS1mbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiByb3VuZGVkLWZ1bGwgYmctW3ZhcigtLXNmLWNoZWNrb3V0LWNhcmQtYmFja2dyb3VuZCldIHB4LTMgcHktMiBzaGFkb3ctc21cIj5cclxuICAgICAgICAgICAgICAgIDxUcnVjayBzaXplPXsxNH0gY2xhc3NOYW1lPVwidGV4dC1za3ktNjAwXCIgLz4gRGVsaXZlcnlcclxuICAgICAgICAgICAgPC9zcGFuPlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIENoZWNrb3V0UGFnZVNoZWxsKHsgY2hlY2tvdXRCcmFuZGluZywgY2hpbGRyZW4sIG1vYmlsZVN0aWNreUJhciwgb25TdWJtaXQgfSkge1xyXG4gICAgcmV0dXJuIChcclxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNmLWNoZWNrb3V0LXBhZ2Ugc2YtcGFnZSBzZi1tb2JpbGUtYWN0aW9uLXBhZ2VcIj5cclxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzZi1zaGVsbC13aWRlIHB5LTggc206cHktMTBcIj5cclxuICAgICAgICAgICAgICAgIDxDaGVja291dEJyYW5kaW5nQmFubmVyIGNoZWNrb3V0QnJhbmRpbmc9e2NoZWNrb3V0QnJhbmRpbmd9IC8+XHJcbiAgICAgICAgICAgICAgICA8Q2hlY2tvdXRIZWFkZXIgLz5cclxuXHJcbiAgICAgICAgICAgICAgICA8Zm9ybVxyXG4gICAgICAgICAgICAgICAgICAgIG9uU3VibWl0PXtvblN1Ym1pdH1cclxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0xIGdhcC04IGxnOmdyaWQtY29scy1bbWlubWF4KDAsMWZyKV80NTBweF1cIlxyXG4gICAgICAgICAgICAgICAgPlxyXG4gICAgICAgICAgICAgICAgICAgIHtjaGlsZHJlbn1cclxuICAgICAgICAgICAgICAgICAgICB7bW9iaWxlU3RpY2t5QmFyfVxyXG4gICAgICAgICAgICAgICAgPC9mb3JtPlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBDaGVja291dEN1c3RvbWVySW5mbyh7IGZvcm1EYXRhLCBvbklucHV0Q2hhbmdlIH0pIHtcclxuICAgIHJldHVybiAoXHJcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLVsycmVtXSBib3JkZXIgYm9yZGVyLXNsYXRlLTIwMCBiZy1bdmFyKC0tc2YtY2hlY2tvdXQtY2FyZC1iYWNrZ3JvdW5kKV0gcC02IHNoYWRvdy1zbSBzbTpwLThcIj5cclxuICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cIm1iLTYgdGV4dC0yeGwgZm9udC1ibGFjayB0ZXh0LVt2YXIoLS1zZi1jaGVja291dC10ZXh0KV1cIj5cclxuICAgICAgICAgICAgICAgIEN1c3RvbWVyIEluZm9ybWF0aW9uXHJcbiAgICAgICAgICAgIDwvaDI+XHJcblxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTEgZ2FwLTUgbWQ6Z3JpZC1jb2xzLTJcIj5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWQ6Y29sLXNwYW4tMlwiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbCBodG1sRm9yPVwiY2hlY2tvdXQtZnVsbC1uYW1lXCIgY2xhc3NOYW1lPVwibWItMiBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiB0ZXh0LXNtIGZvbnQtYm9sZCB0ZXh0LXNsYXRlLTcwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8VXNlciBzaXplPXsxNn0gLz5cclxuICAgICAgICAgICAgICAgICAgICAgICAgRnVsbCBOYW1lXHJcbiAgICAgICAgICAgICAgICAgICAgPC9sYWJlbD5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgPGlucHV0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkPVwiY2hlY2tvdXQtZnVsbC1uYW1lXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cInRleHRcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lPVwiZnVsbE5hbWVcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZT17Zm9ybURhdGEuZnVsbE5hbWV9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXtvbklucHV0Q2hhbmdlfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIkVudGVyIHlvdXIgZnVsbCBuYW1lXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwic2YtZmllbGRcIlxyXG4gICAgICAgICAgICAgICAgICAgIC8+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgICAgICA8ZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbCBodG1sRm9yPVwiY2hlY2tvdXQtZW1haWxcIiBjbGFzc05hbWU9XCJtYi0yIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHRleHQtc20gZm9udC1ib2xkIHRleHQtc2xhdGUtNzAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxNYWlsIHNpemU9ezE2fSAvPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBFbWFpbFxyXG4gICAgICAgICAgICAgICAgICAgIDwvbGFiZWw+XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIDxpbnB1dFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZD1cImNoZWNrb3V0LWVtYWlsXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImVtYWlsXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZT1cImVtYWlsXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU9e2Zvcm1EYXRhLmVtYWlsfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17b25JbnB1dENoYW5nZX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCJleGFtcGxlQGdtYWlsLmNvbVwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInNmLWZpZWxkXCJcclxuICAgICAgICAgICAgICAgICAgICAvPlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICAgICAgPGRpdj5cclxuICAgICAgICAgICAgICAgICAgICA8bGFiZWwgaHRtbEZvcj1cImNoZWNrb3V0LXBob25lXCIgY2xhc3NOYW1lPVwibWItMiBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiB0ZXh0LXNtIGZvbnQtYm9sZCB0ZXh0LXNsYXRlLTcwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8UGhvbmUgc2l6ZT17MTZ9IC8+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFBob25lIE51bWJlclxyXG4gICAgICAgICAgICAgICAgICAgIDwvbGFiZWw+XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIDxpbnB1dFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZD1cImNoZWNrb3V0LXBob25lXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cInRlbFwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU9XCJwaG9uZVwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlPXtmb3JtRGF0YS5waG9uZX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9e29uSW5wdXRDaGFuZ2V9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwiKzg4MDFYWFhYWFhYWFhcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJzZi1maWVsZFwiXHJcbiAgICAgICAgICAgICAgICAgICAgLz5cclxuICAgICAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWQ6Y29sLXNwYW4tMlwiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbCBodG1sRm9yPVwiY2hlY2tvdXQtYWRkcmVzc1wiIGNsYXNzTmFtZT1cIm1iLTIgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgdGV4dC1zbSBmb250LWJvbGQgdGV4dC1zbGF0ZS03MDBcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPE1hcFBpbiBzaXplPXsxNn0gLz5cclxuICAgICAgICAgICAgICAgICAgICAgICAgRnVsbCBBZGRyZXNzXHJcbiAgICAgICAgICAgICAgICAgICAgPC9sYWJlbD5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgPHRleHRhcmVhXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkPVwiY2hlY2tvdXQtYWRkcmVzc1wiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvd3M9ezR9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU9XCJhZGRyZXNzXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU9e2Zvcm1EYXRhLmFkZHJlc3N9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXtvbklucHV0Q2hhbmdlfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIkhvdXNlLCByb2FkLCBhcmVhLCB0aGFuYVwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInNmLWZpZWxkIHJlc2l6ZS1ub25lXCJcclxuICAgICAgICAgICAgICAgICAgICAvPlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtZDpjb2wtc3Bhbi0yXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGh0bWxGb3I9XCJjaGVja291dC1jaXR5XCIgY2xhc3NOYW1lPVwibWItMiBibG9jayB0ZXh0LXNtIGZvbnQtYm9sZCB0ZXh0LXNsYXRlLTcwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBEZWxpdmVyeSBhcmVhXHJcbiAgICAgICAgICAgICAgICAgICAgPC9sYWJlbD5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgPHNlbGVjdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZD1cImNoZWNrb3V0LWNpdHlcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1aXJlZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lPVwiY2l0eVwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlPXtmb3JtRGF0YS5jaXR5fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17b25JbnB1dENoYW5nZX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwic2YtZmllbGRcIlxyXG4gICAgICAgICAgICAgICAgICAgID5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cIlwiPlNlbGVjdCBkZWxpdmVyeSBhcmVhPC9vcHRpb24+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJJbnNpZGUgRGhha2FcIj5JbnNpZGUgRGhha2E8L29wdGlvbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cIk91dHNpZGUgRGhha2FcIj5PdXRzaWRlIERoYWthPC9vcHRpb24+XHJcbiAgICAgICAgICAgICAgICAgICAgPC9zZWxlY3Q+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICApO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gQ2hlY2tvdXREZWxpdmVyeUNoYXJnZU5vdGljZSgpIHtcclxuICAgIHJldHVybiAoXHJcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC01IHJvdW5kZWQtWzJyZW1dIGJvcmRlciBib3JkZXItc2xhdGUtMjAwIGJnLVt2YXIoLS1zZi1jaGVja291dC1jYXJkLWJhY2tncm91bmQpXSBwLTYgc2hhZG93LXNtXCI+XHJcbiAgICAgICAgICAgIDxUcnVja1xyXG4gICAgICAgICAgICAgICAgc2l6ZT17MzJ9XHJcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJtdC0xIHRleHQtW3ZhcigtLXNmLWNoZWNrb3V0LWFjY2VudCldXCJcclxuICAgICAgICAgICAgLz5cclxuXHJcbiAgICAgICAgICAgIDxkaXY+XHJcbiAgICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwibWItMSB0ZXh0LWxnIGZvbnQtYmxhY2sgdGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtdGV4dCldXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgRGVsaXZlcnkgQ2hhcmdlXHJcbiAgICAgICAgICAgICAgICA8L2gzPlxyXG5cclxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtc20gZm9udC1zZW1pYm9sZCB0ZXh0LXNsYXRlLTYwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgIEluc2lkZSBEaGFrYSDihpIg4KezIDgwXHJcbiAgICAgICAgICAgICAgICA8L3A+XHJcblxyXG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtc2xhdGUtNjAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgT3V0c2lkZSBEaGFrYSDihpIg4KezIDEyMFxyXG4gICAgICAgICAgICAgICAgPC9wPlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBDaGVja291dERlbGl2ZXJ5TWV0aG9kKHsgaXNEaGFrYSB9KSB7XHJcbiAgICBjb25zdCBoYXNTZWxlY3Rpb24gPSB0eXBlb2YgaXNEaGFrYSA9PT0gXCJib29sZWFuXCI7XHJcblxyXG4gICAgcmV0dXJuIChcclxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQtWzJyZW1dIGJvcmRlciBib3JkZXItc2xhdGUtMjAwIGJnLVt2YXIoLS1zZi1jaGVja291dC1jYXJkLWJhY2tncm91bmQpXSBwLTYgc2hhZG93LXNtIHNtOnAtOFwiPlxyXG4gICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwibWItNSB0ZXh0LTJ4bCBmb250LWJsYWNrIHRleHQtW3ZhcigtLXNmLWNoZWNrb3V0LXRleHQpXVwiPlxyXG4gICAgICAgICAgICAgICAgRGVsaXZlcnkgTWV0aG9kXHJcbiAgICAgICAgICAgIDwvaDI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBnYXAtMyBzbTpncmlkLWNvbHMtMlwiPlxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2Byb3VuZGVkLTJ4bCBib3JkZXIgcC00ICR7aGFzU2VsZWN0aW9uICYmIGlzRGhha2EgPyBcImJvcmRlci1bdmFyKC0tc2YtY2hlY2tvdXQtYWNjZW50KV0gYmctW3ZhcigtLXNmLWFjY2VudC1iZyldXCIgOiBcImJvcmRlci1zbGF0ZS0yMDAgYmctc2xhdGUtNTBcIn1gfT5cclxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtM1wiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtYmxhY2sgdGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtdGV4dCldXCI+SW5zaWRlIERoYWthPC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtYmxhY2sgdGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtYWNjZW50KV1cIj7gp7MgODA8L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgdGV4dC1zbGF0ZS01MDBcIj5TYW1lLWNpdHkgZGVsaXZlcnkgZXN0aW1hdGUuPC9wPlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YHJvdW5kZWQtMnhsIGJvcmRlciBwLTQgJHtoYXNTZWxlY3Rpb24gJiYgIWlzRGhha2EgPyBcImJvcmRlci1bdmFyKC0tc2YtY2hlY2tvdXQtYWNjZW50KV0gYmctW3ZhcigtLXNmLWFjY2VudC1iZyldXCIgOiBcImJvcmRlci1zbGF0ZS0yMDAgYmctc2xhdGUtNTBcIn1gfT5cclxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtM1wiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtYmxhY2sgdGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtdGV4dCldXCI+T3V0c2lkZSBEaGFrYTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LWJsYWNrIHRleHQtW3ZhcigtLXNmLWNoZWNrb3V0LWFjY2VudCldXCI+4KezIDEyMDwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0yIHRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LXNsYXRlLTUwMFwiPk5hdGlvbndpZGUgZGVsaXZlcnkgZXN0aW1hdGUuPC9wPlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIENoZWNrb3V0UGF5bWVudE1ldGhvZCh7IHByZXNlbnRhdGlvblZhcmlhbnQgfSA9IHt9KSB7XHJcbiAgICByZXR1cm4gKFxyXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC1bMnJlbV0gYm9yZGVyIGJvcmRlci1zbGF0ZS0yMDAgYmctW3ZhcigtLXNmLWNoZWNrb3V0LWNhcmQtYmFja2dyb3VuZCldIHAtNiBzaGFkb3ctc20gc206cC04XCI+XHJcbiAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJtYi01IHRleHQtMnhsIGZvbnQtYmxhY2sgdGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtdGV4dCldXCI+XHJcbiAgICAgICAgICAgICAgICBQYXltZW50IE1ldGhvZFxyXG4gICAgICAgICAgICA8L2gyPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItW3ZhcigtLXNmLWNoZWNrb3V0LWFjY2VudCldIGJnLVt2YXIoLS1zZi1hY2NlbnQtYmcpXSBwLTRcIj5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1zdGFydCBnYXAtM1wiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZsZXggaC0xMSB3LTExIHNocmluay0wIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLTJ4bCBiZy1bdmFyKC0tc2YtY2hlY2tvdXQtY2FyZC1iYWNrZ3JvdW5kKV0gdGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtYWNjZW50KV0gc2hhZG93LXNtXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxDcmVkaXRDYXJkIHNpemU9ezE5fSAvPlxyXG4gICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICA8ZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtYmxhY2sgdGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtdGV4dCldXCI+Q2FzaCBvbiBEZWxpdmVyeTwvcD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMSB0ZXh0LXhzIGZvbnQtc2VtaWJvbGQgbGVhZGluZy01IHRleHQtc2xhdGUtNTAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7cHJlc2VudGF0aW9uVmFyaWFudCA9PT0gJ2F0ZWxpZXItZWRpdG9yaWFsJyA/ICdQYXkgd2hlbiB5b3VyIG9yZGVyIGFycml2ZXMuJyA6ICdQYXkgc2VjdXJlbHkgd2hlbiB5b3VyIG9yZGVyIGFycml2ZXMuIE9ubGluZSBwYXltZW50IHByb3ZpZGVycyBjYW4gYmUgZW5hYmxlZCBsYXRlciBmcm9tIHRoZSBwbGF0Zm9ybS4nfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L3A+XHJcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICApO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gQ2hlY2tvdXRQaG9uZU90cEJveCh7XHJcbiAgICBtYXNrZWRQaG9uZSxcclxuICAgIG9uU2VuZE90cCxcclxuICAgIG9uVmVyaWZ5T3RwLFxyXG4gICAgb3RwLFxyXG4gICAgc2VuZGluZyxcclxuICAgIHNldE90cCxcclxuICAgIHZlcmlmaWVkLFxyXG4gICAgdmVyaWZ5aW5nLFxyXG59KSB7XHJcbiAgICByZXR1cm4gKFxyXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC1bMnJlbV0gYm9yZGVyIGJvcmRlci1zbGF0ZS0yMDAgYmctW3ZhcigtLXNmLWNoZWNrb3V0LWNhcmQtYmFja2dyb3VuZCldIHAtNiBzaGFkb3ctc20gc206cC04XCI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1zdGFydCBnYXAtM1wiPlxyXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZmxleCBoLTExIHctMTEgc2hyaW5rLTAgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtMnhsIGJnLWVtZXJhbGQtNTAgdGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtc3VjY2VzcyldXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgPFNoaWVsZENoZWNrIHNpemU9ezIwfSAvPlxyXG4gICAgICAgICAgICAgICAgPC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgPGRpdj5cclxuICAgICAgICAgICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC0yeGwgZm9udC1ibGFjayB0ZXh0LVt2YXIoLS1zZi1jaGVja291dC10ZXh0KV1cIj5WZXJpZnkgZGVsaXZlcnkgcGhvbmU8L2gyPlxyXG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTEgdGV4dC1zbSBmb250LXNlbWlib2xkIGxlYWRpbmctNiB0ZXh0LXNsYXRlLTUwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBXZSBzZW5kIGEgNi1kaWdpdCBjb2RlIGJlZm9yZSBwbGFjaW5nIHRoZSBvcmRlci4gU3RvY2sgaXMgcmVzZXJ2ZWQgb25seSBhZnRlciB2ZXJpZmljYXRpb24uXHJcbiAgICAgICAgICAgICAgICAgICAgPC9wPlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC01IGZsZXggZmxleC1jb2wgZ2FwLTMgc206ZmxleC1yb3dcIj5cclxuICAgICAgICAgICAgICAgIDxidXR0b25cclxuICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcclxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXtvblNlbmRPdHB9XHJcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e3NlbmRpbmcgfHwgdmVyaWZpZWR9XHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwic2YtYnRuIHNmLWJ0bi1zZWNvbmRhcnkgbWluLWgtMCBqdXN0aWZ5LWNlbnRlciBweC01IHB5LTMgdGV4dC1zbSBkaXNhYmxlZDpvcGFjaXR5LTUwXCJcclxuICAgICAgICAgICAgICAgID5cclxuICAgICAgICAgICAgICAgICAgICB7c2VuZGluZyA/IDxMb2FkZXIyIHNpemU9ezE3fSBjbGFzc05hbWU9XCJhbmltYXRlLXNwaW5cIiAvPiA6IDxQaG9uZSBzaXplPXsxN30gLz59XHJcbiAgICAgICAgICAgICAgICAgICAge3ZlcmlmaWVkID8gXCJQaG9uZSB2ZXJpZmllZFwiIDogXCJTZW5kIE9UUFwifVxyXG4gICAgICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggbWluLXctMCBmbGV4LTEgZ2FwLTJcIj5cclxuICAgICAgICAgICAgICAgICAgICA8aW5wdXRcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU9e290cH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0T3RwKGV2ZW50LnRhcmdldC52YWx1ZS5yZXBsYWNlKC9cXEQvZywgXCJcIikuc2xpY2UoMCwgNikpfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIjAwMDAwMFwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0TW9kZT1cIm51bWVyaWNcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhMZW5ndGg9ezZ9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXt2ZXJpZmllZH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwic2YtZmllbGQgbWluLXctMCBmbGV4LTFcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPVwiUGhvbmUgdmVyaWZpY2F0aW9uIGNvZGVcIlxyXG4gICAgICAgICAgICAgICAgICAgIC8+XHJcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17b25WZXJpZnlPdHB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXt2ZXJpZnlpbmcgfHwgdmVyaWZpZWQgfHwgb3RwLmxlbmd0aCAhPT0gNn1cclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwic2YtYnRuIHNmLWJ0bi1wcmltYXJ5IG1pbi1oLTAgcHgtNSBweS0zIHRleHQtc20gZGlzYWJsZWQ6b3BhY2l0eS01MFwiXHJcbiAgICAgICAgICAgICAgICAgICAgPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7dmVyaWZ5aW5nID8gPExvYWRlcjIgc2l6ZT17MTd9IGNsYXNzTmFtZT1cImFuaW1hdGUtc3BpblwiIC8+IDogXCJWZXJpZnlcIn1cclxuICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT17YG10LTMgcm91bmRlZC0yeGwgcHgtNCBweS0zIHRleHQteHMgZm9udC1ib2xkICR7XHJcbiAgICAgICAgICAgICAgICB2ZXJpZmllZCA/IFwiYmctZW1lcmFsZC01MCB0ZXh0LVt2YXIoLS1zZi1jaGVja291dC1zdWNjZXNzKV1cIiA6IFwiYmctc2xhdGUtNTAgdGV4dC1zbGF0ZS01MDBcIlxyXG4gICAgICAgICAgICB9YH0+XHJcbiAgICAgICAgICAgICAgICB7dmVyaWZpZWRcclxuICAgICAgICAgICAgICAgICAgICA/IGBWZXJpZmllZCAke21hc2tlZFBob25lIHx8IFwiZGVsaXZlcnkgcGhvbmVcIn0uYFxyXG4gICAgICAgICAgICAgICAgICAgIDogbWFza2VkUGhvbmVcclxuICAgICAgICAgICAgICAgICAgICAgICAgPyBgQ29kZSBzZW50IHRvICR7bWFza2VkUGhvbmV9LmBcclxuICAgICAgICAgICAgICAgICAgICAgICAgOiBcIkVudGVyIHlvdXIgcGhvbmUgYWJvdmUsIHRoZW4gc2VuZCBhIHZlcmlmaWNhdGlvbiBjb2RlLlwifVxyXG4gICAgICAgICAgICA8L3A+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICApO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gQ2hlY2tvdXREZXRhaWxzQ29sdW1uKHsgZm9ybURhdGEsIGlzRGhha2EsIG9uSW5wdXRDaGFuZ2UsIHByZXNlbnRhdGlvblZhcmlhbnQgfSkge1xyXG4gICAgcmV0dXJuIChcclxuICAgICAgICA8ZGl2IGRhdGEtYXRlbGllci1wYXJ0PXtwcmVzZW50YXRpb25WYXJpYW50ID09PSAnYXRlbGllci1lZGl0b3JpYWwnID8gJ2NoZWNrb3V0LWZpZWxkcycgOiB1bmRlZmluZWR9IGNsYXNzTmFtZT1cInNwYWNlLXktN1wiPlxyXG4gICAgICAgICAgICA8Q2hlY2tvdXRDdXN0b21lckluZm9cclxuICAgICAgICAgICAgICAgIGZvcm1EYXRhPXtmb3JtRGF0YX1cclxuICAgICAgICAgICAgICAgIG9uSW5wdXRDaGFuZ2U9e29uSW5wdXRDaGFuZ2V9XHJcbiAgICAgICAgICAgIC8+XHJcbiAgICAgICAgICAgIDxDaGVja291dERlbGl2ZXJ5Q2hhcmdlTm90aWNlIC8+XHJcbiAgICAgICAgICAgIDxDaGVja291dERlbGl2ZXJ5TWV0aG9kIGlzRGhha2E9e2lzRGhha2F9IC8+XHJcbiAgICAgICAgICAgIDxDaGVja291dFBheW1lbnRNZXRob2QgcHJlc2VudGF0aW9uVmFyaWFudD17cHJlc2VudGF0aW9uVmFyaWFudH0gLz5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIENoZWNrb3V0Q291cG9uQm94KHtcclxuICAgIG9uQXBwbHlQcm9tb3Rpb24sXHJcbiAgICBwcm9tb3Rpb25Db2RlLFxyXG4gICAgcHJvbW90aW9uTWVzc2FnZSxcclxuICAgIHNldFByb21vdGlvbkNvZGUsXHJcbn0pIHtcclxuICAgIHJldHVybiAoXHJcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYi02XCI+XHJcbiAgICAgICAgICAgIDxsYWJlbCBodG1sRm9yPVwiY2hlY2tvdXQtY291cG9uLWNvZGVcIiBjbGFzc05hbWU9XCJtYi0yIGJsb2NrIHRleHQtc20gZm9udC1ib2xkIHRleHQtc2xhdGUtNzAwXCI+XHJcbiAgICAgICAgICAgICAgICBDb3Vwb24gQ29kZVxyXG4gICAgICAgICAgICA8L2xhYmVsPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZ2FwLTJcIj5cclxuICAgICAgICAgICAgICAgIDxpbnB1dFxyXG4gICAgICAgICAgICAgICAgICAgIGlkPVwiY2hlY2tvdXQtY291cG9uLWNvZGVcIlxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU9XCJ0ZXh0XCJcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZT17cHJvbW90aW9uQ29kZX1cclxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRQcm9tb3Rpb25Db2RlKGV2ZW50LnRhcmdldC52YWx1ZS50b1VwcGVyQ2FzZSgpKX1cclxuICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIlNBVkUxMFwiXHJcbiAgICAgICAgICAgICAgICAgICAgYXJpYS1kZXNjcmliZWRieT17cHJvbW90aW9uTWVzc2FnZSA/IFwiY2hlY2tvdXQtY291cG9uLWZlZWRiYWNrXCIgOiB1bmRlZmluZWR9XHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwic2YtZmllbGQgbWluLXctMCBmbGV4LTEgdXBwZXJjYXNlXCJcclxuICAgICAgICAgICAgICAgIC8+XHJcbiAgICAgICAgICAgICAgICA8YnV0dG9uXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXHJcbiAgICAgICAgICAgICAgICAgICAgb25DbGljaz17b25BcHBseVByb21vdGlvbn1cclxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJzZi1idG4gc2YtYnRuLXByaW1hcnkgbWluLWgtMCBweC00IHB5LTNcIlxyXG4gICAgICAgICAgICAgICAgPlxyXG4gICAgICAgICAgICAgICAgICAgIEFwcGx5XHJcbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIHtwcm9tb3Rpb25NZXNzYWdlICYmIChcclxuICAgICAgICAgICAgICAgIDxwIGlkPVwiY2hlY2tvdXQtY291cG9uLWZlZWRiYWNrXCIgY2xhc3NOYW1lPXtgbXQtMiByb3VuZGVkLXhsIHB4LTMgcHktMiB0ZXh0LXhzIGZvbnQtYm9sZCAke1xyXG4gICAgICAgICAgICAgICAgICAgIHByb21vdGlvbk1lc3NhZ2UudHlwZSA9PT0gXCJlcnJvclwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgID8gXCJiZy1yZWQtNTAgdGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtZXJyb3IpXVwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDogcHJvbW90aW9uTWVzc2FnZS50eXBlID09PSBcInN1Y2Nlc3NcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBcImJnLWVtZXJhbGQtNTAgdGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtc3VjY2VzcyldXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogXCJiZy1zbGF0ZS01MCB0ZXh0LXNsYXRlLTYwMFwiXHJcbiAgICAgICAgICAgICAgICB9YH0+XHJcbiAgICAgICAgICAgICAgICAgICAge3Byb21vdGlvbk1lc3NhZ2UudGV4dH1cclxuICAgICAgICAgICAgICAgIDwvcD5cclxuICAgICAgICAgICAgKX1cclxuICAgICAgICA8L2Rpdj5cclxuICAgICk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIENoZWNrb3V0UG9saWN5Q29uc2VudCh7IHBvbGljeUFjY2VwdGVkLCBzZXRQb2xpY3lBY2NlcHRlZCB9KSB7XHJcbiAgICByZXR1cm4gKFxyXG4gICAgICAgIDxsYWJlbCBjbGFzc05hbWU9e2BtdC02IGZsZXggaXRlbXMtc3RhcnQgZ2FwLTMgcm91bmRlZC0yeGwgYm9yZGVyIHAtNCB0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdHJhbnNpdGlvbiAke1xyXG4gICAgICAgICAgICBwb2xpY3lBY2NlcHRlZFxyXG4gICAgICAgICAgICAgICAgPyBcImJvcmRlci1bdmFyKC0tc2YtY2hlY2tvdXQtYWNjZW50KV0gYmctW3ZhcigtLXNmLWFjY2VudC1iZyldIHRleHQtc2xhdGUtNzAwXCJcclxuICAgICAgICAgICAgICAgIDogXCJib3JkZXItc2xhdGUtMjAwIGJnLXNsYXRlLTUwIHRleHQtc2xhdGUtNjAwXCJcclxuICAgICAgICB9YH0+XHJcbiAgICAgICAgICAgIDxpbnB1dFxyXG4gICAgICAgICAgICAgICAgaWQ9XCJjaGVja291dC1wb2xpY3ktY29uc2VudFwiXHJcbiAgICAgICAgICAgICAgICB0eXBlPVwiY2hlY2tib3hcIlxyXG4gICAgICAgICAgICAgICAgY2hlY2tlZD17cG9saWN5QWNjZXB0ZWR9XHJcbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRQb2xpY3lBY2NlcHRlZChldmVudC50YXJnZXQuY2hlY2tlZCl9XHJcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJtdC0xIGgtNCB3LTQgcm91bmRlZCBib3JkZXItc2xhdGUtMzAwIHRleHQtW3ZhcigtLXNmLWNoZWNrb3V0LWFjY2VudCldIGZvY3VzOnJpbmctW3ZhcigtLXNmLWNoZWNrb3V0LWFjY2VudCldXCJcclxuICAgICAgICAgICAgLz5cclxuICAgICAgICAgICAgPHNwYW4+XHJcbiAgICAgICAgICAgICAgICBJIGFncmVlIHRvIHRoaXMgc3RvcmUmYXBvcztzIHBvbGljaWVzIGJlZm9yZSBwbGFjaW5nIG15IG9yZGVyLlxyXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwibXQtMSBibG9jayB0ZXh0LXhzIGZvbnQtbWVkaXVtIHRleHQtc2xhdGUtNTAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgUmV2aWV3IHRoZSBwb2xpY3kgc2VjdGlvbnMgYmVsb3cuIFRoaXMgY29uZmlybXMgeW91IHVuZGVyc3RhbmQgZGVsaXZlcnksIHJlZnVuZCwgYW5kIHByaXZhY3kgdGVybXMuXHJcbiAgICAgICAgICAgICAgICA8L3NwYW4+XHJcbiAgICAgICAgICAgIDwvc3Bhbj5cclxuICAgICAgICA8L2xhYmVsPlxyXG4gICAgKTtcclxufVxyXG5cclxuZnVuY3Rpb24gQ2hlY2tvdXRQb2xpY2llcyh7IHBvbGljaWVzLCB2aXNpYmxlUG9saWNpZXMgfSkge1xyXG4gICAgaWYgKHZpc2libGVQb2xpY2llcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gKFxyXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNiBib3JkZXItdCBib3JkZXItc2xhdGUtMjAwIHB0LTVcIj5cclxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYi0zIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHRleHQtc20gZm9udC1ibGFjayB0ZXh0LVt2YXIoLS1zZi1jaGVja291dC10ZXh0KV1cIj5cclxuICAgICAgICAgICAgICAgIDxGaWxlVGV4dCBzaXplPXsxNn0gY2xhc3NOYW1lPVwidGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtYWNjZW50KV1cIiAvPlxyXG4gICAgICAgICAgICAgICAgU3RvcmUgUG9saWNpZXNcclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS0yXCI+XHJcbiAgICAgICAgICAgICAgICB7dmlzaWJsZVBvbGljaWVzLm1hcCgoW2tleSwgbGFiZWxdKSA9PiAoXHJcbiAgICAgICAgICAgICAgICAgICAgPGRldGFpbHMga2V5PXtrZXl9IGNsYXNzTmFtZT1cInJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItc2xhdGUtMjAwIGJnLXNsYXRlLTUwIHB4LTQgcHktM1wiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3VtbWFyeSBjbGFzc05hbWU9XCJjdXJzb3ItcG9pbnRlciB0ZXh0LXNtIGZvbnQtYm9sZCB0ZXh0LXNsYXRlLTgwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge2xhYmVsfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L3N1bW1hcnk+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTMgd2hpdGVzcGFjZS1wcmUtbGluZSB0ZXh0LXNtIGxlYWRpbmctNiB0ZXh0LXNsYXRlLTYwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge3BvbGljaWVzW2tleV19XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvcD5cclxuICAgICAgICAgICAgICAgICAgICA8L2RldGFpbHM+XHJcbiAgICAgICAgICAgICAgICApKX1cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBDaGVja291dE9yZGVySXRlbSh7XHJcbiAgICBwcmVzZW50YXRpb25WYXJpYW50LFxyXG4gICAgaXRlbSxcclxuICAgIHByb2R1Y3QsXHJcbiAgICByZW1vdmVGcm9tQ2FydCxcclxuICAgIHVwZGF0ZVF1YW50aXR5LFxyXG59KSB7XHJcbiAgICBjb25zdCBpbWFnZVVybCA9IGl0ZW0uaW1hZ2VVcmwgfHwgcHJvZHVjdD8udGh1bWJuYWlsIHx8IHByb2R1Y3Q/LmltYWdlcz8uWzBdIHx8IFwiXCI7XHJcblxyXG4gICAgcmV0dXJuIChcclxuICAgICAgICA8ZGl2XHJcbiAgICAgICAgICAgIGtleT17aXRlbS5jYXJ0SXRlbUlkIHx8IGl0ZW0uX2lkfVxyXG4gICAgICAgICAgICBkYXRhLWF0ZWxpZXItcGFydD17cHJlc2VudGF0aW9uVmFyaWFudCA9PT0gJ2F0ZWxpZXItZWRpdG9yaWFsJyA/ICdjaGVja291dC1pdGVtJyA6IHVuZGVmaW5lZH1cclxuICAgICAgICAgICAgY2xhc3NOYW1lPVwicm91bmRlZC0zeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS0yMDAgcC01XCJcclxuICAgICAgICA+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtNFwiPlxyXG4gICAgICAgICAgICAgICAgPFNhZmVQcm9kdWN0SW1hZ2VcclxuICAgICAgICAgICAgICAgICAgICBzcmM9e2ltYWdlVXJsfVxyXG4gICAgICAgICAgICAgICAgICAgIGFsdD17aXRlbS50aXRsZX1cclxuICAgICAgICAgICAgICAgICAgICB3aWR0aD17OTZ9XHJcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0PXs5Nn1cclxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJoLTIwIHctMjAgcm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS0yMDAgb2JqZWN0LWNvdmVyIHNtOmgtMjQgc206dy0yNFwiXHJcbiAgICAgICAgICAgICAgICAgICAgZmFsbGJhY2tDbGFzc05hbWU9XCJmbGV4IGgtMjAgdy0yMCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS0yMDAgYmctc2xhdGUtNTAgdGV4dC1zbGF0ZS0zMDAgc206aC0yNCBzbTp3LTI0XCJcclxuICAgICAgICAgICAgICAgICAgICBpY29uQ2xhc3NOYW1lPVwiaC03IHctN1wiXHJcbiAgICAgICAgICAgICAgICAvPlxyXG5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cImxpbmUtY2xhbXAtMiBmb250LWJsYWNrIHRleHQtW3ZhcigtLXNmLWNoZWNrb3V0LXRleHQpXVwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7aXRlbS50aXRsZX1cclxuICAgICAgICAgICAgICAgICAgICA8L2gzPlxyXG5cclxuICAgICAgICAgICAgICAgICAgICB7cHJvZHVjdD8uc2hvcnREZXNjcmlwdGlvbiAmJiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTEgbGluZS1jbGFtcC0yIHRleHQtc20gdGV4dC1zbGF0ZS01MDBcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtwcm9kdWN0LnNob3J0RGVzY3JpcHRpb259XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvcD5cclxuICAgICAgICAgICAgICAgICAgICApfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBtdC01XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtwcmVzZW50YXRpb25WYXJpYW50ID09PSAnYXRlbGllci1lZGl0b3JpYWwnID8gJ0RlY3JlYXNlIHF1YW50aXR5IGZvciAnICsgaXRlbS50aXRsZSA6IHVuZGVmaW5lZH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVRdWFudGl0eShcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uY2FydEl0ZW1JZCB8fCBpdGVtLl9pZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucXVhbnRpdHkgLSAxXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBoLTkgdy05IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtMjAwIGhvdmVyOmJnLXNsYXRlLTEwMFwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPE1pbnVzIHNpemU9ezE2fSAvPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTEwIHRleHQtY2VudGVyIGZvbnQtYmxhY2sgdGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtdGV4dCldXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2l0ZW0ucXVhbnRpdHl9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17cHJlc2VudGF0aW9uVmFyaWFudCA9PT0gJ2F0ZWxpZXItZWRpdG9yaWFsJyA/ICdJbmNyZWFzZSBxdWFudGl0eSBmb3IgJyArIGl0ZW0udGl0bGUgOiB1bmRlZmluZWR9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlUXVhbnRpdHkoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLmNhcnRJdGVtSWQgfHwgaXRlbS5faWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnF1YW50aXR5ICsgMVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXggaC05IHctOSBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcm91bmRlZC14bCBib3JkZXIgYm9yZGVyLXNsYXRlLTIwMCBob3ZlcjpiZy1zbGF0ZS0xMDBcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxQbHVzIHNpemU9ezE2fSAvPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXJpZ2h0XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtYmxhY2sgdGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtdGV4dCldXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg4KezXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyhpdGVtLmZpbmFsUHJpY2UgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uc2VsbGluZ1ByaWNlKSAqXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucXVhbnRpdHl9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3A+XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LXNsYXRlLTQwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOCns1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtpdGVtLmZpbmFsUHJpY2UgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5zZWxsaW5nUHJpY2V9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWFjaFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9wPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZUZyb21DYXJ0KFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uY2FydEl0ZW1JZCB8fCBpdGVtLl9pZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cIm10LTQgaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHRleHQtc20gZm9udC1ib2xkIHRleHQtW3ZhcigtLXNmLWNoZWNrb3V0LWVycm9yKV0gaG92ZXI6dGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtZXJyb3IpXVwiXHJcbiAgICAgICAgICAgICAgICAgICAgPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8VHJhc2gyIHNpemU9ezE0fSAvPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBSZW1vdmVcclxuICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBDaGVja291dE9yZGVyU3VtbWFyeSh7XHJcbiAgICBwcmVzZW50YXRpb25WYXJpYW50LFxyXG4gICAgY2FydEl0ZW1zLFxyXG4gICAgY2hlY2tvdXRCcmFuZGluZyxcclxuICAgIGZpbmFsU2hpcHBpbmdDb3N0LFxyXG4gICAgbG9hZGluZyxcclxuICAgIG9uQXBwbHlQcm9tb3Rpb24sXHJcbiAgICBwb2xpY2llcyxcclxuICAgIHBvbGljeUFjY2VwdGVkLFxyXG4gICAgcHJvZHVjdHNEZXRhaWxzLFxyXG4gICAgcHJvbW90aW9uQ29kZSxcclxuICAgIHByb21vdGlvbkRpc2NvdW50LFxyXG4gICAgcHJvbW90aW9uTWVzc2FnZSxcclxuICAgIHJlbW92ZUZyb21DYXJ0LFxyXG4gICAgc2V0UG9saWN5QWNjZXB0ZWQsXHJcbiAgICBzZXRQcm9tb3Rpb25Db2RlLFxyXG4gICAgcGhvbmVWZXJpZmllZCxcclxuICAgIHN1YnRvdGFsLFxyXG4gICAgdG90YWxBbW91bnQsXHJcbiAgICB1cGRhdGVRdWFudGl0eSxcclxuICAgIHZpc2libGVQb2xpY2llcyxcclxufSkge1xyXG4gICAgcmV0dXJuIChcclxuICAgICAgICA8ZGl2PlxyXG4gICAgICAgICAgICA8ZGl2IGRhdGEtYXRlbGllci1wYXJ0PXtwcmVzZW50YXRpb25WYXJpYW50ID09PSAnYXRlbGllci1lZGl0b3JpYWwnID8gJ2NoZWNrb3V0LXN1bW1hcnknIDogdW5kZWZpbmVkfSBjbGFzc05hbWU9XCJzdGlja3kgdG9wLTI4IG92ZXJmbG93LWhpZGRlbiByb3VuZGVkLVsycmVtXSBib3JkZXIgYm9yZGVyLXNsYXRlLTIwMCBiZy1bdmFyKC0tc2YtY2hlY2tvdXQtY2FyZC1iYWNrZ3JvdW5kKV0gc2hhZG93LXhsIHNoYWRvdy1zbGF0ZS0yMDAvNzBcIj5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTIwMCBiZy1bdmFyKC0tc2YtY2hlY2tvdXQtY2FyZC1iYWNrZ3JvdW5kKV0gcC02IHNtOnAtN1wiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1zdGFydCBqdXN0aWZ5LWJldHdlZW4gZ2FwLTRcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInNmLWtpY2tlclwiPlJldmlldzwvcD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJtdC0xIHRleHQtMnhsIGZvbnQtYmxhY2sgdGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtdGV4dCldXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgT3JkZXIgU3VtbWFyeVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9oMj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInJvdW5kZWQtZnVsbCBiZy1bdmFyKC0tc2YtY2hlY2tvdXQtY2FyZC1iYWNrZ3JvdW5kKV0gcHgtMyBweS0xLjUgdGV4dC14cyBmb250LWJsYWNrIHRleHQtW3ZhcigtLXNmLWNoZWNrb3V0LWFjY2VudCldIHNoYWRvdy1zbVwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge2NhcnRJdGVtcy5sZW5ndGh9IGl0ZW17Y2FydEl0ZW1zLmxlbmd0aCA9PT0gMSA/IFwiXCIgOiBcInNcIn1cclxuICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtaC1bNDYwcHhdIHNwYWNlLXktNSBvdmVyZmxvdy15LWF1dG8gcC02IHNtOnAtN1wiPlxyXG4gICAgICAgICAgICAgICAgICAgIHtjYXJ0SXRlbXMubWFwKChpdGVtKSA9PiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxDaGVja291dE9yZGVySXRlbVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJlc2VudGF0aW9uVmFyaWFudD17cHJlc2VudGF0aW9uVmFyaWFudH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleT17aXRlbS5jYXJ0SXRlbUlkIHx8IGl0ZW0uX2lkfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbT17aXRlbX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q9e3Byb2R1Y3RzRGV0YWlsc1tpdGVtLl9pZF19XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVGcm9tQ2FydD17cmVtb3ZlRnJvbUNhcnR9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVRdWFudGl0eT17dXBkYXRlUXVhbnRpdHl9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8+XHJcbiAgICAgICAgICAgICAgICAgICAgKSl9XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJvcmRlci10IGJvcmRlci1zbGF0ZS0yMDAgcC02IHNtOnAtN1wiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxDaGVja291dENvdXBvbkJveFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkFwcGx5UHJvbW90aW9uPXtvbkFwcGx5UHJvbW90aW9ufVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tb3Rpb25Db2RlPXtwcm9tb3Rpb25Db2RlfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tb3Rpb25NZXNzYWdlPXtwcm9tb3Rpb25NZXNzYWdlfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRQcm9tb3Rpb25Db2RlPXtzZXRQcm9tb3Rpb25Db2RlfVxyXG4gICAgICAgICAgICAgICAgICAgIC8+XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS00IHRleHQtc21cIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktYmV0d2VlblwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS01MDBcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTdWJ0b3RhbFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYm9sZCB0ZXh0LVt2YXIoLS1zZi1jaGVja291dC10ZXh0KV1cIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDgp7Mge3N1YnRvdGFsfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW5cIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtc2xhdGUtNTAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRGVsaXZlcnkgQ2hhcmdlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtW3ZhcigtLXNmLWNoZWNrb3V0LXRleHQpXVwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOCnsyB7ZmluYWxTaGlwcGluZ0Nvc3R9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAge3Byb21vdGlvbkRpc2NvdW50ID4gMCAmJiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIHRleHQtW3ZhcigtLXNmLWNoZWNrb3V0LXN1Y2Nlc3MpXVwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDb3Vwb24gRGlzY291bnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYm9sZFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtIOCnsyB7cHJvbW90aW9uRGlzY291bnR9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICl9XHJcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gYm9yZGVyLXQgYm9yZGVyLWRhc2hlZCBib3JkZXItc2xhdGUtMjAwIHB0LTVcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14bCBmb250LWJsYWNrIHRleHQtW3ZhcigtLXNmLWNoZWNrb3V0LXRleHQpXVwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVG90YWxcclxuICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC0zeGwgZm9udC1ibGFjayB0ZXh0LVt2YXIoLS1zZi1jaGVja291dC10ZXh0KV1cIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIOCnsyB7dG90YWxBbW91bnR9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgPENoZWNrb3V0UG9saWN5Q29uc2VudFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb2xpY3lBY2NlcHRlZD17cG9saWN5QWNjZXB0ZWR9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFBvbGljeUFjY2VwdGVkPXtzZXRQb2xpY3lBY2NlcHRlZH1cclxuICAgICAgICAgICAgICAgICAgICAvPlxyXG5cclxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJzdWJtaXRcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZD17bG9hZGluZyB8fCAhcG9saWN5QWNjZXB0ZWR9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInNmLWJ0biBzZi1jaGVja291dC1zdWJtaXQgbXQtNyB3LWZ1bGwgcHktNSB0ZXh0LWxnIGRpc2FibGVkOm9wYWNpdHktNTBcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyBib3JkZXJSYWRpdXM6IFwidmFyKC0tc2YtY2hlY2tvdXQtcmFkaXVzKVwiIH19XHJcbiAgICAgICAgICAgICAgICAgICAgPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7bG9hZGluZyA/IChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDw+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPExvYWRlcjIgc2l6ZT17MjB9IGNsYXNzTmFtZT1cImFuaW1hdGUtc3BpblwiIC8+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgUHJvY2Vzc2luZyBvcmRlclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC8+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICkgOiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxMb2NrIHNpemU9ezE4fSAvPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtwaG9uZVZlcmlmaWVkID8gXCJQbGFjZSBPcmRlclwiIDogXCJQbGFjZSBPcmRlclwifVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC8+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICl9XHJcbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtNSBncmlkIGdhcC0zIHRleHQtc20gZm9udC1zZW1pYm9sZCB0ZXh0LXNsYXRlLTYwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMlwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPFNoaWVsZENoZWNrXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZT17MTZ9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtc3VjY2VzcyldXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Y2hlY2tvdXRCcmFuZGluZy50cnVzdE1lc3NhZ2UgfHwgXCJTZWN1cmUgQ2hlY2tvdXRcIn1cclxuICAgICAgICAgICAgICAgICAgICAgICAgPC9wPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJyb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLWVtZXJhbGQtMjAwIGJnLWVtZXJhbGQtNTAgcHgtNCBweS0zIHRleHQtY2VudGVyIHRleHQtW3ZhcigtLXNmLWNoZWNrb3V0LXN1Y2Nlc3MpXVwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQ2FzaCBvbiBkZWxpdmVyeSBvcmRlci4gWW91IHBheSB3aGVuIHRoZSBwcm9kdWN0IGFycml2ZXMuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvcD5cclxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgPENoZWNrb3V0UG9saWNpZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9saWNpZXM9e3BvbGljaWVzfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2aXNpYmxlUG9saWNpZXM9e3Zpc2libGVQb2xpY2llc31cclxuICAgICAgICAgICAgICAgICAgICAvPlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIENoZWNrb3V0TW9iaWxlU3RpY2t5QmFyKHsgbG9hZGluZywgcGhvbmVWZXJpZmllZCwgcG9saWN5QWNjZXB0ZWQsIHRvdGFsQW1vdW50IH0pIHtcclxuICAgIHJldHVybiAoXHJcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzZi1tb2JpbGUtYWN0aW9uLWJhciBmaXhlZCBpbnNldC14LTAgei00MCBib3JkZXItdCBib3JkZXItc2xhdGUtMjAwIGJnLVt2YXIoLS1zZi1jaGVja291dC1jYXJkLWJhY2tncm91bmQpXSBwLTMgc2hhZG93LVswXy0xMHB4XzMwcHhfcmdiYSgxNSwyMyw0MiwwLjA4KV0gYmFja2Ryb3AtYmx1ciBsZzpoaWRkZW5cIj5cclxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJteC1hdXRvIGZsZXggbWF4LXcteGwgaXRlbXMtY2VudGVyIGdhcC0zXCI+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1pbi13LTAgZmxleC0xXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC14cyBmb250LWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE0ZW1dIHRleHQtc2xhdGUtNTAwXCI+UGF5IG9uIGRlbGl2ZXJ5PC9wPlxyXG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteGwgZm9udC1ibGFjayB0ZXh0LVt2YXIoLS1zZi1jaGVja291dC10ZXh0KV1cIj7gp7Mge3RvdGFsQW1vdW50fTwvcD5cclxuICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgPGJ1dHRvblxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU9XCJzdWJtaXRcIlxyXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXtsb2FkaW5nIHx8ICFwb2xpY3lBY2NlcHRlZH1cclxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJzZi1idG4gbWluLWgtMCBweC01IHB5LTMgdGV4dC1zbSBkaXNhYmxlZDpvcGFjaXR5LTUwXCJcclxuICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyBib3JkZXJSYWRpdXM6ICd2YXIoLS1zZi1jaGVja291dC1yYWRpdXMpJywgYmFja2dyb3VuZENvbG9yOiAndmFyKC0tc2YtY2hlY2tvdXQtYnV0dG9uLWJhY2tncm91bmQpJywgY29sb3I6ICd2YXIoLS1zZi1jaGVja291dC1idXR0b24tdGV4dCknIH19XHJcbiAgICAgICAgICAgICAgICA+XHJcbiAgICAgICAgICAgICAgICAgICAge2xvYWRpbmcgPyA8TG9hZGVyMiBzaXplPXsxN30gY2xhc3NOYW1lPVwiYW5pbWF0ZS1zcGluXCIgLz4gOiA8TG9jayBzaXplPXsxNn0gLz59XHJcbiAgICAgICAgICAgICAgICAgICAge3Bob25lVmVyaWZpZWQgPyBcIlBsYWNlIG9yZGVyXCIgOiBcIlBsYWNlIG9yZGVyXCJ9XHJcbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICApO1xyXG59XHJcblxyXG4vLyBLZWVwIHRoZSBvcmlnaW5hbCBtb2RhbCBjYWxsYWJsZSB3aXRob3V0IFJlYWN0IGhvb2tzOyBvbmx5IEF0ZWxpZXIgbmVlZHMgZm9jdXMgbWFuYWdlbWVudC5cclxuZnVuY3Rpb24gQXRlbGllckNoZWNrb3V0RGlhbG9nKHsgb3Blbiwgb25DbG9zZSwgYnVzeSwgcmVuZGVyIH0pIHtcclxuICAgIGNvbnN0IGRpYWxvZ1JlZiA9IHVzZUF0ZWxpZXJEaWFsb2coeyBlbmFibGVkOiB0cnVlLCBvcGVuLCBvbkNsb3NlLCBidXN5IH0pO1xyXG4gICAgcmV0dXJuIHJlbmRlcihkaWFsb2dSZWYpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gQ2hlY2tvdXRPdHBNb2RhbCh7XHJcbiAgICBwcmVzZW50YXRpb25WYXJpYW50LFxyXG4gICAgZXJyb3IsXHJcbiAgICBtYXNrZWRQaG9uZSxcclxuICAgIG9uQ2FuY2VsLFxyXG4gICAgb25TZW5kQ29kZSxcclxuICAgIG9uVmVyaWZ5Q29kZSxcclxuICAgIG9wZW4sXHJcbiAgICBvdHAsXHJcbiAgICBzZW5kaW5nLFxyXG4gICAgc2V0T3RwLFxyXG4gICAgc3RhdGUsXHJcbiAgICB2ZXJpZnlpbmcsXHJcbn0pIHtcclxuICAgIGNvbnN0IGF0ZWxpZXIgPSBwcmVzZW50YXRpb25WYXJpYW50ID09PSAnYXRlbGllci1lZGl0b3JpYWwnO1xyXG4gICAgY29uc3QgaXNCdXN5ID0gc2VuZGluZyB8fCB2ZXJpZnlpbmcgfHwgc3RhdGUgPT09IFwicGxhY2luZ19vcmRlclwiO1xyXG4gICAgaWYgKCFvcGVuKSByZXR1cm4gbnVsbDtcclxuICAgIGNvbnN0IGlzT3RwSW5wdXQgPSBzdGF0ZSA9PT0gXCJvdHBfaW5wdXRcIiB8fCBzdGF0ZSA9PT0gXCJ2ZXJpZnlpbmdcIiB8fCBzdGF0ZSA9PT0gXCJlcnJvclwiO1xyXG4gICAgY29uc3QgaGFuZGxlU3VibWl0ID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICBpZiAoaXNCdXN5KSByZXR1cm47XHJcbiAgICAgICAgaWYgKGlzT3RwSW5wdXQpIHtcclxuICAgICAgICAgICAgaWYgKG90cC5sZW5ndGggPT09IDYpIG9uVmVyaWZ5Q29kZSgpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIG9uU2VuZENvZGUoKTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgcmVuZGVyTW9kYWwgPSAoZGlhbG9nUmVmKSA9PiAoXHJcbiAgICAgICAgPGRpdiByZWY9e2RpYWxvZ1JlZn0gYXJpYS1idXN5PXthdGVsaWVyICYmIGlzQnVzeSA/IHRydWUgOiB1bmRlZmluZWR9IGRhdGEtYXRlbGllci1kaWFsb2c9e2F0ZWxpZXIgPyBcImNoZWNrb3V0LW90cFwiIDogdW5kZWZpbmVkfSBjbGFzc05hbWU9XCJmaXhlZCBpbnNldC0wIHotWzEyMF0gZmxleCBpdGVtcy1lbmQgYmctc2xhdGUtOTUwLzU1IHAtMCBiYWNrZHJvcC1ibHVyLXNtIHNtOml0ZW1zLWNlbnRlciBzbTpqdXN0aWZ5LWNlbnRlciBzbTpwLTRcIiByb2xlPVwiZGlhbG9nXCIgYXJpYS1tb2RhbD1cInRydWVcIiBhcmlhLWxhYmVsbGVkYnk9XCJjaGVja291dC1vdHAtdGl0bGVcIj5cclxuICAgICAgICAgICAgPGZvcm0gb25TdWJtaXQ9e2hhbmRsZVN1Ym1pdH0gY2xhc3NOYW1lPVwidy1mdWxsIG92ZXJmbG93LWhpZGRlbiByb3VuZGVkLXQtWzJyZW1dIGJvcmRlciBib3JkZXItc2xhdGUtMjAwIGJnLVt2YXIoLS1zZi1jaGVja291dC1jYXJkLWJhY2tncm91bmQpXSBzaGFkb3ctMnhsIHNoYWRvdy1zbGF0ZS05NTAvMjAgc206bWF4LXctbWQgc206cm91bmRlZC1bMnJlbV1cIj5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1zdGFydCBqdXN0aWZ5LWJldHdlZW4gZ2FwLTQgYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTIwMCBwLTUgc206cC02XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLXN0YXJ0IGdhcC0zXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImZsZXggaC0xMSB3LTExIHNocmluay0wIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLTJ4bCBiZy1lbWVyYWxkLTUwIHRleHQtW3ZhcigtLXNmLWNoZWNrb3V0LXN1Y2Nlc3MpXVwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPFNoaWVsZENoZWNrIHNpemU9ezIwfSAvPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aDIgaWQ9XCJjaGVja291dC1vdHAtdGl0bGVcIiBjbGFzc05hbWU9XCJ0ZXh0LXhsIGZvbnQtYmxhY2sgdGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtdGV4dCldXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVmVyaWZ5IHlvdXIgcGhvbmUgbnVtYmVyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2gyPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMSB0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgbGVhZGluZy02IHRleHQtc2xhdGUtNTAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgV2UgbmVlZCB0byB2ZXJpZnkgeW91ciBkZWxpdmVyeSBwaG9uZSBiZWZvcmUgcGxhY2luZyB0aGlzIG9yZGVyLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9wPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXtvbkNhbmNlbH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e2lzQnVzeX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBoLTEwIHctMTAgc2hyaW5rLTAgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHJvdW5kZWQtZnVsbCBiZy1zbGF0ZS0xMDAgdGV4dC1zbGF0ZS01MDAgdHJhbnNpdGlvbiBob3ZlcjpiZy1zbGF0ZS0yMDAgaG92ZXI6dGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtdGV4dCldIGRpc2FibGVkOm9wYWNpdHktNTBcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPVwiQ2xvc2UgcGhvbmUgdmVyaWZpY2F0aW9uXCJcclxuICAgICAgICAgICAgICAgICAgICA+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxYIHNpemU9ezE4fSAvPlxyXG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTUgcC01IHNtOnAtNlwiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC0zeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS0yMDAgYmctc2xhdGUtNTAgcC00IHRleHQtc20gZm9udC1zZW1pYm9sZCBsZWFkaW5nLTYgdGV4dC1zbGF0ZS02MDBcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAge2lzT3RwSW5wdXQgPyAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8PkVudGVyIHRoZSA2LWRpZ2l0IGNvZGUgc2VudCB0byA8c3BhbiBjbGFzc05hbWU9XCJmb250LWJsYWNrIHRleHQtW3ZhcigtLXNmLWNoZWNrb3V0LXRleHQpXVwiPnttYXNrZWRQaG9uZSB8fCBcInlvdXIgcGhvbmVcIn08L3NwYW4+LjwvPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICApIDogc3RhdGUgPT09IFwicGxhY2luZ19vcmRlclwiID8gKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPD5QaG9uZSB2ZXJpZmllZC4gUGxhY2luZyB5b3VyIG9yZGVyIHNlY3VyZWx5IG5vdy48Lz5cclxuICAgICAgICAgICAgICAgICAgICAgICAgKSA6IChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDw+U2VuZCBhIHZlcmlmaWNhdGlvbiBjb2RlIHRvIDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYmxhY2sgdGV4dC1bdmFyKC0tc2YtY2hlY2tvdXQtdGV4dCldXCI+e21hc2tlZFBob25lIHx8IFwieW91ciBwaG9uZSBudW1iZXJcIn08L3NwYW4+IHRvIHBsYWNlIHlvdXIgb3JkZXIuPC8+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICl9XHJcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHtpc090cElucHV0ICYmIChcclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCBodG1sRm9yPVwiY2hlY2tvdXQtbW9kYWwtb3RwXCIgY2xhc3NOYW1lPVwibWItMiBibG9jayB0ZXh0LXNtIGZvbnQtYm9sZCB0ZXh0LXNsYXRlLTcwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFZlcmlmaWNhdGlvbiBjb2RlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2xhYmVsPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ9XCJjaGVja291dC1tb2RhbC1vdHBcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9Gb2N1cz17YXRlbGllciB8fCB1bmRlZmluZWR9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1pbnZhbGlkPXthdGVsaWVyICYmIGVycm9yID8gdHJ1ZSA6IHVuZGVmaW5lZH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLWRlc2NyaWJlZGJ5PXthdGVsaWVyICYmIGVycm9yID8gXCJjaGVja291dC1vdHAtZXJyb3JcIiA6IHVuZGVmaW5lZH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZT17b3RwfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldE90cChldmVudC50YXJnZXQudmFsdWUucmVwbGFjZSgvXFxEL2csIFwiXCIpLnNsaWNlKDAsIDYpKX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIjAwMDAwMFwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRNb2RlPVwibnVtZXJpY1wiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50ZXJLZXlIaW50PVwiZG9uZVwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXV0b0NvbXBsZXRlPVwib25lLXRpbWUtY29kZVwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0dGVybj1cIlswLTldKlwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4TGVuZ3RoPXs2fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXtpc0J1c3l9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwic2YtZmllbGQgdGV4dC1jZW50ZXIgdGV4dC1sZyBmb250LWJsYWNrIHRyYWNraW5nLVswLjM1ZW1dXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICl9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHtlcnJvciAmJiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxwIGlkPXthdGVsaWVyID8gXCJjaGVja291dC1vdHAtZXJyb3JcIiA6IHVuZGVmaW5lZH0gcm9sZT17YXRlbGllciA/IFwiYWxlcnRcIiA6IHVuZGVmaW5lZH0gY2xhc3NOYW1lPVwicm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1yb3NlLTIwMCBiZy1yb3NlLTUwIHB4LTQgcHktMyB0ZXh0LXNtIGZvbnQtYm9sZCB0ZXh0LVt2YXIoLS1zZi1jaGVja291dC1lcnJvcildXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7ZXJyb3J9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvcD5cclxuICAgICAgICAgICAgICAgICAgICApfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ2FwLTMgc206Z3JpZC1jb2xzLTJcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXtvbkNhbmNlbH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXtpc0J1c3l9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJzZi1idG4gc2YtYnRuLXNlY29uZGFyeSBqdXN0aWZ5LWNlbnRlciBweS0zIGRpc2FibGVkOm9wYWNpdHktNTBcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBDYW5jZWxcclxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IWlzT3RwSW5wdXQgPyAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cInN1Ym1pdFwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e2lzQnVzeX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJzZi1idG4gc2YtYnRuLXByaW1hcnkganVzdGlmeS1jZW50ZXIgcHktMyBkaXNhYmxlZDpvcGFjaXR5LTUwXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7c2VuZGluZyA/IDxMb2FkZXIyIHNpemU9ezE3fSBjbGFzc05hbWU9XCJhbmltYXRlLXNwaW5cIiAvPiA6IDxQaG9uZSBzaXplPXsxN30gLz59XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgU2VuZCBDb2RlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgKSA6IChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwic3VibWl0XCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZD17aXNCdXN5IHx8IG90cC5sZW5ndGggIT09IDZ9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwic2YtYnRuIHNmLWJ0bi1wcmltYXJ5IGp1c3RpZnktY2VudGVyIHB5LTMgZGlzYWJsZWQ6b3BhY2l0eS01MFwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3ZlcmlmeWluZyB8fCBzdGF0ZSA9PT0gXCJwbGFjaW5nX29yZGVyXCIgPyA8TG9hZGVyMiBzaXplPXsxN30gY2xhc3NOYW1lPVwiYW5pbWF0ZS1zcGluXCIgLz4gOiA8U2hpZWxkQ2hlY2sgc2l6ZT17MTd9IC8+fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtzdGF0ZSA9PT0gXCJwbGFjaW5nX29yZGVyXCIgPyBcIlBsYWNpbmcgb3JkZXJcIiA6IFwiVmVyaWZ5ICYgcGxhY2Ugb3JkZXJcIn1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICApfVxyXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDwvZm9ybT5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICk7XHJcbiAgICByZXR1cm4gYXRlbGllclxyXG4gICAgICAgID8gPEF0ZWxpZXJDaGVja291dERpYWxvZyBvcGVuPXtvcGVufSBvbkNsb3NlPXtvbkNhbmNlbH0gYnVzeT17aXNCdXN5fSByZW5kZXI9e3JlbmRlck1vZGFsfS8+XHJcbiAgICAgICAgOiByZW5kZXJNb2RhbCgpO1xyXG59XHJcbiJdLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMF19