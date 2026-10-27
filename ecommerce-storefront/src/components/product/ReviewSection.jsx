"use client";
import API from '@/api/api';
import SharedReviewSection from '@scaleup/storefront-renderer/presentation/ReviewSection';
export default function ReviewSection(props) {
    return <SharedReviewSection {...props} accountHref="/account" onSubmitReview={review => API.post(`/storefront/${props.subdomain}/products/${props.id}/reviews`, review)} />;
}
