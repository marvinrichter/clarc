---
name: marketing-design
description: "Marketing asset design for developers: Open Graph / social media card specs and HTML generation, email template HTML/CSS patterns (table-based layout, Outlook compatibility, dark mode), banner and ad creative dimensions, print-safe PDF generation, and brand consistency across marketing touchpoints. From OG image code to email that renders in Outlook."
---

# Marketing Design Skill

## When to Activate

- Generating Open Graph / Twitter card meta tags and preview images
- Building HTML email templates
- Creating social media asset specifications
- Defining ad creative dimensions for a campaign
- Ensuring marketing materials match brand guidelines

---

## Open Graph & Social Cards

### Required meta tags

```html
<!-- Basic OG (works for Facebook, LinkedIn, Slack, Discord, etc.) -->
<meta property="og:title"       content="[Page Title — max 60 chars]" />
<meta property="og:description" content="[Page description — max 155 chars]" />
<meta property="og:image"       content="https://example.com/og/[page-slug].png" />
<meta property="og:image:width"  content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url"         content="https://example.com/[path]" />
<meta property="og:type"        content="website" />

<!-- Twitter / X specific -->
<meta name="twitter:card"        content="summary_large_image" />
<meta name="twitter:title"       content="[Same as og:title]" />
<meta name="twitter:description" content="[Same as og:description]" />
<meta name="twitter:image"       content="https://example.com/og/[page-slug].png" />
<meta name="twitter:site"        content="@handle" />
```

### OG image specs

| Platform | Recommended size | Safe zone | Format |
|----------|-----------------|-----------|--------|
| Facebook | 1200×630px | 1000×524px centered | PNG/JPG |
| Twitter/X | 1200×628px | 1000×524px centered | PNG/JPG |
| LinkedIn | 1200×627px | 1000×522px centered | PNG/JPG |
| Discord | 1200×630px | full bleed OK | PNG |
| WhatsApp | 1200×630px | full bleed OK | JPG |

**Universal safe size: 1200×628px** — works across all platforms.

### Generating OG images with Satori (Next.js)

```tsx
// app/og/route.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') ?? 'Default Title';

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#0f1117',
          padding: '60px',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Logo area */}
        <div style={{ display: 'flex', marginBottom: 'auto' }}>
          <span style={{ color: '#818CF8', fontSize: 24, fontWeight: 600 }}>
            ProductName
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            color: '#F1F5F9',
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: '80%',
            margin: 0,
          }}
        >
          {title}
        </h1>

        {/* Footer */}
        <div style={{ display: 'flex', marginTop: 40 }}>
          <span style={{ color: '#64748B', fontSize: 20 }}>
            example.com
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

---

## HTML Email Templates

### The core rules

1. **Table-based layout** — CSS Grid/Flexbox break in Outlook
2. **Inline styles only** — `<style>` blocks ignored by some clients
3. **Max width: 600px** — wider breaks on mobile
4. **No external fonts** — fallback to web-safe fonts
5. **Images must have `alt` text** — many clients block images by default
6. **Test in Litmus or Email on Acid** before sending

### Minimal responsive email template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Email Subject</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
  <style>
    /* Only put media queries here — inline everything else */
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .stack     { display: block !important; width: 100% !important; }
      .hide-mobile { display: none !important; }
    }
    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      .email-body  { background-color: #1a1a2e !important; }
      .email-card  { background-color: #16213e !important; }
      .email-text  { color: #e2e8f0 !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9;" class="email-body">

  <!-- Wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 16px;">

        <!-- Card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
               class="container"
               style="background-color:#ffffff; border-radius:8px; overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color:#4F46E5; padding:32px 40px;">
              <h1 style="margin:0; color:#ffffff; font-family:Arial,sans-serif;
                         font-size:28px; font-weight:700; line-height:1.2;">
                Product Name
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;" class="email-card">
              <p style="margin:0 0 16px; color:#1e293b; font-family:Arial,sans-serif;
                        font-size:16px; line-height:1.6;" class="email-text">
                Hello [First Name],
              </p>
              <p style="margin:0 0 32px; color:#475569; font-family:Arial,sans-serif;
                        font-size:16px; line-height:1.6;" class="email-text">
                [Main message goes here]
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#4F46E5; border-radius:6px;">
                    <a href="[URL]"
                       style="display:inline-block; padding:14px 28px; color:#ffffff;
                              font-family:Arial,sans-serif; font-size:16px; font-weight:600;
                              text-decoration:none;">
                      Call to Action
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px; background-color:#f8fafc; border-top:1px solid #e2e8f0;">
              <p style="margin:0; color:#94a3b8; font-family:Arial,sans-serif;
                        font-size:12px; line-height:1.5; text-align:center;">
                © 2026 Company Name · 123 Street · City<br>
                <a href="[unsubscribe-url]" style="color:#94a3b8;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
```

