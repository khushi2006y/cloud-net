import pytest
from app.intelligence.nlp_classifier import LayeredNLPClassifier


def test_nlp_hindi_dialect_recognition():
    classifier = LayeredNLPClassifier(ai_enabled=True)

    # Rainfall with Hindi dialect
    res_rain = classifier.classify("Bahut tez barish aur barsaat ho rahi hai sadak par")
    assert res_rain["category"] in ["rainfall", "heavy_rainfall"]
    assert "barish" in res_rain["matched_keywords"]

    # Thunderstorm with bijli
    res_storm = classifier.classify("Bijli kadak rahi hai aur aakashiya bijli girne ka khatra hai")
    assert res_storm["category"] == "thunderstorm"
    assert "bijli" in res_storm["matched_keywords"]

    # Heatwave with loo
    res_heat = classifier.classify("Dopahar se bahut bhishan loo chal rahi hai garmi 45 degree")
    assert res_heat["category"] == "heatwave"
    assert any(k in res_heat["matched_keywords"] for k in ["loo", "garmi"])

    # Fog with kohra
    res_fog = classifier.classify("Subah se gehra kohra aur dhundh chhayi hui hai zero visibility")
    assert res_fog["category"] == "fog"
    assert any(k in res_fog["matched_keywords"] for k in ["kohra", "dhundh", "zero visibility"])


def test_nlp_spam_detection():
    classifier = LayeredNLPClassifier(ai_enabled=True)
    res = classifier.classify("Free bitcoin giveaway! Click bit.ly/win to earn crypto casino money today!")
    assert res["spam_score"] >= 45.0
    assert len(res["spam_reasons"]) > 0


def test_nlp_ai_unavailable_fallback():
    classifier_fallback = LayeredNLPClassifier(ai_enabled=False)
    res = classifier_fallback.classify("Severe cloudburst and torrential rainfall flooding streets")
    assert res["category"] in ["rainfall", "heavy_rainfall", "flooding"]
    assert "AI ANALYSIS UNAVAILABLE" in res["ai_status"]
