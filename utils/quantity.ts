/**
 * Scale a recipe ingredient quantity string by a ratio.
 * Handles: "2", "1/4", "4 cuillères à soupe", "500 g", "1.5 kg", "Au goût", "15 à 20", etc.
 */
export function scaleQuantity(quantity: string, ratio: number): string {
  if (ratio === 1) return quantity;

  const trimmed = quantity.trim();

  // Non-scalable quantities
  const lower = trimmed.toLowerCase();
  if (lower === 'au goût' || lower === 'to taste' || lower === 'q.s.' || lower === '') {
    return trimmed;
  }

  // "15 à 20" or "2 to 3" → scale both numbers
  const rangeMatch = trimmed.match(/^([\d.,/]+)\s*(à|to|-)\s*([\d.,/]+)(.*)$/i);
  if (rangeMatch) {
    const low = scaleNumber(rangeMatch[1], ratio);
    const high = scaleNumber(rangeMatch[3], ratio);
    return `${low} ${rangeMatch[2]} ${high}${rangeMatch[4]}`;
  }

  // "4 cuillères à soupe", "500 g", "1,5 kg", "1/4 tasse", "2 pincées"
  const numUnitMatch = trimmed.match(/^(\d+[.,]\d+|\d+\/\d+|\d+)\s*(.*)$/);
  if (numUnitMatch) {
    const scaled = scaleNumber(numUnitMatch[1], ratio);
    const unit = numUnitMatch[2];
    return unit ? `${scaled} ${unit}` : scaled;
  }

  return trimmed;
}

function scaleNumber(str: string, ratio: number): string {
  const value = parseNumber(str);
  if (value === null) return str;

  const result = value * ratio;

  // Format nicely
  if (Number.isInteger(result)) return result.toString();
  // Keep one decimal max, remove trailing zero
  const rounded = Math.round(result * 10) / 10;
  if (Number.isInteger(rounded)) return rounded.toString();
  return rounded.toString().replace('.', ',');
}

function parseNumber(str: string): number | null {
  const trimmed = str.trim().replace(',', '.');

  // Fraction: "1/4", "3/2"
  const fracMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    return parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
  }

  // Mixed: not common in this dataset but handle "1 1/2" just in case
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  }

  const num = parseFloat(trimmed);
  return isNaN(num) ? null : num;
}
