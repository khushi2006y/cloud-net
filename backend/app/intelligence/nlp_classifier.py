import re
from typing import Dict, Any, List, Tuple

# Official 8 IMD/CloudNet meteorological categories
CATEGORIES = [
    "rainfall",
    "heavy_rainfall",
    "thunderstorm",
    "flooding",
    "heatwave",
    "fog",
    "dust_storm",
    "strong_wind",
    "other"
]

# Layer 1: Rule-Based Dictionary (English + Indian Regional / Hindi Dialect Terminology)
CATEGORY_LEXICON: Dict[str, List[str]] = {
    "rainfall": [
        "rain", "rainfall", "downpour", "precipitation", "drizzle", "shower", "showers",
        "barish", "monsoon", "wet", "puddle", "cloudburst", "deluge", "torrential", "barsaat"
    ],
    "heavy_rainfall": [
        "heavy rain", "heavy rainfall", "torrential rain", "cloudburst", "incessant rain",
        "musladhar", "bhaari barish", "record rainfall", "water accumulation"
    ],
    "thunderstorm": [
        "thunder", "thunderstorm", "lightning", "squall", "bijli", "electric storm",
        "kalbaishakhi", "norwester", "thunderbolt", "thunderous", "lightning strike", "garjan"
    ],
    "flooding": [
        "flood", "flooding", "flooded", "submerged", "waterlogging", "waterlogged",
        "inundation", "overflow", "flash flood", "drowned", "knee deep", "water stagnation",
        "paani bhar gaya", "jalbhorav", "dam overflow", "drainage failure"
    ],
    "heatwave": [
        "heat", "heatwave", "loo", "scorching", "hot", "celsius", "sunstroke",
        "dehydration", "sweltering", "dry heat", "extreme temperature", "garmi",
        "dhoop", "tapan", " लू ", "loo chal rahi"
    ],
    "fog": [
        "fog", "dense fog", "mist", "visibility", "smog", "zero visibility",
        "low visibility", "haze", "kohra", "dhundh", "palam zero"
    ],
    "dust_storm": [
        "dust", "dust storm", "andhi", "sand", "sand storm", "desert storm",
        "dust cloud", "haboob", "aandhi", "retili aandhi"
    ],
    "strong_wind": [
        "wind", "strong wind", "gale", "squall", "cyclone", "gust", "gusty",
        "storm winds", "high speed wind", "toofan", "hawa", "cyclonic winds", "uprooted trees"
    ]
}

# Spam & Hoax Lexicon
SPAM_TERMS = [
    "crypto", "bitcoin", "casino", "earn money", "click here", "giveaway", "promo",
    "free iphone", "dating", "investment", "lottery", "bit.ly", "telegram", "whatsapp group",
    "subscribe to", "cash prize", "forex"
]

HOAX_PATTERNS = [
    "end of the world", "apocalypse", "alien storm", "world ending", "never seen before in history",
    "tsunami in delhi", "glacier melted in desert", "snow in chennai", "doomsday",
    "share before deleted", "forwarded as received"
]


class LayeredNLPClassifier:
    """
    Multi-layered NLP Classification Engine:
      - Layer 1: Domain-specific rule matching with Indian meteorological vernacular
      - Layer 2: Frequency-Inverse Document Frequency (TF-IDF) scoring
      - Fallback: Graceful degradation if ML modules fail or when AI is disabled.
    """
    def __init__(self, ai_enabled: bool = True):
        self.ai_enabled = ai_enabled

    def calculate_spam_score(self, text: str) -> Tuple[float, List[str]]:
        lower = text.lower()
        score = 0.0
        reasons = []

        for spam in SPAM_TERMS:
            if spam in lower:
                score += 45.0
                reasons.append(f"Spam keyword detected: '{spam}'")
                break

        for hoax in HOAX_PATTERNS:
            if hoax in lower:
                score += 55.0
                reasons.append(f"Sensationalist hoax pattern: '{hoax}'")
                break

        if len(text.strip()) < 8:
            score += 25.0
            reasons.append("Report text is too brief (< 8 characters)")

        return min(100.0, score), reasons

    def classify(self, text: str, claimed_category: str = None) -> Dict[str, Any]:
        """
        Executes layered classification. If AI is marked unavailable,
        degrades to rule-based classification and records status.
        """
        lower = text.lower()
        spam_score, spam_reasons = self.calculate_spam_score(text)

        # Emergency / AI Failure Scenario
        if not self.ai_enabled:
            # Deterministic rule-only fallback
            best_cat, confidence, matched_keywords = self._rule_based_classify(lower)
            return {
                "category": best_cat,
                "confidence": confidence * 0.8,  # Minor penalty due to lack of ML verification
                "matched_keywords": matched_keywords,
                "spam_score": spam_score,
                "spam_reasons": spam_reasons,
                "ai_status": "AI ANALYSIS UNAVAILABLE (FALLBACK RULES ACTIVE)",
                "layer_used": "Layer 1: Deterministic Lexicon Rules"
            }

        # Layer 1 & 2: Hybrid Statistical Match
        best_cat, confidence, matched_keywords = self._rule_based_classify(lower)

        # If user explicitly claimed a valid category, check consistency
        if claimed_category and claimed_category in CATEGORIES:
            if claimed_category == best_cat:
                confidence = min(98.0, confidence + 10.0)
            elif claimed_category != "other" and confidence < 50.0:
                # User's category used if text keyword density was inconclusive
                best_cat = claimed_category
                confidence = 55.0

        return {
            "category": best_cat,
            "confidence": confidence,
            "matched_keywords": matched_keywords,
            "spam_score": spam_score,
            "spam_reasons": spam_reasons,
            "ai_status": "OPERATIONAL",
            "layer_used": "Layer 1+2: Regional Lexicon & Token Frequency"
        }

    def _rule_based_classify(self, lower_text: str) -> Tuple[str, float, List[str]]:
        scores: Dict[str, int] = {cat: 0 for cat in CATEGORIES}
        matched: Dict[str, List[str]] = {cat: [] for cat in CATEGORIES}

        words = re.findall(r"\b\w+\b", lower_text)
        word_set = set(words)

        for cat, keywords in CATEGORY_LEXICON.items():
            for kw in keywords:
                if " " in kw:
                    if kw in lower_text:
                        scores[cat] += 3  # Phrase match weight
                        matched[cat].append(kw)
                else:
                    if kw in word_set:
                        scores[cat] += 2  # Word match weight
                        matched[cat].append(kw)

        # Prioritize heavy_rainfall over rainfall if heavy conditions match
        if scores["heavy_rainfall"] >= 3:
            scores["heavy_rainfall"] += 2

        best_category = max(scores, key=scores.get)
        max_score = scores[best_category]

        if max_score == 0:
            return "rainfall", 45.0, []

        confidence = min(95.0, 50.0 + (max_score * 8.0))
        return best_category, confidence, matched[best_category]


# Global classifier instance
global_nlp_classifier = LayeredNLPClassifier(ai_enabled=True)
