import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StoreBuilderShell } from '../../src/pages/dashboard/StoreBuilder/shell/StoreBuilderShell.jsx';
import { StoreBuilderHeader } from '../../src/pages/dashboard/StoreBuilder/StoreBuilderHeader.jsx';
import { StoreBuilderSidebar } from '../../src/pages/dashboard/StoreBuilder/StoreBuilderSidebar.jsx';
import { StoreBuilderEditorPanel } from '../../src/pages/dashboard/StoreBuilder/StoreBuilderEditorPanel.jsx';
import { StoreBuilderPreviewPanel } from '../../src/pages/dashboard/StoreBuilder/StoreBuilderPreviewPanel.jsx';
import { BuilderDrawer } from '../../src/pages/dashboard/StoreBuilder/shell/BuilderDrawer.jsx';
import { TypographyEditor, MobileEditor } from '../../src/pages/dashboard/StoreBuilder/editors/BasicEditors.jsx';
import { useMobileWorkspace } from '../../src/pages/dashboard/StoreBuilder/hooks/useMobileWorkspace.js';
import { usePreviewMode, previewPages } from '../../src/pages/dashboard/StoreBuilder/hooks/usePreviewMode.js';
import { loadBuilderTheme, updateBuilderThemeSetting } from '../../src/pages/dashboard/StoreBuilder/storeBuilderThemeUtils.js';
import '../../src/index.css';

const full = { storeBuilderAccess: 'full' };
const initial = loadBuilderTheme({ hero: { variant: 'split', title: 'Mobile editing preview', imageUrl: '/tests/fixtures/theme-media.svg' }, homepageSections: [{ id: 'featured', type: 'FeaturedProducts', title: 'Featured products' }] });
const products = [{ _id: 'fixture', title: 'Fixture product', sellingPrice: 100, stock: 10, images: ['/tests/fixtures/theme-media.svg'] }];
function Fixture() {
    const [theme, setTheme] = useState(initial);
    const [workspace, selectWorkspace] = useMobileWorkspace();
    const [selection, setSelection] = useState('typography');
    const [drawer, setDrawer] = useState('');
    const [action, setAction] = useState('No action');
    const [dirty, setDirty] = useState(false);
    const preview = usePreviewMode();
    const choose = value => { setSelection(value); selectWorkspace('edit'); };
    const command = (group, key, value) => { setTheme(current => updateBuilderThemeSetting(current, group, key, value)); setDirty(true); };
    return <StoreBuilderShell>
        <StoreBuilderHeader hasUnsavedChanges={dirty} autosaveStatus="idle" canUndo canRedo validationCount={0} mobileWorkspace={workspace} onWorkspaceChange={selectWorkspace}
            onUndo={() => setAction('Undo callback')} onRedo={() => setAction('Redo callback')} onSave={() => setDrawer('Publish review fixture')}
            onSaveDraft={() => setAction('Save draft callback')} onOpenThemes={() => setDrawer('Theme gallery fixture')} onOpenIssues={() => setDrawer('Issues fixture')}
            onOpenHistory={() => setDrawer('History fixture')} />
        <p className="px-4 py-2 text-xs text-slate-500">UI fixture. Publication and history callbacks are stubs; no server writes. <output aria-label="Last action">{action}</output></p>
        <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-4 p-3 xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(520px,1fr)_380px]">
            <StoreBuilderSidebar mobileWorkspace={workspace} activeElement={selection} activeGroup={selection} theme={theme} planAccess={full} selectEditorTarget={choose} selectSettingsGroup={choose} />
            <StoreBuilderPreviewPanel mobileWorkspace={workspace} setMobileWorkspace={selectWorkspace} {...preview} previewPages={previewPages} theme={theme} planAccess={full} shopName="Mobile fixture" availableProducts={products} productCategories={[]} activeElement={selection} selectEditorTarget={choose} />
            <StoreBuilderEditorPanel mobileWorkspace={workspace} inspectorOpen selectedLabel={selection} setMobileWorkspace={selectWorkspace} onCloseInspector={() => selectWorkspace('preview')}>
                {selection === 'typography' ? <TypographyEditor theme={theme} setThemeGroup={command} /> : selection === 'mobile' ? <MobileEditor theme={theme} setThemeGroup={command} toggleThemeGroup={(group,key) => command(group,key,!theme[group][key])} planAccess={full} /> : <p className="rounded-lg bg-white p-4">Selected {selection}. Use Typography or Mobile for editable fixture controls.</p>}
            </StoreBuilderEditorPanel>
        </div>
        <BuilderDrawer open={Boolean(drawer)} title={drawer} onClose={() => setDrawer('')} description="Actual shared drawer, synthetic content.">
            <label>Fixture note<input className="w-full border p-2" placeholder="Type to check focus stability" /></label>
            <button type="button" onClick={() => setAction('Drawer callback')} className="mt-4 rounded border p-3">Fixture action</button>
        </BuilderDrawer>
    </StoreBuilderShell>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
