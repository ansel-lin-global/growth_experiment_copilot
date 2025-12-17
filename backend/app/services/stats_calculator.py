"""Statistical calculation functions for experiments."""
from typing import Tuple, Optional
import numpy as np
from scipy import stats
from statsmodels.stats.power import NormalIndPower
from statsmodels.stats.proportion import proportions_ztest, confint_proportions_2indep


def calculate_sample_size_proportion(
    baseline_rate: float,
    minimum_detectable_effect: float,
    alpha: float = 0.05,
    power: float = 0.8,
    effect_type: str = "relative"
) -> int:
    """
    Calculate required sample size per variant for a two-sample proportion test.
    
    Args:
        baseline_rate: Baseline conversion rate (0-1)
        minimum_detectable_effect: MDE as relative (0-1) or absolute (0-1)
        alpha: Significance level (default 0.05)
        power: Statistical power (default 0.8)
        effect_type: "relative" or "absolute"
    
    Returns:
        Required sample size per variant
    """
    if effect_type == "relative":
        treatment_rate = baseline_rate * (1 + minimum_detectable_effect)
    else:
        treatment_rate = baseline_rate + minimum_detectable_effect
    
    # Ensure valid rates
    treatment_rate = max(0.01, min(0.99, treatment_rate))
    baseline_rate = max(0.01, min(0.99, baseline_rate))
    
    # Use statsmodels power analysis
    effect_size = abs(treatment_rate - baseline_rate)
    std_effect = np.sqrt(baseline_rate * (1 - baseline_rate) + treatment_rate * (1 - treatment_rate))
    
    if std_effect == 0:
        return 1000  # Default fallback
    
    standardized_effect = effect_size / std_effect
    
    power_analysis = NormalIndPower()
    n_per_group = power_analysis.solve_power(
        effect_size=standardized_effect,
        alpha=alpha,
        power=power,
        ratio=1.0,
        alternative='two-sided'
    )
    
    return int(np.ceil(n_per_group))


def calculate_proportion_difference(
    n1: int,
    x1: int,
    n2: int,
    x2: int,
    alpha: float = 0.05
) -> Tuple[float, float, Tuple[float, float], float]:
    """
    Calculate proportion difference test between two groups.
    
    Args:
        n1: Sample size for group 1
        x1: Success count for group 1
        n2: Sample size for group 2
        x2: Success count for group 2
        alpha: Significance level
    
    Returns:
        Tuple of (absolute_difference, relative_uplift_percent, (ci_lower, ci_upper), p_value)
    """
    p1 = x1 / n1 if n1 > 0 else 0.0
    p2 = x2 / n2 if n2 > 0 else 0.0
    
    absolute_difference = p2 - p1
    
    if p1 > 0:
        relative_uplift_percent = (absolute_difference / p1) * 100
    else:
        relative_uplift_percent = 0.0 if absolute_difference == 0 else float('inf')
    
    # Two-sample proportion z-test
    count = np.array([x1, x2])
    nobs = np.array([n1, n2])
    z_stat, p_value = proportions_ztest(count, nobs, alternative='two-sided')
    
    # Confidence interval for difference using 'score' method (more accurate than 'wald')
    try:
        ci_lower, ci_upper = confint_proportions_2indep(
            x1, n1, x2, n2, alpha=alpha, method='score'
        )
    except:
        # Fallback to wald method if score fails
        ci_lower, ci_upper = confint_proportions_2indep(
            x1, n1, x2, n2, alpha=alpha, method='wald'
        )
    
    # Ensure correct order (lower should be <= upper)
    if ci_lower > ci_upper:
        ci_lower, ci_upper = ci_upper, ci_lower
    
    return absolute_difference, relative_uplift_percent, (ci_lower, ci_upper), p_value


def calculate_mean_difference(
    values1: np.ndarray,
    values2: np.ndarray,
    alpha: float = 0.05
) -> Tuple[float, float, Tuple[float, float], float]:
    """
    Calculate mean difference test between two groups (Welch's t-test).
    
    Args:
        values1: Array of values for group 1
        values2: Array of values for group 2
        alpha: Significance level
    
    Returns:
        Tuple of (absolute_difference, relative_uplift_percent, (ci_lower, ci_upper), p_value)
    """
    mean1 = np.mean(values1)
    mean2 = np.mean(values2)
    
    absolute_difference = mean2 - mean1
    
    if mean1 > 0:
        relative_uplift_percent = (absolute_difference / mean1) * 100
    else:
        relative_uplift_percent = 0.0 if absolute_difference == 0 else float('inf')
    
    # Welch's t-test (unequal variances)
    t_stat, p_value = stats.ttest_ind(values2, values1, equal_var=False)
    
    # Confidence interval
    n1, n2 = len(values1), len(values2)
    std1, std2 = np.std(values1, ddof=1), np.std(values2, ddof=1)
    se_diff = np.sqrt((std1**2 / n1) + (std2**2 / n2))
    t_critical = stats.t.ppf(1 - alpha/2, min(n1-1, n2-1))
    
    ci_lower = absolute_difference - t_critical * se_diff
    ci_upper = absolute_difference + t_critical * se_diff
    
    return absolute_difference, relative_uplift_percent, (ci_lower, ci_upper), p_value


def estimate_experiment_duration(
    sample_size_per_variant: int,
    num_variants: int,
    expected_daily_traffic: int
) -> Optional[int]:
    """
    Estimate experiment duration in days.
    
    Args:
        sample_size_per_variant: Required sample size per variant
        num_variants: Number of variants
        expected_daily_traffic: Expected daily traffic/users
    
    Returns:
        Estimated duration in days, or None if cannot be estimated
    """
    if expected_daily_traffic <= 0:
        return None
    
    total_sample_size = sample_size_per_variant * num_variants
    days = total_sample_size / expected_daily_traffic
    
    return int(np.ceil(days))

