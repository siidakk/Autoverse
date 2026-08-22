# AutoVerse

**See your car before you change a thing.**

A 3D car configurator where every part is fitted by *measuring the car*, wired
to five machine learning features that each answer a question an owner actually
has: what would this look like modified, what should I buy, what is mine worth,
what car is that, and what will this dent cost.

Live at **[autoverse-two.vercel.app](https://autoverse-two.vercel.app)**

---

## Why it exists

This started with one car and one question: what would it look like lowered, on
different wheels? The obvious answer was to photograph it and ask an image
model.

What came back was always convincing and never right. The proportions drifted.
The wheels sat where wheels usually sit, not where they sit on *that* car. It
was a picture of a car like mine.

So everything here is **measured rather than imagined**, and that constraint is
what the code is actually about:

- Wheels are found by their geometry, not by mesh names — 130 of the 612
  materials across the eighteen models are literally called `material`, and the
  rest are things like `Material_694` and `notto3ds`.
- An exhaust is placed against the measured rear valance, so it tucks under a
  Corvette and under a Hilux without either being special-cased.
- Body paint is kept off the lamps because the lamps are found first.
- The damage scan says nothing when it is not sure, rather than guessing.

---

## What is in it

| Section | What it does | How |
|---|---|---|
| **Customise** | Build a car in 3D, price every part | react-three-fiber, geometric part fitting |
| **Discover** | Find a car for your budget | content-based filtering over 166 Indian models |
| **Value** | What a used car is worth | gradient boosted trees, R² 0.947 |
| **Identify** | Recognise a car and its paint from a photo | SSD-MobileNetV2 in the browser |
| **Repair** | Cost damage and its effect on resale | trained classifier, 83.0% held out |
| **Garage** | Saved builds, wishlist, recently viewed | JWT auth, MongoDB |

Plus a **design assistant** (say or type "red track car", thirteen settings
move), **AR preview** (stand the build on your driveway at 4.6 m), and a
**shared garage** (send a link, build the same car together in real time).

**Every vision feature runs on the device.** No photograph is uploaded anywhere.

---

## The machine learning, with real numbers

| Model | Approach | Measured |
|---|---|---|
| Recommender | hard filters plus weighted distance, explained results | 166 models |
| Valuation | HistGradientBoosting, plus two quantile models for the range | R² 0.947, ~13.7% typical error, 70.9% interval coverage |
| Car detection | SSD-MobileNetV2 via TensorFlow.js | on device |
| Damage | MobileNetV2 frozen + trained head, slid across the photo | **83.0%** on 2,026 held-out crops |
| Design assistant | keyword scoring — deliberately *not* an LLM | 17/17 phrasings |

Damage, per class: flat tyre 97.8 · glass shatter 96.8 · **undamaged 86.5** ·
lamp broken 85.9 · scratch 84.1 · dent 71.6 · crack 64.6.

`undamaged` is the number that matters — the hand-written scan this replaced had
no concept of an intact panel, which is why it flagged the grille on a clean car.

See [`ml/DAMAGE.md`](ml/DAMAGE.md) for how that model is built and what its
licence means.

---

## Running it

```bash
start.bat
```

Opens the database, the ML service, the API and the site, each in its own
window. Everything is installed on first run.

By hand:

```bash
cd backend  && npm install && npm start     # API on 5000
cd ml       && pip install -r requirements.txt && python app.py   # ML on 8000
cd frontend && npm install && npm run dev   # site on 5173
```

### Environment

`backend/.env`

| Key | Notes |
|---|---|
| `MONGO_URI` | Atlas, or `npm run db:local` for a local one |
| `JWT_SECRET` | required in production; the API refuses to start without it |
| `ML_API_URL` | where the Flask service lives |

`frontend/.env`

| Key | Notes |
|---|---|
| `VITE_API_URL` | the API |
| `VITE_ML_URL` | direct fallback for when the API is asleep |

---

## Tests

Nothing here can be checked by looking at it, so the parts that can be checked
without a renderer are.

```bash
cd frontend
npm run test:placement   # accessory maths over all 18 models
npm run test:lights      # lamp detection does not swallow bodywork
npm run test:engines     # cylinder count orders the engine notes
npm run validate:models  # a model's wheels are findable before it ships

cd backend
npm run test:auth        # 24 checks, including account enumeration
npm run test:builds      # saving and sharing
npm run test:live        # the shared garage: 9 checks
```

---

## Layout

```
frontend/
  src/utils/       geometry, free of three.js so the CLI runs the same code
  src/lib/         vision, damage, sound, AR, live rooms
  src/data/        cars, accessories, themes, engines, navigation
  tools/           model validation and placement checks
backend/
  routes/          auth, builds, ml proxy, valuation
  live.js          WebSocket rooms for the shared garage
ml/
  train_model.py   recommender
  train_price.py   valuation
  train_damage.py  damage classifier
```

The geometry lives in plain modules with no three.js import, so the command line
checkers run **byte for byte the same code** as the browser. That is how a
placement bug gets caught over eighteen models instead of one screenshot.

---

## Honest limitations

- **AR does not work on iPhone or iPad.** Safari has no WebXR.
- **Voice recognition leaves the device.** Chrome does it on Google's servers.
  Everything else here does not, and the panel says which is which.
- **Damage is a classifier, not a detector.** It is slid across the photo, so
  the smallest thing it can point at is one window. It will not outline a
  scratch.
- **One car's lamps are not detected.** The Porsche's rear is a single piece
  0.79 of the car's height, so there is nothing separate to leave unpainted.
- **The damage model is trained on CarDD**, which is licensed for
  non-commercial research and education. Fine for a portfolio; retraining would
  be required for anything commercial.

---

## Built with

React 19 · Vite · Tailwind 4 · three.js · react-three-fiber · Framer Motion ·
Express · MongoDB · ws · Flask · scikit-learn · TensorFlow · TensorFlow.js
