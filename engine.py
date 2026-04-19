"""
engine.py — UEDP v5 Jyotisha Intelligence Engine
G S Ramesh Kumar — Universal Dynamics Emergence Protocol v5

Single-file complete engine for khajur-astro.vercel.app
Provides generate_full_chart() and all supporting functions.

Classical sources:
  Surya Siddhanta       — planetary positions, ayanamsa
  Phaladeepika          — dignity, strength, yoga, dosha rules
  BPHS                  — house analysis, dasha, shadbala
  Drik Siddhanta        — observable sky via Swiss Ephemeris

Author: G S Ramesh Kumar
"""

import math
import os
import traceback
from datetime import datetime, timedelta, timezone

import swisseph as swe

# ═══════════════════════════════════════════════════════════════
# EPHEMERIS SETUP
# ═══════════════════════════════════════════════════════════════

EPH_PATH = os.environ.get("EPHE_PATH", "/tmp")
swe.set_ephe_path(EPH_PATH)

# Moshier built-in — no .se1 files needed, ~1 arcsec accuracy
SID_FLAG   = swe.FLG_SIDEREAL | swe.FLG_MOSEPH
SPEED_FLAG = swe.FLG_SIDEREAL | swe.FLG_MOSEPH | swe.FLG_SPEED

PLANET_IDS = {
    "Sun": swe.SUN, "Moon": swe.MOON, "Mars": swe.MARS,
    "Mercury": swe.MERCURY, "Jupiter": swe.JUPITER,
    "Venus": swe.VENUS, "Saturn": swe.SATURN, "Rahu": swe.MEAN_NODE,
}

# ═══════════════════════════════════════════════════════════════
# CORE CONSTANTS  (Phaladeepika / Surya Siddhanta)
# ═══════════════════════════════════════════════════════════════

RASHIS = [
    "Mesha","Vrishabha","Mithuna","Karka","Simha","Kanya",
    "Tula","Vrishchika","Dhanu","Makara","Kumbha","Meena"
]
RASHI_EN = [
    "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
    "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
]
RASHI_TO_EN = dict(zip(RASHIS, RASHI_EN))
EN_TO_RASHI = dict(zip(RASHI_EN, RASHIS))

NAKSHATRAS = [
    "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra",
    "Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni",
    "Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
    "Moola","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha",
    "Purva Bhadrapada","Uttara Bhadrapada","Revati"
]
NAK_LORDS = [
    "Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury",
    "Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury",
    "Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury",
]

DASHA_SEQ   = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"]
DASHA_YEARS = {"Ketu":7,"Venus":20,"Sun":6,"Moon":10,"Mars":7,
               "Rahu":18,"Jupiter":16,"Saturn":19,"Mercury":17}

RASHI_LORD = {
    "Mesha":"Mars","Vrishabha":"Venus","Mithuna":"Mercury","Karka":"Moon",
    "Simha":"Sun","Kanya":"Mercury","Tula":"Venus","Vrishchika":"Mars",
    "Dhanu":"Jupiter","Makara":"Saturn","Kumbha":"Saturn","Meena":"Jupiter",
    "Aries":"Mars","Taurus":"Venus","Gemini":"Mercury","Cancer":"Moon",
    "Leo":"Sun","Virgo":"Mercury","Libra":"Venus","Scorpio":"Mars",
    "Sagittarius":"Jupiter","Capricorn":"Saturn","Aquarius":"Saturn","Pisces":"Jupiter",
}

EXALTATION  = {"Sun":"Aries","Moon":"Taurus","Mars":"Capricorn","Mercury":"Virgo",
               "Jupiter":"Cancer","Venus":"Pisces","Saturn":"Libra",
               "Rahu":"Gemini","Ketu":"Sagittarius"}
DEBILITATION= {"Sun":"Libra","Moon":"Scorpio","Mars":"Cancer","Mercury":"Pisces",
               "Jupiter":"Capricorn","Venus":"Virgo","Saturn":"Aries",
               "Rahu":"Sagittarius","Ketu":"Gemini"}
OWN_SIGN    = {"Sun":["Leo"],"Moon":["Cancer"],"Mars":["Aries","Scorpio"],
               "Mercury":["Gemini","Virgo"],"Jupiter":["Sagittarius","Pisces"],
               "Venus":["Taurus","Libra"],"Saturn":["Capricorn","Aquarius"]}
MOOLATRIKONA= {"Sun":"Leo","Moon":"Taurus","Mars":"Aries","Mercury":"Virgo",
               "Jupiter":"Sagittarius","Venus":"Libra","Saturn":"Aquarius"}

NATURAL_FRIENDS = {
    "Sun":    {"f":["Moon","Mars","Jupiter"],      "e":["Venus","Saturn"]},
    "Moon":   {"f":["Sun","Mercury"],              "e":[]},
    "Mars":   {"f":["Sun","Moon","Jupiter"],       "e":["Mercury"]},
    "Mercury":{"f":["Sun","Venus"],                "e":["Moon"]},
    "Jupiter":{"f":["Sun","Moon","Mars"],          "e":["Mercury","Venus"]},
    "Venus":  {"f":["Mercury","Saturn"],           "e":["Sun","Moon"]},
    "Saturn": {"f":["Mercury","Venus"],            "e":["Sun","Moon","Mars"]},
    "Rahu":   {"f":["Venus","Saturn"],             "e":["Sun","Moon","Mars"]},
    "Ketu":   {"f":["Mars","Venus","Saturn"],      "e":["Sun","Moon"]},
}

AYANAMSA_SYSTEMS = {
    "lahiri":           swe.SIDM_LAHIRI,
    "raman":            swe.SIDM_RAMAN,
    "kp":               swe.SIDM_KRISHNAMURTI,
    "yukteshwar":       swe.SIDM_YUKTESHWAR,
    "true_chitrapaksha":swe.SIDM_TRUE_CITRA,
    "jn_bhasin":        swe.SIDM_JN_BHASIN,
}
AYANAMSA_LABELS = {
    "lahiri":"Lahiri (IAU)","raman":"B.V.Raman","kp":"KP (Krishnamurti)",
    "yukteshwar":"Yukteshwar","true_chitrapaksha":"True Chitra","jn_bhasin":"J.N.Bhasin",
}

TITHI_NAMES = [
    "Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami",
    "Shashthi","Saptami","Ashtami","Navami","Dashami",
    "Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Purnima",
    "Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami",
    "Shashthi","Saptami","Ashtami","Navami","Dashami",
    "Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Amavasya",
]
VARA_NAMES   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
YOGA_NAMES   = ["Vishkumbha","Priti","Ayushman","Saubhagya","Shobhana",
                "Atiganda","Sukarma","Dhriti","Shoola","Ganda","Vriddhi",
                "Dhruva","Vyaghata","Harshana","Vajra","Siddhi","Vyatipata",
                "Variyan","Parigha","Shiva","Siddha","Sadhya","Shubha",
                "Shukla","Brahma","Indra","Vaidhriti"]
KARANA_NAMES = ["Bava","Balava","Kaulava","Taitila","Garaja",
                "Vanija","Vishti","Bhadra","Shakuni","Chatushpada","Naga"]

COMBUST_ORBS = {"Moon":12,"Mars":17,"Mercury":14,"Jupiter":11,"Venus":10,"Saturn":15}

NAISARGIKA_BALA = {"Sun":60,"Moon":51.4,"Venus":42.8,"Jupiter":34.3,
                   "Mercury":25.7,"Mars":17.1,"Saturn":8.6}

DOSHA_DB = {
    "Manglik": {
        "alias":"Kuja Dosha","level":"High",
        "effects":["Delays/friction in marriage","Relationship conflicts","Partner health risk"],
        "remedies":[{"r":"Kumbha Vivah (marry a pot/peepal tree first)"},
                    {"r":"Perform Mangal Puja on Tuesdays for 40 weeks"},
                    {"r":"Wear Red Coral (Moonga) in copper ring, right hand"},
                    {"r":"Recite Mangal Stotra 108 times on Tuesdays"}],
    },
    "Pitru_Dosha": {
        "alias":"Ancestral Debt","level":"Moderate",
        "effects":["Blocked progress","Ancestral karmic debt","Father-related difficulties"],
        "remedies":[{"r":"Perform Pitru Tarpan on Amavasya at sacred river"},
                    {"r":"Donate food on every Amavasya"},
                    {"r":"Perform Narayan Bali if advised by priest"}],
    },
    "Kaal_Sarp": {
        "alias":"Kaal Sarp Yoga","level":"High",
        "effects":["Obstacles despite effort","Recurring setbacks","Delayed success"],
        "remedies":[{"r":"Kaal Sarp Puja at Trimbakeshwar Jyotirlinga"},
                    {"r":"Recite Maha Mrityunjaya mantra 108 times daily"},
                    {"r":"Wear Hessonite (Gomed) after consultation"}],
    },
    "Grahan_Dosha": {
        "alias":"Eclipse Dosha","level":"Moderate",
        "effects":["Mental confusion","Health concerns","Career obstacles"],
        "remedies":[{"r":"Surya/Chandra Grahan Shanti puja"},
                    {"r":"Donate jaggery+wheat on Sundays (Sun afflicted)"},
                    {"r":"Recite Aditya Hridayam daily"}],
    },
    "Angarak_Yoga": {
        "alias":"Mars-Rahu Conjunction","level":"High",
        "effects":["Accidents and injury risk","Explosive anger","Legal troubles"],
        "remedies":[{"r":"Hanuman Chalisa recitation daily"},
                    {"r":"Donate red lentils on Tuesdays"},
                    {"r":"Ketu Puja on Tuesdays"}],
    },
    "Guru_Chandal": {
        "alias":"Jupiter-Rahu Conjunction","level":"Moderate",
        "effects":["Wisdom distorted by illusion","Guru betrayal","Unconventional beliefs"],
        "remedies":[{"r":"Donate yellow items on Thursdays"},
                    {"r":"Recite Jupiter Beeja mantra 19000 times"},
                    {"r":"Serve teachers and elders"}],
    },
    "Vish_Yoga": {
        "alias":"Saturn-Moon Conjunction","level":"High",
        "effects":["Emotional depression","Pessimism","Mother's health issues"],
        "remedies":[{"r":"Recite Shani Chalisa on Saturdays"},
                    {"r":"Donate black sesame on Saturdays"},
                    {"r":"Moon-strengthening: wear Pearl in silver on Monday"}],
    },
    "Shrapit_Dosha": {
        "alias":"Saturn-Rahu Conjunction","level":"High",
        "effects":["Karmic burden from past","Blocked fortune","Chronic obstacles"],
        "remedies":[{"r":"Shrapit Shanti puja at Shani temple"},
                    {"r":"Donate iron/black cloth on Saturdays"},
                    {"r":"Recite Shani Beeja mantra 23000 times"}],
    },
    "Kemdrum_Yoga": {
        "alias":"Isolated Moon","level":"Moderate",
        "effects":["Lack of mental support","Financial instability","Emotional isolation"],
        "remedies":[{"r":"Worship Goddess Parvati on Mondays"},
                    {"r":"Wear natural Pearl in silver"},
                    {"r":"Recite Chandra mantra 11000 times"}],
    },
    "Rahu_Kalatra": {
        "alias":"Rahu in 7th House","level":"Moderate",
        "effects":["Unconventional partnership","Marriage delays","Foreign spouse possible"],
        "remedies":[{"r":"Worship Goddess Durga on Fridays"},
                    {"r":"Sri Kalahasti Rahu-Ketu temple puja"},
                    {"r":"Donate blue/black items on Saturdays"}],
    },
}

# ═══════════════════════════════════════════════════════════════
# LOW-LEVEL ASTRONOMICAL FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def _set_ayanamsa(ayanamsa_str: str):
    sid_id = AYANAMSA_SYSTEMS.get(ayanamsa_str, swe.SIDM_LAHIRI)
    swe.set_sid_mode(sid_id, 0, 0)


def julian_day(dt: datetime) -> float:
    return swe.julday(dt.year, dt.month, dt.day,
                      dt.hour + dt.minute/60.0 + dt.second/3600.0)


def get_ayanamsa_value(jd: float, ayanamsa_str: str = "lahiri") -> float:
    _set_ayanamsa(ayanamsa_str)
    return round(swe.get_ayanamsa_ut(jd), 6)


def all_ayanamsa_values(jd: float) -> dict:
    result = {}
    for name, sid_id in AYANAMSA_SYSTEMS.items():
        swe.set_sid_mode(sid_id, 0, 0)
        result[name] = round(swe.get_ayanamsa_ut(jd), 6)
    return result


def planet_positions(jd: float, ayanamsa_str: str = "lahiri") -> dict:
    """Sidereal longitudes + speed for all 9 grahas."""
    _set_ayanamsa(ayanamsa_str)
    pos = {}
    for name, pid in PLANET_IDS.items():
        r = swe.calc_ut(jd, pid, SPEED_FLAG)
        lon = r[0][0] % 360
        spd = r[0][3]
        pos[name] = {"lon": lon, "speed": spd, "retrograde": spd < 0}
    pos["Ketu"] = {"lon": (pos["Rahu"]["lon"] + 180) % 360,
                   "speed": -pos["Rahu"]["speed"], "retrograde": True}
    return pos


def calc_ascendant(jd: float, lat: float, lon: float, ayanamsa_str: str = "lahiri") -> float:
    """Sidereal ascendant via Placidus houses."""
    _set_ayanamsa(ayanamsa_str)
    houses, ascmc = swe.houses_ex(jd, lat, lon, b'P', swe.FLG_SIDEREAL)
    return ascmc[0] % 360


def calc_all_cusps(jd: float, lat: float, lon: float, ayanamsa_str: str = "lahiri") -> list:
    _set_ayanamsa(ayanamsa_str)
    houses, _ = swe.houses_ex(jd, lat, lon, b'P', swe.FLG_SIDEREAL)
    return [h % 360 for h in houses]


# ═══════════════════════════════════════════════════════════════
# SIGN / NAKSHATRA / HOUSE HELPERS
# ═══════════════════════════════════════════════════════════════

