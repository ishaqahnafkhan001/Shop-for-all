"use client";
import React, { useState, useCallback, memo } from 'react';
import Link from 'next/link';
import API from '@/api/api';
import { MessageSquare, User, Star } from 'lucide-react';
import { StarRow } from './ProductInfo';

/* ─── Single review card ─────────────────────────────────────── */
const ReviewCard = memo(function ReviewCard({ review }) {
    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 font-bold uppercase">
                        {review.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">{review.name}</h4>
                        <span className="text-xs text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric', month: 'long', day: 'numeric',
                            })}
                        </span>
                    </div>
                </div>
                <StarRow rating={review.rating} size={14} />
            </div>
            <p className="text-gray-700 leading-relaxed">{review.comment}</p>
        </div>
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
            <div className="text-center py-8">
                <User size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 mb-4">Log in to submit a review and share your thoughts.</p>
                <Link
                    href={`/${subdomain}/account`}
                    className="inline-block bg-[var(--sf-accent)] text-white px-6 py-2.5 rounded-full font-bold shadow-md hover:-translate-y-0.5 transition-all"
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rating</label>
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setNewReview(r => ({ ...r, rating: star }))}
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Comment</label>
                <textarea
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[var(--sf-accent)] focus:border-[var(--sf-accent)] outline-none transition-all resize-none"
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
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
        </form>
    );
});

/* ─── Full section (form + list) ─────────────────────────────── */
const ReviewSection = memo(function ReviewSection({ subdomain, id, isLoggedIn, reviews, onReviewSuccess }) {
    return (
        <div className="mt-24 pt-16 border-t border-gray-100">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-10 flex items-center tracking-tight">
                <MessageSquare className="mr-4 text-[var(--sf-accent)]" size={32} />
                Customer Reviews
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Form */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Write a Review</h3>
                        <ReviewForm
                            subdomain={subdomain}
                            id={id}
                            isLoggedIn={isLoggedIn}
                            onSuccess={onReviewSuccess}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="lg:col-span-2">
                    {reviews.length > 0 ? (
                        <div className="space-y-6">
                            {reviews.map(review => <ReviewCard key={review._id} review={review} />)}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                            <MessageSquare size={48} className="text-gray-300 mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">No reviews yet</h3>
                            <p className="text-gray-500 text-center max-w-sm">Be the first to share your experience!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default ReviewSection;