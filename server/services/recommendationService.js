/**
 * LUMA Skincare - Product Recommendation Service
 * Powers "You May Also Like", "Recommended For You", and "Frequently Bought Together"
 * using catalog categories, price affinity, and skin ritual pairings.
 */

export function getProductRecommendations({ currentProduct, allProducts = [], limit = 4 }) {
  if (!allProducts || !allProducts.length) return { related: [], frequentlyBought: [], recommended: [] };

  const currentId = currentProduct ? Number(currentProduct.id) : null;
  const currentCategory = currentProduct?.category;
  const otherProducts = allProducts.filter((p) => p.id !== currentId);

  // 1. "You May Also Like" (same category or closest price match)
  const related = [...otherProducts]
    .sort((a, b) => {
      const aSameCat = a.category === currentCategory ? 1 : 0;
      const bSameCat = b.category === currentCategory ? 1 : 0;
      if (aSameCat !== bSameCat) return bSameCat - aSameCat;
      return (b.rating || 4.5) - (a.rating || 4.5);
    })
    .slice(0, limit);

  // 2. "Frequently Bought Together" (cleanser + serum + moisturizer pairings)
  const complementaryCategories = {
    Cleansers: ["Toners", "Serums", "Moisturizers"],
    Toners: ["Cleansers", "Serums"],
    Serums: ["Moisturizers", "Sun Care", "Treatments"],
    Moisturizers: ["Sun Care", "Treatments", "Serums"],
    "Sun Care": ["Cleansers", "Moisturizers"],
    Treatments: ["Cleansers", "Moisturizers"],
  };

  const targetCats = complementaryCategories[currentCategory] || ["Serums", "Moisturizers", "Cleansers"];
  const frequentlyBought = otherProducts
    .filter((p) => targetCats.includes(p.category))
    .sort((a, b) => (b.reviews || 0) - (a.reviews || 0))
    .slice(0, 3);

  // 3. "Recommended For You" (top-rated popular staples)
  const recommended = [...otherProducts]
    .sort((a, b) => (b.rating || 0) * (b.reviews || 1) - (a.rating || 0) * (a.reviews || 1))
    .slice(0, limit);

  return {
    related,
    frequentlyBought,
    recommended,
  };
}
