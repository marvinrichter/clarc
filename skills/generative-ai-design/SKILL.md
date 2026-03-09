---
name: generative-ai-design
description: "AI-assisted design workflows: prompt engineering for image generation (Midjourney, DALL-E 3, Stable Diffusion, Flux), achieving style consistency across a generated asset set, post-processing AI outputs for production use, legal and licensing considerations, and when AI generation is and isn't appropriate. For teams integrating generative AI into their design workflow."
---

# Generative AI Design Skill

## When to Activate

- Using Midjourney, DALL-E, Stable Diffusion, or Flux to generate design assets
- Maintaining visual consistency across a set of AI-generated images
- Deciding whether AI generation fits a design requirement
- Post-processing and preparing AI outputs for production
- Understanding licensing and copyright implications

---

## When to Use (and Not Use) AI Generation

### Appropriate uses

```
✓ Mood boarding — fast visual direction exploration
✓ Background textures and patterns — no identity risk
✓ Abstract illustrations — non-representational art
✓ Concept art for presentations — not for product UI
✓ Placeholder images — to be replaced with real photography
✓ Marketing experiments — low-brand-stakes A/B tests
✓ Reference images for briefing a human designer
```

### Inappropriate uses

```
✗ Brand identity elements (logo, icon system) — inconsistency, identity risk
✗ Illustrations requiring exact style match to existing set
✗ People with specific demographics — hallucination, bias, legal risk
✗ Realistic-looking fake events, products, or endorsements
✗ Images involving recognizable faces without consent
✗ Medical, legal, or safety-critical visual content
✗ Content that will be passed off as photography without disclosure
```

---

## Prompt Engineering for Image Generation

### Universal structure

```
[Style adjective(s)] [medium/technique] [subject description],
[color palette / mood], [lighting], [camera/perspective],
[technical quality spec], [negative prompt if supported]
```

### Style adjectives that work reliably

```
Illustration styles:
  flat vector illustration
  isometric illustration
  line art
  editorial illustration
  hand-drawn illustration
  geometric abstract

Photography styles:
  product photography
  editorial photography
  documentary photography
  aerial photography

Art direction:
  minimalist
  bold and graphic
  soft and dreamy
  high contrast
  muted palette
  vibrant
```

### Midjourney-specific syntax

```
Basic:
/imagine flat vector illustration of a developer at a laptop,
indigo and amber palette, minimal style, white background,
geometric shapes, no shadows --v 6.1 --ar 16:9

Style reference (--sref):
--sref [image URL]   # style match to reference image

Character reference (--cref):
--cref [image URL]   # maintain character appearance

Stylize (--s):
--s 0    # minimal stylization, follows prompt closely
--s 100  # balanced (default)
--s 750  # strong stylization, more creative

Seed for consistency (--seed):
--seed 12345   # reproducible results for series

Negative prompt (--no):
--no text, watermark, logo, signature, border
```

### DALL-E 3 (via ChatGPT/API)

```
Strengths:  Strong instruction-following, text in images, safety
Weaknesses: Less stylistic control than Midjourney, can refuse edge cases
Best for:   Concept art, marketing copy images, illustrations with text

Prompt tips:
- Be explicit about style: "in the style of a flat vector illustration"
- Specify what NOT to include: "no text, no people, no shadows"
- Request revisions by describing the delta: "same composition but with
  a darker background and remove the people"
```

### Stable Diffusion / Flux prompt structure

```
Flux.1 (Schnell / Dev):
  Strong prompt adherence, faster than SDXL
  Works well with natural language descriptions
  No need for comma-separated token lists

Example (Flux):
A clean isometric illustration of a cloud server rack surrounded by
floating data icons. Deep blue and cyan color palette. Minimal flat style.
Technical, precise. White background. No text. No people.

Stable Diffusion XL:
  [positive tags], masterpiece, best quality, 8k
  Negative: bad quality, blurry, distorted, text, watermark

ControlNet modes:
  Canny  → preserve edge structure (for consistent composition)
  Depth  → preserve 3D structure
  Pose   → preserve character pose (useful for character consistency)
  IP-Adapter → style transfer from reference image
```

---

## Style Consistency Across a Set

The hardest problem in AI design: making 10 illustrations look like they're from the same series.

### Method 1: Seed locking (Midjourney)

```
1. Create first image: /imagine [prompt] --seed 42
2. Note the job ID and seed from the image details
3. All subsequent images use same seed: --seed 42
4. Variations will share compositional DNA
```

### Method 2: Style reference (Midjourney --sref)

```
1. Create approved "reference" image
2. Add --sref [URL] to all subsequent prompts
3. The style (colors, shapes, lighting) transfers
4. Subject still controlled by text prompt

Example:
/imagine empty state for a search feature, friendly character,
indigo palette --sref https://[your-reference-image-url] --sw 100
```

