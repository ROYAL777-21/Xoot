# The Xoot AI presenter — character brief

**Persona 01.** Written 2026-09-02 from a founder-supplied reference image.

## ⚠️ Why this document has to be this detailed

**The generator cannot see the reference image.** Higgsfield's tooling cannot read attachments from
a Claude conversation; media must arrive as a URL or an in-app upload, and a chat attachment is
neither. I can see the image. The model cannot.

**So this brief is the image.** Every detail that matters has to survive as text, because "match the
reference" is an instruction nothing downstream can follow.

---

## What she is, and the three lines she never crosses

She is a **brand presenter**. A character who hosts, narrates and demonstrates.

| She may | She may never |
|---|---|
| Present, host, narrate, demonstrate the product | Say she used Xoot, or that Xoot cleaned her home |
| Appear in lifestyle scenes as a brand character | Give a rating, a review, or a before/after account |
| Deliver a factual line about how booking works | Appear as a Xooter, a customer, or a member of staff |
| Be consistent and recognisable across the library | Be presented as a photograph of a real person |

**Every published asset carries an AI-generated marker.** Meta and TikTok both require disclosure,
and this is a brand asking women to let a stranger into their home. A brand caught undisclosed loses
more than the asset was worth.

Under **CPA s41** a misleading representation is misleading regardless of intent; the ARB code
treats a testimonial as requiring a real, identifiable person; `BRAND_GUIDE` independently bans
*"fake reviews, invented credentials"*. **The three rules above are the same rule three times.**

---

## The specification

### Person

- South African woman, mid-to-late twenties
- Athletic-slim, average height, natural proportions — **not a fashion-model silhouette**
- Long dark brown wavy hair, centre-parted, loose and slightly windblown, past the shoulder
- Warm mid-brown skin
- Softly defined brows, minimal makeup, no gloss or glam retouching
- Composed, level, unsmiling default expression. **Self-possessed rather than friendly** — she is not
  performing delight at a cleaning product
- Sunglasses pushed up onto the crown of the head as a recurring signature
- Small gold hoop earrings

### ⚠️ Vitiligo — the consistency anchor, and a deliberate choice

The reference carries **vitiligo**: irregular depigmented patches across the cheeks and chin, the
throat and collarbone, both forearms, and the midriff. Soft-edged, asymmetric, organic in outline.

**This is the single most valuable feature for a trained Soul.** It is what makes her unmistakably
one character across every future asset, in a way hair or clothing never can — those change; a skin
pattern does not.

**It is also a choice worth recording rather than copying.** On a real person, visible vitiligo reads
as representation. On a synthetic person it can read as costume if handled carelessly.

**The rule: keep it, and never mention it.** It is never referenced in copy, never a subject, never
framed as a story. She simply has it, the way a real person does. The moment it becomes a talking
point it stops being a face and starts being a device.

### Wardrobe — the signature look

- **Fitted graphic baby tee.** Y2K/vintage-rock print: washed greys, muted reds, faded black.
  Cropped just above the natural waist, cap sleeves, distressed print texture
- **Oversized khaki cargo trousers.** Low-slung, wide leg, thigh cargo pockets, drawstring hems
  puddling over the shoe
- **White leather low-top trainers**, box-fresh
- **Two chunky silver curb chains** at different lengths
- **Small tan-and-brown shoulder bag** on a short strap, worn high under the arm

⚠️ **Generated garment graphics produce garbled text.** The reference has it — the shirt reads
"R.TRADY", which is not a word. **Frame so print text is small, obscured, or out of focus**, or use
a wordless graphic. A legible nonsense word on a brand asset is the tell that undoes the rest.

### Environment

**The point of the whole direction, and where the category is beatable.** Every cleaning brand shoots
an empty white kitchen. This does the opposite.

- Real urban South African street: a crossing, a weathered mid-rise, exterior aircon units, tangled
  overhead cabling, a market awning, painted zebra stripes underfoot
- **Real passers-by in frame, mid-motion, not looking at camera.** They make it a photograph rather
  than a set
- Lived-in, not derelict. Ordinary, not picturesque

For interior work: a real-feeling Cape Town or Johannesburg flat — occupied, slightly cluttered, with
possessions in it. **Never a showroom.**

### Camera and light

- **Flat-on, eye-level, centred, full-length**, subject occupying roughly the middle third
- Phone-camera feel: mild wide-angle, deep focus, no shallow depth of field
- **Flat overcast daylight.** No modelling, no rim light, no golden hour. Cheap to reproduce
  consistently and reads as captured rather than lit
- Slight overexposure in the sky, mild sensor noise in shadow

### Palette

Khaki, warm grey, washed black, off-white, muted brick red, weathered concrete, silver hardware.
It already sits close to the Xoot design kit, which is why the direction works.

---

## Prompt skeleton

Reused across the character sheet and every later asset, so drift has one place to creep in:

> South African woman in her late twenties, mid-brown skin with soft irregular vitiligo patches
> across cheeks, chin, throat, forearms and midriff. Long dark brown wavy centre-parted hair,
> sunglasses pushed up on her head, small gold hoops, two chunky silver curb chains. Fitted cropped
> vintage-rock graphic tee in washed grey and muted red, oversized khaki cargo trousers with
> drawstring hems, white leather low-top trainers, small tan shoulder bag. Standing on an urban
> street crossing, weathered mid-rise buildings, exterior aircon units, overhead cables, market
> awning, ordinary passers-by mid-motion. Flat overcast daylight, phone-camera look, mild wide angle,
> deep focus, eye-level, centred, full length. Composed neutral expression.

**Negative direction:** studio lighting, shallow depth of field, glamour retouching, empty white
interiors, legible garment text, direct-to-camera smiling, stock-photo staging.

---

## Production route

**Reusable Soul, not one-off generations.** Consistency across a library that will grow is the entire
value; one-off `soul_cast` output drifts between assets and defeats the purpose.

| Step | Tool | Note |
|---|---|---|
| 1 | `get_workflow_instructions({workflow: "character-sheet"})` | Load before generating — its own tooling says so |
| 2 | `generate_image_batch`, 8–12 frames | Varied angle, expression, framing. Same palette and light |
| 3 | **Founder reviews the sheet** | The last checkpoint before credits become an identity |
| 4 | `show_characters(action='train')` | Soul training, 5–20 inputs |
| 5 | Record `soul_id` in `personas/01-*.md` | A Soul whose id is unrecorded cannot be reused |
| 6 | `soul_2` + `soul_id` for every later asset | — |

**`get_cost` before every batch.** `use_unlim` is left unset so the server asks rather than silently
choosing which balance to spend.

---

## What she is for

Cells 1 and 3 of the week-one grid in [`ad-matrix-and-avatars.md`](./ad-matrix-and-avatars.md),
targeting **Avatar A — The Reclaimed Weekend** on hooks H1 (the guilt name) and H2 (the time
arithmetic).

**Cell 2 is the same hook without her.** That pair is the only comparison that shows whether she is
adding or costing, and it is the reason to run the week at all.

⛔ **Nothing is published before phase 1 of the go-live guide.** `xoot.co.za` currently serves a
GoDaddy placeholder, and pointing attention at it is the mistake that triples acquisition cost.
