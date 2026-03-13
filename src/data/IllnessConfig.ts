/**
 * Configuration for pet illnesses, effects, and recovery.
 */

export type IllnessType = 'cold' | 'flu' | 'fatigue' | 'infection' | 'poisoning';

export interface IllnessDefinition {
  name: string;
  description: string;
  healthDrainRate: number; // points per second
  happinessDrainRate: number; // points per second
  durationSeconds: number; // how long the illness lasts without cure
  triggerThreshold: number; // health threshold that can trigger this illness
  rarity: number; // 0-1, higher = more likely
}

export const ILLNESS_DEFINITIONS: Record<IllnessType, IllnessDefinition> = {
  cold: {
    name: 'Cold',
    description: 'A mild respiratory infection',
    healthDrainRate: 0.008,
    happinessDrainRate: 0.003,
    durationSeconds: 120, // 2 minutes for testing
    triggerThreshold: 20,
    rarity: 0.5,
  },
  flu: {
    name: 'Flu',
    description: 'A more serious viral infection',
    healthDrainRate: 0.015,
    happinessDrainRate: 0.006,
    durationSeconds: 180,
    triggerThreshold: 15,
    rarity: 0.3,
  },
  fatigue: {
    name: 'Fatigue',
    description: 'Extreme exhaustion from neglect',
    healthDrainRate: 0.006,
    happinessDrainRate: 0.008,
    durationSeconds: 150,
    triggerThreshold: 20,
    rarity: 0.4,
  },
  infection: {
    name: 'Infection',
    description: 'A serious bacterial infection',
    healthDrainRate: 0.020,
    happinessDrainRate: 0.005,
    durationSeconds: 200,
    triggerThreshold: 10,
    rarity: 0.2,
  },
  poisoning: {
    name: 'Poisoning',
    description: 'Toxin exposure or contamination',
    healthDrainRate: 0.025,
    happinessDrainRate: 0.010,
    durationSeconds: 240,
    triggerThreshold: 12,
    rarity: 0.15,
  },
};

/**
 * Select a random illness type based on rarity weights.
 * This is used when triggering a new illness.
 */
export function selectRandomIllness(seed: number): IllnessType {
  const types: IllnessType[] = ['cold', 'flu', 'fatigue', 'infection', 'poisoning'];
  const totalRarity = types.reduce((sum, type) => sum + ILLNESS_DEFINITIONS[type].rarity, 0);

  let roll = (seed * 12.9898 + 78.233) % 1; // simple pseudo-random
  roll = (roll * totalRarity) % totalRarity;

  let accumulated = 0;
  for (const type of types) {
    accumulated += ILLNESS_DEFINITIONS[type].rarity;
    if (roll <= accumulated) {
      return type;
    }
  }

  return 'cold';
}

/**
 * Get the illness definition for a given type.
 */
export function getIllnessDefinition(type: string | null): IllnessDefinition | null {
  if (!type || !ILLNESS_DEFINITIONS[type as IllnessType]) {
    return null;
  }
  return ILLNESS_DEFINITIONS[type as IllnessType];
}
