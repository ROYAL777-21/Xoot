// Same style document on web and native; colour is presentation, never eligibility.
export const MONOCHROME_MAP_STYLE = {
  version: 8 as const,
  name: "Xoot monochrome",
  imports: [{
    id: "basemap",
    url: "mapbox://styles/mapbox/standard",
    config: {
      theme: "monochrome",
      lightPreset: "day",
      show3dObjects: false,
      showPointOfInterestLabels: false,
      showTransitLabels: false,
    },
  }],
  sources: {},
  layers: [],
};

export const MONOCHROME_MAP_STYLE_JSON = JSON.stringify(MONOCHROME_MAP_STYLE);
