import { Product } from '../../types/payment';

/**
 * Server-authoritative product catalog.
 * Strict pricing rule: Every single item resolves to exactly 100 cents ($1.00 USD).
 * The client CANNOT specify or alter pricing.
 */
export const SERVER_PRODUCTS: Record<string, Product> = {
  product_001: {
    id: 'product_001',
    name: 'Cloud Micro Compute (1 Hr)',
    description: 'High-speed isolated serverless runtime compute credit.',
    price: 100,
    currency: 'usd',
    features: ['Instant provisioning', 'Dedicated virtual CPU', 'TLS encryption'],
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  product_002: {
    id: 'product_002',
    name: 'Developer API Pass (100 Calls)',
    description: 'Direct high-throughput access to developer endpoints.',
    price: 100,
    currency: 'usd',
    features: ['Low latency access', '99.99% SLA guarantee', 'Real-time telemetry'],
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  product_003: {
    id: 'product_003',
    name: 'Pro Priority Support Ticket',
    description: 'Priority queue ticket for architectural and code review.',
    price: 100,
    currency: 'usd',
    features: ['Sub-1-hour triage', 'Senior engineer assignment', 'Direct Slack invite'],
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  product_004: {
    id: 'product_004',
    name: 'Global Edge CDN Token',
    description: 'Fast edge-caching credit across 300+ global PoPs.',
    price: 100,
    currency: 'usd',
    features: ['Anycast routing', 'Zero cold-start caching', 'Automated SSL certs'],
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
};

/**
 * Server lookup helper.
 * Validates product existence and enforces immutable 100 cents USD price.
 */
export function getProductById(productId: string): Product | null {
  const product = SERVER_PRODUCTS[productId];
  if (!product || !product.active) {
    return null;
  }
  // Enforce server authority guarantee:
  return {
    ...product,
    price: 100,
    currency: 'usd',
  };
}

export function getAllActiveProducts(): Product[] {
  return Object.values(SERVER_PRODUCTS).filter((p) => p.active);
}
