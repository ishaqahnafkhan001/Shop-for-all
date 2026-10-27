"use client";

import { useEffect, useState } from "react";

import API from "@/api/api";

export function useCheckoutCartProducts({ cartItems, subdomain }) {
    const [productsDetails, setProductsDetails] = useState({});

    useEffect(() => {
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

                setProductsDetails(mapped);
            } catch (error) {
                console.error("Failed to fetch products", error);
            }
        };

        if (cartItems.length > 0) {
            fetchProducts();
        }
    }, [cartItems, subdomain]);

    return productsDetails;
}
