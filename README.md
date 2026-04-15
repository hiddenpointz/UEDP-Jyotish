# UEDP V4 Jyotish Engine

> **UEDP Protocol Version 4** (G.S. Ramesh Kumar) applied to Vedic horoscope construction — from birth details through planetary placement, dosha detection, karma-aware pariharas, and UEDP coherence-field timeline predictions.

---

## 🌐 Live Demo

Deploy instantly to Vercel (see [Deployment](#deployment) below).

---

## ✦ What This Is

This engine does two things simultaneously:

1. **Computes a full Vedic (Jyotish) horoscope** using Keplerian orbital mechanics, Lahiri Ayanamsa, and the Whole Sign house system
2. **Models every computation step as a UEDP V4 state transition**, measuring the coherence field Ω at each stage

The result is a horoscope where the *stability of the chart itself* is quantified mathematically — not just the positions, but how smoothly the system converged.

---

## ⚙️ UEDP V4 Mathematical Framework

### State Sequence

Every pipeline step (Julian Day → LST → Ascendant → Planet positions → House placement) is modeled as:

```
X = {x₀, x₁, x₂, ..., xₙ}
Δⱼ = xⱼ − xⱼ₋₁
dⱼ = sign(Δⱼ) ∈ {−1, 0, +1}
```

### Instability Sequence (Iseq)

```
Iseq = α·Σ|Δⱼ| + β·Σ|dⱼ − dⱼ₋₁| + γ·R
```

Where:
- `α = 0.5` — magnitude weight
- `β = 0.3` — direction change weight  
- `γ = 0.2` — reversal count weight
- `R` = number of direction reversals in the sequence

### Coherence Field (Ω)

```
Ω = Ψ · e^(−λ · Iseq)
```

Where:
- `Ψ = 1.0` — base amplitude
- `λ = 0.5` — decay constant

### Stability Condition

```
Ω ≥ 1/e ≈ 0.3679  →  STABLE
Ω < 1/e            →  BELOW CRITICAL THRESHOLD
```

### Minimum Effort Transition Path (METP)

```
METP = Σⱼ (Ωⱼ⁻¹ · |Δⱼ|)
```

Steps with low coherence cost more effort. Steps with smooth flow cost less.

### Kepler's Equation (UEDP Embedded)

The iterative solver for eccentric anomaly is itself tracked as a UEDP sequence:

```
Eₙ₊₁ = M + e·sin(Eₙ)

I_Kepler = Σ|Eₙ₊₁ − Eₙ|
```

---

## 🌌 Astronomical Computation Pipeline

```
Birth Data (DD/MM/YYYY HH:MM:SS + Lat/Lon/TZ)
    ↓
UTC Conversion: UT = LocalTime − Timezone
    ↓
Julian Day Number (JD):
  JD = 367Y − ⌊7(Y + ⌊(M+9)/12⌋)/4⌋ + ⌊275M/9⌋ + D + 1721013.5 + UT/24
    ↓
Lahiri Ayanamsa: λ_sid = λ_trop − Ayanamsa
    ↓
Keplerian Orbital Elements → Mean Anomaly → Kepler Solve → True Anomaly → Geocentric Longitude
    ↓
Local Sidereal Time: LST = GST + Longitude/15
    ↓
Ascendant: tan(Asc) = cos(lst) / −(sin(lst)·cos(ε) + tan(φ)·sin(ε))
    ↓
Whole Sign Houses: House_n = (AscSign + n − 1) mod 12
    ↓
Nakshatra: idx = ⌊(λ/360) × 27⌋, Pada = ⌊(λ mod (360/27)) / (360/27/4)⌋ + 1
    ↓
UEDP State Sequence → Iseq → Ω → Stability Assessment
```

---

## ⚡ Dosha Detection

Per **Surya Siddhanta** and **Atharva Veda**:

| Dosha | Condition | Source |
|---|---|---|
| Mangal Dosha | Mars in houses 1, 4, 7, 8, or 12 | Surya Siddhanta — Kuja Sthana Niyama |
| Kaal Sarp | All planets between Rahu and Ketu | Atharva Veda — Sarpa Sukta AV 6.56 |
| Pitra Dosha | Sun conjunct Rahu, or Sun in 9th afflicted | Atharva Veda — Pitru Tarpana AV 18.1 |
| Shani Sade Sati | Saturn in 12th, 1st, or 2nd from Moon | Surya Siddhanta — Shani Gochara Phala |
| Grahan Dosha | Sun or Moon within 15° of Rahu/Ketu | Surya Siddhanta — Rahu-Ketu Graha Dosha |
| Kemdrum Dosha | Moon isolated (no planets in adjacent houses) | Atharva Veda — Chandra Shanti Vidhi |

---

## 🙏 Parihara & Karma Barrier Analysis

Each dosha generates a parihara with:

- **Remedy** — the action prescribed
- **Ritual (Vidhi)** — step-by-step procedure
- **Mantra** — with repetition count
- **Deity** — presiding deity
- **Daan** — specific donations
- **Auspicious Timing** — nakshatra/tithi/weekday

### Karma Barrier (Unique Feature)

> *"Na karma dosha nashyati bina karma-phalasya bhoktrithvam"*  
> — Atharva Veda principle: No dosha dissolves without experiencing its karmic fruit.

The engine evaluates **why a parihara may not work** by checking:

1. **UEDP Ω** — if below 1/e, karma field is turbulent; remedies have reduced binding power
2. **Saturn placement** — if Saturn (karma karaka) is in dusthana (6/8/12), past-life karmic debt is still accruing
3. **Karma type** — Prarabdha (ripened) vs. Sanchita (seed form) karma assessment

For each barrier, a **karma override path** is provided — what must change at the behavioral/lifestyle level to allow the remedy to activate.

---

## 🔮 Predictions

Timeline predictions are generated per domain:

- 💼 Business & Career
- 🏛️ Politics & Public Recognition  
- 📢 Branding & Media
- 💍 Marriage & Partnership
- 👶 Children & Creativity
- 🏥 Health & Afflictions
- 💰 Financial Emergence

Each prediction includes:
- **Date range** (start → end)
- **UEDP Ω at that period** (projected)
- **Planetary triggers**
- **Specific action recommendations**

---

## 📁 Project Structure

```
uedp-jyotish/
├── lib/
│   └── uedpEngine.ts          # Core engine (all math)
├── pages/
│   ├── _app.tsx
│   ├── _document.tsx
│   ├── index.tsx              # Main UI
│   └── api/
│       └── horoscope.ts       # REST API endpoint
├── components/
│   ├── BirthForm.tsx          # Birth data input
│   ├── HoroscopeWheel.tsx     # SVG chart wheel
│   ├── UEDPDashboard.tsx      # Ω metrics + timeline
│   ├── PlanetTable.tsx        # Planet positions table
│   ├── PredictionsPanel.tsx   # Timeline predictions
│   └── DoshaPanel.tsx         # Dosha + Parihara
├── styles/
│   └── globals.css            # Cosmic theme
├── vercel.json
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

---

## 🚀 Deployment

### Local Development

```bash
npm install
npm run dev
# → http://localhost:3000
```

### Deploy to Vercel (Recommended)

**Option A — Vercel CLI:**
```bash
npm install -g vercel
vercel login
vercel deploy
```

**Option B — GitHub + Vercel Dashboard:**

1. Push this repo to GitHub:
```bash
git init
git add .
git commit -m "Initial commit: UEDP V4 Jyotish Engine"
git remote add origin https://github.com/YOUR_USERNAME/uedp-jyotish.git
git push -u origin main
```

2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Select `uedp-jyotish` → Deploy (no env vars needed — all client-side computation)

### API Usage

```bash
curl -X POST https://YOUR-APP.vercel.app/api/horoscope \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Native",
    "day": 14,
    "month": 4,
    "year": 1969,
    "hour": 10,
    "minute": 30,
    "second": 0,
    "latitude": 13.0827,
    "longitude": 80.2707,
    "timezone": 5.5,
    "gender": "male"
  }'
```

Response:
```json
{
  "chart": {
    "planets": [...],
    "houses": [...],
    "ascendantSign": "...",
    "uedp": {
      "omega": 0.4231,
      "iseq": 1.7203,
      "isStable": true,
      ...
    }
  },
  "doshas": [...],
  "pariharas": [...],
  "predictions": [...],
  "timeline": [...]
}
```

---

## ⚠️ Disclaimer

This software is for **research, education, and philosophical exploration**. The UEDP-Jyotish fusion is a creative experimental framework. For personal astrological guidance, consult a qualified Jyotisha. For medical, legal, or financial decisions, consult appropriate professionals.

---

## 📚 References

- G.S. Ramesh Kumar — *UEDP Protocol Version 4* (protocols.io)
- *Surya Siddhanta* — ancient Indian astronomical treatise
- *Atharva Veda* — fourth Veda (Sarpa Sukta AV 6.56, Pitru Tarpana AV 18.1)
- Swiss Ephemeris — orbital element reference
- B.V. Raman — *A Manual of Hindu Astrology*
- K.S. Krishnamurti — *Padhdhati* (KP system reference)

---

*UEDP V4 Jyotish · Built with Next.js 14 · Deployed on Vercel*
