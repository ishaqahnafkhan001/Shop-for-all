import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Info, Link as LinkIcon, MapPin, ShieldCheck, Trash2, Truck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../../api/api.js';
import { AdminLoadingState } from '../../../components/ui/AdminState.jsx';

const emptyCouriers = {
    pathao: { configured: false, enabled: false },
    redx: { configured: false, enabled: false },
    defaultCourier: null
};

const StatusBadge = ({ children, tone = 'gray' }) => {
    const tones = {
        gray: 'bg-gray-100 text-gray-700 border-gray-200',
        green: 'bg-green-50 text-green-700 border-green-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        blue: 'bg-blue-50 text-blue-700 border-blue-200'
    };
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-black uppercase tracking-wide ${tones[tone]}`}>
            {children}
        </span>
    );
};

const ProviderCard = ({ icon: Icon, name, description, configured, enabled, isDefault, details, actions, children }) => (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <Icon size={22} />
                </div>
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black text-gray-900">{name}</h2>
                        <StatusBadge tone={configured && enabled ? 'green' : configured ? 'amber' : 'gray'}>
                            {configured ? (enabled ? 'Active' : 'Configured') : 'Not configured'}
                        </StatusBadge>
                        {isDefault && <StatusBadge tone="blue">Default</StatusBadge>}
                    </div>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">{description}</p>
                </div>
            </div>
            <div className="flex flex-wrap gap-2">{actions}</div>
        </div>

        {details?.length > 0 && (
            <div className="mt-5 grid gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm md:grid-cols-2">
                {details.map(item => (
                    <div key={item.label}>
                        <p className="text-xs font-black uppercase tracking-wide text-gray-400">{item.label}</p>
                        <p className="mt-0.5 break-words font-bold text-gray-900">{item.value || 'Not set'}</p>
                    </div>
                ))}
            </div>
        )}

        {children}
    </section>
);

const ShippingSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [couriers, setCouriers] = useState(emptyCouriers);
    const [pathaoTab, setPathaoTab] = useState('create');
    const [redxMode, setRedxMode] = useState('existing');
    const [showPathaoSetup, setShowPathaoSetup] = useState(false);
    const [showRedxForm, setShowRedxForm] = useState(false);
    const [cities, setCities] = useState([]);
    const [zones, setZones] = useState([]);
    const [areas, setAreas] = useState([]);

    const [createData, setCreateData] = useState({
        contact_name: '',
        contact_number: '',
        address: '',
        city_id: '',
        zone_id: '',
        area_id: ''
    });
    const [linkData, setLinkData] = useState({
        client_id: '',
        client_secret: '',
        username: '',
        password: '',
        store_id: '',
        isLive: true
    });
    const [redxData, setRedxData] = useState({
        token: '',
        pickupStoreId: '',
        pickupStoreName: '',
        pickupAddress: '',
        pickupAreaName: '',
        pickupAreaId: '',
        enabled: true
    });
    const [redxPickupData, setRedxPickupData] = useState({
        name: '',
        phone: '',
        address: '',
        areaId: '',
        areaName: ''
    });
    const [redxAreaSearch, setRedxAreaSearch] = useState({
        districtName: '',
        postCode: ''
    });
    const [redxAreaResults, setRedxAreaResults] = useState([]);
    const [redxAreaLoading, setRedxAreaLoading] = useState(false);

    const inputClass = "w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500";

    const loadCouriers = async () => {
        setLoading(true);
        try {
            const { data } = await API.get('/admin/shipping/couriers');
            const next = data.data || emptyCouriers;
            setCouriers(next);
            setShowPathaoSetup(!next.pathao?.configured);
            setShowRedxForm(!next.redx?.configured);
            setRedxData(prev => ({
                ...prev,
                token: '',
                pickupStoreId: next.redx?.pickupStoreId || '',
                pickupStoreName: next.redx?.pickupStoreName || '',
                pickupAddress: next.redx?.pickupAddress || '',
                pickupAreaName: next.redx?.pickupAreaName || '',
                pickupAreaId: next.redx?.pickupAreaId || '',
                enabled: next.redx?.enabled !== false
            }));
        } catch {
            toast.error('Failed to load courier settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        queueMicrotask(() => {
            loadCouriers();
            API.get('/admin/pathao/cities')
                .then(({ data }) => setCities(data.data || []))
                .catch(() => {});
        });
    }, []);

    useEffect(() => {
        if (!createData.city_id) {
            queueMicrotask(() => {
                setZones([]);
                setAreas([]);
            });
            return;
        }
        API.get(`/admin/pathao/cities/${createData.city_id}/zones`)
            .then(({ data }) => setZones(data.data || []))
            .catch(() => setZones([]));
    }, [createData.city_id]);

    useEffect(() => {
        if (!createData.zone_id) {
            queueMicrotask(() => setAreas([]));
            return;
        }
        API.get(`/admin/pathao/zones/${createData.zone_id}/areas`)
            .then(({ data }) => setAreas(data.data || []))
            .catch(() => setAreas([]));
    }, [createData.zone_id]);

    const configuredCount = useMemo(() => Number(Boolean(couriers.pathao?.configured)) + Number(Boolean(couriers.redx?.configured)), [couriers]);

    const setDefaultCourier = async (provider) => {
        setSaving(true);
        try {
            const { data } = await API.post('/admin/shipping/couriers/default', { provider });
            setCouriers(data.data || couriers);
            toast.success(data.message || 'Default courier updated');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update default courier');
        } finally {
            setSaving(false);
        }
    };

    const handleCreatePathao = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const { data } = await API.post('/admin/settings/pathao-store', createData);
            toast.success(data.message || 'Pathao shop connected');
            await loadCouriers();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to connect Pathao');
        } finally {
            setSaving(false);
        }
    };

    const handleLinkPathao = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const { data } = await API.post('/admin/settings/pathao-link', linkData);
            toast.success(data.message || 'Pathao account linked');
            await loadCouriers();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to link Pathao account');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveRedx = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const endpoint = couriers.redx?.configured ? '/admin/shipping/couriers/redx' : '/admin/shipping/couriers/redx/configure';
            const method = couriers.redx?.configured ? API.patch : API.post;
            const { data } = await method(endpoint, redxData);
            setCouriers(data.data || couriers);
            setShowRedxForm(false);
            setRedxData(prev => ({ ...prev, token: '' }));
            toast.success(data.message || 'RedX courier saved');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save RedX courier');
        } finally {
            setSaving(false);
        }
    };

    const handleSearchRedxAreas = async () => {
        if (!redxData.token && !couriers.redx?.configured) {
            toast.error('Enter your RedX token before searching areas');
            return;
        }
        setRedxAreaLoading(true);
        try {
            const { data } = await API.post('/admin/shipping/couriers/redx/areas/search', {
                token: redxData.token,
                districtName: redxAreaSearch.districtName,
                postCode: redxAreaSearch.postCode
            });
            setRedxAreaResults(data.data?.areas || []);
            if ((data.data?.areas || []).length === 0) toast('No RedX areas found for this search');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to search RedX areas');
        } finally {
            setRedxAreaLoading(false);
        }
    };

    const handleCreateRedxPickupStore = async (event) => {
        event.preventDefault();
        if (!redxData.token && !couriers.redx?.configured) {
            toast.error('Enter your RedX token before creating a pickup store');
            return;
        }
        setSaving(true);
        try {
            const { data } = await API.post('/admin/shipping/couriers/redx/pickup-store', {
                token: redxData.token,
                name: redxPickupData.name,
                phone: redxPickupData.phone,
                address: redxPickupData.address,
                areaId: redxPickupData.areaId,
                enabled: redxData.enabled
            });
            setCouriers(data.data || couriers);
            setShowRedxForm(false);
            setRedxData(prev => ({ ...prev, token: '' }));
            toast.success(data.message || 'RedX pickup store created');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create RedX pickup store');
        } finally {
            setSaving(false);
        }
    };

    const handleDisconnectRedx = async () => {
        if (!window.confirm('Disconnect RedX for this store? Existing orders will keep their tracking information.')) return;
        setSaving(true);
        try {
            const { data } = await API.delete('/admin/shipping/couriers/redx');
            setCouriers(data.data || emptyCouriers);
            setShowRedxForm(true);
            toast.success(data.message || 'RedX disconnected');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to disconnect RedX');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <AdminLoadingState title="Loading courier settings" description="Checking connected Pathao and RedX courier accounts." />;
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Shipping Settings</h1>
                <p className="mt-1 text-sm text-gray-500">Connect Pathao, RedX, or both. Choose a default courier for faster order processing.</p>
            </div>

            {configuredCount === 0 && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
                    <p className="font-bold">Connect a courier service to create parcels directly from orders.</p>
                    <p className="mt-1 text-indigo-700">You can start with one provider and add another later.</p>
                </div>
            )}

            <ProviderCard
                icon={Truck}
                name="Pathao Courier"
                description="Use Pathao city, zone, and area setup or link your existing Pathao merchant credentials."
                configured={couriers.pathao?.configured}
                enabled={couriers.pathao?.enabled}
                isDefault={couriers.defaultCourier === 'pathao'}
                details={[
                    { label: 'Store ID', value: couriers.pathao?.storeId },
                    { label: 'Mode', value: couriers.pathao?.isLive ? 'Live' : 'Sandbox / Platform default' }
                ]}
                actions={[
                    couriers.pathao?.configured && couriers.defaultCourier !== 'pathao' ? (
                        <button key="default" onClick={() => setDefaultCourier('pathao')} disabled={saving} className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Set default</button>
                    ) : null,
                    <button key="toggle" onClick={() => setShowPathaoSetup(prev => !prev)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
                        {couriers.pathao?.configured ? 'Show setup' : 'Configure'}
                    </button>
                ]}
            >
                {showPathaoSetup && (
                    <div className="mt-5 overflow-hidden rounded-2xl border border-gray-100">
                        <div className="flex border-b border-gray-100 bg-gray-50">
                            <button onClick={() => setPathaoTab('create')} className={`flex-1 px-3 py-3 text-sm font-black ${pathaoTab === 'create' ? 'bg-white text-red-600' : 'text-gray-500'}`}>
                                <Truck size={16} className="mr-2 inline" /> Create Pathao Shop
                            </button>
                            <button onClick={() => setPathaoTab('link')} className={`flex-1 px-3 py-3 text-sm font-black ${pathaoTab === 'link' ? 'bg-white text-indigo-600' : 'text-gray-500'}`}>
                                <LinkIcon size={16} className="mr-2 inline" /> Link Existing Account
                            </button>
                        </div>

                        {pathaoTab === 'create' ? (
                            <form onSubmit={handleCreatePathao} className="space-y-4 p-5">
                                <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800">
                                    <Info size={16} className="mr-2 inline" /> Use this if you want Scaleup to create a Pathao pickup shop for this store.
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <input required name="contact_name" value={createData.contact_name} onChange={e => setCreateData({ ...createData, contact_name: e.target.value })} className={inputClass} placeholder="Contact person name" />
                                    <input required name="contact_number" value={createData.contact_number} onChange={e => setCreateData({ ...createData, contact_number: e.target.value })} className={inputClass} placeholder="017XXXXXXXX" minLength="11" maxLength="11" />
                                </div>
                                <textarea required name="address" value={createData.address} onChange={e => setCreateData({ ...createData, address: e.target.value })} className={inputClass} placeholder="Full pickup address" rows={2} />
                                <div className="grid gap-4 md:grid-cols-3">
                                    <select required name="city_id" value={createData.city_id} onChange={e => setCreateData({ ...createData, city_id: e.target.value, zone_id: '', area_id: '' })} className={inputClass}>
                                        <option value="">Select city</option>
                                        {cities.map(city => <option key={city.city_id} value={city.city_id}>{city.city_name}</option>)}
                                    </select>
                                    <select required name="zone_id" value={createData.zone_id} onChange={e => setCreateData({ ...createData, zone_id: e.target.value, area_id: '' })} disabled={!createData.city_id} className={inputClass}>
                                        <option value="">Select zone</option>
                                        {zones.map(zone => <option key={zone.zone_id} value={zone.zone_id}>{zone.zone_name}</option>)}
                                    </select>
                                    <select required name="area_id" value={createData.area_id} onChange={e => setCreateData({ ...createData, area_id: e.target.value })} disabled={!createData.zone_id} className={inputClass}>
                                        <option value="">Select area</option>
                                        {areas.map(area => <option key={area.area_id} value={area.area_id}>{area.area_name}</option>)}
                                    </select>
                                </div>
                                <button type="submit" disabled={saving} className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">Create Pathao Shop</button>
                            </form>
                        ) : (
                            <form onSubmit={handleLinkPathao} className="space-y-4 p-5">
                                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-800">
                                    <ShieldCheck size={16} className="mr-2 inline" /> Credentials are stored server-side and are never shown back in the admin panel.
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <input required name="client_id" value={linkData.client_id} onChange={e => setLinkData({ ...linkData, client_id: e.target.value })} className={inputClass} placeholder="Client ID" />
                                    <input required type="password" name="client_secret" value={linkData.client_secret} onChange={e => setLinkData({ ...linkData, client_secret: e.target.value })} className={inputClass} placeholder="Client Secret" />
                                    <input required type="email" name="username" value={linkData.username} onChange={e => setLinkData({ ...linkData, username: e.target.value })} className={inputClass} placeholder="Pathao login email" />
                                    <input required type="password" name="password" value={linkData.password} onChange={e => setLinkData({ ...linkData, password: e.target.value })} className={inputClass} placeholder="Pathao password" />
                                    <input required name="store_id" value={linkData.store_id} onChange={e => setLinkData({ ...linkData, store_id: e.target.value })} className={inputClass} placeholder="Pathao store ID" />
                                </div>
                                <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm font-bold text-gray-700">
                                    <input type="checkbox" checked={linkData.isLive} onChange={e => setLinkData({ ...linkData, isLive: e.target.checked })} />
                                    Live production credentials
                                </label>
                                <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">Link Pathao Account</button>
                            </form>
                        )}
                    </div>
                )}
            </ProviderCard>

            <ProviderCard
                icon={MapPin}
                name="RedX Courier"
                description="Connect your RedX merchant token and pickup store. RedX delivery area and area ID are entered when creating each parcel."
                configured={couriers.redx?.configured}
                enabled={couriers.redx?.enabled}
                isDefault={couriers.defaultCourier === 'redx'}
                details={[
                    { label: 'Pickup store ID', value: couriers.redx?.pickupStoreId },
                    { label: 'Pickup store name', value: couriers.redx?.pickupStoreName },
                    { label: 'Pickup address', value: couriers.redx?.pickupAddress },
                    { label: 'Area', value: [couriers.redx?.pickupAreaName, couriers.redx?.pickupAreaId].filter(Boolean).join(' · ') },
                    { label: 'Token', value: couriers.redx?.maskedToken }
                ]}
                actions={[
                    couriers.redx?.configured && couriers.defaultCourier !== 'redx' ? (
                        <button key="default" onClick={() => setDefaultCourier('redx')} disabled={saving} className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Set default</button>
                    ) : null,
                    <button key="edit" onClick={() => setShowRedxForm(prev => !prev)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
                        {couriers.redx?.configured ? 'Edit' : 'Configure'}
                    </button>,
                    couriers.redx?.configured ? (
                        <button key="delete" onClick={handleDisconnectRedx} disabled={saving} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                            <Trash2 size={13} className="mr-1 inline" /> Disconnect
                        </button>
                    ) : null
                ]}
            >
                {showRedxForm && (
                    <div className="mt-5 space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-5">
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                            <Info size={16} className="mr-2 inline" />
                            RedX area lookup is available through their OpenAPI. Search by district or post code to find area IDs.
                        </div>

                        {!couriers.redx?.configured && (
                            <div className="flex rounded-xl border border-gray-200 bg-white p-1">
                                <button type="button" onClick={() => setRedxMode('existing')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-black ${redxMode === 'existing' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>
                                    Use existing pickup store
                                </button>
                                <button type="button" onClick={() => setRedxMode('create')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-black ${redxMode === 'create' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>
                                    Create pickup store
                                </button>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-black uppercase tracking-wide text-gray-500">
                                RedX API token {couriers.redx?.configured ? '(leave blank to keep current token)' : ''}
                            </label>
                            <input type="password" required={!couriers.redx?.configured} value={redxData.token} onChange={e => setRedxData({ ...redxData, token: e.target.value })} className={inputClass} placeholder="Paste RedX token" />
                        </div>

                        {redxMode === 'existing' || couriers.redx?.configured ? (
                            <form onSubmit={handleSaveRedx} className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <input required value={redxData.pickupStoreId} onChange={e => setRedxData({ ...redxData, pickupStoreId: e.target.value })} className={inputClass} placeholder="Pickup store ID" />
                                    <input value={redxData.pickupStoreName} onChange={e => setRedxData({ ...redxData, pickupStoreName: e.target.value })} className={inputClass} placeholder="Pickup store name" />
                                    <input value={redxData.pickupAreaName} onChange={e => setRedxData({ ...redxData, pickupAreaName: e.target.value })} className={inputClass} placeholder="Pickup area name" />
                                    <input value={redxData.pickupAreaId} onChange={e => setRedxData({ ...redxData, pickupAreaId: e.target.value })} className={inputClass} placeholder="Pickup area ID" />
                                    <textarea value={redxData.pickupAddress} onChange={e => setRedxData({ ...redxData, pickupAddress: e.target.value })} className={`${inputClass} md:col-span-2`} placeholder="Pickup address" rows={2} />
                                </div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                    <input type="checkbox" checked={redxData.enabled} onChange={e => setRedxData({ ...redxData, enabled: e.target.checked })} />
                                    Enable RedX for order parcel creation
                                </label>
                                <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">
                                    {saving ? 'Saving...' : 'Save RedX Courier'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleCreateRedxPickupStore} className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <input required value={redxPickupData.name} onChange={e => setRedxPickupData({ ...redxPickupData, name: e.target.value })} className={inputClass} placeholder="Pickup store name" />
                                    <input required value={redxPickupData.phone} onChange={e => setRedxPickupData({ ...redxPickupData, phone: e.target.value })} className={inputClass} placeholder="Pickup phone, e.g. 017..." />
                                    <textarea required value={redxPickupData.address} onChange={e => setRedxPickupData({ ...redxPickupData, address: e.target.value })} className={`${inputClass} md:col-span-2`} placeholder="Pickup address" rows={2} />
                                </div>

                                <div className="rounded-xl border border-gray-200 bg-white p-4">
                                    <p className="text-xs font-black uppercase tracking-wide text-gray-500">Find RedX pickup area</p>
                                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                                        <input value={redxAreaSearch.districtName} onChange={e => setRedxAreaSearch({ ...redxAreaSearch, districtName: e.target.value })} className={inputClass} placeholder="District name, e.g. Dhaka" />
                                        <input value={redxAreaSearch.postCode} onChange={e => setRedxAreaSearch({ ...redxAreaSearch, postCode: e.target.value })} className={inputClass} placeholder="Post code, e.g. 1207" />
                                        <button type="button" onClick={handleSearchRedxAreas} disabled={redxAreaLoading} className="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-black text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
                                            {redxAreaLoading ? 'Searching...' : 'Search'}
                                        </button>
                                    </div>
                                    {redxAreaResults.length > 0 && (
                                        <select
                                            value={redxPickupData.areaId}
                                            onChange={e => {
                                                const area = redxAreaResults.find(item => String(item.id) === e.target.value);
                                                setRedxPickupData({
                                                    ...redxPickupData,
                                                    areaId: e.target.value,
                                                    areaName: area?.name || ''
                                                });
                                            }}
                                            className={`${inputClass} mt-3`}
                                        >
                                            <option value="">Select RedX area</option>
                                            {redxAreaResults.map(area => (
                                                <option key={area.id} value={area.id}>
                                                    {area.name} · {area.post_code} · {area.division_name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    {redxPickupData.areaName && (
                                        <p className="mt-2 text-xs font-bold text-green-700">Selected: {redxPickupData.areaName}</p>
                                    )}
                                </div>

                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                    <input type="checkbox" checked={redxData.enabled} onChange={e => setRedxData({ ...redxData, enabled: e.target.checked })} />
                                    Enable RedX for order parcel creation
                                </label>
                                <button type="submit" disabled={saving || !redxPickupData.areaId} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">
                                    {saving ? 'Creating...' : 'Create RedX Pickup Store'}
                                </button>
                            </form>
                        )}
                    </div>
                )}
            </ProviderCard>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-500">
                <CheckCircle size={16} className="mr-2 inline text-green-600" />
                Orders can use Pathao or RedX when configured. If both are active, the order screen defaults to your selected courier.
            </div>
        </div>
    );
};

export default ShippingSettings;
