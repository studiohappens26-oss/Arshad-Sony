import { getCollection, type CollectionEntry } from 'astro:content';
import store from '../content/settings/store.json';

export type Product = CollectionEntry<'products'>['data'];
export type Category = Product['category'];

export const categories: Record<Category, { slug: string; label: string; single: string; cursor: string; mascot: string }> = {
  tv: { slug: 'televisions', label: 'Televisions', single: 'Television', cursor: 'tv', mascot: 'tv' },
  headphones: { slug: 'headphones', label: 'Headphones', single: 'Headphones', cursor: 'hp', mascot: 'hp' },
  soundbars: { slug: 'soundbars', label: 'Soundbars', single: 'Soundbar', cursor: 'sb', mascot: 'sb' }
};

export async function getProducts(category?: Category): Promise<Product[]> {
  const all = (await getCollection('products')).map(e => e.data).filter(p => !p.hidden);
  return all.filter(p => !category || p.category === category).sort((a, b) => a.order - b.order || a.price - b.price);
}

export const inr = (n: number) => '₹' + Number(n).toLocaleString('en-IN');
export const productUrl = (p: Product) => `/${categories[p.category].slug}/${p.slug}/`;
export const waLink = (text: string) => `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(text)}`;
export const telLink = `tel:${store.phone}`;
export const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.mapsQuery)}`;
export const directionsLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(store.mapsQuery)}`;
export const enquiryText = (p: Product) =>
  `Hi ${store.name}, I'm interested in the ${p.name} (${p.model}) listed at ${inr(p.price)}. Is it available?`;

export function tagsFor(p: Product): string[] {
  if (p.category === 'tv') return [`${p.size}"`, p.series ?? '', p.panel && p.panel !== 'LED' ? p.panel : p.resolution ?? ''].filter(Boolean);
  if (p.category === 'headphones') return (p.type ?? '').split(' · ').filter(Boolean);
  return [p.channels ?? '', 'Home theatre'].filter(Boolean);
}

export function specsFor(p: Product): [string, string][] {
  if (p.category === 'tv')
    return [['Screen', `${p.size}" (${p.cm} cm)`], ['Series', p.series ?? ''], ['Resolution', p.resolution ?? ''], ['Panel', p.panel ?? ''], ['Platform', 'Google TV'], ['Model', p.model]];
  if (p.category === 'headphones') return [['Type', p.type ?? ''], ['Model', p.model], ['Brand', 'Sony']];
  return [['Channels', p.channels ?? ''], ['Model', p.model], ['Brand', 'Sony']];
}

/* A short, factual description built from the product's own fields (used when the CMS description is empty). */
export function describe(p: Product): string {
  if (p.description) return p.description;
  const where = `at ${store.name}, a Sony authorised dealer in ${store.area}, ${store.city}`;
  if (p.category === 'tv')
    return `The Sony ${p.series} ${p.size}-inch (${p.cm} cm) ${p.resolution} ${p.panel} Google TV, model ${p.model}. See it in person and get expert guidance ${where}.`;
  if (p.category === 'headphones') return `Sony ${p.model} headphones (${(p.type ?? '').toLowerCase()}). Try them on and compare models ${where}.`;
  return `Sony ${p.model} ${p.channels} home theatre audio. Hear it in our demo setup ${where}.`;
}

export function seoTitle(p: Product): string {
  const short = p.category === 'tv' ? `Sony ${p.series} ${p.size}" ${p.model}` : `Sony ${p.model} ${categories[p.category].single}`;
  return `${short} Price in Bangalore | ${store.name}, ${store.area}`;
}

export function storeJsonLd(site: URL | undefined) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ElectronicsStore',
    '@id': new URL('/#store', site).href,
    name: `${store.name}, ${store.area}`,
    alternateName: store.legalName,
    description: `Sony authorised dealer for BRAVIA TVs, headphones and soundbars in ${store.area}, ${store.city}.`,
    url: new URL('/', site).href,
    image: new URL('/images/banners/bravia-banner.webp', site).href,
    logo: new URL('/brand/logo-mark.svg', site).href,
    telephone: store.phone,
    email: store.email,
    priceRange: '₹₹',
    brand: { '@type': 'Brand', name: 'Sony' },
    address: {
      '@type': 'PostalAddress',
      streetAddress: store.streetAddress,
      addressLocality: store.locality,
      addressRegion: store.region,
      postalCode: store.postalCode,
      addressCountry: 'IN'
    },
    hasMap: mapsLink,
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: store.openingDays, opens: store.opens, closes: store.closes }]
  };
}

export { store };
