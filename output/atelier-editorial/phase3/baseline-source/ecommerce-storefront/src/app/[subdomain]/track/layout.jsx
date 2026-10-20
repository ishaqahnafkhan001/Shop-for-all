import { buildTenantPageMetadata } from "../storefrontPageMetadata";

export const generateMetadata = ({ params }) => buildTenantPageMetadata({
    params,
    pageTitle: "Track Order",
    path: "/track",
    description: "Track an order from this store."
});

export default function TrackNoIndexLayout({ children }) {
    return children;
}
