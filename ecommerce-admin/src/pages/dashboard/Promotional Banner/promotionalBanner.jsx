import { useEffect, useMemo, useRef, useState } from 'react';
import {
    CalendarClock,
    Check,
    CheckCircle2,
    ChevronRight,
    Clock3,
    Eye,
    EyeOff,
    Image as ImageIcon,
    ImagePlus,
    Layers3,
    Link2,
    Loader2,
    Megaphone,
    Monitor,
    PackageSearch,
    RefreshCcw,
    Search,
    Smartphone,
    Sparkles,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import API from '../../../api/api.js';
import { getBrowserTimeZoneLabel, localDateTimeToUtcIso } from '../../../utils/dateTime.js';

const inputClassName =
    'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const formatDateTime = (value) => {
    if (!value) return 'Not scheduled';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Invalid date';

    return date.toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
};

const getBannerStatus = (banner, now = Date.now()) => {
    if (!banner.isActive) return { label: 'Hidden', tone: 'bg-slate-900/75' };
    if (banner.startsAt && new Date(banner.startsAt).getTime() > now) {
        return { label: 'Scheduled', tone: 'bg-indigo-600/90' };
    }
    if (banner.endsAt && new Date(banner.endsAt).getTime() <= now) {
        return { label: 'Ended', tone: 'bg-slate-900/75' };
    }
    if (
        banner.type === 'scheduled_product' &&
        banner.postLaunchBehavior === 'hide_on_publish' &&
        banner.scheduledProduct?.status === 'Published' &&
        banner.scheduledProduct?.isActive
    ) {
        return { label: 'Ended', tone: 'bg-slate-900/75' };
    }
    return { label: 'Showing', tone: 'bg-emerald-600/90' };
};

const SectionHeading = ({ icon: Icon, title, description, badge }) => (
    <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100">
                <Icon className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-950 sm:text-base">{title}</h2>
                {description && <p className="mt-0.5 text-xs leading-5 text-slate-500 sm:text-sm">{description}</p>}
            </div>
        </div>
        {badge && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {badge}
            </span>
        )}
    </div>
);

const FieldLabel = ({ children, optional = false }) => (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 sm:text-sm">
        {children}
        {optional && <span className="font-normal text-slate-400">Optional</span>}
    </span>
);

const FilePill = ({ file, onRemove }) => (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <ImageIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-700">{file.name}</p>
            <p className="text-[10px] text-slate-400">{Math.max(file.size / 1024 / 1024, 0.01).toFixed(2)} MB</p>
        </div>
        <button
            type="button"
            onClick={onRemove}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            aria-label={`Remove ${file.name}`}
        >
            <X className="h-3.5 w-3.5" />
        </button>
    </div>
);

