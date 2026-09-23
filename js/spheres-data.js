/* Orbital elements of the planets at the J2000 epoch (Jan 1, 2000, noon),
   rounded, from NASA JPL's "Approximate positions of the planets".
   a: semi-major axis (AU), e: eccentricity, P: period (years),
   peri: longitude of perihelion (deg), L0: mean longitude at J2000 (deg).
   Inclinations are ignored: this is a flat, top-down orrery.

   kepler: the interval Kepler heard in each planet in Harmonices Mundi
   (1619), from its fastest to its slowest angular speed as seen from the
   Sun. note: the pitch its tone is centered on here (Hz), keeping each
   planet in its own octave the way Kepler did. */
const PLANETS = [
  { id: "mercury", name: "Mercury", glyph: "☿", a: 0.38710, e: 0.20563, P: 0.24085, peri: 77.46, L0: 252.25, color: "#b9b2a6", size: 3.2,
    kepler: [5, 12], keplerName: "octave and a minor third", note: 784.0 },
  { id: "venus", name: "Venus", glyph: "♀", a: 0.72333, e: 0.00677, P: 0.61520, peri: 131.60, L0: 181.98, color: "#e8c77a", size: 4.6,
    kepler: [24, 25], keplerName: "diesis, a small semitone", note: 659.3 },
  { id: "earth", name: "Earth", glyph: "⊕", a: 1.00000, e: 0.01671, P: 1.00002, peri: 102.94, L0: 100.46, color: "#5aa0e6", size: 4.8,
    kepler: [15, 16], keplerName: "semitone, mi to fa", note: 392.0 },
  { id: "mars", name: "Mars", glyph: "♂", a: 1.52368, e: 0.09340, P: 1.88085, peri: 336.04, L0: 355.43, color: "#e0633d", size: 3.8,
    kepler: [2, 3], keplerName: "fifth", note: 293.7 },
  { id: "jupiter", name: "Jupiter", glyph: "♃", a: 5.20260, e: 0.04849, P: 11.8618, peri: 14.75, L0: 34.40, color: "#d9a066", size: 9,
    kepler: [5, 6], keplerName: "minor third", note: 196.0 },
  { id: "saturn", name: "Saturn", glyph: "♄", a: 9.55491, e: 0.05551, P: 29.4571, peri: 92.43, L0: 49.94, color: "#e6d08a", size: 8,
    kepler: [4, 5], keplerName: "major third", note: 130.8 },
  { id: "uranus", name: "Uranus", glyph: "⛢", a: 19.2184, e: 0.04630, P: 84.0205, peri: 170.96, L0: 313.23, color: "#8fd6d6", size: 6.4,
    kepler: null, keplerName: "unknown to Kepler (found in 1781)", note: 98.0, modern: true },
  { id: "neptune", name: "Neptune", glyph: "♆", a: 30.1104, e: 0.00899, P: 164.793, peri: 44.97, L0: 304.88, color: "#5c7cfa", size: 6.2,
    kepler: null, keplerName: "unknown to Kepler (found in 1846)", note: 73.4, modern: true },
];

// Just intervals, to name the ratio each planet actually sings
const INTERVALS = [
  [1, 1, "unison"],
  [25, 24, "diesis"],
  [16, 15, "semitone"],
  [10, 9, "minor tone"],
  [9, 8, "whole tone"],
  [6, 5, "minor third"],
  [5, 4, "major third"],
  [4, 3, "fourth"],
  [7, 5, "tritone"],
  [3, 2, "fifth"],
  [8, 5, "minor sixth"],
  [5, 3, "major sixth"],
  [16, 9, "minor seventh"],
  [15, 8, "major seventh"],
  [2, 1, "octave"],
  [12, 5, "octave and a minor third"],
  [5, 2, "octave and a major third"],
  [3, 1, "octave and a fifth"],
];
