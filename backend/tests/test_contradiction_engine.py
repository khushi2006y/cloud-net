from app.intelligence.contradiction_engine import check_semantic_contradictions, check_physical_invariants


def test_semantic_contradiction_detection():
    # Rain category but description says sunny day
    is_contra, reason = check_semantic_contradictions("Completely sunny day with bright sun and clear sky", "rainfall")
    assert is_contra is True
    assert "Semantic Contradiction" in reason

    # Heatwave category but description says freezing cold
    is_contra_heat, reason_heat = check_semantic_contradictions("Freezing cold snow storm sub zero sweater weather", "heatwave")
    assert is_contra_heat is True

    # Valid consistent rain report
    is_contra_valid, _ = check_semantic_contradictions("Heavy downpour with continuous rain showers", "rainfall")
    assert is_contra_valid is False


def test_physical_invariants_validation():
    # Cyclonic pressure (<980) with calm wind (<15) -> Sensor failure
    is_valid, reason = check_physical_invariants(pressure_hpa=965.0, wind_speed_kmh=8.0)
    assert is_valid is False
    assert "Physical Sensor Failure" in reason

    # Heavy rain (>50mm) with warm cloud top (>-10C) -> Model error
    is_valid_rain, reason_rain = check_physical_invariants(rainfall_mm=65.0, cloud_top_temp_c=5.0)
    assert is_valid_rain is False
    assert "Physical Invariant Conflict" in reason_rain

    # Physically sound readings
    is_valid_sound, _ = check_physical_invariants(pressure_hpa=970.0, wind_speed_kmh=75.0, rainfall_mm=20.0, temperature_c=28.0)
    assert is_valid_sound is True
