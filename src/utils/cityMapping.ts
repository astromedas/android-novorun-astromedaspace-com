/**
 * City name mapping utility
 * Maps old/common city names to their official/preferred names
 */

export interface CityMapping {
  [key: string]: string;
}

// City name mappings (case-insensitive)
export const CITY_MAPPINGS: CityMapping = {
  // Indian cities
  'bangalore': 'Bengaluru',
  'bombay': 'Mumbai',
  'calcutta': 'Kolkata',
  'madras': 'Chennai',
  'poona': 'Pune',
  'mysore': 'Mysuru',
  'mangalore': 'Mangaluru',
  'hubli': 'Hubballi',
  'belgaum': 'Belagavi',
  'gulbarga': 'Kalaburagi',
  'bijapur': 'Vijayapura',
  'bellary': 'Ballari',
  
  // Add more mappings as needed
};

/**
 * Maps a city name to its official/preferred name
 * @param cityName - The input city name
 * @returns The mapped city name or original if no mapping exists
 */
export function mapCityName(cityName: string): string {
  if (!cityName || typeof cityName !== 'string') {
    return cityName;
  }

  const normalizedInput = cityName.trim().toLowerCase();
  const mappedCity = CITY_MAPPINGS[normalizedInput];
  
  if (mappedCity) {
    console.log(`🗺️ City mapped: ${cityName} → ${mappedCity}`);
    return mappedCity;
  }

  return cityName;
}

/**
 * Gets custom city suggestions based on partial input
 * @param input - The user's input text
 * @returns Array of custom city suggestions
 */
export function getCustomCitySuggestions(input: string): Array<{name: string, country: string}> {
  if (!input || typeof input !== 'string') {
    return [];
  }

  const normalizedInput = input.trim().toLowerCase();
  const suggestions: Array<{name: string, country: string}> = [];

  // Check for partial matches that should suggest mapped cities
  if (normalizedInput.startsWith('bangalore') || 
      normalizedInput.startsWith('bangal') || 
      normalizedInput.startsWith('beng') || 
      normalizedInput.startsWith('bangl')) {
    suggestions.push({name: 'Bengaluru', country: 'India'});
  }

  if (normalizedInput.startsWith('bombay') || 
      normalizedInput.startsWith('bomb')) {
    suggestions.push({name: 'Mumbai', country: 'India'});
  }

  if (normalizedInput.startsWith('calcutta') || 
      normalizedInput.startsWith('calc')) {
    suggestions.push({name: 'Kolkata', country: 'India'});
  }

  if (normalizedInput.startsWith('madras') || 
      normalizedInput.startsWith('madr')) {
    suggestions.push({name: 'Chennai', country: 'India'});
  }

  if (normalizedInput.startsWith('poona') || 
      normalizedInput.startsWith('poon')) {
    suggestions.push({name: 'Pune', country: 'India'});
  }

  if (normalizedInput.startsWith('mysore') || 
      normalizedInput.startsWith('myso')) {
    suggestions.push({name: 'Mysuru', country: 'India'});
  }

  return suggestions;
}

/**
 * Checks if a city name has a mapping
 * @param cityName - The input city name
 * @returns True if the city has a mapping, false otherwise
 */
export function hasCityMapping(cityName: string): boolean {
  if (!cityName || typeof cityName !== 'string') {
    return false;
  }

  const normalizedInput = cityName.trim().toLowerCase();
  return CITY_MAPPINGS.hasOwnProperty(normalizedInput);
}

/**
 * Gets the display name for a city (for UI display)
 * Same as mapCityName but more semantically clear for UI usage
 * @param cityName - The input city name
 * @returns The display name for the city
 */
export function getCityDisplayName(cityName: string): string {
  return mapCityName(cityName);
}

/**
 * Gets the value to send to server (for API calls)
 * Same as mapCityName but more semantically clear for API usage
 * @param cityName - The input city name
 * @returns The value to send to the server
 */
export function getCityServerValue(cityName: string): string {
  return mapCityName(cityName);
}
