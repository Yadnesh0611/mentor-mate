import math
from datetime import datetime, timezone, timedelta
from typing import Tuple

class RetentionService:
    @staticmethod
    def calculate_retention(elapsed_days: float, half_life_days_h: float) -> float:
        """
        Calculates exponential retention using the half-life model:
        R(t) = 2^(-t / H)
        
        Where:
        t = elapsed time in days
        H = memory half-life in days
        
        Note: This is an exponential retention / half-life model,
        not Ebbinghaus's original empirical formula.
        """
        if half_life_days_h <= 0:
            raise ValueError("Memory half-life H must be greater than zero.")
        if elapsed_days < 0:
            raise ValueError("Elapsed time t cannot be negative.")

        # R = math.pow(2.0, -t / H)
        exponent = -elapsed_days / half_life_days_h
        retention = math.pow(2.0, exponent)

        # Ensure bounds and guard against NaN/Inf
        if math.isnan(retention) or math.isinf(retention):
            raise ValueError("Calculated retention produced NaN or Infinity.")

        return round(max(0.0, min(1.0, retention)), 6)

    @staticmethod
    def update_half_life_after_review(
        current_half_life_h: float,
        is_remembered: bool,
        current_retention: float
    ) -> Tuple[float, datetime]:
        """
        Mentor Mate revision heuristic:
        When remembered:
        H_new = H_old * (1.0 + 1.8 * (1.0 - R))
        
        When forgotten:
        H_new = max(1.0, H_old * 0.5)
        
        Labeled strictly as Mentor Mate revision heuristic.
        Do NOT present as Ebbinghaus's original equation.
        """
        if current_half_life_h <= 0:
            current_half_life_h = 1.0

        clamped_r = max(0.0, min(1.0, current_retention))

        if is_remembered:
            # Mentor Mate revision heuristic:
            # H_new = H_old * (1 + 1.8 * (1 - R))
            multiplier = 1.0 + (1.8 * (1.0 - clamped_r))
            new_h = max(1.0, current_half_life_h * multiplier)
        else:
            # Lapsed recall: reset toward baseline half-life
            new_h = max(1.0, current_half_life_h * 0.5)

        # Schedule next review when R(t) drops to retrieval threshold (0.60)
        # R(t) = 2^(-t / H) = 0.60  =>  -t / H = log2(0.60)  =>  t = -H * log2(0.60)
        # -log2(0.60) ≈ 0.7369655941662062
        days_until_next_review = max(0.5, new_h * 0.736966)
        now = datetime.now(timezone.utc)
        next_review_at = now + timedelta(days=days_until_next_review)

        return round(new_h, 2), next_review_at

    # Backward compatibility alias for any existing callers
    @classmethod
    def update_stability_after_review(cls, current_stability_s: float, is_remembered: bool, current_retention: float):
        return cls.update_half_life_after_review(current_stability_s, is_remembered, current_retention)

retention_service = RetentionService()
