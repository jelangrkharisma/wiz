export const getTemperatureCategory = (normalizedValue: number): string => {
  // takes normalizedValue / percentage of bulb's current temp within its min max temperature, normally 2700K - 6500K.
  if (normalizedValue <= 25) return 'Warmest';
  if (normalizedValue <= 50) return 'Warm';
  if (normalizedValue <= 75) return 'Neutral';
  return 'Cool';
};
