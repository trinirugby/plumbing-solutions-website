# Brand logos

Manufacturer logos shown in the homepage "Quality Products. Trusted Brands."
marquee. Official marks only — do not recolour, redraw, or stretch them.

| File | Brand | Source | Licence |
|---|---|---|---|
| `viega.svg` | Viega | Wikimedia Commons — `File:Viega Logo.svg` | Public domain (below threshold of originality) |
| `kohler.svg` | Kohler | Wikimedia Commons — `File:Kohler logo.svg` | Public domain (below threshold of originality) |
| `duravit.png` | Duravit | Wikimedia Commons — `File:DuravitLogo rgb 400px.png` | Public domain (below threshold of originality) |
| `american-standard.svg` | American Standard | Wikimedia Commons — `File:American Standard logo.svg` | Public domain (below threshold of originality) |

## Adding a brand

1. Drop the official logo (SVG preferred, transparent PNG otherwise) in this folder.
2. Add one `<li class="marquee__item">` to the `.marquee__set` in `index.html`.
3. Add a `--logo-h` rule in `css/home.css` so it matches the optical weight of
   the others (wordmarks sit around 26–34px; square block marks around 40px).

The marquee clones the authored set to fill the viewport, so no other change is
needed however many brands are listed.
