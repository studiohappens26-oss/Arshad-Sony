# RDL Sony Centre · HSR Layout

Website for RDL Sony Centre, a Sony authorised dealer in HSR Layout, Bengaluru.

- **Colours:** maroon, rose gold, copper and cream, taken from neethmedappa.com
- **Layout:** modelled on shopatsc.com (category rails, product grids, offer bands, trust strip)
- **Content:** catalogue, about, contact and policy text from arshad-sonyhsrlayout.com

## What's inside

| Path | What it is |
| --- | --- |
| `index.html` | The storefront: hero, categories, new arrivals, TVs (tabs, size filter, sort), headphones, soundbars, about, why us, gallery, contact |
| `policies.html` | Shipping, terms and privacy |
| `data/products.json` | **The catalogue (28 products).** Edit prices, add or remove models here. The page renders from this file. |
| `assets/brand/` | Logo (`logo.svg`), logo mark / favicon (`logo-mark.svg`) and the Sony Authorised Dealer badge |
| `assets/js/mascot.js` | **Rudy**, the mascot: one SVG character with an outfit per section |
| `assets/js/main.js` | Custom cursors, parallax, reveals, tilt, filters, quick-view modal, WhatsApp forms |
| `assets/css/style.css` | All styling; palette tokens are at the top |
| `_headers` | Cache and security headers for Cloudflare Pages |

### Effects

- **Section cursors:** a TV cursor over televisions, headphones with pulsing sound waves over audio, and animated equaliser bars over soundbars. A label reads "View" on product cards and the cursor switches colour on dark sections. Touch devices keep the normal cursor.
- **Parallax:** layered hero products that follow the mouse and the scroll, plus parallax backgrounds on the offer, headphones, soundbar and about images and a staggered gallery.
- **Rudy the mascot:** waves in the hero; has popcorn, a remote and star eyes for TVs; wears headphones and bobs for audio; dances on a soundbar with music notes; holds a phone in contact. His eyes follow the cursor. He follows you down the page as a companion and gives tips when clicked.
- **Other effects:** a preloader that draws the logo, split-text headline reveals, 3D tilt with glare on cards, magnetic buttons, a marquee, counters and a scroll progress bar.
- **Sony Authorised Dealer badge:** shown in the top bar, the header pill, the hero seal, a floating corner badge, the about section, the footer and the product modal.
- **Enquiries:** every enquiry goes to WhatsApp (+91 93530 99534) with the product prefilled.
- **Reduced motion:** visitors who set `prefers-reduced-motion` get a calm, static version.

## Run locally

```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

(Opening `index.html` directly from disk won't load the catalogue, because browsers block `fetch` on `file://`.)

## Deploy (Cloudflare Pages)

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick this repo.
2. Framework preset: **None**. Build command: *(empty)*. Output directory: `/`.
3. Add the custom domain. Every push to the main branch deploys; every other branch gets a preview URL.

## Before going live: check these

- **Email:** the source site lists `sgdthgsk@gmail.com`, which looks like a placeholder, so it is left out. Add the real address to the contact section.
- **Promises in the trust strip:** "Free delivery" and "30-day returns" come from the source site's template. Confirm the store actually offers them.
- **Policy text:** the shipping policy mentions international shipping and tracking emails (template wording). Have the owner confirm it.
- **Badge:** the authorised-dealer badge is an original design. If Sony India supplied official dealer badge artwork, swap it into `assets/brand/sony-authorised-badge.svg`.
- **Banner resolution:** the living-room and neon-headphone images are only 1000 px wide. Higher-resolution photos would look sharper in the full-width offer band.
