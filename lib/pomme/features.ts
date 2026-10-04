const on = (value: string | undefined, fallback: boolean) => (value === undefined ? fallback : value === 'true')

// NEXT_PUBLIC_* vars must be referenced literally so Next inlines them.
export const FEATURES = {
  paywallVisible: on(process.env.NEXT_PUBLIC_FEATURE_PAYWALL_VISIBLE, true),
  newsletterCapture: on(process.env.NEXT_PUBLIC_FEATURE_NEWSLETTER_CAPTURE, true),
  statsDashboard: on(process.env.NEXT_PUBLIC_FEATURE_STATS_DASHBOARD, false),
  groceryImportPaprika: on(process.env.NEXT_PUBLIC_FEATURE_GROCERY_IMPORT_PAPRIKA, false),
  groceryImportRecipeIo: on(process.env.NEXT_PUBLIC_FEATURE_GROCERY_IMPORT_RECIPEIO, false),
} as const