const UploadZone = ({
                        title,
                        description,
                        hint,
                        files,
                        onChange,
                        onRemove,
                        icon: Icon,
                        required = false,
                        accent = 'indigo',
                    }) => {
    const accentClasses = accent === 'violet'
        ? 'group-hover:border-violet-300 group-hover:bg-violet-50/50 text-violet-600 bg-violet-50 ring-violet-100'
        : 'group-hover:border-indigo-300 group-hover:bg-indigo-50/50 text-indigo-600 bg-indigo-50 ring-indigo-100';

    return (
        <div className="space-y-3">
            <div>
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{title}</p>
                    {required && (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600">
                            Required
                        </span>
                    )}
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
            </div>

            <label className="group block cursor-pointer">
                <div className={`flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-6 text-center transition group-focus-within:outline group-focus-within:outline-2 group-focus-within:outline-offset-2 group-focus-within:outline-indigo-500 ${accentClasses}`}>
                    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-inset ring-slate-200/80">
                        <Icon className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-semibold text-slate-800">
                        {files.length ? `${files.length} image${files.length === 1 ? '' : 's'} selected` : 'Choose banner images'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{hint}</p>
                    <p className="mt-1 text-[11px] text-slate-400">JPG, PNG or WebP · 10 MB maximum per image</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200">
                        <Upload className="h-3.5 w-3.5" />
                        Browse files
                    </span>
                </div>
                <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onChange} />
            </label>

            {files.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                    {files.map((file, index) => (
                        <FilePill
                            key={`${file.name}-${file.lastModified}-${index}`}
                            file={file}
                            onRemove={() => onRemove(index)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const Toggle = ({ checked, onChange, label, description }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/30 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
        aria-pressed={checked}
    >
        <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-800">{label}</span>
            {description && <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>}
        </span>
        <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}>
            <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </span>
    </button>
);

const EmptyState = () => (
    <div className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white">
        <div className="relative px-6 py-14 text-center sm:py-16">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-indigo-50/80 to-transparent" />
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-inset ring-indigo-100">
                <ImagePlus className="h-6 w-6" />
            </div>
            <h3 className="relative mt-4 text-base font-semibold text-slate-900">Your storefront is ready for its first campaign</h3>
            <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Create a banner above with a focused message, responsive artwork, and a destination that helps shoppers take action.
            </p>
            <a href="#promotional-banner-form" className="relative mt-5 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20">
                Create a banner
            </a>
        </div>
    </div>
);

const PromotionalBanner = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [busyBannerId, setBusyBannerId] = useState(null);
    const [now, setNow] = useState(() => Date.now());

    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [link, setLink] = useState('');
    const [type, setType] = useState('standard');
    const [scheduledProduct, setScheduledProduct] = useState(null);
    const [productSearch, setProductSearch] = useState('');
    const [productOptions, setProductOptions] = useState([]);
    const [productLoading, setProductLoading] = useState(false);
    const [countdownEnabled, setCountdownEnabled] = useState(true);
    const [postLaunchBehavior, setPostLaunchBehavior] = useState('convert_to_product');
    const [postLaunchCtaText, setPostLaunchCtaText] = useState('View product');
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [desktopImages, setDesktopImages] = useState([]);
    const [mobileImages, setMobileImages] = useState([]);
    const [previewDevice, setPreviewDevice] = useState('desktop');
    const [previewUrls, setPreviewUrls] = useState({ desktop: '', mobile: '' });
    const previewUrlsRef = useRef({ desktop: '', mobile: '' });

    const browserTimeZone = getBrowserTimeZoneLabel();
    const isScheduledLaunch = type === 'scheduled_product';

    const showingBannerCount = useMemo(
        () => banners.filter((banner) => getBannerStatus(banner, now).label === 'Showing').length,
        [banners, now],
    );

    const launchBannerCount = useMemo(
        () => banners.filter((banner) => banner.type === 'scheduled_product').length,
        [banners],
    );

    const startTime = startsAt ? new Date(startsAt).getTime() : null;
    const endTime = endsAt ? new Date(endsAt).getTime() : null;
    const publishTime = scheduledProduct?.publishAt ? new Date(scheduledProduct.publishAt).getTime() : null;
    const startError = isScheduledLaunch && startsAt && publishTime && startTime >= publishTime
        ? 'The banner must start before the product publishes.'
        : '';
    const endError = startsAt && endsAt && endTime <= startTime
        ? 'End time must be after start time.'
        : isScheduledLaunch && postLaunchBehavior === 'keep_until_end' && publishTime && (!endsAt || endTime <= publishTime)
            ? 'To remain visible, choose an end time after the product publishes.'
            : '';

    const fetchBanners = async () => {
        setLoading(true);
        try {
            const res = await API.get('/banners');
            const bannerData = Array.isArray(res.data) ? res.data : res.data.data;
            setBanners(bannerData || []);
            setLoadError(false);
        } catch (err) {
            console.error('Error fetching banners:', err);
            setLoadError(true);
            toast.error('Could not load banners. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(fetchBanners, 0);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => () => {
        Object.values(previewUrlsRef.current).forEach((url) => {
            if (url) URL.revokeObjectURL(url);
        });
    }, []);

    useEffect(() => {
        if (!isScheduledLaunch) return undefined;

        let cancelled = false;
        const timer = setTimeout(async () => {
            setProductLoading(true);
            try {
                const { data } = await API.get('/admin/products', {
                    params: {
                        search: productSearch || undefined,
                        status: 'Draft',
                        page: 1,
                        limit: 8,
                        sort: 'nameAsc',
                    },
                });

                if (!cancelled) {
                    setProductOptions(
                        (data.data || []).filter((product) => product.publicationStatus === 'scheduled'),
                    );
                }
            } catch {
                if (!cancelled) setProductOptions([]);
            } finally {
                if (!cancelled) setProductLoading(false);
            }
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [isScheduledLaunch, productSearch]);

    const setFilePreview = (target, file) => {
        const previousUrl = previewUrlsRef.current[target];
        if (previousUrl) URL.revokeObjectURL(previousUrl);

        const url = file ? URL.createObjectURL(file) : '';
        previewUrlsRef.current[target] = url;
        setPreviewUrls((current) => ({ ...current, [target]: url }));
    };

    const handleFileChange = (event, target) => {
        const selectedFiles = Array.from(event.target.files || []);
        if (!selectedFiles.length) return;

        if (selectedFiles.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
            toast.error('Choose JPG, PNG or WebP images.');
            event.target.value = '';
            return;
        }

        if (selectedFiles.some((file) => file.size > 10 * 1024 * 1024)) {
            toast.error('Each banner image must be 10 MB or smaller.');
            event.target.value = '';
            return;
        }

        if (selectedFiles.length > 5) {
            toast.error('You can upload a maximum of 5 banner images.');
        }

        const nextFiles = selectedFiles.slice(0, 5);
        if (target === 'mobile') setMobileImages(nextFiles);
        else setDesktopImages(nextFiles);
        setFilePreview(target, nextFiles[0]);

        event.target.value = '';
    };

    const removeSelectedFile = (target, index) => {
        const setter = target === 'mobile' ? setMobileImages : setDesktopImages;
        const files = target === 'mobile' ? mobileImages : desktopImages;
        const nextFiles = files.filter((_, fileIndex) => fileIndex !== index);
        setter(nextFiles);
        if (index === 0) setFilePreview(target, nextFiles[0]);
    };

    const resetForm = () => {
        setTitle('');
        setSubtitle('');
        setLink('');
        setType('standard');
        setScheduledProduct(null);
        setProductSearch('');
        setProductOptions([]);
        setCountdownEnabled(true);
        setPostLaunchBehavior('convert_to_product');
        setPostLaunchCtaText('View product');
        setStartsAt('');
        setEndsAt('');
        setDesktopImages([]);
        setMobileImages([]);
        setFilePreview('desktop', null);
        setFilePreview('mobile', null);
        setPreviewDevice('desktop');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (desktopImages.length === 0) {
            toast.error('Select at least one desktop banner image before uploading.');
            return;
        }

        if (isScheduledLaunch) {
            if (!scheduledProduct?._id) {
                toast.error('Select a scheduled product for this launch banner.');
                return;
            }
            if (mobileImages.length === 0) {
                toast.error('Select a mobile banner image for launch countdown banners.');
                return;
            }
            if (!startsAt) {
                toast.error('Set when the launch banner should start showing.');
                return;
            }
        }

        if (startError || endError) {
            toast.error(startError || endError);
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('title', title);
        formData.append('subtitle', subtitle);
        formData.append('link', link);
        formData.append('type', type);

        if (isScheduledLaunch) {
            formData.append('scheduledProduct', scheduledProduct._id);
            formData.append('countdownEnabled', countdownEnabled ? 'true' : 'false');
            formData.append('postLaunchBehavior', postLaunchBehavior);
            formData.append('postLaunchCtaText', postLaunchCtaText);
        }

        if (startsAt) formData.append('startsAt', localDateTimeToUtcIso(startsAt));
        if (endsAt) formData.append('endsAt', localDateTimeToUtcIso(endsAt));

        desktopImages.forEach((file) => formData.append('desktopImages', file));
        mobileImages.forEach((file) => formData.append('mobileImages', file));

        try {
            await API.post('/banners', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            resetForm();
            await fetchBanners();
            toast.success('Banner created successfully.');
        } catch (err) {
            console.error('Upload error:', err);
            toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this banner? It will disappear from your storefront.')) return;

        setBusyBannerId(id);
        try {
            await API.delete(`/banners/${id}`);
            setBanners((current) => current.filter((banner) => banner._id !== id));
            toast.success('Banner deleted from storefront.');
        } catch (err) {
            console.error('Delete error:', err);
            toast.error('Failed to delete banner.');
        } finally {
            setBusyBannerId(null);
        }
    };

    const handleToggleStatus = async (id) => {
        setBusyBannerId(id);
        try {
            const res = await API.patch(`/banners/${id}/toggle`);
            const updatedBanner = res.data.data || res.data;
            setBanners((current) => current.map((banner) => (
                banner._id === id ? updatedBanner : banner
            )));
            const status = getBannerStatus(updatedBanner);
            toast.success(updatedBanner.isActive
                ? status.label === 'Showing'
                    ? 'Banner is now showing on your storefront.'
                    : `Banner enabled. Current status: ${status.label.toLowerCase()}.`
                : 'Banner hidden from your storefront.');
        } catch (err) {
            console.error('Toggle error:', err);
            toast.error('Failed to update banner status.');
        } finally {
            setBusyBannerId(null);
        }
    };

    return (
        <div className="min-h-full bg-slate-50/70">
            <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
                <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-7 sm:py-7">
                    <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-indigo-100/70 blur-3xl" />
                    <div className="pointer-events-none absolute right-28 top-14 h-28 w-28 rounded-full bg-violet-100/70 blur-2xl" />

                    <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-2xl">
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-700">
                                <Sparkles className="h-3.5 w-3.5" />
                                Storefront campaigns
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                                Promotional banners
                            </h1>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
                                Build campaign moments that feel intentional on every screen. Manage launch countdowns, responsive artwork, visibility windows, and shopper destinations from one place.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:min-w-[430px]">
                            {[
                                { label: 'Total', value: banners.length, icon: Layers3 },
                                { label: 'Showing', value: showingBannerCount, icon: Eye },
                                { label: 'Launches', value: launchBannerCount, icon: CalendarClock },
                            ].map(({ label, value, icon: Icon }) => (
                                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-xs">{label}</p>
                                        <Icon className="h-3.5 w-3.5 text-slate-400" />
                                    </div>
                                    <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </header>

                <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.55fr)]">
                    <form id="promotional-banner-form" onSubmit={handleSubmit} className="space-y-5">
                        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                            <SectionHeading
                                icon={Megaphone}
                                title="Campaign essentials"
                                description="Start with the banner purpose and the message shoppers will see."
                                badge="01"
                            />

                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                <label className="block md:col-span-2">
                                    <FieldLabel>Banner type</FieldLabel>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setType('standard');
                                                setScheduledProduct(null);
                                            }}
                                            className={`group rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-4 focus:ring-indigo-500/10 ${
                                                type === 'standard'
                                                    ? 'border-indigo-300 bg-indigo-50/70 ring-1 ring-inset ring-indigo-100'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                            aria-pressed={type === 'standard'}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${type === 'standard' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                    <Megaphone className="h-4 w-4" />
                                                </span>
                                                {type === 'standard' && <CheckCircle2 className="h-5 w-5 text-indigo-600" />}
                                            </div>
                                            <p className="mt-3 text-sm font-semibold text-slate-900">Standard campaign</p>
                                            <p className="mt-1 text-xs leading-5 text-slate-500">Promote collections, offers, seasonal campaigns, or any storefront destination.</p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setType('scheduled_product');
                                                setScheduledProduct(null);
                                            }}
                                            className={`group rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-4 focus:ring-violet-500/10 ${
                                                isScheduledLaunch
                                                    ? 'border-violet-300 bg-violet-50/70 ring-1 ring-inset ring-violet-100'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                            aria-pressed={isScheduledLaunch}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${isScheduledLaunch ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                    <CalendarClock className="h-4 w-4" />
                                                </span>
                                                {isScheduledLaunch && <CheckCircle2 className="h-5 w-5 text-violet-600" />}
                                            </div>
                                            <p className="mt-3 text-sm font-semibold text-slate-900">Scheduled product launch</p>
                                            <p className="mt-1 text-xs leading-5 text-slate-500">Build anticipation with a launch countdown and automatically transition after publication.</p>
                                        </button>
                                    </div>
                                </label>

                                <label className="block">
                                    <FieldLabel>Campaign title</FieldLabel>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(event) => setTitle(event.target.value)}
                                        className={inputClassName}
                                        placeholder="e.g. Eid Collection 2026"
                                        title="Internal label for this banner campaign"
                                        required
                                    />
                                </label>

                                <label className="block">
                                    <FieldLabel optional>Subtitle</FieldLabel>
                                    <input
                                        type="text"
                                        value={subtitle}
                                        onChange={(event) => setSubtitle(event.target.value)}
                                        className={inputClassName}
                                        placeholder="A short supporting campaign line"
                                    />
                                </label>

                                <label className="block md:col-span-2">
                                    <FieldLabel optional>Redirect destination</FieldLabel>
                                    <div className="relative">
                                        <Link2 className="pointer-events-none absolute left-3.5 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={link}
                                            onChange={(event) => setLink(event.target.value)}
                                            className={`${inputClassName} pl-10`}
                                            placeholder="/collections/eid-sale"
                                            title="Where shoppers go after clicking the banner"
                                            disabled={isScheduledLaunch}
                                        />
                                    </div>
                                    {isScheduledLaunch && (
                                        <p className="mt-1.5 text-xs text-violet-600">Launch banners link to the selected product automatically.</p>
                                    )}
                                </label>
                            </div>
                        </section>

                        {isScheduledLaunch && (
                            <section className="overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-sm">
                                <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 via-fuchsia-50/60 to-white p-4 sm:p-6">
                                    <SectionHeading
                                        icon={PackageSearch}
                                        title="Product launch setup"
                                        description="Connect this banner to a product that is already scheduled for future publication."
                                        badge="Launch"
                                    />
                                </div>

                                <div className="space-y-5 p-4 sm:p-6">
                                    <div>
                                        <FieldLabel>Select scheduled product</FieldLabel>
                                        <div className="relative mt-1.5">
                                            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="search"
                                                value={productSearch}
                                                onChange={(event) => setProductSearch(event.target.value)}
                                                className={`${inputClassName} mt-0 pl-10`}
                                                placeholder="Search scheduled products"
                                                aria-label="Search scheduled products"
                                            />
                                        </div>
                                    </div>

                                    {scheduledProduct && (
                                        <div className="flex flex-col gap-3 rounded-2xl border border-violet-200 bg-violet-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
                                                    <Check className="h-5 w-5" />
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-slate-900">{scheduledProduct.title}</p>
                                                    <p className="mt-0.5 text-xs text-violet-700">Launches {formatDateTime(scheduledProduct.publishAt)}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setScheduledProduct(null)}
                                                className="self-start rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-white sm:self-auto"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    )}

                                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                                        {productLoading ? (
                                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Finding scheduled products…
                                            </div>
                                        ) : productOptions.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center">
                                                <PackageSearch className="mx-auto h-5 w-5 text-slate-400" />
                                                <p className="mt-2 text-sm font-medium text-slate-700">No scheduled products found</p>
                                                <p className="mt-0.5 text-xs text-slate-500">Try another search or schedule a product first.</p>
                                            </div>
                                        ) : productOptions.map((product) => {
                                            const selected = scheduledProduct?._id === product._id;
                                            const image = product.coverMediaId || product.images?.[0];

                                            return (
                                                <button
                                                    key={product._id}
                                                    type="button"
                                                    onClick={() => setScheduledProduct(product)}
                                                    className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition focus:outline-none focus:ring-4 focus:ring-violet-500/10 ${
                                                        selected
                                                            ? 'border-violet-300 bg-violet-50 ring-1 ring-inset ring-violet-100'
                                                            : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/30'
                                                    }`}
                                                >
                                                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-inset ring-slate-200">
                                                        {image ? (
                                                            <img src={image} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                                                                <ImageIcon className="h-4 w-4" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold text-slate-900">{product.title}</p>
                                                        <p className="mt-0.5 text-xs text-slate-500">Publishes {formatDateTime(product.publishAt)}</p>
                                                    </div>
                                                    {selected ? (
                                                        <CheckCircle2 className="h-5 w-5 shrink-0 text-violet-600" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <Toggle
                                            checked={countdownEnabled}
                                            onChange={setCountdownEnabled}
                                            label="Show launch countdown"
                                            description="Create urgency before the product becomes public."
                                        />

                                        <label className="block rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                                            <FieldLabel>Post-launch CTA</FieldLabel>
                                            <input
                                                value={postLaunchCtaText}
                                                onChange={(event) => setPostLaunchCtaText(event.target.value)}
                                                className={`${inputClassName} mt-2`}
                                                placeholder="View product"
                                            />
                                        </label>
                                    </div>

                                    <label className="block">
                                        <FieldLabel>After the product launches</FieldLabel>
                                        <select
                                            value={postLaunchBehavior}
                                            onChange={(event) => setPostLaunchBehavior(event.target.value)}
                                            className={inputClassName}
                                        >
                                            <option value="convert_to_product">Convert to a normal product banner</option>
                                            <option value="hide_on_publish">Hide immediately after publication</option>
                                            <option value="keep_until_end">Remain visible until the banner end time</option>
                                        </select>
                                    </label>
                                </div>
                            </section>
                        )}

                        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                            <SectionHeading
                                icon={Clock3}
                                title="Visibility window"
                                description="Control when this campaign can appear on the storefront."
                                badge="02"
                            />

                            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                <label className="block">
                                    <FieldLabel optional={!isScheduledLaunch}>Show from</FieldLabel>
                                    <input
                                        type="datetime-local"
                                        value={startsAt}
                                        onChange={(event) => setStartsAt(event.target.value)}
                                        className={inputClassName}
                                        aria-invalid={Boolean(startError)}
                                        aria-describedby={startError ? 'banner-start-error' : undefined}
                                    />
                                    {startError && <span id="banner-start-error" className="mt-1.5 block text-xs font-medium text-rose-600">{startError}</span>}
                                </label>

                                <label className="block">
                                    <FieldLabel optional>Show until</FieldLabel>
                                    <input
                                        type="datetime-local"
                                        value={endsAt}
                                        onChange={(event) => setEndsAt(event.target.value)}
                                        className={inputClassName}
                                        aria-invalid={Boolean(endError)}
                                        aria-describedby={endError ? 'banner-end-error' : undefined}
                                    />
                                    {endError && <span id="banner-end-error" className="mt-1.5 block text-xs font-medium text-rose-600">{endError}</span>}
                                </label>
                            </div>

                            <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3.5 py-3 text-xs leading-5 text-slate-500 ring-1 ring-inset ring-slate-100">
                                <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                <span>Visibility times use <span className="font-semibold text-slate-700">{browserTimeZone}</span>. Leave both fields empty to show the banner immediately without an end date.</span>
                            </div>
                        </section>

                        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                            <SectionHeading
                                icon={ImagePlus}
                                title="Responsive artwork"
                                description="Give desktop and mobile shoppers artwork designed for their screen rather than forcing one crop everywhere."
                                badge="03"
                            />

                            <div className="mt-5 grid gap-6 lg:grid-cols-2">
                                <UploadZone
                                    title="Desktop artwork"
                                    description="Wide campaign visual for laptops, tablets, and larger screens."
                                    hint="Recommended 1600 × 600 px · up to 5 images"
                                    files={desktopImages}
                                    onChange={(event) => handleFileChange(event, 'desktop')}
                                    onRemove={(index) => removeSelectedFile('desktop', index)}
                                    icon={Monitor}
                                    required
                                />

                                <UploadZone
                                    title="Mobile artwork"
                                    description="Portrait-friendly creative that keeps the key message visible on smaller screens."
                                    hint="Recommended 900 × 1200 px · up to 5 images"
                                    files={mobileImages}
                                    onChange={(event) => handleFileChange(event, 'mobile')}
                                    onRemove={(index) => removeSelectedFile('mobile', index)}
                                    icon={Smartphone}
                                    required={isScheduledLaunch}
                                    accent="violet"
                                />
                            </div>
                        </section>

                        <div className="sticky bottom-3 z-20 xl:hidden">
                            <div className="rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl shadow-slate-900/10 backdrop-blur">
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                    {uploading ? 'Saving banner…' : 'Create banner'}
                                </button>
                            </div>
                        </div>
                    </form>

                    <aside className="space-y-5 xl:sticky xl:top-5">
                        <section className="hidden rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm xl:block">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-300">Ready to publish</p>
                                    <h2 className="mt-2 text-lg font-semibold">Campaign checklist</h2>
                                </div>
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                                    <Sparkles className="h-5 w-5 text-indigo-200" />
                                </span>
                            </div>

                            <div className="mt-5 space-y-2.5">
                                {[
                                    { done: Boolean(title.trim()), label: 'Campaign title added' },
                                    { done: desktopImages.length > 0, label: 'Desktop artwork selected' },
                                    { done: !isScheduledLaunch || Boolean(scheduledProduct?._id), label: 'Launch product connected' },
                                    { done: !isScheduledLaunch || mobileImages.length > 0, label: 'Mobile launch artwork selected' },
                                    { done: !isScheduledLaunch || Boolean(startsAt), label: 'Launch visibility start set' },
                                ].map((item) => (
                                    <div key={item.label} className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5">
                                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${item.done ? 'bg-emerald-400 text-slate-950' : 'bg-white/10 text-white/40'}`}>
                                            <Check className="h-3 w-3" />
                                        </span>
                                        <span className={`text-xs ${item.done ? 'text-white' : 'text-white/55'}`}>{item.label}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                type="submit"
                                form="promotional-banner-form"
                                disabled={uploading}
                                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-white/70"
                            >
                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                {uploading ? 'Saving banner…' : 'Create banner'}
                            </button>
                        </section>

                        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">Campaign preview</p>
                                    <p className="mt-0.5 text-xs text-slate-500">Review the first selected image for each screen.</p>
                                </div>
                                <Eye className="h-4 w-4 text-slate-400" />
                            </div>

                            <div className="mt-4 inline-flex w-full rounded-xl bg-slate-100 p-1" role="group" aria-label="Artwork preview device">
                                {[
                                    { id: 'desktop', label: 'Desktop', icon: Monitor },
                                    { id: 'mobile', label: 'Mobile', icon: Smartphone },
                                ].map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setPreviewDevice(id)}
                                        aria-pressed={previewDevice === id}
                                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${previewDevice === id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                <div className={`mx-auto flex items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-inset ring-slate-200 ${previewDevice === 'mobile' ? 'aspect-[3/4] max-h-80 max-w-60' : 'aspect-[16/6] w-full'}`}>
                                    {previewUrls[previewDevice] ? (
                                        <img
                                            src={previewUrls[previewDevice]}
                                            alt={`${previewDevice} banner artwork preview`}
                                            className="h-full w-full object-contain"
                                        />
                                    ) : (
                                        <div className="px-4 text-center text-slate-400">
                                            <ImagePlus className="mx-auto h-6 w-6" />
                                            <p className="mt-2 text-xs">Select {previewDevice} artwork to preview it here.</p>
                                        </div>
                                    )}
                                </div>
                                <p className="mt-2 text-center text-[11px] text-slate-500">Artwork preview only. Storefront text and cropping depend on your theme.</p>
                            </div>

                            <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                                <p className="truncate text-sm font-semibold text-slate-900">{title || 'Campaign title'}</p>
                                {subtitle && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{subtitle}</p>}
                                <p className="mt-2 truncate text-[11px] text-slate-500">
                                    {isScheduledLaunch
                                        ? scheduledProduct?.title || 'Select a launch product'
                                        : link || 'No redirect destination'}
                                </p>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    {startsAt ? `Starts ${formatDateTime(startsAt)}` : 'Starts immediately'}
                                </p>
                            </div>
                        </section>
                    </aside>
                </div>

                <section className="mt-7">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Storefront library</p>
                            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">Current banners</h2>
                            <p className="mt-1 text-sm text-slate-500">Review artwork, campaign state, and launch details at a glance.</p>
                        </div>
                        <button
                            type="button"
                            onClick={fetchBanners}
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
                        >
                            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>

                    {loadError && (
                        <div role="alert" className="mb-4 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-medium text-rose-800">Banners could not be refreshed. The list below may be out of date.</p>
                            <button type="button" onClick={fetchBanners} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100">
                                <RefreshCcw className="h-3.5 w-3.5" /> Retry
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {[0, 1, 2].map((item) => (
                                <div key={item} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <div className="aspect-[16/8] animate-pulse bg-slate-100" />
                                    <div className="space-y-3 p-4">
                                        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                                        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : loadError && banners.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center shadow-sm">
                            <p className="text-sm font-semibold text-slate-900">Your banners are unavailable right now</p>
                            <p className="mt-1 text-sm text-slate-500">Retry loading the list before creating or changing a campaign.</p>
                        </div>
                    ) : banners.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {banners.map((banner) => {
                                const desktopCount = banner.desktopImages?.length || banner.images?.length || 0;
                                const mobileCount = banner.mobileImages?.length || 0;
                                const coverImage = banner.desktopImages?.[0] || banner.images?.[0];
                                const isLaunch = banner.type === 'scheduled_product';
                                const status = getBannerStatus(banner, now);

                                return (
                                    <article
                                        key={banner._id}
                                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/5"
                                    >
                                        <div className="relative aspect-[16/8] overflow-hidden bg-slate-100">
                                            {coverImage ? (
                                                <img
                                                    src={coverImage}
                                                    alt={banner.title}
                                                    className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.02] ${!banner.isActive ? 'grayscale-[65%] opacity-65' : ''}`}
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 text-slate-300">
                                                    <ImageIcon className="h-9 w-9" />
                                                </div>
                                            )}

                                            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-sm backdrop-blur ${status.tone}`}>
                                                        {status.label === 'Showing' ? <Eye className="h-3 w-3" /> : status.label === 'Scheduled' ? <CalendarClock className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                                        {status.label}
                                                    </span>
                                                    {isLaunch && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-600/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-sm backdrop-blur">
                                                            <CalendarClock className="h-3 w-3" />
                                                            Launch
                                                        </span>
                                                    )}
                                                </div>

                                                {desktopCount > 1 && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/70 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm backdrop-blur">
                                                        <Layers3 className="h-3 w-3" />
                                                        {desktopCount}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent p-3 pt-12 text-white">
                                                <div className="flex items-center gap-2 text-[10px] font-medium text-white/80">
                                                    <span className="inline-flex items-center gap-1"><Monitor className="h-3 w-3" /> {desktopCount}</span>
                                                    <span className="inline-flex items-center gap-1"><Smartphone className="h-3 w-3" /> {mobileCount}</span>
                                                </div>
                                                {mobileCount > 0 && (
                                                    <span className="rounded-full bg-white/15 px-2 py-1 text-[9px] font-semibold backdrop-blur">Responsive</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="truncate text-sm font-bold text-slate-900" title={banner.title}>{banner.title}</h3>
                                                    {banner.subtitle && (
                                                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{banner.subtitle}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {isLaunch && banner.scheduledProduct && (
                                                <div className="mt-3 rounded-xl bg-violet-50 px-3 py-2.5 ring-1 ring-inset ring-violet-100">
                                                    <p className="truncate text-xs font-semibold text-violet-900">{banner.scheduledProduct.title}</p>
                                                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-violet-600">
                                                        <Clock3 className="h-3 w-3" />
                                                        {formatDateTime(banner.scheduledProduct.publishAt)}
                                                    </p>
                                                </div>
                                            )}

                                            {(banner.startsAt || banner.endsAt) && (
                                                <p className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-500">
                                                    {banner.startsAt && <span>From {formatDateTime(banner.startsAt)}</span>}
                                                    {banner.endsAt && <span>Until {formatDateTime(banner.endsAt)}</span>}
                                                </p>
                                            )}

                                            <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleStatus(banner._id)}
                                                    disabled={busyBannerId !== null}
                                                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition focus:outline-none focus:ring-4 ${
                                                        banner.isActive
                                                            ? 'text-amber-700 hover:bg-amber-50 focus:ring-amber-500/10'
                                                            : 'text-indigo-700 hover:bg-indigo-50 focus:ring-indigo-500/10'
                                                    } disabled:cursor-not-allowed disabled:opacity-50`}
                                                    title={banner.isActive ? 'Disable this banner' : 'Enable this banner (visibility dates still apply)'}
                                                >
                                                    {banner.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                    {banner.isActive ? 'Disable' : 'Enable'}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(banner._id)}
                                                    disabled={busyBannerId !== null}
                                                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 focus:outline-none focus:ring-4 focus:ring-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                                    title="Delete this banner permanently"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default PromotionalBanner;
