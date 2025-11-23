/**
 * Data loader utility for fetching JSON data
 */

// Use PUBLIC_URL for Netlify deployment, fallback to relative path for local dev
const DATA_BASE_PATH = (process.env.PUBLIC_URL || '') + '/data';

export const loadData = async (filename) => {
  try {
    const response = await fetch(`${DATA_BASE_PATH}/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    return null;
  }
};

export const loadSummary = () => loadData('summary.json');
export const loadTracks = () => loadData('tracks.json');
export const loadCorrelations = () => loadData('correlations.json');
export const loadFeatures = () => loadData('features.json');
export const loadDrivers = () => loadData('drivers.json');
export const loadArchetypes = () => loadData('archetypes.json');
export const loadInsights = () => loadData('insights.json');
export const loadVisualizations = () => loadData('visualizations.json');
export const loadPodiumCalculator = () => loadData('podium_calculator.json');

