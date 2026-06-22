"use client";
import React, { useState, useCallback, memo } from 'react';
import Link from 'next/link';
import API from '@/api/api';
import { MessageSquare, User, Star } from 'lucide-react';
import { StarRow } from './ProductInfo';

const formatReviewDate = (date) => new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
}).format(new Date(date));

/* ─── Single review card ─────────────────────────────────────── */
const ReviewCard = memo(function ReviewCard({ review }) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
            <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-black uppercase text-slate-600">
                        {review.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <h4 className="font-black text-slate-950">{review.name}</h4>
                        <span className="text-xs text-slate-500">
                            {formatReviewDate(review.createdAt)}
                        </span>
                    </div>
                </div>
                <StarRow rating={review.rating} size={14} />
            </div>
            <p className="leading-6 text-slate-700">{review.comment}</p>
        </article>
    );
});

/* ─── Write-a-review form ────────────────────────────────────── */
const ReviewForm = memo(function ReviewForm({ subdomain, id, isLoggedIn, onSuccess }) {
    const [newReview,   setNewReview]   = useState({ rating: 0, comment: '' });
    const [submitting,  setSubmitting]  = useState(false);
    const [message,     setMessage]     = useState({ type: '', text: '' });

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (newReview.rating === 0) { setMessage({ type: 'error', text: 'Please select a star rating.' }); return; }
        if (!newReview.comment.trim()) { setMessage({ type: 'error', text: 'Please write a comment.' }); return; }

        setSubmitting(true);
        setMessage({ type: '', text: '' });
        try {
            await API.post(`/storefront/${subdomain}/products/${id}/reviews`, {
                rating : newReview.rating,
                comment: newReview.comment,
            });
            setMessage({ type: 'success', text: 'Review submitted successfully!' });
            setNewReview({ rating: 0, comment: '' });
            onSuccess?.();
        } catch (err) {
            setMessage({
                type: 'error',
                text: err.response?.data?.message || 'Failed to submit. You may have already reviewed this item.',
            });
        } finally {
            setSubmitting(false);
        }
    }, [newReview, subdomain, id, onSuccess]);

    if (!isLoggedIn) {
        return (
            <div className="py-8 text-center">
                <User size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="mb-4 text-slate-600">Log in to submit a review and share your thoughts.</p>
                <Link
                    href={`/${subdomain}/account`}
                    className="sf-btn sf-btn-primary"
                >
                    Log In / Register
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Star picker */}
            <div>
                <p className="mb-2 block text-sm font-bold text-slate-700">Rating</p>
                <div className="flex gap-2" role="radiogroup" aria-label="Review rating">
                    {[1, 2, 3, 4, 5].map(star => (
                        <button
                            key={star}
                            type="button"
                            role="radio"
                            onClick={() => setNewReview(r => ({ ...r, rating: star }))}
                            aria-label={`${star} star${star === 1 ? '' : 's'}`}
                            aria-checked={newReview.rating === star}
                            className="focus:outline-none transition-transform hover:scale-110"
                        >
                            <Star
                                size={28}
                                className={newReview.rating >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                            />
                        </button>
                    ))}
                </div>
            </div>

            {/* Comment */}
            <div>
                <label htmlFor="product-review-comment" className="mb-2 block text-sm font-bold text-slate-700">Comment</label>
                <textarea
                    id="product-review-comment"
                    rows={4}
                    className="sf-field resize-none"
                    placeholder="Share your experience with this product..."
                    value={newReview.comment}
                    onChange={e => setNewReview(r => ({ ...r, comment: e.target.value }))}
                />
            </div>

            {message.text && (
                <p className={`text-sm font-medium ${message.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                    {message.text}
                </p>
            )}

            <button
                type="submit"
                disabled={submitting}
                className="sf-btn sf-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
            >
                {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
        </form>
    );
});

/* ─── Full section (form + list) ─────────────────────────────── */
const ReviewSection = memo(function ReviewSection({ subdomain, id, isLoggedIn, reviews, onReviewSuccess }) {
    return (
        <section className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 sm:p-6 lg:p-7">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="sf-kicker">Social proof</p>
                    <h2 className="mt-1 flex items-center text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                        <MessageSquare className="mr-3 text-[var(--sf-accent)]" size={28} />
                        Customer Reviews
                    </h2>
                </div>
                <p className="text-sm font-semibold text-slate-500">
                    {reviews.length} review{reviews.length === 1 ? '' : 's'}
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <h3 className="mb-5 text-xl font-black text-slate-950">Write a Review</h3>
                        <ReviewForm
                            subdomain={subdomain}
                            id={id}
                            isLoggedIn={isLoggedIn}
                            onSuccess={onReviewSuccess}
                        />
                    </div>
                </div>

                <div className="lg:col-span-2">
                    {reviews.length > 0 ? (
                        <div className="space-y-4">
                            {reviews.map(review => <ReviewCard key={review._id} review={review} />)}
                        </div>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
                            <MessageSquare size={48} className="mb-4 text-slate-300" />
                            <h3 className="mb-2 text-xl font-black text-slate-950">No reviews yet</h3>
                            <p className="max-w-sm text-slate-500">Be the first to share your experience and help future customers buy with confidence.</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
});

export default ReviewSection;