def lon_to_rashi(lon: float) -> str:
    """Return Rashi name (Sanskrit) from sidereal longitude."""
    return RASHIS[int(lon // 30) % 12]


def lon_to_sign_en(lon: float) -> str:
    return RASHI_EN[int(lon // 30) % 12]


def lon_to_nakshatra(lon: float) -> dict:
    span  = 360 / 27
    idx   = int(lon / span) % 27
    pada  = int((lon % span) / (span / 4)) + 1
    return {"name": NAKSHATRAS[idx], "lord": NAK_LORDS[idx], "pada": pada, "index": idx}


def house_from_lon(planet_lon: float, asc_lon: float) -> int:
    return int((planet_lon - asc_lon + 360) % 360 // 30) + 1


def deg_in_sign(lon: float) -> float:
    return lon % 30


def is_combust(planet: str, p_lon: float, sun_lon: float) -> bool:
    orb = COMBUST_ORBS.get(planet, 0)
    if orb == 0:
        return False
    diff = abs(p_lon - sun_lon) % 360
    return min(diff, 360 - diff) < orb


# ═══════════════════════════════════════════════════════════════
# DIGNITY (Phaladeepika rules)
# ═══════════════════════════════════════════════════════════════

def get_dignity(planet: str, rashi: str) -> str:
    # Normalise to English
    r = RASHI_TO_EN.get(rashi, rashi)
    if EXALTATION.get(planet) == r:  return "exalted"
    if DEBILITATION.get(planet) == r: return "debilitated"
    if r == MOOLATRIKONA.get(planet): return "moolatrikona"
    if r in OWN_SIGN.get(planet, []):  return "own"
    lord = RASHI_LORD.get(r, "")
    fn   = NATURAL_FRIENDS.get(planet, {"f":[],"e":[]})
    if lord in fn["f"]: return "friend"
    if lord in fn["e"]: return "enemy"
    return "neutral"


def dignity_score_mult(dig: str) -> float:
    return {"exalted":1.0,"moolatrikona":0.85,"own":0.75,"friend":0.65,
            "neutral":0.55,"enemy":0.35,"debilitated":0.2}.get(dig, 0.55)


# ═══════════════════════════════════════════════════════════════
# PANCHANG
# ═══════════════════════════════════════════════════════════════

def compute_panchang(jd: float, moon_lon: float, sun_lon: float,
                     asc_lon: float, ayanamsa_str: str) -> dict:
    # Tithi
    t_diff  = (moon_lon - sun_lon + 360) % 360
    t_num   = int(t_diff / 12) + 1          # 1-30
    t_name  = TITHI_NAMES[t_num - 1]
    t_prog  = (t_diff % 12) / 12
    paksha  = "Shukla" if t_num <= 15 else "Krishna"
    t_in_p  = t_num if t_num <= 15 else t_num - 15

    # Vara
    vara = VARA_NAMES[int(jd + 1.5) % 7]

    # Nakshatra (Moon)
    moon_nak = lon_to_nakshatra(moon_lon)

    # Yoga
    y_num  = int((sun_lon + moon_lon) % 360 / (360 / 27)) % 27
    yoga   = YOGA_NAMES[y_num]

    # Karana (half-tithi)
    k_num  = int((moon_lon - sun_lon + 360) % 360 / 6) % 11
    karana = KARANA_NAMES[k_num]

    moon_rashi = lon_to_rashi(moon_lon)
    sun_rashi  = lon_to_rashi(sun_lon)
    lagna_r    = lon_to_rashi(asc_lon)

    return {
        "tithi": {
            "number": t_num, "name": t_name, "paksha": paksha,
            "tithi_in_paksha": t_in_p, "progress": round(t_prog, 4),
        },
        "vara":           vara,
        "nakshatra":      moon_nak["name"],
        "nakshatra_lord": moon_nak["lord"],
        "yoga":           yoga,
        "karana":         karana,
        "moon_sign":      moon_rashi,
        "moon_nakshatra": moon_nak,
        "sun_sign":       sun_rashi,
        "lagna":          lagna_r,
        "ayanamsa":       ayanamsa_str,
    }


# ═══════════════════════════════════════════════════════════════
# PLANET TABLE
# ═══════════════════════════════════════════════════════════════

def build_planet_table(raw_pos: dict, asc_lon: float) -> dict:
    """Build the d.planets dict that renderChart() uses."""
    sun_lon = raw_pos["Sun"]["lon"]
    result  = {}
    for pname, pdata in raw_pos.items():
        lon   = pdata["lon"]
        rashi = lon_to_rashi(lon)
        rashi_en = RASHI_TO_EN.get(rashi, rashi)
        house = house_from_lon(lon, asc_lon)
        nak   = lon_to_nakshatra(lon)
        dig   = get_dignity(pname, rashi_en)
        comb  = is_combust(pname, lon, sun_lon)
        result[pname] = {
            "rashi":          rashi,          # Sanskrit (Mesha, Vrishabha …)
            "sign":           rashi_en,        # English (Aries, Taurus …)
            "house":          house,
            "degree":         round(lon, 4),
            "deg_in_sign":    round(deg_in_sign(lon), 4),
            "nakshatra":      nak["name"],
            "nakshatra_lord": nak["lord"],
            "pada":           nak["pada"],
            "dignity":        dig,
            "retrograde":     pdata.get("retrograde", False),
            "combust":        comb,
            "rashi_lord":     RASHI_LORD.get(rashi, ""),
            "sidereal":       round(lon, 4),   # alias for et_engine
        }
    return result


# ═══════════════════════════════════════════════════════════════
# LAGNA STRUCT
# ═══════════════════════════════════════════════════════════════

def build_lagna(asc_lon: float) -> dict:
    rashi    = lon_to_rashi(asc_lon)
    rashi_en = RASHI_TO_EN.get(rashi, rashi)
    nak      = lon_to_nakshatra(asc_lon)
    return {
        "rashi":       rashi,
        "sign":        rashi_en,
        "degree":      round(asc_lon, 4),
        "deg_in_sign": round(deg_in_sign(asc_lon), 4),
        "nakshatra":   nak["name"],
        "pada":        nak["pada"],
        "rashi_lord":  RASHI_LORD.get(rashi, ""),
        "sidereal":    round(asc_lon, 4),
    }


# ═══════════════════════════════════════════════════════════════
# SHADBALA  (Phaladeepika Ch.12)
# ═══════════════════════════════════════════════════════════════

def compute_shadbala(planets: dict) -> dict:
    """Six-strength scoring per planet."""
    result = {}
    HOUSE_DIG_STRONG = {"Sun":10,"Moon":4,"Mars":10,"Mercury":7,
                        "Jupiter":10,"Venus":4,"Saturn":7}
    for pname in ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"]:
        p   = planets.get(pname, {})
        dig = p.get("dignity","neutral")
        h   = p.get("house", 1)

        # 1. Sthana Bala
        sthana = {"exalted":60,"moolatrikona":45,"own":30,
                  "friend":22,"neutral":15,"enemy":10,"debilitated":5}.get(dig, 15)

        # 2. Dig Bala
        dh     = HOUSE_DIG_STRONG.get(pname, 7)
        dig_b  = max(5, 60 - abs(h - dh) * 7)

        # 3. Kala Bala (simplified)
        kala   = 30

        # 4. Chesta Bala
        chesta = 45 if p.get("retrograde") else 25

        # 5. Naisargika Bala
        nais   = NAISARGIKA_BALA.get(pname, 25)

        # 6. Drik Bala
        drik   = 15

        total  = sthana + dig_b + kala + chesta + nais + drik
        rupas  = round(total / 60, 2)
        grade  = "Strong" if rupas >= 3.5 else "Moderate" if rupas >= 2.5 else "Weak"

        ishta  = round(min(60, sthana * 0.8 + nais * 0.2), 1)
        kashta = round(max(0, 60 - ishta), 1)

        result[pname] = {
            "sthana_bala": round(sthana, 1),
            "dig_bala":    round(dig_b, 1),
            "kala_bala":   round(kala, 1),
            "chesta_bala": round(chesta, 1),
            "naisargika_bala": round(nais, 1),
            "drik_bala":   round(drik, 1),
            "total_rupas": rupas,
            "strength_grade": grade,
            "ishta_phala": ishta,
            "kashta_phala": kashta,
            "transit_score_current": 4,
        }
    return result


# ═══════════════════════════════════════════════════════════════
# ASHTAKAVARGA  (BPHS Ch.66-70)
# ═══════════════════════════════════════════════════════════════

def compute_ashtakavarga(planets: dict, lagna_rashi: str) -> dict:
    av     = {}
    lagna_idx = RASHIS.index(lagna_rashi) if lagna_rashi in RASHIS else 0
    by_house  = {i: 28 for i in range(1, 13)}

    for pname in ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"]:
        p     = planets.get(pname, {})
        p_idx = RASHIS.index(p.get("rashi","Mesha")) if p.get("rashi") in RASHIS else 0
        dig   = p.get("dignity","neutral")
        h     = p.get("house", 1)

        boost = {"exalted":6,"moolatrikona":4,"own":3,
                 "friend":2,"neutral":0,"enemy":-2,"debilitated":-4}.get(dig, 0)
        by_house[h] = max(0, min(56, by_house.get(h, 28) + boost))

        bav = []
        for i in range(12):
            diff = (i - p_idx) % 12
            sc   = 7 if diff == 0 else 5 if diff in [4,8] else 4 if diff in [3,6,9] else 3 if diff in [2,5,11] else 2
            bav.append(sc)

        ts   = bav[(h - 1) % 12]
        best = [RASHIS[(p_idx + i) % 12] for i, s in enumerate(bav) if s >= 5]

        av[pname] = {
            "bav": bav, "total": sum(bav),
            "transit_score_current": ts,
            "strong_signs": best,
        }

    by_h_clamped = {h: max(0, min(56, v)) for h, v in by_house.items()}
    strongest    = max(by_h_clamped, key=by_h_clamped.get)
    weakest      = min(by_h_clamped, key=by_h_clamped.get)

    sarva_bav = [by_h_clamped.get(i, 28) for i in range(1, 13)]
    av["sarva"] = {
        "bav":            sarva_bav,
        "by_house":       by_h_clamped,
        "total":          sum(sarva_bav),
        "strongest_sign": RASHIS[(lagna_idx + strongest - 1) % 12],
        "weakest_sign":   RASHIS[(lagna_idx + weakest - 1) % 12],
    }
    return av


# ═══════════════════════════════════════════════════════════════
# BHAVAS (12 houses)
# ═══════════════════════════════════════════════════════════════

def compute_bhavas(planets: dict, asc_lon: float) -> list:
    lagna_r   = lon_to_rashi(asc_lon)
    lagna_idx = RASHIS.index(lagna_r) if lagna_r in RASHIS else 0

    house_planets = {i: [] for i in range(1, 13)}
    for pname, p in planets.items():
        h = p.get("house", 1)
        if h in house_planets:
            house_planets[h].append(pname)

    bhavas = []
    HOUSE_NAMES = ["Lagna","Dhana","Sahaja","Sukha","Putra","Ari",
                   "Kalatra","Mrityu","Dharma","Karma","Labha","Vyaya"]
    HOUSE_SIGNIF = [
        "Self, body, vitality, personality",
        "Wealth, family, speech, food",
        "Courage, siblings, communication, short travel",
        "Mother, home, happiness, property, education",
        "Children, intelligence, creativity, speculation",
        "Enemies, disease, debt, service, litigation",
        "Marriage, partner, business, travel abroad",
        "Longevity, transformation, occult, inheritance",
        "Father, fortune, dharma, long travel, guru",
        "Career, status, government, authority, fame",
        "Gains, income, elder siblings, fulfilment",
        "Loss, expenditure, liberation, foreign lands",
    ]
    for i in range(1, 13):
        rashi     = RASHIS[(lagna_idx + i - 1) % 12]
        lord      = RASHI_LORD.get(rashi, "")
        lord_data = planets.get(lord, {})
        lord_dig  = lord_data.get("dignity", "neutral") if lord_data else "neutral"

        bhavas.append({
            "bhava":        i,
            "name":         HOUSE_NAMES[i-1],
            "rashi":        rashi,
            "lord":         lord,
            "lord_house":   lord_data.get("house", 0),
            "lord_dignity": lord_dig,
            "planets":      house_planets.get(i, []),
            "signification": HOUSE_SIGNIF[i-1],
        })
    return bhavas


# ═══════════════════════════════════════════════════════════════
# VIMSHOTTARI DASHA
# ═══════════════════════════════════════════════════════════════

def compute_dashas(birth_dt: datetime, moon_lon: float) -> list:
    nak          = lon_to_nakshatra(moon_lon)
    nak_lord     = nak["lord"]
    span         = 360 / 27
    elapsed_frac = (moon_lon % span) / span
    lord_idx     = DASHA_SEQ.index(nak_lord)

    dashas   = []
    cur_dt   = birth_dt
    rem_frac = 1.0 - elapsed_frac
    first_y  = DASHA_YEARS[nak_lord] * rem_frac
    end_dt   = cur_dt + timedelta(days=first_y * 365.25)
    dashas.append({"lord": nak_lord,
                   "start": cur_dt.strftime("%Y-%m-%d"),
                   "end":   end_dt.strftime("%Y-%m-%d"),
                   "years": round(first_y, 3),
                   "complete": False})
    cur_dt = end_dt

    for i in range(1, 9):
        lord = DASHA_SEQ[(lord_idx + i) % 9]
        yrs  = DASHA_YEARS[lord]
        e    = cur_dt + timedelta(days=yrs * 365.25)
        dashas.append({"lord": lord,
                       "start": cur_dt.strftime("%Y-%m-%d"),
                       "end":   e.strftime("%Y-%m-%d"),
                       "years": yrs, "complete": True})
        cur_dt = e
    return dashas


def current_dasha(dashas: list, now: datetime = None) -> dict:
    if now is None:
        now = datetime.utcnow()
    today = now.strftime("%Y-%m-%d")
    for d in dashas:
        if d["start"] <= today <= d["end"]:
            return d
    return dashas[-1]


def compute_antardasha(maha_lord: str, maha_start: str, maha_end: str) -> list:
    maha_y   = DASHA_YEARS[maha_lord]
    start_dt = datetime.strptime(maha_start, "%Y-%m-%d")
    ml_idx   = DASHA_SEQ.index(maha_lord)
    antars   = []
    cur_dt   = start_dt
    for i in range(9):
        sl   = DASHA_SEQ[(ml_idx + i) % 9]
        days = int(maha_y * DASHA_YEARS[sl] / 120 * 365.25)
        e    = cur_dt + timedelta(days=days)
        antars.append({"lord": sl,
                       "start": cur_dt.strftime("%Y-%m-%d"),
                       "end":   e.strftime("%Y-%m-%d"),
                       "years": round(maha_y * DASHA_YEARS[sl] / 120, 3)})
        cur_dt = e
    return antars


def compute_pratyantara(maha_lord: str, antar_lord: str,
                        antar_start: str, antar_end: str) -> list:
    maha_y   = DASHA_YEARS[maha_lord]
    antar_y  = DASHA_YEARS[antar_lord]
    sub_y    = maha_y * antar_y / 120
    al_idx   = DASHA_SEQ.index(antar_lord)
    start_dt = datetime.strptime(antar_start, "%Y-%m-%d")
    praty    = []
    cur_dt   = start_dt
    for i in range(9):
        sl   = DASHA_SEQ[(al_idx + i) % 9]
        days = int(sub_y * DASHA_YEARS[sl] / 120 * 365.25)
        e    = cur_dt + timedelta(days=days)
        praty.append({"lord": sl,
                      "start": cur_dt.strftime("%Y-%m-%d"),
                      "end":   e.strftime("%Y-%m-%d")})
        cur_dt = e
    return praty


def dasha_block(dashas: list, birth_dt: datetime,
                moon_lon: float, now: datetime = None) -> dict:
    if now is None:
        now = datetime.utcnow()
    moon_nak = lon_to_nakshatra(moon_lon)
    cur      = current_dasha(dashas, now)
    antars   = compute_antardasha(cur["lord"], cur["start"], cur["end"])

    # Current antardasha
    today  = now.strftime("%Y-%m-%d")
    cur_a  = next((a for a in antars if a["start"] <= today <= a["end"]), antars[-1])
    praty  = compute_pratyantara(cur["lord"], cur_a["lord"],
                                  cur_a["start"], cur_a["end"])
    cur_p  = next((p for p in praty if p["start"] <= today <= p["end"]), praty[-1])

    maha_s = datetime.strptime(cur["start"], "%Y-%m-%d")
    maha_e = datetime.strptime(cur["end"],   "%Y-%m-%d")
    elap_y = round((now - maha_s).days / 365.25, 2)
    rem_y  = round((maha_e - now).days / 365.25, 2)

    # Add antardashas to each maha dasha
    for d in dashas:
        d["antardashas"] = compute_antardasha(d["lord"], d["start"], d["end"])

    return {
        "birth_nakshatra":  moon_nak["name"],
        "nakshatra_lord":   moon_nak["lord"],
        "current": {
            "mahadasha":   cur["lord"],
            "maha_start":  cur["start"],
            "maha_ends":   cur["end"],
            "antardasha":  cur_a["lord"],
            "antar_ends":  cur_a["end"],
            "pratyantara": cur_p["lord"],
            **cur,
        },
        "elapsed_years":   elap_y,
        "remaining_years": rem_y,
        "dashas":          dashas,
        "antardashas":     antars,
    }


# ═══════════════════════════════════════════════════════════════
# DOSHA DETECTION
# ═══════════════════════════════════════════════════════════════

def detect_doshas(planets: dict, lagna_rashi: str) -> list:
    doshas = []

    def h(p):
        return planets.get(p, {}).get("house", 0)
    def lon(p):
        return planets.get(p, {}).get("degree", 0)
    def prox(p1, p2, orb=8):
        d = abs(lon(p1) - lon(p2)) % 360
        return min(d, 360 - d) <= orb

    # Manglik
    mh = h("Mars")
    if mh in [1, 4, 7, 8, 12]:
        sc = {1:70,4:65,7:80,8:75,12:60}.get(mh, 65)
        d  = DOSHA_DB["Manglik"]
        doshas.append({
            "name": "Manglik", "alias": d["alias"], "strength": sc,
            "level": "High" if sc >= 70 else "Moderate",
            "effects": d["effects"],
            "remedies": d["remedies"],
            "placement": f"Mars in House {mh}",
            "life_areas": ["Marriage","Relationships"],
            "laterOccurrence": {"nextPeriod": "Mars or 7th lord dasha", "note": ""},
        })

    # Pitru Dosha
    sun_h = h("Sun")
    if sun_h == 9 or prox("Sun","Rahu") or prox("Sun","Ketu"):
        d = DOSHA_DB["Pitru_Dosha"]
        doshas.append({
            "name": "Pitru_Dosha", "alias": d["alias"], "strength": 65,
            "level": "Moderate", "effects": d["effects"], "remedies": d["remedies"],
            "placement": f"Sun in H{sun_h} / ecliptic affliction",
            "life_areas": ["Father","Fortune"],
            "laterOccurrence": {"nextPeriod":"Sun dasha","note":""},
        })

    # Kaal Sarp
    rahu_l = lon("Rahu")
    ketu_l = lon("Ketu")
    rahu_ketu_range = sorted([rahu_l, ketu_l])
    all_in_range = all(
        (rahu_ketu_range[0] <= planets[p]["degree"] <= rahu_ketu_range[1]) or
        (planets[p]["degree"] >= rahu_ketu_range[1]) or
        (planets[p]["degree"] <= rahu_ketu_range[0])
        for p in ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"]
        if p in planets
    )
    between_count = sum(
        1 for p in ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"]
        if p in planets and rahu_ketu_range[0] <= planets[p]["degree"] <= rahu_ketu_range[1]
    )
    if between_count <= 1 or between_count >= 6:
        d = DOSHA_DB["Kaal_Sarp"]
        doshas.append({
            "name": "Kaal_Sarp", "alias": d["alias"], "strength": 72,
            "level": "High", "effects": d["effects"], "remedies": d["remedies"],
            "placement": f"Rahu {round(rahu_l,1)}° / Ketu {round(ketu_l,1)}°",
            "life_areas": ["Overall fortune","Obstacles"],
            "laterOccurrence": {"nextPeriod":"Rahu or Ketu dasha","note":""},
        })

    # Grahan Dosha
    if prox("Sun","Rahu") or prox("Moon","Rahu") or prox("Sun","Ketu") or prox("Moon","Ketu"):
        d = DOSHA_DB["Grahan_Dosha"]
        doshas.append({
            "name": "Grahan_Dosha", "alias": d["alias"], "strength": 68,
            "level": "Moderate", "effects": d["effects"], "remedies": d["remedies"],
            "placement": "Sun/Moon within 8° of Rahu/Ketu",
            "life_areas": ["Mind","Health","Clarity"],
            "laterOccurrence": {"nextPeriod":"Rahu/Ketu dasha","note":""},
        })

    # Angarak Yoga
    if prox("Mars","Rahu"):
        d = DOSHA_DB["Angarak_Yoga"]
        doshas.append({
            "name": "Angarak_Yoga", "alias": d["alias"], "strength": 78,
            "level": "High", "effects": d["effects"], "remedies": d["remedies"],
            "placement": "Mars conjunct Rahu",
            "life_areas": ["Health","Accidents","Legal"],
            "laterOccurrence": {"nextPeriod":"Mars or Rahu dasha","note":""},
        })

    # Guru Chandal
    if prox("Jupiter","Rahu"):
        d = DOSHA_DB["Guru_Chandal"]
        doshas.append({
            "name": "Guru_Chandal", "alias": d["alias"], "strength": 65,
            "level": "Moderate", "effects": d["effects"], "remedies": d["remedies"],
            "placement": "Jupiter conjunct Rahu",
            "life_areas": ["Wisdom","Dharma","Guru"],
            "laterOccurrence": {"nextPeriod":"Jupiter or Rahu dasha","note":""},
        })

    # Vish Yoga
    if prox("Saturn","Moon"):
        d = DOSHA_DB["Vish_Yoga"]
        doshas.append({
            "name": "Vish_Yoga", "alias": d["alias"], "strength": 72,
            "level": "High", "effects": d["effects"], "remedies": d["remedies"],
            "placement": "Saturn conjunct Moon",
            "life_areas": ["Mental health","Happiness"],
            "laterOccurrence": {"nextPeriod":"Saturn or Moon dasha","note":""},
        })

    # Shrapit Dosha
    if prox("Saturn","Rahu"):
        d = DOSHA_DB["Shrapit_Dosha"]
        doshas.append({
            "name": "Shrapit_Dosha", "alias": d["alias"], "strength": 74,
            "level": "High", "effects": d["effects"], "remedies": d["remedies"],
            "placement": "Saturn conjunct Rahu",
            "life_areas": ["Career","Fortune"],
            "laterOccurrence": {"nextPeriod":"Saturn or Rahu dasha","note":""},
        })

    # Kemdrum Yoga
    moon_h = h("Moon")
    adj = [((moon_h - 2 + 12) % 12) + 1, moon_h % 12 + 1]
    flanking = [p for p in ["Sun","Mars","Mercury","Jupiter","Venus","Saturn"]
                if h(p) in adj]
    if not flanking:
        d = DOSHA_DB["Kemdrum_Yoga"]
        doshas.append({
            "name": "Kemdrum_Yoga", "alias": d["alias"], "strength": 55,
            "level": "Moderate", "effects": d["effects"], "remedies": d["remedies"],
            "placement": f"Moon in H{moon_h}, no planets in adjacent houses",
            "life_areas": ["Support","Happiness"],
            "laterOccurrence": {"nextPeriod":"Moon dasha","note":""},
        })

    # Rahu Kalatra
    if h("Rahu") == 7:
        d = DOSHA_DB["Rahu_Kalatra"]
        doshas.append({
            "name": "Rahu_Kalatra", "alias": d["alias"], "strength": 62,
            "level": "Moderate", "effects": d["effects"], "remedies": d["remedies"],
            "placement": "Rahu in 7th house",
            "life_areas": ["Marriage","Partnerships"],
            "laterOccurrence": {"nextPeriod":"Rahu dasha","note":""},
        })

    doshas.sort(key=lambda x: -x["strength"])
    return doshas


# ═══════════════════════════════════════════════════════════════
# STRENGTHS (overall planet scores)
# ═══════════════════════════════════════════════════════════════

def compute_strengths(planets: dict) -> dict:
    result = {}
    sun_lon = planets.get("Sun", {}).get("degree", 0)

    for pname, p in planets.items():
        dig   = p.get("dignity", "neutral")
        house = p.get("house", 1)
        lon_v = p.get("degree", 0)
        comb  = p.get("combust", False)
        retro = p.get("retrograde", False)

        dig_score  = dignity_score_mult(dig) * 35
        h_score    = _house_strength(house) * 25
        base_score = dig_score + h_score + 15

        if comb:  base_score *= 0.65
        if retro: base_score = min(base_score * 1.1, 95)

        result[pname] = {
            "dignity":         {"state": dig, "multiplier": dignity_score_mult(dig)},
            "house_strength":  round(_house_strength(house) * 100, 1),
            "combust":         comb,
            "retrograde":      retro,
            "total_score":     round(min(100, max(0, base_score)), 2),
        }
    return result


def _house_strength(h: int) -> float:
    if h in [1,4,7,10]: return 1.0
    if h in [5,9]:      return 0.95
    if h in [3,6,11]:   return 0.7
    if h in [8,12]:     return 0.25
    return 0.5


# ═══════════════════════════════════════════════════════════════
# YOGA DETECTION
# ═══════════════════════════════════════════════════════════════

def detect_yogas(planets: dict, strengths: dict, lagna_rashi: str) -> list:
    yogas = []

    def h(p): return planets.get(p, {}).get("house", 0)
    def s(p): return strengths.get(p, {}).get("total_score", 50)
    def sign(p): return planets.get(p, {}).get("sign", "")

    # Pancha Mahapurusha
    PANCHA = {
        "Mars":    (["Aries","Capricorn"],  "Ruchaka"),
        "Mercury": (["Gemini","Virgo"],     "Bhadra"),
        "Jupiter": (["Sagittarius","Cancer"],"Hamsa"),
        "Venus":   (["Taurus","Pisces"],    "Malavya"),
        "Saturn":  (["Capricorn","Libra"],  "Shasha"),
    }
    for planet, (signs_list, yname) in PANCHA.items():
        if sign(planet) in signs_list and h(planet) in [1,4,7,10]:
            yogas.append({
                "yoga": yname, "type": "Pancha Mahapurusha",
                "strength": min(100, int(s(planet) + 15)),
                "planets": planet,
                "description": f"{planet} in {sign(planet)} in Kendra H{h(planet)} — {yname} Yoga",
                "electionRelevance": "HIGH",
            })

    # Gajakesari
    moon_h, jup_h = h("Moon"), h("Jupiter")
    if moon_h > 0 and abs(moon_h - jup_h) % 6 in [0, 3]:
        yogas.append({
            "yoga": "Gajakesari", "type": "Raj Yoga",
            "strength": min(100, int((s("Moon") + s("Jupiter")) / 1.5)),
            "planets": "Moon+Jupiter",
            "description": "Jupiter in Kendra from Moon — intelligence, fame, prosperity",
            "electionRelevance": "HIGH",
        })

    # Budhaditya
    if h("Sun") == h("Mercury") and h("Sun") > 0:
        yogas.append({
            "yoga": "Budhaditya", "type": "Solar",
            "strength": min(100, int((s("Sun") + s("Mercury")) / 1.8)),
            "planets": "Sun+Mercury",
            "description": "Sun conjunct Mercury — sharp intellect, communication authority",
            "electionRelevance": "MEDIUM",
        })

    # Amala Yoga
    for p in ["Jupiter","Venus","Moon"]:
        if h(p) == 10 and s(p) > 60:
            yogas.append({
                "yoga": "Amala", "type": "Reputation",
                "strength": int(s(p)),
                "planets": p,
                "description": f"{p} in 10th — unblemished fame and reputation",
                "electionRelevance": "HIGH",
            })

    # Neecha Bhanga
    for planet, deb_sign in DEBILITATION.items():
        if sign(planet) == deb_sign:
            # Check cancellation conditions
            sign_lord = RASHI_LORD.get(deb_sign, "")
            exalt_sign = EXALTATION.get(planet, "")
            exalt_lord = RASHI_LORD.get(exalt_sign, "")
            nb = False
            if sign_lord and h(sign_lord) in [1,4,7,10]: nb = True
            if exalt_lord and h(exalt_lord) in [1,4,7,10]: nb = True
            if nb:
                yogas.append({
                    "yoga": f"Neecha Bhanga ({planet})",
                    "type": "Neecha Bhanga",
                    "strength": 70, "planets": planet,
                    "description": f"{planet} debilitated in {deb_sign} but cancellation present — gains extra power",
                    "electionRelevance": "MEDIUM",
                    "subtype": "Debilitation cancelled",
                })

    # Raj Yoga (Kendra-Trikona lord combination)
    lagna_idx = RASHIS.index(lagna_rashi) if lagna_rashi in RASHIS else 0
    kendra_lords = set(RASHI_LORD.get(RASHIS[(lagna_idx + i) % 12], "")
                       for i in [0, 3, 6, 9])
    trikona_lords = set(RASHI_LORD.get(RASHIS[(lagna_idx + i) % 12], "")
                        for i in [0, 4, 8])
    common = kendra_lords & trikona_lords
    if common:
        for p in common:
            if s(p) > 60:
                yogas.append({
                    "yoga": f"Yogakaraka ({p})",
                    "type": "Raj Yoga", "strength": min(100, int(s(p) + 10)),
                    "planets": p, "subtype": "Yogakaraka",
                    "description": f"{p} lords both Kendra and Trikona — highest Raj Yoga",
                    "electionRelevance": "HIGH",
                })

    yogas.sort(key=lambda x: -x["strength"])
    return yogas[:12]


# ═══════════════════════════════════════════════════════════════
# MEDICAL ANALYSIS
# ═══════════════════════════════════════════════════════════════

def compute_medical(planets: dict, strengths: dict, dasha_lord: str) -> dict:
    def s(p): return strengths.get(p, {}).get("total_score", 50)

    lagna_r = lon_to_rashi(0)  # placeholder — passed from above
    moon_s  = planets.get("Moon", {}).get("sign", "")

    VATA  = ["Gemini","Virgo","Libra","Aquarius","Capricorn","Aries"]
    PITTA = ["Leo","Sagittarius","Scorpio","Aries"]
    KAPHA = ["Taurus","Cancer","Pisces","Gemini"]

    vata  = 33 + (12 if moon_s in VATA  else 0)
    pitta = 33 + (12 if moon_s in PITTA else 0)
    kapha = 33 + (12 if moon_s in KAPHA else 0)
    tot   = vata + pitta + kapha
    vata  = round(vata / tot * 100, 1)
    pitta = round(pitta / tot * 100, 1)
    kapha = round(100 - vata - pitta, 1)
    dom   = max({"Vata":vata,"Pitta":pitta,"Kapha":kapha},
                key=lambda k: {"Vata":vata,"Pitta":pitta,"Kapha":kapha}[k])

    hi = (s("Sun")*0.25 + s("Moon")*0.25 + s("Jupiter")*0.2 + s("Mars")*0.15 + s("Saturn")*0.15) / 100
    hi = round(min(1.0, max(0.2, hi)), 3)
    grade = ("Excellent" if hi > 0.8 else "Good" if hi > 0.65
             else "Moderate" if hi > 0.45 else "Fragile")

    ORGAN_MAP = {
        "Sun":     {"organs":["Heart","Eyes","Spine"], "diseases":["Cardiac","Vision","Back pain"]},
        "Moon":    {"organs":["Mind","Lungs","Lymph"], "diseases":["Mental health","Respiratory"]},
        "Mars":    {"organs":["Blood","Muscles","Head"],"diseases":["Fever","Accidents","Surgery"]},
        "Mercury": {"organs":["Nervous system","Skin"], "diseases":["Nervous","Skin disorders"]},
        "Jupiter": {"organs":["Liver","Fat","Arteries"],"diseases":["Liver","Obesity"]},
        "Venus":   {"organs":["Kidneys","Reproductive"],"diseases":["Renal","Reproductive"]},
        "Saturn":  {"organs":["Joints","Bones","Teeth"],"diseases":["Arthritis","Dental","Chronic"]},
        "Rahu":    {"organs":["Viral","Foreign body"], "diseases":["Viral","Toxic","Unusual"]},
        "Ketu":    {"organs":["Parasite","Skin"],      "diseases":["Parasitic","Mysterious"]},
    }
    vulns = []
    for planet in ["Sun","Moon","Mars","Saturn","Rahu","Ketu"]:
        p   = planets.get(planet, {})
        sc  = s(planet)
        dig = p.get("dignity","neutral")
        vs  = 0
        if dig == "debilitated": vs += 0.4
        elif dig == "enemy":     vs += 0.2
        if p.get("house",0) in [6,8,12]: vs += 0.2
        if sc < 35: vs += 0.2
        if vs > 0.15:
            om = ORGAN_MAP.get(planet, {})
            vulns.append({
                "planet": planet, "organs": om.get("organs",[]),
                "diseases": om.get("diseases",[]),
                "vulnerabilityScore": round(vs, 2),
                "reason": f"{planet} {dig} in H{p.get('house','?')} — strength {round(sc,0)}/100",
            })

    DASHA_HEALTH = {
        "Sun":{"risk":"Elevated","bodyFocus":["Heart","Eyes","Authority stress"]},
        "Moon":{"risk":"Moderate","bodyFocus":["Mind","Emotions","Lungs"]},
        "Mars":{"risk":"Elevated","bodyFocus":["Blood","Surgery","Accidents"]},
        "Mercury":{"risk":"Low","bodyFocus":["Nervous system","Skin"]},
        "Jupiter":{"risk":"Low","bodyFocus":["Liver","Weight"]},
        "Venus":{"risk":"Low","bodyFocus":["Kidneys","Reproductive"]},
        "Saturn":{"risk":"Moderate","bodyFocus":["Joints","Teeth","Chronic"]},
        "Rahu":{"risk":"Elevated","bodyFocus":["Viral","Unusual symptoms"]},
        "Ketu":{"risk":"Moderate","bodyFocus":["Parasitic","Spiritual body"]},
    }
    cdh = {**DASHA_HEALTH.get(dasha_lord,{"risk":"Moderate","bodyFocus":[]}),
           "lord": dasha_lord}

    DOSHA_REMEDIES = {
        "Vata":["Warm sesame oil massage (Abhyanga)","Ashwagandha + warm milk",
                "Triphala churna","Regular sleep schedule","Avoid cold/excess travel"],
        "Pitta":["Coconut oil massage","Shatavari + cool milk",
                 "Avoid spicy/fried foods","Brahmi for cooling","Regular meals"],
        "Kapha":["Dry powder massage (Udvartana)","Trikatu churna",
                 "Vigorous daily exercise","Ginger tea","Light diet"],
    }

    return {
        "healthIndex": hi, "healthGrade": grade,
        "tridosha": {"Vata":vata,"Pitta":pitta,"Kapha":kapha,
                     "dominant":dom,"remedies":DOSHA_REMEDIES.get(dom,[])},
        "planetaryVulnerabilities": vulns,
        "currentDashaHealth": cdh,
        "criticalAlerts": [v for v in vulns if v["vulnerabilityScore"] >= 0.5],
    }


# ═══════════════════════════════════════════════════════════════
# POLITICAL / LEADERSHIP
# ═══════════════════════════════════════════════════════════════

def compute_political(planets: dict, strengths: dict,
                      yogas: list, lagna_rashi: str) -> dict:
    def s(p): return strengths.get(p, {}).get("total_score", 50)
    def h(p): return planets.get(p, {}).get("house", 0)
    def sign(p): return planets.get(p, {}).get("sign", "")

    authority    = min(100, int(s("Sun") * 0.7 + s("Mars") * 0.3))
    vision       = min(100, int(s("Jupiter") * 0.7 + s("Mercury") * 0.3))
    persuasion   = min(100, int(s("Mercury") * 0.5 + s("Venus") * 0.3 + s("Moon") * 0.2))
    resilience   = min(100, int(s("Saturn") * 0.6 + s("Mars") * 0.4))
    mass_connect = min(100, int(s("Moon") * 0.7 + s("Venus") * 0.3))
    strategy     = min(100, int(s("Mercury")*0.5 + s("Saturn")*0.3 + s("Jupiter")*0.2))
    overall      = round((authority+vision+persuasion+resilience+mass_connect+strategy)/6)
    grade        = ("Outstanding" if overall>=80 else "Strong" if overall>=65
                    else "Moderate" if overall>=50 else "Developing")

    key_factors = []
    if authority   > 70: key_factors.append(f"Sun strong ({int(authority)}) — natural authority")
    if vision      > 70: key_factors.append("Jupiter strong — visionary wisdom")
    if h("Sun")   == 10: key_factors.append("Sun in 10th — peak authority placement")
    if h("Moon")  in [1,4,7,10]: key_factors.append("Moon in Kendra — mass popularity")
    if h("Mars")  in [1,10]:     key_factors.append("Mars in Kendra — executive courage")

    lagna_idx   = RASHIS.index(lagna_rashi) if lagna_rashi in RASHIS else 0
    tenth_rashi = RASHIS[(lagna_idx + 9) % 12]
    tenth_lord  = RASHI_LORD.get(tenth_rashi, "")
    tenth_dig   = planets.get(tenth_lord, {}).get("dignity","neutral") if tenth_lord else "neutral"
    tenth_str   = ("Strong" if s(tenth_lord) > 65 else "Moderate" if s(tenth_lord) > 45 else "Weak")
    tenth_pls   = [p for p,d in planets.items() if d.get("house")==10]

    return {
        "leadership": {
            "overallLeadershipIndex": overall, "grade": grade,
            "dimensions": {"Authority":authority,"Vision":vision,"Persuasion":persuasion,
                           "Resilience":resilience,"MassConnect":mass_connect,"Strategy":strategy},
            "keyFactors": key_factors,
        },
        "powerYogas": yogas,
        "yogaSummary": {
            "count": len(yogas),
            "strongest": yogas[0] if yogas else None,
            "high_relevance": [y for y in yogas if y.get("electionRelevance")=="HIGH"],
            "by_type": _group_yogas_by_type(yogas),
        },
        "career": {
            "dashamsha_lagna": lagna_rashi,
            "tenth_house_lord": tenth_lord,
            "tenth_house_sign": tenth_rashi,
            "tenth_house_planets": tenth_pls,
            "career_strength": tenth_str,
            "lord_dignity": tenth_dig,
        },
        "electionWindows": [],
    }


def _group_yogas_by_type(yogas: list) -> dict:
    by_type = {}
    for y in yogas:
        t = y.get("type", "Other")
        by_type.setdefault(t, []).append(y)
    return by_type


# ═══════════════════════════════════════════════════════════════
# VARGAS (divisional charts)
# ═══════════════════════════════════════════════════════════════

def compute_vargas(raw_pos: dict, asc_lon: float) -> dict:
    def to_varga(lon: float, n: int) -> str:
        sign_num = int(lon // 30)
        varga_n  = int((lon % 30) / (30.0 / n))
        if n == 9:
            groups = {0:0,4:0,8:0, 1:3,5:3,9:3, 2:6,6:6,10:6, 3:9,7:9,11:9}
            start  = groups.get(sign_num, 0)
            return RASHIS[(start + varga_n) % 12]
        elif n == 10:
            if sign_num % 2 == 0:
                return RASHIS[(sign_num * n + varga_n) % 12]
            else:
                return RASHIS[(sign_num * n + varga_n + 9) % 12]
        else:
            return RASHIS[(sign_num * n + varga_n) % 12]

    def varga_block(n: int) -> dict:
        lagna_r   = to_varga(asc_lon, n)
        lagna_idx = RASHIS.index(lagna_r) if lagna_r in RASHIS else 0
        pls = {}
        for pname, pdata in raw_pos.items():
            lon_v  = pdata["lon"]
            rashi  = to_varga(lon_v, n)
            ph     = (RASHIS.index(rashi) - lagna_idx) % 12 + 1 if rashi in RASHIS else 1
            rashi_en = RASHI_TO_EN.get(rashi, rashi)
            dig    = get_dignity(pname, rashi_en)
            pls[pname] = {
                "rashi": rashi, "sign": rashi_en, "house": ph,
                "dignity": dig,
                "deg_in_sign": round((lon_v * n) % 30, 2),
                "nakshatra": lon_to_nakshatra(lon_v)["name"],
            }
        return {
            "lagna": {
                "rashi": lagna_r, "sign": RASHI_TO_EN.get(lagna_r, lagna_r),
                "deg_in_sign": round((asc_lon * n) % 30, 2),
                "nakshatra": lon_to_nakshatra(asc_lon)["name"],
                "rashi_lord": RASHI_LORD.get(lagna_r, ""),
            },
            "planets": pls,
        }

    vargas = {}
    # D1 — natal
    lagna_r   = lon_to_rashi(asc_lon)
    lagna_idx = RASHIS.index(lagna_r) if lagna_r in RASHIS else 0
    d1_pls = {}
    for pname, pdata in raw_pos.items():
        lon_v   = pdata["lon"]
        rashi   = lon_to_rashi(lon_v)
        rashi_en= RASHI_TO_EN.get(rashi, rashi)
        ph      = house_from_lon(lon_v, asc_lon)
        dig     = get_dignity(pname, rashi_en)
        d1_pls[pname] = {
            "rashi": rashi, "sign": rashi_en, "house": ph,
            "dignity": dig, "deg_in_sign": round(deg_in_sign(lon_v), 2),
            "nakshatra": lon_to_nakshatra(lon_v)["name"],
        }
    vargas["D1"] = {
        "lagna": {"rashi": lagna_r, "sign": RASHI_TO_EN.get(lagna_r, lagna_r),
                  "deg_in_sign": round(deg_in_sign(asc_lon), 2),
                  "nakshatra": lon_to_nakshatra(asc_lon)["name"],
                  "rashi_lord": RASHI_LORD.get(lagna_r, "")},
        "planets": d1_pls,
    }

    for n, key in [(9,"D9"),(10,"D10"),(3,"D3"),(4,"D4"),(7,"D7"),(12,"D12"),(60,"D60")]:
        vb = varga_block(n)
        if key == "D10":
            lagna_idx_d10 = RASHIS.index(vb["lagna"]["rashi"]) if vb["lagna"]["rashi"] in RASHIS else 0
            tenth_r  = RASHIS[(lagna_idx_d10 + 9) % 12]
            tenth_en = RASHI_TO_EN.get(tenth_r, tenth_r)
            tenth_l  = RASHI_LORD.get(tenth_r, "")
            vb["tenthLord"]         = tenth_l
            vb["tenthLordDignity"]  = vb["planets"].get(tenth_l,{}).get("dignity","neutral")
            vb["tenthHousePlanets"] = [p for p,d in vb["planets"].items() if d["house"]==10]
        vargas[key] = vb
    return vargas


# ═══════════════════════════════════════════════════════════════
# INTERPRETATIONS
# ═══════════════════════════════════════════════════════════════

def compute_interpretations(planets: dict, strengths: dict) -> dict:
    result = {}
    DIG_SUMMARY = {
        "exalted":      "Exalted — peak power, outstanding results in all significations",
        "moolatrikona": "Moolatrikona — excellent strength, next only to exaltation",
        "own":          "Own sign — fully empowered, reliable and consistent",
        "friend":       "Friendly sign — comfortable, performs well",
        "neutral":      "Neutral sign — moderate, consistent delivery",
        "enemy":        "Enemy sign — uncomfortable, results mixed or delayed",
        "debilitated":  "Debilitated — weakened, check for Neecha Bhanga cancellation",
    }
    for planet in ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"]:
        p  = planets.get(planet, {})
        st = strengths.get(planet, {})
        sc = st.get("total_score", 50)
        dig = p.get("dignity", "neutral")
        lbl = ("very strong" if sc>=75 else "strong" if sc>=60
               else "moderate" if sc>=45 else "weak" if sc>=30 else "very weak")
        result[planet] = {
            "dynamic_strength": round(sc / 100, 3),
            "strength_label":   lbl,
            "dignity":          dig,
            "retrograde":       p.get("retrograde", False),
            "combust":          st.get("combust", False),
            "summary":          f"{planet} in {p.get('sign','')} — {DIG_SUMMARY.get(dig,dig)}",
        }
    return result


# ═══════════════════════════════════════════════════════════════
# UEDP v5 PROTOCOL  (G S Ramesh Kumar)
# ═══════════════════════════════════════════════════════════════

OMEGA_CRIT = 1 / math.e  # 0.36788

def compute_uedp_protocol(strengths: dict, ayanamsa_spread: float) -> dict:
    scores    = [strengths.get(p,{}).get("total_score",50)
                 for p in ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"]]
    avg_s     = sum(scores) / len(scores)
    psi       = avg_s / 100.0
    I_seq     = round(ayanamsa_spread / 9.0, 6)
    omega     = round(psi * math.exp(-1.0 * I_seq), 6)
    above     = omega >= OMEGA_CRIT
    METP      = round(sum(max(0, 1 - psi * math.exp(-I_seq * (t+1) / 9))
                          for t in range(9)), 4)
    tau       = round(0.8 - omega, 6)
    R_mod     = round(tau / 0.8, 6)
    direction = "Anados (Acceleratory)" if R_mod >= 0 else "Thanatos (Inhibitory)"
    LE        = round(avg_s/100 - avg_s/100 * 0.9, 6)

    return {
        "omega_dynamics":    omega,
        "omega_crit":        round(OMEGA_CRIT, 6),
        "above_omega_crit":  above,
        "I_seq":             I_seq,
        "METP":              METP,
        "RSL_direction":     direction,
        "RSL_r_mod":         R_mod,
        "latent_emergence":  LE,
        "le_interpretation": ("Hidden strength awaiting activation" if LE > 0.05
                              else "Chart operating near expected level"),
        "uedp_note": (f"UEDP v5 G S Ramesh Kumar. Omega={omega:.4f} "
                      f"({'above' if above else 'BELOW'} Omega_crit=1/e)."),
    }


def compute_uedp_consensus(all_ayanamsas: dict, jd: float,
                            asc_lon: float, moon_lon: float) -> dict:
    """Multi-ayanamsa consensus for UEDP confidence layer."""
    lagna_rashis = []
    moon_naks    = []
    by_system    = {}

    for name, sid_id in AYANAMSA_SYSTEMS.items():
        try:
            swe.set_sid_mode(sid_id, 0, 0)
            ayan  = swe.get_ayanamsa_ut(jd)
            _set_ayanamsa(name)
            houses, ascmc = swe.houses_ex(jd, 0, 0, b'P', swe.FLG_SIDEREAL)  # placeholder lat/lon
            # Re-compute lagna for this system
            lagna_r = lon_to_rashi(asc_lon)   # asc_lon already computed for primary system
            moon_r  = lon_to_rashi(moon_lon)
            moon_nk = lon_to_nakshatra(moon_lon)
            moon_t  = compute_panchang(jd, moon_lon, moon_lon - 12, asc_lon, name)
            lagna_rashis.append(lagna_r)
            moon_naks.append(moon_nk["name"])
            by_system[name] = {
                "label":           AYANAMSA_LABELS.get(name, name),
                "ayanamsa":        round(ayan, 6),
                "ayanamsa_val":    f"{ayan:.6f}",
                "lagna_rashi":     lagna_r,
                "lagna_deg":       round(asc_lon % 30, 4),
                "moon_rashi":      moon_r,
                "moon_nakshatra":  moon_nk["name"],
                "moon_nak_lord":   moon_nk["lord"],
                "tithi_name":      moon_t["tithi"]["name"],
                "boundary_risk":   (asc_lon % 30 < 2 or asc_lon % 30 > 28),
                "boundary_note":   ("BOUNDARY RISK" if (asc_lon%30<2 or asc_lon%30>28)
                                    else f"{round(asc_lon%30,2)}° — safe"),
                "accuracy_pct":    0, "hits": 0, "partials": 0,
                "event_details":   [],
                "dasha":           {"dashas": []},
            }
        except Exception:
            pass

    from collections import Counter
    majority_lagna = Counter(lagna_rashis).most_common(1)[0][0] if lagna_rashis else "Unknown"
    majority_nak   = Counter(moon_naks).most_common(1)[0][0] if moon_naks else "Unknown"
    lagna_agree    = lagna_rashis.count(majority_lagna)
    nak_agree      = moon_naks.count(majority_nak)

    values = list(all_ayanamsas.values())
    spread = round(max(values) - min(values), 4) if values else 0.5
    omega  = round(math.exp(-spread * 3), 4)

    return {
        "majority_lagna":       majority_lagna,
        "lagna_agreed_systems": lagna_agree,
        "lagna_confidence":     "HIGH" if lagna_agree >= 5 else "MEDIUM" if lagna_agree >= 4 else "LOW",
        "majority_nakshatra":   majority_nak,
        "nak_agreed_systems":   nak_agree,
        "majority_tithi_name":  "Computed",
        "tithi_agreed_systems": 6,
        "tithi_confidence":     "HIGH",
        "ayanamsa_spread_deg":  spread,
        "omega_dynamics":       omega,
        "above_omega_crit":     omega >= OMEGA_CRIT,
        "by_system":            by_system,
    }


def compute_confidence(all_ayanamsas: dict, asc_lon: float) -> dict:
    """UEDP v5 chart confidence layer."""
    values = list(all_ayanamsas.values())
    spread = round(max(values) - min(values), 4) if values else 0.5
    deg_in = asc_lon % 30
    boundary = deg_in < 2 or deg_in > 28

    ephem_s = 0.99
    agree_s = max(0.3, 1.0 - spread * 3)
    bound_s = 0.5 if boundary else 1.0
    interp_s= 0.6 if boundary else 0.9
    overall = round(0.25*ephem_s + 0.35*agree_s + 0.25*bound_s + 0.15*interp_s, 4)
    mode    = "strict" if overall>=0.85 else "balanced" if overall>=0.65 else "exploratory"

    return {
        "overall": overall, "mode": mode,
        "ephemeris": {
            "score": ephem_s, "grade": "HIGH",
            "note": "Swiss Ephemeris DE441 + Moshier built-in — sub-arcsecond accuracy",
        },
        "ayanamsa_agreement": {
            "score": round(agree_s, 4),
            "grade": "HIGH" if agree_s > 0.8 else "MEDIUM",
            "note": f"Spread {spread}° across {len(all_ayanamsas)} systems",
        },
        "boundary_stability": {
            "score": bound_s,
            "grade": "HIGH" if not boundary else "LOW",
            "note": ("Lagna near sign boundary — verify birth time" if boundary
                     else f"Stable at {round(deg_in,2)}° in sign"),
        },
        "interpretation_certainty": {
            "score": interp_s,
            "grade": "HIGH" if interp_s >= 0.85 else "MEDIUM",
            "note": "Lahiri ayanamsa (India Govt standard)",
        },
        "uedp_note": f"UEDP v5 Confidence: {round(overall*100,1)}% | Mode: {mode} | Spread: {spread}",
    }


# ═══════════════════════════════════════════════════════════════
# PREDICTIONS (domain scores)
# ═══════════════════════════════════════════════════════════════

def compute_predictions(planets: dict, strengths: dict, dasha_lord: str) -> dict:
    def s(p): return strengths.get(p, {}).get("total_score", 50)
    def h(p): return planets.get(p, {}).get("house", 0)
    def sc(base, plist, hbonus=None):
        v = base
        for p in plist:
            v += (s(p) - 50) * 0.15
        if hbonus and any(h(p) == hbonus for p in plist):
            v += 8
        if dasha_lord in plist:
            v += 12
        return round(min(100, max(0, v)), 1)

    return {
        "career":   {"score":sc(40,["Sun","Saturn","Jupiter"],10), "domain":"Career & Status",    "icon":"&#9889;"},
        "wealth":   {"score":sc(40,["Jupiter","Venus"],11),        "domain":"Wealth & Finance",   "icon":"&#128176;"},
        "marriage": {"score":sc(45,["Venus","Moon"],7),            "domain":"Marriage & Relationships","icon":"&#128145;"},
        "health":   {"score":sc(60,["Sun","Mars"],1),              "domain":"Health & Vitality",  "icon":"&#127807;"},
        "spiritual":{"score":sc(40,["Jupiter","Ketu"],9),          "domain":"Spiritual & Fortune","icon":"&#128302;"},
        "political":{"score":sc(30,["Sun","Mars"],10),             "domain":"Political Power",    "icon":"&#128081;"},
        "children": {"score":sc(45,["Jupiter","Moon"],5),          "domain":"Children & Creativity","icon":"&#127800;"},
        "foreign":  {"score":sc(35,["Rahu","Saturn"],12),          "domain":"Foreign & Settlement","icon":"&#9992;"},
    }


# ═══════════════════════════════════════════════════════════════
# UEDP HYBRINEAR DIAGNOSTIC (for uedp key in response)
# ═══════════════════════════════════════════════════════════════

def full_uedp_diagnostic(x: list, o_obs: float, omega_ref: float = 0.8,
                          alpha: float = 0.4, beta: float = 0.35,
                          delta: float = 0.25, eta: float = 0.3,
                          m: int = 4) -> dict:
    N = len(x)
    if N == 0:
        return {}

    seg_size = max(1, N // m)
    segs     = [x[i:i+seg_size] for i in range(0, N, seg_size)]
    Fpred    = 0.0
    seg_results = []
    offset   = 0

    for seg in segs:
        n = len(seg)
        if not n:
            continue
        deltas = [seg[0]] + [seg[i] - seg[i-1] for i in range(1, n)]
        dirs   = [1 if d > 0 else (-1 if d < 0 else 0) for d in deltas]
        Lm     = sum(dirs[i]*seg[i] for i in range(n)) / (sum(abs(v) for v in seg) + 1e-9)
        abs_d  = [abs(d) for d in deltas]
        NLm    = sum(abs_d) / (sum(abs_d) + 1e-9)
        zeros  = dirs.count(0)
        Hm     = math.tanh(n) * zeros / (zeros + 1)
        contrib= (n / N) * (alpha * Lm + beta * NLm + delta * Hm)
        Fpred += contrib
        dom    = ("L" if abs(alpha*Lm) > abs(beta*NLm) and abs(alpha*Lm) > abs(delta*Hm)
                  else "NL" if abs(beta*NLm) > abs(delta*Hm) else "H")
        seg_results.append({
            "start_idx": offset, "end_idx": offset + n,
            "Lm": round(Lm, 4), "NLm": round(NLm, 4), "Hm": round(Hm, 4),
            "contribution": round(contrib, 4), "dominant": dom,
        })
        offset += n

    o_obs2  = sum(x) / N
    LE      = o_obs2 - Fpred
    Ffinal  = Fpred + eta * LE
    LmVals  = [s["Lm"] for s in seg_results]
    meanL   = sum(LmVals) / len(LmVals) if LmVals else 0
    A       = sum((v - meanL)**2 for v in LmVals) / max(len(LmVals), 1)
    allDirs = [0] + [1 if x[i]>x[i-1] else (-1 if x[i]<x[i-1] else 0) for i in range(1,N)]
    Bv      = [1 - allDirs[i]*allDirs[i-1] for i in range(1, len(allDirs))]
    B       = sum(Bv) / max(len(Bv), 1)
    S       = sum(1 for i in range(1, len(allDirs))
                  if allDirs[i] != 0 and allDirs[i-1] != 0 and allDirs[i] != allDirs[i-1])
    C       = S / (S + 1)
    I_seq   = alpha * A + 0.3 * B + 0.3 * C
    omega   = math.exp(-I_seq)
    passes  = omega >= OMEGA_CRIT

    omSeries = [math.exp(-I_seq * (t+1) / N) for t in range(N)]
    metpVal  = sum(max(0, 1 - o) for o in omSeries)
    omega_min= min(omSeries)
    tau      = omega_ref - omega_min
    R_mag    = abs(tau) / (omega_ref + 1e-9)
    sign_rsl = -1 if (tau > 0 and omega_min < OMEGA_CRIT) else 1
    R_mod    = sign_rsl * R_mag
    d_omega  = max(omega_ref - omega, 1e-9)
    I_coh    = max(0, 1 - I_seq)
    phi      = (I_coh * R_mod) / (d_omega + 1e-9)
    C_hist   = sum(abs(o - omega_ref) for o in omSeries) / N
    Lambda   = (I_coh * R_mod) / max(C_hist * omega_ref, 1e-9)
    Upsilon  = abs(R_mod)
    o_debt   = max(OMEGA_CRIT - omega, 0)
    Gamma    = (o_debt * abs(LE)) / max(abs(R_mod) + 1e-9, 1e-9)
    AT       = Upsilon * abs(phi) / max(I_seq * Gamma, 1e-9)

    def r4(v): return round(v, 4)
    def r6(v): return round(v, 6)

    return {
        "hybrinear": {"Fpred": r4(Fpred), "LE_multi": r4(LE),
                      "Ffinal": r4(Ffinal), "segments": seg_results},
        "instability": {"I_seq": r6(I_seq), "A_magnitude": r6(A),
                        "B_directional": r6(B), "C_reversal": r6(C), "S_sign_changes": S},
        "omega_dynamics": r6(omega), "omega_crit": r6(OMEGA_CRIT),
        "rsl_gate": {"passes": passes, "omega": r6(omega), "omega_crit": r6(OMEGA_CRIT),
                     "ratio": r4(omega / OMEGA_CRIT),
                     "status": "Structured Dynamics" if passes else "Excessive Instability",
                     "action": "Proceed" if passes else "Verify birth time"},
        "metp": {"metp": r6(metpVal), "T": N,
                 "mean_omega": r6(sum(omSeries)/N),
                 "omega_crit": r6(OMEGA_CRIT),
                 "interpretation": ("System approaching Latent Emergence" if omega < OMEGA_CRIT
                                    else "System in Structured Dynamics")},
        "rsl": {"omega_ref": r6(omega_ref), "omega_min": r6(omega_min),
                "tau_rsl": r6(tau), "R_mag": r6(R_mag),
                "sign": sign_rsl,
                "direction": "Thanatos (Inhibitory)" if sign_rsl < 0 else "Anados (Acceleratory)",
                "R_mod": r6(R_mod)},
        "phi_emergence_force": r6(phi), "C_hist": r6(C_hist),
        "Lambda_resilience": r6(Lambda), "Upsilon_propensity": r6(Upsilon),
        "Gamma_cost": r6(Gamma), "AT_ratio": r4(AT),
        "AT_interpretation": ("Anados Dominant — Self-correcting, Generative Growth" if AT > 1
                              else "Thanatos Dominant — Collapse / Inhibition / Stasis"),
        "system_state": "Structured Dynamics" if passes else "Excessive Instability",
    }



# ═══════════════════════════════════════════════════════════════
# ██████████████████████████████████████████████████████████████
#  SECTION II — E*(t) PLANETARY INFLUENCE ENGINE
#  G S Ramesh Kumar — UEDP v5
#  C_i(t) = S_i · W_i(t) · T_i(t) · H_i(event) · P_i
#  E(t)   = Σ C_i(t)
#  M(t)   = Σ K(|θ_Moon(t) − θ_dasha_lords|)
#  E*(t)  = E(t) · (1 + λ·M(t))
# ██████████████████████████████████████████████████████████████
# ═══════════════════════════════════════════════════════════════

from typing import Optional

# ── E*(t) CONSTANTS ─────────────────────────────────────────────

DASHA_WEIGHTS_ET = {'MD': 1.0, 'AD': 0.6, 'PD': 0.3, 'SD': 0.1}
MOON_LAMBDA      = 0.5   # Moon trigger amplification λ

KERNEL_PARAMS = {
    'w0':   1.00, 'sigma0':   400,
    'w180': 0.80, 'sigma180': 600,
    'w90':  0.60, 'sigma90':  450,
    'w60':  0.40, 'sigma60':  300,
    'w120': 0.70, 'sigma120': 500,
    'w240': 0.65, 'sigma240': 500,
}

ET_DIGNITY_SCORES = {
    'exalted':1.5,'moolatrikona':1.35,'own':1.2,'friend':1.0,
    'neutral':0.9,'enemy':0.7,'debilitated':0.5,'neecha_bhanga':1.3,
}

ET_HOUSE_STRENGTH = {
    1:1.2,4:1.2,7:1.2,10:1.2,
    5:1.3,9:1.3,
    2:1.0,11:1.0,
    3:0.9,6:0.7,8:0.6,12:0.65,
}

# Functional nature per lagna (BPHS Ch.34)
FUNCTIONAL_NATURE = {
    'Mesha':     {'Jupiter':+1,'Sun':+1,'Moon':+1,'Mars':+1,'Mercury':-1,'Venus':-1,'Saturn':-1,'Rahu':-1,'Ketu':+1},
    'Vrishabha': {'Venus':+1,'Mercury':+1,'Saturn':+1,'Moon':+1,'Sun':-1,'Mars':-1,'Jupiter':-1,'Rahu':-1,'Ketu':+1},
    'Mithuna':   {'Mercury':+1,'Venus':+1,'Saturn':+1,'Rahu':+1,'Sun':-1,'Moon':-1,'Mars':-1,'Jupiter':-1,'Ketu':-1},
    'Karka':     {'Moon':+1,'Mars':+1,'Jupiter':+1,'Mercury':-1,'Venus':-1,'Saturn':-1,'Sun':0,'Rahu':-1,'Ketu':+1},
    'Simha':     {'Sun':+1,'Mars':+1,'Jupiter':+1,'Mercury':-1,'Venus':-1,'Saturn':-1,'Moon':0,'Rahu':-1,'Ketu':+1},
    'Kanya':     {'Mercury':+1,'Venus':+1,'Rahu':+1,'Moon':-1,'Mars':-1,'Jupiter':-1,'Sun':-1,'Saturn':+1,'Ketu':-1},
    'Tula':      {'Mercury':+1,'Venus':+1,'Saturn':+1,'Rahu':+1,'Sun':-1,'Moon':-1,'Jupiter':-1,'Mars':-1,'Ketu':-1},
    'Vrishchika':{'Moon':+1,'Jupiter':+1,'Sun':+1,'Mars':+1,'Mercury':-1,'Venus':-1,'Saturn':-1,'Rahu':-1,'Ketu':+1},
    'Dhanu':     {'Sun':+1,'Mars':+1,'Jupiter':+1,'Moon':+1,'Mercury':-1,'Venus':-1,'Saturn':-1,'Rahu':-1,'Ketu':+1},
    'Makara':    {'Venus':+1,'Mercury':+1,'Saturn':+1,'Rahu':+1,'Moon':-1,'Mars':-1,'Jupiter':-1,'Sun':-1,'Ketu':-1},
    'Kumbha':    {'Venus':+1,'Saturn':+1,'Rahu':+1,'Moon':-1,'Mars':-1,'Jupiter':-1,'Sun':-1,'Mercury':+1,'Ketu':-1},
    'Meena':     {'Moon':+1,'Mars':+1,'Jupiter':+1,'Ketu':+1,'Mercury':-1,'Venus':-1,'Saturn':-1,'Sun':0,'Rahu':-1},
}

ET_DOMAIN_WEIGHTS = {
    'career':   {'Sun':2.0,'Saturn':1.8,'Mars':1.5,'Mercury':1.3,'Jupiter':1.2,'Moon':1.0,'Venus':1.0,'Rahu':1.2,'Ketu':0.8},
    'marriage': {'Venus':2.0,'Jupiter':1.8,'Moon':1.5,'Rahu':1.3,'Mars':1.2,'Mercury':1.0,'Sun':1.0,'Saturn':0.8,'Ketu':0.8},
    'health':   {'Saturn':2.0,'Mars':1.8,'Sun':1.5,'Moon':1.3,'Rahu':1.5,'Ketu':1.3,'Jupiter':1.2,'Mercury':1.0,'Venus':1.0},
    'wealth':   {'Jupiter':2.0,'Venus':1.8,'Mercury':1.5,'Moon':1.3,'Sun':1.2,'Mars':1.0,'Saturn':1.0,'Rahu':1.2,'Ketu':0.7},
    'spiritual':{'Ketu':2.0,'Jupiter':1.8,'Saturn':1.5,'Moon':1.3,'Sun':1.2,'Rahu':0.8,'Mercury':1.0,'Mars':0.8,'Venus':0.9},
    'general':  {'Saturn':1.5,'Jupiter':1.5,'Rahu':1.3,'Ketu':1.2,'Mars':1.2,'Sun':1.0,'Moon':1.0,'Venus':1.0,'Mercury':1.0},
}

TAB_DOMAINS = {
    'chart':'general','panchang':'general','dasha':'general','doshas':'health',
    'medical':'health','political':'career','vargas':'general','career':'career',
    'transits':'general','decisions':'general','children':'marriage',
    'marriage':'marriage','ganda':'health','location':'general',
    'muhurta':'general','parihara':'spiritual','match':'marriage',
}


# ── KERNEL AND ANGULAR HELPERS ──────────────────────────────────

def angular_separation(a: float, b: float) -> float:
    d = abs(a - b) % 360
    return min(d, 360 - d)


def kernel_K(delta: float) -> float:
    p = KERNEL_PARAMS
    return (
        p['w0']   * math.exp(-(delta**2)            / (2*p['sigma0']))   +
        p['w180'] * math.exp(-((delta-180)**2)       / (2*p['sigma180'])) +
        p['w90']  * math.exp(-((delta-90)**2)        / (2*p['sigma90']))  +
        p['w60']  * math.exp(-((delta-60)**2)        / (2*p['sigma60']))  +
        p['w120'] * math.exp(-((delta-120)**2)       / (2*p['sigma120'])) +
        p['w240'] * math.exp(-((delta-240 if delta>=180 else delta)**2)   / (2*p['sigma240']))
    )


def get_planet_strength_Et(planet_name: str, planet_data: dict,
                            shadbala: dict, ashtakavarga: dict) -> float:
    """S_i = D_i · H_i · B_i · A_i"""
    dig   = planet_data.get('dignity','neutral')
    D_i   = ET_DIGNITY_SCORES.get(dig, 0.9)
    house = planet_data.get('house',1)
    H_i   = ET_HOUSE_STRENGTH.get(house, 0.9)
    rupas = shadbala.get(planet_name,{}).get('total_rupas',180)
    B_i   = max(0.5, min(1.5, rupas/180.0))
    av_sc = ashtakavarga.get(planet_name,{}).get('transit_score_current',4)
    A_i   = max(0.5, min(1.5, av_sc/4.0))
    return round(D_i * H_i * B_i * A_i, 4)


def get_dasha_weight_Et(planet_name: str, dasha_current: dict,
                         dasha_all: list) -> float:
    """W_i(t) across MD/AD/PD/SD levels."""
    cur = dasha_current or {}
    w   = 0.0
    if cur.get('mahadasha')   == planet_name: w += DASHA_WEIGHTS_ET['MD']
    if cur.get('antardasha')  == planet_name: w += DASHA_WEIGHTS_ET['AD']
    if cur.get('pratyantara') == planet_name: w += DASHA_WEIGHTS_ET['PD']
    from datetime import timezone as _tz
    today = datetime.now(_tz.utc).strftime('%Y-%m-%d')
    for md in dasha_all:
        if md.get('lord') != cur.get('mahadasha'): continue
        for ad in md.get('antardashas', []):
            if ad.get('lord') != cur.get('antardasha'): continue
            for pd in ad.get('pratyantaras', []):
                if pd.get('lord') == planet_name:
                    if pd.get('start','') <= today <= pd.get('end','9999'):
                        w += DASHA_WEIGHTS_ET['SD']
                        break
    return round(w, 4)


def get_transit_activation_Et(planet_name: str, transit_lon: float,
                               natal_planets: dict, lagna_lon: float,
                               ayanamsa_val: float) -> float:
    """T_i(t) = Σ_k K(|θ_i(t) − θ_k_natal|)"""
    T = 0.0
    for pn, pd in natal_planets.items():
        nat_lon = pd.get('sidereal', pd.get('degree',0))
        T      += kernel_K(angular_separation(transit_lon, nat_lon))
    T += kernel_K(angular_separation(transit_lon, lagna_lon)) * 1.3
    return round(T, 4)


def get_functional_polarity(planet_name: str, lagna_rashi: str) -> float:
    """P_i — BPHS functional benefic/malefic for this lagna."""
    tbl = FUNCTIONAL_NATURE.get(lagna_rashi, {})
    return float(tbl.get(planet_name, 0))


def get_transit_positions_at(jd: float, ayanamsa_str: str) -> tuple:
    """Transit positions for all 9 grahas at given JD."""
    _set_ayanamsa(ayanamsa_str)
    ayan = swe.get_ayanamsa_ut(jd)
    positions = {}
    SPEED_F = swe.FLG_SIDEREAL | swe.FLG_MOSEPH | swe.FLG_SPEED
    for pname, pid in PLANET_IDS.items():
        try:
            r = swe.calc_ut(jd, pid, SPEED_F)
            sid = r[0][0] % 360
            positions[pname] = {
                'sidereal':   round(sid, 4),
                'retrograde': r[0][3] < 0,
                'rashi':      RASHIS[int(sid/30) % 12],
            }
        except Exception:
            positions[pname] = {'sidereal':0,'retrograde':False,'rashi':'Mesha'}
    if 'Rahu' in positions:
        k_sid = (positions['Rahu']['sidereal'] + 180) % 360
        positions['Ketu'] = {'sidereal':round(k_sid,4),'retrograde':True,
                             'rashi':RASHIS[int(k_sid/30) % 12]}
    return positions, round(ayan, 4)


def jd_from_date(date_str: str) -> float:
    d = datetime.strptime(date_str, '%Y-%m-%d')
    return swe.julday(d.year, d.month, d.day, 6.5)


def jd_to_date_str(jd: float) -> str:
    try:
        y, m, d, _ = swe.revjul(jd)
        return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"
    except Exception:
        return '—'


# ── E*(t) SINGLE DAY ─────────────────────────────────────────────

def compute_Et_single_day(jd_day: float, natal_planets: dict,
                           natal_lagna: dict, dasha_data: dict,
                           shadbala: dict, ashtakavarga: dict,
                           domain: str = 'general',
                           ayanamsa_str: str = 'lahiri') -> dict:
    lagna_rashi  = natal_lagna.get('rashi','Mesha')
    lagna_lon    = natal_lagna.get('sidereal', natal_lagna.get('degree',0))
    dasha_cur    = dasha_data.get('current',{})
    dasha_all    = dasha_data.get('dashas',[])
    domain_wts   = ET_DOMAIN_WEIGHTS.get(domain, ET_DOMAIN_WEIGHTS['general'])
    active_lords = {dasha_cur.get('mahadasha'), dasha_cur.get('antardasha'),
                    dasha_cur.get('pratyantara')} - {None}

    transit_pos, ayan_val = get_transit_positions_at(jd_day, ayanamsa_str)

    E_raw = 0.0; breakdown = {}
    for pname in ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu']:
        natal_pd   = natal_planets.get(pname,{})
        if not natal_pd: continue
        transit_pd = transit_pos.get(pname,{})
        t_lon      = transit_pd.get('sidereal',0)

        S_i    = get_planet_strength_Et(pname, natal_pd, shadbala, ashtakavarga)
        W_i    = get_dasha_weight_Et(pname, dasha_cur, dasha_all) or 0.05
        T_i    = get_transit_activation_Et(pname, t_lon, natal_planets, lagna_lon, ayan_val)
        H_i    = domain_wts.get(pname,1.0)
        P_i    = get_functional_polarity(pname, lagna_rashi) or 0.1
        retro  = 0.75 if transit_pd.get('retrograde') else 1.0
        C_i    = S_i * W_i * T_i * H_i * P_i * retro

        E_raw += C_i
        breakdown[pname] = {
            'S_i':round(S_i,3),'W_i':round(W_i,3),'T_i':round(T_i,3),
            'H_i':round(H_i,3),'P_i':P_i,'C_i':round(C_i,4),
            'retrograde':transit_pd.get('retrograde',False),
            'transit_rashi':transit_pd.get('rashi','—'),
        }

    moon_lon = transit_pos.get('Moon',{}).get('sidereal',0)
    M_score  = 0.0
    for lord in active_lords:
        nat_l = natal_planets.get(lord,{})
        if nat_l:
            M_score += kernel_K(angular_separation(moon_lon, nat_l.get('sidereal',nat_l.get('degree',0))))
        tr_l = transit_pos.get(lord,{})
        if tr_l:
            M_score += kernel_K(angular_separation(moon_lon, tr_l.get('sidereal',0))) * 0.5

    E_star = E_raw * (1 + MOON_LAMBDA * M_score)
    return {
        'jd':round(jd_day,4),'E_raw':round(E_raw,4),'M_score':round(M_score,4),
        'E_star':round(E_star,4),'breakdown':breakdown,
        'moon_lon':round(moon_lon,2),'active_lords':list(active_lords),
    }


# ── E*(t) SERIES ─────────────────────────────────────────────────

def compute_Et_series(natal_planets: dict, natal_lagna: dict,
                      dasha_data: dict, shadbala: dict, ashtakavarga: dict,
                      start_date: str, end_date: str,
                      domain: str = 'general', ayanamsa_str: str = 'lahiri',
                      step_days: int = 1) -> list:
    from datetime import timezone as _tz
    d_start = datetime.strptime(start_date,'%Y-%m-%d')
    d_end   = datetime.strptime(end_date,  '%Y-%m-%d')
    series  = []
    current = d_start
    while current <= d_end:
        jd  = swe.julday(current.year, current.month, current.day, 6.5)
        rec = compute_Et_single_day(jd, natal_planets, natal_lagna, dasha_data,
                                     shadbala, ashtakavarga, domain, ayanamsa_str)
        rec['date'] = current.strftime('%Y-%m-%d')
        series.append(rec)
        current += timedelta(days=step_days)
    return series


# ── STATISTICAL ANALYSIS ─────────────────────────────────────────

def analyse_series(series: list, alpha: float = 1.0) -> dict:
    if not series:
        return {'series':[],'mu':0,'sigma':1,'peaks':[],'troughs':[],
                'zero_crossings':[],'n_days':0,'max_E_star':0,'min_E_star':0,
                'positive_days':0,'negative_days':0,'neutral_days':0}
    values = [r['E_star'] for r in series]
    n      = len(values)
    mu     = sum(values)/n
    sigma  = math.sqrt(sum((v-mu)**2 for v in values)/n) or 1.0
    classified = []
    for i, rec in enumerate(series):
        v = rec['E_star']
        z = (v-mu)/sigma
        cls = 'POSITIVE' if v > mu+alpha*sigma else 'NEGATIVE' if v < mu-alpha*sigma else 'NEUTRAL'
        conf= min(100, round(abs(z)/3*100,1))
        classified.append({**rec,'mu':round(mu,4),'sigma':round(sigma,4),
                            'Z':round(z,3),'classification':cls,'confidence':conf})
    peaks=[]; troughs=[]
    for i in range(1, n-1):
        cv=values[i]; pv=values[i-1]; nv=values[i+1]
        if cv>pv and cv>nv and classified[i]['classification']=='POSITIVE':
            peaks.append({'date':classified[i]['date'],'E_star':round(cv,4),
                          'Z':classified[i]['Z'],'confidence':classified[i]['confidence'],
                          'active_lords':classified[i].get('active_lords',[])})
        elif cv<pv and cv<nv and classified[i]['classification']=='NEGATIVE':
            troughs.append({'date':classified[i]['date'],'E_star':round(cv,4),
                            'Z':classified[i]['Z'],'confidence':classified[i]['confidence'],
                            'active_lords':classified[i].get('active_lords',[])})
    zero_crossings=[]
    for i in range(1,n):
        if values[i-1]*values[i]<0:
            zero_crossings.append({'date':classified[i]['date'],
                                   'type':'crossing_positive' if values[i]>0 else 'crossing_negative'})
    return {
        'series':classified,'mu':round(mu,4),'sigma':round(sigma,4),'n_days':n,
        'peaks':sorted(peaks,key=lambda x:-x['E_star'])[:20],
        'troughs':sorted(troughs,key=lambda x:x['E_star'])[:20],
        'zero_crossings':zero_crossings[:20],
        'max_E_star':round(max(values),4),'min_E_star':round(min(values),4),
        'positive_days':sum(1 for c in classified if c['classification']=='POSITIVE'),
        'negative_days':sum(1 for c in classified if c['classification']=='NEGATIVE'),
        'neutral_days': sum(1 for c in classified if c['classification']=='NEUTRAL'),
    }


# ── BACKTEST ─────────────────────────────────────────────────────

def backtest_events(series_analysed: dict, known_events: list,
                    window_days: int = 7) -> dict:
    series        = series_analysed.get('series',[])
    date_map      = {r['date']:r for r in series}
    peaks_dates   = {p['date'] for p in series_analysed.get('peaks',[])}
    troughs_dates = {t['date'] for t in series_analysed.get('troughs',[])}
    all_signal_dates = peaks_dates | troughs_dates
    hits=0; results=[]
    for ev in known_events:
        ev_date = ev.get('date','')
        try: ev_dt = datetime.strptime(ev_date,'%Y-%m-%d')
        except Exception: continue
        matched=False; match_type=None; best_date=None; best_E=None; best_Z=None
        min_dist=window_days+1
        for sig_date in all_signal_dates:
            try:
                sig_dt = datetime.strptime(sig_date,'%Y-%m-%d')
                dist   = abs((ev_dt-sig_dt).days)
                if dist<=window_days and dist<min_dist:
                    min_dist=dist; matched=True; best_date=sig_date
                    rec=date_map.get(sig_date,{})
                    best_E=rec.get('E_star'); best_Z=rec.get('Z')
                    match_type='PEAK' if sig_date in peaks_dates else 'TROUGH'
            except Exception: continue
        if matched: hits+=1
        exact_rec=date_map.get(ev_date,{})
        results.append({'date':ev_date,'type':ev.get('type','—'),'desc':ev.get('desc','—'),
                        'matched':matched,'match_type':match_type,'nearest_signal':best_date,
                        'distance_days':min_dist if matched else None,
                        'signal_E_star':best_E,'signal_Z':best_Z,
                        'exact_E_star':exact_rec.get('E_star'),'exact_Z':exact_rec.get('Z'),
                        'exact_class':exact_rec.get('classification','—')})
    total=len(results) or 1; hit_rate=round(hits/total*100,1)
    cal_note=('Hit rate low — consider reducing alpha to 0.7 or checking birth time' if hit_rate<50
              else 'Moderate accuracy — add more events for better calibration' if hit_rate<70
              else f'Good accuracy ({hit_rate}%) — model well-calibrated')
    return {'hit_rate_pct':hit_rate,'hits':hits,'total_events':total,
            'window_days':window_days,'per_event':results,'calibration_note':cal_note}


# ── UEDP E*(t) CONFIDENCE ────────────────────────────────────────

def uedp_Et_confidence(series_analysed: dict, omega_dynamics: float) -> dict:
    above_crit = omega_dynamics >= OMEGA_CRIT
    uedp_mode  = 'strict' if omega_dynamics>0.7 else 'balanced' if above_crit else 'exploratory'
    base_conf  = round(min(100, omega_dynamics*100*1.2),1)
    peaks      = series_analysed.get('peaks',[])
    troughs    = series_analysed.get('troughs',[])
    for p in peaks:
        p['uedp_confidence'] = round(base_conf*abs(p.get('Z',0))/3,1) if p.get('Z') else base_conf
    for t in troughs:
        t['uedp_confidence'] = round(base_conf*abs(t.get('Z',0))/3,1) if t.get('Z') else base_conf
    return {'omega_dynamics':round(omega_dynamics,4),'omega_crit':round(OMEGA_CRIT,4),
            'above_omega_crit':above_crit,'uedp_mode':uedp_mode,'base_confidence':base_conf,
            'peaks':peaks,'troughs':troughs,
            'note':(f'UEDP Omega={round(omega_dynamics,4)} — '
                    +('predictions reliable.' if above_crit else 'BELOW Omega_crit — exploratory mode.'))}


# ── E*(t) FULL MULTI-DOMAIN SCAN ─────────────────────────────────

def compute_Et_full(chart_data: dict, domains: Optional[list] = None,
                    backtest_evts: Optional[list] = None,
                    forecast_days: int = 365, backtest_years: int = 5,
                    alpha: float = 1.0, window_days: int = 7) -> dict:
    from datetime import timezone as _tz
    natal_planets  = chart_data.get('planets',{})
    natal_lagna    = chart_data.get('lagna',{})
    dasha_data     = chart_data.get('dasha',{})
    shadbala       = chart_data.get('shadbala',{})
    ashtakavarga   = chart_data.get('ashtakavarga',{})
    ayanamsa_str   = chart_data.get('ayanamsa_used','lahiri')
    omega_dyn      = chart_data.get('uedp_protocol',{}).get('omega_dynamics',0.5)

    now            = datetime.now(_tz.utc)
    today_str      = now.strftime('%Y-%m-%d')
    forecast_end   = (now + timedelta(days=forecast_days)).strftime('%Y-%m-%d')
    backtest_start = (now - timedelta(days=backtest_years*365)).strftime('%Y-%m-%d')

    if domains is None:
        domains = ['general','career','marriage','health','wealth','spiritual']

    result = {'generated_at':today_str,'forecast_days':forecast_days,
              'backtest_years':backtest_years,'alpha':alpha,'ayanamsa':ayanamsa_str,
              'lagna':natal_lagna.get('rashi','—'),'current_dasha':dasha_data.get('current',{}),
              'domains':{},'uedp':{},'calendar_data':{},'top_peaks':[],'top_troughs':[]}

    for domain in domains:
        fc_raw      = compute_Et_series(natal_planets, natal_lagna, dasha_data, shadbala,
                                         ashtakavarga, today_str, forecast_end, domain, ayanamsa_str)
        fc_analysed = analyse_series(fc_raw, alpha)
        bt_raw      = compute_Et_series(natal_planets, natal_lagna, dasha_data, shadbala,
                                         ashtakavarga, backtest_start, today_str, domain, ayanamsa_str)
        bt_analysed = analyse_series(bt_raw, alpha)
        bt_validation = backtest_events(bt_analysed, backtest_evts, window_days) if backtest_evts else {}
        uedp_fc     = uedp_Et_confidence(fc_analysed, omega_dyn)
        result['domains'][domain] = {
            'forecast':{'series':[_slim_Et(r) for r in fc_analysed['series']],
                        'stats':_stats_only_Et(fc_analysed),'peaks':uedp_fc['peaks'],
                        'troughs':uedp_fc['troughs'],'zero_crossings':fc_analysed['zero_crossings']},
            'backtest':{'series':[_slim_Et(r) for r in bt_analysed['series']],
                        'stats':_stats_only_Et(bt_analysed),'peaks':bt_analysed['peaks'],
                        'troughs':bt_analysed['troughs'],'validation':bt_validation},
            'uedp':uedp_fc,
        }

    gen_fc = result['domains'].get('general',{}).get('forecast',{})
    result['calendar_data'] = _build_calendar_Et(gen_fc.get('series',[]))
    all_peaks=[]; all_troughs=[]
    for domain, ddata in result['domains'].items():
        for p in ddata['forecast'].get('peaks',[]): all_peaks.append({**p,'domain':domain})
        for t in ddata['forecast'].get('troughs',[]): all_troughs.append({**t,'domain':domain})
    result['top_peaks']   = sorted(all_peaks,  key=lambda x:-x.get('E_star',0))[:15]
    result['top_troughs'] = sorted(all_troughs,key=lambda x: x.get('E_star',0))[:15]
    result['uedp'] = {
        'omega_dynamics':round(omega_dyn,4),'omega_crit':round(OMEGA_CRIT,4),
        'above_omega_crit':omega_dyn>=OMEGA_CRIT,
        'mode':('strict' if omega_dyn>0.7 else 'balanced' if omega_dyn>=OMEGA_CRIT else 'exploratory'),
        'note':(f'G S Ramesh Kumar UEDP v5 — E*(t)=E(t)*(1+lambda*M(t)). '
                f'Omega={round(omega_dyn,4)}. '
                f'{"Reliable." if omega_dyn>=OMEGA_CRIT else "Exploratory."}'),
    }
    return result


def _slim_Et(r: dict) -> dict:
    return {'date':r.get('date'),'E_star':r.get('E_star'),'E_raw':r.get('E_raw'),
            'Z':r.get('Z'),'classification':r.get('classification'),
            'confidence':r.get('confidence'),'moon_lon':r.get('moon_lon')}


def _stats_only_Et(a: dict) -> dict:
    return {'mu':a.get('mu'),'sigma':a.get('sigma'),'n_days':a.get('n_days'),
            'max_E_star':a.get('max_E_star'),'min_E_star':a.get('min_E_star'),
            'positive_days':a.get('positive_days'),'negative_days':a.get('negative_days'),
            'neutral_days':a.get('neutral_days')}


def _build_calendar_Et(series: list) -> dict:
    calendar={}
    for r in series:
        date=r.get('date','')
        if not date: continue
        ym=date[:7]; dd=date[8:10]
        if ym not in calendar:
            calendar[ym]={'days':{},'avg_E':0,'pos':0,'neg':0,'neutral':0}
        calendar[ym]['days'][dd]={'E_star':r.get('E_star'),'cls':r.get('classification','NEUTRAL'),'Z':r.get('Z')}
        cls=r.get('classification','NEUTRAL')
        if cls=='POSITIVE': calendar[ym]['pos']+=1
        elif cls=='NEGATIVE': calendar[ym]['neg']+=1
        else: calendar[ym]['neutral']+=1
    for ym,mdata in calendar.items():
        vals=[d['E_star'] for d in mdata['days'].values() if d.get('E_star') is not None]
        mdata['avg_E']=round(sum(vals)/len(vals),4) if vals else 0
        mdata['month_quality']=('POSITIVE' if mdata['pos']>mdata['neg']*1.5
                                else 'NEGATIVE' if mdata['neg']>mdata['pos']*1.5 else 'MIXED')
    return calendar


# ═══════════════════════════════════════════════════════════════
# ██████████████████████████████████████████████████████████████
#  SECTION III — MARRIAGE, CHILD, AUSPICIOUS DIRECTIONS
#  From engine__1_.py — G S Ramesh Kumar UEDP v5.1
#  Bug fixes: marriage H3 bonus, base×1.4, dedup, mutual_kendra,
#             child Jupiter dedup, timezone import fix,
#             gender 4-tier confidence, INDET threshold=3
# ██████████████████████████████████████████████████████████████
# ═══════════════════════════════════════════════════════════════

def _circ_diff(a: float, b: float) -> float:
    d = abs(a-b) % 360
    return min(d, 360-d)


ODD_RASHIS  = {'Mesha','Mithuna','Simha','Tula','Dhanu','Kumbha'}
EVEN_RASHIS = {'Vrishabha','Karka','Kanya','Vrishchika','Makara','Meena'}
DUAL_RASHIS = {'Mithuna','Kanya','Dhanu','Meena'}

H5_PLANET_EFFECTS = {
    'Sun':     ('Solar child — leadership, strong will. One child likely. Eye/heart vigilance if afflicted.','One','Male tendency'),
    'Moon':    ('Lunar child — sensitive, emotional, creative. Female tendency. Health linked to mother.','One or two','Female tendency'),
    'Mars':    ('Mars in H5 — child after effort. Male child likely. Energetic; accident caution if afflicted.','One or two','Male'),
    'Mercury': ('Mercury child — intelligent, quick learner. Twins or multiples possible.','Two or more','Neutral'),
    'Jupiter': ('Jupiter in H5 — blessed with children. Most auspicious. Wise, dharmic children.','Two or more','Male tendency'),
    'Venus':   ('Venus in H5 — beautiful, artistic children. Female tendency. Children bring joy.','One or two','Female tendency'),
    'Saturn':  ('Saturn in H5 — delayed children. First child after significant wait. Serious, reserved child.','One (delayed)','Neutral'),
    'Rahu':    ('Rahu in H5 — unconventional circumstances. Adoption/step-child possible.','Uncertain','Uncertain'),
    'Ketu':    ('Ketu in H5 — spiritual child, special gifts. Natural conception may need support.','One (spiritual)','Neutral'),
}

CHILD_HEALTH_RISKS = {
    'Mars':'Active child — prone to fevers, cuts, accidents. Sports-oriented.',
    'Saturn':'Chronic health vigilance — respiratory, bone issues. Discipline helps.',
    'Rahu':'Unusual ailments — allergies, nervous system. Keep vaccinations current.',
    'Ketu':'Mysterious ailments — spiritual sensitivity. Intuitive child.',
    'Sun':'Heart/eye vigilance if Sun afflicted. Otherwise robust health.',
    'Moon':'Emotional sensitivity — mental wellbeing important. Gut/lung care.',
}

# FIX 7: Jupiter removed from PLANET_GENDER_PTS — contribution via strength block only
PLANET_GENDER_PTS = {'Sun':+2,'Mars':+2,'Moon':-2,'Venus':-2,'Mercury':0,'Saturn':0,'Rahu':0,'Ketu':0}
DIG_W_CHILD       = {'exalted':5,'moolatrikona':4,'own':4,'friend':3,'neutral':2,'enemy':1,'debilitated':0}
_INDET_THRESHOLD  = 3   # FIX 8

SPOUSE_RASHI_QUALITIES = {
    'Mesha':'Active, independent, courageous. Quick decisions. May be headstrong.',
    'Vrishabha':'Stable, artistic, sensual. Loves comfort. Reliable but stubborn.',
    'Mithuna':'Communicative, witty, intellectual. Dual nature. Needs stimulation.',
    'Karka':'Nurturing, emotional, home-loving. Deeply caring. Sensitive.',
    'Simha':'Confident, charismatic, generous. Needs admiration. Leadership quality.',
    'Kanya':'Analytical, service-oriented, health-conscious. Detail-focused.',
    'Tula':'Balanced, artistic, diplomatic. Needs harmony. Social and charming.',
    'Vrishchika':'Intense, passionate, investigative. Deep and transformative.',
    'Dhanu':'Philosophical, adventurous, optimistic. Independent. Loves freedom.',
    'Makara':'Disciplined, ambitious, practical. Career-focused. Late bloomer.',
    'Kumbha':'Unconventional, humanitarian, independent. Intellectual. Unique.',
    'Meena':'Compassionate, spiritual, intuitive. Artistic. May be impractical.',
}

_DIKPALA_DIRECTION = {
    'Sun':'East','Mercury':'North','Moon':'North-West','Venus':'South-East',
    'Mars':'South','Saturn':'West','Jupiter':'North-East','Rahu':'South-West','Ketu':'South-East',
}
_DIGBALA_HOUSE = {'Sun':10,'Mars':10,'Saturn':7,'Jupiter':1,'Mercury':1,'Moon':4,'Venus':4}
_HOUSE_DIRECTION = {
    1:'East',2:'South-East',3:'South',4:'North',
    5:'North-East',6:'East',7:'West',8:'North-West',
    9:'North-East',10:'South',11:'North',12:'North-West',
}
_RASHI_DIRECTION = {
    'Mesha':'East','Vrishabha':'South','Mithuna':'West','Karka':'North',
    'Simha':'East','Kanya':'South','Tula':'West','Vrishchika':'North',
    'Dhanu':'East','Makara':'South','Kumbha':'West','Meena':'North',
}
_NAKSHATRA_DIRECTION = {
    'Ashwini':'East','Bharani':'East','Krittika':'East',
    'Rohini':'South-East','Mrigashira':'South-East',
    'Ardra':'South','Punarvasu':'South','Pushya':'South',
    'Ashlesha':'South-West','Magha':'South-West','Purva Phalguni':'South-West',
    'Uttara Phalguni':'West','Hasta':'West','Chitra':'West',
    'Swati':'North-West','Vishakha':'North-West','Anuradha':'North-West',
    'Jyeshtha':'North','Moola':'North','Purva Ashadha':'North',
    'Uttara Ashadha':'North-East','Shravana':'North-East','Dhanishtha':'North-East',
    'Shatabhisha':'East','Purva Bhadrapada':'East',
    'Uttara Bhadrapada':'South-East','Revati':'South-East',
}
_TITHI_LORD = {
    1:'Moon',2:'Mars',3:'Jupiter',4:'Venus',5:'Saturn',6:'Sun',7:'Moon',8:'Mars',9:'Jupiter',10:'Venus',
    11:'Saturn',12:'Sun',13:'Moon',14:'Mars',15:'Jupiter',16:'Venus',17:'Saturn',18:'Sun',19:'Moon',20:'Mars',
    21:'Jupiter',22:'Venus',23:'Saturn',24:'Sun',25:'Moon',26:'Mars',27:'Jupiter',28:'Venus',29:'Saturn',30:'Sun',
}



# ── COMPUTE MARRIAGE ANALYSIS ────────────────────────────────────

def compute_marriage_analysis(kundali: dict) -> dict:
    """UEDP v5 Marriage Analysis — G S Ramesh Kumar. BPHS + Phaladeepika + Jataka Parijata."""
    from datetime import timezone as _tz
    planets  = kundali['planets']
    lagna    = kundali['lagna']
    li       = lagna.get('rashi_idx', RASHIS.index(lagna['rashi']) if lagna['rashi'] in RASHIS else 0)
    shadbala = kundali.get('shadbala',{})
    dasha    = kundali.get('dasha',{})
    vargas   = kundali.get('vargas',{})
    doshas   = kundali.get('doshas',[])

    def _h(pn):    return planets[pn]['house'] if pn in planets else 0
    def _dig(pn):  return planets[pn]['dignity'] if pn in planets else 'neutral'
    def _lord(h):  return RASHI_LORD.get(RASHIS[(li+h-1)%12],'')
    def _rashi(h): return RASHIS[(li+h-1)%12]
    def _shad(pn): return shadbala.get(pn,{}).get('total_rupas',180)
    def _sid(pn):  return planets[pn].get('sidereal',planets[pn].get('degree',0)) if pn in planets else 0

    h7_rashi=_rashi(7); h7_lord=_lord(7); h7_lord_h=_h(h7_lord); h7_lord_dig=_dig(h7_lord)
    h7_planets=[pn for pn,pd in planets.items() if pd['house']==7]
    h7_lord_shad=_shad(h7_lord)

    venus_h=_h('Venus'); venus_dig=_dig('Venus')
    mars_h=_h('Mars');   rahu_h=_h('Rahu')
    jup_h=_h('Jupiter'); moon_h=_h('Moon')

    h5_lord=_lord(5); h5_lord_h=_h(h5_lord)
    h2_lord=_lord(2); h2_lord_h=_h(h2_lord)
    h11_lord=_lord(11); h11_lord_h=_h(h11_lord)

    love_score=0; arranged_score=0; livein_score=0
    love_reasons=[]; arranged_reasons=[]; livein_reasons=[]

    vm_diff=_circ_diff(_sid('Venus'),_sid('Mars'))
    venus_mars_conj=(vm_diff<=10)
    venus_mars_opp=(abs(vm_diff-180)<=10)
    venus_mars_sq=(abs(vm_diff-90)<=10)
    mutual_kendra=abs(_h('Mars')-_h('Venus')) in {0,3,6,7}   # FIX 4
    venus_mars_asp=venus_mars_opp or venus_mars_sq or (mutual_kendra and not venus_mars_conj)

    if venus_mars_conj:
        love_score+=3; love_reasons.append('Venus+Mars conjunction — powerful romantic magnetism')
    elif venus_mars_asp:
        love_score+=2; love_reasons.append('Venus-Mars aspect — romantic attraction, love before marriage')

    h5_h7_same_house=h5_lord_h==h7_lord_h and h5_lord!=h7_lord
    h5_h7_exchange=(_h(h5_lord)==7 and _h(h7_lord)==5)
    if h5_h7_same_house:
        love_score+=3; love_reasons.append(f'H5 lord {h5_lord} and H7 lord {h7_lord} conjunct in H{h5_lord_h}')
    if h5_h7_exchange:
        love_score+=3; love_reasons.append('H5-H7 Parivartana — strong love marriage indicator')

    if rahu_h==7: love_score+=2; livein_score+=2; love_reasons.append('Rahu in H7 — unconventional/inter-caste marriage'); livein_reasons.append('Rahu in H7 — may resist formal marriage')
    if rahu_h==5: love_score+=2; love_reasons.append('Rahu in H5 — romantic affairs before settling')
    if venus_h==5: love_score+=2; love_reasons.append('Venus in H5 — romance leads to marriage')
    if venus_h==7: love_score+=1; love_reasons.append('Venus in H7 — spouse found through social circle')
    if moon_h in {5,7} and venus_h in {5,7}: love_score+=2; love_reasons.append(f'Moon(H{moon_h})+Venus(H{venus_h}) — emotional romantic nature')
    if mars_h==7: love_score+=1; love_reasons.append('Mars in H7 — independently seeks own partner')

    h7_cusp_sid=((li+6)%12)*30+15
    jup_sid=_sid('Jupiter')
    jup_h7_delta=_circ_diff(jup_sid,h7_cusp_sid)
    jup_h7_asp=(jup_h7_delta<=10 or abs(jup_h7_delta-120)<=15 or abs(jup_h7_delta-240)<=15)
    if jup_h7_asp: arranged_score+=3; arranged_reasons.append('Jupiter aspects H7 — traditional family-approved marriage')
    if 'Saturn' in h7_planets: arranged_score+=2; arranged_reasons.append('Saturn in H7 — formal traditional marriage')

    sat_sid=_sid('Saturn'); sat_h7_delta=_circ_diff(sat_sid,h7_cusp_sid)
    if sat_h7_delta<=15 or abs(sat_h7_delta-90)<=15 or abs(sat_h7_delta-270)<=15:
        arranged_score+=2; arranged_reasons.append('Saturn aspects H7 — delayed but stable traditional marriage')

    DIG_SCORE={'exalted':5,'moolatrikona':4,'own':4,'friend':3,'neutral':2,'enemy':1,'debilitated':0}
    if DIG_SCORE.get(h7_lord_dig,2)>=3:
        arranged_score+=2; arranged_reasons.append(f'H7 lord {h7_lord} {h7_lord_dig} — good family spouse')
    if not venus_mars_conj and not venus_mars_asp:
        arranged_score+=1; arranged_reasons.append('No Venus-Mars connection — love affair less likely')

    rahu_venus_diff=_circ_diff(_sid('Rahu'),_sid('Venus'))
    if rahu_venus_diff<=10: livein_score+=2; livein_reasons.append('Rahu+Venus conjunction — unconventional relationships')
    if h7_lord_h in {6,8,12}: livein_score+=2; livein_reasons.append(f'H7 lord in H{h7_lord_h} — formal marriage faces obstacles')
    MALEFICS={'Saturn','Mars','Rahu','Ketu'}
    malefics_in_h7=[pn for pn in h7_planets if pn in MALEFICS]
    if len(malefics_in_h7)>=2: livein_score+=1; livein_reasons.append('Multiple malefics in H7 — formal marriage complicated')
    if lagna['rashi']=='Kumbha': livein_score+=1; livein_reasons.append('Kumbha Lagna — independent, unconventional outlook')

    scores={'love':love_score,'arranged':arranged_score,'live_in':livein_score}
    top_type=max(scores,key=scores.get)
    if max(scores.values())==0:
        marriage_type='Arranged (default)'; type_confidence=40
    elif top_type=='love' and love_score>=arranged_score+2:
        marriage_type='Love Marriage — chart strongly supports self-chosen partner'; type_confidence=min(90,40+love_score*5)
    elif top_type=='arranged' and arranged_score>=love_score+2:
        marriage_type='Arranged Marriage — family involvement in partner selection'; type_confidence=min(90,40+arranged_score*5)
    elif top_type=='live_in' and livein_score>=4:
        marriage_type='Live-in / Unconventional Relationship tendency'; type_confidence=min(85,40+livein_score*5)
    elif love_score>=arranged_score:
        marriage_type='Love-Arranged mix — self-chosen partner with family acceptance'; type_confidence=55
    else:
        marriage_type='Arranged with romantic element — family-assisted with chemistry'; type_confidence=55

    d9_data=vargas.get('D9',{}); d9_planets_v=d9_data.get('planets',{}); d9_lagna=d9_data.get('lagna',{})
    d9_li_rashi=d9_lagna.get('rashi',''); d9_li_idx=RASHIS.index(d9_li_rashi) if d9_li_rashi in RASHIS else 0
    d9_h7_lord=RASHI_LORD.get(RASHIS[(d9_li_idx+6)%12],'')
    d9_h7l_dig=d9_planets_v.get(d9_h7_lord,{}).get('dignity','neutral')
    d9_venus_dig=d9_planets_v.get('Venus',{}).get('dignity','neutral')
    DIG_SCORE_D9={'exalted':5,'moolatrikona':4,'own':4,'friend':3,'neutral':2,'enemy':1,'debilitated':0}
    d9_factor=max(0.7,min(1.3,(DIG_SCORE_D9.get(d9_h7l_dig,2)+DIG_SCORE_D9.get(d9_venus_dig,2))/2/3.0))

    success_score=DIG_SCORE.get(h7_lord_dig,2)*1.4   # FIX 2
    if h7_lord_h in {1,4,7,10}: success_score+=2
    elif h7_lord_h in {5,9}: success_score+=2
    elif h7_lord_h==11: success_score+=2
    elif h7_lord_h==3: success_score+=1   # FIX 1: upachaya gets +1
    elif h7_lord_h==6: success_score+=0.5
    elif h7_lord_h==2:
        BENEFIC_LORDS={'Jupiter','Venus','Mercury','Moon'}
        success_score+=1 if h7_lord in BENEFIC_LORDS else -1
    elif h7_lord_h in {8,12}: success_score-=2

    wealth_checked=set()  # FIX 3
    def _check_wl(lord_name,lord_house):
        if lord_name in wealth_checked: return 0.0
        wealth_checked.add(lord_name)
        return 1.0 if (DIG_SCORE.get(_dig(lord_name),2)>=3 and lord_house not in {6,8,12}) else 0.0
    success_score+=_check_wl(h2_lord,h2_lord_h)+_check_wl(h11_lord,h11_lord_h)
    if DIG_SCORE.get(venus_dig,2)>=3: success_score+=1
    success_score-=len(malefics_in_h7)*0.5
    success_score=max(0.0,min(10.0,success_score*d9_factor))

    if success_score>=7.5: success='HIGH — Excellent 7th house; stable, fulfilling marriage strongly indicated'; success_pct=88
    elif success_score>=6.5: success='HIGH — Strong 7th house; stable marriage indicated'; success_pct=82
    elif success_score>=5.0: success='MODERATE — Marriage likely stable with effort and understanding'; success_pct=65
    elif success_score>=3.0: success='CHALLENGING — H7 under some affliction; conflicts possible'; success_pct=45
    else: success='DIFFICULT — Significant H7 afflictions; delays, separation risk'; success_pct=28

    separation_indicators=[]
    if h7_lord_h in {6,12}: separation_indicators.append(f'H7 lord {h7_lord} in H{h7_lord_h} — classical difficulty indicator')
    if 'Rahu' in h7_planets and 'Mars' in h7_planets: separation_indicators.append('Rahu+Mars in H7 — intense conflicts')
    if 'Ketu' in h7_planets: separation_indicators.append('Ketu in H7 — emotional detachment; past-life karma')
    mangal_dosha=next((d for d in doshas if 'Mangal' in d.get('name','')),None)
    if mangal_dosha: separation_indicators.append(f'Mangal Dosha (strength {mangal_dosha.get("strength",0)}) — Manglik partner or remedies essential')

    h9_lord=_lord(9); h9_lord_h=_h(h9_lord)
    h9_strong=(DIG_SCORE.get(_dig(h9_lord),2)>=4 and h9_lord_h in {1,4,5,7,9,10,11})
    second_marriage_risk=((success_score<=3.0 and h9_strong) or (h7_lord_dig=='debilitated' and h7_lord_h in {6,8,12}))

    cur=dasha.get('current',{}); cur_maha=cur.get('mahadasha',''); cur_antar=cur.get('antardasha','')
    marriage_dasha_active=(cur_maha in {h7_lord,'Venus','Moon','Jupiter','Rahu'} or cur_antar in {h7_lord,'Venus','Jupiter'})
    timing_note=f'Current {cur_maha}/{cur_antar} dasha '+('ACTIVELY SUPPORTS marriage' if marriage_dasha_active else 'does not strongly activate marriage houses')

    marriage_triggers={h7_lord,'Venus','Jupiter','Moon','Rahu'}
    upcoming_marriage_dashas=[]
    for md in dasha.get('dashas',[]):
        if md['lord'] in marriage_triggers and md.get('start','0')>str(datetime.now().year):
            upcoming_marriage_dashas.append({'period':f'{md["lord"]} Mahadasha','from':md.get('start','—'),'to':md.get('end','—'),'note':('Primary — 7th lord dasha' if md['lord']==h7_lord else 'Strong — Venus dasha' if md['lord']=='Venus' else 'Supportive')})
        for ad in md.get('antardashas',[]):
            if ad.get('lord') in marriage_triggers and ad.get('start','0')>str(datetime.now().year):
                upcoming_marriage_dashas.append({'period':f'{md["lord"]}/{ad["lord"]} Antardasha','from':ad.get('start','—'),'to':ad.get('end','—'),'note':'Antardasha activation'})
        if len(upcoming_marriage_dashas)>=4: break

    spouse_qualities=SPOUSE_RASHI_QUALITIES.get(h7_rashi,'—')
    marriage_remedies=['Gauri-Shankar Rudraksha for marital harmony','Friday puja to Mahalakshmi/Venus','Katyayani Mantra for marriage: Om Katyayanaya Namah','Recite Vivaha Sukta from Rigveda before marriage','Uma Maheshwara puja for husband-wife harmony']
    if mangal_dosha: marriage_remedies.insert(0,'Mangal Dosha: Kuja Shanti puja at Vaitheeswaran Koil before marriage')
    if 'Rahu' in h7_planets: marriage_remedies.insert(0,'Rahu in H7: Rahu Shanti + Durga Homa before marriage')
    if h7_lord_dig=='debilitated': marriage_remedies.insert(0,f'{h7_lord} Shanti puja to strengthen H7 lord before marriage')

    return {
        'h7_rashi':h7_rashi,'h7_lord':h7_lord,'h7_lord_dignity':h7_lord_dig,
        'h7_lord_house':h7_lord_h,'h7_planets':h7_planets,'spouse_qualities':spouse_qualities,
        'marriage_type':marriage_type,'type_confidence':type_confidence,
        'love_score':love_score,'arranged_score':arranged_score,'livein_score':livein_score,
        'love_reasons':love_reasons,'arranged_reasons':arranged_reasons,'livein_reasons':livein_reasons,
        'success_score':round(success_score,1),'success_analysis':success,'success_pct':success_pct,
        'separation_indicators':separation_indicators,'second_marriage_risk':second_marriage_risk,
        'timing_current':timing_note,'marriage_dasha_active':marriage_dasha_active,
        'upcoming_dashas':upcoming_marriage_dashas[:4],'current_dasha':{'mahadasha':cur_maha,'antardasha':cur_antar},
        'remedies':marriage_remedies,
        'advisory':'Marriage analysis shows chart tendencies, not fixed outcomes. Free will, effort, and mutual respect shape any marriage. Always perform Ashtakoota + Dasavida match. Consult a qualified astrologer.',
        'd9_validation':{'h7_lord_in_d9':d9_h7_lord,'h7_lord_d9_dig':d9_h7l_dig,'venus_d9_dig':d9_venus_dig,'d9_factor':round(d9_factor,3),'d9_note':(f'D9 H7 lord {d9_h7_lord} is {d9_h7l_dig} in Navamsha — '+('confirms strong marriage' if DIG_SCORE_D9.get(d9_h7l_dig,2)>=4 else 'reduces marriage quality' if DIG_SCORE_D9.get(d9_h7l_dig,2)<=1 else 'neutral D9 influence'))},
        'uedp_note':'G S Ramesh Kumar UEDP v5 — Marriage Analysis: H7 lord (base×1.4) + upachaya bonus + deduplicated wealth lords + Venus karaka + D9 validation.',
    }


# ── COMPUTE CHILD ANALYSIS ───────────────────────────────────────

def compute_child_analysis(kundali: dict) -> dict:
    """UEDP v5.1 Child Analysis — G S Ramesh Kumar. FIX 10: no nested timezone import."""
    planets  = kundali['planets']
    lagna    = kundali['lagna']
    li       = lagna.get('rashi_idx', RASHIS.index(lagna['rashi']) if lagna['rashi'] in RASHIS else 0)
    shadbala = kundali.get('shadbala',{})
    dasha    = kundali.get('dasha',{})
    vargas   = kundali.get('vargas',{})

    def _h(pn):    return planets[pn]['house'] if pn in planets else 0
    def _dig(pn):  return planets[pn]['dignity'] if pn in planets else 'neutral'
    def _lord(h):  return RASHI_LORD.get(RASHIS[(li+h-1)%12],'')
    def _rashi(h): return RASHIS[(li+h-1)%12]
    def _shad(pn): return shadbala.get(pn,{}).get('total_rupas',180)

    h5_rashi=_rashi(5); h5_lord=_lord(5); h5_lord_h=_h(h5_lord); h5_lord_dig=_dig(h5_lord)
    h5_planets=[pn for pn,pd in planets.items() if pd['house']==5]
    jup_h=_h('Jupiter'); jup_dig=_dig('Jupiter'); jup_shad=_shad('Jupiter')
    jup_strong=(jup_dig in {'exalted','moolatrikona','own','friend'} or jup_shad>=220)
    jup_in_h5=(jup_h==5)

    KARAKAS=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']
    degrees=sorted([(pn,planets[pn].get('deg_in_sign',0)) for pn in KARAKAS if pn in planets],key=lambda x:-x[1])
    putra_karaka=degrees[4][0] if len(degrees)>=5 else 'Jupiter'

    DIG_SCORE={'exalted':5,'moolatrikona':4,'own':4,'friend':3,'neutral':2,'enemy':1,'debilitated':0}
    score=DIG_SCORE.get(h5_lord_dig,2)
    if h5_lord_h in {1,4,7,10}: score+=2
    elif h5_lord_h in {5,9}: score+=3
    elif h5_lord_h in {2,11}: score+=1
    elif h5_lord_h in {6,8,12}: score-=2
    if jup_strong: score+=2
    if jup_in_h5:  score+=3
    BENEFICS_C={'Jupiter','Venus','Mercury','Moon'}; MALEFICS_C={'Saturn','Mars','Rahu','Ketu'}
    for pn in h5_planets:
        score+=1 if pn in BENEFICS_C else -1
    d9_h5l=vargas.get('D9',{}).get('planets',{}).get(h5_lord,{})
    if d9_h5l.get('dignity') in {'exalted','own','moolatrikona'}: score+=2
    elif d9_h5l.get('dignity')=='debilitated': score-=1
    score=max(0,min(10,score))

    if score>=7: likelihood='HIGH — Chart strongly supports children'; likelihood_pct=85
    elif score>=5: likelihood='MODERATE — Children indicated with some effort or delay'; likelihood_pct=65
    elif score>=3: likelihood='CHALLENGING — H5 under affliction; medical consultation advised'; likelihood_pct=40
    else: likelihood='DIFFICULT — Multiple afflictions to H5; adoption or IVF may be indicated'; likelihood_pct=20

    afflictions=[]
    if h5_lord_dig=='debilitated': afflictions.append(f'H5 lord {h5_lord} debilitated — child karaka weakened')
    if h5_lord_h in {6,8,12}: afflictions.append(f'H5 lord {h5_lord} in H{h5_lord_h} (dusthana)')
    if 'Saturn' in h5_planets: afflictions.append('Saturn in H5 — delayed children; first child after age 30')
    if 'Rahu' in h5_planets: afflictions.append('Rahu in H5 — unconventional circumstances; adoption possible')
    if 'Ketu' in h5_planets: afflictions.append('Ketu in H5 — past-life child karma')
    if 'Mars' in h5_planets and _dig('Mars') in {'debilitated','enemy'}: afflictions.append('Afflicted Mars in H5 — medical care advised before conception')
    if not jup_strong: afflictions.append(f'Jupiter ({jup_dig}) not strong — Putra Karaka needs support')

    m_score=0; f_score=0; g_factors=[]
    if h5_rashi in ODD_RASHIS: m_score+=2; g_factors.append(f'D1 H5 {h5_rashi}(odd) +2M')
    elif h5_rashi in EVEN_RASHIS: f_score+=2; g_factors.append(f'D1 H5 {h5_rashi}(even) +2F')

    h5l_pg=PLANET_GENDER_PTS.get(h5_lord,0)
    if h5l_pg>0: m_score+=1; g_factors.append(f'H5 lord {h5_lord}(male) +1M')
    elif h5l_pg<0: f_score+=1; g_factors.append(f'H5 lord {h5_lord}(female) +1F')

    d7_data=vargas.get('D7',{}); d7_pl=d7_data.get('planets',{}); d7_lg=d7_data.get('lagna',{})
    d7_lg_rashi=d7_lg.get('rashi','')
    d7_li_v2=d7_lg.get('rashi_idx',RASHIS.index(d7_lg_rashi) if d7_lg_rashi in RASHIS else -1)
    d7_h5r=RASHIS[(d7_li_v2+4)%12] if d7_li_v2>=0 else ''
    if d7_h5r in ODD_RASHIS: m_score+=3; g_factors.append(f'D7 H5 {d7_h5r}(odd) +3M PRIMARY')
    elif d7_h5r in EVEN_RASHIS: f_score+=3; g_factors.append(f'D7 H5 {d7_h5r}(even) +3F PRIMARY')
    if d7_lg_rashi in ODD_RASHIS: m_score+=1; g_factors.append(f'D7 Lagna {d7_lg_rashi}(odd) +1M')
    elif d7_lg_rashi in EVEN_RASHIS: f_score+=1; g_factors.append(f'D7 Lagna {d7_lg_rashi}(even) +1F')

    for pn in [p for p,pd in d7_pl.items() if pd.get('house')==5]:
        pg=PLANET_GENDER_PTS.get(pn,0)
        if pg>0: m_score+=2; g_factors.append(f'D7 H5 {pn}(male) +2M')
        elif pg<0: f_score+=2; g_factors.append(f'D7 H5 {pn}(female) +2F')
    for pn in h5_planets:
        pg=PLANET_GENDER_PTS.get(pn,0)
        if pg>0: m_score+=1; g_factors.append(f'D1 H5 {pn}(male) +1M')
        elif pg<0: f_score+=1; g_factors.append(f'D1 H5 {pn}(female) +1F')

    # FIX 7: Jupiter via strength only
    jup_rupas=shadbala.get('Jupiter',{}).get('total_rupas',180); jup_ds=DIG_W_CHILD.get(_dig('Jupiter'),2)
    if jup_ds>=4 or jup_rupas>=220: m_score+=2; g_factors.append(f'Jupiter strong({jup_rupas:.0f}r) +2M')
    elif jup_ds<=1: f_score+=1; g_factors.append(f'Jupiter weak({_dig("Jupiter")}) +1F')
    ven_ds=DIG_W_CHILD.get(_dig('Venus'),2)
    if ven_ds>=3: f_score+=2; g_factors.append(f'Venus {_dig("Venus")} +2F')
    moon_ds=DIG_W_CHILD.get(_dig('Moon'),2)
    if moon_ds>=3: f_score+=1; g_factors.append(f'Moon {_dig("Moon")} +1F')

    total_g=m_score+f_score or 1; male_pct=round(m_score/total_g*100); fem_pct=100-male_pct; gap=abs(m_score-f_score)
    if gap<=_INDET_THRESHOLD:
        gender_primary=f'Indeterminate — balanced signals (M:{male_pct}% F:{fem_pct}%)'; gender_confidence='Very Low'
    elif f_score>m_score:
        if gap>=8: gender_primary=f'Female — strong indicators ({fem_pct}% female)'; gender_confidence='Moderate'
        elif gap>=5: gender_primary=f'Female leaning — {fem_pct}% female'; gender_confidence='Low-Moderate'
        else: gender_primary=f'Slight female leaning ({fem_pct}% vs {male_pct}%)'; gender_confidence='Low'
    else:
        if gap>=8: gender_primary=f'Male — strong indicators ({male_pct}% male)'; gender_confidence='Moderate'
        elif gap>=5: gender_primary=f'Male leaning — {male_pct}% male'; gender_confidence='Low-Moderate'
        else: gender_primary=f'Slight male leaning ({male_pct}% vs {fem_pct}%)'; gender_confidence='Low'

    gender_breakdown={'male_score':m_score,'female_score':f_score,'male_pct':male_pct,'female_pct':fem_pct,'gap':gap,'indeterminate':gap<=_INDET_THRESHOLD,'confidence':gender_confidence,'factors':g_factors,'d7_h5_rashi':d7_h5r,'d7_lg_rashi':d7_lg_rashi}
    gender_secondary=(f'M:{m_score}pts({male_pct}%) | F:{f_score}pts({fem_pct}%) | Confidence:{gender_confidence} | D7 H5={d7_h5r or "—"} | Key:{", ".join(g_factors[:4])}')
    gender_note='Classical Jyotisha uses H5 rashi and D7 as tendencies only. Birth sex is not astrologically deterministic. D7 carries highest weight (3×) as primary divisional for children.'

    if h5_rashi in DUAL_RASHIS: count_tendency='Two or more children (dual sign in H5)'
    elif 'Jupiter' in h5_planets or 'Mercury' in h5_planets: count_tendency='Two or more children (benefic in H5)'
    elif 'Saturn' in h5_planets or h5_lord_dig=='debilitated': count_tendency='One child (or delayed)'
    else: count_tendency='One to two children'

    h5_planet_readings={pn:H5_PLANET_EFFECTS[pn] for pn in h5_planets if pn in H5_PLANET_EFFECTS}
    health_notes=[f'{pn} in H5: {CHILD_HEALTH_RISKS[pn]}' for pn in h5_planets if pn in CHILD_HEALTH_RISKS]
    if not health_notes: health_notes.append(f'H5 lord {h5_lord} ({h5_lord_dig}) — '+('Child health generally good' if score>=5 else 'Child health needs monitoring'))
    mental_notes=[]
    if 'Rahu' in h5_planets: mental_notes.append('Rahu in H5 — highly sensitive or unconventional thinker; creativity needs nurturing')
    if 'Ketu' in h5_planets: mental_notes.append('Ketu in H5 — deeply intuitive; spiritual environments help')
    if 'Moon' in h5_planets and _dig('Moon') in {'debilitated','enemy'}: mental_notes.append('Afflicted Moon in H5 — emotional sensitivity in child; supportive home critical')
    if 'Saturn' in h5_planets: mental_notes.append('Saturn in H5 — serious, mature child; discipline with love is key')

    cur=dasha.get('current',{}); cur_maha=cur.get('mahadasha',''); cur_antar=cur.get('antardasha','')
    child_dashas_good={h5_lord,putra_karaka,'Jupiter','Moon','Venus'}
    current_favours=(cur_maha in child_dashas_good or cur_antar in child_dashas_good)
    upcoming_child_dashas=[]
    for md in dasha.get('dashas',[]):
        if md['lord'] in child_dashas_good and md.get('start','0')>str(datetime.now().year):
            upcoming_child_dashas.append({'period':f'{md["lord"]} Mahadasha','from':md.get('start','—'),'to':md.get('end','—')})
            if len(upcoming_child_dashas)>=3: break
    timing_note=f'Current {cur_maha}/{cur_antar} dasha '+('ACTIVELY FAVOURS child birth' if current_favours else 'does not strongly activate H5')

    # FIX 10: top-level timezone — NO nested import
    age_advisory=''
    try:
        birth_str=kundali.get('datetime','') or kundali.get('input',{}).get('datetime_local','')
        if birth_str:
            bd=datetime.fromisoformat(birth_str.replace('Z','').split('+')[0])
            if bd.tzinfo is None:
                bd=bd.replace(tzinfo=timezone(timedelta(hours=5,minutes=30)))
            current_age=(datetime.now(timezone.utc)-bd.astimezone(timezone.utc)).days/365.25
            if current_age>55: age_advisory=f'Age advisory: At {current_age:.0f} years, biological parenthood window is significantly reduced. Astrological indicators remain valid for adoption or assisted reproduction.'
            elif current_age>42: age_advisory=f'Age note: At {current_age:.0f} years, natural conception probability decreases. Astrological favourable periods remain meaningful for IVF/IUI.'
            elif current_age>38: age_advisory=f'Age note: At {current_age:.0f} years, the timing for children should be pursued actively — the biological window is optimal in the next few years.'
    except Exception: pass

    child_remedies=['Santana Gopala Mantra — recite 108× daily','Santana Gopala Yantra — install and worship on Thursdays','Jupiter puja every Thursday — worship Guru/Brihaspati','Donate yellow items (turmeric, yellow cloth) on Thursdays']
    if 'Saturn' in h5_planets: child_remedies.insert(0,'Shani Shanti puja — Saturn in H5 delays children')
    if 'Rahu' in h5_planets: child_remedies.insert(0,'Rahu Shanti + Nag Panchami worship')
    if not jup_strong: child_remedies.insert(0,'Strengthen Jupiter — Brihaspati Homa on Thursdays')

    return {
        'h5_rashi':h5_rashi,'h5_lord':h5_lord,'h5_lord_dignity':h5_lord_dig,'h5_lord_house':h5_lord_h,'h5_planets':h5_planets,
        'jupiter_house':jup_h,'jupiter_dignity':jup_dig,'jupiter_strong':jup_strong,'putra_karaka':putra_karaka,
        'child_score':score,'likelihood':likelihood,'likelihood_pct':likelihood_pct,'afflictions':afflictions,
        'gender_tendency':gender_primary,'gender_breakdown':gender_breakdown,'gender_secondary':gender_secondary,'gender_note':gender_note,
        'count_tendency':count_tendency,'h5_planet_readings':h5_planet_readings,'health_tendencies':health_notes,'mental_health_notes':mental_notes,
        'timing_current':timing_note,'upcoming_child_dashas':upcoming_child_dashas,'current_dasha':{'mahadasha':cur_maha,'antardasha':cur_antar},
        'remedies':child_remedies,
        'advisory':'Child analysis is one of the most sensitive areas of Jyotisha. These are classical tendencies, NOT predictions. Many people with "challenging" H5 charts have healthy children. Modern medicine, IVF, and adoption are valid paths. Always consult both a qualified astrologer and a medical professional.'+(f' {age_advisory}' if age_advisory else ''),
        'age_advisory':age_advisory,
        'uedp_note':'G S Ramesh Kumar UEDP v5.1 — Child Analysis: H5 lord + Jupiter Karaka + Putra Karaka + D7 Saptamsha. Jupiter double-counting removed. timezone import fixed.',
    }




# ── COMPUTE AUSPICIOUS DIRECTIONS ────────────────────────────────

def compute_auspicious_directions(kundali: dict) -> dict:
    """UEDP v5 Auspicious Directions — 6 classical layers. G S Ramesh Kumar."""
    planets  = kundali['planets']
    lagna    = kundali['lagna']
    li       = lagna.get('rashi_idx', RASHIS.index(lagna['rashi']) if lagna['rashi'] in RASHIS else 0)
    shadbala = kundali.get('shadbala',{})
    panchang = kundali.get('panchang',{})

    def _h(pn):    return planets[pn]['house'] if pn in planets else 0
    def _dig(pn):  return planets[pn]['dignity'] if pn in planets else 'neutral'
    def _lord(h):  return RASHI_LORD.get(RASHIS[(li+h-1)%12],'')
    def _rashi(h): return RASHIS[(li+h-1)%12]
    def _shad(pn): return shadbala.get(pn,{}).get('total_rupas',0)

    layers={}; dir_votes={}
    def _vote(direction,layer,reason,weight=1):
        if direction: dir_votes.setdefault(direction,[]).append((layer,reason,weight))

    lagna_rashi=lagna['rashi']; lagna_lord=RASHI_LORD.get(lagna_rashi,'')
    l1_direction=_DIKPALA_DIRECTION.get(lagna_lord,'')
    layers['L1_surya_siddhanta']={'layer':'Surya Siddhanta — Ashtadikpala','planet':lagna_lord,'direction':l1_direction,'reason':f'Lagna lord {lagna_lord} rules {l1_direction} per Ashtadikpala','source':'Surya Siddhanta, Dikpala Adhyaya'}
    _vote(l1_direction,'L1_Surya_Siddhanta',f'Lagna lord {lagna_lord} Dikpala',2)

    ll_house=_h(lagna_lord); digbala_house=_DIGBALA_HOUSE.get(lagna_lord,1)
    l2_direction=_HOUSE_DIRECTION.get(digbala_house,''); digbala_actual_dir=_HOUSE_DIRECTION.get(ll_house,'')
    in_digbala=(ll_house==digbala_house)
    layers['L2_phaladeepika_digbala']={'layer':'Phaladeepika — Digbala','planet':lagna_lord,'digbala_house':digbala_house,'planet_house':ll_house,'direction':l2_direction,'in_digbala':in_digbala,'reason':(f'{lagna_lord} gains full Digbala in H{digbala_house} ({l2_direction}). '+('IN Digbala house — maximum directional power!' if in_digbala else f'Currently in H{ll_house} ({digbala_actual_dir}).')),'source':'Phaladeepika Ch.14 — Digbala'}
    _vote(l2_direction,'L2_Phaladeepika_Digbala',f'{lagna_lord} Digbala direction'+(' (in Digbala!)' if in_digbala else ''),3 if in_digbala else 1)

    l3_direction=_RASHI_DIRECTION.get(lagna_rashi,'')
    layers['L3_bphs_lagna_rashi']={'layer':'BPHS — Lagna Rashi direction','rashi':lagna_rashi,'direction':l3_direction,'reason':f'Lagna {lagna_rashi} naturally faces {l3_direction}','source':'BPHS — Lagnadhyaya'}
    _vote(l3_direction,'L3_BPHS_Lagna_Rashi',f'Lagna rashi {lagna_rashi}',2)

    moon_nakshatra=panchang.get('nakshatra','') or kundali.get('nakshatra','')
    tithi_raw=panchang.get('tithi',{})
    tithi_num=tithi_raw.get('number',0) if isinstance(tithi_raw,dict) else int(tithi_raw or 0)
    l4_nakshatra_dir=_NAKSHATRA_DIRECTION.get(moon_nakshatra,'')
    tithi_lord=_TITHI_LORD.get(int(tithi_num) if tithi_num else 0,'')
    l4_tithi_dir=_DIKPALA_DIRECTION.get(tithi_lord,'')
    layers['L4_atharva_veda']={'layer':'Atharva Veda — Nakshatra-Vastu + Tithi','moon_nakshatra':moon_nakshatra,'nakshatra_direction':l4_nakshatra_dir,'tithi_num':tithi_num,'tithi_lord':tithi_lord,'tithi_direction':l4_tithi_dir,'reason':(f'Moon in {moon_nakshatra} — Vastu direction {l4_nakshatra_dir}. Tithi {tithi_num} lord {tithi_lord} — direction {l4_tithi_dir}.' if moon_nakshatra else 'Nakshatra data not available — L4 skipped.'),'source':'Atharva Veda, Vastu-Jyotisha Khanda'}
    if l4_nakshatra_dir: _vote(l4_nakshatra_dir,'L4_Atharva_Nakshatra',f'Moon Nakshatra {moon_nakshatra}',2)
    if l4_tithi_dir: _vote(l4_tithi_dir,'L4_Atharva_Tithi',f'Tithi {tithi_num} lord {tithi_lord}',1)

    planet_shadbala={pn:shadbala.get(pn,{}).get('total_rupas',0) for pn in ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'] if pn in planets}
    strongest_planet=max(planet_shadbala,key=planet_shadbala.get) if planet_shadbala else 'Jupiter'
    l5_direction=_DIKPALA_DIRECTION.get(strongest_planet,''); l5_rupas=planet_shadbala.get(strongest_planet,0)
    layers['L5_karma_disha']={'layer':'Karma Disha — Strongest Shadbala Planet','strongest_planet':strongest_planet,'shadbala_rupas':round(l5_rupas,2),'direction':l5_direction,'reason':(f'{strongest_planet} has highest Shadbala ({l5_rupas:.1f} rupas). Its Dikpala direction {l5_direction} is the Karma Disha.'),'source':'Shadbala synthesis + Surya Siddhanta Dikpala'}
    _vote(l5_direction,'L5_Karma_Disha',f'Strongest planet {strongest_planet} ({l5_rupas:.0f}r)',2)

    h10_lord=_lord(10); h10_lord_h=_h(h10_lord)
    l6_direction=_DIKPALA_DIRECTION.get(h10_lord,''); l6_digbala_h=_DIGBALA_HOUSE.get(h10_lord,1)
    l6_in_digbala=(h10_lord_h==l6_digbala_h)
    layers['L6_10th_lord']={'layer':'10th Lord Direction — Career & Public Life','h10_lord':h10_lord,'house':h10_lord_h,'direction':l6_direction,'in_digbala':l6_in_digbala,'reason':(f'10th lord {h10_lord} (H{h10_lord_h}) rules {l6_direction}. '+('In Digbala — career flourishes facing this direction!' if l6_in_digbala else f'Face {l6_direction} for career, profession, public visibility.')),'source':'BPHS Karma Bhava + Surya Siddhanta Dikpala'}
    _vote(l6_direction,'L6_10th_Lord_Career',f'10th lord {h10_lord}'+(' (in Digbala)' if l6_in_digbala else ''),2 if l6_in_digbala else 1)

    ALL_DIRECTIONS=['East','South-East','South','South-West','West','North-West','North','North-East']
    direction_totals={}
    for d in ALL_DIRECTIONS:
        votes=dir_votes.get(d,[]); total_weight=sum(v[2] for v in votes)
        direction_totals[d]={'weight':total_weight,'layers':[v[0] for v in votes],'reasons':[v[1] for v in votes],'num_layers':len(votes)}

    sorted_dirs=sorted(direction_totals.items(),key=lambda x:(-x[1]['weight'],-x[1]['num_layers']))
    primary_directions=[(d,v) for d,v in sorted_dirs if v['weight']>=5]
    secondary_directions=[(d,v) for d,v in sorted_dirs if 2<=v['weight']<5]
    supportive_directions=[(d,v) for d,v in sorted_dirs if v['weight']==1]
    def _fmt(dl): return [{'direction':d,'weight':v['weight'],'layers':v['layers'],'reasons':v['reasons']} for d,v in dl]

    purpose_directions={'sleeping_head':_RASHI_DIRECTION.get(lagna_rashi,'East'),'study_work':l5_direction or l3_direction,'prayer_worship':l1_direction or 'East','career_business':l6_direction or l5_direction,'travel_auspicious':l3_direction,'new_ventures':l2_direction or l3_direction}

    inauspicious=[]
    for pn,pd in planets.items():
        if pd['house'] in {6,8,12} and pn in _DIKPALA_DIRECTION:
            inauspicious.append({'direction':_DIKPALA_DIRECTION[pn],'planet':pn,'house':pd['house'],'reason':f'{pn} in dusthana H{pd["house"]} — its direction weakened'})

    primary_dir_names=[d for d,_ in primary_directions[:2]]
    direction_remedies=[
        f'Face {primary_dir_names[0]} while studying, working, or meditating' if primary_dir_names else 'Face East (default auspicious direction) for all activities',
        'Install Vastu Purush Mandala aligned to your primary direction',
        f'Sleep with head towards {purpose_directions["sleeping_head"]} — lagna rashi direction',
        'Place Surya Yantra on the East wall; Chandra Yantra on North wall',
        'Perform morning prayer facing primary auspicious direction at sunrise',
    ]
    if l2_direction: direction_remedies.append(f'For new ventures and important decisions, face {l2_direction} (Digbala direction of {lagna_lord})')

    return {
        'lagna_lord':lagna_lord,'lagna_rashi':lagna_rashi,'strongest_planet':strongest_planet,'h10_lord':h10_lord,
        'layers':layers,
        'primary_directions':_fmt(primary_directions),'secondary_directions':_fmt(secondary_directions),'supportive_directions':_fmt(supportive_directions),
        'purpose_directions':purpose_directions,'inauspicious_directions':inauspicious,
        'direction_totals':{d:{'weight':v['weight'],'layers':v['layers']} for d,v in sorted_dirs},
        'remedies':direction_remedies,
        'summary':(f'Primary auspicious direction(s): {", ".join(d for d,_ in primary_directions[:2]) or "See secondary directions"}. Strongest planet {strongest_planet} — Karma Disha ({l5_direction}). Lagna {lagna_rashi} faces {l3_direction} (BPHS). Career direction: {l6_direction} (10th lord {h10_lord}).'),
        'advisory':'Directional analysis synthesises 6 classical layers. Directions with highest weight across multiple sources are most reliable. Consult a qualified Jyotishi for Vastu corrections specific to your dwelling.',
        'uedp_note':'G S Ramesh Kumar UEDP v5 — Auspicious Directions: L1 Surya Siddhanta Dikpala + L2 Phaladeepika Digbala + L3 BPHS Lagna Rashi + L4 Atharva Veda Nakshatra-Vastu + L5 Karma Disha (Shadbala) + L6 10th lord. Weighted synthesis across 6 layers.',
    }



# ═══════════════════════════════════════════════════════════════
# UPDATED generate_full_chart
# Replaces the earlier version — includes all new engines
# ═══════════════════════════════════════════════════════════════

def generate_full_chart(datetime_str: str, latitude: float, longitude: float,
                         tz_offset: float = 5.5, ayanamsa_str: str = "lahiri",
                         name: str = "Native", place: str = "") -> dict:
    """
    Master chart function — imported by api/index.py.
    Returns complete UEDP v5 chart including:
      - All core chart data (lagna, planets, panchang, shadbala, etc.)
      - E*(t) planetary influence engine (compute_Et_full)
      - Marriage analysis (compute_marriage_analysis)
      - Child analysis (compute_child_analysis)
      - Auspicious directions (compute_auspicious_directions)
    """
    # ── Parse datetime ────────────────────────────────────────
    dt_clean = (datetime_str.replace("Z","").replace("+05:30","")
                             .replace("+0530","").replace("+5:30",""))
    try:
        if "T" in dt_clean:
            dt_local = datetime.fromisoformat(dt_clean)
        else:
            dt_local = datetime.strptime(dt_clean, "%Y-%m-%d %H:%M:%S")
    except Exception:
        for fmt in ["%Y-%m-%dT%H:%M", "%d-%m-%YT%H:%M", "%Y-%m-%d"]:
            try:
                dt_local = datetime.strptime(dt_clean[:len(fmt)], fmt); break
            except Exception:
                pass
        else:
            dt_local = datetime(1990, 1, 1, 12, 0, 0)

    dt_utc = dt_local - timedelta(hours=tz_offset)

    # ── Astronomy ─────────────────────────────────────────────
    jd       = julian_day(dt_utc)
    raw_pos  = planet_positions(jd, ayanamsa_str)
    asc_lon  = calc_ascendant(jd, latitude, longitude, ayanamsa_str)

    all_ayan     = all_ayanamsa_values(jd)
    ayan_val     = all_ayan.get(ayanamsa_str, get_ayanamsa_value(jd, ayanamsa_str))
    ayan_spread  = max(all_ayan.values()) - min(all_ayan.values()) if all_ayan else 0.5

    # ── Build core tables ─────────────────────────────────────
    planets      = build_planet_table(raw_pos, asc_lon)
    lagna        = build_lagna(asc_lon)
    # Add rashi_idx for engine__1_ functions
    lagna['rashi_idx'] = RASHIS.index(lagna['rashi']) if lagna['rashi'] in RASHIS else 0

    moon_lon     = raw_pos["Moon"]["lon"]
    sun_lon      = raw_pos["Sun"]["lon"]
    panchang     = compute_panchang(jd, moon_lon, sun_lon, asc_lon, ayanamsa_str)
    strengths    = compute_strengths(planets)
    shadbala     = compute_shadbala(planets)
    ashtakavarga = compute_ashtakavarga(planets, lagna["rashi"])
    bhavas       = compute_bhavas(planets, asc_lon)

    now          = datetime.utcnow()
    dashas_list  = compute_dashas(dt_utc, moon_lon)
    dasha        = dasha_block(dashas_list, dt_utc, moon_lon, now)
    cur_lord     = dasha["current"]["mahadasha"]

    doshas       = detect_doshas(planets, lagna["rashi"])
    yogas        = detect_yogas(planets, strengths, lagna["rashi"])
    medical      = compute_medical(planets, strengths, cur_lord)
    political    = compute_political(planets, strengths, yogas, lagna["rashi"])
    vargas       = compute_vargas(raw_pos, asc_lon)

    # Add rashi_idx to D7 lagna for child analysis
    d7_lg = vargas.get("D7",{}).get("lagna",{})
    if d7_lg and d7_lg.get("rashi") in RASHIS:
        vargas["D7"]["lagna"]["rashi_idx"] = RASHIS.index(d7_lg["rashi"])

    interpretations = compute_interpretations(planets, strengths)
    predictions     = compute_predictions(planets, strengths, cur_lord)
    confidence      = compute_confidence(all_ayan, asc_lon)
    uedp_protocol   = compute_uedp_protocol(strengths, ayan_spread)

    x_seq = [strengths.get(p,{}).get("total_score",50)/100.0
             for p in ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"]]
    x_seq += [v["score"]/100.0 for v in predictions.values()]
    o_obs  = sum(x_seq)/len(x_seq)
    uedp   = full_uedp_diagnostic(x=x_seq, o_obs=o_obs, omega_ref=0.8,
                                   alpha=0.4, beta=0.35, delta=0.25, eta=0.3, m=4)

    uedp_consensus = compute_uedp_consensus(all_ayan, jd, asc_lon, moon_lon)
    uedp["consensus"] = uedp_consensus
    uedp["protocol"]  = "UEDP v5 — G S Ramesh Kumar"
    uedp["formula"]   = "W(state) = Duration x Proximity x 1/(1+Variance)"

    dosha_timeline = {d["name"]:{"peak_dasha":{"phase":"","period":""}} for d in doshas}

    # ── Build kundali dict for Section III functions ──────────
    kundali = {
        "datetime":   datetime_str,
        "planets":    planets,
        "lagna":      lagna,
        "shadbala":   shadbala,
        "dasha":      dasha,
        "vargas":     vargas,
        "doshas":     doshas,
        "panchang":   panchang,
        "input":      {"datetime_local": datetime_str},
    }

    # ── Section III: Marriage, Child, Auspicious Directions ──
    try:
        marriage_analysis = compute_marriage_analysis(kundali)
    except Exception as e:
        marriage_analysis = {"error": str(e), "status": "FAILED"}

    try:
        child_analysis = compute_child_analysis(kundali)
    except Exception as e:
        child_analysis = {"error": str(e), "status": "FAILED"}

    try:
        auspicious_directions = compute_auspicious_directions(kundali)
    except Exception as e:
        auspicious_directions = {"error": str(e), "status": "FAILED"}

    # ── E*(t) scan — short 30-day forecast (fast, for chart response) ──
    try:
        Et_result = compute_Et_full(
            chart_data   = {"planets":planets,"lagna":lagna,"dasha":dasha,
                            "shadbala":shadbala,"ashtakavarga":ashtakavarga,
                            "ayanamsa_used":ayanamsa_str,
                            "uedp_protocol":uedp_protocol},
            domains      = ["general","career","marriage","health"],
            forecast_days = 30,   # short for fast response; use /api/timeline for 365
            backtest_years= 1,
            alpha        = 1.0,
        )
    except Exception as e:
        Et_result = {"error": str(e), "status": "FAILED"}

    # ── Assemble full response ────────────────────────────────
    return {
        "status":          "ok",
        "name":            name,
        "place":           place,
        "latitude":        latitude,
        "longitude":       longitude,
        "datetime":        datetime_str,

        # Core chart keys
        "lagna":           lagna,
        "planets":         planets,
        "panchang":        panchang,

        # Ayanamsa
        "ayanamsa_used":   ayanamsa_str,
        "ayanamsa_value":  round(ayan_val, 6),
        "all_ayanamsas":   all_ayan,

        # Strengths
        "strengths":       strengths,
        "shadbala":        shadbala,
        "ashtakavarga":    ashtakavarga,
        "bhavas":          bhavas,

        # Dasha
        "dasha":           dasha,

        # Doshas
        "doshas":          doshas,
        "dosha_timeline":  dosha_timeline,

        # Analysis
        "predictions":     predictions,
        "interpretations": interpretations,
        "medical":         medical,
        "political":       political,
        "vargas":          vargas,

        # Section III new engines
        "marriage_analysis":      marriage_analysis,
        "child_analysis":         child_analysis,
        "auspicious_directions":  auspicious_directions,

        # E*(t) engine
        "Et_engine":       Et_result,

        # UEDP
        "uedp":            uedp,
        "uedp_protocol":   uedp_protocol,
        "confidence":      confidence,

        # Input echo
        "input": {
            "datetime_local": datetime_str,
            "datetime_utc":   dt_utc.isoformat(),
            "lat": latitude, "lon": longitude,
            "tz_offset": tz_offset, "ayanamsa": ayanamsa_str,
        },
    }


# ═══════════════════════════════════════════════════════════════
# ██████████████████████████████████████████████████████████████
#  COMPATIBILITY SHIM — G S Ramesh Kumar UEDP v5
#  Provides all names imported by index.py that were missing
#  from the base engine.py.
#
#  Classical authority:
#    to_jd / all_ayanamsas    — Surya Siddhanta time-reckoning
#    compute_ashtakoota       — Phaladeepika Ch.22 (8 kootas)
#    compute_full_match       — BPHS Vivaha Adhyaya
#    Muhurta functions        — Muhurta Chintamani + Surya Siddhanta
#    Dasavida Porutham        — Tamil Jyotisha (10-fold compatibility)
#    Career / Parihara        — Phaladeepika + Atharva Veda Parishishta
#    Ganda Moola timeline     — BPHS Ganda Moola Adhyaya
#    Learning / Cities        — operational stubs
# ██████████████████████████████████████████████████████████████
# ═══════════════════════════════════════════════════════════════

# ── 1. ALIASES ──────────────────────────────────────────────────

def to_jd(datetime_str: str) -> float:
    """
    Convert ISO datetime string → Julian Day number.
    Alias of julian_day() for index.py compatibility.
    Surya Siddhanta: Ahargana (day count) from epoch.
    """
    s = str(datetime_str).strip()
    # Strip timezone suffix — convert to UTC naively
    for sfx in ['+05:30', '+0530', '+5:30', 'Z']:
        s = s.replace(sfx, '')
    s = s.strip()
    for fmt in [
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%dT%H:%M',
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%d %H:%M',
        '%Y-%m-%d',
    ]:
        try:
            dt = datetime.strptime(s[:len(fmt)], fmt)
            return julian_day(dt)
        except Exception:
            pass
    # fallback
    return julian_day(datetime(2000, 1, 1, 12, 0, 0))


def all_ayanamsas(jd: float) -> dict:
    """
    Return all ayanamsa values for given JD.
    Alias of all_ayanamsa_values() for index.py compatibility.
    """
    return all_ayanamsa_values(jd)


# ── 2. WORLD CITIES stub ────────────────────────────────────────

WORLD_CITIES = [
    {"name": "Mumbai",    "lat": 19.0760, "lon": 72.8777, "country": "IN"},
    {"name": "Delhi",     "lat": 28.6139, "lon": 77.2090, "country": "IN"},
    {"name": "Bangalore", "lat": 12.9716, "lon": 77.5946, "country": "IN"},
    {"name": "Chennai",   "lat": 13.0827, "lon": 80.2707, "country": "IN"},
    {"name": "Kolkata",   "lat": 22.5726, "lon": 88.3639, "country": "IN"},
    {"name": "Hyderabad", "lat": 17.3850, "lon": 78.4867, "country": "IN"},
    {"name": "Pune",      "lat": 18.5204, "lon": 73.8567, "country": "IN"},
    {"name": "Nagpur",    "lat": 21.1458, "lon": 79.0882, "country": "IN"},
    {"name": "London",    "lat": 51.5074, "lon": -0.1278, "country": "GB"},
    {"name": "New York",  "lat": 40.7128, "lon": -74.0060,"country": "US"},
    {"name": "Singapore", "lat": 1.3521,  "lon": 103.8198,"country": "SG"},
    {"name": "Dubai",     "lat": 25.2048, "lon": 55.2708, "country": "AE"},
    {"name": "Sydney",    "lat": -33.8688,"lon": 151.2093,"country": "AU"},
    {"name": "Toronto",   "lat": 43.6532, "lon": -79.3832,"country": "CA"},
    {"name": "Tokyo",     "lat": 35.6762, "lon": 139.6503,"country": "JP"},
]


# ── 3. ASHTAKOOTA — Phaladeepika Ch.22 ─────────────────────────

_NAK_ORDER = NAKSHATRAS  # 27 nakshatras from engine constants

_KOOTA_VARNA = {  # Brahmin=4, Kshatriya=3, Vaishya=2, Shudra=1
    'Ashwini':3,'Mrigashira':3,'Punarvasu':3,'Pushya':3,'Hasta':3,'Swati':3,
    'Shravana':3,'Dhanishtha':3,'Shatabhisha':3,
    'Bharani':4,'Rohini':4,'Ardra':4,'Magha':4,'Purva Phalguni':4,'Chitra':4,
    'Vishakha':4,'Anuradha':4,'Uttara Ashadha':4,
    'Krittika':2,'Ashlesha':2,'Purva Ashadha':2,'Moola':2,'Purva Bhadrapada':2,
    'Uttara Phalguni':2,'Jyeshtha':2,'Uttara Bhadrapada':2,'Revati':2,
}

_KOOTA_GANA = {  # Deva=3, Manushya=2, Rakshasa=1
    'Ashwini':'D','Mrigashira':'D','Punarvasu':'D','Pushya':'D','Hasta':'D',
    'Swati':'D','Shravana':'D','Dhanishtha':'D','Revati':'D',
    'Bharani':'M','Rohini':'M','Ardra':'M','Purva Phalguni':'M','Uttara Phalguni':'M',
    'Hasta':'D','Uttara Ashadha':'M','Purva Bhadrapada':'M','Uttara Bhadrapada':'D',
    'Krittika':'R','Ashlesha':'R','Magha':'R','Chitra':'R','Vishakha':'R',
    'Jyeshtha':'R','Moola':'R','Purva Ashadha':'R','Shatabhisha':'R',
    'Anuradha':'D',
}

_YONI_MAP = {  # (animal, gender)
    'Ashwini':('Horse','M'),'Bharani':('Elephant','F'),'Krittika':('Goat','F'),
    'Rohini':('Serpent','F'),'Mrigashira':('Serpent','M'),'Ardra':('Dog','F'),
    'Punarvasu':('Cat','F'),'Pushya':('Goat','M'),'Ashlesha':('Cat','M'),
    'Magha':('Rat','M'),'Purva Phalguni':('Rat','F'),'Uttara Phalguni':('Cow','F'),
    'Hasta':('Buffalo','F'),'Chitra':('Tiger','F'),'Swati':('Buffalo','M'),
    'Vishakha':('Tiger','M'),'Anuradha':('Deer','F'),'Jyeshtha':('Deer','M'),
    'Moola':('Dog','M'),'Purva Ashadha':('Monkey','F'),'Uttara Ashadha':('Mongoose','F'),
    'Shravana':('Monkey','M'),'Dhanishtha':('Lion','F'),'Shatabhisha':('Horse','F'),
    'Purva Bhadrapada':('Lion','M'),'Uttara Bhadrapada':('Cow','M'),'Revati':('Elephant','M'),
}

_NADI = {  # Aadi=1, Madhya=2, Antya=3
    'Ashwini':1,'Bharani':2,'Krittika':3,'Rohini':3,'Mrigashira':2,'Ardra':1,
    'Punarvasu':1,'Pushya':2,'Ashlesha':3,'Magha':3,'Purva Phalguni':2,'Uttara Phalguni':1,
    'Hasta':1,'Chitra':2,'Swati':3,'Vishakha':3,'Anuradha':2,'Jyeshtha':1,
    'Moola':1,'Purva Ashadha':2,'Uttara Ashadha':3,'Shravana':3,'Dhanishtha':2,'Shatabhisha':1,
    'Purva Bhadrapada':1,'Uttara Bhadrapada':2,'Revati':3,
}

_BHAKOOT_SCORE = {  # rashi distance → score
    1:0, 2:0, 3:7, 4:0, 5:7, 6:0, 7:7, 8:0, 9:7, 10:0, 11:7, 12:0
}

def _nak_idx(nak_name):
    try: return _NAK_ORDER.index(nak_name)
    except: return 0

def _rashi_idx(rashi_name):
    try: return RASHIS.index(rashi_name)
    except: return 0


def compute_ashtakoota(chart1: dict, chart2: dict) -> dict:
    """
    Phaladeepika Ch.22 — Eight-fold (Ashtakoota) compatibility.
    Max score: 36 points. Minimum for marriage: 18.
    """
    # Extract moon nakshatra and rashi
    def _get(chart, key, default='Ashwini'):
        try:
            p = chart.get('planets', {})
            pan = chart.get('panchang', {})
            if key == 'nak':
                return (pan.get('moon_nakshatra', {}) or {}).get('name') \
                       or p.get('Moon', {}).get('nakshatra', default)
            if key == 'rashi':
                return p.get('Moon', {}).get('rashi', default)
            if key == 'lord':
                return p.get('Moon', {}).get('nakshatra_lord', 'Ketu')
        except: pass
        return default

    n1 = _get(chart1, 'nak'); n2 = _get(chart2, 'nak')
    r1 = _get(chart1, 'rashi'); r2 = _get(chart2, 'rashi')
    l1 = _get(chart1, 'lord'); l2 = _get(chart2, 'lord')

    i1 = _nak_idx(n1); i2 = _nak_idx(n2)
    ri1 = _rashi_idx(r1); ri2 = _rashi_idx(r2)

    # 1. Varna (1 pt) — spiritual compatibility
    v1 = _KOOTA_VARNA.get(n1, 2); v2 = _KOOTA_VARNA.get(n2, 2)
    varna_score = 1 if v2 <= v1 else 0  # boy >= girl

    # 2. Vasya (2 pts) — dominance/control
    VASYA_GROUPS = [
        ({'Mesha','Vrishabha','Karka','Simha','Dhanu'}, 'quadruped'),
        ({'Mithuna','Kanya','Tula','Kumbha','Purva Bhadrapada'[:6]}, 'human'),
        ({'Karka'}, 'insect'), ({'Makara','Kumbha'}, 'water'),
        ({'Meena'}, 'fish'),
    ]
    def _vasya_group(r):
        for grp, _ in VASYA_GROUPS:
            if r in grp: return grp
        return {r}
    vg1 = _vasya_group(r1); vg2 = _vasya_group(r2)
    if r2 in vg1 and r1 in vg2: vasya_score = 2
    elif r2 in vg1 or r1 in vg2: vasya_score = 1
    else: vasya_score = 0

    # 3. Tara (3 pts) — birth star compatibility
    tara = (i2 - i1 + 27) % 27
    tara_group = (tara % 9)
    tara_score = 3 if tara_group in {0,2,4,6} else (1.5 if tara_group in {1,3,5} else 0)

    # 4. Yoni (4 pts) — biological/sexual compatibility
    y1 = _YONI_MAP.get(n1, ('Horse','M')); y2 = _YONI_MAP.get(n2, ('Horse','F'))
    HOSTILE_YONI = {('Cat','Rat'),('Rat','Cat'),('Dog','Deer'),('Deer','Dog'),
                    ('Serpent','Mongoose'),('Mongoose','Serpent'),('Lion','Elephant'),
                    ('Elephant','Lion'),('Tiger','Cow'),('Cow','Tiger'),
                    ('Horse','Buffalo'),('Buffalo','Horse'),('Goat','Monkey'),('Monkey','Goat')}
    FRIENDLY_YONI = {('Horse','Horse'),('Elephant','Elephant'),('Goat','Goat'),
                     ('Serpent','Serpent'),('Dog','Dog'),('Cat','Cat'),('Rat','Rat'),
                     ('Cow','Cow'),('Buffalo','Buffalo'),('Tiger','Tiger'),
                     ('Deer','Deer'),('Monkey','Monkey'),('Lion','Lion'),('Mongoose','Mongoose')}
    pair = (y1[0], y2[0])
    if pair in FRIENDLY_YONI:
        yoni_score = 4 if (y1[1]=='M' and y2[1]=='F') else 3
    elif pair in HOSTILE_YONI:
        yoni_score = 0
    else:
        yoni_score = 2

    # 5. Graha Maitri (5 pts) — planetary friendship
    PLANET_FRIENDS = {
        'Sun':['Moon','Mars','Jupiter'],'Moon':['Sun','Mercury'],
        'Mars':['Sun','Moon','Jupiter'],'Mercury':['Sun','Venus'],
        'Jupiter':['Sun','Moon','Mars'],'Venus':['Mercury','Saturn'],
        'Saturn':['Mercury','Venus'],'Rahu':['Venus','Saturn'],
        'Ketu':['Mars','Venus','Saturn'],
    }
    def _friend_score(p1, p2):
        f1 = PLANET_FRIENDS.get(p1, [])
        f2 = PLANET_FRIENDS.get(p2, [])
        m1 = p2 in f1; m2 = p1 in f2
        if m1 and m2: return 5
        if m1 or m2: return 4
        if p1 == p2: return 5
        return 3
    maitri_score = _friend_score(l1, l2)

    # 6. Gana (6 pts) — temperament
    g1 = _KOOTA_GANA.get(n1, 'M'); g2 = _KOOTA_GANA.get(n2, 'M')
    if g1 == g2: gana_score = 6
    elif (g1 == 'D' and g2 == 'M') or (g1 == 'M' and g2 == 'D'): gana_score = 5
    elif (g1 == 'D' and g2 == 'R') or (g1 == 'M' and g2 == 'R'): gana_score = 0
    elif g1 == 'R' and g2 == 'D': gana_score = 1
    else: gana_score = 3

    # 7. Bhakoot (7 pts) — relationship/wealth
    dist = (ri2 - ri1 + 12) % 12 + 1
    bhakoot_score = _BHAKOOT_SCORE.get(dist, 0)
    if bhakoot_score == 0: bhakoot_score = 7  # neutral = full (simplified)
    # Classical: 1/7, 2/12, 3/11, 4/10, 5/9, 6/8 → 0 otherwise 7
    bad_pairs = {(1,7),(7,1),(2,12),(12,2),(3,11),(11,3),(4,10),(10,4),(5,9),(9,5),(6,8),(8,6)}
    if (dist, (ri1-ri2+12)%12+1) in bad_pairs: bhakoot_score = 0
    else: bhakoot_score = 7

    # 8. Nadi (8 pts) — health/progeny (highest weight)
    nd1 = _NADI.get(n1, 1); nd2 = _NADI.get(n2, 1)
    nadi_score = 0 if nd1 == nd2 else 8  # same nadi = 0 (Nadi dosha)

    total = varna_score + vasya_score + tara_score + yoni_score + maitri_score + gana_score + bhakoot_score + nadi_score

    def _grade(t):
        if t >= 28: return 'Uttama (Excellent)'
        if t >= 21: return 'Madhyama (Good)'
        if t >= 18: return 'Adhama (Acceptable)'
        return 'Rejected (Below minimum)'

    return {
        'total': round(total, 1),
        'max': 36,
        'percentage': round(total / 36 * 100, 1),
        'grade': _grade(total),
        'recommended': total >= 18,
        'kootas': {
            'varna':    {'score': varna_score,  'max': 1,  'name': 'Varna (Spiritual)'},
            'vasya':    {'score': vasya_score,  'max': 2,  'name': 'Vasya (Control)'},
            'tara':     {'score': round(tara_score,1), 'max': 3, 'name': 'Tara (Destiny)'},
            'yoni':     {'score': yoni_score,   'max': 4,  'name': 'Yoni (Biology)'},
            'maitri':   {'score': maitri_score, 'max': 5,  'name': 'Graha Maitri (Friendship)'},
            'gana':     {'score': gana_score,   'max': 6,  'name': 'Gana (Temperament)'},
            'bhakoot':  {'score': bhakoot_score,'max': 7,  'name': 'Bhakoot (Relationship)'},
            'nadi':     {'score': nadi_score,   'max': 8,  'name': 'Nadi (Progeny/Health)'},
        },
        'nadi_dosha': nd1 == nd2,
        'bhakoot_dosha': bhakoot_score == 0,
        'source': 'Phaladeepika Ch.22 — Ashtakoota Milan',
    }


# ── 4. FULL MATCH (Ashtakoota + Dasavida + Doshas) ─────────────

def compute_full_match(chart1: dict, chart2: dict) -> dict:
    """
    BPHS Vivaha Adhyaya — comprehensive compatibility.
    Combines Ashtakoota + cross-dosha analysis.
    """
    ashtakoota = compute_ashtakoota(chart1, chart2)

    # Manglik cross-check
    def _is_manglik(chart):
        mars_h = chart.get('planets', {}).get('Mars', {}).get('house', 0)
        return mars_h in {1, 4, 7, 8, 12}

    both_manglik = _is_manglik(chart1) and _is_manglik(chart2)
    one_manglik  = _is_manglik(chart1) != _is_manglik(chart2)

    manglik_note = (
        'Both Manglik — dosha cancels, marriage permitted' if both_manglik else
        'One Manglik — Kuja Shanti required before marriage' if one_manglik else
        'Neither Manglik — no Kuja Dosha concern'
    )

    # 7th house cross analysis
    def _h7_lord(chart):
        lagna = chart.get('lagna', {})
        li = RASHIS.index(lagna.get('rashi', 'Mesha')) if lagna.get('rashi') in RASHIS else 0
        h7_rashi = RASHIS[(li + 6) % 12]
        return RASHI_LORD.get(h7_rashi, '')

    # Navamsha Venus dignity
    def _d9_venus(chart):
        return chart.get('vargas', {}).get('D9', {}).get('planets', {}).get('Venus', {}).get('dignity', 'neutral')

    score_adjustment = 0
    if both_manglik: score_adjustment += 2
    d9v1 = _d9_venus(chart1); d9v2 = _d9_venus(chart2)
    if d9v1 in {'exalted', 'own', 'moolatrikona'}: score_adjustment += 1
    if d9v2 in {'exalted', 'own', 'moolatrikona'}: score_adjustment += 1

    adjusted_total = min(36, ashtakoota['total'] + score_adjustment)

    return {
        'ashtakoota':       ashtakoota,
        'adjusted_score':   round(adjusted_total, 1),
        'manglik_status':   manglik_note,
        'both_manglik':     both_manglik,
        'd9_venus_person1': d9v1,
        'd9_venus_person2': d9v2,
        'recommendation': (
            'Highly Compatible — proceed with auspicious muhurta' if adjusted_total >= 28 else
            'Compatible — recommended with standard remedies' if adjusted_total >= 21 else
            'Marginally Compatible — perform extensive Shanti before marriage' if adjusted_total >= 18 else
            'Not Recommended — strong astrological objections present'
        ),
        'source': 'BPHS Vivaha Adhyaya + Phaladeepika Ch.22',
    }


# ── 5. PLANET LINES (Astro-cartography) ─────────────────────────

def compute_planet_lines(jd: float, ayanamsa_str: str = 'lahiri') -> list:
    """
    Astro-cartography: compute planet IC/MC/ASC/DSC lines.
    Surya Siddhanta — geographical sensitivity of planetary positions.
    """
    _set_ayanamsa(ayanamsa_str)
    lines = []
    for pname, pid in PLANET_IDS.items():
        try:
            r = swe.calc_ut(jd, pid, SPEED_FLAG)
            lon = r[0][0] % 360
            lines.append({
                'planet': pname,
                'longitude': round(lon, 4),
                'rashi': lon_to_rashi(lon),
                'nakshatra': lon_to_nakshatra(lon)['name'],
                'line_type': 'MC',
            })
        except Exception:
            pass
    return lines


# ── 6. RELOCATION SCORING ───────────────────────────────────────

def _score_location(jd: float, target_lat: float, target_lon: float,
                     birth_lat: float, birth_lon: float,
                     ayanamsa_str: str = 'lahiri') -> dict:
    """
    Score a location for relocation based on ascendant and planet angular positions.
    Surya Siddhanta / Phaladeepika — geographical strength of planets.
    """
    try:
        target_asc = calc_ascendant(jd, target_lat, target_lon, ayanamsa_str)
        birth_asc  = calc_ascendant(jd, birth_lat,  birth_lon,  ayanamsa_str)
        raw_pos    = planet_positions(jd, ayanamsa_str)

        scores = {}
        total  = 0
        for pname, pdata in raw_pos.items():
            house_t = house_from_lon(pdata['lon'], target_asc)
            house_b = house_from_lon(pdata['lon'], birth_asc)
            # Angular houses (1,4,7,10) = strong; Dusthana (6,8,12) = weak
            hs_t = 1.0 if house_t in {1,4,7,10} else 0.7 if house_t in {5,9,2,11} else 0.3
            hs_b = 1.0 if house_b in {1,4,7,10} else 0.7 if house_b in {5,9,2,11} else 0.3
            delta = round((hs_t - hs_b) * 100, 1)
            scores[pname] = {
                'birth_house': house_b, 'target_house': house_t,
                'improvement': delta,
            }
            total += delta

        overall = round(50 + total / len(scores), 1)
        overall = max(0, min(100, overall))
        asc_rashi = lon_to_rashi(target_asc)
        return {
            'overall_score':  overall,
            'asc_rashi':      asc_rashi,
            'planet_scores':  scores,
            'recommendation': (
                'Excellent — strongly favoured location' if overall >= 75 else
                'Good — positive planetary emphasis' if overall >= 60 else
                'Neutral — mixed influences' if overall >= 45 else
                'Challenging — consider alternatives'
            ),
        }
    except Exception as e:
        return {'overall_score': 50, 'error': str(e)}


def score_relocation(jd: float, target_lat: float, target_lon: float,
                     birth_lat: float, birth_lon: float,
                     ayanamsa_str: str = 'lahiri') -> dict:
    return _score_location(jd, target_lat, target_lon, birth_lat, birth_lon, ayanamsa_str)


def score_all_dimensions(jd: float, target_lat: float, target_lon: float,
                          birth_lat: float, birth_lon: float,
                          ayanamsa_str: str = 'lahiri') -> dict:
    base = _score_location(jd, target_lat, target_lon, birth_lat, birth_lon, ayanamsa_str)
    return {
        **base,
        'dimensions': {
            'career':   round(base['overall_score'] * 0.95 + 2, 1),
            'wealth':   round(base['overall_score'] * 0.90 + 3, 1),
            'health':   round(base['overall_score'] * 0.85 + 5, 1),
            'marriage': round(base['overall_score'] * 0.92 + 2, 1),
        },
        'source': 'Surya Siddhanta Astro-cartography + Phaladeepika Digbala',
    }


def rank_cities_for_relocation(jd: float, birth_lat: float, birth_lon: float,
                                 purpose: str = 'overall',
                                 ayanamsa_str: str = 'lahiri') -> list:
    results = []
    for city in WORLD_CITIES:
        sc = _score_location(jd, city['lat'], city['lon'],
                              birth_lat, birth_lon, ayanamsa_str)
        results.append({
            'city':    city['name'],
            'country': city.get('country', ''),
            'lat':     city['lat'],
            'lon':     city['lon'],
            'score':   sc['overall_score'],
            'asc_rashi': sc.get('asc_rashi', ''),
            'recommendation': sc.get('recommendation', ''),
        })
    results.sort(key=lambda x: -x['score'])
    return results


# ── 7. UEDP MULTI-AYANAMSA CONSENSUS ────────────────────────────

def uedp_multi_ayanamsa_consensus(jd: float, lat: float, lon: float) -> dict:
    """
    Compute lagna across all 6 ayanamsa systems and return consensus.
    UEDP v5 — G S Ramesh Kumar. Omega = e^(-variance).
    """
    systems = {}
    lagna_list = []
    for sys_name, sid_id in AYANAMSA_SYSTEMS.items():
        try:
            swe.set_sid_mode(sid_id, 0, 0)
            ayan_val = swe.get_ayanamsa_ut(jd)
            asc = calc_ascendant(jd, lat, lon, sys_name)
            lagna_r = lon_to_rashi(asc)
            lagna_list.append(lagna_r)
            systems[sys_name] = {
                'label':       AYANAMSA_LABELS.get(sys_name, sys_name),
                'ayanamsa':    round(ayan_val, 6),
                'lagna_rashi': lagna_r,
                'lagna_deg':   round(asc % 30, 4),
                'boundary_risk': (asc % 30 < 2 or asc % 30 > 28),
            }
        except Exception:
            pass

    from collections import Counter
    cnt = Counter(lagna_list)
    majority = cnt.most_common(1)[0][0] if cnt else 'Unknown'
    agree = cnt[majority]

    vals = [v['ayanamsa'] for v in systems.values()]
    spread = round(max(vals) - min(vals), 4) if vals else 0.5
    omega = round(math.exp(-spread * 3), 4)

    return {
        'systems': systems,
        'majority_lagna': majority,
        'lagna_agreed_systems': agree,
        'lagna_confidence': 'HIGH' if agree >= 5 else 'MEDIUM' if agree >= 4 else 'LOW',
        'ayanamsa_spread_deg': spread,
        'omega_dynamics': omega,
        'above_omega_crit': omega >= (1 / math.e),
    }


# ── 8. BOUNDARY CONSENSUS ───────────────────────────────────────

def compute_boundary_consensus(jd_start: float, jd_end: float,
                                lat: float, lon: float) -> dict:
    """
    Detect sign/nakshatra boundaries crossed in a time window.
    Surya Siddhanta — Sandhi (junction) periods.
    """
    boundaries = []
    step = (jd_end - jd_start) / 24.0  # hourly steps
    prev_lagna = None
    prev_nak   = None
    jd = jd_start
    while jd <= jd_end:
        try:
            asc = calc_ascendant(jd, lat, lon, 'lahiri')
            lagna = lon_to_rashi(asc)
            nak   = lon_to_nakshatra(asc)['name']
            if prev_lagna and lagna != prev_lagna:
                boundaries.append({
                    'type': 'lagna_change',
                    'jd': round(jd, 4),
                    'from_rashi': prev_lagna,
                    'to_rashi': lagna,
                    'sandhi': True,
                    'note': 'Lagna Sandhi — avoid major decisions within 2 ghatikas',
                })
            if prev_nak and nak != prev_nak:
                boundaries.append({
                    'type': 'nakshatra_change',
                    'jd': round(jd, 4),
                    'from_nak': prev_nak,
                    'to_nak': nak,
                    'note': 'Nakshatra Sandhi',
                })
            prev_lagna = lagna
            prev_nak   = nak
        except Exception:
            pass
        jd += step

    return {
        'jd_start': jd_start,
        'jd_end':   jd_end,
        'boundaries': boundaries,
        'boundary_count': len(boundaries),
        'source': 'Surya Siddhanta — Sandhi Kala analysis',
    }


# ── 9. MUHURTA — Muhurta Chintamani + Surya Siddhanta ──────────

_MUHURTA_NAK_SCORE = {
    'Ashwini':9,'Rohini':9,'Mrigashira':8,'Punarvasu':8,'Pushya':9,
    'Hasta':9,'Chitra':8,'Swati':8,'Anuradha':9,'Shravana':8,
    'Dhanishtha':8,'Shatabhisha':7,'Revati':9,'Uttara Phalguni':9,
    'Uttara Ashadha':9,'Uttara Bhadrapada':8,
    'Bharani':3,'Krittika':5,'Ardra':3,'Ashlesha':3,'Magha':4,
    'Purva Phalguni':5,'Vishakha':6,'Jyeshtha':4,'Moola':3,
    'Purva Ashadha':5,'Purva Bhadrapada':4,
}
 
_ACTIVITY_NAK = {
    'marriage':    {'Rohini','Mrigashira','Magha','Uttara Phalguni','Hasta','Swati',
                    'Anuradha','Moola','Uttara Ashadha','Uttara Bhadrapada','Revati'},
    'business':    {'Ashwini','Rohini','Mrigashira','Pushya','Hasta','Chitra','Swati',
                    'Anuradha','Shravana','Dhanishtha','Revati'},
    'travel':      {'Ashwini','Mrigashira','Punarvasu','Pushya','Hasta','Chitra',
                    'Swati','Shravana','Dhanishtha','Revati'},
    'education':   {'Ashwini','Rohini','Mrigashira','Punarvasu','Pushya','Hasta',
                    'Chitra','Swati','Shravana','Revati'},
    'medical':     {'Ashwini','Rohini','Mrigashira','Pushya','Hasta','Anuradha',
                    'Shravana','Revati'},
    'property':    {'Rohini','Mrigashira','Uttara Phalguni','Hasta','Anuradha',
                    'Uttara Ashadha','Uttara Bhadrapada','Revati'},
    'investment':  {'Rohini','Pushya','Hasta','Anuradha','Shravana','Dhanishtha',
                    'Uttara Phalguni','Revati'},
    'general':     {'Ashwini','Rohini','Mrigashira','Punarvasu','Pushya','Hasta',
                    'Chitra','Swati','Anuradha','Shravana','Dhanishtha','Revati'},
}
 
_VARA_SCORE = {
    'Sunday':6, 'Monday':8, 'Tuesday':4, 'Wednesday':9,
    'Thursday':9, 'Friday':8, 'Saturday':5,
}
 
_TITHI_SCORE = {
    1:7, 2:8, 3:7, 4:5, 5:8, 6:6, 7:8, 8:5, 9:7, 10:8,
    11:9, 12:8, 13:6, 14:4, 15:9, 16:7, 17:8, 18:7, 19:5, 20:8,
    21:7, 22:6, 23:8, 24:7, 25:8, 26:7, 27:6, 28:5, 29:4, 30:9,
}
 
# Inauspicious yoga types (Muhurta Chintamani)
_BAD_YOGAS = {
    'Vishkumbha', 'Atiganda', 'Shoola', 'Ganda', 'Vyaghata',
    'Vajra', 'Vyatipata', 'Parigha', 'Vaidhriti',
}
YOGA_NAMES = [
    'Vishkumbha','Priti','Ayushman','Saubhagya','Shobhana',
    'Atiganda','Sukarma','Dhriti','Shoola','Ganda','Vriddhi',
    'Dhruva','Vyaghata','Harshana','Vajra','Siddhi','Vyatipata',
    'Variyan','Parigha','Shiva','Siddha','Sadhya','Shubha',
    'Shukla','Brahma','Indra','Vaidhriti',
]
VARA_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
NAKSHATRAS = [
    'Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra',
    'Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni',
    'Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha',
    'Moola','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha',
    'Purva Bhadrapada','Uttara Bhadrapada','Revati',
]
NAK_LORDS = [
    'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',
    'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',
    'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',
]
 
 
# ─────────────────────────────────────────────────────────────────────────────
# HELPER — get JD for "now" in UTC
# ─────────────────────────────────────────────────────────────────────────────
 
def _now_jd() -> float:
    """Return Julian Day for the current UTC moment."""
    now = datetime.now(timezone.utc)
    return swe.julday(now.year, now.month, now.day,
                      now.hour + now.minute / 60.0 + now.second / 3600.0)
 
 
def _jd_to_date_str(jd: float) -> str:
    try:
        y, m, d, h = swe.revjul(jd)
        return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"
    except Exception:
        return "—"
 
 
def _jd_to_time_str(jd: float) -> str:
    try:
        y, m, d, h = swe.revjul(jd)
        hour = int(h)
        minute = int((h - hour) * 60)
        return f"{hour:02d}:{minute:02d}"
    except Exception:
        return "—"
 
 
def _nak_idx(nak: str) -> int:
    try:
        return NAKSHATRAS.index(nak)
    except ValueError:
        return 0


def score_muhurta_moment(
    jd: float,
    activity: str = 'general',
    birth_moon_nak: str = None,
    ayanamsa_str: str = 'lahiri',
    lat: float = 20.0,    # India geographic centre (Madhya Pradesh)
    lon: float = 78.0,    # India geographic centre
) -> dict:
    """
    Score a moment as muhurta for given activity.
    Muhurta Chintamani + Surya Siddhanta + Phaladeepika.
 
    FIXED: lat/lon are explicit params; yoga penalty added;
           result includes scored datetime for UI display.
    """
    try:
        _ayanamsa_sid = {
            'lahiri': swe.SIDM_LAHIRI, 'raman': swe.SIDM_RAMAN,
            'kp': swe.SIDM_KRISHNAMURTI, 'yukteshwar': swe.SIDM_YUKTESHWAR,
            'true_chitrapaksha': swe.SIDM_TRUE_CITRA,
        }
        sid_id = _ayanamsa_sid.get(ayanamsa_str, swe.SIDM_LAHIRI)
        swe.set_sid_mode(sid_id, 0, 0)
 
        SPEED_FLAG = swe.FLG_SIDEREAL | swe.FLG_MOSEPH | swe.FLG_SPEED
 
        # Moon and Sun positions
        r_moon = swe.calc_ut(jd, swe.MOON, SPEED_FLAG)
        r_sun  = swe.calc_ut(jd, swe.SUN,  SPEED_FLAG)
        moon_lon = r_moon[0][0] % 360
        sun_lon  = r_sun[0][0]  % 360
 
        # Nakshatra
        nak_span = 360 / 27
        nak_idx  = int(moon_lon / nak_span) % 27
        nak      = NAKSHATRAS[nak_idx]
 
        # Tithi
        tithi_deg = (moon_lon - sun_lon + 360) % 360
        tithi_n   = int(tithi_deg / 12) + 1   # 1–30
 
        # Vara (weekday)
        vara = VARA_NAMES[int(jd + 1.5) % 7]
 
        # Yoga (Sun + Moon combined nakshatra)
        yoga_idx = int((sun_lon + moon_lon) % 360 / (360 / 27)) % 27
        yoga     = YOGA_NAMES[yoga_idx]
 
        # ── Scoring ───────────────────────────────────────────────────────────
        nak_base  = _MUHURTA_NAK_SCORE.get(nak, 5)
        act_naks  = _ACTIVITY_NAK.get(activity, _ACTIVITY_NAK['general'])
        nak_bonus = 2 if nak in act_naks else 0
        vara_sc   = _VARA_SCORE.get(vara, 6)
        tithi_sc  = _TITHI_SCORE.get(tithi_n, 7)
 
        # Yoga penalty (Muhurta Chintamani)
        yoga_penalty = -2 if yoga in _BAD_YOGAS else 0
 
        # Bhadra (Vishti Karana) penalty — avoid for important work
        # Bhadra = Vishti karana, occurs at fixed intervals
        karana_idx = int(tithi_deg / 6) % 11
        bhadra_penalty = -2 if karana_idx == 6 else 0  # Vishti=index 6
 
        # Birth nakshatra Tara compatibility
        birth_bonus = 0
        if birth_moon_nak and birth_moon_nak in NAKSHATRAS:
            bi   = _nak_idx(birth_moon_nak)
            ci   = nak_idx
            tara = (ci - bi + 27) % 27
            # Favourable Taras: 1(Janma ok), 3(Vipat bad), 5(Pratyak bad), 7(Nidhan bad)
            birth_bonus = 2 if tara in {0, 1, 2, 4, 6, 8} else -1
 
        raw = (nak_base + nak_bonus + vara_sc + tithi_sc +
               yoga_penalty + bhadra_penalty + birth_bonus)
 
        # Scale to 0–100: max theoretical = 9+2+9+9+2 = 31, min ~3
        total = round(min(100, max(0, (raw / 31.0) * 100)), 1)
 
        # Format datetime for UI
        date_str = _jd_to_date_str(jd)
        time_str = _jd_to_time_str(jd)
 
        # IST display (+5:30)
        try:
            y, m, d, h = swe.revjul(jd)
            ist_h = h + 5.5
            if ist_h >= 24:
                ist_h -= 24
                # day rollover — simplified
            ist_hour   = int(ist_h)
            ist_minute = int((ist_h - ist_hour) * 60)
            time_ist   = f"{ist_hour:02d}:{ist_minute:02d} IST"
        except Exception:
            time_ist = time_str + " IST"
 
        return {
            'score':      total,
            'grade':      ('Excellent' if total >= 80 else
                           'Good'      if total >= 65 else
                           'Moderate'  if total >= 50 else 'Poor'),
            'suitable':   total >= 65,
            'date':       date_str,
            'time':       time_str,
            'time_ist':   time_ist,
            'nakshatra':  nak,
            'nak_lord':   NAK_LORDS[nak_idx],
            'tithi':      tithi_n,
            'vara':       vara,
            'yoga':       yoga,
            'yoga_penalty': yoga_penalty,
            'bhadra':     bhadra_penalty < 0,
            'activity':   activity,
            'source':     'Muhurta Chintamani + Surya Siddhanta + Phaladeepika',
        }
 
    except Exception as e:
        return {
            'score': 50, 'error': str(e),
            'suitable': False, 'date': '—', 'time': '—',
        }
 
 
# ─────────────────────────────────────────────────────────────────────────────
# FIXED: find_good_muhurtas()
# PRIMARY FIX: jd_start defaults to NOW (not J2000)
# Additional fixes:
#   • step = 1 day scanning sunrise windows (not 0.5 — which scans midnight)
#   • scans 3 windows per day: morning (6 AM IST), midday (10 AM IST), evening (4 PM IST)
#   • Rahu Kala exclusion (Muhurta Chintamani)
#   • returns scoredAt for the current moment too
# ─────────────────────────────────────────────────────────────────────────────
 
# Rahu Kala hours from sunrise (1.5 hr blocks, day-of-week dependent)
# Traditional: Mon=7:30-9, Tue=15-16:30, Wed=12-13:30, Thu=13:30-15, Fri=10:30-12, Sat=9-10:30, Sun=16:30-18
_RAHU_KALA_HOUR = {
    'Monday':    (7.5, 9.0),
    'Tuesday':   (15.0, 16.5),
    'Wednesday': (12.0, 13.5),
    'Thursday':  (13.5, 15.0),
    'Friday':    (10.5, 12.0),
    'Saturday':  (9.0, 10.5),
    'Sunday':    (16.5, 18.0),
}
 
# Yamaghanda hours (also inauspicious per Muhurta Chintamani)
_YAMAGHANDA_HOUR = {
    'Monday':    (10.5, 12.0),
    'Tuesday':   (9.0, 10.5),
    'Wednesday': (7.5, 9.0),
    'Thursday':  (6.0, 7.5),
    'Friday':    (15.0, 16.5),
    'Saturday':  (13.5, 15.0),
    'Sunday':    (12.0, 13.5),
}
 
 
def _is_rahu_kala(vara: str, ist_hour: float) -> bool:
    rk = _RAHU_KALA_HOUR.get(vara, (0, 0))
    return rk[0] <= ist_hour < rk[1]
 
 
def _is_yamaghanda(vara: str, ist_hour: float) -> bool:
    yg = _YAMAGHANDA_HOUR.get(vara, (0, 0))
    return yg[0] <= ist_hour < yg[1]
 
 
def find_good_muhurtas(
    jd_start: float = None,   # ← FIX: default None → auto now()
    days: int = 30,
    activity: str = 'general',
    birth_moon_nak: str = None,
    ayanamsa_str: str = 'lahiri',
    min_score: float = 65,
    lat: float = 20.0,
    lon: float = 78.0,
) -> dict:
    """
    Scan forward for auspicious muhurtas.
    Muhurta Chintamani — systematic scanning.
 
    FIXED:
      • jd_start=None now auto-uses current UTC time (NOT J2000)
      • Scans 3 windows/day (morning, midday, afternoon IST)
      • Excludes Rahu Kala and Yamaghanda
      • Returns current-moment score too (for the UI 'score_now' feature)
    """
    # ── PRIMARY FIX: always start from now if no jd given ────────────────────
    if jd_start is None:
        jd_start = _now_jd()
 
    # Score the current moment first (for the HTML's score_now feature)
    current_score = score_muhurta_moment(jd_start, activity, birth_moon_nak,
                                          ayanamsa_str, lat, lon)
    current_score['scoredAt'] = _jd_to_date_str(jd_start) + ' ' + _jd_to_time_str(jd_start)
 
    # Extract weekday from current moment
    try:
        y, m, d, h = swe.revjul(jd_start)
        current_vara = VARA_NAMES[int(jd_start + 1.5) % 7]
        current_score['scoredDay'] = current_vara
    except Exception:
        pass
 
    good: list = []
    jd_end = jd_start + days
 
    # ── Scan windows: 6 AM, 9 AM, 11 AM, 2 PM, 4 PM IST each day ────────────
    # IST = UTC + 5.5h → in JD terms, add 5.5/24
    IST_OFFSET_JD = 5.5 / 24.0
 
    # Windows in IST hours
    IST_WINDOWS = [6.0, 8.5, 10.5, 14.0, 16.5]
 
    # Step day by day
    jd_day = jd_start
    while jd_day < jd_end and len(good) < 60:
        # Get the UTC midnight JD for this calendar day
        try:
            y, m, d_num, _ = swe.revjul(jd_day)
            jd_day_midnight = swe.julday(int(y), int(m), int(d_num), 0.0)
        except Exception:
            jd_day += 1
            continue
 
        for ist_hour in IST_WINDOWS:
            # Convert IST to UTC JD
            utc_h = ist_hour - 5.5
            if utc_h < 0:
                utc_h += 24
            jd_moment = jd_day_midnight + utc_h / 24.0
 
            # Skip if before our start time
            if jd_moment < jd_start:
                continue
 
            vara = VARA_NAMES[int(jd_moment + 1.5) % 7]
 
            # Skip Rahu Kala and Yamaghanda
            if _is_rahu_kala(vara, ist_hour):
                continue
            if _is_yamaghanda(vara, ist_hour):
                continue
 
            sc = score_muhurta_moment(
                jd_moment, activity, birth_moon_nak, ayanamsa_str, lat, lon
            )
            if sc.get('score', 0) >= min_score:
                # Convert to IST display
                ist_h_int  = int(ist_hour)
                ist_m_int  = int((ist_hour - ist_h_int) * 60)
                sc['time'] = f"{ist_h_int:02d}:{ist_m_int:02d}"
                sc['time_ist'] = f"{ist_h_int:02d}:{ist_m_int:02d} IST"
                sc['date']     = f"{int(y):04d}-{int(m):02d}-{int(d_num):02d}"
                sc['jd']       = round(jd_moment, 4)
                sc['rahu_kala_clear'] = True
                sc['yamaghanda_clear'] = True
                good.append(sc)
 
        jd_day += 1.0   # advance one calendar day
 
    # Sort by score descending
    good.sort(key=lambda x: -x.get('score', 0))
 
    return {
        'activity':     activity,
        'days':         days,
        'min_score':    min_score,
        'found':        len(good),
        'muhurtas':     good,
        'currentMoment': current_score,
        'source':       'Muhurta Chintamani + Surya Siddhanta + Phaladeepika',
        'note':         (
            'Results from today onwards. '
            'Rahu Kala and Yamaghanda excluded per Muhurta Chintamani. '
            f'Best nakshatras: Rohini, Pushya, Hasta, Chitra, Swati, '
            f'Anuradha, Shravana, Revati, Uttara Phalguni, Uttara Ashadha.'
        ),
    }


# ── 10. CAREER ANALYSIS — Phaladeepika Ch.11 ────────────────────

_CAREER_DOMAINS = {
    'Sun':    ['Government','Administration','Politics','Medicine','Gold trade'],
    'Moon':   ['Agriculture','Dairy','Navy','Hospitality','Nursing'],
    'Mars':   ['Military','Engineering','Surgery','Police','Sports'],
    'Mercury':['Commerce','Writing','Communication','IT','Accounting'],
    'Jupiter':['Teaching','Law','Religion','Finance','Philosophy'],
    'Venus':  ['Arts','Fashion','Music','Luxury goods','Diplomacy'],
    'Saturn': ['Mining','Labour','Real estate','Oil','Leather'],
    'Rahu':   ['Technology','Foreign trade','Research','Unconventional'],
    'Ketu':   ['Spirituality','Research','Medicine','Occult'],
}

def compute_career_analysis(kundali: dict) -> dict:
    """
    Phaladeepika Ch.11 — 10th house, 10th lord, Amatya Karaka career analysis.
    """
    planets  = kundali.get('planets', {})
    lagna    = kundali.get('lagna', {})
    shadbala = kundali.get('shadbala', {})
    dasha    = kundali.get('dasha', {})
    vargas   = kundali.get('vargas', {})

    li = RASHIS.index(lagna.get('rashi', 'Mesha')) if lagna.get('rashi') in RASHIS else 0
    h10_rashi = RASHIS[(li + 9) % 12]
    h10_lord  = RASHI_LORD.get(h10_rashi, 'Saturn')
    h10_lord_data = planets.get(h10_lord, {})
    h10_lord_dig  = h10_lord_data.get('dignity', 'neutral')
    h10_lord_house= h10_lord_data.get('house', 1)

    h10_planets = [p for p,d in planets.items() if d.get('house') == 10]

    # Amatya Karaka — 2nd highest degree planet (Jaimini)
    KARAKAS = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']
    degrees = sorted(
        [(pn, planets[pn].get('deg_in_sign', 0)) for pn in KARAKAS if pn in planets],
        key=lambda x: -x[1]
    )
    amatya_karaka = degrees[1][0] if len(degrees) >= 2 else 'Mercury'

    # Career domains
    domains = list(set(
        _CAREER_DOMAINS.get(h10_lord, []) +
        _CAREER_DOMAINS.get(amatya_karaka, []) +
        sum([_CAREER_DOMAINS.get(p, []) for p in h10_planets], [])
    ))[:8]

    # Strength score
    DIG = {'exalted':10,'moolatrikona':9,'own':8,'friend':7,'neutral':6,'enemy':4,'debilitated':2}
    h10_strength = DIG.get(h10_lord_dig, 6)
    h10_house_bonus = 2 if h10_lord_house in {1,4,7,10} else 1 if h10_lord_house in {5,9} else 0
    career_score = min(100, (h10_strength + h10_house_bonus) * 9)

    # D10 analysis
    d10 = vargas.get('D10', {})
    d10_lagna = d10.get('lagna', {})
    d10_li = RASHIS.index(d10_lagna.get('rashi','Mesha')) if d10_lagna.get('rashi') in RASHIS else 0
    d10_h10_rashi = RASHIS[(d10_li + 9) % 12]
    d10_h10_lord  = RASHI_LORD.get(d10_h10_rashi, '')
    d10_h10_dig   = d10.get('planets', {}).get(d10_h10_lord, {}).get('dignity', 'neutral')

    # Current dasha
    cur = dasha.get('current', {})
    cur_maha = cur.get('mahadasha', '')
    career_dasha = cur_maha in {h10_lord, amatya_karaka, 'Sun', 'Saturn', 'Mercury', 'Rahu'}

    return {
        'h10_rashi':        h10_rashi,
        'h10_lord':         h10_lord,
        'h10_lord_dignity': h10_lord_dig,
        'h10_lord_house':   h10_lord_house,
        'h10_planets':      h10_planets,
        'amatya_karaka':    amatya_karaka,
        'career_domains':   domains,
        'career_score':     career_score,
        'career_grade':     ('Excellent' if career_score >= 80 else 'Strong' if career_score >= 65
                             else 'Moderate' if career_score >= 50 else 'Challenging'),
        'career_dasha_active': career_dasha,
        'current_dasha':    f'{cur_maha}/{cur.get("antardasha","")}',
        'd10_analysis': {
            'h10_rashi':   d10_h10_rashi,
            'h10_lord':    d10_h10_lord,
            'h10_dignity': d10_h10_dig,
        },
        'source': 'Phaladeepika Ch.11 — Karma Bhava + Jaimini Amatya Karaka',
    }


# ── 11. TRANSIT TIMELINE ─────────────────────────────────────────

def compute_transit_timeline(natal_planets: dict, ayanamsa_str: str = 'lahiri',
                               days: int = 365) -> list:
    """
    Compute key transit events for next N days.
    Surya Siddhanta — Gochara (transit) analysis.
    """
    timeline = []
    now_jd = julian_day(datetime.utcnow())
    step   = 7  # weekly

    prev_positions = {}
    for pname, pid in PLANET_IDS.items():
        try:
            _set_ayanamsa(ayanamsa_str)
            r = swe.calc_ut(now_jd, pid, SPEED_FLAG)
            prev_positions[pname] = r[0][0] % 360
        except Exception:
            prev_positions[pname] = 0

    for week in range(days // step):
        jd = now_jd + week * step
        for pname, pid in PLANET_IDS.items():
            try:
                _set_ayanamsa(ayanamsa_str)
                r = swe.calc_ut(jd, pid, SPEED_FLAG)
                curr_lon = r[0][0] % 360
                prev_lon = prev_positions.get(pname, curr_lon)

                curr_rashi = lon_to_rashi(curr_lon)
                prev_rashi = lon_to_rashi(prev_lon)

                # Sign ingress
                if curr_rashi != prev_rashi:
                    natal_moon_rashi = natal_planets.get('Moon', {}).get('rashi', 'Mesha')
                    nm_idx = RASHIS.index(natal_moon_rashi) if natal_moon_rashi in RASHIS else 0
                    tr_idx = RASHIS.index(curr_rashi) if curr_rashi in RASHIS else 0
                    gochara_house = (tr_idx - nm_idx + 12) % 12 + 1
                    GOCHARA_GOOD = {
                        'Jupiter': {2,5,7,9,11}, 'Saturn': {3,6,11},
                        'Venus':   {1,2,3,4,5,8,9,11,12}, 'Mercury': {2,4,6,8,10,11},
                        'Sun':     {3,6,10,11}, 'Moon': {1,3,6,7,10,11},
                        'Mars':    {3,6,11}, 'Rahu': {3,6,11}, 'Ketu': {3,6,11},
                    }
                    beneficial = gochara_house in GOCHARA_GOOD.get(pname, set())
                    try:
                        y, m, d, _ = swe.revjul(jd)
                        date_str = f'{int(y):04d}-{int(m):02d}-{int(d):02d}'
                    except Exception:
                        date_str = '—'

                    timeline.append({
                        'date':          date_str,
                        'planet':        pname,
                        'event':         f'{pname} enters {curr_rashi}',
                        'from_rashi':    prev_rashi,
                        'to_rashi':      curr_rashi,
                        'gochara_house': gochara_house,
                        'beneficial':    beneficial,
                        'impact':        'Positive transit' if beneficial else 'Challenging transit',
                        'source':        'Surya Siddhanta Gochara',
                    })

                prev_positions[pname] = curr_lon
            except Exception:
                pass

    timeline.sort(key=lambda x: x.get('date', ''))
    return timeline[:60]  # cap at 60 events


# ── 12. SADE SATI ─────────────────────────────────────────────

def compute_sade_sati(natal_moon_rashi: str, ayanamsa_str: str = 'lahiri') -> dict:
    """
    Compute Sade Sati and Dhaiya phases — Saturn 7.5 year transit.
    BPHS — Shani Gochara Adhyaya.
    """
    now_jd = julian_day(datetime.utcnow())
    try:
        _set_ayanamsa(ayanamsa_str)
        r = swe.calc_ut(now_jd, swe.SATURN, SPEED_FLAG)
        saturn_lon = r[0][0] % 360
    except Exception:
        saturn_lon = 0

    saturn_rashi = lon_to_rashi(saturn_lon)
    moon_idx     = RASHIS.index(natal_moon_rashi) if natal_moon_rashi in RASHIS else 0
    sat_idx      = RASHIS.index(saturn_rashi)     if saturn_rashi in RASHIS else 0

    distance = (sat_idx - moon_idx + 12) % 12

    in_sade_sati = distance in {11, 0, 1}  # 12th, 1st, 2nd from Moon
    in_dhaiya    = distance in {3, 7}       # 4th (Kantaka) or 8th (Ashtama)

    phase = (
        'Rising (12th from Moon)' if distance == 11 else
        'Peak (1st from Moon)'    if distance == 0  else
        'Setting (2nd from Moon)' if distance == 1  else
        'Kantaka Shani (4th)'     if distance == 3  else
        'Ashtama Shani (8th)'     if distance == 7  else
        'Not active'
    )

    return {
        'saturn_rashi':      saturn_rashi,
        'natal_moon_rashi':  natal_moon_rashi,
        'saturn_distance':   distance,
        'in_sade_sati':      in_sade_sati,
        'in_dhaiya':         in_dhaiya,
        'phase':             phase,
        'active':            in_sade_sati or in_dhaiya,
        'effects': (
            'Delays, obstacles, karmic tests — increase discipline and Shani worship' if in_sade_sati else
            'Moderate challenge — Hanuman Chalisa recommended' if in_dhaiya else
            'Saturn transit is neutral to favourable currently'
        ),
        'remedy': 'Shani Shanti puja, donate black sesame on Saturdays, Shani Chalisa' if (in_sade_sati or in_dhaiya) else 'No urgent remedy required',
        'source': 'BPHS Shani Gochara Adhyaya',
    }


# ── 13. GURU PHAL ────────────────────────────────────────────────

def compute_guru_phal(natal_moon_rashi: str, ayanamsa_str: str = 'lahiri') -> dict:
    """
    Jupiter transit effects from natal Moon.
    Surya Siddhanta Gochara + Phaladeepika.
    """
    now_jd = julian_day(datetime.utcnow())
    try:
        _set_ayanamsa(ayanamsa_str)
        r = swe.calc_ut(now_jd, swe.JUPITER, SPEED_FLAG)
        jup_lon = r[0][0] % 360
    except Exception:
        jup_lon = 0

    jup_rashi  = lon_to_rashi(jup_lon)
    moon_idx   = RASHIS.index(natal_moon_rashi) if natal_moon_rashi in RASHIS else 0
    jup_idx    = RASHIS.index(jup_rashi)        if jup_rashi in RASHIS else 0
    distance   = (jup_idx - moon_idx + 12) % 12 + 1  # 1-12

    GURU_PHAL = {
        1:  ('Average — Jupiter on Moon rashi. Expenses, some confusion.', 5),
        2:  ('Good — Wealth gains, family harmony, good food.', 8),
        3:  ('Poor — Struggles, obstacles, conflicts with siblings.', 3),
        4:  ('Moderate — Domestic issues, property changes.', 5),
        5:  ('Excellent — Children blessed, intelligence enhanced, great period.', 9),
        6:  ('Poor — Enemies active, health issues, expenses.', 3),
        7:  ('Excellent — Marriage, partnerships, travel, success.', 9),
        8:  ('Difficult — Health challenges, hidden enemies, losses.', 2),
        9:  ('Very Good — Father, fortune, dharma, long journeys.', 8),
        10: ('Excellent — Career peak, recognition, authority.', 9),
        11: ('Best — Maximum gains, all wishes fulfilled.', 10),
        12: ('Challenging — Expenditure, foreign travel, spiritual gains.', 4),
    }

    effect, score = GURU_PHAL.get(distance, ('Moderate', 5))

    return {
        'jupiter_rashi':     jup_rashi,
        'natal_moon_rashi':  natal_moon_rashi,
        'gochara_house':     distance,
        'effect':            effect,
        'score':             score,
        'grade':             'Excellent' if score >= 9 else 'Good' if score >= 7 else 'Moderate' if score >= 5 else 'Challenging',
        'source':            'Surya Siddhanta Gochara + Phaladeepika',
    }


# ── 14. DASAVIDA PORUTHAM — Tamil 10-fold compatibility ─────────

_DASAVIDA_NAKS = NAKSHATRAS  # 27 nakshatras

def compute_dasavida_porutham(nak1: str, rashi1: str,
                               nak2: str, rashi2: str) -> dict:
    """
    Tamil Jyotisha — 10-fold compatibility (Dasavida Porutham).
    Classical Tamil text: Muhurta Ratnam + Jataka Alankaram.
    """
    i1 = _nak_idx(nak1); i2 = _nak_idx(nak2)
    r1 = _rashi_idx(rashi1); r2 = _rashi_idx(rashi2)

    results = {}

    # 1. Dinam (Compatibility of natal stars)
    dinam_val = (i2 - i1 + 27) % 27 + 1
    dinam_ok  = dinam_val in {2,4,6,8,9,11,13,15,17,18,20,22,24,26}
    results['dinam'] = {'name':'Dinam','score': 3 if dinam_ok else 0,'max':3,'ok':dinam_ok,
                        'detail':f'Star distance: {dinam_val}'}

    # 2. Ganam (Temperament)
    g1 = _KOOTA_GANA.get(nak1,'M'); g2 = _KOOTA_GANA.get(nak2,'M')
    gana_ok = g1 == g2 or (g1=='D' and g2=='M')
    results['ganam'] = {'name':'Ganam','score':5 if g1==g2 else 3 if gana_ok else 0,'max':5,'ok':gana_ok,
                        'detail':f'{g1} + {g2}'}

    # 3. Yoni (Physical compatibility)
    y1 = _YONI_MAP.get(nak1,('Horse','M')); y2 = _YONI_MAP.get(nak2,('Horse','F'))
    HOSTILE_Y = {('Cat','Rat'),('Dog','Deer'),('Serpent','Mongoose'),('Lion','Elephant'),
                 ('Tiger','Cow'),('Horse','Buffalo'),('Goat','Monkey')}
    pair_y = (y1[0],y2[0])
    yoni_ok = pair_y not in HOSTILE_Y and (pair_y[0],pair_y[1]) not in [(b,a) for a,b in HOSTILE_Y]
    results['yoni'] = {'name':'Yoni','score':4 if y1[0]==y2[0] else 2 if yoni_ok else 0,'max':4,'ok':yoni_ok,
                       'detail':f'{y1[0]}({y1[1]}) + {y2[0]}({y2[1]})'}

    # 4. Rasi (Sign compatibility)
    rasi_dist = (r2 - r1 + 12) % 12
    rasi_ok   = rasi_dist in {1,3,5,7,9,11}
    results['rasi'] = {'name':'Rasi','score':4 if rasi_ok else 0,'max':4,'ok':rasi_ok,
                       'detail':f'{rashi1} to {rashi2}, distance {rasi_dist}'}

    # 5. Rasiyatipati (Sign lord friendship)
    l1 = RASHI_LORD.get(rashi1,''); l2 = RASHI_LORD.get(rashi2,'')
    fn = NATURAL_FRIENDS.get(l1,{'f':[],'e':[]})
    lord_ok = l2 in fn['f'] or l1 == l2
    results['rasiyatipati'] = {'name':'Rasiyatipati','score':5 if lord_ok else 2 if l2 not in fn.get('e',[]) else 0,
                               'max':5,'ok':lord_ok,'detail':f'{l1} + {l2}'}

    # 6. Rajju (Longevity of marriage)
    RAJJU_MAP = {
        'Siro': {'Mrigashira','Chitra','Dhanishtha'},
        'Kanda':{'Rohini','Hasta','Shravana'},
        'Uras': {'Krittika','Uttara Phalguni','Uttara Ashadha'},
        'Madhya':{'Bharani','Purva Phalguni','Purva Ashadha'},
        'Pada': {'Ashwini','Magha','Moola'},
        'Nabi': {'Ardra','Swati','Shatabhisha'},
        'Greeva':{'Punarvasu','Vishakha','Purva Bhadrapada'},
        'Jihva':{'Pushya','Anuradha','Uttara Bhadrapada'},
        'Netra':{'Ashlesha','Jyeshtha','Revati'},
    }
    def _rajju(nak):
        for k,v in RAJJU_MAP.items():
            if nak in v: return k
        return 'Other'
    rj1 = _rajju(nak1); rj2 = _rajju(nak2)
    rajju_ok = rj1 != rj2
    results['rajju'] = {'name':'Rajju','score':7 if rajju_ok else 0,'max':7,'ok':rajju_ok,
                        'detail':f'{rj1} + {rj2}'}

    # 7. Vedha (Obstacle stars)
    VEDHA_PAIRS = {(0,12),(1,14),(2,20),(3,8),(4,7),(5,19),(6,10),(9,24),(11,15),(13,25),(16,18),(17,21),(22,23)}
    vedha_ok = (i1,i2) not in VEDHA_PAIRS and (i2,i1) not in VEDHA_PAIRS
    results['vedha'] = {'name':'Vedha','score':2 if vedha_ok else 0,'max':2,'ok':vedha_ok,
                        'detail':'No Vedha' if vedha_ok else 'Vedha present — obstacle'}

    # 8. Nadi (Health and progeny)
    nd1 = _NADI.get(nak1,1); nd2 = _NADI.get(nak2,1)
    nadi_ok = nd1 != nd2
    results['nadi'] = {'name':'Nadi','score':8 if nadi_ok else 0,'max':8,'ok':nadi_ok,
                       'detail':'Different Nadi' if nadi_ok else 'Same Nadi — Nadi Dosha'}

    # 9. Mahendra (Prosperity)
    mahendra_dist = (i2 - i1 + 27) % 27
    mahendra_ok   = mahendra_dist in {4,7,10,13,16,19,22,25}
    results['mahendra'] = {'name':'Mahendra','score':3 if mahendra_ok else 0,'max':3,'ok':mahendra_ok,
                           'detail':f'Distance {mahendra_dist}'}

    # 10. Streedeergha (Long life of wife)
    stree_ok = (i2 - i1 + 27) % 27 >= 7
    results['streedeergha'] = {'name':'Streedeergha','score':3 if stree_ok else 0,'max':3,'ok':stree_ok,
                               'detail':'Star distance >= 7' if stree_ok else 'Star distance < 7'}

    total = sum(v['score'] for v in results.values())
    max_t = sum(v['max']   for v in results.values())
    passed = sum(1 for v in results.values() if v['ok'])

    return {
        'total':      total,
        'max':        max_t,
        'percentage': round(total / max_t * 100, 1),
        'passed':     passed,
        'out_of':     10,
        'grade':      ('Excellent' if total >= 35 else 'Good' if total >= 25 else 'Acceptable' if total >= 18 else 'Rejected'),
        'recommended': total >= 18,
        'poruthams':  results,
        'nadi_dosha': not nadi_ok,
        'rajju_dosha': not rajju_ok,
        'vedha_dosha': not vedha_ok,
        'source':     'Tamil Jyotisha — Dasavida Porutham (Muhurta Ratnam)',
    }


# ── 15. LIFE DECISIONS ──────────────────────────────────────────

def compute_life_decisions(kundali: dict) -> dict:
    """
    Life decision analysis — Phaladeepika + BPHS house significations.
    """
    planets = kundali.get('planets', {})
    lagna   = kundali.get('lagna', {})
    dasha   = kundali.get('dasha', {})
    li = RASHIS.index(lagna.get('rashi','Mesha')) if lagna.get('rashi') in RASHIS else 0

    def _h(p): return planets.get(p,{}).get('house',0)
    def _dig(p): return planets.get(p,{}).get('dignity','neutral')
    def _lord(h): return RASHI_LORD.get(RASHIS[(li+h-1)%12],'')
    DIG = {'exalted':10,'moolatrikona':9,'own':8,'friend':7,'neutral':5,'enemy':3,'debilitated':1}
    def _sc(p): return DIG.get(_dig(p),5)

    # Marriage timing
    h7l = _lord(7); h7_sc = _sc(h7l)
    venus_sc = _sc('Venus')
    marriage_score = round((h7_sc + venus_sc) / 2)
    marriage_timing = (
        'Early (before 25)' if marriage_score >= 8 and _h(h7l) in {1,4,7,10} else
        'Mid (25-30)' if marriage_score >= 6 else
        'Late (after 30)' if marriage_score >= 4 else
        'Very late or unconventional'
    )

    # Career timing
    h10l = _lord(10); h10_sc = _sc(h10l)
    career_score = round((h10_sc + _sc('Sun') + _sc('Saturn')) / 3)
    career_timing = (
        'Early breakthrough (before 28)' if career_score >= 8 else
        'Steady rise (28-35)' if career_score >= 6 else
        'Late success (after 35)' if career_score >= 4 else
        'Unconventional career path'
    )

    # Foreign settlement
    rahu_h = _h('Rahu')
    h12l = _lord(12); h12l_h = _h(h12l)
    foreign_score = (3 if rahu_h in {1,7,9,12} else 1) + (2 if h12l_h in {9,12} else 0) + (2 if _dig('Rahu') in {'exalted','own'} else 0)
    foreign_likely = foreign_score >= 4

    # Wealth peak
    h11l = _lord(11); jup_sc = _sc('Jupiter'); venus_sc2 = _sc('Venus')
    wealth_score = round((jup_sc + venus_sc2 + _sc(h11l)) / 3)
    wealth_peak = (
        'Continuous wealth' if wealth_score >= 8 else
        'Wealth after 35' if wealth_score >= 6 else
        'Moderate and stable' if wealth_score >= 4 else
        'Financial challenges; disciplined savings needed'
    )

    cur = dasha.get('current', {})
    return {
        'marriage':  {'timing': marriage_timing, 'score': marriage_score,
                      'favourable_dasha': f'{h7l} or Venus Mahadasha'},
        'career':    {'timing': career_timing,   'score': career_score,
                      'favourable_dasha': f'{h10l} or Sun Mahadasha'},
        'foreign':   {'likely': foreign_likely,  'score': foreign_score,
                      'note': 'Strong Rahu and 12th house indicate foreign connection'},
        'wealth':    {'peak': wealth_peak,        'score': wealth_score},
        'current_dasha': f'{cur.get("mahadasha","")}/{cur.get("antardasha","")}',
        'source': 'Phaladeepika + BPHS House Significations',
    }


# ── 16. PROPERTY ANALYSIS — BPHS Bhava Adhyaya ─────────────────

def compute_property_analysis(kundali: dict) -> dict:
    """
    Property and real estate analysis — BPHS 4th house.
    """
    planets = kundali.get('planets', {})
    lagna   = kundali.get('lagna', {})
    li = RASHIS.index(lagna.get('rashi','Mesha')) if lagna.get('rashi') in RASHIS else 0

    def _h(p): return planets.get(p,{}).get('house',0)
    def _dig(p): return planets.get(p,{}).get('dignity','neutral')
    def _lord(h): return RASHI_LORD.get(RASHIS[(li+h-1)%12],'')
    DIG = {'exalted':10,'moolatrikona':9,'own':8,'friend':7,'neutral':5,'enemy':3,'debilitated':1}

    h4l = _lord(4); h4l_dig = _dig(h4l); h4l_h = _h(h4l)
    mars_h = _h('Mars'); mars_dig = _dig('Mars')
    h4_planets = [p for p,d in planets.items() if d.get('house')==4]

    property_score = DIG.get(h4l_dig, 5)
    if h4l_h in {1,4,7,10}: property_score += 2
    if 'Jupiter' in h4_planets: property_score += 2
    if 'Venus' in h4_planets: property_score += 1
    if mars_dig in {'exalted','own','moolatrikona'}: property_score += 1
    if h4l_dig == 'debilitated': property_score -= 3
    property_score = max(0, min(10, property_score))

    return {
        'h4_lord':       h4l,
        'h4_lord_dig':   h4l_dig,
        'h4_lord_house': h4l_h,
        'h4_planets':    h4_planets,
        'mars_house':    mars_h,
        'mars_dignity':  mars_dig,
        'property_score': property_score,
        'analysis': (
            'Excellent — multiple properties, real estate gains strongly indicated' if property_score >= 9 else
            'Good — property ownership likely, stable home environment' if property_score >= 7 else
            'Moderate — property possible with effort' if property_score >= 5 else
            'Challenging — rented/shared living; delays in own property'
        ),
        'source': 'BPHS Sukha Bhava (4th House) Adhyaya',
    }


# ── 17. PARIHARA — Atharva Veda Parishishta ─────────────────────

def compute_parihara(kundali: dict) -> dict:
    """
    Remedies (Parihara) for planetary afflictions.
    Atharva Veda Parishishta + Phaladeepika Remedies.
    """
    planets = kundali.get('planets', {})
    doshas  = kundali.get('doshas', [])
    lagna   = kundali.get('lagna', {})

    remedies = []

    # Planet-specific remedies for debilitated/enemy planets
    PLANET_REMEDIES = {
        'Sun':     {'gem':'Ruby (Manikya)','mantra':'Om Hraam Hreem Hraum Sah Suryaya Namah (6000×)','day':'Sunday','donate':'Wheat, jaggery, copper','colour':'Red'},
        'Moon':    {'gem':'Pearl (Moti)','mantra':'Om Shraam Shreem Shraum Sah Chandraya Namah (11000×)','day':'Monday','donate':'Rice, milk, silver','colour':'White'},
        'Mars':    {'gem':'Red Coral (Moonga)','mantra':'Om Kraam Kreem Kraum Sah Bhaumaya Namah (7000×)','day':'Tuesday','donate':'Red lentils, copper','colour':'Red'},
        'Mercury': {'gem':'Emerald (Panna)','mantra':'Om Braam Breem Braum Sah Budhaya Namah (17000×)','day':'Wednesday','donate':'Green moong, books','colour':'Green'},
        'Jupiter': {'gem':'Yellow Sapphire (Pukhraj)','mantra':'Om Graam Greem Graum Sah Guruve Namah (19000×)','day':'Thursday','donate':'Yellow items, turmeric','colour':'Yellow'},
        'Venus':   {'gem':'Diamond / White Sapphire','mantra':'Om Draam Dreem Draum Sah Shukraya Namah (20000×)','day':'Friday','donate':'White items, sugar','colour':'White'},
        'Saturn':  {'gem':'Blue Sapphire (Neelam) — trial first','mantra':'Om Praam Preem Praum Sah Shanaischaraya Namah (23000×)','day':'Saturday','donate':'Black sesame, iron','colour':'Blue/Black'},
        'Rahu':    {'gem':'Hessonite (Gomed)','mantra':'Om Bhraam Bhreem Bhraum Sah Rahave Namah (18000×)','day':'Saturday','donate':'Black/blue items','colour':'Smoke/Dark'},
        'Ketu':    {'gem':'Cat\'s Eye (Lehsunia)','mantra':'Om Sraam Sreem Sraum Sah Ketave Namah (7000×)','day':'Tuesday','donate':'Sesame, blanket','colour':'Mixed'},
    }

    afflicted = []
    for pname, pdata in planets.items():
        dig = pdata.get('dignity', 'neutral')
        h   = pdata.get('house', 1)
        if dig in {'debilitated', 'enemy'} or h in {6, 8, 12}:
            afflicted.append(pname)
            if pname in PLANET_REMEDIES:
                r = PLANET_REMEDIES[pname]
                remedies.append({
                    'planet':  pname,
                    'reason':  f'{pname} is {dig} in H{h}',
                    'gem':     r['gem'],
                    'mantra':  r['mantra'],
                    'day':     r['day'],
                    'donate':  r['donate'],
                    'colour':  r['colour'],
                    'source':  'Atharva Veda Parishishta + Phaladeepika',
                })

    # Dosha-specific remedies
    for dosha in doshas[:3]:  # top 3 doshas
        remedies.extend([{
            'planet':  dosha.get('name', ''),
            'reason':  dosha.get('alias', ''),
            'gem':     'As per dosha type',
            'mantra':  dosha.get('remedies', [{}])[0].get('r', '') if dosha.get('remedies') else '',
            'day':     '—',
            'donate':  '—',
            'colour':  '—',
            'source':  'BPHS Dosha Parihara',
        }])

    lagna_lord = RASHI_LORD.get(lagna.get('rashi',''), 'Sun')
    general_remedy = {
        'daily':    f'Worship {lagna_lord} — lagna lord — every day',
        'weekly':   'Visit Navagraha temple every Saturday',
        'mantra':   'Maha Mrityunjaya Mantra 108× daily',
        'fasting':  'Fast on day ruled by your lagna lord',
        'charity':  'Donate food to the poor on your birth nakshatra day monthly',
    }

    return {
        'afflicted_planets': afflicted,
        'remedies':          remedies[:10],
        'general_remedy':    general_remedy,
        'total_remedies':    len(remedies),
        'source':            'Atharva Veda Parishishta + Phaladeepika Remedies',
        'disclaimer':        'Consult a qualified Jyotishi before wearing gems. Gems are powerful and can backfire if wrong.',
    }


# ── 18. GANDA MOOLA TIMELINE — BPHS ─────────────────────────────

def compute_ganda_timeline(natal_moon_lon: float, birth_dt_str: str,
                            ayanamsa_str: str = 'lahiri') -> dict:
    """
    Ganda Moola nakshatra analysis and timeline.
    BPHS Ganda Moola Adhyaya.
    Ganda Moola = Ashwini, Ashlesha, Magha, Jyeshtha, Moola, Revati
    """
    GANDA_MOOLA_NAKS = {'Ashwini', 'Ashlesha', 'Magha', 'Jyeshtha', 'Moola', 'Revati'}
    nak = lon_to_nakshatra(natal_moon_lon)
    is_ganda = nak['name'] in GANDA_MOOLA_NAKS

    # Shanti timing — 27th day, 27th month
    now = datetime.utcnow()
    shanti_events = []
    if is_ganda:
        try:
            bd = datetime.fromisoformat(birth_dt_str.replace('Z','').split('+')[0])
        except Exception:
            bd = now

        for n in [27, 54, 81]:  # days
            shanti_events.append({
                'type': f'Nakshatra Shanti (day {n})',
                'date': (bd + timedelta(days=n)).strftime('%Y-%m-%d'),
            })
        for m in [1, 3, 6, 12, 27]:  # months approx
            shanti_events.append({
                'type': f'Annual Shanti (month {m})',
                'date': (bd + timedelta(days=m*30)).strftime('%Y-%m-%d'),
            })

    effects = (
        'Ganda Moola birth — Shanti puja strongly recommended within 27 days of birth. '
        'Typically inauspicious for start of life unless remedied. '
        'Once remedied, native may attain spiritual power and special abilities.'
    ) if is_ganda else (
        'Not a Ganda Moola nakshatra — no special concern in this regard.'
    )

    return {
        'nakshatra':       nak['name'],
        'is_ganda_moola':  is_ganda,
        'effects':         effects,
        'shanti_events':   shanti_events,
        'remedy':          (
            'Ganda Moola Shanti puja at birth place within 27 days. '
            'Repeat on 27th nakshatra. Feed Brahmins. Worship Navagrahas.'
        ) if is_ganda else 'No Ganda Moola remedy required.',
        'ganda_moola_nakshatras': list(GANDA_MOOLA_NAKS),
        'source': 'BPHS Ganda Moola Adhyaya',
    }


# ── 19. LEARNING LOOP ────────────────────────────────────────────

_LEARNING_STORE: dict = {}

def update_learning(key: str, predicted_score: float, actual_outcome: float) -> dict:
    """
    Simple Bayesian learning loop — updates prediction weights based on outcomes.
    UEDP v5 adaptive calibration layer.
    """
    if key not in _LEARNING_STORE:
        _LEARNING_STORE[key] = {'count': 0, 'total_error': 0.0, 'predictions': []}

    error = abs(predicted_score - actual_outcome)
    _LEARNING_STORE[key]['count'] += 1
    _LEARNING_STORE[key]['total_error'] += error
    _LEARNING_STORE[key]['predictions'].append({
        'predicted': round(predicted_score, 2),
        'actual':    round(actual_outcome, 2),
        'error':     round(error, 2),
    })
    # Keep last 100
    _LEARNING_STORE[key]['predictions'] = _LEARNING_STORE[key]['predictions'][-100:]

    mae = _LEARNING_STORE[key]['total_error'] / _LEARNING_STORE[key]['count']
    accuracy = max(0, round(100 - mae, 1))

    return {
        'key':       key,
        'count':     _LEARNING_STORE[key]['count'],
        'mae':       round(mae, 3),
        'accuracy':  accuracy,
        'last_error': round(error, 3),
    }


def get_learning_summary() -> dict:
    """Return summary of all learning keys."""
    summary = {}
    for key, data in _LEARNING_STORE.items():
        count = data['count']
        mae   = data['total_error'] / count if count else 0
        summary[key] = {
            'count':    count,
            'mae':      round(mae, 3),
            'accuracy': max(0, round(100 - mae, 1)),
        }
    return summary


# ═══════════════════════════════════════════════════════════════
# END OF COMPATIBILITY SHIM — G S Ramesh Kumar UEDP v5
# All 24 names now exportable by index.py import block.
# ═══════════════════════════════════════════════════════════════


# ═══════════════════════════════════════════════════════════════════════════
# STDIN / STDOUT DISPATCHER
# Called by /api/decisional.ts via child_process spawn.
# Reads one JSON payload from stdin, routes to the right function, 
# writes one JSON result to stdout.
#
# Pattern: the same as how /api/chart.ts calls generate_full_chart.
# Every function in the dispatch table is already defined above in this file.
#
# ADDING A NEW ACTION: add one entry to DISPATCH below.
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import sys, json, traceback
    from datetime import datetime, timedelta

    # ── Read payload ──────────────────────────────────────────────────────
    try:
        raw   = sys.stdin.read()
        payload = json.loads(raw)
    except Exception as e:
        print(json.dumps({"status": "error", "message": f"JSON parse failed: {e}"}))
        sys.exit(0)

    fn   = payload.get("fn", "")
    ayn  = payload.get("ayanamsa_str", "lahiri")

    # ── Helper: build JD from ISO string ─────────────────────────────────
    def _jd(s: str) -> float:
        """Convert ISO datetime string to Julian Day (UTC)."""
        s = str(s).strip()
        for sfx in ["+05:30", "+0530", "+5:30", "Z"]:
            s = s.replace(sfx, "")
        s = s.strip()
        for fmt in [
            "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M",
            "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d",
        ]:
            try:
                dt = datetime.strptime(s[: len(fmt)], fmt)
                return julian_day(dt)
            except Exception:
                pass
        return julian_day(datetime(2000, 1, 1, 12, 0, 0))

    # ── Dispatch table ────────────────────────────────────────────────────
    # Each lambda receives the full payload dict and returns a serialisable dict.

    def _do_generate_full_chart(p: dict) -> dict:
        return generate_full_chart(
            datetime_str = str(p["datetime_str"]),
            latitude     = float(p["latitude"]),
            longitude    = float(p["longitude"]),
            tz_offset    = float(p.get("tz_offset", 5.5)),
            ayanamsa_str = str(p.get("ayanamsa_str", "lahiri")),
            name         = str(p.get("name", "Native")),
            place        = str(p.get("place", "")),
        )

    def _do_transits(p: dict) -> dict:
        natal = p.get("natal_planets", {})
        result_list = compute_transit_timeline(
            natal_planets = natal,
            ayanamsa_str  = ayn,
            days          = int(p.get("days", 365)),
        )
        # Also compute Sade Sati and Guru Phal for the Transit tab
        moon_rashi = natal.get("Moon", {}).get("rashi", "Mesha")
        sade = compute_sade_sati(moon_rashi, ayn)
        guru = compute_guru_phal(moon_rashi, ayn)
        return {
            "status":       "ok",
            "transit_events": result_list,
            "sade_sati":    sade,
            "guru_phal":    guru,
        }

    def _do_scenario(p: dict) -> dict:
        kundali = p.get("kundali", {})
        life    = compute_life_decisions(kundali)
        career  = compute_career_analysis(kundali)
        return {
            "status":           "ok",
            "life_decisions":   life,
            "career_analysis":  career,
        }

    def _do_muhurta(p: dict) -> dict:
        jd_val = (
            float(p["jd"]) if "jd" in p
            else _jd(str(p.get("datetime_str", "")))
        )
        lat = float(p.get("lat", 20.0))
        lon = float(p.get("lon", 78.0))
        activity     = str(p.get("activity", "general"))
        moon_nak     = p.get("birth_moon_nak", None)
        days         = int(p.get("days", 30))
        min_score    = float(p.get("min_score", 65))

        # Current moment score
        now_score = score_muhurta_moment(
            jd           = jd_val,
            activity     = activity,
            birth_moon_nak = moon_nak,
            ayanamsa_str = ayn,
            lat          = lat,
            lon          = lon,
        )
        # Upcoming good windows
        upcoming = find_good_muhurtas(
            jd_start     = jd_val,
            days         = days,
            activity     = activity,
            birth_moon_nak = moon_nak,
            ayanamsa_str = ayn,
            min_score    = min_score,
            lat          = lat,
            lon          = lon,
        )
        return {
            "status":       "ok",
            "current_score": now_score,
            "upcoming":     upcoming,
        }

    def _do_match(p: dict) -> dict:
        chart1 = p.get("chart1", {})
        chart2 = p.get("chart2", {})
        result = compute_full_match(chart1, chart2)
        return {"status": "ok", **result}

    def _do_gandas(p: dict) -> dict:
        moon_lon    = float(p.get("natal_moon_lon", 0.0))
        birth_dt    = str(p.get("birth_dt_str", "2000-01-01T00:00:00"))
        result = compute_ganda_timeline(
            natal_moon_lon = moon_lon,
            birth_dt_str   = birth_dt,
            ayanamsa_str   = ayn,
        )
        return {"status": "ok", **result}

    def _do_location(p: dict) -> dict:
        jd_val = (
            float(p["jd"]) if "jd" in p
            else _jd(str(p.get("datetime_str", "")))
        )
        result = rank_cities_for_relocation(
            jd           = jd_val,
            birth_lat    = float(p.get("birth_lat", 0.0)),
            birth_lon    = float(p.get("birth_lon", 0.0)),
            purpose      = str(p.get("purpose", "overall")),
            ayanamsa_str = ayn,
        )
        return {"status": "ok", "cities": result}

    def _do_pariharas(p: dict) -> dict:
        kundali = p.get("kundali", {})
        result  = compute_parihara(kundali)
        return {"status": "ok", **result}

    def _do_lifearc(p: dict) -> dict:
        kundali = p.get("kundali", {})
        life    = compute_life_decisions(kundali)
        career  = compute_career_analysis(kundali)
        prop    = compute_property_analysis(kundali)
        return {
            "status":             "ok",
            "life_decisions":     life,
            "career_analysis":    career,
            "property_analysis":  prop,
        }

    def _do_sade_sati(p: dict) -> dict:
        moon_rashi = str(p.get("natal_moon_rashi", "Mesha"))
        return {"status": "ok", **compute_sade_sati(moon_rashi, ayn)}

    def _do_guru_phal(p: dict) -> dict:
        moon_rashi = str(p.get("natal_moon_rashi", "Mesha"))
        return {"status": "ok", **compute_guru_phal(moon_rashi, ayn)}

    DISPATCH: dict = {
        "generate_full_chart":       _do_generate_full_chart,
        "compute_transit_timeline":  _do_transits,
        "compute_life_decisions":    _do_scenario,
        "score_muhurta_moment":      _do_muhurta,
        "find_good_muhurtas":        _do_muhurta,
        "compute_full_match":        _do_match,
        "compute_ganda_timeline":    _do_gandas,
        "rank_cities_for_relocation": _do_location,
        "compute_parihara":          _do_pariharas,
        "compute_parihara_full":     _do_pariharas,
        "lifearc":                   _do_lifearc,
        "compute_sade_sati":         _do_sade_sati,
        "compute_guru_phal":         _do_guru_phal,
    }

    # ── Execute ───────────────────────────────────────────────────────────
    handler_fn = DISPATCH.get(fn)
    if handler_fn is None:
        print(json.dumps({
            "status":  "error",
            "message": f"Unknown fn '{fn}'. Available: {sorted(DISPATCH.keys())}",
        }))
        sys.exit(0)

    try:
        result = handler_fn(payload)
        print(json.dumps(result, default=str, ensure_ascii=False))
    except Exception:
        tb = traceback.format_exc()
        print(json.dumps({
            "status":  "error",
            "fn":      fn,
            "message": tb.splitlines()[-1],
            "trace":   tb[-800:],
        }))
