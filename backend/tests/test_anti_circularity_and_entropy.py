from app.intelligence.anti_circularity import calculate_source_independence
from app.intelligence.diversity_scorer import calculate_cluster_diversity_weight


def test_anti_circularity_dag_lineage():
    # Same root origin -> 0.0 independence (circular echo chamber)
    indep_echo = calculate_source_independence(
        root_origin_a="sensor-aws-palam-01",
        upstream_a=["imd-primary", "mausam-news"],
        root_origin_b="sensor-aws-palam-01",
        upstream_b=["imd-primary", "twitter-news-bot"]
    )
    assert indep_echo == 0.0

    # Distinct root origins with disjoint upstream paths -> 1.0 independence
    indep_distinct = calculate_source_independence(
        root_origin_a="sensor-aws-colaba",
        upstream_a=["imd-mumbai"],
        root_origin_b="citizen-gps-bandra-witness",
        upstream_b=["cloudnet-mobile-app"]
    )
    assert indep_distinct == 1.0


def test_shannon_entropy_botnet_neutralization():
    # Coordinated botnet: identical text and identical subnet/tower
    bot_subnets = ["192.168.1.0/24"] * 10
    bot_towers = ["TOWER-DL-01"] * 10
    bot_descriptions = ["flood near gate emergency rescue"] * 10

    bot_weight = calculate_cluster_diversity_weight(bot_subnets, bot_towers, bot_descriptions)
    assert bot_weight <= 0.35  # Heavily collapsed due to identical subnet/tower

    # High diversity real crowd: distinct subnets, towers, and diverse descriptions
    diverse_subnets = [f"10.0.{i}.0/24" for i in range(5)]
    diverse_towers = [f"BTS-{i}" for i in range(5)]
    diverse_descriptions = [
        "Waterlogging reaching knee height near metro pillar 45",
        "Traffic is completely diverted because the underpass is submerged",
        "Severe torrential downpour causing drainage overflow on main road",
        "Pumps are working but rain is still heavy in our sector",
        "Cars are floating near the market parking area"
    ]

    human_weight = calculate_cluster_diversity_weight(diverse_subnets, diverse_towers, diverse_descriptions)
    assert human_weight >= 0.70
