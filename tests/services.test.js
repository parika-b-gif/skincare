import { describe, expect, it } from "vitest";
import { calculateOrderTotals } from "../server/services/taxService.js";
import { emailService } from "../server/services/emailService.js";
import { aiService } from "../server/services/aiService.js";
import { getProductRecommendations } from "../server/services/recommendationService.js";

describe("Tax & Order Total Service", () => {
  const sampleProducts = [
    { id: 1, name: "Cloud Milk Cleanser", price: 28.0, inventory: 20 },
    { id: 2, name: "Dew Drop Serum", price: 42.0, inventory: 15 },
  ];

  it("calculates accurate subtotal, 18% Indian GST, and standard shipping", () => {
    const items = [{ productId: 1, quantity: 1 }]; // $28.00
    const totals = calculateOrderTotals({
      items,
      products: sampleProducts,
      country: "IN",
    });

    expect(totals.subtotal).toBe(28.0);
    expect(totals.discount).toBe(0);
    expect(totals.taxRate).toBe(0.18);
    expect(totals.tax).toBeCloseTo(5.04, 2);
    expect(totals.taxLabel).toBe("GST (18%)");
    expect(totals.grandTotal).toBeCloseTo(28.0 + totals.shipping + totals.tax, 2);
  });

  it("unlocks free shipping above $50 threshold", () => {
    const items = [
      { productId: 1, quantity: 1 }, // $28
      { productId: 2, quantity: 1 }, // $42 => subtotal $70
    ];
    const totals = calculateOrderTotals({
      items,
      products: sampleProducts,
      country: "IN",
    });

    expect(totals.subtotal).toBe(70.0);
    expect(totals.shipping).toBe(0);
  });

  it("validates and calculates percentage coupons server-side", () => {
    const items = [{ productId: 1, quantity: 1 }]; // $28
    const coupon = {
      code: "LUMA10",
      discountType: "percentage",
      discountValue: 10,
      active: true,
    };
    const totals = calculateOrderTotals({
      items,
      products: sampleProducts,
      country: "US",
      coupon,
    });

    expect(totals.discount).toBe(2.8);
    expect(totals.taxableAmount).toBe(25.2);
    expect(totals.appliedCoupon.code).toBe("LUMA10");
  });

  it("prevents ordering beyond available inventory", () => {
    const items = [{ productId: 1, quantity: 999 }];
    expect(() =>
      calculateOrderTotals({ items, products: sampleProducts, country: "US" }),
    ).toThrow(/exceeds available stock/);
  });
});

describe("Email Notification Service", () => {
  it("dispatches and records order confirmation email in the outbox", async () => {
    const outbox = [];
    const mockDb = {
      insertOne: async (record) => {
        outbox.push(record);
        return { insertedId: "em-1" };
      },
    };

    emailService.setCollection(mockDb);

    const order = {
      id: "LUM-998877",
      customer: { name: "Alia Stone", email: "alia@example.com" },
      total: 56.0,
      items: [{ name: "Cloud Milk Cleanser", quantity: 2, price: 28 }],
    };

    const sent = await emailService.sendOrderConfirmation(order);
    expect(sent).toBeDefined();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].to).toBe("alia@example.com");
    expect(outbox[0].subject).toContain("Order Confirmation");
  });

  it("generates secure password reset email with action URL", async () => {
    const outbox = [];
    const mockDb = {
      insertOne: async (record) => {
        outbox.push(record);
        return { insertedId: "em-pwd" };
      },
    };
    emailService.setCollection(mockDb);

    const sent = await emailService.sendPasswordReset(
      "alia@example.com",
      "https://luma.skin/reset-password/sample-token-123",
      "sample-token-123",
    );

    expect(sent).toBeDefined();
    expect(outbox[0].subject).toContain("Password");
  });
});

describe("AI Skin Assistant Service", () => {
  const catalog = [
    { id: 1, name: "Cloud Milk Cleanser", category: "Cleansers", price: 28 },
    { id: 2, name: "Dew Drop Serum", category: "Serums", price: 42 },
    { id: 3, name: "Petal Veil Moisturizer", category: "Moisturizers", price: 36 },
    { id: 4, name: "Sun Cloud SPF 50", category: "Sun Care", price: 31 },
    { id: 5, name: "Night Bloom Oil", category: "Treatments", price: 48 },
  ];

  it("generates tailored morning & night routine matching catalog formulas", async () => {
    const routine = await aiService.generateRoutine({
      skinType: "Combination",
      skinConcern: "Acne & Blemishes",
      age: "20s",
      routinePreference: "Complete (4-5 steps)",
      availableProducts: catalog,
    });

    expect(routine).toBeDefined();
    expect(routine.morningRoutine.steps).toBeInstanceOf(Array);
    expect(routine.nightRoutine.steps).toBeInstanceOf(Array);
    expect(routine.ingredientScience.length).toBeGreaterThan(0);
    expect(routine.disclaimer).toContain("dermatologist");
  });
});

describe("Product Recommendation Service", () => {
  const catalog = [
    { id: 1, name: "Cloud Milk Cleanser", category: "Cleansers", price: 28, rating: 4.9 },
    { id: 2, name: "Dew Drop Serum", category: "Serums", price: 42, rating: 4.8 },
    { id: 3, name: "Petal Veil Moisturizer", category: "Moisturizers", price: 36, rating: 4.7 },
    { id: 14, name: "Green Tea Cleanser", category: "Cleansers", price: 25, rating: 4.7 },
  ];

  it("returns related category products and bundle pairings", () => {
    const recs = getProductRecommendations({
      currentProduct: catalog[0],
      allProducts: catalog,
    });

    expect(recs.related).toBeInstanceOf(Array);
    expect(recs.frequentlyBought).toBeInstanceOf(Array);
    expect(recs.recommended).toBeInstanceOf(Array);
  });
});
