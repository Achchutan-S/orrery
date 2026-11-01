// The cascade layer order, emitted inline as the first <style> of every page (SeoHead).
// astro.config.ts adds its hash to the CSP, so the policy allows it wherever it sits.
export const LAYER_ORDER = '@layer platform.reset, platform.tokens, platform.chrome, experience;';
