import { useState, useEffect } from 'react';
import { Truck, MapPin, CheckCircle, Info, Link as LinkIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../../api/api.js';

const ShippingSettings = () => {
    const [loading, setLoading] = useState(false);
    const [isLinked, setIsLinked] = useState(false);
    const [activeTab, setActiveTab] = useState('create'); // 'create' | 'link'

    // Form State: Create Platform Sub-store
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

    // Form State: Bring Your Own Credentials (BYOC)
    const [linkData, setLinkData] = useState({
        client_id: '',
        client_secret: '',
        username: '',
        password: '',
        store_id: '',
        isLive: true
    });

    // --- INITIAL DATA FETCH ---
    useEffect(() => {
        const fetchShopStatus = async () => {
            try {
                const { data } = await API.get('/admin/settings');
                if (data.data.pathaoStoreId) {
                    setIsLinked(true);
                }
            } catch (err) {
                console.error("Failed to fetch shop settings", err);
            }
        };

        const fetchCities = async () => {
            try {
                const { data } = await API.get('/admin/pathao/cities');
                setCities(data.data);
            } catch {
                toast.error('Failed to load Pathao cities');
            }
        };

        fetchShopStatus();
        fetchCities();
    }, []);

    // --- CASCADING DROPDOWNS ---
    useEffect(() => {
        if (!createData.city_id) {
            queueMicrotask(() => {
                setZones([]);
                setAreas([]);
            });
            return;
        }
        const fetchZones = async () => {
            try {
                const { data } = await API.get(`/admin/pathao/cities/${createData.city_id}/zones`);
                setZones(data.data);
            } catch (err) { console.error(err); }
        };
        fetchZones();
    }, [createData.city_id]);

    useEffect(() => {
        if (!createData.zone_id) {
            queueMicrotask(() => setAreas([]));
            return;
        }
        const fetchAreas = async () => {
            try {
                const { data } = await API.get(`/admin/pathao/zones/${createData.zone_id}/areas`);
                setAreas(data.data);
            } catch (err) { console.error(err); }
        };
        fetchAreas();
    }, [createData.zone_id]);

    // --- INPUT HANDLERS ---
    const handleCreateChange = (e) => setCreateData({ ...createData, [e.target.name]: e.target.value });
    const handleLinkChange = (e) => {
        const { name, value, type, checked } = e.target;
        setLinkData({ ...linkData, [name]: type === 'checkbox' ? checked : value });
    };

    // --- SUBMIT HANDLERS ---
    const handleCreateShop = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await API.post('/admin/settings/pathao-store', createData);
            toast.success(data.message || 'Pathao shop connected. You can now send confirmed orders to courier.');
            setIsLinked(true);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to connect to Pathao');
        } finally {
            setLoading(false);
        }
    };

    const handleLinkAccount = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await API.post('/admin/settings/pathao-link', linkData);
            toast.success(data.message || 'Pathao account linked. You can now send confirmed orders to courier.');
            setIsLinked(true);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to verify Pathao credentials');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full p-2.5 mt-1 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all";

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Shipping Settings</h1>
                <p className="mt-1 text-sm text-gray-500">Connect your courier account once, then send confirmed orders to delivery from the Orders page.</p>
            </div>

            {isLinked ? (
                /* SUCCESS STATE */
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-green-200 flex flex-col items-center text-center">
                    <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Pathao Courier Connected</h2>
                    <p className="text-gray-500 mt-2 max-w-md">
                        Your store is successfully linked to Pathao. Confirmed orders can now be sent to courier from the Orders page.
                    </p>
                </div>
            ) : (
                /* SETUP STATE */
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                    {/* TABS HEADER */}
                    <div className="flex border-b border-gray-100 bg-gray-50/50">
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`flex-1 py-4 font-bold text-sm flex items-center justify-center transition ${activeTab === 'create' ? 'text-red-600 border-b-2 border-red-600 bg-white' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <Truck size={18} className="mr-2" /> Create Pathao Shop
                        </button>
                        <button
                            onClick={() => setActiveTab('link')}
                            className={`flex-1 py-4 font-bold text-sm flex items-center justify-center transition ${activeTab === 'link' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <LinkIcon size={18} className="mr-2" /> Link Existing Account
                        </button>
                    </div>

                    {/* TAB 1: CREATE STORE */}
                    {activeTab === 'create' && (
                        <form onSubmit={handleCreateShop} className="p-6 space-y-5 animate-in fade-in duration-200">
                            <div className="bg-red-50 p-4 rounded-xl flex items-start text-sm text-red-800 border border-red-100">
                                <Info className="shrink-0 mr-3 mt-0.5" size={18} />
                                <p>Use this if you do not have your own Pathao merchant credentials. Enter the pickup address where delivery agents should collect parcels.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">Contact Person Name</label>
                                    <input required type="text" name="contact_name" value={createData.contact_name} onChange={handleCreateChange} className={inputClass} placeholder="e.g. Adi Rahman" title="Person courier agents should contact for pickup" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">Contact Number</label>
                                    <input required type="text" name="contact_number" value={createData.contact_number} onChange={handleCreateChange} className={inputClass} placeholder="017XXXXXXXX (11 digits)" minLength="11" maxLength="11" title="Use an active phone number for pickup calls" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700">Full Address</label>
                                <textarea required name="address" rows="2" value={createData.address} onChange={handleCreateChange} className={`${inputClass} resize-none`} placeholder="House, Road, Block, pickup instructions..." title="Add enough detail so riders can find your pickup location" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-gray-100 pt-5 mt-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 flex items-center mb-1">
                                        <MapPin size={14} className="mr-1 text-gray-400"/> City
                                    </label>
                                    <select required name="city_id" value={createData.city_id} onChange={handleCreateChange} className={inputClass}>
                                        <option value="">Select City...</option>
                                        {cities.map(city => <option key={city.city_id} value={city.city_id}>{city.city_name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Zone</label>
                                    <select required name="zone_id" value={createData.zone_id} onChange={handleCreateChange} disabled={!createData.city_id} className={inputClass}>
                                        <option value="">Select Zone...</option>
                                        {zones.map(zone => <option key={zone.zone_id} value={zone.zone_id}>{zone.zone_name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Area <span className="text-gray-400 font-normal">(Optional)</span>
                                    </label>
                                    <select name="area_id" value={createData.area_id} onChange={handleCreateChange} disabled={!createData.zone_id} className={inputClass}>
                                        <option value="">Select Area...</option>
                                        {areas.map(area => <option key={area.area_id} value={area.area_id}>{area.area_name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button type="submit" disabled={loading || !createData.zone_id} className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition disabled:opacity-50 shadow-md">
                                    {loading ? 'Registering Shop...' : 'Create Pathao Shop'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* TAB 2: LINK EXISTING ACCOUNT (BYOC) */}
                    {activeTab === 'link' && (
                        <form onSubmit={handleLinkAccount} className="p-6 space-y-5 animate-in fade-in duration-200">
                            <div className="bg-indigo-50 p-4 rounded-xl flex items-start text-sm text-indigo-800 border border-indigo-100">
                                <Info className="shrink-0 mr-3 mt-0.5" size={18} />
                                <p>Already have a Pathao Merchant account? Enter API credentials from your merchant dashboard. Keep these credentials private.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">Client ID</label>
                                    <input required type="text" name="client_id" value={linkData.client_id} onChange={handleLinkChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">Client Secret</label>
                                    <input required type="password" name="client_secret" value={linkData.client_secret} onChange={handleLinkChange} className={inputClass} title="Private API secret from Pathao" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">Pathao Login Email</label>
                                    <input required type="email" name="username" value={linkData.username} onChange={handleLinkChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">Pathao Password</label>
                                    <input required type="password" name="password" value={linkData.password} onChange={handleLinkChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">Pathao Store ID</label>
                                    <input required type="number" name="store_id" value={linkData.store_id} onChange={handleLinkChange} className={inputClass} placeholder="e.g. 12345" title="Pathao store ID that should receive orders" />
                                </div>
                            </div>

                            <div className="flex items-center mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition" onClick={() => setLinkData(prev => ({ ...prev, isLive: !prev.isLive }))}>
                                <input
                                    type="checkbox"
                                    id="isLive"
                                    name="isLive"
                                    checked={linkData.isLive}
                                    onChange={handleLinkChange}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                                />
                                <label htmlFor="isLive" className="ml-3 block text-sm text-gray-900 font-bold cursor-pointer">
                                    These are Live Production Credentials
                                    <span className="block text-xs font-normal text-gray-500 mt-0.5">Uncheck this if you are using a Sandbox/Test account.</span>
                                </label>
                            </div>

                            <div className="pt-4 flex justify-end border-t border-gray-100">
                                <button type="submit" disabled={loading} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-50 shadow-md">
                                    {loading ? 'Verifying...' : 'Link Account'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
};

export default ShippingSettings;
