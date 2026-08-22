# The damage classifier

Phase 6's photo scan, rebuilt as a trained model instead of a hand written one.

## Why it was rebuilt

The first version measured image gradients and colour and inferred damage from
them. It did not work, and it could not be made to work by tuning: it flagged
the grille and the badge on an undamaged car, then found nothing at all on a
wrecked one. Telling a dent from a reflection is not a rule anybody can write
down — both are places where a smooth surface stops being smooth.

So the rule is learned. The measured version is still there and still runs when
no trained model has been built, but it now says on screen that that is what it
is doing.

## What it does and does not do

**Does:** name the kind of damage in a region of a photograph — dent, scratch,
crack, glass shatter, tyre flat, lamp broken — with a confidence, and mark
roughly where in the frame it is.

**Does not:** measure how deep, how large in centimetres, or what the repair
costs. The costing already asks you to confirm severity and panel, and it
should keep asking. A model trained on 2,816 photographs is not an estimator.

Localisation is coarse by construction. The model classifies a square window;
the smallest thing it can report is one window. It is not a detector and does
not draw a tight box round a scratch.

## How it is built

```bash
pip install huggingface_hub
python prepare_damage_data.py    # downloads CarDD, cuts it into crops
python train_damage.py           # trains and reports honest numbers
pip install tensorflowjs
python export_damage_tfjs.py     # writes frontend/public/models/damage/
```

**`prepare_damage_data.py`** — CarDD gives 6,211 boxes drawn round damage on
2,816 photographs. The unit of training is the box, not the photograph: a
picture of a car with one scratched door is mostly undamaged car, and feeding
the whole frame in teaches the model about bonnets. Each box is cut out with
25% context around it, because damage is partly recognisable by how it
interrupts a surface.

It also cuts **negatives** — regions of the same photographs that overlap no
box — and files them as `undamaged`. Without those the classifier has never
seen an intact panel and will call everything damage. Those negatives are the
reason the finished scan can look at a clean car and say so.

**`train_damage.py`** — MobileNetV2, ImageNet weights, frozen, used only as a
feature extractor. A dropout layer and one dense layer on top are the only
things trained. This is deliberate:

- it works with thousands of images rather than millions, which is all the
  public car damage sets have;
- the features can be cached, so training takes seconds on a CPU rather than
  hours on a GPU this machine does not have;
- the same backbone runs in the browser, so the photograph never leaves the
  phone.

It splits off a test set before fitting anything, weights the classes (CarDD
has 2,560 scratches and 225 flat tyres), and prints per-class precision and
recall and a confusion matrix rather than one accuracy number.

It also measures a **confidence floor**: how sure the model is when it turns
out to be right, against when it turns out to be wrong. Below that floor the
app says nothing rather than guessing. A scan that admits it cannot tell is
worth more than one that always answers — that was the whole problem with the
version this replaces.

## Licence, and what that means for you

**CarDD is licensed for non-commercial research and education only.** Its
images come from Flickr and Shutterstock and the dataset does not own their
copyright.

- The dataset and every crop taken from it are gitignored. Nothing is
  redistributed from this repository.
- The **trained weights are a derived work** of that dataset. Shipping them in
  `frontend/public/models/damage/` is consistent with a student portfolio, and
  is not consistent with selling this. If AutoVerse ever becomes commercial,
  that model has to be retrained on data licensed for it — the pipeline does
  not care where the images come from, so it would be a re-run rather than a
  rewrite.

Cite the dataset if you write this up:

> Wang, X., Li, W., Wu, Z. *CarDD: A New Dataset for Vision-based Car Damage
> Detection.* IEEE Transactions on Intelligent Transportation Systems, 2023.
