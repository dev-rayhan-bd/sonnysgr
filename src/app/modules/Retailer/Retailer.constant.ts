/**
 * Store operation settings (Module 9.2 hold rules, Module 10 pickup flow, Module 18.3 prep time).
 * Bounds are shared by the Mongoose schema, the Zod validation and the services that consume them.
 */
export const STORE_SETTINGS_LIMITS = {
  prepTimeMinutes: { min: 1, max: 240, default: 15 },
  // REQUIREMENTS 9.2: configurable hold duration window, 3h to 24h
  holdDurationHours: { min: 3, max: 24, default: 3 },
  // How long a buyer has to collect an order once the store marks it Ready for Pickup
  pickupWindowHours: { min: 1, max: 72, default: 24 },
  // Store reach used as the default for Demand radar and promotion audience
  serviceRadiusMiles: { min: 1, max: 100, default: 10 },
} as const;

export const DEFAULT_STORE_SETTINGS = {
  prepTimeMinutes: STORE_SETTINGS_LIMITS.prepTimeMinutes.default,
  holdDurationHours: STORE_SETTINGS_LIMITS.holdDurationHours.default,
  pickupWindowHours: STORE_SETTINGS_LIMITS.pickupWindowHours.default,
  serviceRadiusMiles: STORE_SETTINGS_LIMITS.serviceRadiusMiles.default,
};
