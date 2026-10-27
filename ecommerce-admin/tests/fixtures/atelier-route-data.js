// Synthetic data for isolated Atelier route tests; never imported by application code.
export const fixtureProducts = [{
  _id: 'aaaaaaaaaaaaaaaaaaaaaaa1',
  slug: 'merchant-object',
  title: 'Merchant ceramic vessel',
  category: 'Objects',
  description: 'A merchant-authored description with useful product facts. This is synthetic test content.',
  sellingPrice: 1200,
  finalPrice: 1080,
  discount: 10,
  stock: 5,
  totalStock: 5,
  averageRating: 4.5,
  numReviews: 1,
  images: ['/tests/fixtures/theme-media.svg', '/tests/fixtures/theme-media.svg?angle=2'],
  features: [{
    point: 'Material',
    reason: 'Seller-confirmed ceramic'
  }],
  specifications: [{
    title: 'Height',
    value: '24 cm'
  }],
  comments: [{
    title: 'Care',
    value: 'Wipe with a soft cloth.'
  }],
  variantsLoaded: true,
  variantCount: 2,
  variants: [{
    _id: 'bbbbbbbbbbbbbbbbbbbbbbb1',
    sku: 'MCH-NAT',
    barcode: 'TEST-01',
    isActive: true,
    stock: 5,
    priceOverride: 1200,
    image: '/tests/fixtures/theme-media.svg',
    attributes: [{
      name: 'Finish',
      value: 'Natural'
    }]
  }, {
    _id: 'bbbbbbbbbbbbbbbbbbbbbbb2',
    sku: 'MCH-ZERO',
    isActive: true,
    stock: 2,
    priceOverride: 0,
    image: '/tests/fixtures/theme-media.svg?angle=2',
    attributes: [{
      name: 'Finish',
      value: 'Studio edition'
    }]
  }]
}, {
  _id: 'aaaaaaaaaaaaaaaaaaaaaaa2',
  slug: 'merchant-bowl',
  title: 'Merchant everyday bowl',
  category: 'Objects',
  description: 'Synthetic merchant bowl.',
  sellingPrice: 850,
  finalPrice: 850,
  stock: 8,
  totalStock: 8,
  images: ['/tests/fixtures/theme-media.svg'],
  variants: [],
  variantsLoaded: true
}, {
  _id: 'aaaaaaaaaaaaaaaaaaaaaaa3',
  slug: 'merchant-tray',
  title: 'Merchant tray',
  category: 'Objects',
  sellingPrice: 600,
  finalPrice: 600,
  stock: 0,
  totalStock: 0,
  images: [],
  variants: [],
  variantsLoaded: true
}, {
  _id: 'aaaaaaaaaaaaaaaaaaaaaaa4',
  slug: 'merchant-edit',
  title: 'Merchant studio edit',
  category: 'Objects',
  sellingPrice: 1500,
  finalPrice: 1500,
  stock: 4,
  totalStock: 4,
  images: ['/tests/fixtures/theme-media.svg'],
  variants: [],
  variantsLoaded: true
}];
export const fixtureReviews = [{
  _id: 'review-fixture',
  name: 'Test customer',
  rating: 4,
  comment: 'Synthetic review, not a real customer endorsement.',
  createdAt: '2026-01-10T12:00:00Z'
}];
export const fixtureCustomer = {
  _id: 'ccccccccccccccccccccccc1',
  fullName: 'Test customer',
  email: 'customer@example.test',
  role: 'Customer'
};
export const fixtureOrder = {
  _id: 'ddddddddddddddddddddddd1',
  status: 'Confirmed',
  createdAt: '2026-01-10T12:00:00Z',
  canCancel: true,
  returnEligibility: {
    canRequestReturn: false
  },
  shippingAddress: {
    fullName: 'Test customer',
    phone: '01700000000',
    address: 'Synthetic test address',
    city: 'Inside Dhaka'
  },
  payment: {
    method: 'COD',
    status: 'Pending'
  },
  pricing: {
    subtotal: 1080,
    shipping: 80,
    total: 1160
  },
  items: [{
    productId: 'aaaaaaaaaaaaaaaaaaaaaaa1',
    title: 'Merchant ceramic vessel',
    quantity: 1,
    price: 1080,
    imageUrl: '/tests/fixtures/theme-media.svg',
    variantId: 'bbbbbbbbbbbbbbbbbbbbbbb1',
    variant: {
      attributes: [{
        name: 'Finish',
        value: 'Natural'
      }]
    }
  }],
  timeline: [{
    status: 'Confirmed',
    message: 'Synthetic order confirmed event',
    date: '2026-01-10T12:00:00Z'
  }]
};
