"""
RaceIQ Machine Learning Analysis
Implements 7 ML algorithms including XGBoost and Hierarchical Clustering
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
from typing import List, Dict
from scipy.stats import pearsonr, spearmanr
from scipy.cluster.hierarchy import linkage, fcluster
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, precision_score, recall_score, f1_score, confusion_matrix
import warnings
warnings.filterwarnings('ignore')

# Try to import XGBoost, fallback to LightGBM if not available
try:
    import xgboost as xgb
    HAS_XGBOOST = True
    BOOSTING_LIB = 'XGBoost'
except ImportError:
    try:
        import lightgbm as lgb
        HAS_XGBOOST = False
        BOOSTING_LIB = 'LightGBM'
    except ImportError:
        HAS_XGBOOST = False
        BOOSTING_LIB = None
        print("Warning: Neither XGBoost nor LightGBM found. Install with: pip install xgboost")

def algorithm1_cross_track_correlation(features_df: pd.DataFrame) -> List[Dict]:
    """Algorithm 1: Cross-Track Correlation Analysis"""
    print("\n" + "="*60)
    print("ALGORITHM 1: Cross-Track Correlations")
    print("="*60)
    
    # Select numeric features for correlation
    numeric_features = [
        's1_mean', 's1_std', 's2_mean', 's2_std', 's3_mean', 's3_std',
        'lap_mean', 'lap_std', 'consistency_score', 'avg_speed_kph',
        'tire_degradation', 'clutch_score', 'sector_balance'
    ]
    
    # Pivot by track
    correlations = []
    
    tracks = features_df['track'].unique()
    
    for i, track1 in enumerate(tracks):
        for track2 in tracks[i+1:]:
            track1_data = features_df[features_df['track'] == track1][numeric_features].mean()
            track2_data = features_df[features_df['track'] == track2][numeric_features].mean()
            
            # Calculate correlations for each metric
            for metric in numeric_features:
                val1 = track1_data[metric]
                val2 = track2_data[metric]
                
                if not pd.isna(val1) and not pd.isna(val2):
                    # For cross-track, we compare driver performance patterns
                    track1_drivers = features_df[features_df['track'] == track1].groupby('driver')[metric].mean()
                    track2_drivers = features_df[features_df['track'] == track2].groupby('driver')[metric].mean()
                    
                    # Find common drivers
                    common_drivers = set(track1_drivers.index) & set(track2_drivers.index)
                    
                    if len(common_drivers) >= 3:
                        track1_values = [track1_drivers[d] for d in common_drivers]
                        track2_values = [track2_drivers[d] for d in common_drivers]
                        
                        pearson_r, pearson_p = pearsonr(track1_values, track2_values)
                        spearman_r, spearman_p = spearmanr(track1_values, track2_values)
                        
                        if pearson_p < 0.05 and abs(pearson_r) > 0.3:
                            correlations.append({
                                'track1': track1,
                                'track2': track2,
                                'metric': metric,
                                'pearson_r': float(pearson_r),
                                'pearson_p': float(pearson_p),
                                'spearman_r': float(spearman_r),
                                'strength': 'strong' if abs(pearson_r) > 0.7 else 'moderate',
                                'drivers_compared': len(common_drivers)
                            })
    
    # Sort by correlation strength
    correlations.sort(key=lambda x: abs(x['pearson_r']), reverse=True)
    
    print(f"Found {len(correlations)} significant correlations (p<0.05, |r|>0.3)")
    if correlations:
        print(f"Top correlation: {correlations[0]['track1']} ↔ {correlations[0]['track2']} ({correlations[0]['metric']}) = {correlations[0]['pearson_r']:.3f}")
    
    return correlations

def algorithm2_track_clustering(features_df: pd.DataFrame) -> Dict:
    """Algorithm 2: Track Clustering (K-Means + Hierarchical)"""
    print("\n" + "="*60)
    print("ALGORITHM 2: Track Clustering (K-Means + Hierarchical)")
    print("="*60)
    
    # Aggregate features by track
    track_features = [
        's1_mean', 's2_mean', 's3_mean', 'lap_mean', 'consistency_score',
        'avg_speed_kph', 'tire_degradation', 'clutch_score', 'sector_balance',
        's1_std', 's2_std', 's3_std'
    ]
    
    track_agg = features_df.groupby('track')[track_features].mean()
    
    # Standardize
    scaler = StandardScaler()
    track_scaled = scaler.fit_transform(track_agg)
    
    # K-Means with k=3
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    kmeans_clusters = kmeans.fit_predict(track_scaled)
    
    # Hierarchical Clustering
    linkage_matrix = linkage(track_scaled, method='ward')
    hierarchical_clusters = fcluster(linkage_matrix, t=3, criterion='maxclust')
    
    # Label clusters
    cluster_labels = ['Technical', 'High-Speed', 'Mixed']
    
    result = {
        'tracks': {},
        'kmeans': {
            'cluster_centers': kmeans.cluster_centers_.tolist(),
            'inertia': float(kmeans.inertia_)
        },
        'hierarchical': {
            'linkage_matrix': linkage_matrix.tolist(),
            'n_clusters': 3
        }
    }
    
    for i, track in enumerate(track_agg.index):
        kmeans_cluster_id = int(kmeans_clusters[i])
        hierarchical_cluster_id = int(hierarchical_clusters[i] - 1)  # fcluster starts at 1
        
        result['tracks'][track] = {
            'kmeans_cluster': kmeans_cluster_id,
            'kmeans_label': cluster_labels[kmeans_cluster_id],
            'hierarchical_cluster': hierarchical_cluster_id,
            'hierarchical_label': cluster_labels[hierarchical_cluster_id],
            'features': track_agg.loc[track].to_dict()
        }
    
    print(f"K-Means Clusters:")
    for track, info in result['tracks'].items():
        print(f"  {track}: {info['kmeans_label']}")
    
    print(f"\nHierarchical Clusters:")
    for track, info in result['tracks'].items():
        print(f"  {track}: {info['hierarchical_label']}")
    
    return result

def algorithm3_pca_visualization(features_df: pd.DataFrame) -> Dict:
    """Algorithm 3: PCA Dimensionality Reduction"""
    print("\n" + "="*60)
    print("ALGORITHM 3: PCA Dimensionality Reduction")
    print("="*60)
    
    # Same features as clustering
    track_features = [
        's1_mean', 's2_mean', 's3_mean', 'lap_mean', 'consistency_score',
        'avg_speed_kph', 'tire_degradation', 'clutch_score', 'sector_balance',
        's1_std', 's2_std', 's3_std'
    ]
    
    track_agg = features_df.groupby('track')[track_features].mean()
    
    # Standardize
    scaler = StandardScaler()
    track_scaled = scaler.fit_transform(track_agg)
    
    # PCA
    pca = PCA(n_components=2)
    pca_result = pca.fit_transform(track_scaled)
    
    result = {
        'tracks': {},
        'explained_variance': {
            'pc1': float(pca.explained_variance_ratio_[0]),
            'pc2': float(pca.explained_variance_ratio_[1]),
            'total': float(pca.explained_variance_ratio_.sum())
        },
        'components': pca.components_.tolist()
    }
    
    for i, track in enumerate(track_agg.index):
        result['tracks'][track] = {
            'pc1': float(pca_result[i, 0]),
            'pc2': float(pca_result[i, 1])
        }
    
    variance_explained = result['explained_variance']['total'] * 100
    print(f"Variance explained: {variance_explained:.1f}%")
    
    return result

def algorithm4_random_forest(features_df: pd.DataFrame) -> Dict:
    """Algorithm 4: Random Forest Predictor"""
    print("\n" + "="*60)
    print("ALGORITHM 4: Random Forest Predictor")
    print("="*60)
    
    # Prepare features
    feature_cols = [
        's1_mean', 's1_std', 's2_mean', 's2_std', 's3_mean', 's3_std',
        'lap_mean', 'lap_std', 'lap_best', 'consistency_score', 'best_to_avg_ratio',
        'avg_speed_kph', 'speed_std', 'top_speed_max', 'speed_variance',
        'early_pace', 'late_pace', 'tire_degradation', 'pace_improvement',
        'clutch_score', 'fcy_lap_count', 'post_fcy_performance',
        'sector_balance', 's1_ratio', 's2_ratio', 's3_ratio'
    ]
    
    # Filter to available features
    available_features = [f for f in feature_cols if f in features_df.columns]
    
    X = features_df[available_features].fillna(0)
    y = features_df['is_top_finisher']
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Random Forest
    rf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, class_weight='balanced')
    rf.fit(X_train, y_train)
    
    # Predictions
    y_pred = rf.predict(X_test)
    y_pred_proba = rf.predict_proba(X_test)[:, 1]
    
    # Calculate comprehensive metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_test, y_pred_proba) if len(np.unique(y_test)) > 1 else 0.0
    
    # Calculate baseline (majority class accuracy)
    baseline_accuracy = max(y_test.mean(), 1 - y_test.mean())  # If 80% are non-podium, baseline is 80%
    
    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
    
    # Feature importance
    feature_importance = list(zip(available_features, rf.feature_importances_))
    feature_importance.sort(key=lambda x: x[1], reverse=True)
    
    result = {
        'accuracy': float(accuracy),
        'precision': float(precision),
        'recall': float(recall),
        'f1_score': float(f1),
        'roc_auc': float(roc_auc),
        'baseline_accuracy': float(baseline_accuracy),
        'confusion_matrix': {
            'true_negatives': int(tn),
            'false_positives': int(fp),
            'false_negatives': int(fn),
            'true_positives': int(tp)
        },
        'feature_importance': [
            {'feature': feat, 'importance': float(imp)} 
            for feat, imp in feature_importance
        ],
        'top_predictors': [
            {'feature': feat, 'importance': float(imp)} 
            for feat, imp in feature_importance[:15]
        ],
        'model_type': 'RandomForest',
        'n_features': len(available_features),
        'n_samples': len(X_train),
        'test_samples': len(X_test),
        'class_distribution': {
            'podium': int(y_test.sum()),
            'non_podium': int(len(y_test) - y_test.sum()),
            'podium_percentage': float(y_test.mean() * 100)
        }
    }
    
    print(f"Model Accuracy: {accuracy:.1%}")
    print(f"Baseline Accuracy (majority class): {baseline_accuracy:.1%}")
    print(f"Improvement over baseline: {(accuracy - baseline_accuracy):.1%}")
    print(f"Precision: {precision:.1%} | Recall: {recall:.1%} | F1-Score: {f1:.1%} | ROC-AUC: {roc_auc:.3f}")
    print(f"Test Set: {len(X_test)} samples ({y_test.sum()} podiums, {len(y_test) - y_test.sum()} non-podiums)")
    print(f"Top 5 Predictors:")
    for i, (feat, imp) in enumerate(feature_importance[:5], 1):
        print(f"  {i}. {feat}: {imp:.4f}")
    
    return result

def algorithm6_gradient_boosting(features_df: pd.DataFrame) -> Dict:
    """Algorithm 6: Gradient Boosting (XGBoost/LightGBM) Predictor"""
    print("\n" + "="*60)
    print(f"ALGORITHM 6: Gradient Boosting ({BOOSTING_LIB if BOOSTING_LIB else 'Not Available'})")
    print("="*60)
    
    if BOOSTING_LIB is None:
        print("Skipping: XGBoost/LightGBM not installed")
        return {
            'accuracy': 0.0,
            'feature_importance': [],
            'top_predictors': [],
            'model_type': 'None',
            'error': 'XGBoost/LightGBM not installed'
        }
    
    # Prepare features (same as Random Forest)
    feature_cols = [
        's1_mean', 's1_std', 's2_mean', 's2_std', 's3_mean', 's3_std',
        'lap_mean', 'lap_std', 'lap_best', 'consistency_score', 'best_to_avg_ratio',
        'avg_speed_kph', 'speed_std', 'top_speed_max', 'speed_variance',
        'early_pace', 'late_pace', 'tire_degradation', 'pace_improvement',
        'clutch_score', 'fcy_lap_count', 'post_fcy_performance',
        'sector_balance', 's1_ratio', 's2_ratio', 's3_ratio'
    ]
    
    # Filter to available features
    available_features = [f for f in feature_cols if f in features_df.columns]
    
    X = features_df[available_features].fillna(0)
    y = features_df['is_top_finisher']
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Gradient Boosting
    if HAS_XGBOOST:
        # XGBoost
        gb_model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
            eval_metric='logloss',
            use_label_encoder=False
        )
        gb_model.fit(X_train, y_train)
        y_pred = gb_model.predict(X_test)
        feature_importance = list(zip(available_features, gb_model.feature_importances_))
    else:
        # LightGBM
        gb_model = lgb.LGBMClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
            verbose=-1
        )
        gb_model.fit(X_train, y_train)
        y_pred = gb_model.predict(X_test)
        feature_importance = list(zip(available_features, gb_model.feature_importances_))
    
    # Predictions and probabilities
    y_pred_proba = gb_model.predict_proba(X_test)[:, 1]
    
    # Calculate comprehensive metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_test, y_pred_proba) if len(np.unique(y_test)) > 1 else 0.0
    
    # Calculate baseline (majority class accuracy)
    baseline_accuracy = max(y_test.mean(), 1 - y_test.mean())
    
    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
    
    # Feature importance
    feature_importance.sort(key=lambda x: x[1], reverse=True)
    
    # Get interaction effects (top feature pairs)
    # For XGBoost, we can use gain-based importance
    # For LightGBM, we can use split-based importance
    interaction_effects = []
    if len(feature_importance) >= 2:
        # Simple heuristic: top features likely interact
        top_features = [f[0] for f in feature_importance[:5]]
        for i, feat1 in enumerate(top_features):
            for feat2 in top_features[i+1:]:
                interaction_effects.append({
                    'feature1': feat1,
                    'feature2': feat2,
                    'combined_importance': feature_importance[available_features.index(feat1)][1] + 
                                          feature_importance[available_features.index(feat2)][1]
                })
        interaction_effects.sort(key=lambda x: x['combined_importance'], reverse=True)
    
    result = {
        'accuracy': float(accuracy),
        'precision': float(precision),
        'recall': float(recall),
        'f1_score': float(f1),
        'roc_auc': float(roc_auc),
        'baseline_accuracy': float(baseline_accuracy),
        'confusion_matrix': {
            'true_negatives': int(tn),
            'false_positives': int(fp),
            'false_negatives': int(fn),
            'true_positives': int(tp)
        },
        'feature_importance': [
            {'feature': feat, 'importance': float(imp)} 
            for feat, imp in feature_importance
        ],
        'top_predictors': [
            {'feature': feat, 'importance': float(imp)} 
            for feat, imp in feature_importance[:15]
        ],
        'interaction_effects': interaction_effects[:10],  # Top 10 interactions
        'model_type': BOOSTING_LIB,
        'n_features': len(available_features),
        'n_samples': len(X_train),
        'test_samples': len(X_test),
        'class_distribution': {
            'podium': int(y_test.sum()),
            'non_podium': int(len(y_test) - y_test.sum()),
            'podium_percentage': float(y_test.mean() * 100)
        }
    }
    
    print(f"Model Accuracy: {accuracy:.1%}")
    print(f"Baseline Accuracy (majority class): {baseline_accuracy:.1%}")
    print(f"Improvement over baseline: {(accuracy - baseline_accuracy):.1%}")
    print(f"Precision: {precision:.1%} | Recall: {recall:.1%} | F1-Score: {f1:.1%} | ROC-AUC: {roc_auc:.3f}")
    print(f"Test Set: {len(X_test)} samples ({y_test.sum()} podiums, {len(y_test) - y_test.sum()} non-podiums)")
    print(f"Top 5 Predictors:")
    for i, (feat, imp) in enumerate(feature_importance[:5], 1):
        print(f"  {i}. {feat}: {imp:.4f}")
    
    if interaction_effects:
        print(f"\nTop 3 Feature Interactions:")
        for i, interaction in enumerate(interaction_effects[:3], 1):
            print(f"  {i}. {interaction['feature1']} × {interaction['feature2']}: {interaction['combined_importance']:.4f}")
    
    return result

def algorithm7_logistic_regression(features_df: pd.DataFrame) -> Dict:
    """Algorithm 7: Logistic Regression for Podium Probability Prediction"""
    print("\n" + "="*60)
    print("ALGORITHM 7: Logistic Regression (What If Calculator)")
    print("="*60)
    
    # Select 8 trainable features (controllable through practice)
    # Use the exact feature names the user specified
    trainable_features = [
        's2_std',              # Sector 2 consistency (most important)
        'consistency_score',   # Overall consistency
        'tire_degradation',    # Tire management
        'clutch_score',        # Pressure handling
        'post_fcy_performance', # Restart ability (maps to post_fcy_delta concept)
        's1_std',              # Sector 1 consistency
        's3_std',              # Sector 3 consistency
        'late_pace'            # Race progression (maps to lap_improvement_trend concept)
    ]
    
    # Check if alternative feature names exist and use them if available
    feature_mapping = {
        'post_fcy_delta': 'post_fcy_performance',  # Map to actual feature name
        'lap_improvement_trend': 'late_pace'  # Map to actual feature name
    }
    
    # Replace with actual feature names if they exist in the dataframe
    for i, feat in enumerate(trainable_features):
        if feat in feature_mapping:
            mapped_feat = feature_mapping[feat]
            if mapped_feat in features_df.columns:
                trainable_features[i] = mapped_feat
    
    # Filter to available features
    available_features = [f for f in trainable_features if f in features_df.columns]
    
    if len(available_features) < 3:
        print("Warning: Not enough trainable features available")
        return {
            'accuracy': 0.0,
            'roc_auc': 0.0,
            'coefficients': {},
            'intercept': 0.0,
            'features': [],
            'error': 'Not enough features available'
        }
    
    # Prepare data
    X = features_df[available_features].fillna(0)
    y = features_df['is_top_finisher']  # Binary: 1 if podium, 0 otherwise
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Train Logistic Regression
    lr_model = LogisticRegression(
        solver='lbfgs',
        max_iter=1000,
        C=1.0,
        class_weight='balanced',
        random_state=42
    )
    lr_model.fit(X_train, y_train)
    
    # Predictions
    y_pred = lr_model.predict(X_test)
    y_pred_proba = lr_model.predict_proba(X_test)[:, 1]
    
    # Metrics
    accuracy = accuracy_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_pred_proba)
    
    # Extract coefficients
    coefficients = {}
    for i, feature in enumerate(available_features):
        coefficients[feature] = float(lr_model.coef_[0][i])
    
    intercept = float(lr_model.intercept_[0])
    
    # Calculate baseline probabilities for all driver-track-race combinations
    baseline_probabilities = []
    for idx, row in features_df.iterrows():
        feature_values = {}
        z = intercept
        
        for feature in available_features:
            value = row.get(feature, 0)
            if pd.isna(value):
                value = 0
            feature_values[feature] = float(value)
            z += coefficients[feature] * value
        
        # Calculate probability using logistic function: P = 1 / (1 + e^(-z))
        probability = 1 / (1 + np.exp(-z))
        
        baseline_probabilities.append({
            'driver': int(row.get('driver', 0)),
            'track': str(row.get('track', 'unknown')),
            'race': int(row.get('race', 0)),
            'probability': round(float(probability) * 100, 2),  # Convert to percentage
            'features': feature_values
        })
    
    # Improvement limits (realistic constraints)
    improvement_limits = {
        's2_std': {'max_improvement': 0.20, 'direction': 'decrease', 'min_value': 0.3},
        's1_std': {'max_improvement': 0.20, 'direction': 'decrease', 'min_value': 0.3},
        's3_std': {'max_improvement': 0.20, 'direction': 'decrease', 'min_value': 0.3},
        'consistency_score': {'max_improvement': 0.10, 'direction': 'increase', 'max_value': 0.98},
        'tire_degradation': {'max_improvement': 0.30, 'direction': 'decrease', 'min_value': 0.5},
        'clutch_score': {'max_improvement': 0.15, 'direction': 'increase', 'max_value': 10.0},
        'post_fcy_performance': {'max_improvement': 0.20, 'direction': 'increase', 'max_value': 15.0},
        'late_pace': {'max_improvement': 0.15, 'direction': 'decrease', 'min_value': 80.0}
    }
    
    result = {
        'accuracy': float(accuracy),
        'roc_auc': float(roc_auc),
        'coefficients': coefficients,
        'intercept': intercept,
        'features': available_features,
        'baseline_probabilities': baseline_probabilities,
        'improvement_limits': improvement_limits,
        'n_samples': len(X_train),
        'n_features': len(available_features)
    }
    
    print(f"Model Accuracy: {accuracy:.1%}")
    print(f"ROC-AUC Score: {roc_auc:.3f}")
    print(f"Top 3 Feature Coefficients:")
    sorted_coefs = sorted(coefficients.items(), key=lambda x: abs(x[1]), reverse=True)
    for i, (feat, coef) in enumerate(sorted_coefs[:3], 1):
        print(f"  {i}. {feat}: {coef:.4f}")
    print(f"Baseline probabilities calculated for {len(baseline_probabilities)} driver-track-race combinations")
    
    return result

def algorithm5_driver_clustering(features_df: pd.DataFrame) -> Dict:
    """Algorithm 5: Driver Clustering (K-Means + Hierarchical)"""
    print("\n" + "="*60)
    print("ALGORITHM 5: Driver Clustering (K-Means + Hierarchical)")
    print("="*60)
    
    # Aggregate by driver (average across all tracks/races)
    # Include peak speed for better archetype identification
    driver_features = [
        'consistency_score', 'avg_speed_kph', 'top_speed_max', 'clutch_score', 'sector_balance',
        's1_mean', 's2_mean', 's3_mean', 'tire_degradation', 'pace_improvement',
        'post_fcy_performance', 'lap_best'  # Add lap_best for qualifying performance
    ]
    
    available_features = [f for f in driver_features if f in features_df.columns]
    
    driver_agg = features_df.groupby('driver')[available_features].mean()
    
    # Standardize
    scaler = StandardScaler()
    driver_scaled = scaler.fit_transform(driver_agg)
    
    # K-Means with k=4
    kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
    kmeans_clusters = kmeans.fit_predict(driver_scaled)
    
    # Hierarchical Clustering
    linkage_matrix = linkage(driver_scaled, method='ward')
    hierarchical_clusters = fcluster(linkage_matrix, t=4, criterion='maxclust')
    
    # Analyze cluster characteristics and assign labels based on actual data
    cluster_characteristics = {}
    for i in range(4):
        cluster_drivers = driver_agg[kmeans_clusters == i]
        if len(cluster_drivers) > 0:
            cluster_mean = cluster_drivers.mean()
            cluster_characteristics[i] = {
                'top_speed_max': cluster_mean.get('top_speed_max', 0) if 'top_speed_max' in cluster_mean else 0,
                'lap_best': cluster_mean.get('lap_best', 999) if 'lap_best' in cluster_mean else 999,  # Lower is better
                'consistency_score': cluster_mean.get('consistency_score', 0) if 'consistency_score' in cluster_mean else 0,
                'clutch_score': cluster_mean.get('clutch_score', 0) if 'clutch_score' in cluster_mean else 0,
                'post_fcy_performance': cluster_mean.get('post_fcy_performance', 0) if 'post_fcy_performance' in cluster_mean else 0,
                'tire_degradation': cluster_mean.get('tire_degradation', 0) if 'tire_degradation' in cluster_mean else 0,
                'characteristics': cluster_mean.to_dict()
            }
    
    # Assign labels based on actual characteristics
    # 1. Qualifying Heroes: Highest peak speed AND fastest lap times
    # 2. Smooth Operators: Highest consistency AND best tire management (most negative degradation)
    # 3. Clutch Performers: Highest clutch_score AND post_fcy_performance
    # 4. All-Rounders: Everything else (balanced)
    
    cluster_to_label = {}
    
    # Find Qualifying Heroes (highest peak speed + fastest lap)
    if cluster_characteristics:
        qualifying_scores = {}
        for cluster_id, chars in cluster_characteristics.items():
            # Combine peak speed (higher better) and lap_best (lower better)
            speed_score = chars['top_speed_max'] if chars['top_speed_max'] > 0 else 0
            lap_score = (1 / chars['lap_best']) * 1000 if chars['lap_best'] > 0 and chars['lap_best'] < 999 else 0
            qualifying_scores[cluster_id] = speed_score + lap_score
        if qualifying_scores:
            qualifying_cluster = max(qualifying_scores.items(), key=lambda x: x[1])[0]
            cluster_to_label[qualifying_cluster] = 'Qualifying Heroes'
    
    # Find Smooth Operators (highest consistency + best tire management)
    smooth_scores = {}
    for cluster_id, chars in cluster_characteristics.items():
        if cluster_id not in cluster_to_label:
            consistency = chars['consistency_score']
            tire_mgmt = -chars['tire_degradation'] if chars['tire_degradation'] < 0 else 0  # Negative degradation = good
            smooth_scores[cluster_id] = consistency * 10 + tire_mgmt
    if smooth_scores:
        smooth_cluster = max(smooth_scores.items(), key=lambda x: x[1])[0]
        cluster_to_label[smooth_cluster] = 'Smooth Operators'
    
    # Find Clutch Performers (highest clutch + post-FCY)
    clutch_scores = {}
    for cluster_id, chars in cluster_characteristics.items():
        if cluster_id not in cluster_to_label:
            clutch_scores[cluster_id] = chars['clutch_score'] + chars['post_fcy_performance']
    if clutch_scores:
        clutch_cluster = max(clutch_scores.items(), key=lambda x: x[1])[0]
        cluster_to_label[clutch_cluster] = 'Clutch Performers'
    
    # Remaining cluster is All-Rounders
    for cluster_id in range(4):
        if cluster_id not in cluster_to_label:
            cluster_to_label[cluster_id] = 'All-Rounders'
    
    # Create reverse mapping for result
    archetype_labels = [cluster_to_label.get(i, 'All-Rounders') for i in range(4)]
    
    result = {
        'drivers': {},
        'archetypes': {},
        'kmeans': {
            'cluster_centers': kmeans.cluster_centers_.tolist(),
            'inertia': float(kmeans.inertia_)
        },
        'hierarchical': {
            'linkage_matrix': linkage_matrix.tolist(),
            'n_clusters': 4
        }
    }
    
    # Calculate archetype characteristics (using K-Means clusters)
    for i, label in enumerate(archetype_labels):
        cluster_id = list(cluster_to_label.keys())[list(cluster_to_label.values()).index(label)] if label in cluster_to_label.values() else i
        cluster_drivers = driver_agg[kmeans_clusters == cluster_id]
        if len(cluster_drivers) > 0:
            result['archetypes'][label] = {
                'id': cluster_id,
                'count': len(cluster_drivers),
                'characteristics': cluster_drivers.mean().to_dict()
            }
    
    # Assign drivers to archetypes
    for i, driver in enumerate(driver_agg.index):
        kmeans_cluster_id = int(kmeans_clusters[i])
        hierarchical_cluster_id = int(hierarchical_clusters[i] - 1)  # fcluster starts at 1
        
        archetype_label = cluster_to_label.get(kmeans_cluster_id, 'All-Rounders')
        
        result['drivers'][int(driver)] = {
            'archetype': archetype_label,
            'archetype_id': kmeans_cluster_id,
            'hierarchical_cluster': hierarchical_cluster_id,
            'scores': driver_agg.loc[driver].to_dict()
        }
    
    print(f"K-Means Driver Archetypes:")
    for label, info in result['archetypes'].items():
        print(f"  {label}: {info['count']} drivers")
    
    # Show hierarchical cluster distribution
    hierarchical_counts = {}
    for driver_id, driver_info in result['drivers'].items():
        h_cluster = driver_info['hierarchical_cluster']
        hierarchical_counts[h_cluster] = hierarchical_counts.get(h_cluster, 0) + 1
    
    print(f"\nHierarchical Clusters:")
    for cluster_id, count in sorted(hierarchical_counts.items()):
        print(f"  Cluster {cluster_id}: {count} drivers")
    
    return result

def run_all_analysis(features_path: Path) -> Dict:
    """Run all 7 algorithms"""
    print("Loading features matrix...")
    features_df = pd.read_csv(features_path)
    
    results = {}
    
    # Algorithm 1: Cross-Track Correlations
    results['correlations'] = algorithm1_cross_track_correlation(features_df)
    
    # Algorithm 2: Track Clustering (K-Means + Hierarchical)
    results['track_clusters'] = algorithm2_track_clustering(features_df)
    
    # Algorithm 3: PCA
    results['pca'] = algorithm3_pca_visualization(features_df)
    
    # Algorithm 4: Random Forest
    results['random_forest'] = algorithm4_random_forest(features_df)
    
    # Algorithm 5: Driver Clustering (K-Means + Hierarchical)
    results['driver_clusters'] = algorithm5_driver_clustering(features_df)
    
    # Algorithm 6: Gradient Boosting (XGBoost/LightGBM)
    results['gradient_boosting'] = algorithm6_gradient_boosting(features_df)
    
    # Algorithm 7: Logistic Regression for "What If" Calculator
    results['logistic_regression'] = algorithm7_logistic_regression(features_df)
    
    return results

if __name__ == '__main__':
    base_path = Path(__file__).parent.parent
    features_path = base_path / 'Data_analysis' / 'features_matrix.csv'
    
    if not features_path.exists():
        print("Error: features_matrix.csv not found. Run engineer_features.py first.")
        exit(1)
    
    results = run_all_analysis(features_path)
    
    # Save results
    output_path = base_path / 'Data_analysis' / 'ml_results.json'
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\nResults saved to: {output_path}")

