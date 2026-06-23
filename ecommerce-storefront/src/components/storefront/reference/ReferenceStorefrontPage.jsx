"use client";

import { getReferenceThemeStyle } from "./referenceCore";
import { ReferenceStorefrontFooter } from "./StorefrontFooter";
import { ReferenceStorefrontHeader } from "./StorefrontHeader";
import { ReferenceStorefrontHome } from "./StorefrontHome";

export function ReferenceStorefrontPage(props) {
    return (
        <div style={getReferenceThemeStyle(props.theme)}>
            <ReferenceStorefrontHeader {...props} />
            <ReferenceStorefrontHome {...props} />
            <ReferenceStorefrontFooter {...props} />
        </div>
    );
}
