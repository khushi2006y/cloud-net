import math
import re
from typing import List, Dict, Any


def calculate_shannon_entropy(words: List[str]) -> float:
    """
    Computes Shannon Information Entropy:
    H(X) = - SUM( p(x) * log2(p(x)) )
    """
    if not words:
        return 0.0

    total_count = len(words)
    freq_map: Dict[str, int] = {}
    for w in words:
        freq_map[w] = freq_map.get(w, 0) + 1

    entropy = 0.0
    for count in freq_map.values():
        p = count / total_count
        entropy -= p * math.log2(p)

    return entropy


def calculate_cluster_diversity_weight(
    subnets: List[str],
    cell_towers: List[str],
    descriptions: List[str]
) -> float:
    """
    Calculates a cluster diversity weight using network topology and Shannon linguistic entropy
    to neutralize coordinated Sybil attacks, botnets, and scripted troll campaigns.
    
    Formula:
      Network Diversity = (UniqueSubnets + UniqueCellTowers) / (2 * N)
      Linguistic Diversity = min(1.0, Entropy / 4.0)
      Composite Weight = max(0.1, 0.5 * NetworkDiversity + 0.5 * LinguisticDiversity)
    """
    total_reports = len(descriptions)
    if total_reports == 0:
        return 0.0
    if total_reports == 1:
        return 1.0

    # 1. Network / Infrastructure Diversity
    unique_subnets = len(set(s.strip() for s in subnets if s and s.strip()))
    unique_towers = len(set(t.strip() for t in cell_towers if t and t.strip()))

    # If telemetry omitted, default to conservative baseline
    effective_subnets = max(1, unique_subnets)
    effective_towers = max(1, unique_towers)

    network_diversity = (effective_subnets + effective_towers) / (total_reports * 2.0)

    # 2. Shannon Linguistic Entropy
    all_tokens: List[str] = []
    for desc in descriptions:
        tokens = [w.lower() for w in re.findall(r"\b\w+\b", desc) if len(w) > 1]
        all_tokens.extend(tokens)

    entropy = calculate_shannon_entropy(all_tokens)
    linguistic_diversity = min(1.0, entropy / 4.0)

    # Final Combined Diversity Multiplier (clamped between 0.1 and 1.0)
    composite_weight = (network_diversity * 0.5) + (linguistic_diversity * 0.5)
    return max(0.1, min(1.0, round(composite_weight, 3)))
