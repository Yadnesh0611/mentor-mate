from typing import Tuple

class BKTService:
    @staticmethod
    def update_mastery(
        prior_p_l: float,
        is_correct: bool,
        p_t: float = 0.15,
        p_g: float = 0.20,
        p_s: float = 0.10
    ) -> Tuple[float, float]:
        """
        Computes Bayesian Knowledge Tracing posterior mastery probability P(L_t).
        Returns (p_l_evidence, posterior_p_l_next)
        """
        # Clamp prior to valid probability range (0.01, 0.99)
        prior = max(0.01, min(0.99, prior_p_l))

        if is_correct:
            numerator = prior * (1.0 - p_s)
            denominator = numerator + ((1.0 - prior) * p_g)
        else:
            numerator = prior * p_s
            denominator = numerator + ((1.0 - prior) * (1.0 - p_g))

        p_l_evidence = numerator / denominator if denominator > 0 else prior

        # Transition to next latent opportunity
        posterior_p_l = p_l_evidence + ((1.0 - p_l_evidence) * p_t)
        posterior_p_l = max(0.01, min(0.99, posterior_p_l))

        return round(p_l_evidence, 4), round(posterior_p_l, 4)

    @staticmethod
    def classify_proficiency(p_l: float) -> str:
        if p_l >= 0.85:
            return "Mastery"
        elif p_l >= 0.70:
            return "Proficient"
        elif p_l >= 0.50:
            return "Developing"
        else:
            return "Critical Support"

bkt_service = BKTService()
