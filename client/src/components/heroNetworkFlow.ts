// Shared, scroll-driven state bridging the hero's pin animation (Home.tsx)
// and the fixed neural network backdrop (NeuralNetworkCanvas.tsx). A plain
// mutable ref is cheaper than a CSS custom property + getComputedStyle
// round-trip on every animation frame, and avoids prop-drilling between two
// components that don't otherwise share a tree.
export const heroNetworkFlow = {
  // 0 (fully hidden behind the hero/cover) -> 1 (fully revealed). Driven
  // directly from the hero's own scroll progress so the network's fade-in
  // is perfectly timed with the cover that was hiding it, instead of
  // recomputing an independent (and easily out-of-sync) estimate.
  reveal: 0,
};
