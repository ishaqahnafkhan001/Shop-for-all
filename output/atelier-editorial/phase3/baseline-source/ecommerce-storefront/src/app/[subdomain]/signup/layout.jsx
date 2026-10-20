import { buildTenantPageMetadata } from "../storefrontPageMetadata";

export const generateMetadata = ({ params }) => buildTenantPageMetadata({
    params,
    pageTitle: "Create Account",
    path: "/signup",
    description: "Create a customer account for this store."
});

export default function SignupNoIndexLayout({ children }) {
    return children;
}
