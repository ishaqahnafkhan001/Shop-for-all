const fs = require('node:fs');
const base = 'ecommerce-admin/src/pages/dashboard/StoreBuilder/';
let source = fs.readFileSync(base + 'StorefrontPreview.jsx','utf8').replaceAll('\r\n','\n');
const start = source.indexOf('const PreviewSectionToolbar ='), end = source.indexOf('export const createPreviewEditor =');
const toolbar = source.slice(start,end).replace('const PreviewSectionToolbar =', 'export default function PreviewSectionToolbar').replace('}) => {','}) {').replace(/;\s*$/, '\n');
fs.writeFileSync(base + 'PreviewSectionToolbar.jsx', "import { Eye, EyeOff, Lock, Pencil } from 'lucide-react';\n" + toolbar);
const editorEnd = source.indexOf('export const CheckoutBrandingPreview');
source = source.slice(0,start) + source.slice(editorEnd);
source = source.replace("import { Eye, EyeOff, Lock, Pencil } from 'lucide-react';", "import { createPreviewEditor } from './previewEditor.js';");
source = source.replace("const getSectionLabel = (section = {}) => section.settings?.visualLabel || section.title || section.type || 'Section';\n", '');
source = source.replace('[activeElement, theme?.homepageSections, onSelectElement, onToggleSectionVisibility]', '[activeElement, theme, onSelectElement, onToggleSectionVisibility]');
fs.writeFileSync(base + 'StorefrontPreview.jsx',source);
fs.writeFileSync(base + 'previewEditor.js', `import { createElement } from 'react';
import PreviewSectionToolbar from './PreviewSectionToolbar.jsx';
const getSectionLabel = (section = {}) => section.settings?.visualLabel || section.title || section.type || 'Section';
export const createPreviewEditor = ({ theme, activeElement, onSelectElement, onToggleSectionVisibility }) => {
    if (!onSelectElement) return null;
    const sections = theme?.homepageSections || [];
    return { selectedId: activeElement, onSelect: onSelectElement, renderToolbar: (id, meta = {}) => {
        const sectionIndex = id?.startsWith('section:') ? sections.findIndex(section => String(section?.id || section?._id) === id.slice('section:'.length))
            : (id?.startsWith('section-') ? Number(id.replace('section-', '')) : -1);
        const section = sectionIndex >= 0 ? sections[sectionIndex] : null;
        return createElement(PreviewSectionToolbar, { id, label: section ? getSectionLabel(section) : meta.label, locked: Boolean(meta.locked),
            section, sectionIndex, onSelectElement, onToggleSectionVisibility });
    } };
};
`);
let gallery = fs.readFileSync(base + 'themes/ThemeGallery.jsx','utf8').replaceAll('\r\n','\n');
const a = gallery.indexOf('export const buildPreviewTheme'), b = gallery.indexOf('// The full Gallery preview');
fs.writeFileSync(base + 'themes/themePreview.js', "import { resolvePrebuiltTheme } from '@scaleup/storefront-theme/prebuilt';\n" + gallery.slice(a,b));
gallery = gallery.slice(0,a) + gallery.slice(b);
gallery = gallery.replace('getPrebuiltThemes, getPrebuiltTheme, resolvePrebuiltTheme', 'getPrebuiltThemes, getPrebuiltTheme');
gallery = "import { buildPreviewTheme } from './themePreview.js';\n" + gallery;
gallery = gallery.replace('[availableThemes, currentTheme, planAccess, branding, shopName]', '[availableThemes, currentTheme, planAccess]');
fs.writeFileSync(base + 'themes/ThemeGallery.jsx', gallery);
const basic = base + 'editors/BasicEditors.jsx'; fs.writeFileSync(basic, fs.readFileSync(basic,'utf8').replace('LayoutEditor({ theme, setTheme, setThemeGroup', 'LayoutEditor({ theme, setThemeGroup'));
for (const file of ['storefront-preview-parity.test.js','storefront-control-wiring.test.js']) {
 const path = 'ecommerce-backend/backend/tests/' + file; let s = fs.readFileSync(path,'utf8');
 if(file.includes('parity')) s = s.replace("export * from '${builder}/themes/ThemeGallery.jsx';", "export * from '${builder}/themes/ThemeGallery.jsx';\n                export * from '${builder}/themes/themePreview.js';");
 else {
  s = s.replace("export * from '${base}/StorefrontPreview.jsx';", "export * from '${base}/StorefrontPreview.jsx';\n                export * from '${base}/previewEditor.js';");
  s = s.replace("const { output } = await bundle.generate({ format: 'cjs' });", "const { output } = await bundle.generate({ format: 'cjs', inlineDynamicImports: true });");
  s = s.replace("resolveId: id => id === 'virtual:controls'", "resolveId: id => id === './PublishedAdaptivePage' ? 'virtual:inactive-adaptive' : id === 'virtual:controls'");
  s = s.replace("load: id => id === 'virtual:next/link'", "load: id => id === 'virtual:inactive-adaptive' ? `export default function UnexpectedAdaptiveLoad() { throw new Error('Legacy controls must not select adaptive rendering'); }` : id === 'virtual:next/link'");
 }
 fs.writeFileSync(path,s);
}
