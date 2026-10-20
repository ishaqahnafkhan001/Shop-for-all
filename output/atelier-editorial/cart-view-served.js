const _jsxDEV = __vite__cjsImport4_react_jsxDevRuntime["jsxDEV"];"use client";
import { CheckCircle, Headphones, Minus, Plus, ShieldCheck, ShoppingBag, Tag, Trash2, Truck } from "/node_modules/.vite/deps/lucide-react.js?v=d5ed7809";
import { Link } from "/node_modules/@scaleup/storefront-renderer/presentation/Runtime.jsx";
import SafeProductImage from "/node_modules/@scaleup/storefront-renderer/presentation/SafeProductImage.jsx";
import { ProductCard } from "/node_modules/@scaleup/storefront-renderer/reference/StorefrontProductCard.jsx";
var _jsxFileName = "C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/node_modules/@scaleup/storefront-renderer/presentation/CartView.jsx";
import __vite__cjsImport4_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=d5ed7809";
export function CartView({ cartItems, removeFromCart, updateQuantity, subtotal, shipping, totalSavings, total, getCartImageUrl, promoCode, setPromoCode, promoFeedback, handleApplyPromo, recommendationsLoading, recommendations, themedProductCard, productActions, presentationVariant }) {
	const atelier = presentationVariant === "atelier-editorial";
	// EMPTY STATE
	if (cartItems.length === 0) {
		return /* @__PURE__ */ _jsxDEV("div", {
			className: atelier ? "sf-page atelier-cart flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center" : "sf-page flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center",
			children: [
				/* @__PURE__ */ _jsxDEV("div", {
					className: "mb-6 rounded-[2rem] bg-white p-6 shadow-sm",
					children: /* @__PURE__ */ _jsxDEV(ShoppingBag, {
						size: 56,
						className: "text-slate-300"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 15,
						columnNumber: 21
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 14,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ _jsxDEV("h2", {
					className: "mb-2 text-3xl font-black text-slate-950",
					children: "Your cart is empty"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 17,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ _jsxDEV("p", {
					className: "mb-8 max-w-md text-sm leading-6 text-slate-500",
					children: "Add products to compare options, review totals, and complete checkout securely."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 18,
					columnNumber: 17
				}, this),
				/* @__PURE__ */ _jsxDEV(Link, {
					href: "/",
					className: "sf-btn sf-btn-primary px-8",
					children: "Continue Shopping"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 21,
					columnNumber: 17
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 13,
			columnNumber: 13
		}, this);
	}
	return /* @__PURE__ */ _jsxDEV("div", {
		className: atelier ? "sf-page sf-mobile-action-page atelier-cart" : "sf-page sf-mobile-action-page",
		children: [
			/* @__PURE__ */ _jsxDEV("div", {
				className: "sf-shell-wide py-8 sm:py-10",
				children: [
					/* @__PURE__ */ _jsxDEV("div", {
						className: "mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
						children: [/* @__PURE__ */ _jsxDEV("div", {
							className: "flex items-center",
							children: /* @__PURE__ */ _jsxDEV("div", { children: [
								/* @__PURE__ */ _jsxDEV("p", {
									className: "sf-kicker",
									children: "Cart"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 37,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ _jsxDEV("h1", {
									className: "sf-heading text-3xl",
									children: [
										"Your Cart (",
										cartItems.length,
										")"
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 38,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ _jsxDEV("p", {
									className: "mt-2 max-w-xl text-sm font-semibold text-slate-500",
									children: "Review quantities, delivery estimate, and checkout securely when you are ready."
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 39,
									columnNumber: 21
								}, this)
							] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 36,
								columnNumber: 17
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 35,
							columnNumber: 17
						}, this), /* @__PURE__ */ _jsxDEV("div", {
							className: "grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-3",
							children: [
								/* @__PURE__ */ _jsxDEV("span", {
									className: "inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm",
									children: [/* @__PURE__ */ _jsxDEV(ShieldCheck, {
										size: 14,
										className: "text-emerald-600"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 45,
										columnNumber: 112
									}, this), " Secure"]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 45,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ _jsxDEV("span", {
									className: "inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm",
									children: [/* @__PURE__ */ _jsxDEV(Truck, {
										size: 14,
										className: "text-[var(--sf-accent)]"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 46,
										columnNumber: 112
									}, this), " Delivery"]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 46,
									columnNumber: 21
								}, this),
								/* @__PURE__ */ _jsxDEV("span", {
									className: "inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm",
									children: [/* @__PURE__ */ _jsxDEV(Headphones, {
										size: 14,
										className: "text-sky-600"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 47,
										columnNumber: 112
									}, this), " Support"]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 47,
									columnNumber: 21
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 44,
							columnNumber: 17
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 34,
						columnNumber: 13
					}, this),
					/* @__PURE__ */ _jsxDEV("div", {
						"data-atelier-part": atelier ? "cart-layout" : undefined,
						className: "grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px]",
						children: [/* @__PURE__ */ _jsxDEV("div", {
							className: "space-y-4",
							children: cartItems.map((item) => /* @__PURE__ */ _jsxDEV("div", {
								"data-atelier-part": atelier ? "cart-item" : undefined,
								className: "rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg hover:shadow-indigo-100/60 sm:p-6",
								children: /* @__PURE__ */ _jsxDEV("div", {
									className: "flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between",
									children: [/* @__PURE__ */ _jsxDEV("div", {
										className: "flex w-full min-w-0 flex-1 items-start gap-4 sm:gap-5",
										children: [/* @__PURE__ */ _jsxDEV("div", {
											"data-atelier-part": atelier ? "cart-image" : undefined,
											className: "relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50 sm:h-28 sm:w-28",
											children: /* @__PURE__ */ _jsxDEV(SafeProductImage, {
												src: getCartImageUrl(item),
												alt: item.title,
												fill: true,
												sizes: "(max-width: 640px) 100vw, 112px",
												className: "object-cover",
												fallbackClassName: "flex h-full w-full items-center justify-center text-slate-300",
												iconClassName: "h-6 w-6"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 61,
												columnNumber: 41
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 60,
											columnNumber: 37
										}, this), /* @__PURE__ */ _jsxDEV("div", {
											className: "flex min-w-0 flex-1 flex-col",
											children: [
												/* @__PURE__ */ _jsxDEV("div", {
													className: "flex flex-wrap items-center gap-2 mb-1.5",
													children: [item.category && /* @__PURE__ */ _jsxDEV("span", {
														className: "text-[10px] font-black uppercase tracking-wider text-[var(--sf-accent)]",
														children: item.category
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 78,
														columnNumber: 49
													}, this), (item.sku || item.selectedVariant?.sku) && /* @__PURE__ */ _jsxDEV("span", {
														className: "rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500",
														children: ["SKU: ", item.selectedVariant?.sku || item.sku]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 83,
														columnNumber: 49
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 76,
													columnNumber: 41
												}, this),
												/* @__PURE__ */ _jsxDEV("h3", {
													className: "mb-1 line-clamp-1 text-lg font-black text-slate-950",
													title: item.title,
													children: item.title
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 89,
													columnNumber: 41
												}, this),
												(item.shortDescription || item.description) && /* @__PURE__ */ _jsxDEV("p", {
													className: "mb-2 line-clamp-2 text-xs leading-relaxed text-slate-500",
													children: item.shortDescription || item.description
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 95,
													columnNumber: 45
												}, this),
												item.selectedVariant && item.selectedVariant.attributes && /* @__PURE__ */ _jsxDEV("div", {
													className: "flex flex-wrap gap-2 mb-2",
													children: item.selectedVariant.attributes.map((attr, idx) => /* @__PURE__ */ _jsxDEV("span", {
														className: "rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700",
														children: [/* @__PURE__ */ _jsxDEV("span", {
															className: "mr-1 text-slate-400",
															children: [attr.name, ":"]
														}, void 0, true, {
															fileName: _jsxFileName,
															lineNumber: 105,
															columnNumber: 57
														}, this), attr.value]
													}, idx, true, {
														fileName: _jsxFileName,
														lineNumber: 104,
														columnNumber: 53
													}, this))
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 102,
													columnNumber: 45
												}, this),
												/* @__PURE__ */ _jsxDEV("div", {
													className: "mt-auto flex items-center gap-2",
													children: [/* @__PURE__ */ _jsxDEV("p", {
														className: "text-lg font-black text-slate-950",
														children: ["৳ ", item.cartPrice || item.finalPrice || item.sellingPrice]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 114,
														columnNumber: 45
													}, this), item.pricing?.discount > 0 && /* @__PURE__ */ _jsxDEV("p", {
														className: "text-sm text-slate-400 line-through",
														children: ["৳ ", item.pricing.sellingPrice]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 118,
														columnNumber: 49
													}, this)]
												}, void 0, true, {
													fileName: _jsxFileName,
													lineNumber: 113,
													columnNumber: 41
												}, this)
											]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 73,
											columnNumber: 37
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 58,
										columnNumber: 33
									}, this), /* @__PURE__ */ _jsxDEV("div", {
										"data-atelier-part": atelier ? "cart-controls" : undefined,
										className: "flex w-full items-center justify-between gap-4 border-t border-slate-100 pt-4 sm:w-auto sm:justify-end sm:border-t-0 sm:pt-0",
										children: [/* @__PURE__ */ _jsxDEV("div", {
											className: "flex flex-col items-center sm:items-end",
											children: [/* @__PURE__ */ _jsxDEV("div", {
												className: "flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm",
												children: [
													/* @__PURE__ */ _jsxDEV("button", {
														type: "button",
														onClick: () => updateQuantity(item.cartItemId || item._id, item.quantity - 1),
														disabled: item.quantity <= 1,
														"aria-label": `Decrease quantity for ${item.title}`,
														className: "p-2.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-950 disabled:opacity-30 disabled:hover:bg-transparent",
														children: /* @__PURE__ */ _jsxDEV(Minus, { size: 14 }, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 137,
															columnNumber: 49
														}, this)
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 130,
														columnNumber: 45
													}, this),
													/* @__PURE__ */ _jsxDEV("span", {
														className: "w-10 bg-white py-2 text-center text-sm font-black",
														children: item.quantity
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 139,
														columnNumber: 45
													}, this),
													/* @__PURE__ */ _jsxDEV("button", {
														type: "button",
														onClick: () => updateQuantity(item.cartItemId || item._id, item.quantity + 1),
														disabled: item.quantity >= (item.selectedVariant?.stock || item.stock || 99),
														"aria-label": `Increase quantity for ${item.title}`,
														className: "p-2.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-950 disabled:opacity-30 disabled:hover:bg-transparent",
														children: /* @__PURE__ */ _jsxDEV(Plus, { size: 14 }, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 149,
															columnNumber: 49
														}, this)
													}, void 0, false, {
														fileName: _jsxFileName,
														lineNumber: 142,
														columnNumber: 45
													}, this)
												]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 129,
												columnNumber: 41
											}, this), item.quantity >= (item.selectedVariant?.stock || item.stock) && /* @__PURE__ */ _jsxDEV("span", {
												className: "text-[10px] text-orange-600 mt-1 font-bold flex items-center",
												children: "Limit reached"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 154,
												columnNumber: 45
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 128,
											columnNumber: 37
										}, this), /* @__PURE__ */ _jsxDEV("button", {
											type: "button",
											onClick: () => removeFromCart(item.cartItemId || item._id),
											className: "rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500",
											title: "Remove item",
											"aria-label": `Remove ${item.title} from cart`,
											children: /* @__PURE__ */ _jsxDEV(Trash2, { size: 20 }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 167,
												columnNumber: 41
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 160,
											columnNumber: 37
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 127,
										columnNumber: 33
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 56,
									columnNumber: 29
								}, this)
							}, item.cartItemId || item._id, false, {
								fileName: _jsxFileName,
								lineNumber: 55,
								columnNumber: 25
							}, this))
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 53,
							columnNumber: 17
						}, this), /* @__PURE__ */ _jsxDEV("div", { children: /* @__PURE__ */ _jsxDEV("div", {
							"data-atelier-part": atelier ? "cart-summary" : undefined,
							className: "sticky top-28 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-lg shadow-slate-200/70",
							children: [
								/* @__PURE__ */ _jsxDEV("div", {
									className: "mb-6 flex items-start justify-between gap-4",
									children: [/* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("p", {
										className: "sf-kicker",
										children: "Summary"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 180,
										columnNumber: 33
									}, this), /* @__PURE__ */ _jsxDEV("h2", {
										className: "text-xl font-black text-slate-950",
										children: "Order Summary"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 181,
										columnNumber: 33
									}, this)] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 179,
										columnNumber: 29
									}, this), /* @__PURE__ */ _jsxDEV("span", {
										className: "rounded-full bg-[var(--sf-accent-bg)] px-3 py-1 text-xs font-black text-[var(--sf-accent)]",
										children: [
											cartItems.length,
											" item",
											cartItems.length === 1 ? "" : "s"
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 183,
										columnNumber: 29
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 178,
									columnNumber: 25
								}, this),
								/* @__PURE__ */ _jsxDEV("div", {
									className: "mb-6 space-y-3 text-sm",
									children: [
										/* @__PURE__ */ _jsxDEV("div", {
											className: "flex justify-between text-slate-600",
											children: [/* @__PURE__ */ _jsxDEV("span", { children: "Subtotal" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 190,
												columnNumber: 33
											}, this), /* @__PURE__ */ _jsxDEV("span", {
												className: "font-bold text-slate-950",
												children: ["৳ ", subtotal]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 191,
												columnNumber: 33
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 189,
											columnNumber: 29
										}, this),
										/* @__PURE__ */ _jsxDEV("div", {
											className: "flex justify-between text-slate-600",
											children: [/* @__PURE__ */ _jsxDEV("span", { children: "Estimated delivery" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 194,
												columnNumber: 33
											}, this), /* @__PURE__ */ _jsxDEV("span", {
												className: "font-bold text-slate-950",
												children: ["৳ ", shipping]
											}, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 195,
												columnNumber: 33
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 193,
											columnNumber: 29
										}, this),
										totalSavings > 0 && /* @__PURE__ */ _jsxDEV("div", {
											className: "flex justify-between rounded-2xl border border-emerald-200/60 bg-emerald-50 p-3 font-black text-emerald-700",
											children: [/* @__PURE__ */ _jsxDEV("span", { children: "Total Savings" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 200,
												columnNumber: 37
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: ["- ৳ ", totalSavings] }, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 201,
												columnNumber: 37
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 199,
											columnNumber: 33
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 188,
									columnNumber: 25
								}, this),
								/* @__PURE__ */ _jsxDEV("div", {
									className: "mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-3",
									children: [
										/* @__PURE__ */ _jsxDEV("label", {
											htmlFor: "cart-promo-code",
											className: "mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500",
											children: [/* @__PURE__ */ _jsxDEV(Tag, { size: 14 }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 208,
												columnNumber: 33
											}, this), "Promo code"]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 207,
											columnNumber: 29
										}, this),
										/* @__PURE__ */ _jsxDEV("div", {
											className: "flex gap-2",
											children: [/* @__PURE__ */ _jsxDEV("input", {
												id: "cart-promo-code",
												type: "text",
												value: promoCode,
												onChange: (event) => setPromoCode(event.target.value.toUpperCase()),
												placeholder: "SAVE10",
												"aria-describedby": promoFeedback ? "cart-promo-feedback" : undefined,
												className: "sf-field min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm uppercase"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 212,
												columnNumber: 33
											}, this), /* @__PURE__ */ _jsxDEV("button", {
												type: "button",
												onClick: handleApplyPromo,
												className: "rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800",
												children: "Apply"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 221,
												columnNumber: 33
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 211,
											columnNumber: 29
										}, this),
										promoFeedback && /* @__PURE__ */ _jsxDEV("p", {
											id: "cart-promo-feedback",
											className: `mt-2 text-xs font-bold ${promoFeedback.type === "error" ? "text-red-600" : "text-emerald-700"}`,
											children: promoFeedback.text
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 226,
											columnNumber: 33
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 206,
									columnNumber: 25
								}, this),
								/* @__PURE__ */ _jsxDEV("div", {
									className: "mb-6 flex items-center justify-between border-t border-slate-200 pt-5",
									children: [/* @__PURE__ */ _jsxDEV("span", {
										className: "text-lg font-black text-slate-950",
										children: "Total"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 233,
										columnNumber: 29
									}, this), /* @__PURE__ */ _jsxDEV("span", {
										className: "text-3xl font-black text-slate-950",
										children: ["৳ ", total]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 234,
										columnNumber: 29
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 232,
									columnNumber: 25
								}, this),
								/* @__PURE__ */ _jsxDEV(Link, {
									href: "/checkout",
									className: "sf-btn sf-btn-primary w-full",
									children: "Proceed to Checkout"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 237,
									columnNumber: 25
								}, this),
								/* @__PURE__ */ _jsxDEV(Link, {
									href: "/",
									className: "mt-4 flex justify-center text-sm font-black text-slate-500 transition hover:text-[var(--sf-accent)]",
									children: "Continue Shopping"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 241,
									columnNumber: 25
								}, this),
								/* @__PURE__ */ _jsxDEV("div", {
									className: "mt-6 space-y-3 border-t border-slate-200 pt-5",
									children: [
										/* @__PURE__ */ _jsxDEV("div", {
											className: "flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-600",
											children: [/* @__PURE__ */ _jsxDEV(ShieldCheck, {
												size: 18,
												className: "flex-shrink-0 text-emerald-600"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 247,
												columnNumber: 33
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Secure checkout and order confirmation" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 248,
												columnNumber: 33
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 246,
											columnNumber: 29
										}, this),
										/* @__PURE__ */ _jsxDEV("div", {
											className: "flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-600",
											children: [/* @__PURE__ */ _jsxDEV(Truck, {
												size: 18,
												className: "flex-shrink-0 text-[var(--sf-accent)]"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 251,
												columnNumber: 33
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Fast & secure delivery" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 252,
												columnNumber: 33
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 250,
											columnNumber: 29
										}, this),
										/* @__PURE__ */ _jsxDEV("div", {
											className: "flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800",
											children: [/* @__PURE__ */ _jsxDEV(CheckCircle, {
												size: 18,
												className: "flex-shrink-0 text-emerald-600"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 255,
												columnNumber: 33
											}, this), /* @__PURE__ */ _jsxDEV("span", { children: "Cash on delivery available at checkout" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 256,
												columnNumber: 33
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 254,
											columnNumber: 29
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 245,
									columnNumber: 25
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 177,
							columnNumber: 21
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 176,
							columnNumber: 17
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 51,
						columnNumber: 13
					}, this),
					(recommendationsLoading || recommendations.length > 0) && /* @__PURE__ */ _jsxDEV("section", {
						"data-atelier-part": atelier ? "cart-recommendations" : undefined,
						className: "mt-8 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:mt-10 sm:rounded-[2rem] sm:p-7",
						children: [/* @__PURE__ */ _jsxDEV("div", {
							className: "mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between",
							children: [/* @__PURE__ */ _jsxDEV("div", { children: [
								/* @__PURE__ */ _jsxDEV("p", {
									className: "sf-kicker",
									children: "Recommended"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 267,
									columnNumber: 29
								}, this),
								/* @__PURE__ */ _jsxDEV("h2", {
									className: "mt-1 text-2xl font-black tracking-tight text-slate-950",
									children: "You may also like"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 268,
									columnNumber: 29
								}, this),
								/* @__PURE__ */ _jsxDEV("p", {
									className: "mt-1 text-sm font-semibold text-slate-500",
									children: "Similar products from this store, excluding what is already in your cart."
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 269,
									columnNumber: 29
								}, this)
							] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 266,
								columnNumber: 25
							}, this), /* @__PURE__ */ _jsxDEV(Link, {
								href: "/#products",
								className: "text-sm font-black text-[var(--sf-accent)]",
								children: "Browse all"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 273,
								columnNumber: 25
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 265,
							columnNumber: 21
						}, this), recommendationsLoading ? /* @__PURE__ */ _jsxDEV("div", {
							className: "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4",
							children: Array.from({ length: 4 }).map((_, index) => /* @__PURE__ */ _jsxDEV("div", { className: "h-72 animate-pulse rounded-[1.5rem] bg-slate-100" }, index, false, {
								fileName: _jsxFileName,
								lineNumber: 281,
								columnNumber: 33
							}, this))
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 279,
							columnNumber: 25
						}, this) : /* @__PURE__ */ _jsxDEV("div", {
							className: `grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 ${recommendations.length === 1 ? "mx-auto w-full max-w-[20rem] sm:mx-0 sm:max-w-none" : ""}`,
							children: recommendations.map((product, index) => /* @__PURE__ */ _jsxDEV(ProductCard, {
								presentationVariant,
								product,
								index,
								storewideDiscount: 0,
								productCard: themedProductCard,
								onProductAdd: (item) => productActions.addProductToCart(item, { location: "cart_recommendations" }),
								onProductBuyNow: (item) => productActions.buyNow(item, { location: "cart_recommendations" }),
								onWishlistToggle: productActions.toggleWishlist,
								isWishlisted: productActions.isWishlisted,
								LinkComponent: Link
							}, product._id, false, {
								fileName: _jsxFileName,
								lineNumber: 287,
								columnNumber: 33
							}, this))
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 285,
							columnNumber: 25
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 264,
						columnNumber: 17
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 33,
				columnNumber: 9
			}, this),
			productActions.variantPicker,
			/* @__PURE__ */ _jsxDEV("div", {
				className: "sf-mobile-action-bar fixed inset-x-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden",
				children: /* @__PURE__ */ _jsxDEV("div", {
					className: "mx-auto flex max-w-xl items-center gap-3",
					children: [/* @__PURE__ */ _jsxDEV("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ _jsxDEV("p", {
							className: "text-xs font-bold uppercase tracking-[0.14em] text-slate-500",
							children: [
								cartItems.length,
								" item",
								cartItems.length === 1 ? "" : "s",
								" total"
							]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 311,
							columnNumber: 21
						}, this), /* @__PURE__ */ _jsxDEV("p", {
							className: "text-xl font-black text-slate-950",
							children: ["৳ ", total]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 312,
							columnNumber: 21
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 310,
						columnNumber: 17
					}, this), /* @__PURE__ */ _jsxDEV(Link, {
						href: "/checkout",
						className: "sf-btn sf-btn-primary min-h-0 rounded-full px-6 py-3 text-sm",
						children: "Checkout"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 314,
						columnNumber: 17
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 309,
					columnNumber: 13
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 308,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 32,
		columnNumber: 9
	}, this);
}

//# sourceMappingURL=data:application/json;base64,eyJtYXBwaW5ncyI6IkFBQUE7QUFDQSxTQUFTLGFBQWEsWUFBWSxPQUFPLE1BQU0sYUFBYSxhQUFhLEtBQUssUUFBUSxhQUFhO0FBQ25HLFNBQVMsWUFBWTtBQUNyQixPQUFPLHNCQUFzQjtBQUM3QixTQUFTLG1CQUFtQjs7O0FBQzVCLE9BQU8sU0FBUyxTQUFTLEVBQUUsV0FBVyxnQkFBZ0IsZ0JBQWdCLFVBQVUsVUFBVSxjQUN0RixPQUFPLGlCQUFpQixXQUFXLGNBQWMsZUFBZSxrQkFDaEUsd0JBQXdCLGlCQUFpQixtQkFBbUIsZ0JBQWdCLHVCQUF1QjtDQUNuRyxNQUFNLFVBQVUsd0JBQXdCOztDQUV4QyxJQUFJLFVBQVUsV0FBVyxHQUFHO0VBQ3hCLE9BQ0ksd0JBQUMsT0FBRDtHQUFLLFdBQVcsVUFBVSx1R0FBdUc7YUFBakk7SUFDSSx3QkFBQyxPQUFEO0tBQUssV0FBVTtlQUNYLHdCQUFDLGFBQUQ7TUFBYSxNQUFNO01BQUksV0FBVTtLQUFrQjs7Ozs7SUFDbEQ7Ozs7O0lBQ0wsd0JBQUMsTUFBRDtLQUFJLFdBQVU7ZUFBMEM7SUFBc0I7Ozs7O0lBQzlFLHdCQUFDLEtBQUQ7S0FBRyxXQUFVO2VBQWlEO0lBRTNEOzs7OztJQUNILHdCQUFDLE1BQUQ7S0FDSSxNQUFLO0tBQ0wsV0FBVTtlQUNiO0lBRUs7Ozs7O0dBQ0w7Ozs7OztDQUViO0NBRUEsT0FDSSx3QkFBQyxPQUFEO0VBQUssV0FBVyxVQUFVLCtDQUErQztZQUF6RTtHQUNBLHdCQUFDLE9BQUQ7SUFBSyxXQUFVO2NBQWY7S0FDSSx3QkFBQyxPQUFEO01BQUssV0FBVTtnQkFBZixDQUNJLHdCQUFDLE9BQUQ7T0FBSyxXQUFVO2lCQUNmLHdCQUFDLE9BQUQ7UUFDSSx3QkFBQyxLQUFEO1NBQUcsV0FBVTttQkFBWTtRQUFPOzs7OztRQUNoQyx3QkFBQyxNQUFEO1NBQUksV0FBVTttQkFBZDtVQUFvQztVQUFZLFVBQVU7VUFBTztTQUFLOzs7Ozs7UUFDdEUsd0JBQUMsS0FBRDtTQUFHLFdBQVU7bUJBQXFEO1FBRS9EOzs7OztPQUNGOzs7OztNQUNBOzs7O2dCQUNMLHdCQUFDLE9BQUQ7T0FBSyxXQUFVO2lCQUFmO1FBQ0ksd0JBQUMsUUFBRDtTQUFNLFdBQVU7bUJBQWhCLENBQTJGLHdCQUFDLGFBQUQ7VUFBYSxNQUFNO1VBQUksV0FBVTtTQUFvQjs7OzttQkFBQyxTQUFhOzs7Ozs7UUFDOUosd0JBQUMsUUFBRDtTQUFNLFdBQVU7bUJBQWhCLENBQTJGLHdCQUFDLE9BQUQ7VUFBTyxNQUFNO1VBQUksV0FBVTtTQUEyQjs7OzttQkFBQyxXQUFlOzs7Ozs7UUFDakssd0JBQUMsUUFBRDtTQUFNLFdBQVU7bUJBQWhCLENBQTJGLHdCQUFDLFlBQUQ7VUFBWSxNQUFNO1VBQUksV0FBVTtTQUFnQjs7OzttQkFBQyxVQUFjOzs7Ozs7T0FDeko7Ozs7O2NBQ0o7Ozs7OztLQUVMLHdCQUFDLE9BQUQ7TUFBSyxxQkFBbUIsVUFBVSxnQkFBZ0I7TUFBVyxXQUFVO2dCQUF2RSxDQUVJLHdCQUFDLE9BQUQ7T0FBSyxXQUFVO2lCQUNWLFVBQVUsS0FBSyxTQUNaLHdCQUFDLE9BQUQ7UUFBSyxxQkFBbUIsVUFBVSxjQUFjO1FBQTZDLFdBQVU7a0JBQ25HLHdCQUFDLE9BQUQ7U0FBSyxXQUFVO21CQUFmLENBRUksd0JBQUMsT0FBRDtVQUFLLFdBQVU7b0JBQWYsQ0FFSSx3QkFBQyxPQUFEO1dBQUsscUJBQW1CLFVBQVUsZUFBZTtXQUFXLFdBQVU7cUJBQ2xFLHdCQUFDLGtCQUFEO1lBQ0ksS0FBSyxnQkFBZ0IsSUFBSTtZQUN6QixLQUFLLEtBQUs7WUFDVjtZQUNBLE9BQU07WUFDTixXQUFVO1lBQ1YsbUJBQWtCO1lBQ2xCLGVBQWM7V0FDakI7Ozs7O1VBQ0E7Ozs7b0JBR0wsd0JBQUMsT0FBRDtXQUFLLFdBQVU7cUJBQWY7WUFHSSx3QkFBQyxPQUFEO2FBQUssV0FBVTt1QkFBZixDQUNLLEtBQUssWUFDRix3QkFBQyxRQUFEO2NBQU0sV0FBVTt3QkFDWCxLQUFLO2FBQ0o7Ozs7d0JBRVIsS0FBSyxPQUFPLEtBQUssaUJBQWlCLFFBQ2hDLHdCQUFDLFFBQUQ7Y0FBTSxXQUFVO3dCQUFoQixDQUEwRixTQUNoRixLQUFLLGlCQUFpQixPQUFPLEtBQUssR0FDdEM7Ozs7O3FCQUVUOzs7Ozs7WUFFTCx3QkFBQyxNQUFEO2FBQUksV0FBVTthQUFzRCxPQUFPLEtBQUs7dUJBQzNFLEtBQUs7WUFDTjs7Ozs7YUFHRixLQUFLLG9CQUFvQixLQUFLLGdCQUM1Qix3QkFBQyxLQUFEO2FBQUcsV0FBVTt1QkFDUixLQUFLLG9CQUFvQixLQUFLO1lBQ2hDOzs7OztZQUlOLEtBQUssbUJBQW1CLEtBQUssZ0JBQWdCLGNBQzFDLHdCQUFDLE9BQUQ7YUFBSyxXQUFVO3VCQUNWLEtBQUssZ0JBQWdCLFdBQVcsS0FBSyxNQUFNLFFBQ3hDLHdCQUFDLFFBQUQ7Y0FBZ0IsV0FBVTt3QkFBMUIsQ0FDSSx3QkFBQyxRQUFEO2VBQU0sV0FBVTt5QkFBaEIsQ0FBdUMsS0FBSyxNQUFLLEdBQU87Ozs7O3dCQUN2RCxLQUFLLEtBQ0o7Z0JBSEs7Ozs7b0JBR0wsQ0FDVDtZQUNBOzs7OztZQUlULHdCQUFDLE9BQUQ7YUFBSyxXQUFVO3VCQUFmLENBQ0ksd0JBQUMsS0FBRDtjQUFHLFdBQVU7d0JBQWIsQ0FBaUQsTUFDMUMsS0FBSyxhQUFhLEtBQUssY0FBYyxLQUFLLFlBQzlDOzs7Ozt1QkFDRixLQUFLLFNBQVMsV0FBVyxLQUN0Qix3QkFBQyxLQUFEO2NBQUcsV0FBVTt3QkFBYixDQUFtRCxNQUM1QyxLQUFLLFFBQVEsWUFDakI7Ozs7O3FCQUVOOzs7Ozs7V0FDSjs7Ozs7a0JBQ0o7Ozs7O21CQUdMLHdCQUFDLE9BQUQ7VUFBSyxxQkFBbUIsVUFBVSxrQkFBa0I7VUFBVyxXQUFVO29CQUF6RSxDQUNJLHdCQUFDLE9BQUQ7V0FBSyxXQUFVO3FCQUFmLENBQ0ksd0JBQUMsT0FBRDtZQUFLLFdBQVU7c0JBQWY7YUFDSSx3QkFBQyxVQUFEO2NBQ0ksTUFBSztjQUNMLGVBQWUsZUFBZSxLQUFLLGNBQWMsS0FBSyxLQUFLLEtBQUssV0FBVyxDQUFDO2NBQzVFLFVBQVUsS0FBSyxZQUFZO2NBQzNCLGNBQVkseUJBQXlCLEtBQUs7Y0FDMUMsV0FBVTt3QkFFVix3QkFBQyxPQUFELEVBQU8sTUFBTSxHQUFLOzs7OzthQUNkOzs7OzthQUNSLHdCQUFDLFFBQUQ7Y0FBTSxXQUFVO3dCQUNYLEtBQUs7YUFDSjs7Ozs7YUFDTix3QkFBQyxVQUFEO2NBQ0ksTUFBSztjQUNMLGVBQWUsZUFBZSxLQUFLLGNBQWMsS0FBSyxLQUFLLEtBQUssV0FBVyxDQUFDO2NBQzVFLFVBQVUsS0FBSyxhQUFhLEtBQUssaUJBQWlCLFNBQVMsS0FBSyxTQUFTO2NBQ3pFLGNBQVkseUJBQXlCLEtBQUs7Y0FDMUMsV0FBVTt3QkFFVix3QkFBQyxNQUFELEVBQU0sTUFBTSxHQUFLOzs7OzthQUNiOzs7OztZQUNQOzs7OztxQkFFSixLQUFLLGFBQWEsS0FBSyxpQkFBaUIsU0FBUyxLQUFLLFVBQ25ELHdCQUFDLFFBQUQ7WUFBTSxXQUFVO3NCQUErRDtXQUV6RTs7OzttQkFFVDs7Ozs7b0JBRUwsd0JBQUMsVUFBRDtXQUNJLE1BQUs7V0FDTCxlQUFlLGVBQWUsS0FBSyxjQUFjLEtBQUssR0FBRztXQUN6RCxXQUFVO1dBQ1YsT0FBTTtXQUNOLGNBQVksVUFBVSxLQUFLLE1BQU07cUJBRWpDLHdCQUFDLFFBQUQsRUFBUSxNQUFNLEdBQUs7Ozs7O1VBQ2Y7Ozs7a0JBQ1A7Ozs7O2lCQUNKOzs7Ozs7T0FDSixHQXBIMkQsS0FBSyxjQUFjLEtBQUs7Ozs7Y0FvSG5GLENBQ1I7TUFDQTs7OztnQkFHTCx3QkFBQyxPQUFELFlBQ0ksd0JBQUMsT0FBRDtPQUFLLHFCQUFtQixVQUFVLGlCQUFpQjtPQUFXLFdBQVU7aUJBQXhFO1FBQ0ksd0JBQUMsT0FBRDtTQUFLLFdBQVU7bUJBQWYsQ0FDSSx3QkFBQyxPQUFELGFBQ0ksd0JBQUMsS0FBRDtVQUFHLFdBQVU7b0JBQVk7U0FBVTs7OzttQkFDbkMsd0JBQUMsTUFBRDtVQUFJLFdBQVU7b0JBQW9DO1NBQWlCOzs7O2lCQUNsRTs7OzttQkFDTCx3QkFBQyxRQUFEO1VBQU0sV0FBVTtvQkFBaEI7V0FDSyxVQUFVO1dBQU87V0FBTSxVQUFVLFdBQVcsSUFBSSxLQUFLO1VBQ3BEOzs7OztpQkFDTDs7Ozs7O1FBRUwsd0JBQUMsT0FBRDtTQUFLLFdBQVU7bUJBQWY7VUFDSSx3QkFBQyxPQUFEO1dBQUssV0FBVTtxQkFBZixDQUNJLHdCQUFDLFFBQUQsWUFBTSxXQUFjOzs7O3FCQUNwQix3QkFBQyxRQUFEO1lBQU0sV0FBVTtzQkFBaEIsQ0FBMkMsTUFBRyxRQUFlOzs7OzttQkFDNUQ7Ozs7OztVQUNMLHdCQUFDLE9BQUQ7V0FBSyxXQUFVO3FCQUFmLENBQ0ksd0JBQUMsUUFBRCxZQUFNLHFCQUF3Qjs7OztxQkFDOUIsd0JBQUMsUUFBRDtZQUFNLFdBQVU7c0JBQWhCLENBQTJDLE1BQUcsUUFBZTs7Ozs7bUJBQzVEOzs7Ozs7VUFFSixlQUFlLEtBQ1osd0JBQUMsT0FBRDtXQUFLLFdBQVU7cUJBQWYsQ0FDSSx3QkFBQyxRQUFELFlBQU0sZ0JBQW1COzs7O3FCQUN6Qix3QkFBQyxRQUFELGFBQU0sUUFBSyxZQUFtQjs7OzttQkFDN0I7Ozs7OztTQUVSOzs7Ozs7UUFFTCx3QkFBQyxPQUFEO1NBQUssV0FBVTttQkFBZjtVQUNJLHdCQUFDLFNBQUQ7V0FBTyxTQUFRO1dBQWtCLFdBQVU7cUJBQTNDLENBQ0ksd0JBQUMsS0FBRCxFQUFLLE1BQU0sR0FBSzs7OztxQkFBQyxZQUVkOzs7Ozs7VUFDUCx3QkFBQyxPQUFEO1dBQUssV0FBVTtxQkFBZixDQUNJLHdCQUFDLFNBQUQ7WUFDSSxJQUFHO1lBQ0gsTUFBSztZQUNMLE9BQU87WUFDUCxXQUFXLFVBQVUsYUFBYSxNQUFNLE9BQU8sTUFBTSxZQUFZLENBQUM7WUFDbEUsYUFBWTtZQUNaLG9CQUFrQixnQkFBZ0Isd0JBQXdCO1lBQzFELFdBQVU7V0FDYjs7OztxQkFDRCx3QkFBQyxVQUFEO1lBQVEsTUFBSztZQUFTLFNBQVM7WUFBa0IsV0FBVTtzQkFBa0g7V0FFcks7Ozs7bUJBQ1A7Ozs7OztVQUNKLGlCQUNHLHdCQUFDLEtBQUQ7V0FBRyxJQUFHO1dBQXNCLFdBQVcsMEJBQTBCLGNBQWMsU0FBUyxVQUFVLGlCQUFpQjtxQkFDOUcsY0FBYztVQUNoQjs7Ozs7U0FFTjs7Ozs7O1FBRUwsd0JBQUMsT0FBRDtTQUFLLFdBQVU7bUJBQWYsQ0FDSSx3QkFBQyxRQUFEO1VBQU0sV0FBVTtvQkFBb0M7U0FBVzs7OzttQkFDL0Qsd0JBQUMsUUFBRDtVQUFNLFdBQVU7b0JBQWhCLENBQXFELE1BQUcsS0FBWTs7Ozs7aUJBQ25FOzs7Ozs7UUFFTCx3QkFBQyxNQUFEO1NBQU0sTUFBSztTQUFZLFdBQVU7bUJBQStCO1FBRTFEOzs7OztRQUVOLHdCQUFDLE1BQUQ7U0FBTSxNQUFLO1NBQUksV0FBVTttQkFBc0c7UUFFekg7Ozs7O1FBRU4sd0JBQUMsT0FBRDtTQUFLLFdBQVU7bUJBQWY7VUFDSSx3QkFBQyxPQUFEO1dBQUssV0FBVTtxQkFBZixDQUNJLHdCQUFDLGFBQUQ7WUFBYSxNQUFNO1lBQUksV0FBVTtXQUFrQzs7OztxQkFDbkUsd0JBQUMsUUFBRCxZQUFNLHlDQUE0Qzs7OzttQkFDakQ7Ozs7OztVQUNMLHdCQUFDLE9BQUQ7V0FBSyxXQUFVO3FCQUFmLENBQ0ksd0JBQUMsT0FBRDtZQUFPLE1BQU07WUFBSSxXQUFVO1dBQXlDOzs7O3FCQUNwRSx3QkFBQyxRQUFELFlBQU0seUJBQTRCOzs7O21CQUNqQzs7Ozs7O1VBQ0wsd0JBQUMsT0FBRDtXQUFLLFdBQVU7cUJBQWYsQ0FDSSx3QkFBQyxhQUFEO1lBQWEsTUFBTTtZQUFJLFdBQVU7V0FBa0M7Ozs7cUJBQ25FLHdCQUFDLFFBQUQsWUFBTSx5Q0FBNEM7Ozs7bUJBQ2pEOzs7Ozs7U0FDSjs7Ozs7O09BQ0o7Ozs7O2VBQ0o7Ozs7Y0FDSjs7Ozs7O01BRUgsMEJBQTBCLGdCQUFnQixTQUFTLE1BQ2pELHdCQUFDLFdBQUQ7TUFBUyxxQkFBbUIsVUFBVSx5QkFBeUI7TUFBVyxXQUFVO2dCQUFwRixDQUNJLHdCQUFDLE9BQUQ7T0FBSyxXQUFVO2lCQUFmLENBQ0ksd0JBQUMsT0FBRDtRQUNJLHdCQUFDLEtBQUQ7U0FBRyxXQUFVO21CQUFZO1FBQWM7Ozs7O1FBQ3ZDLHdCQUFDLE1BQUQ7U0FBSSxXQUFVO21CQUF5RDtRQUFxQjs7Ozs7UUFDNUYsd0JBQUMsS0FBRDtTQUFHLFdBQVU7bUJBQTRDO1FBRXREOzs7OztPQUNGOzs7O2lCQUNMLHdCQUFDLE1BQUQ7UUFBTSxNQUFLO1FBQWEsV0FBVTtrQkFBNkM7T0FFekU7Ozs7ZUFDTDs7Ozs7Z0JBRUoseUJBQ0csd0JBQUMsT0FBRDtPQUFLLFdBQVU7aUJBQ1YsTUFBTSxLQUFLLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxLQUFLLEdBQUcsVUFDL0Isd0JBQUMsT0FBRCxFQUFpQixXQUFVLG1EQUFvRCxHQUFyRTs7OztjQUFxRSxDQUNsRjtNQUNBOzs7O2lCQUVMLHdCQUFDLE9BQUQ7T0FBSyxXQUFXLHVFQUF1RSxnQkFBZ0IsV0FBVyxJQUFJLHVEQUF1RDtpQkFDeEssZ0JBQWdCLEtBQUssU0FBUyxVQUMzQix3QkFBQyxhQUFEO1FBRXlCO1FBQ1o7UUFDRjtRQUNQLG1CQUFtQjtRQUNuQixhQUFhO1FBQ2IsZUFBZSxTQUFTLGVBQWUsaUJBQWlCLE1BQU0sRUFBRSxVQUFVLHVCQUF1QixDQUFDO1FBQ2xHLGtCQUFrQixTQUFTLGVBQWUsT0FBTyxNQUFNLEVBQUUsVUFBVSx1QkFBdUIsQ0FBQztRQUMzRixrQkFBa0IsZUFBZTtRQUNqQyxjQUFjLGVBQWU7UUFDN0IsZUFBZTtPQUNsQixHQVhRLFFBQVE7Ozs7Y0FXaEIsQ0FDSjtNQUNBOzs7O2NBRUo7Ozs7OztJQUVaOzs7Ozs7R0FDSixlQUFlO0dBRWhCLHdCQUFDLE9BQUQ7SUFBSyxXQUFVO2NBQ1gsd0JBQUMsT0FBRDtLQUFLLFdBQVU7ZUFBZixDQUNJLHdCQUFDLE9BQUQ7TUFBSyxXQUFVO2dCQUFmLENBQ0ksd0JBQUMsS0FBRDtPQUFHLFdBQVU7aUJBQWI7UUFBNkUsVUFBVTtRQUFPO1FBQU0sVUFBVSxXQUFXLElBQUksS0FBSztRQUFJO09BQVM7Ozs7O2dCQUMvSSx3QkFBQyxLQUFEO09BQUcsV0FBVTtpQkFBYixDQUFpRCxNQUFHLEtBQVM7Ozs7O2NBQzVEOzs7OztlQUNMLHdCQUFDLE1BQUQ7TUFBTSxNQUFLO01BQVksV0FBVTtnQkFBK0Q7S0FFMUY7Ozs7YUFDTDs7Ozs7O0dBQ0o7Ozs7O0VBQ0E7Ozs7OztBQUViIiwibmFtZXMiOltdLCJzb3VyY2VzIjpbIkNhcnRWaWV3LmpzeCJdLCJ2ZXJzaW9uIjozLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBjbGllbnRcIjtcclxuaW1wb3J0IHsgQ2hlY2tDaXJjbGUsIEhlYWRwaG9uZXMsIE1pbnVzLCBQbHVzLCBTaGllbGRDaGVjaywgU2hvcHBpbmdCYWcsIFRhZywgVHJhc2gyLCBUcnVjayB9IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XHJcbmltcG9ydCB7IExpbmsgfSBmcm9tICcuL1J1bnRpbWUuanN4JztcclxuaW1wb3J0IFNhZmVQcm9kdWN0SW1hZ2UgZnJvbSAnLi9TYWZlUHJvZHVjdEltYWdlLmpzeCc7XHJcbmltcG9ydCB7IFByb2R1Y3RDYXJkIH0gZnJvbSAnLi4vcmVmZXJlbmNlL1N0b3JlZnJvbnRQcm9kdWN0Q2FyZC5qc3gnO1xyXG5leHBvcnQgZnVuY3Rpb24gQ2FydFZpZXcoeyBjYXJ0SXRlbXMsIHJlbW92ZUZyb21DYXJ0LCB1cGRhdGVRdWFudGl0eSwgc3VidG90YWwsIHNoaXBwaW5nLCB0b3RhbFNhdmluZ3MsXHJcbiAgICB0b3RhbCwgZ2V0Q2FydEltYWdlVXJsLCBwcm9tb0NvZGUsIHNldFByb21vQ29kZSwgcHJvbW9GZWVkYmFjaywgaGFuZGxlQXBwbHlQcm9tbyxcclxuICAgIHJlY29tbWVuZGF0aW9uc0xvYWRpbmcsIHJlY29tbWVuZGF0aW9ucywgdGhlbWVkUHJvZHVjdENhcmQsIHByb2R1Y3RBY3Rpb25zLCBwcmVzZW50YXRpb25WYXJpYW50IH0pIHtcclxuICAgIGNvbnN0IGF0ZWxpZXIgPSBwcmVzZW50YXRpb25WYXJpYW50ID09PSAnYXRlbGllci1lZGl0b3JpYWwnO1xyXG4gICAgLy8gRU1QVFkgU1RBVEVcclxuICAgIGlmIChjYXJ0SXRlbXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2F0ZWxpZXIgPyBcInNmLXBhZ2UgYXRlbGllci1jYXJ0IGZsZXggbWluLWgtWzcwdmhdIGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBweC00IHB5LTE2IHRleHQtY2VudGVyXCIgOiBcInNmLXBhZ2UgZmxleCBtaW4taC1bNzB2aF0gZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHB4LTQgcHktMTYgdGV4dC1jZW50ZXJcIn0+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTYgcm91bmRlZC1bMnJlbV0gYmctd2hpdGUgcC02IHNoYWRvdy1zbVwiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxTaG9wcGluZ0JhZyBzaXplPXs1Nn0gY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS0zMDBcIiAvPlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwibWItMiB0ZXh0LTN4bCBmb250LWJsYWNrIHRleHQtc2xhdGUtOTUwXCI+WW91ciBjYXJ0IGlzIGVtcHR5PC9oMj5cclxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm1iLTggbWF4LXctbWQgdGV4dC1zbSBsZWFkaW5nLTYgdGV4dC1zbGF0ZS01MDBcIj5cclxuICAgICAgICAgICAgICAgICAgICBBZGQgcHJvZHVjdHMgdG8gY29tcGFyZSBvcHRpb25zLCByZXZpZXcgdG90YWxzLCBhbmQgY29tcGxldGUgY2hlY2tvdXQgc2VjdXJlbHkuXHJcbiAgICAgICAgICAgICAgICA8L3A+XHJcbiAgICAgICAgICAgICAgICA8TGlua1xyXG4gICAgICAgICAgICAgICAgICAgIGhyZWY9XCIvXCJcclxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJzZi1idG4gc2YtYnRuLXByaW1hcnkgcHgtOFwiXHJcbiAgICAgICAgICAgICAgICA+XHJcbiAgICAgICAgICAgICAgICAgICAgQ29udGludWUgU2hvcHBpbmdcclxuICAgICAgICAgICAgICAgIDwvTGluaz5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gKFxyXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPXthdGVsaWVyID8gXCJzZi1wYWdlIHNmLW1vYmlsZS1hY3Rpb24tcGFnZSBhdGVsaWVyLWNhcnRcIiA6IFwic2YtcGFnZSBzZi1tb2JpbGUtYWN0aW9uLXBhZ2VcIn0+XHJcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzZi1zaGVsbC13aWRlIHB5LTggc206cHktMTBcIj5cclxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYi04IGZsZXggZmxleC1jb2wgZ2FwLTUgc206ZmxleC1yb3cgc206aXRlbXMtZW5kIHNtOmp1c3RpZnktYmV0d2VlblwiPlxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlclwiPlxyXG4gICAgICAgICAgICAgICAgPGRpdj5cclxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJzZi1raWNrZXJcIj5DYXJ0PC9wPlxyXG4gICAgICAgICAgICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJzZi1oZWFkaW5nIHRleHQtM3hsXCI+WW91ciBDYXJ0ICh7Y2FydEl0ZW1zLmxlbmd0aH0pPC9oMT5cclxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0yIG1heC13LXhsIHRleHQtc20gZm9udC1zZW1pYm9sZCB0ZXh0LXNsYXRlLTUwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBSZXZpZXcgcXVhbnRpdGllcywgZGVsaXZlcnkgZXN0aW1hdGUsIGFuZCBjaGVja291dCBzZWN1cmVseSB3aGVuIHlvdSBhcmUgcmVhZHkuXHJcbiAgICAgICAgICAgICAgICAgICAgPC9wPlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBnYXAtMiB0ZXh0LXhzIGZvbnQtYm9sZCB0ZXh0LXNsYXRlLTYwMCBzbTpncmlkLWNvbHMtM1wiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImlubGluZS1mbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiByb3VuZGVkLWZ1bGwgYmctd2hpdGUgcHgtMyBweS0yIHNoYWRvdy1zbVwiPjxTaGllbGRDaGVjayBzaXplPXsxNH0gY2xhc3NOYW1lPVwidGV4dC1lbWVyYWxkLTYwMFwiIC8+IFNlY3VyZTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgcm91bmRlZC1mdWxsIGJnLXdoaXRlIHB4LTMgcHktMiBzaGFkb3ctc21cIj48VHJ1Y2sgc2l6ZT17MTR9IGNsYXNzTmFtZT1cInRleHQtW3ZhcigtLXNmLWFjY2VudCldXCIgLz4gRGVsaXZlcnk8L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHJvdW5kZWQtZnVsbCBiZy13aGl0ZSBweC0zIHB5LTIgc2hhZG93LXNtXCI+PEhlYWRwaG9uZXMgc2l6ZT17MTR9IGNsYXNzTmFtZT1cInRleHQtc2t5LTYwMFwiIC8+IFN1cHBvcnQ8L3NwYW4+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICA8ZGl2IGRhdGEtYXRlbGllci1wYXJ0PXthdGVsaWVyID8gXCJjYXJ0LWxheW91dFwiIDogdW5kZWZpbmVkfSBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0xIGdhcC04IGxnOmdyaWQtY29scy1bbWlubWF4KDAsMWZyKV80MDBweF1cIj5cclxuICAgICAgICAgICAgICAgIHsvKiBMZWZ0IFNpZGU6IEl0ZW1zICovfVxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTRcIj5cclxuICAgICAgICAgICAgICAgICAgICB7Y2FydEl0ZW1zLm1hcCgoaXRlbSkgPT4gKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGRhdGEtYXRlbGllci1wYXJ0PXthdGVsaWVyID8gXCJjYXJ0LWl0ZW1cIiA6IHVuZGVmaW5lZH0ga2V5PXtpdGVtLmNhcnRJdGVtSWQgfHwgaXRlbS5faWR9IGNsYXNzTmFtZT1cInJvdW5kZWQtWzJyZW1dIGJvcmRlciBib3JkZXItc2xhdGUtMjAwIGJnLXdoaXRlIHAtNSBzaGFkb3ctc20gdHJhbnNpdGlvbi1zaGFkb3cgaG92ZXI6c2hhZG93LWxnIGhvdmVyOnNoYWRvdy1pbmRpZ28tMTAwLzYwIHNtOnAtNlwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC01IHNtOmZsZXgtcm93IHNtOml0ZW1zLWNlbnRlciBzbTpqdXN0aWZ5LWJldHdlZW5cIj5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IHctZnVsbCBtaW4tdy0wIGZsZXgtMSBpdGVtcy1zdGFydCBnYXAtNCBzbTpnYXAtNVwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7LyogUHJvZHVjdCBJbWFnZSAqL31cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBkYXRhLWF0ZWxpZXItcGFydD17YXRlbGllciA/IFwiY2FydC1pbWFnZVwiIDogdW5kZWZpbmVkfSBjbGFzc05hbWU9XCJyZWxhdGl2ZSBoLTI0IHctMjQgZmxleC1zaHJpbmstMCBvdmVyZmxvdy1oaWRkZW4gcm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS0yMDAgYmctZ3JhZGllbnQtdG8tYnIgZnJvbS1zbGF0ZS01MCB0by1pbmRpZ28tNTAgc206aC0yOCBzbTp3LTI4XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8U2FmZVByb2R1Y3RJbWFnZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNyYz17Z2V0Q2FydEltYWdlVXJsKGl0ZW0pfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsdD17aXRlbS50aXRsZX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZXM9XCIobWF4LXdpZHRoOiA2NDBweCkgMTAwdncsIDExMnB4XCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJvYmplY3QtY292ZXJcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZhbGxiYWNrQ2xhc3NOYW1lPVwiZmxleCBoLWZ1bGwgdy1mdWxsIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciB0ZXh0LXNsYXRlLTMwMFwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWNvbkNsYXNzTmFtZT1cImgtNiB3LTZcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLz5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7LyogUHJvZHVjdCBEZXRhaWxzICovfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggbWluLXctMCBmbGV4LTEgZmxleC1jb2xcIj5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7LyogQ2F0ZWdvcnkgJiBTS1UgKi99XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC13cmFwIGl0ZW1zLWNlbnRlciBnYXAtMiBtYi0xLjVcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7aXRlbS5jYXRlZ29yeSAmJiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVyIHRleHQtW3ZhcigtLXNmLWFjY2VudCldXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7aXRlbS5jYXRlZ29yeX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICl9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyhpdGVtLnNrdSB8fCBpdGVtLnNlbGVjdGVkVmFyaWFudD8uc2t1KSAmJiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInJvdW5kZWQgYmctc2xhdGUtMTAwIHB4LTEuNSBweS0wLjUgZm9udC1tb25vIHRleHQtWzEwcHhdIHRleHQtc2xhdGUtNTAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTS1U6IHtpdGVtLnNlbGVjdGVkVmFyaWFudD8uc2t1IHx8IGl0ZW0uc2t1fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJtYi0xIGxpbmUtY2xhbXAtMSB0ZXh0LWxnIGZvbnQtYmxhY2sgdGV4dC1zbGF0ZS05NTBcIiB0aXRsZT17aXRlbS50aXRsZX0+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2l0ZW0udGl0bGV9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2gzPlxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsvKiBEZXNjcmlwdGlvbiBTbmlwcGV0ICovfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyhpdGVtLnNob3J0RGVzY3JpcHRpb24gfHwgaXRlbS5kZXNjcmlwdGlvbikgJiYgKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm1iLTIgbGluZS1jbGFtcC0yIHRleHQteHMgbGVhZGluZy1yZWxheGVkIHRleHQtc2xhdGUtNTAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtpdGVtLnNob3J0RGVzY3JpcHRpb24gfHwgaXRlbS5kZXNjcmlwdGlvbn1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3A+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsvKiBSRU5ERVIgVkFSSUFOVFMgKEpTWCBTYWZlKSAqL31cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtpdGVtLnNlbGVjdGVkVmFyaWFudCAmJiBpdGVtLnNlbGVjdGVkVmFyaWFudC5hdHRyaWJ1dGVzICYmIChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC13cmFwIGdhcC0yIG1iLTJcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2l0ZW0uc2VsZWN0ZWRWYXJpYW50LmF0dHJpYnV0ZXMubWFwKChhdHRyLCBpZHgpID0+IChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGtleT17aWR4fSBjbGFzc05hbWU9XCJyb3VuZGVkLWxnIGJvcmRlciBib3JkZXItc2xhdGUtMjAwIGJnLXNsYXRlLTUwIHB4LTIgcHktMSB0ZXh0LVsxMXB4XSBmb250LWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVyIHRleHQtc2xhdGUtNzAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwibXItMSB0ZXh0LXNsYXRlLTQwMFwiPnthdHRyLm5hbWV9Ojwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7YXR0ci52YWx1ZX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSl9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsvKiBQcmljaW5nICovfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC1hdXRvIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1sZyBmb250LWJsYWNrIHRleHQtc2xhdGUtOTUwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOCnsyB7aXRlbS5jYXJ0UHJpY2UgfHwgaXRlbS5maW5hbFByaWNlIHx8IGl0ZW0uc2VsbGluZ1ByaWNlfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvcD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7aXRlbS5wcmljaW5nPy5kaXNjb3VudCA+IDAgJiYgKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNtIHRleHQtc2xhdGUtNDAwIGxpbmUtdGhyb3VnaFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg4KezIHtpdGVtLnByaWNpbmcuc2VsbGluZ1ByaWNlfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3A+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgey8qIENvbnRyb2xzICovfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgZGF0YS1hdGVsaWVyLXBhcnQ9e2F0ZWxpZXIgPyBcImNhcnQtY29udHJvbHNcIiA6IHVuZGVmaW5lZH0gY2xhc3NOYW1lPVwiZmxleCB3LWZ1bGwgaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtNCBib3JkZXItdCBib3JkZXItc2xhdGUtMTAwIHB0LTQgc206dy1hdXRvIHNtOmp1c3RpZnktZW5kIHNtOmJvcmRlci10LTAgc206cHQtMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIHNtOml0ZW1zLWVuZFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IG92ZXJmbG93LWhpZGRlbiByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtMjAwIGJnLXNsYXRlLTUwIHNoYWRvdy1zbVwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHVwZGF0ZVF1YW50aXR5KGl0ZW0uY2FydEl0ZW1JZCB8fCBpdGVtLl9pZCwgaXRlbS5xdWFudGl0eSAtIDEpfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZD17aXRlbS5xdWFudGl0eSA8PSAxfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgRGVjcmVhc2UgcXVhbnRpdHkgZm9yICR7aXRlbS50aXRsZX1gfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwLTIuNSB0ZXh0LXNsYXRlLTUwMCB0cmFuc2l0aW9uLWNvbG9ycyBob3ZlcjpiZy1zbGF0ZS0yMDAgaG92ZXI6dGV4dC1zbGF0ZS05NTAgZGlzYWJsZWQ6b3BhY2l0eS0zMCBkaXNhYmxlZDpob3ZlcjpiZy10cmFuc3BhcmVudFwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8TWludXMgc2l6ZT17MTR9IC8+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidy0xMCBiZy13aGl0ZSBweS0yIHRleHQtY2VudGVyIHRleHQtc20gZm9udC1ibGFja1wiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7aXRlbS5xdWFudGl0eX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gdXBkYXRlUXVhbnRpdHkoaXRlbS5jYXJ0SXRlbUlkIHx8IGl0ZW0uX2lkLCBpdGVtLnF1YW50aXR5ICsgMSl9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXtpdGVtLnF1YW50aXR5ID49IChpdGVtLnNlbGVjdGVkVmFyaWFudD8uc3RvY2sgfHwgaXRlbS5zdG9jayB8fCA5OSl9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2BJbmNyZWFzZSBxdWFudGl0eSBmb3IgJHtpdGVtLnRpdGxlfWB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInAtMi41IHRleHQtc2xhdGUtNTAwIHRyYW5zaXRpb24tY29sb3JzIGhvdmVyOmJnLXNsYXRlLTIwMCBob3Zlcjp0ZXh0LXNsYXRlLTk1MCBkaXNhYmxlZDpvcGFjaXR5LTMwIGRpc2FibGVkOmhvdmVyOmJnLXRyYW5zcGFyZW50XCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxQbHVzIHNpemU9ezE0fSAvPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7LyogU3RvY2sgQWxlcnQgbG9naWMgKi99XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7aXRlbS5xdWFudGl0eSA+PSAoaXRlbS5zZWxlY3RlZFZhcmlhbnQ/LnN0b2NrIHx8IGl0ZW0uc3RvY2spICYmIChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LW9yYW5nZS02MDAgbXQtMSBmb250LWJvbGQgZmxleCBpdGVtcy1jZW50ZXJcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTGltaXQgcmVhY2hlZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICl9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiByZW1vdmVGcm9tQ2FydChpdGVtLmNhcnRJdGVtSWQgfHwgaXRlbS5faWQpfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicm91bmRlZC14bCBwLTIuNSB0ZXh0LXNsYXRlLTQwMCB0cmFuc2l0aW9uLWNvbG9ycyBob3ZlcjpiZy1yZWQtNTAgaG92ZXI6dGV4dC1yZWQtNTAwXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiUmVtb3ZlIGl0ZW1cIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YFJlbW92ZSAke2l0ZW0udGl0bGV9IGZyb20gY2FydGB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUcmFzaDIgc2l6ZT17MjB9IC8+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICkpfVxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICAgICAgey8qIFJpZ2h0IFNpZGU6IFN1bW1hcnkgKi99XHJcbiAgICAgICAgICAgICAgICA8ZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgZGF0YS1hdGVsaWVyLXBhcnQ9e2F0ZWxpZXIgPyBcImNhcnQtc3VtbWFyeVwiIDogdW5kZWZpbmVkfSBjbGFzc05hbWU9XCJzdGlja3kgdG9wLTI4IHJvdW5kZWQtWzJyZW1dIGJvcmRlciBib3JkZXItc2xhdGUtMjAwIGJnLXdoaXRlIHAtNyBzaGFkb3ctbGcgc2hhZG93LXNsYXRlLTIwMC83MFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTYgZmxleCBpdGVtcy1zdGFydCBqdXN0aWZ5LWJldHdlZW4gZ2FwLTRcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwic2Yta2lja2VyXCI+U3VtbWFyeTwvcD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC14bCBmb250LWJsYWNrIHRleHQtc2xhdGUtOTUwXCI+T3JkZXIgU3VtbWFyeTwvaDI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInJvdW5kZWQtZnVsbCBiZy1bdmFyKC0tc2YtYWNjZW50LWJnKV0gcHgtMyBweS0xIHRleHQteHMgZm9udC1ibGFjayB0ZXh0LVt2YXIoLS1zZi1hY2NlbnQpXVwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtjYXJ0SXRlbXMubGVuZ3RofSBpdGVte2NhcnRJdGVtcy5sZW5ndGggPT09IDEgPyAnJyA6ICdzJ31cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTYgc3BhY2UteS0zIHRleHQtc21cIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gdGV4dC1zbGF0ZS02MDBcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj5TdWJ0b3RhbDwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LWJvbGQgdGV4dC1zbGF0ZS05NTBcIj7gp7Mge3N1YnRvdGFsfTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktYmV0d2VlbiB0ZXh0LXNsYXRlLTYwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPkVzdGltYXRlZCBkZWxpdmVyeTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LWJvbGQgdGV4dC1zbGF0ZS05NTBcIj7gp7Mge3NoaXBwaW5nfTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHt0b3RhbFNhdmluZ3MgPiAwICYmIChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIHJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItZW1lcmFsZC0yMDAvNjAgYmctZW1lcmFsZC01MCBwLTMgZm9udC1ibGFjayB0ZXh0LWVtZXJhbGQtNzAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPlRvdGFsIFNhdmluZ3M8L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPi0g4KezIHt0b3RhbFNhdmluZ3N9PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTYgcm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS0yMDAgYmctc2xhdGUtNTAgcC0zXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWwgaHRtbEZvcj1cImNhcnQtcHJvbW8tY29kZVwiIGNsYXNzTmFtZT1cIm1iLTIgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgdGV4dC14cyBmb250LWJsYWNrIHVwcGVyY2FzZSB0cmFja2luZy1bMC4xNGVtXSB0ZXh0LXNsYXRlLTUwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUYWcgc2l6ZT17MTR9IC8+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgUHJvbW8gY29kZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9sYWJlbD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtMlwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZD1cImNhcnQtcHJvbW8tY29kZVwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJ0ZXh0XCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU9e3Byb21vQ29kZX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0UHJvbW9Db2RlKGV2ZW50LnRhcmdldC52YWx1ZS50b1VwcGVyQ2FzZSgpKX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCJTQVZFMTBcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLWRlc2NyaWJlZGJ5PXtwcm9tb0ZlZWRiYWNrID8gJ2NhcnQtcHJvbW8tZmVlZGJhY2snIDogdW5kZWZpbmVkfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJzZi1maWVsZCBtaW4tdy0wIGZsZXgtMSByb3VuZGVkLXhsIHB4LTMgcHktMi41IHRleHQtc20gdXBwZXJjYXNlXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2hhbmRsZUFwcGx5UHJvbW99IGNsYXNzTmFtZT1cInJvdW5kZWQteGwgYmctc2xhdGUtOTUwIHB4LTQgdGV4dC1zbSBmb250LWJsYWNrIHRleHQtd2hpdGUgdHJhbnNpdGlvbiBob3ZlcjotdHJhbnNsYXRlLXktMC41IGhvdmVyOmJnLXNsYXRlLTgwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBBcHBseVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7cHJvbW9GZWVkYmFjayAmJiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHAgaWQ9XCJjYXJ0LXByb21vLWZlZWRiYWNrXCIgY2xhc3NOYW1lPXtgbXQtMiB0ZXh0LXhzIGZvbnQtYm9sZCAke3Byb21vRmVlZGJhY2sudHlwZSA9PT0gJ2Vycm9yJyA/ICd0ZXh0LXJlZC02MDAnIDogJ3RleHQtZW1lcmFsZC03MDAnfWB9PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7cHJvbW9GZWVkYmFjay50ZXh0fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvcD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICl9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYi02IGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBib3JkZXItdCBib3JkZXItc2xhdGUtMjAwIHB0LTVcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtbGcgZm9udC1ibGFjayB0ZXh0LXNsYXRlLTk1MFwiPlRvdGFsPC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC0zeGwgZm9udC1ibGFjayB0ZXh0LXNsYXRlLTk1MFwiPuCnsyB7dG90YWx9PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxMaW5rIGhyZWY9XCIvY2hlY2tvdXRcIiBjbGFzc05hbWU9XCJzZi1idG4gc2YtYnRuLXByaW1hcnkgdy1mdWxsXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBQcm9jZWVkIHRvIENoZWNrb3V0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvTGluaz5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxMaW5rIGhyZWY9XCIvXCIgY2xhc3NOYW1lPVwibXQtNCBmbGV4IGp1c3RpZnktY2VudGVyIHRleHQtc20gZm9udC1ibGFjayB0ZXh0LXNsYXRlLTUwMCB0cmFuc2l0aW9uIGhvdmVyOnRleHQtW3ZhcigtLXNmLWFjY2VudCldXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBDb250aW51ZSBTaG9wcGluZ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L0xpbms+XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTYgc3BhY2UteS0zIGJvcmRlci10IGJvcmRlci1zbGF0ZS0yMDAgcHQtNVwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyByb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLXNsYXRlLTIwMCBiZy1zbGF0ZS01MCBwLTMgdGV4dC1zbSBmb250LWJvbGQgdGV4dC1zbGF0ZS02MDBcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8U2hpZWxkQ2hlY2sgc2l6ZT17MTh9IGNsYXNzTmFtZT1cImZsZXgtc2hyaW5rLTAgdGV4dC1lbWVyYWxkLTYwMFwiIC8+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4+U2VjdXJlIGNoZWNrb3V0IGFuZCBvcmRlciBjb25maXJtYXRpb248L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgcm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS0yMDAgYmctc2xhdGUtNTAgcC0zIHRleHQtc20gZm9udC1ib2xkIHRleHQtc2xhdGUtNjAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFRydWNrIHNpemU9ezE4fSBjbGFzc05hbWU9XCJmbGV4LXNocmluay0wIHRleHQtW3ZhcigtLXNmLWFjY2VudCldXCIgLz5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj5GYXN0ICYgc2VjdXJlIGRlbGl2ZXJ5PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIHJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItZW1lcmFsZC0yMDAgYmctZW1lcmFsZC01MCBwLTMgdGV4dC1zbSBmb250LWJvbGQgdGV4dC1lbWVyYWxkLTgwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxDaGVja0NpcmNsZSBzaXplPXsxOH0gY2xhc3NOYW1lPVwiZmxleC1zaHJpbmstMCB0ZXh0LWVtZXJhbGQtNjAwXCIgLz5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj5DYXNoIG9uIGRlbGl2ZXJ5IGF2YWlsYWJsZSBhdCBjaGVja291dDwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgIHsocmVjb21tZW5kYXRpb25zTG9hZGluZyB8fCByZWNvbW1lbmRhdGlvbnMubGVuZ3RoID4gMCkgJiYgKFxyXG4gICAgICAgICAgICAgICAgPHNlY3Rpb24gZGF0YS1hdGVsaWVyLXBhcnQ9e2F0ZWxpZXIgPyBcImNhcnQtcmVjb21tZW5kYXRpb25zXCIgOiB1bmRlZmluZWR9IGNsYXNzTmFtZT1cIm10LTggcm91bmRlZC1bMS41cmVtXSBib3JkZXIgYm9yZGVyLXNsYXRlLTIwMCBiZy13aGl0ZSBwLTQgc2hhZG93LXNtIHNtOm10LTEwIHNtOnJvdW5kZWQtWzJyZW1dIHNtOnAtN1wiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWItNSBmbGV4IGZsZXgtY29sIGdhcC0yIHNtOmZsZXgtcm93IHNtOml0ZW1zLWVuZCBzbTpqdXN0aWZ5LWJldHdlZW5cIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInNmLWtpY2tlclwiPlJlY29tbWVuZGVkPC9wPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cIm10LTEgdGV4dC0yeGwgZm9udC1ibGFjayB0cmFja2luZy10aWdodCB0ZXh0LXNsYXRlLTk1MFwiPllvdSBtYXkgYWxzbyBsaWtlPC9oMj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTEgdGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtc2xhdGUtNTAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgU2ltaWxhciBwcm9kdWN0cyBmcm9tIHRoaXMgc3RvcmUsIGV4Y2x1ZGluZyB3aGF0IGlzIGFscmVhZHkgaW4geW91ciBjYXJ0LlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9wPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPExpbmsgaHJlZj1cIi8jcHJvZHVjdHNcIiBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtYmxhY2sgdGV4dC1bdmFyKC0tc2YtYWNjZW50KV1cIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEJyb3dzZSBhbGxcclxuICAgICAgICAgICAgICAgICAgICAgICAgPC9MaW5rPlxyXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgICAgICAgICB7cmVjb21tZW5kYXRpb25zTG9hZGluZyA/IChcclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0yIGdhcC0zIG1kOmdyaWQtY29scy0zIGxnOmdyaWQtY29scy00XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7QXJyYXkuZnJvbSh7IGxlbmd0aDogNCB9KS5tYXAoKF8sIGluZGV4KSA9PiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBrZXk9e2luZGV4fSBjbGFzc05hbWU9XCJoLTcyIGFuaW1hdGUtcHVsc2Ugcm91bmRlZC1bMS41cmVtXSBiZy1zbGF0ZS0xMDBcIiAvPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKSl9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICkgOiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgZ3JpZCBncmlkLWNvbHMtMiBnYXAtMyBtZDpncmlkLWNvbHMtMyBsZzpncmlkLWNvbHMtNCB4bDpncmlkLWNvbHMtNiAke3JlY29tbWVuZGF0aW9ucy5sZW5ndGggPT09IDEgPyBcIm14LWF1dG8gdy1mdWxsIG1heC13LVsyMHJlbV0gc206bXgtMCBzbTptYXgtdy1ub25lXCIgOiBcIlwifWB9PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge3JlY29tbWVuZGF0aW9ucy5tYXAoKHByb2R1Y3QsIGluZGV4KSA9PiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFByb2R1Y3RDYXJkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleT17cHJvZHVjdC5faWR9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXNlbnRhdGlvblZhcmlhbnQ9e3ByZXNlbnRhdGlvblZhcmlhbnR9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q9e3Byb2R1Y3R9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4PXtpbmRleH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmV3aWRlRGlzY291bnQ9ezB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2R1Y3RDYXJkPXt0aGVtZWRQcm9kdWN0Q2FyZH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qcm9kdWN0QWRkPXsoaXRlbSkgPT4gcHJvZHVjdEFjdGlvbnMuYWRkUHJvZHVjdFRvQ2FydChpdGVtLCB7IGxvY2F0aW9uOiAnY2FydF9yZWNvbW1lbmRhdGlvbnMnIH0pfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvblByb2R1Y3RCdXlOb3c9eyhpdGVtKSA9PiBwcm9kdWN0QWN0aW9ucy5idXlOb3coaXRlbSwgeyBsb2NhdGlvbjogJ2NhcnRfcmVjb21tZW5kYXRpb25zJyB9KX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25XaXNobGlzdFRvZ2dsZT17cHJvZHVjdEFjdGlvbnMudG9nZ2xlV2lzaGxpc3R9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzV2lzaGxpc3RlZD17cHJvZHVjdEFjdGlvbnMuaXNXaXNobGlzdGVkfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMaW5rQ29tcG9uZW50PXtMaW5rfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApKX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgKX1cclxuICAgICAgICAgICAgICAgIDwvc2VjdGlvbj5cclxuICAgICAgICAgICAgKX1cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgICB7cHJvZHVjdEFjdGlvbnMudmFyaWFudFBpY2tlcn1cclxuXHJcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzZi1tb2JpbGUtYWN0aW9uLWJhciBmaXhlZCBpbnNldC14LTAgei00MCBib3JkZXItdCBib3JkZXItc2xhdGUtMjAwIGJnLXdoaXRlLzk1IHAtMyBzaGFkb3ctWzBfLTEwcHhfMzBweF9yZ2JhKDE1LDIzLDQyLDAuMDgpXSBiYWNrZHJvcC1ibHVyIGxnOmhpZGRlblwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm14LWF1dG8gZmxleCBtYXgtdy14bCBpdGVtcy1jZW50ZXIgZ2FwLTNcIj5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWluLXctMCBmbGV4LTFcIj5cclxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYm9sZCB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMTRlbV0gdGV4dC1zbGF0ZS01MDBcIj57Y2FydEl0ZW1zLmxlbmd0aH0gaXRlbXtjYXJ0SXRlbXMubGVuZ3RoID09PSAxID8gJycgOiAncyd9IHRvdGFsPC9wPlxyXG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteGwgZm9udC1ibGFjayB0ZXh0LXNsYXRlLTk1MFwiPuCnsyB7dG90YWx9PC9wPlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICA8TGluayBocmVmPVwiL2NoZWNrb3V0XCIgY2xhc3NOYW1lPVwic2YtYnRuIHNmLWJ0bi1wcmltYXJ5IG1pbi1oLTAgcm91bmRlZC1mdWxsIHB4LTYgcHktMyB0ZXh0LXNtXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgQ2hlY2tvdXRcclxuICAgICAgICAgICAgICAgIDwvTGluaz5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICApO1xyXG59XHJcbiJdLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMF19