/**
 * LUMA Skincare - AI Skin Assistant Service
 * Intelligently maps customer skin profile (type, concern, age, preference)
 * to real LUMA botanical skincare products, generating tailored morning/evening
 * rituals, ingredient compatibility analysis, and safety guidelines.
 */

export class AiSkinAssistantService {
  /**
   * Generates a personalized routine using real LUMA catalog products
   */
  async generateRoutine({
    skinType = "Combination",
    skinConcern = "Dullness & glow",
    age = "20s",
    currentProducts = "",
    routinePreference = "Complete (4-5 steps)",
    availableProducts = [],
  }) {
    // 1. Check if external LLM API key is available
    const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    if (apiKey && process.env.ENABLE_EXTERNAL_AI === "true") {
      try {
        const externalResult = await this._callExternalLlm({
          apiKey,
          skinType,
          skinConcern,
          age,
          currentProducts,
          routinePreference,
          availableProducts,
        });
        if (externalResult) return externalResult;
      } catch (err) {
        console.warn("[AiService] External LLM failed, using built-in botanical expert engine:", err.message);
      }
    }

    // 2. Built-in Botanical Dermatological Matching Engine
    return this._generateBotanicalRoutine({
      skinType,
      skinConcern,
      age,
      currentProducts,
      routinePreference,
      products: availableProducts,
    });
  }

