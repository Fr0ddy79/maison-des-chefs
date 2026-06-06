/**
 * Parse dietary restrictions and allergies from free-text special requests.
 * Returns structured arrays for storage in bookings table.
 */

export interface ParsedDietary {
  dietary_restrictions: string[]
  allergies: string[]
}

// Keywords for dietary restrictions (general preferences)
const DIETARY_KEYWORDS = [
  'vegan', 'vegetarian', 'gluten-free', 'gluten free', 'gf',
  'dairy-free', 'dairy free', 'lactose-free', 'lactose free',
  'kosher', 'halal', 'pescatarian', 'keto', 'paleo',
  'low-carb', 'low carb', 'sugar-free', 'sugar free',
  'organic', 'whole30', 'mediterranean',
  'diabetic', 'low-sodium', 'low sodium', 'nut-free', 'nut free',
]

// Keywords for allergies (more severe, specific)
const ALLERGY_KEYWORDS = [
  'nut allergy', 'nuts allergy', 'peanut allergy', 'peanuts allergy',
  'tree nut allergy', 'tree nuts allergy', 'almond allergy', 'cashew allergy',
  'shellfish allergy', 'shrimp allergy', 'crab allergy', 'lobster allergy',
  'dairy allergy', 'lactose allergy', 'milk allergy',
  'egg allergy', 'eggs allergy',
  'soy allergy', 'soybean allergy',
  'wheat allergy', 'gluten allergy',
  'fish allergy', 'seafood allergy',
  'sesame allergy', 'mustard allergy',
  'peanut', 'peanuts', 'nuts', 'nut', 'tree nuts',
  'shellfish', 'shrimp', 'crab', 'lobster',
  'milk', 'dairy', 'lactose',
  'eggs', 'egg',
  'soy', 'wheat', 'gluten',
  'fish', 'seafood', 'sesame', 'mustard',
]

/**
 * Normalize a dietary keyword to a canonical form.
 */
function normalizeDietary(keyword: string): string {
  const map: Record<string, string> = {
    'gluten free': 'gluten-free',
    'gf': 'gluten-free',
    'dairy free': 'dairy-free',
    'lactose free': 'lactose-free',
    'low carb': 'low-carb',
    'sugar free': 'sugar-free',
    'low sodium': 'low-sodium',
    'nut free': 'nut-free',
  }
  return map[keyword.toLowerCase()] || keyword.toLowerCase()
}

/**
 * Normalize an allergy keyword to a canonical form.
 */
function normalizeAllergy(keyword: string): string {
  const map: Record<string, string> = {
    'peanuts': 'peanut allergy',
    'nuts': 'nut allergy',
    'nut': 'nut allergy',
    'tree nuts': 'tree nut allergy',
    'shellfish': 'shellfish allergy',
    'shrimp': 'shellfish allergy',
    'crab': 'shellfish allergy',
    'lobster': 'shellfish allergy',
    'dairy': 'dairy allergy',
    'lactose': 'lactose allergy',
    'milk': 'milk allergy',
    'eggs': 'egg allergy',
    'egg': 'egg allergy',
    'soy': 'soy allergy',
    'wheat': 'wheat allergy',
    'gluten': 'gluten allergy',
    'fish': 'fish allergy',
    'seafood': 'seafood allergy',
  }
  return map[keyword.toLowerCase()] || keyword.toLowerCase()
}

/**
 * Parse special requests text and extract dietary restrictions and allergies.
 * Returns structured data with deduplicated, canonical values.
 */
export function parseDietaryFromText(text: string | null | undefined): ParsedDietary {
  if (!text || typeof text !== 'string') {
    return { dietary_restrictions: [], allergies: [] }
  }

  const lowerText = text.toLowerCase()

  // Find dietary restrictions
  const foundDietary = new Set<string>()
  for (const keyword of DIETARY_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      foundDietary.add(normalizeDietary(keyword))
    }
  }

  // Find allergies (check these after dietary since some keywords overlap)
  const foundAllergies = new Set<string>()
  for (const keyword of ALLERGY_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      foundAllergies.add(normalizeAllergy(keyword))
    }
  }

  return {
    dietary_restrictions: Array.from(foundDietary).sort(),
    allergies: Array.from(foundAllergies).sort(),
  }
}
