# RDL Sony Centre · HSR Layout

Website for **RDL Sony Centre**, a Sony authorised dealer in HSR Layout, Bengaluru.

- **Content:** arshad-sonyhsrlayout.com
- **Colours:** neethmedappa.com
- **Layout:** modelled on shopatsc.com

## Stack

| Part | Choice | Why |
| --- | --- | --- |
| Site | **Astro** (static) | Every page is plain HTML that Google can read, and pages load fast |
| Hosting | **Cloudflare Pages** | Free, fast in India, preview URL for every branch |
| CMS | **Sveltia CMS** at `/admin/` | Free and open source. Edits are saved to GitHub, so there's no database or server to run |
| Enquiries | **WhatsApp** links | Each enquiry opens WhatsApp with the product details filled in |

```
src/
  content/products/*.json      ← one file per product (edited in the CMS)
  content/settings/store.json  ← address, phone, email, hours (edited in the CMS)
  content/settings/home.json   ← homepage headline & offer text (edited in the CMS)
  pages/                       ← home, /televisions/, /headphones/, /soundbars/,
                                  one page per product, /about/, /contact/, /policies/
  components/                  ← header, footer, product card, page sections
  scripts/main.js, mascot.js   ← cursors, parallax, Rudy the mascot, filters
  styles/global.css            ← all styling (palette tokens at the top)
public/
  admin/                       ← Sveltia CMS (index.html + config.yml)
  brand/                       ← logo, logo mark, Sony Authorised Dealer badge
  images/, fonts/, _headers
```

## Preview the website

### On your computer

You need [Node.js 22+](https://nodejs.org).

```bash
git clone https://github.com/studiohappens26-oss/Arshad-Sony.git
cd Arshad-Sony
git checkout claude/pensive-babbage-9i69si
npm install
npm run dev        # open http://localhost:4321
```

### Online, with a shareable link (Cloudflare Pages)

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick `Arshad-Sony`.
2. Set these build settings:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Output directory: `dist`
3. Add the environment variable `NODE_VERSION` = `22` (the repo's `.nvmrc` sets this too).
4. Save and deploy.
   - Every branch gets its own preview link, e.g. `https://claude-pensive-babbage-9i69si.<project>.pages.dev`.
   - The production branch (`main`) goes live on your domain.
5. Custom domain: Pages project → **Custom domains** → add `arshad-sonyhsrlayout.com`. The domain is also set in `astro.config.mjs` (`site`), which builds canonical URLs and the sitemap.

## CMS setup (Sveltia CMS)

Store staff edit products, prices, images, the address, opening hours and homepage text at **`https://<your-domain>/admin/`**. Each save commits to GitHub, and Cloudflare republishes the site in about a minute.

One-time setup (about 10 minutes):

1. **Deploy the sign-in helper.**
   - Deploy [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) to Cloudflare Workers using its "Deploy to Cloudflare" button. It's free.
   - Note the worker URL, e.g. `https://sveltia-cms-auth.<you>.workers.dev`.
2. **Create a GitHub OAuth App** (GitHub → Settings → Developer settings → OAuth Apps → New):
   - Homepage URL: your site URL
   - Authorization callback URL: `https://sveltia-cms-auth.<you>.workers.dev/callback`
3. **Connect the two.**
   - In the worker's settings, add the variables `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` (as a secret) from the OAuth app.
   - Add `ALLOWED_DOMAINS` = your domain.
4. **Point the CMS at the worker.** In `public/admin/config.yml`, replace `base_url` with your worker URL.
5. **Check the branch.** The CMS commits to `main` (`backend.branch`). Merge this branch into `main` first, or change that line.
6. **Give staff access.** Add each staff member as a collaborator on the GitHub repo. They sign in with their own GitHub account.

You can also try the CMS before the sign-in setup: run `npm run dev`, open `http://localhost:4321/admin/` in Chrome or Edge, and choose **"Work with Local Repository"**.

## Google ranking (SEO)

Already built in:

- **Product pages:** one page per product, with its own title, description and `Product` structured data (price in INR).
- **Search-friendly titles:** "Sony BRAVIA 7 55" K-55XR70 Price in Bangalore | RDL Sony Centre, HSR Layout".
- **Local business data:** `ElectronicsStore` structured data with the address, phone, email and opening hours on every page.
- **Breadcrumbs:** breadcrumb structured data on category and product pages.
- **Indexing:** `sitemap-index.xml`, `robots.txt`, canonical URLs, Open Graph tags and a 404 page.

Do these after launch; they matter most for local search:

1. **Google Business Profile:** claim or verify the store listing. Use exactly the same name, address and phone as the website, and add the website link, photos and opening hours.
2. **Google Search Console:** add the domain and submit `https://<domain>/sitemap-index.xml`.
3. **Reviews:** ask happy customers for Google reviews. Reviews are one of the biggest factors in local ranking.
4. **Store hours:** `store.json` lists the store as open Monday–Sunday, 09:00–18:00. Correct the days in the CMS if needed.

## Design notes

- **Light theme:** white and warm off-white surfaces, near-black text, maroon for buttons and labels, copper accents. Rose gold is decorative only (soft glows).
- **Typeface: SST**, Sony's own font, as used on shopatsc.com.
  - SST is proprietary to Sony, so its files aren't included in the repo.
  - Put the licensed files (`SST-Light.woff2`, `SST-Roman.woff2`, `SST-Medium.woff2`, `SST-Bold.woff2`) in `public/fonts/sst/` and the build switches to SST automatically. Ask your Sony India contact for the files and usage terms.
  - Until then the site uses **Source Sans 3**, a close free alternative.
- **Product images are cut out** (transparent WebP) so they sit cleanly on the tiles. When adding products in the CMS, upload a **PNG or WebP with a transparent background**. Otherwise the product shows inside a white box.
  - To cut out a white-background photo yourself, use any background remover, or ImageMagick:
    `convert in.jpg -fuzz 8% -transparent white out.webp`
- **Effects:** custom cursors per category, Rudy the mascot, a parallax TV glow in the hero, a pinned horizontal "flagships" scroll, line-by-line headline reveals and image parallax.

## Calls to action

Customers can't buy online. Every product offers **Enquire now** (WhatsApp), **Call now** (phone) and **Visit the shop** (Google Maps directions).
