# Prompts for generating hero photographs

Used with Google Gemini, which is what the existing three were made with —
see `public/ASSET-PROVENANCE.md`. Staying on the same generator keeps that
file's rights reasoning valid for the whole rotation instead of splitting it
across two sources with two different sets of terms.

## The part that matters most

These images rotate on one page, one per visit. A visitor who reloads three
times sees three of them in a row, so **consistency across the set matters
more than any single image being beautiful.** One shot with a different light
direction or a different table reads as a mistake, not as variety. That is
what the fixed style block below is for — paste it unchanged after every
dish line.

Variety comes from the food: different colours, different vessels, different
shapes of dish. Not from different treatments.

## One dish per generation. Never a grid.

The single most likely way to waste an afternoon here: asking the model for
all twelve at once and getting back one contact sheet.

It looks like a win — twelve dishes, one prompt, and the styling is usually
right. But the model spends its output resolution on the whole sheet, not on
each dish. A 1672x941 grid of twelve is **418x313 per dish**, which is about
a quarter of what the hero needs, and no amount of upscaling puts back detail
that was never captured. `npm run hero:add` refuses sources under 1600px for
exactly this reason, so the whole batch bounces.

Twelve separate generations. Each one a single dish, 16:9, full resolution.

## Settings

- **Aspect ratio: 16:9.** Closest to the 1.83 the hero wants, so the crop
  takes almost nothing.
- **Highest resolution the model offers.** Minimum 1600px wide. Gemini 3 Pro
  Image goes to 4K; the older Flash image models cap near 1024px, which is
  too small — `npm run hero:add` will refuse those, correctly.
- **No text rendering.** The wordmark is drawn by the page. Any text baked
  into the photograph will collide with it.

## The style block

Paste this after every dish line, unchanged:

> Photorealistic food photography, 16:9 landscape, high three-quarter
> overhead angle. Served on traditional Indian stainless steel on a
> weathered dark teak table. Soft directional daylight from a window to the
> left, deep natural shadows, warm and slightly moody. Shallow depth of
> field, tack sharp on the food. Muted earthy palette — browns, cream,
> turmeric yellow, deep green. An Indian home kitchen, lived-in, not a
> restaurant and not a studio set. Keep the upper-middle third of the frame
> calm and uncluttered. No text, no lettering, no people, no hands, no
> logos.

The last two sentences are load-bearing. The Poshan wordmark sits centred
over the upper middle, so a busy composition there fights it; and generated
food photographs volunteer invented Devanagari-looking text on packaging and
napkins, which looks wrong to anyone who reads the script.

## The twelve dishes

Regionally spread to match the app's own north / south / east / west split,
and chosen to look different from one another — a rotation of twelve brown
curries is still a monotonous rotation.

**All vegetarian. That is the one hard content rule for this folder.**

| Save as | Prompt (+ style block) |
|---|---|
| `rajma-chawal.jpg` | Rajma chawal — dark red kidney bean curry beside plain steamed rice in a steel thali, a wedge of raw onion and a green chilli at the rim. |
| `idli-sambar.jpg` | Three soft white idlis in a steel plate with a bowl of sambar and a bowl of coconut chutney beside them, curry leaves in the sambar. |
| `chole-bhature.jpg` | Chole bhature — dark spiced chickpea curry in a steel bowl with one large puffed golden bhatura beside it, sliced onion and a green chilli. |
| `poha.jpg` | Poha — flattened rice tinted yellow with turmeric, scattered with peanuts, fresh coriander and thin sev, a lemon wedge at the side. |
| `dal-khichdi.jpg` | Dal khichdi in a steel bowl, soft and golden, a spoon of ghee melting on top, a small bowl of plain yoghurt and a papad beside it. |
| `uttapam.jpg` | A thick uttapam topped with chopped onion, tomato and coriander, cooked golden at the edges, with coconut chutney in a small steel bowl. |
| `pav-bhaji.jpg` | Pav bhaji — deep red-orange mashed vegetable bhaji in a steel bowl with butter melting on it, two soft toasted pav beside it, chopped onion and lemon. |
| `baingan-bharta.jpg` | Baingan bharta — smoky mashed aubergine in a steel bowl, flecked with coriander, beside two rotis stacked on a steel plate. |
| `curd-rice.jpg` | Curd rice in a steel bowl, white and soft, tempered with mustard seeds and curry leaves, a spoonful of lime pickle at the side. |
| `dhokla.jpg` | Steamed yellow dhokla cut into squares on a steel plate, tempered with mustard seeds and green chilli, garnished with grated coconut and coriander. |
| `litti-chokha.jpg` | Litti chokha — round roasted wheat litti, cracked open, beside mashed aubergine-and-tomato chokha, with a bowl of melted ghee. |
| `sarson-saag.jpg` | Sarson ka saag — deep green mustard greens in a steel bowl with a pat of white butter on top, beside a makki ki roti on a steel plate. |

## After generating

Save each with the filename in the left column — `hero:add` takes the name
from the file, so `Gemini_Generated_Image_a1b2c3.png` becomes a hero called
`gemini-generated-image-a1b2c3.jpg`, which nobody will ever want to read in
a folder listing.

Then, from the repo root:

```
npm run hero:add -- ~/Downloads/rajma-chawal.jpg ~/Downloads/idli-sambar.jpg
npm run hero:check
```

`hero:add` crops to 1.83 using an attention-based crop, so a 16:9 source
loses only a sliver and keeps the plate rather than whichever half of the
frame it sat in. It refuses anything under 1600px instead of upscaling, and
skips a name already in the folder rather than overwriting it.

Finally, add the new files to the table in `public/ASSET-PROVENANCE.md`.
That is not optional bookkeeping — it is the file a due-diligence review asks
for first, and a rotation is exactly the kind of thing that grows quietly
until nobody can say where a given image came from.

## If an image comes out wrong

The three failures worth re-rolling for, rather than accepting:

- **Anything non-vegetarian.** Generated "Indian food" drifts towards
  chicken. Check every plate.
- **Invented text.** Devanagari-shaped glyphs that are not words, on a
  packet or a cloth in frame.
- **A busy centre.** If the composition puts the dish dead centre with no
  calm space above it, the wordmark will sit on top of the food.
