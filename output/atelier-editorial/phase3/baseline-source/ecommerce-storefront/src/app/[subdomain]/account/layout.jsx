import { buildTenantPageMetadata } from "../storefrontPageMetadata";

export const generateMetadata = ({ params }) => buildTenantPageMetadata({
    params,
    pageTitle: "Account",
    path: "/account",
    description: "Manage your customer account for this store."
});

export default function AccountNoIndexLayout({ children }) {
    return children;
}