### Email compatibility checklist

- [ ] All styles are inline (except media queries)
- [ ] No CSS Grid, Flexbox, or CSS variables
- [ ] All images have `alt` text and explicit `width`/`height`
- [ ] CTA button uses table cell + `<a>` (not `<button>`)
- [ ] Unsubscribe link present
- [ ] Physical address in footer (CAN-SPAM / GDPR)
- [ ] Tested at 600px and 375px widths
- [ ] Tested in Outlook 2019 (most problematic client)

---

## Social Media Asset Dimensions

### Organic content specs

| Platform | Format | Recommended size | Max file size |
|----------|--------|-----------------|--------------|
| **Instagram** | Post | 1080×1080px (square) or 1080×1350px (portrait) | 30MB |
| **Instagram** | Story / Reel cover | 1080×1920px | 30MB |
| **Twitter/X** | Post with image | 1200×675px (16:9) | 5MB |
| **LinkedIn** | Post | 1200×628px | 5MB |
| **LinkedIn** | Company banner | 1536×768px | 8MB |
| **Facebook** | Post | 1200×630px | 30MB |
| **YouTube** | Thumbnail | 1280×720px | 2MB |
| **YouTube** | Channel banner | 2560×1440px | 6MB |

### Product Hunt launch assets

```
Logo:         240×240px (no text, icon only)
Gallery:      1270×760px (max 5 images)
Thumbnail:    630×420px
OG image:     1200×630px
```

### Open Source / GitHub assets

```
Social preview: 1280×640px (Settings → Social preview)
```

### Asset naming convention

```
Format: [product]-[type]-[variant]-[YYYY-MM].ext

Examples:
clarc-og-homepage-2026-03.png
clarc-instagram-launch-square-2026-03.png
clarc-email-welcome-header-2026-03.png
```

---

## Print-Safe PDF Generation

For documents that may be printed (invoices, reports, certificates).

### CSS for print

```css
@media print {
  /* Remove interactive elements */
  nav, .sidebar, button, .cta { display: none; }

  /* Prevent page breaks inside elements */
  .no-break { page-break-inside: avoid; }

  /* Force page break before sections */
  .page-break { page-break-before: always; }

  /* Print-safe colors (no screen-only colors) */
  body { color: #000; background: #fff; }
  a    { color: #000; text-decoration: underline; }

  /* Show URL next to links */
  a[href]::after { content: " (" attr(href) ")"; font-size: 10px; }

  /* Page margins */
  @page { margin: 20mm; }
}
```

### PDF generation with Puppeteer

```js
const puppeteer = require('puppeteer');

async function generatePDF(url, outputPath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
  });

  await browser.close();
}
```

### CMYK consideration

Screen colors (RGB/sRGB) do not print accurately in commercial print.

```
RGB        → Screen display
sRGB       → Web (same as RGB, standardized)
CMYK       → Commercial print (offset, digital press)
Pantone    → Brand colors in print (exact color matching)

Rule: If materials go to professional print (business cards, posters),
provide CMYK values in brand guidelines alongside hex/RGB.
```

---

## Brand Consistency Checklist (Marketing)

Before publishing any marketing asset:

- [ ] Brand colors used from token/guidelines (no eye-dropped or approximate values)
- [ ] Correct font family (not system fallback)
- [ ] Logo used from official source file (not screenshot or rescaled)
- [ ] Logo clear space maintained (minimum padding = logo width / 4)
- [ ] CTA button color is the brand primary (consistent across all assets)
- [ ] Tagline / headline matches brand voice guidelines
- [ ] Asset sized for the target platform (correct pixel dimensions)
- [ ] File format appropriate (PNG for transparency, JPG for photos, SVG for logos)
- [ ] Asset named with the naming convention
- [ ] UTM parameters added to all tracked links

---

## Checklist

- [ ] OG/Twitter meta tags present on all public pages
- [ ] OG image is 1200×628px, within 1MB
- [ ] OG image renders correctly (tested with og-debugger.com or validator.opengraph.rocks)
- [ ] Email template uses table-based layout (no Grid/Flexbox)
- [ ] Email tested in Outlook, Gmail, Apple Mail
- [ ] Email has unsubscribe link + physical address (legal compliance)
- [ ] Social media assets sized per platform spec
- [ ] Brand asset naming convention followed
- [ ] Print CSS defined for any print-intended pages
- [ ] CMYK values documented if professional print is needed
