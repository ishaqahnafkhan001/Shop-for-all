import { buildTenantPageMetadata } from "../storefrontPageMetadata";

export const generateMetadata = ({ params }) => buildTenantPageMetadata({
    params,
    pageTitle: "Cart",
    path: "/cart",
    description: "Review your cart before checkout."
});

export default function CartNoIndexLayout({ children }) {
    return children;
}
