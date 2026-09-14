import math
from typing import List, Dict, Any

class IRTService:
    @staticmethod
    def probability_correct(theta: float, difficulty_b: float, discrimination_a: float = 1.0) -> float:
        """
        Calculates 2PL IRT response probability:
        P(Y=1 | theta) = 1 / (1 + exp(-a * (theta - b)))
        """
        exponent = -discrimination_a * (theta - difficulty_b)
        # Avoid numerical overflow
        if exponent > 40:
            return 0.0
        elif exponent < -40:
            return 1.0
        return 1.0 / (1.0 + math.exp(exponent))

    @staticmethod
    def estimate_ability_map(
        responses: List[Dict[str, Any]],
        prior_mean: float = 0.0,
        prior_variance: float = 1.0,
        max_iterations: int = 25
    ) -> float:
        """
        Estimates latent ability theta via Maximum A Posteriori (MAP) estimation.
        responses: list of dicts with keys 'is_correct' (bool), 'difficulty' (float), 'discrimination' (float)
        """
        if not responses:
            return prior_mean

        theta = prior_mean
        for _ in range(max_iterations):
            first_derivative = -(theta - prior_mean) / prior_variance
            second_derivative = -1.0 / prior_variance

            for r in responses:
                u = 1.0 if r.get("is_correct") else 0.0
                b = r.get("difficulty", 0.5)
                a = r.get("discrimination", 1.0)
                p = IRTService.probability_correct(theta, b, a)
                q = 1.0 - p

                first_derivative += a * (u - p)
                second_derivative -= (a ** 2) * p * q

            if abs(second_derivative) < 1e-6:
                break

            delta = first_derivative / second_derivative
            theta -= delta
            if abs(delta) < 1e-4:
                break

        # Clamp ability within reasonable standardized range [-3.0, +3.0]
        return round(max(-3.0, min(3.0, theta)), 2)

irt_service = IRTService()
