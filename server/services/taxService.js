/**
 * LUMA Skincare - Tax & Order Total Calculation Service
 * Supports country-specific tax rules (including India 18% GST),
 * coupon discount validation, and shipping fee calculation.
 */

export const TAX_RATES = {
  IN: 0.18, // 18% GST (India)
  CA: 0.05, // 5% GST (Canada)
  GB: 0.20, // 20% VAT (UK)
  DE: 0.19, // 19% VAT (Germany)
  FR: 0.20, // 20% VAT (France)
  AU: 0.10, // 10% GST (Australia)
  JP: 0.10, // 10% Consumption Tax (Japan)
  US: 0.00, // Sales tax included / state-dependent (0% baseline)
};

export const SHIPPING_RATES = {
  US: 5,
  IN: 18,
  CA: 12,
  GB: 15,
  AU: 25,
  DE: 10,
  FR: 10,
  JP: 20,
};

export const FREE_SHIPPING_THRESHOLD = 50; // $50 or equivalent

/**
 * Calculates complete pricing breakdown on the server
 * @param {Object} params
 * @param {Array} params.items - Raw or normalized cart items
 * @param {Array} params.products - Products fetched from database
 * @param {string} params.country - 2-letter ISO country code (default 'US')
 * @param {Object|null} params.coupon - Optional coupon document
 */
export function calculateOrderTotals({ items = [], products = [], country = "US", coupon = null }) {
  const normCountry = (country || "US").toUpperCase();

  // 1. Calculate base subtotal using ONLY real database prices
  let subtotal = 0;
  const verifiedLineItems = [];

  for (const item of items) {
    const prodId = Number(item.productId || item.id);
    const product = products.find((p) => p.id === prodId);
    if (!product) {
      throw new Error(`Product with ID ${prodId} not found in catalog.`);
    }

    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const availableStock = typeof product.inventory === "number" ? product.inventory : 25;

    if (qty > availableStock) {
      throw new Error(`Requested quantity (${qty}) for "${product.name}" exceeds available stock (${availableStock}).`);
    }

    const unitPrice = Number(product.price);
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;

    verifiedLineItems.push({
      productId: product.id,
      name: product.name,
      price: unitPrice,
      quantity: qty,
      size: product.size || "Standard",
      image: product.image,
      total: lineTotal,
    });
  }

  // 2. Validate & apply coupon discount server-side
  let discount = 0;
  let appliedCoupon = null;

  if (coupon && coupon.active !== false) {
    const now = new Date();
    const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < now;
    const meetsMin = !coupon.minOrder || subtotal >= coupon.minOrder;

    if (!isExpired && meetsMin) {
      if (coupon.discountType === "percentage") {
        const pct = Math.min(100, Math.max(0, Number(coupon.discountValue) || 0));
        discount = (subtotal * pct) / 100;
      } else if (coupon.discountType === "fixed") {
        discount = Math.min(subtotal, Math.max(0, Number(coupon.discountValue) || 0));
      }

      appliedCoupon = {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        amount: Number(discount.toFixed(2)),
      };
    }
  }

  const taxableAmount = Math.max(0, subtotal - discount);

  // 3. Calculate tax (GST for India, etc.)
  const taxRate = TAX_RATES[normCountry] !== undefined ? TAX_RATES[normCountry] : 0;
  const tax = taxableAmount * taxRate;

  // 4. Calculate shipping
  const baseShippingRate = SHIPPING_RATES[normCountry] !== undefined ? SHIPPING_RATES[normCountry] : 5;
  const shipping = taxableAmount >= FREE_SHIPPING_THRESHOLD ? 0 : baseShippingRate;

  // 5. Grand total
  const grandTotal = taxableAmount + tax + shipping;

  return {
    lineItems: verifiedLineItems,
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    appliedCoupon,
    taxableAmount: Number(taxableAmount.toFixed(2)),
    taxRate,
    taxRatePercentage: `${(taxRate * 100).toFixed(0)}%`,
    tax: Number(tax.toFixed(2)),
    taxLabel: normCountry === "IN" ? "GST (18%)" : taxRate > 0 ? `Tax (${(taxRate * 100).toFixed(0)}%)` : "Tax (Included)",
    shipping: Number(shipping.toFixed(2)),
    country: normCountry,
    grandTotal: Number(grandTotal.toFixed(2)),
  };
}