### Method 3: IP-Adapter / image reference (Stable Diffusion)

```
1. Load IP-Adapter extension in ComfyUI or A1111
2. Use reference image at 0.6-0.8 weight
3. Write prompt for new subject
4. Style and color palette transfer while subject changes
```

### Method 4: Consistent prompting (any tool)

Write a "style fingerprint" — a fixed block you append to every prompt:

```
[Subject-specific prompt]

Style: flat 2D vector illustration, muted indigo and amber color palette,
simple geometric shapes, round corners, minimal detail, no gradients,
white background, no shadows, no text, no borders, editorial illustration style
```

Keep this block identical for every image in the series.

---

## Post-Processing AI Outputs

AI outputs are almost never production-ready. Budget time for cleanup.

### Standard pipeline

```
Raw AI output (JPG/PNG, 1024×1024)
        ↓
Remove background (remove.bg, Photoshop, Figma plugin)
        ↓
Color correction (match to brand palette in Figma/Photoshop)
        ↓
Crop to final format (1200×628 OG, 1080×1080 Instagram, etc.)
        ↓
Compress (Squoosh.app, ImageOptim)
        ↓
Export at correct resolution (2× for retina)
```

### Vectorization (when SVG is needed)

```
AI images are raster. For scalable SVG:

1. Adobe Illustrator → Image Trace
   Best settings: "16 Colors" preset → expand → ungroup → clean up

2. Vector Magic (vectormagic.com)
   Better for illustrations with clear shapes

3. Manual redraw in Figma
   For simple shapes — faster than tracing, cleaner result

Rule: Don't vectorize complex photorealistic outputs — only works for
flat, simple illustrations.
```

### Color correction to match brand

```
In Figma:
1. Import AI image
2. Create overlay rectangle with brand color
3. Set blend mode to "Color"
4. Adjust opacity until palette feels cohesive
5. Export as PNG

In CSS (for web use):
img.brand-tinted {
  filter: hue-rotate(30deg) saturate(0.8) brightness(1.1);
}
```

---

## Legal and Licensing Considerations

### Copyright status (as of 2025)

```
United States: AI-generated images with no human authorship are
  not copyrightable. Works with significant human creative input
  (prompting + selection + editing) may qualify.

European Union: Under active regulation. Human authorship required
  for full protection.

Practical rule: Treat AI-generated assets as unprotected until
  your legal counsel advises otherwise.
```

### Training data licensing

| Tool | Training data transparency | Commercial use |
|------|---------------------------|----------------|
| Midjourney | Undisclosed | Allowed (paid plans) |
| DALL-E 3 | OpenAI policy | Allowed (all tiers) |
| Stable Diffusion (open) | LAION dataset | Allowed (check model card) |
| Flux.1 Dev | Black Forest Labs | Research/personal only |
| Flux.1 Schnell | Black Forest Labs | Allowed (Apache 2.0) |
| Adobe Firefly | Adobe Stock (licensed) | Commercially safe |

**Safest for commercial use**: Adobe Firefly (indemnified), DALL-E 3, Flux.1 Schnell

### Disclosure requirements

- Do not pass off AI-generated content as original photography to consumers
- Some clients and platforms require disclosure of AI-generated content
- Establish an internal policy: label AI assets in your file system (`ai-generated/` folder)

---

## AI Design Tools Reference

| Tool | URL | Strengths | Pricing |
|------|-----|-----------|---------|
| **Midjourney** | midjourney.com | Best image quality, style control | $10-$60/mo |
| **DALL-E 3** | via ChatGPT / API | Instruction-following, API access | Pay per use |
| **Flux.1** | via replicate.com / local | Open weights, high quality | Free/API |
| **Adobe Firefly** | firefly.adobe.com | Commercial-safe, Photoshop integration | Creative Cloud |
| **Ideogram** | ideogram.ai | Best text-in-image generation | Free tier |
| **Recraft** | recraft.ai | Vector output, style library | Free tier |
| **Krea** | krea.ai | Real-time generation, style transfer | Free tier |

---

## Checklist

- [ ] Use case validated: AI generation appropriate for this asset (not brand/identity)
- [ ] Style fingerprint written and applied consistently across all prompts
- [ ] Seed or style reference used for series consistency
- [ ] AI output post-processed: background removed, colors matched to brand
- [ ] File format correct for use case (JPG for photos, PNG for transparency, SVG for scalable)
- [ ] Image compressed (target: <300KB for web)
- [ ] AI-generated files stored in labeled folder (`ai-generated/`)
- [ ] Commercial licensing verified for the tool used
- [ ] Disclosure added if required (internal policy or client requirement)
- [ ] Human designer reviewed before high-brand-stakes publication
