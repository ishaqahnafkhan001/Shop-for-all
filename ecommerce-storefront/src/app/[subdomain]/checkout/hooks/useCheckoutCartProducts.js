"use client";

import { useEffect, useState } from "react";

import API from "@/api/api";

export function useCheckoutCartProducts({ cartItems, subdomain }) {
    const [snapshot, setSnapshot] = useState({ subdomain: null, products: {} });

    useEffect(() => {
        let cancelled = false;
        const fetchProducts = async () => {
            try {
                const ids = [...new Set(cartItems.map((item) => item._id))].join(",");
                const { data } = await API.get(
                    `/storefront/${subdomain}/products/batch`,
                    { params: { ids } }
                );

                const mapped = {};

                (data?.data || []).forEach((product) => {
                    mapped[product._id] = product;
                });

                if (!cancelled) setSnapshot({ subdomain, products: mapped });
            } catch (error) {
                console.error("Failed to fetch products", error);
            }
        };

        if (cartItems.length > 0) {
            fetchProducts();
        }
        return () => { cancelled = true; };
    }, [cartItems, subdomain]);

    return snapshot.subdomain === subdomain && cartItems.length > 0 ? snapshot.products : {};
}
