"""Unit tests for causal_analyzer module."""
import pytest
from app.services.causal_analyzer import calculate_did, calculate_uplift_model


def test_calculate_did():
    """Test Difference-in-Differences calculation."""
    # Synthetic data: treatment improves, control stays flat
    # Treatment: pre=0.10, post=0.15 (5pp increase)
    # Control: pre=0.10, post=0.10 (no change)
    # Expected DiD: (0.15 - 0.10) - (0.10 - 0.10) = 0.05
    
    result = calculate_did(
        treatment_pre=0.10,
        treatment_post=0.15,
        control_pre=0.10,
        control_post=0.10,
        treatment_pre_n=1000,
        treatment_post_n=1000,
        control_pre_n=1000,
        control_post_n=1000,
        metric_type="proportion"
    )
    
    assert result["did_estimate"] == pytest.approx(0.05, abs=0.001)
    assert result["pre_difference"] == pytest.approx(0.0, abs=0.001)
    assert result["post_difference"] == pytest.approx(0.05, abs=0.001)
    assert result["ci_lower"] < result["ci_upper"]
    assert result["p_value"] is not None
    assert 0 <= result["p_value"] <= 1
    
    # Test with mean metric type
    result_mean = calculate_did(
        treatment_pre=10.0,
        treatment_post=15.0,
        control_pre=10.0,
        control_post=10.0,
        treatment_pre_n=1000,
        treatment_post_n=1000,
        control_pre_n=1000,
        control_post_n=1000,
        metric_type="mean"
    )
    
    assert result_mean["did_estimate"] == pytest.approx(5.0, abs=0.1)


def test_calculate_uplift_model():
    """Test uplift modeling with synthetic data."""
    # Create synthetic data with clear uplift signal
    data = []
    
    # Treatment group: higher conversion for feature A
    for i in range(200):
        data.append({
            "treatment": 1,
            "outcome": 1 if i < 60 else 0,  # 30% conversion
            "features": {"feature_a": 1 if i < 100 else 0}
        })
    
    # Control group: lower conversion
    for i in range(200):
        data.append({
            "treatment": 0,
            "outcome": 1 if i < 20 else 0,  # 10% conversion
            "features": {"feature_a": 1 if i < 100 else 0}
        })
    
    result = calculate_uplift_model(data)
    
    assert "buckets" in result
    assert len(result["buckets"]) == 3
    assert result["overall_average_uplift"] > 0  # Should be positive
    assert result["total_users"] == 400
    
    # Check bucket structure
    for bucket in result["buckets"]:
        assert "bucket_name" in bucket
        assert "average_predicted_uplift" in bucket
        assert "fraction_of_users" in bucket
        assert 0 <= bucket["fraction_of_users"] <= 1
    
    # High uplift bucket should have positive uplift
    high_bucket = next(b for b in result["buckets"] if b["bucket_name"] == "High Uplift")
    assert high_bucket["average_predicted_uplift"] > 0


def test_calculate_uplift_model_no_features():
    """Test uplift modeling without features."""
    # Simple case: just treatment and outcome
    data = []
    
    # Treatment: 30% conversion
    for i in range(100):
        data.append({
            "treatment": 1,
            "outcome": 1 if i < 30 else 0
        })
    
    # Control: 10% conversion
    for i in range(100):
        data.append({
            "treatment": 0,
            "outcome": 1 if i < 10 else 0
        })
    
    result = calculate_uplift_model(data)
    
    assert result["overall_average_uplift"] > 0
    assert result["total_users"] == 200


def test_calculate_uplift_model_error_cases():
    """Test uplift modeling error cases."""
    # Test with only treatment group
    data_treatment_only = [
        {"treatment": 1, "outcome": 1},
        {"treatment": 1, "outcome": 0}
    ]
    
    with pytest.raises(ValueError, match="Need both treatment and control"):
        calculate_uplift_model(data_treatment_only)
    
    # Test with only control group
    data_control_only = [
        {"treatment": 0, "outcome": 1},
        {"treatment": 0, "outcome": 0}
    ]
    
    with pytest.raises(ValueError, match="Need both treatment and control"):
        calculate_uplift_model(data_control_only)


