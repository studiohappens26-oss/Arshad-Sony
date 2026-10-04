// Design variations shown at /variations/ (not indexed by search engines)
export const variants = [
  { key: 'original', label: 'Original', href: '/?theme=off', note: 'Light, maroon & copper. The current design.' },
  { key: 'minimal', label: 'Minimal', href: '/variations/minimal/', note: 'White, black type, one product at a time. Nothing extra.' },
  { key: '3d', label: '3D', href: '/variations/3d/', note: 'Real-time 3D TV, soundbar and headphones, driven by scroll.' },
  { key: 'monogram', label: 'Monogram', href: '/variations/monogram/', note: 'The original colours, blacker text and a subtle RDL monogram pattern.' },
  { key: 'champagne', label: 'Champagne', href: '/variations/champagne/', note: 'Warm white, black type and gold accents. Quietly luxurious.' },
  { key: 'cobalt', label: 'Cobalt', href: '/variations/cobalt/', note: 'Crisp white and electric blue. Tech-forward.' },
  { key: 'sage', label: 'Sage', href: '/variations/sage/', note: 'Warm ivory and forest green. Calm, lifestyle feel.' }
] as const;
export const colourThemes = ['monogram', 'champagne', 'cobalt', 'sage'] as const;
export type ColourTheme = (typeof colourThemes)[number];
