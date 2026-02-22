"""Statistical calculation functions for experiments.

Sign convention: All difference calculations use (treatment - control) convention.
This means positive values indicate treatment performed better than control.
"""
from typing import Tuple, Optional, List
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
    
    # Ensure valid rates — use a very small floor to support low-conversion baselines (e.g., 0.8%)
    treatment_rate = max(0.0001, min(0.9999, treatment_rate))
    baseline_rate = max(0.0001, min(0.9999, baseline_rate))
    
    # Use statsmodels power analysis
    effect_size = abs(treatment_rate - baseline_rate)
    
    if effect_size == 0:
        return 1000  # Default fallback — cannot detect zero effect
    
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
) -> Tuple[float, float, Tuple[float, float], float, List[str]]:
    """
    Calculate proportion difference test between two groups.
    
    Sign Convention: Uses (group2 - group1) = (treatment - control) convention.
    Positive values indicate group2 (treatment) performed better.
    
    Args:
        n1: Sample size for group 1 (control)
        x1: Success count for group 1 (control)
        n2: Sample size for group 2 (treatment)
        x2: Success count for group 2 (treatment)
        alpha: Significance level
    
    Returns:
        Tuple of (absolute_difference, relative_uplift_percent, (ci_lower, ci_upper), p_value, warnings)
        - absolute_difference: p_treatment - p_control (positive = treatment better)
        - relative_uplift_percent: ((p_treatment - p_control) / p_control) * 100
        - (ci_lower, ci_upper): 95% CI for the difference
        - p_value: two-sided p-value from z-test
        - warnings: list of warning messages about reliability
    """
    warnings = []
    
    p1 = x1 / n1 if n1 > 0 else 0.0  # control proportion
    p2 = x2 / n2 if n2 > 0 else 0.0  # treatment proportion
    
    # Difference: treatment - control (positive = treatment better)
    absolute_difference = p2 - p1
    
    if p1 > 0:
        relative_uplift_percent = (absolute_difference / p1) * 100
    else:
        relative_uplift_percent = 0.0 if absolute_difference == 0 else float('inf')
    
    # Check for edge cases that may make normal approximation unreliable
    min_expected = min(x1, x2, n1 - x1, n2 - x2)
    if min_expected < 5:
        warnings.append(
            f"Normal approximation may be unreliable: min(successes, failures) = {min_expected} < 5. "
            "Consider using exact tests or collecting more data."
        )
    
    # Check for zero conversions in either group
    if x1 == 0 or x2 == 0:
        warnings.append(
            "Zero conversions detected in one or both groups. "
            "Statistical estimates may be unstable."
        )
    
    # Check for very small sample sizes
    if n1 < 30 or n2 < 30:
        warnings.append(
            f"Small sample size detected (n1={n1}, n2={n2}). "
            "Consider collecting more data for reliable inference."
        )
    
    # Two-sample proportion z-test
    count = np.array([x1, x2])
    nobs = np.array([n1, n2])
    
    try:
        z_stat, p_value = proportions_ztest(count, nobs, alternative='two-sided')
    except Exception:
        # Fallback for edge cases
        p_value = 1.0
        warnings.append("Could not compute z-test. Defaulting p-value to 1.0.")
    
    # Confidence interval for difference using 'score' method (more accurate than 'wald')
    try:
        ci_lower, ci_upper = confint_proportions_2indep(
            x1, n1, x2, n2, alpha=alpha, method='score'
        )
    except:
        # Fallback to wald method if score fails
        try:
            ci_lower, ci_upper = confint_proportions_2indep(
                x1, n1, x2, n2, alpha=alpha, method='wald'
            )
        except:
            # Ultimate fallback
            se = np.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2) if n1 > 0 and n2 > 0 else 0
            ci_lower = absolute_difference - 1.96 * se
            ci_upper = absolute_difference + 1.96 * se
            warnings.append("Using Wald CI approximation due to numerical issues.")
    
    # Ensure correct order (lower should be <= upper)
    if ci_lower > ci_upper:
        ci_lower, ci_upper = ci_upper, ci_lower
    
    return absolute_difference, relative_uplift_percent, (ci_lower, ci_upper), p_value, warnings


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


def check_sample_ratio_mismatch(
    observed_counts: List[int],
    expected_ratios: Optional[List[float]] = None,
    alpha: float = 0.01
) -> Tuple[bool, float, str]:
    """
    Check for Sample Ratio Mismatch (SRM) using chi-square test.
    
    SRM indicates a potential problem with the randomization or data collection
    that could invalidate the experiment results.
    
    Args:
        observed_counts: List of observed user counts per variant [n_control, n_treatment, ...]
        expected_ratios: Expected allocation ratios (e.g., [0.5, 0.5] for 50/50).
                        Defaults to equal allocation across all variants.
        alpha: Significance level for SRM detection (default 0.01 for stricter threshold)
    
    Returns:
        Tuple of (has_srm, p_value, message)
        - has_srm: True if SRM detected (p < alpha)
        - p_value: p-value from chi-square test
        - message: Human-readable warning message
    """
    if expected_ratios is None:
        # Default to equal allocation
        n_variants = len(observed_counts)
        expected_ratios = [1.0 / n_variants] * n_variants
    
    # Validate inputs
    if len(observed_counts) != len(expected_ratios):
        return False, 1.0, "Mismatched counts and ratios length."
    
    if abs(sum(expected_ratios) - 1.0) > 0.01:
        # Normalize ratios
        total = sum(expected_ratios)
        expected_ratios = [r / total for r in expected_ratios]
    
    total_users = sum(observed_counts)
    expected_counts = [total_users * ratio for ratio in expected_ratios]
    
    # Chi-square test
    try:
        chi2_stat, p_value = stats.chisquare(
            f_obs=observed_counts,
            f_exp=expected_counts
        )
    except Exception:
        return False, 1.0, "Could not compute SRM test."
    
    has_srm = p_value < alpha
    
    if has_srm:
        # Calculate observed vs expected percentages for message
        observed_pcts = [c / total_users * 100 for c in observed_counts]
        expected_pcts = [r * 100 for r in expected_ratios]
        
        observed_str = "/".join([f"{p:.1f}%" for p in observed_pcts])
        expected_str = "/".join([f"{p:.1f}%" for p in expected_pcts])
        
        message = (
            f"⚠️ Possible SRM / allocation issue detected (p = {p_value:.4f}). "
            f"Observed: {observed_str}, Expected: {expected_str}. "
            "This may indicate problems with randomization, data collection, or bot traffic. "
            "Interpret statistical results with caution."
        )
    else:
        message = ""
    
    return has_srm, p_value, message
