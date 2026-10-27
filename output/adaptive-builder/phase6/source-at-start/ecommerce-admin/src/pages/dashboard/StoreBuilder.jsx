import StoreBuilderPage from './StoreBuilder/StoreBuilderPage.jsx';
import { Link } from 'react-router-dom';

export default function StoreBuilder() {
    return <>{import.meta.env.DEV && <Link to="/dashboard/adaptive-builder-preview" className="m-4 inline-flex min-h-11 items-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-900">Open Adaptive Builder development preview</Link>}<StoreBuilderPage /></>;
}
