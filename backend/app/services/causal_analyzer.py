"""Causal inference analysis functions."""
from typing import Dict, List, Tuple, Any
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from scipy import stats


def calculate_did(
    treatment_pre: float,
    treatment_post: float,
    control_pre: float,
    control_post: float,
    treatment_pre_n: int,
    treatment_post_n: int,
    control_pre_n: int,
    control_post_n: int,
    metric_type: str = "proportion"
) -> Dict[str, Any]:
    """
    Calculate Difference-in-Differences estimator.
    
    Args:
        treatment_pre: Treatment group metric in pre period
        treatment_post: Treatment group metric in post period
        control_pre: Control group metric in pre period
        control_post: Control group metric in post period
        treatment_pre_n: Sample size for treatment pre
        treatment_post_n: Sample size for treatment post
        control_pre_n: Sample size for control pre
        control_post_n: Sample size for control post
        metric_type: "proportion" or "mean"
    
    Returns:
        Dictionary with DiD results including estimate, CI, and p-value
    """
    # Pre-period difference
    pre_diff = treatment_pre - control_pre
    
    # Post-period difference
    post_diff = treatment_post - control_post
    
    # DiD estimator
    did_estimate = post_diff - pre_diff
    
    # Standard error calculation (simplified approach)
    # For proportions, use pooled variance
    if metric_type == "proportion":
        # Variance for treatment pre
        var_t_pre = (treatment_pre * (1 - treatment_pre)) / treatment_pre_n if treatment_pre_n > 0 else 0
        var_t_post = (treatment_post * (1 - treatment_post)) / treatment_post_n if treatment_post_n > 0 else 0
        var_c_pre = (control_pre * (1 - control_pre)) / control_pre_n if control_pre_n > 0 else 0
        var_c_post = (control_post * (1 - control_post)) / control_post_n if control_post_n > 0 else 0
        
        se_did = np.sqrt(var_t_pre + var_t_post + var_c_pre + var_c_post)
    else:
        # For means, use a simplified approach
        # In practice, you'd want more sophisticated variance estimation
        se_did = abs(did_estimate) * 0.1  # Simplified placeholder
    
    # 95% confidence interval
    z_critical = 1.96
    ci_lower = did_estimate - z_critical * se_did
    ci_upper = did_estimate + z_critical * se_did
    
    # P-value (two-sided z-test)
    if se_did > 0:
        z_stat = did_estimate / se_did
        p_value = 2 * (1 - stats.norm.cdf(abs(z_stat)))
    else:
        p_value = None
    
    return {
        "treatment_pre": treatment_pre,
        "treatment_post": treatment_post,
        "control_pre": control_pre,
        "control_post": control_post,
        "pre_difference": pre_diff,
        "post_difference": post_diff,
        "did_estimate": did_estimate,
        "ci_lower": ci_lower,
        "ci_upper": ci_upper,
        "p_value": p_value
    }


def calculate_uplift_model(
    data: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Simple uplift modeling using two separate logistic regression models.
    
    Args:
        data: List of dictionaries with 'treatment', 'outcome', and optional 'features'
    
    Returns:
        Dictionary with uplift results including bucket summaries
    """
    df = pd.DataFrame(data)
    
    # Separate treatment and control
    treatment_df = df[df['treatment'] == 1].copy()
    control_df = df[df['treatment'] == 0].copy()
    
    if len(treatment_df) == 0 or len(control_df) == 0:
        raise ValueError("Need both treatment and control groups")
    
    # Extract features if available
    if 'features' in df.columns and df['features'].notna().any():
        # Flatten features into columns
        feature_cols = []
        for idx, row in df.iterrows():
            if pd.notna(row.get('features')) and isinstance(row['features'], dict):
                for k, v in row['features'].items():
                    if k not in feature_cols:
                        feature_cols.append(k)
        
        # Create feature matrix
        X_treat = []
        X_control = []
        y_treat = []
        y_control = []
        
        for idx, row in df.iterrows():
            features = row.get('features', {}) or {}
            feature_vec = [features.get(col, 0) for col in feature_cols]
            
            if row['treatment'] == 1:
                X_treat.append(feature_vec)
                y_treat.append(row['outcome'])
            else:
                X_control.append(feature_vec)
                y_control.append(row['outcome'])
        
        X_treat = np.array(X_treat)
        X_control = np.array(X_control)
    else:
        # No features, use intercept only
        X_treat = np.ones((len(treatment_df), 1))
        X_control = np.ones((len(control_df), 1))
        y_treat = treatment_df['outcome'].values
        y_control = control_df['outcome'].values
    
    # Train models
    model_treat = LogisticRegression(max_iter=1000, random_state=42)
    model_control = LogisticRegression(max_iter=1000, random_state=42)
    
    model_treat.fit(X_treat, y_treat)
    model_control.fit(X_control, y_control)
    
    # Predict for all data
    if 'features' in df.columns and df['features'].notna().any():
        X_all = []
        for idx, row in df.iterrows():
            features = row.get('features', {}) or {}
            feature_vec = [features.get(col, 0) for col in feature_cols]
            X_all.append(feature_vec)
        X_all = np.array(X_all)
    else:
        X_all = np.ones((len(df), 1))
    
    p_treat = model_treat.predict_proba(X_all)[:, 1]
    p_control = model_control.predict_proba(X_all)[:, 1]
    
    # Calculate individual uplift
    uplift = p_treat - p_control
    
    # Bucket users
    n = len(uplift)
    sorted_indices = np.argsort(uplift)[::-1]  # Sort descending
    
    high_threshold = int(n * 0.3)
    medium_threshold = int(n * 0.7)
    
    high_uplift = uplift[sorted_indices[:high_threshold]]
    medium_uplift = uplift[sorted_indices[high_threshold:medium_threshold]]
    low_uplift = uplift[sorted_indices[medium_threshold:]]
    
    # Calculate bucket summaries
    high_avg_uplift = np.mean(high_uplift) if len(high_uplift) > 0 else 0.0
    medium_avg_uplift = np.mean(medium_uplift) if len(medium_uplift) > 0 else 0.0
    low_avg_uplift = np.mean(low_uplift) if len(low_uplift) > 0 else 0.0
    
    # Estimate incremental conversions if targeting high uplift
    high_fraction = len(high_uplift) / n if n > 0 else 0.0
    estimated_incremental = high_avg_uplift * len(high_uplift) if len(high_uplift) > 0 else 0.0
    
    return {
        "buckets": [
            {
                "bucket_name": "High Uplift",
                "average_predicted_uplift": float(high_avg_uplift),
                "fraction_of_users": high_fraction,
                "estimated_incremental_conversions": float(estimated_incremental)
            },
            {
                "bucket_name": "Medium Uplift",
                "average_predicted_uplift": float(medium_avg_uplift),
                "fraction_of_users": len(medium_uplift) / n if n > 0 else 0.0,
                "estimated_incremental_conversions": None
            },
            {
                "bucket_name": "Low/Negative Uplift",
                "average_predicted_uplift": float(low_avg_uplift),
                "fraction_of_users": len(low_uplift) / n if n > 0 else 0.0,
                "estimated_incremental_conversions": None
            }
        ],
        "overall_average_uplift": float(np.mean(uplift)),
        "total_users": n
    }