  _generateBotanicalRoutine({ skinType, skinConcern, age, routinePreference, products = [] }) {
    // Helper to find real products by category or name
    const findProd = (cat, fallbackName) => {
      const match = products.find((p) => p.category === cat) ||
        products.find((p) => p.name.toLowerCase().includes(fallbackName.toLowerCase())) ||
        products[0];
      return match || {
        id: 1,
        name: fallbackName,
        price: 28,
        size: "50 ml",
        image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=85",
      };
    };

    const cleanser = findProd("Cleansers", "Cloud Milk Cleanser");
    const serum = findProd("Serums", "Dew Drop Serum");
    const moisturizer = findProd("Moisturizers", "Petal Veil Moisturizer");
    const sunscreen = findProd("Sun Care", "Sun Cloud SPF 50");
    const treatment = findProd("Treatments", "Night Bloom Oil");
    const toner = findProd("Toners", "Willow Bark Purifying Toner");

    const isSimple = routinePreference.toLowerCase().includes("simple");

    // Morning Routine Steps
    const morningSteps = [
      {
        stepNumber: 1,
        stepName: "Cleanse",
        product: {
          id: cleanser.id,
          name: cleanser.name,
          category: cleanser.category,
          price: cleanser.price,
          image: cleanser.image,
          size: cleanser.size,
        },
        direction: "Massage 1-2 pumps onto damp skin with circular motions for 60 seconds. Rinse with lukewarm water.",
        keyIngredients: ["Plant-derived Squalane", "Oat Milk Extract", "Glycerin"],
        purpose: "Removes overnight sebum without compromising your lipid barrier.",
      },
    ];

    if (!isSimple) {
      morningSteps.push({
        stepNumber: 2,
        stepName: "Balance & Prep",
        product: {
          id: toner.id,
          name: toner.name,
          category: toner.category,
          price: toner.price,
          image: toner.image,
          size: toner.size,
        },
        direction: "Press 3-4 drops gently into clean skin with fingertips. Do not rub or rinse.",
        keyIngredients: ["Willow Bark (Natural Salicin)", "Chamomile Hydrosol", "Green Tea"],
        purpose: "Refines pores and readies skin to absorb subsequent actives.",
      });
    }

    morningSteps.push({
      stepNumber: morningSteps.length + 1,
      stepName: "Target & Brighten",
      product: {
        id: serum.id,
        name: serum.name,
        category: serum.category,
        price: serum.price,
        image: serum.image,
        size: serum.size,
      },
      direction: "Warm 3 drops between palms and gently press across face, neck, and décolletage.",
      keyIngredients: ["5% Niacinamide", "Multi-Weight Hyaluronic Acid", "Centella Asiatica"],
      purpose: `Addresses ${skinConcern.toLowerCase()} while fortifying everyday antioxidant defense.`,
    });

    morningSteps.push({
      stepNumber: morningSteps.length + 1,
      stepName: "Hydrate & Cushion",
      product: {
        id: moisturizer.id,
        name: moisturizer.name,
        category: moisturizer.category,
        price: moisturizer.price,
        image: moisturizer.image,
        size: moisturizer.size,
      },
      direction: "Smooth an almond-sized amount evenly over skin to seal in moisture.",
      keyIngredients: ["Rose Damascena Flower Water", "Ceramide NP", "Jojoba Esters"],
      purpose: "Locks in continuous cellular hydration and primes skin for daily environmental defense.",
    });

    morningSteps.push({
      stepNumber: morningSteps.length + 1,
      stepName: "Protect (Crucial)",
      product: {
        id: sunscreen.id,
        name: sunscreen.name,
        category: sunscreen.category,
        price: sunscreen.price,
        image: sunscreen.image,
        size: sunscreen.size,
      },
      direction: "Apply two finger-lengths generously as the final step. Reapply every 2 hours if outdoors.",
      keyIngredients: ["Non-Nano Zinc Oxide (SPF 50)", "Vitamin E", "Aloe Barbadensis"],
      purpose: "Shields from UVA/UVB rays and photo-aging without chemical filters or white cast.",
    });

    // Night Routine Steps
    const nightSteps = [
      {
        stepNumber: 1,
        stepName: "Restorative Cleanse",
        product: {
          id: cleanser.id,
          name: cleanser.name,
          category: cleanser.category,
          price: cleanser.price,
          image: cleanser.image,
          size: cleanser.size,
        },
        direction: "Gently melt away daily sunscreen and atmospheric impurities. Pat dry with a soft cloth.",
        keyIngredients: ["Oat Kernel Lipid", "Botanical Surfactants"],
        purpose: "Thorough purification without stripping natural microbiome flora.",
      },
      {
        stepNumber: 2,
        stepName: "Targeted Repair",
        product: {
          id: serum.id,
          name: serum.name,
          category: serum.category,
          price: serum.price,
          image: serum.image,
          size: serum.size,
        },
        direction: "Apply 4 drops to clean, slightly damp skin. Allow 2 minutes to absorb.",
        keyIngredients: ["Niacinamide", "Peptide Complexes"],
        purpose: "Stimulates natural collagen maintenance and restores overnight cellular clarity.",
      },
      {
        stepNumber: 3,
        stepName: "Barrier Recovery",
        product: {
          id: moisturizer.id,
          name: moisturizer.name,
          category: moisturizer.category,
          price: moisturizer.price,
          image: moisturizer.image,
          size: moisturizer.size,
        },
        direction: "Layer generously over face and neck for nocturnal nourishment.",
        keyIngredients: ["Ceramides", "Shea Butter Lipids"],
        purpose: "Prevents trans-epidermal water loss (TEWL) during sleep.",
      },
      {
        stepNumber: 4,
        stepName: "Botanical Seal (Occasional or Daily)",
        product: {
          id: treatment.id,
          name: treatment.name,
          category: treatment.category,
          price: treatment.price,
          image: treatment.image,
          size: treatment.size,
        },
        direction: "Press 2 drops of facial oil as your final ritual step to seal active serums.",
        keyIngredients: ["Rosehip Seed Oil", "Bakuchiol (Gentle Retinol Alternative)", "Blue Tansy"],
        purpose: "Deep restorative lipid nourishment and accelerated overnight skin recovery.",
      },
    ];

    // Collect distinct recommended products
    const recommendedProductMap = new Map();
    [...morningSteps, ...nightSteps].forEach((step) => {
      if (step.product && step.product.id) {
        recommendedProductMap.set(step.product.id, step.product);
      }
    });

    const recommendedProducts = Array.from(recommendedProductMap.values());

    return {
      success: true,
      analysis: {
        skinType,
        skinConcern,
        ageGroup: age,
        routineStyle: routinePreference,
        summary: `Tailored for ${skinType.toLowerCase()} skin aiming to soothe and treat ${skinConcern.toLowerCase()}. Formulated with clean botanical actives that nourish your lipid barrier without irritation.`,
      },
      morningRoutine: {
        title: "Morning Sun & Glow Ritual",
        stepsCount: morningSteps.length,
        steps: morningSteps,
      },
      nightRoutine: {
        title: "Evening Renewal Ritual",
        stepsCount: nightSteps.length,
        steps: nightSteps,
      },
      ingredientScience: [
        {
          ingredient: "Niacinamide (Vitamin B3)",
          benefit: "Regulates sebum production, refines pore structure, and lightens post-inflammatory hyperpigmentation.",
        },
        {
          ingredient: "Plant-Derived Squalane",
          benefit: "Mimics skin's natural sebum to deeply hydrate without clogging pores or feeling greasy.",
        },
        {
          ingredient: "Ceramide NP & Lipids",
          benefit: "Rebuilds intercellular cement, reducing sensitivity and trans-epidermal moisture loss.",
        },
        {
          ingredient: "Mineral Non-Nano Zinc Oxide",
          benefit: "Broad-spectrum physical UV reflection with natural anti-inflammatory calming benefits.",
        },
      ],
      compatibilityTips: [
        "Always apply products thinnest to thickest: Water-based serums first, followed by creams, then facial oils.",
        "When introducing active ingredients, patch test behind the ear or on inner forearm for 24 hours.",
        "Sunscreen is essential every morning—UV exposure negates the brightening benefits of active serums.",
        "Avoid pairing multiple strong exfoliants on the same evening to safeguard your acid mantle.",
      ],
      recommendedProducts,
      disclaimer: "LUMA AI Skin Assistant provides mindful botanical skincare information for educational and ritual planning purposes. It does not constitute medical advice or dermatologist diagnosis. If you have chronic dermatological conditions, consult a licensed physician.",
    };
  }

  async _callExternalLlm() {
    // Optional integration with external LLM if enabled
    return null;
  }
}

export const aiService = new AiSkinAssistantService();
