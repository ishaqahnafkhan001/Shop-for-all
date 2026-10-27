import { buildTenantPageMetadata } from "../storefrontPageMetadata";

export const generateMetadata = ({ params }) => buildTenantPageMetadata({
    params,
    pageTitle: "Checkout",
    path: "/checkout",
    description: "Complete your order securely."
});

export default function CheckoutNoIndexLayout({ children }) {
    return children;
}
