# MADSET case-study direction

Reference: https://www.behance.net/gallery/246762403/Zynora-Intelligent-Fitness-App

The presentation adopts the reference's dark canvas, asymmetric oversized cover, small marginal labels, fine rules, large staggered phone screens, two-column challenge/response, and fashion-led athlete photography. It uses MADSET's actual screen captures and own dot typography; no Zynora artwork or app screens are copied.

The generic campaign-results counters are replaced by stable product metadata. Version strings and app-size counters do not belong in an animated results grid. No new performance claims are introduced.

Source assets: real September 12 screen captures and app typography from the existing Claude MADSET case-study folder. They are now versioned under public/madset-case. The existing CMS project/media are preserved; its video URL and poster feed the new walkthrough.

Photography correction: people in refined technical activewear, contemporary styling, dark mood and readable shadows. No weights, bars, dumbbells, bodybuilders or gym-equipment detail shots. Rejected imagery is excluded from this release.

## Magnific prompts

### Portrait
Photorealistic premium activewear fashion campaign portrait for a contemporary fitness app. Athletic adult man, late twenties, elegant short dark hair, wearing a beautifully fitted charcoal technical zip-up running jacket with a high collar, matte fabric and subtle tailored panel details, fully clothed. Three-quarter side profile looking slightly upward, calm focused expression, waist-up crop. Sophisticated dark studio atmosphere, nearly black charcoal background, broad soft neutral silver side light revealing face and fabric clearly, delicate cool edge light, subtle natural skin texture. Minimal, polished, tasteful athletic editorial photography, modern luxury sportswear catalogue, strong negative space, restrained desaturated colour grading. NO gym equipment, NO barbells, NO dumbbells, NO shirtless bodybuilder, NO flexing, NO grungy gym, NO dramatic sweat, NO neon, NO text or logos. The person and the clothing are the hero.

### Movement
Photorealistic contemporary luxury activewear fashion campaign. An athletic adult woman in her late twenties with hair in a neat low bun, wearing a stylish black long-sleeve performance top and graphite technical running shorts over sleek black leggings, clean minimal trainers. Fully clothed, poised relaxed walking stride between training sessions, profile facing right, confident natural posture. Three-quarter to full body, subject occupies the right half of a spacious wide composition. Dark architectural studio, charcoal seamless floor and wall, soft directional neutral daylight with subtle silver highlights on the fabric, readable details in shadows. Premium modern fitness-app editorial imagery, refined sports fashion, understated and human, soft desaturated colours, crisp materials. Left half mostly clear dark negative space for separate website typography. NO weights, NO barbell, NO dumbbell, NO equipment, NO sweaty bodybuilding, NO busy gym, NO neon, NO text, NO logos, NO graphics.

### Movement cleanup
Edit the supplied photograph. Remove every letter, word, logo and graphic from the entire LEFT HALF of the image. Replace the white fake writing with the same plain, empty charcoal wall texture, seamlessly. Keep the athlete on the right, her face, clothing, pose, lighting, floor and full photographic composition unchanged. Final output is ONLY a clean photograph of the athlete against the dark wall, with NO TEXT ANYWHERE. There must be absolutely no letters or symbols in the left half.

Output assets: public/madset-case/portrait.webp and public/madset-case/movement.webp. Generated with Magnific, converted to WebP for the website. All interface imagery is from the original app, not generated UI.

## Implementation

src/madset-case.js and src/madset-case.css apply only to the Vision/madset project. Other project templates remain intact. For future edits, change this presentation source; changing old gallery modules in Sanity alone will not change this curated layout. Keep existing CMS media archived rather than reseeding it.

src/avatar-pointer.js maps the viewport to the avatar's centre with bounded [-1, 1] gaze. Homepage opts in via gazeScope: viewport. Head hover, eye rig range, GLB assets, calibrated skin/lighting, and the lab's local controls are preserved. Listeners reset on window leave/blur/cancel and are removed on dispose.

## Vision listing cover — September 12

The user requested a photographic designed cover for the Vision project card. `coverImageUrl` now uses `public/madset-case/cover.webp` for Vision/MADSET only. The CMS cover is preserved. This asset is 1586 × 992, WebP; its composition matches the card's 16:10 ratio.

Generated with the built-in image generator, using `portrait.webp` as the photographic reference and `home.webp` as the actual app-screen reference. Original output: `/Users/mad/.codex/generated_images/01a08ace-fa49-7943-93e0-449ba9b8858c/exec-44cb1a72-75f2-4c4e-9dad-ca8efa2571dd.png`.

Prompt: Create a finished premium editorial portfolio cover image for MADSET, a real iOS training app. Wide landscape 16:10 aspect ratio, at least 1600px wide. Input 1 is the athletic fashion portrait to use as the photographic hero; input 2 is the ACTUAL app screenshot to insert faithfully, do not invent or redraw its UI. Art direction: exquisite Swiss sports-fashion / digital product campaign, restrained almost-black charcoal, silver-white typography, very small electric blue #1200FF accent only. Composition: striking asymmetric large typography on left reading exactly 'MADSET.' in heavy grotesque sans, smaller two-line tagline exactly 'Built for / the next set.' below; portrait face and refined technical jacket occupy right half, integrated into dark background and cropped thoughtfully without cutting face. A prominent upright slightly tilted realistic dark titanium phone mockup occupies lower middle overlapping the portrait's lower torso, showing the input 2 dashboard faithfully. Balance clear portrait, name and app so the image reads at a small portfolio thumbnail. Small top left label 'TRAINING, WITH INTENTION', small top right 'iOS / 2026'. Fine minimal editorial rules, generous spacing, dramatic but clean silver rim lighting, subtly textured charcoal background. All main content within 8 percent safe margins. Keep bottom-left 12 percent relatively quiet for website overlay button. Sophisticated designed artboard, not just portrait plus huge floating words. No equipment, no dumbbells, barbells, gym machines, no purple, no invented interface, no extra logos, no watermark, no web browser chrome. One finished cover, not a collage of alternatives.
