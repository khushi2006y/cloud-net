from typing import List, Set, Optional


def calculate_source_independence(
    root_origin_a: Optional[str],
    upstream_a: List[str],
    root_origin_b: Optional[str],
    upstream_b: List[str]
) -> float:
    """
    Computes the Source Independence Coefficient between two data lineages.

    Mathematical Foundation:
      1. Root Identity Gate: If root_origin_a == root_origin_b, both reports
         originate from the identical primary causal source (circular echo loop).
         Independence = 0.0 (contributes zero corroboration weight).
      2. Jaccard Intermediary Overlap: When roots differ, independence is evaluated
         against shared intermediary relays using the Jaccard distance metric:
         J(A, B) = |Upstream(A) ∩ Upstream(B)| / |Upstream(A) ∪ Upstream(B)|
         Independence = 1.0 - J(A, B)

    Returns:
      Float in range [0.0, 1.0], where 1.0 = fully independent, 0.0 = circular echo.
    """
    if not root_origin_a or not root_origin_b:
        return 1.0  # Assumed independent if lineage metadata absent

    if root_origin_a == root_origin_b:
        return 0.0  # Shared root origin -> circular validation loop

    set_a: Set[str] = set(s.strip().lower() for s in (upstream_a or []) if s.strip())
    set_b: Set[str] = set(s.strip().lower() for s in (upstream_b or []) if s.strip())

    if not set_a and not set_b:
        return 1.0

    shared = len(set_a.intersection(set_b))
    total_union = len(set_a.union(set_b))

    if total_union == 0:
        return 1.0

    jaccard_overlap = float(shared) / float(total_union)
    return max(0.0, min(1.0, 1.0 - jaccard_overlap))
