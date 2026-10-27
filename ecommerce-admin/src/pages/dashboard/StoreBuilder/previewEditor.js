import { createElement } from 'react';
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
