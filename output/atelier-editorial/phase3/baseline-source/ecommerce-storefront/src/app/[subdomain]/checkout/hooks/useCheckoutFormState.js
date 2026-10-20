"use client";

import { useState } from "react";

const initialCheckoutFormData = {
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
};

export function useCheckoutFormState() {
    const [formData, setFormData] = useState(initialCheckoutFormData);

    const handleInputChange = (event) => {
        const { name, value } = event.target;

        setFormData((currentFormData) => ({
            ...currentFormData,
            [name]: value,
        }));
    };

    return {
        formData,
        handleInputChange,
    };
}
