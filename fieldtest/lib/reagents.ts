import { RgbColor } from './classifier';

export type ReagentKitId = 'marquis' | 'mecke' | 'scott' | 'mandelin';

export interface ReagentProfile {
  id: ReagentKitId;
  name: string;
  chemicalName: string;
  targetAnalytes: string[];
  baselineRgb: RgbColor;
  targetPositiveRgb: RgbColor;
  baselineDescription: string;
  targetDescription: string;
  thresholds: {
    baselineDepartureMin: number; // Delta E from blank to consider reaction
    targetConvergenceMax: number; // Delta E to target chromophore to consider positive
    ambiguousBandMin: number;     // Below this is negative, between this and baselineDepartureMin is inconclusive
  };
}

/**
 * Standard Forensic Reagent Profiles calibrated against NIJ Standard 0604.01
 * and Clarke's Analysis of Drugs and Poisons.
 */
export const REAGENT_PROFILES: Record<ReagentKitId, ReagentProfile> = {
  marquis: {
    id: 'marquis',
    name: 'Marquis Reagent',
    chemicalName: 'Formaldehyde / Concentrated Sulfuric Acid (1:9)',
    targetAnalytes: ['Morphine', 'Diacetylmorphine (Heroin)', 'Codeine'],
    baselineRgb: { r: 236, g: 232, b: 218 }, // Pale amber / straw blank
    targetPositiveRgb: { r: 68, g: 24, b: 92 }, // Deep violet chromophore
    baselineDescription: 'Pale straw / clear unreacted liquid',
    targetDescription: 'Intense violet / purple reaction product',
    thresholds: {
      baselineDepartureMin: 14.5,
      targetConvergenceMax: 13.8,
      ambiguousBandMin: 5.2,
    },
  },
  mecke: {
    id: 'mecke',
    name: 'Mecke Reagent',
    chemicalName: 'Selenious Acid / Concentrated Sulfuric Acid',
    targetAnalytes: ['Heroin', 'Morphine', 'Opiates'],
    baselineRgb: { r: 240, g: 238, b: 228 }, // Clear / pale yellow
    targetPositiveRgb: { r: 22, g: 76, b: 88 }, // Deep blue-green
    baselineDescription: 'Clear / faint yellowish liquid',
    targetDescription: 'Deep blue-green chromophore',
    thresholds: {
      baselineDepartureMin: 15.0,
      targetConvergenceMax: 14.0,
      ambiguousBandMin: 5.5,
    },
  },
  scott: {
    id: 'scott',
    name: 'Modified Scott Reagent',
    chemicalName: 'Cobalt Thiocyanate (2%) / Glycerin / Water',
    targetAnalytes: ['Cocaine HCl', 'Crack Cocaine'],
    baselineRgb: { r: 230, g: 180, b: 195 }, // Pinkish unreacted reagent
    targetPositiveRgb: { r: 18, g: 62, b: 138 }, // Intense cobalt blue
    baselineDescription: 'Pinkish-red reagent solution',
    targetDescription: 'Intense cobalt blue precipitate / solution',
    thresholds: {
      baselineDepartureMin: 18.0,
      targetConvergenceMax: 14.5,
      ambiguousBandMin: 6.0,
    },
  },
  mandelin: {
    id: 'mandelin',
    name: 'Mandelin Reagent',
    chemicalName: 'Ammonium Vanadate (1%) / Concentrated Sulfuric Acid',
    targetAnalytes: ['Methadone', 'Amphetamine', 'Aspirin (differentiation)'],
    baselineRgb: { r: 235, g: 230, b: 200 }, // Pale yellow
    targetPositiveRgb: { r: 35, g: 90, b: 45 }, // Dark olive green / blue-green
    baselineDescription: 'Pale yellow liquid',
    targetDescription: 'Dark olive green / deep blue-green',
    thresholds: {
      baselineDepartureMin: 15.5,
      targetConvergenceMax: 14.2,
      ambiguousBandMin: 5.0,
    },
  },
};
