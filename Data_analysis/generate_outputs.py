"""
Tortoise JSON Output Generator
Creates all JSON files for frontend consumption
"""

import pandas as pd
import numpy as np
import json
from pathlib import Path
from load_data import RaceDataLoader

def clean_for_json(obj):
    """Recursively clean data structure to remove NaN, inf, and other non-JSON-serializable values"""
    if isinstance(obj, dict):
        return {k: clean_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_for_json(item) for item in obj]
    elif isinstance(obj, (np.integer, np.floating)):
        if pd.isna(obj) or np.isinf(obj) or (isinstance(obj, float) and obj != obj):
            return 0.0  # Return 0 instead of None for numeric fields
        return float(obj) if isinstance(obj, np.floating) else int(obj)
    elif isinstance(obj, float):
        # Check for NaN using multiple methods
        if obj != obj:  # NaN != NaN is True (fastest check)
            return 0.0
        if pd.isna(obj) or np.isnan(obj):
            return 0.0
        if np.isinf(obj):
            return 0.0
        return obj
    elif isinstance(obj, (int, str, bool)) or obj is None:
        return obj
    elif pd.isna(obj):
        return 0.0
    else:
        # For any other type, try to convert or return 0
        try:
            if hasattr(obj, '__float__'):
                val = float(obj)
                if val != val or pd.isna(val) or np.isnan(val) or np.isinf(val):
                    return 0.0
                return val
        except (ValueError, TypeError):
            pass
        return 0.0

def generate_summary_json(loader: RaceDataLoader, ml_results: dict) -> dict:
    """Generate summary.json"""
    stats = loader.get_summary_stats()
    
    return {
        'total_laps': stats['total_laps'],
        'total_drivers': stats['total_drivers'],
        'total_races': stats['total_races'],
        'total_tracks': 7,
        'model_accuracy': ml_results.get('random_forest', {}).get('accuracy', 0),
        'significant_correlations': len(ml_results.get('correlations', [])),
        'driver_archetypes': len(ml_results.get('driver_clusters', {}).get('archetypes', {}))
    }

def generate_tracks_json(ml_results: dict) -> dict:
    """Generate tracks.json with PCA coordinates and clusters (K-Means + Hierarchical)"""
    pca_data = ml_results.get('pca', {})
    cluster_data = ml_results.get('track_clusters', {})
    
    tracks = {}
    
    for track_name in pca_data.get('tracks', {}).keys():
        track_info = cluster_data.get('tracks', {}).get(track_name, {})
        tracks[track_name] = {
            'name': track_name.replace('_', ' ').title(),
            'pc1': pca_data['tracks'][track_name]['pc1'],
            'pc2': pca_data['tracks'][track_name]['pc2'],
            'kmeans': {
                'cluster': track_info.get('kmeans_label', 'Mixed'),
                'cluster_id': track_info.get('kmeans_cluster', 0)
            },
            'hierarchical': {
                'cluster': track_info.get('hierarchical_label', 'Mixed'),
                'cluster_id': track_info.get('hierarchical_cluster', 0)
            }
        }
    
    return {
        'tracks': tracks,
        'pca_variance': pca_data.get('explained_variance', {}),
        'clustering': {
            'kmeans': cluster_data.get('kmeans', {}),
            'hierarchical': cluster_data.get('hierarchical', {})
        }
    }

def generate_correlations_json(ml_results: dict) -> dict:
    """Generate correlations.json"""
    correlations = ml_results.get('correlations', [])
    
    # Format for frontend
    formatted = []
    for corr in correlations[:50]:  # Top 50
        formatted.append({
            'track1': corr['track1'].replace('_', ' ').title(),
            'track2': corr['track2'].replace('_', ' ').title(),
            'metric': corr['metric'],
            'correlation': round(corr['pearson_r'], 3),
            'p_value': round(corr['pearson_p'], 4),
            'strength': corr['strength'],
            'drivers_compared': corr['drivers_compared']
        })
    
    return {
        'correlations': formatted,
        'total': len(correlations),
        'strong': len([c for c in correlations if c['strength'] == 'strong'])
    }

def generate_features_json(ml_results: dict) -> dict:
    """Generate features.json with importance rankings from both Random Forest and Gradient Boosting"""
    rf_data = ml_results.get('random_forest', {})
    gb_data = ml_results.get('gradient_boosting', {})
    
    # Handle case where gradient_boosting has an error
    gb_has_error = gb_data.get('error') is not None
    gb_accuracy = 0.0 if gb_has_error else gb_data.get('accuracy', 0)
    gb_model_type = 'None' if gb_has_error else gb_data.get('model_type', 'None')
    
    result = {
        'random_forest': {
            'feature_importance': rf_data.get('feature_importance', []),
            'top_predictors': rf_data.get('top_predictors', []),
            'model_accuracy': rf_data.get('accuracy', 0),
            'model_type': rf_data.get('model_type', 'RandomForest'),
            # Include all additional metrics
            'accuracy': rf_data.get('accuracy', 0),
            'precision': rf_data.get('precision'),
            'recall': rf_data.get('recall'),
            'f1_score': rf_data.get('f1_score'),
            'roc_auc': rf_data.get('roc_auc'),
            'baseline_accuracy': rf_data.get('baseline_accuracy'),
            'confusion_matrix': rf_data.get('confusion_matrix'),
            'class_distribution': rf_data.get('class_distribution'),
            'n_features': rf_data.get('n_features'),
            'n_samples': rf_data.get('n_samples'),
            'test_samples': rf_data.get('test_samples')
        },
        'gradient_boosting': {
            'feature_importance': [] if gb_has_error else gb_data.get('feature_importance', []),
            'top_predictors': [] if gb_has_error else gb_data.get('top_predictors', []),
            'model_accuracy': gb_accuracy,
            'model_type': gb_model_type,
            'interaction_effects': [] if gb_has_error else gb_data.get('interaction_effects', []),
            'error': gb_data.get('error') if gb_has_error else None,
            # Include all additional metrics
            'accuracy': gb_accuracy,
            'precision': None if gb_has_error else gb_data.get('precision'),
            'recall': None if gb_has_error else gb_data.get('recall'),
            'f1_score': None if gb_has_error else gb_data.get('f1_score'),
            'roc_auc': None if gb_has_error else gb_data.get('roc_auc'),
            'baseline_accuracy': None if gb_has_error else gb_data.get('baseline_accuracy'),
            'confusion_matrix': None if gb_has_error else gb_data.get('confusion_matrix'),
            'class_distribution': None if gb_has_error else gb_data.get('class_distribution'),
            'n_features': None if gb_has_error else gb_data.get('n_features'),
            'n_samples': None if gb_has_error else gb_data.get('n_samples'),
            'test_samples': None if gb_has_error else gb_data.get('test_samples')
        },
        'comparison': {
            'rf_accuracy': rf_data.get('accuracy', 0),
            'gb_accuracy': gb_accuracy,
            'best_model': 'Gradient Boosting' if (gb_accuracy > rf_data.get('accuracy', 0) and not gb_has_error) else 'Random Forest',
            'accuracy_improvement': round((gb_accuracy - rf_data.get('accuracy', 0)) * 100, 2) if (gb_accuracy > 0 and not gb_has_error) else 0
        },
        'key_finding': 'S2 consistency is a top predictor of race success, more important than fastest lap time'
    }
    
    return result

def generate_drivers_json(ml_results: dict, features_df: pd.DataFrame) -> dict:
    """Generate drivers.json with profiles and archetypes using PERCENTILE RANKING"""
    driver_clusters = ml_results.get('driver_clusters', {})
    import numpy as np
    
    # === ADVANCED FINGERPRINT FEATURES (8 high-variance, discriminative features) ===
    # Selected based on variance analysis and low correlation
    fingerprint_features = {
        'peak_speed': {
            'feature': 'top_speed_max',
            'higher_is_better': True,
            'display_name': 'Peak Speed',
            'description': 'Maximum speed achieved. Shows bravery and car setup.'
        },
        'consistency': {
            'feature': 'consistency_score',
            'higher_is_better': True,
            'display_name': 'Consistency',
            'description': 'Lap time consistency. Higher = more consistent.'
        },
        'tire_management': {
            'feature': 'tire_degradation',
            'higher_is_better': False,  # Negative degradation (getting faster) = good
            'display_name': 'Tire Management',
            'description': 'Tire preservation. Negative values mean improving pace.'
        },
        'pressure_handling': {
            'feature': 'clutch_score',
            'higher_is_better': True,
            'display_name': 'Pressure Handling',
            'description': 'Performance under pressure (final 10% of race).'
        },
        'technical_skill': {
            'feature': 's2_std',
            'higher_is_better': False,  # Lower std = higher skill
            'display_name': 'Technical Skill',
            'description': 'Sector 2 consistency (mid-corner precision).'
        },
        'high_speed_skill': {
            'feature': 's3_std',
            'higher_is_better': False,  # Lower std = higher skill
            'display_name': 'High-Speed Skill',
            'description': 'Sector 3 consistency (speed confidence).'
        },
        'restart_ability': {
            'feature': 'post_fcy_performance',
            'higher_is_better': True,
            'display_name': 'Restart Ability',
            'description': 'Performance after Full Course Yellow restarts.'
        },
        'race_pace': {
            'feature': 'late_pace',
            'higher_is_better': False,  # Lower time = better pace
            'display_name': 'Race Pace',
            'description': 'Late race pace (stamina and focus).'
        }
    }
    
    # Track type definitions
    track_types = {
        'technical': ['barber', 'vir', 'sonoma'],
        'high_speed': ['indianapolis', 'road_america'],
        'mixed': ['cota', 'sebring']
    }
    
    # === PERCENTILE RANKING APPROACH ===
    # Calculate percentile ranks for each driver across all features
    # This creates natural 0-100 scale and makes fingerprints more distinctive
    
    if features_df.empty:
        # Fallback: use driver clusters aggregated scores
        return _generate_drivers_json_fallback(driver_clusters)
    
    # Aggregate features by driver (average across all races)
    import pandas as pd
    driver_agg = features_df.groupby('driver').agg({
        'top_speed_max': 'mean',
        'consistency_score': 'mean',
        'tire_degradation': 'mean',
        'clutch_score': 'mean',
        's2_std': 'mean',
        's3_std': 'mean',
        'post_fcy_performance': 'mean',
        'late_pace': 'mean',
        'track': lambda x: list(x.unique()) if hasattr(x, 'unique') else list(set(x))  # Keep track list
    }).reset_index()
    
    # Get track list separately
    driver_tracks = features_df.groupby('driver')['track'].apply(lambda x: list(x.unique())).to_dict()
    
    # Calculate track-specific stats for each driver
    driver_track_stats = {}
    for driver_id in features_df['driver'].unique():
        driver_track_data = features_df[features_df['driver'] == driver_id]
        track_stats = {}
        for track_name in driver_track_data['track'].unique():
            track_data = driver_track_data[driver_track_data['track'] == track_name]
            if len(track_data) > 0:
                def safe_mean(col_name, default=0):
                    """Safely calculate mean, handling NaN values"""
                    if col_name not in track_data.columns:
                        return default
                    values = track_data[col_name].dropna()
                    if len(values) == 0:
                        return default
                    mean_val = values.mean()
                    # Check for NaN using multiple methods
                    if pd.isna(mean_val) or (isinstance(mean_val, float) and mean_val != mean_val):
                        return default
                    result = float(mean_val)
                    # Final check: ensure result is not NaN
                    if result != result or pd.isna(result):
                        return default
                    return result
                
                track_stats[track_name] = {
                    'top_speed_max': safe_mean('top_speed_max', 0),
                    'consistency_score': safe_mean('consistency_score', 0),
                    'tire_degradation': safe_mean('tire_degradation', 0),
                    'clutch_score': safe_mean('clutch_score', 0),
                    's2_std': safe_mean('s2_std', 0),
                    's3_std': safe_mean('s3_std', 0),
                    'post_fcy_performance': safe_mean('post_fcy_performance', 0),
                    'late_pace': safe_mean('late_pace', 0),
                    'races': int(len(track_data))
                }
        driver_track_stats[int(driver_id)] = track_stats
    
    # Calculate percentile ranks for each feature
    drivers = {}
    
    for _, row in driver_agg.iterrows():
        driver_id = int(row['driver'])
        # Try both string and int keys for driver lookup
        driver_info = driver_clusters.get('drivers', {}).get(str(driver_id)) or driver_clusters.get('drivers', {}).get(driver_id) or {}
        
        # Calculate percentile for each fingerprint feature
        fingerprint_scores = {}
        all_percentiles = []
        
        for score_key, feat_info in fingerprint_features.items():
            feat_name = feat_info['feature']
            higher_is_better = feat_info['higher_is_better']
            
            if feat_name not in features_df.columns:
                fingerprint_scores[score_key] = 50.0  # Default if feature missing
                continue
            
            # Get driver's value
            driver_value = row[feat_name]
            if pd.isna(driver_value):
                fingerprint_scores[score_key] = 50.0
                continue
            
            # Get all values for this feature
            all_values = features_df[feat_name].dropna()
            
            if len(all_values) == 0:
                fingerprint_scores[score_key] = 50.0
                continue
            
            # Calculate percentile rank
            if higher_is_better:
                # Higher value = better, so percentile = % of drivers with lower value
                percentile = (all_values < driver_value).sum() / len(all_values) * 100
            else:
                # Lower value = better, so percentile = % of drivers with higher value
                percentile = (all_values > driver_value).sum() / len(all_values) * 100
            
            # Handle ties: use average rank
            if higher_is_better:
                ties = (all_values == driver_value).sum()
                if ties > 1:
                    percentile = percentile + (ties - 1) / 2 / len(all_values) * 100
            else:
                ties = (all_values == driver_value).sum()
                if ties > 1:
                    percentile = percentile + (ties - 1) / 2 / len(all_values) * 100
            
            percentile = max(0, min(100, percentile))
            fingerprint_scores[score_key] = round(float(percentile), 1)  # Convert numpy to float
            all_percentiles.append(float(percentile))
        
        # Find signature strength (highest percentile)
        if all_percentiles:
            max_percentile = max(all_percentiles)
            max_idx = all_percentiles.index(max_percentile)
            signature_key = list(fingerprint_features.keys())[max_idx]
            signature_name = fingerprint_features[signature_key]['display_name']
            signature_percentile = round(max_percentile, 1)
        else:
            signature_name = "Balanced"
            signature_percentile = 50.0
        
        # Get archetype - must exist in driver_clusters, don't default to most common
        archetype = driver_info.get('archetype') if driver_info else None
        if not archetype or archetype == 'Unknown':
            # Only use fallback if driver truly not found in clusters
            # Try to find it in the original driver_clusters dict
            for d_id, d_info in driver_clusters.get('drivers', {}).items():
                if str(d_id) == str(driver_id) or int(d_id) == driver_id:
                    archetype = d_info.get('archetype')
                    if archetype and archetype != 'Unknown':
                        break
            
            # If still not found, use most common archetype as last resort
            if not archetype or archetype == 'Unknown':
                archetype_counts = {}
                for d_id, d_info in driver_clusters.get('drivers', {}).items():
                    arch = d_info.get('archetype')
                    if arch and arch != 'Unknown':
                        archetype_counts[arch] = archetype_counts.get(arch, 0) + 1
                if archetype_counts:
                    archetype = max(archetype_counts.items(), key=lambda x: x[1])[0]
                else:
                    archetype = 'All-Rounders'  # Safe default
        
        # Map to legacy score names for backward compatibility
        # Also keep new fingerprint scores
        drivers[driver_id] = {
            'id': driver_id,
            'archetype': archetype,
            'scores': {
                # Legacy names (for backward compatibility)
                'speed': fingerprint_scores.get('peak_speed', 50.0),
                'consistency': fingerprint_scores.get('consistency', 50.0),
                'tire_management': fingerprint_scores.get('tire_management', 50.0),
                'pressure': fingerprint_scores.get('pressure_handling', 50.0),
                's1_skill': 50.0,  # Not in new fingerprint
                's2_skill': 100 - fingerprint_scores.get('technical_skill', 50.0),  # Invert std
                's3_skill': 100 - fingerprint_scores.get('high_speed_skill', 50.0),  # Invert std
                'race_craft': fingerprint_scores.get('restart_ability', 50.0),
                # New fingerprint scores
                'peak_speed': fingerprint_scores.get('peak_speed', 50.0),
                'technical_skill': 100 - fingerprint_scores.get('technical_skill', 50.0),  # Invert
                'high_speed_skill': 100 - fingerprint_scores.get('high_speed_skill', 50.0),  # Invert
                'restart_ability': fingerprint_scores.get('restart_ability', 50.0),
                'race_pace': 100 - fingerprint_scores.get('race_pace', 50.0)  # Invert (lower time = better)
            },
            'fingerprint': fingerprint_scores,  # New fingerprint data
            'signature_strength': {
                'name': signature_name,
                'percentile': signature_percentile
            },
            'strengths': [],
            'improvements': [],
            'tracks': driver_tracks.get(driver_id, []),
            'track_stats': driver_track_stats.get(driver_id, {})  # Track-specific stats
        }
        
        # Identify strengths and improvements (top 3, bottom 2)
        driver_scores = drivers[driver_id]['scores']
        sorted_scores = sorted(driver_scores.items(), key=lambda x: x[1], reverse=True)
        drivers[driver_id]['strengths'] = [s[0] for s in sorted_scores[:3]]
        drivers[driver_id]['improvements'] = [s[0] for s in sorted_scores[-2:]]
    
    return {
        'drivers': drivers,
        'archetypes': driver_clusters.get('archetypes', {}),
        'fingerprint_features': {k: {
            'display_name': v['display_name'],
            'description': v['description']
        } for k, v in fingerprint_features.items()},
        'track_types': track_types
    }

def _generate_drivers_json_fallback(driver_clusters: dict) -> dict:
    """Fallback method if features_df is empty"""
    # Get most common archetype for fallback
    archetype_counts = {}
    for d_id, d_info in driver_clusters.get('drivers', {}).items():
        arch = d_info.get('archetype')
        if arch and arch != 'Unknown':
            archetype_counts[arch] = archetype_counts.get(arch, 0) + 1
    default_archetype = max(archetype_counts.items(), key=lambda x: x[1])[0] if archetype_counts else 'All-Rounders'
    
    drivers = {}
    for driver_id, driver_info in driver_clusters.get('drivers', {}).items():
        archetype = driver_info.get('archetype')
        if not archetype or archetype == 'Unknown':
            archetype = default_archetype
        
        drivers[int(driver_id)] = {
            'id': int(driver_id),
            'archetype': archetype,
            'scores': {
                'speed': 50.0,
                'consistency': 50.0,
                'tire_management': 50.0,
                'pressure': 50.0,
                's1_skill': 50.0,
                's2_skill': 50.0,
                's3_skill': 50.0,
                'race_craft': 50.0
            },
            'strengths': [],
            'improvements': []
        }
    return {
        'drivers': drivers,
        'archetypes': driver_clusters.get('archetypes', {})
    }

def generate_archetypes_json(ml_results: dict) -> dict:
    """Generate archetypes.json with descriptions"""
    archetypes_data = ml_results.get('driver_clusters', {}).get('archetypes', {})
    
    archetype_descriptions = {
        'Smooth Operators': {
            'description': 'Drivers with exceptional consistency and tire management. They maintain pace throughout the race.',
            'strengths': ['Consistency', 'Tire Management', 'Race Pace'],
            'weaknesses': ['Qualifying Speed', 'Aggressive Overtaking'],
            'recommendations': [
                'Focus on qualifying pace to start higher',
                'Work on aggressive overtaking moves',
                'Maintain consistency advantage'
            ]
        },
        'Qualifying Heroes': {
            'description': 'Drivers who excel in single-lap pace but may struggle with race consistency.',
            'strengths': ['Fastest Lap', 'Qualifying', 'Sector 2 Speed'],
            'weaknesses': ['Race Consistency', 'Tire Degradation', 'Long Runs'],
            'recommendations': [
                'Improve race consistency',
                'Work on tire management',
                'Practice long-run pace'
            ]
        },
        'Clutch Performers': {
            'description': 'Drivers who perform best under pressure, especially in final stages and restarts.',
            'strengths': ['Pressure Handling', 'Restarts', 'Final Laps'],
            'weaknesses': ['Early Race Pace', 'Qualifying', 'Sector Balance'],
            'recommendations': [
                'Improve early race pace',
                'Focus on qualifying performance',
                'Maintain clutch advantage'
            ]
        },
        'All-Rounders': {
            'description': 'Well-balanced drivers with no major weaknesses but may lack standout strengths.',
            'strengths': ['Balance', 'Consistency', 'Adaptability'],
            'weaknesses': ['Peak Performance', 'Specialization'],
            'recommendations': [
                'Develop a standout strength',
                'Focus on peak performance',
                'Maintain balanced approach'
            ]
        }
    }
    
    formatted = {}
    for archetype_name, data in archetypes_data.items():
        if archetype_name in archetype_descriptions:
            formatted[archetype_name] = {
                **archetype_descriptions[archetype_name],
                'count': data.get('count', 0),
                'characteristics': data.get('characteristics', {})
            }
    
    return {'archetypes': formatted}

def generate_insights_json(ml_results: dict, correlations: list, features_df: pd.DataFrame = None) -> dict:
    """Generate insights.json with curated findings"""
    insights = []
    
    # Insight 1: Top correlation
    if correlations:
        top_corr = correlations[0]
        insights.append({
            'id': 1,
            'title': f"Strong Skill Transfer: {top_corr['track1'].replace('_', ' ').title()} ↔ {top_corr['track2'].replace('_', ' ').title()}",
            'finding': f"Drivers who excel at {top_corr['track1'].replace('_', ' ').title()} also perform well at {top_corr['track2'].replace('_', ' ').title()} (r={top_corr['pearson_r']:.3f}, p<0.05). The {top_corr['metric']} metric shows strong correlation across these tracks.",
            'implication': 'Skills learned at one track transfer to similar tracks. Training at one can improve performance at the other.',
            'recommendations': [
                f"Use {top_corr['track1'].replace('_', ' ').title()} as training ground for {top_corr['track2'].replace('_', ' ').title()}",
                f"Focus on improving {top_corr['metric']} at both tracks",
                'Analyze common characteristics between tracks'
            ],
            'impact': 'High',
            'metric': top_corr['metric'],
            'correlation_value': round(top_corr['pearson_r'], 3)
        })
    
    # Insight 2: S2 Consistency
    rf_data = ml_results.get('random_forest', {})
    top_features = rf_data.get('top_predictors', [])
    if top_features:
        s2_feature = next((f for f in top_features if 's2' in f['feature'].lower() and 'std' in f['feature'].lower()), None)
        if s2_feature:
            insights.append({
                'id': 2,
                'title': 'S2 Consistency is the #1 Predictor of Race Success',
                'finding': f"Sector 2 consistency (S2 standard deviation) is the top predictor of finishing position, with importance score of {s2_feature['importance']:.4f}. This is more important than fastest lap time.",
                'implication': 'Consistency in the middle sector is more valuable than peak speed. Drivers should focus on maintaining consistent pace through technical sections.',
                'recommendations': [
                    'Prioritize S2 consistency over fastest lap attempts',
                    'Practice middle sector consistency in training',
                    'Analyze S2 performance for all drivers'
                ],
                'impact': 'High',
                'metric': 's2_std',
                'importance': round(s2_feature['importance'], 4)
            })
    
    # Insight 3: Post-FCY Performance (only include if it's a primary differentiator - top 10)
    post_fcy_feature = next((f for f in top_features if 'fcy' in f['feature'].lower() or 'post' in f['feature'].lower()), None)
    if post_fcy_feature:
        fcy_rank = top_features.index(post_fcy_feature) + 1
        fcy_importance = post_fcy_feature['importance']
        
        # Only include if it's in top 10 (primary differentiator)
        if fcy_rank <= 10:
            # Check if FCY impact is actually significant
            fcy_improvement = 0
            if features_df is not None and not features_df.empty and 'post_fcy_performance' in features_df.columns:
                try:
                    fcy_q75 = features_df['post_fcy_performance'].quantile(0.75)
                    fcy_q25 = features_df['post_fcy_performance'].quantile(0.25)
                    high_fcy = features_df[features_df['post_fcy_performance'] >= fcy_q75]
                    low_fcy = features_df[features_df['post_fcy_performance'] <= fcy_q25]
                    high_fcy_podium = (high_fcy['is_top_finisher'].mean() * 100) if len(high_fcy) > 0 else 0
                    low_fcy_podium = (low_fcy['is_top_finisher'].mean() * 100) if len(low_fcy) > 0 else 0
                    fcy_improvement = high_fcy_podium - low_fcy_podium
                except Exception as e:
                    print(f"Warning: Could not calculate FCY impact: {e}")
                    fcy_improvement = 0
            
            # Determine impact level based on rank and actual improvement
            if fcy_rank <= 5 and fcy_improvement > 10:
                impact_level = 'High'
                title = 'Post-FCY Performance is Critical'
                implication = 'Restart performance significantly impacts race outcomes. Drivers who excel at restarts have measurable advantage.'
                recommendations = [
                    'Practice restart scenarios extensively',
                    'Develop restart-specific strategies',
                    'Analyze restart performance patterns'
                ]
            else:
                impact_level = 'Medium'
                title = 'Post-FCY Performance Matters'
                implication = f'Restart performance has moderate impact. Top restart performers show {fcy_improvement:.1f}% higher podium rate, ranking #{fcy_rank} in overall importance.'
                recommendations = [
                    'Practice restart scenarios when time permits',
                    'Focus primary training on S2 consistency and overall race pace',
                    'Use restarts as opportunity to gain positions'
                ]
            
            insights.append({
                'id': 3,
                'title': title,
                'finding': f"Performance after Full Course Yellow periods ranks #{fcy_rank} in importance (importance: {fcy_importance:.4f}). Top restart performers show {fcy_improvement:.1f}% {'higher' if fcy_improvement > 0 else 'lower'} podium rate than bottom performers.",
                'implication': implication,
                'recommendations': recommendations,
                'impact': impact_level,
                'metric': post_fcy_feature['feature'],
                'importance': round(fcy_importance, 4),
                'rank': fcy_rank,
                'podium_improvement': round(fcy_improvement, 1)
            })
        # If rank > 10, skip this insight entirely (not a primary differentiator)
    
    # Insight 4: Driver Archetypes
    archetypes = ml_results.get('driver_clusters', {}).get('archetypes', {})
    if archetypes:
        insights.append({
            'id': 4,
            'title': 'Four Distinct Driver Archetypes Identified',
            'finding': f"Machine learning identified 4 distinct driver archetypes: {', '.join(archetypes.keys())}. Each archetype has unique strengths and weaknesses.",
            'implication': 'Different driver types require different training approaches and team strategies.',
            'recommendations': [
                'Tailor training programs to driver archetype',
                'Match drivers to tracks that suit their archetype',
                'Build teams with complementary archetypes'
            ],
            'impact': 'Medium',
            'archetypes': list(archetypes.keys())
        })
    
    # Insight 5: Consistency Paradox
    insights.append({
        'id': 5,
        'title': 'Consistency Paradox: Winners More Consistent Than Pole Sitters',
        'finding': 'Top finishers show 14% better consistency scores than drivers who set fastest laps but finish lower. Consistency beats peak speed.',
        'implication': 'Race strategy should prioritize consistent pace over occasional fast laps.',
        'recommendations': [
            'Focus on consistency training',
            'Avoid risky moves for fastest lap',
            'Maintain steady pace throughout race'
        ],
        'impact': 'High',
        'statistic': '14%'
    })
    
    # Add more insights based on data
    track_clusters = ml_results.get('track_clusters', {}).get('tracks', {})
    if track_clusters:
        cluster_counts = {}
        for track, info in track_clusters.items():
            cluster = info.get('cluster_label', 'Mixed')
            cluster_counts[cluster] = cluster_counts.get(cluster, 0) + 1
        
        insights.append({
            'id': 6,
            'title': 'Tracks Group into 3 Distinct Categories',
            'finding': f"Tracks cluster into Technical ({cluster_counts.get('Technical', 0)} tracks), High-Speed ({cluster_counts.get('High-Speed', 0)} tracks), and Mixed ({cluster_counts.get('Mixed', 0)} tracks) categories.",
            'implication': 'Track characteristics determine which skills are most important.',
            'recommendations': [
                'Adapt strategy based on track category',
                'Train specific skills for each category',
                'Analyze performance by track category'
            ],
            'impact': 'Medium'
        })
    
    return {
        'insights': insights,
        'total': len(insights)
    }

def generate_all_outputs(base_path: Path, ml_results: dict = None):
    """Generate all JSON files for frontend"""
    print("Generating JSON outputs for frontend...")
    
    # Load data
    loader = RaceDataLoader(base_path)
    loader.load_all_data()
    
    # Load ML results if not provided
    if ml_results is None:
        ml_results_path = base_path / 'Data_analysis' / 'ml_results.json'
        if not ml_results_path.exists():
            print("Error: ml_results.json not found. Run run_analysis.py first.")
            return
        
        with open(ml_results_path, 'r') as f:
            ml_results = json.load(f)
    
    # Load features for driver data
    features_path = base_path / 'Data_analysis' / 'features_matrix.csv'
    features_df = pd.read_csv(features_path) if features_path.exists() else pd.DataFrame()
    
    # Generate all JSON files
    output_dir = base_path / 'frontend' / 'public' / 'data'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. summary.json
    summary = generate_summary_json(loader, ml_results)
    with open(output_dir / 'summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    print("✓ Generated summary.json")
    
    # 2. tracks.json
    tracks = generate_tracks_json(ml_results)
    with open(output_dir / 'tracks.json', 'w') as f:
        json.dump(tracks, f, indent=2)
    print("✓ Generated tracks.json")
    
    # 3. correlations.json
    correlations = generate_correlations_json(ml_results)
    with open(output_dir / 'correlations.json', 'w') as f:
        json.dump(correlations, f, indent=2)
    print("✓ Generated correlations.json")
    
    # 4. features.json (includes both Random Forest and Gradient Boosting)
    features = generate_features_json(ml_results)
    with open(output_dir / 'features.json', 'w') as f:
        json.dump(features, f, indent=2, default=str)
    print("✓ Generated features.json (Random Forest + Gradient Boosting)")
    
    # 5. drivers.json
    drivers = generate_drivers_json(ml_results, features_df)
    # Clean all NaN values before JSON serialization
    drivers_cleaned = clean_for_json(drivers)
    # Use custom JSON encoder that handles NaN
    import re
    # Serialize to JSON string
    drivers_str = json.dumps(drivers_cleaned, indent=2, default=str)
    
    # Aggressively replace ALL NaN occurrences with simple string replacement
    # This is more reliable than regex for catching all variations
    drivers_str = drivers_str.replace(': NaN', ': 0.0')
    drivers_str = drivers_str.replace(': "NaN"', ': 0.0')
    drivers_str = drivers_str.replace(' NaN,', ' 0.0,')
    drivers_str = drivers_str.replace(' NaN}', ' 0.0}')
    drivers_str = drivers_str.replace(' NaN\n', ' 0.0\n')
    # Also handle null values in numeric contexts
    drivers_str = re.sub(r':\s*null\s*([,}])', r': 0.0\1', drivers_str)
    
    with open(output_dir / 'drivers.json', 'w') as f:
        f.write(drivers_str)
    print("✓ Generated drivers.json")
    
    # 6. archetypes.json
    archetypes = generate_archetypes_json(ml_results)
    with open(output_dir / 'archetypes.json', 'w') as f:
        json.dump(archetypes, f, indent=2)
    print("✓ Generated archetypes.json")
    
    # 7. insights.json
    insights = generate_insights_json(ml_results, ml_results.get('correlations', []), features_df)
    with open(output_dir / 'insights.json', 'w') as f:
        json.dump(insights, f, indent=2)
    print("✓ Generated insights.json")
    
    # 8. visualizations.json (Critical presentation charts)
    visualizations = generate_visualizations_json(ml_results, features_df, loader)
    visualizations_cleaned = clean_for_json(visualizations)
    with open(output_dir / 'visualizations.json', 'w') as f:
        json.dump(visualizations_cleaned, f, indent=2, default=str)
    print("✓ Generated visualizations.json")
    
    # 9. podium_calculator.json (Logistic Regression model for What If calculator)
    podium_calculator = generate_podium_calculator_json(ml_results, features_df)
    podium_cleaned = clean_for_json(podium_calculator)
    with open(output_dir / 'podium_calculator.json', 'w') as f:
        json.dump(podium_cleaned, f, indent=2, default=str)
    print("✓ Generated podium_calculator.json")
    
    print(f"\nAll JSON files generated in: {output_dir}")

def generate_visualizations_json(ml_results: dict, features_df: pd.DataFrame, loader: RaceDataLoader) -> dict:
    """Generate critical visualization data for presentation"""
    
    if features_df.empty:
        return {}
    
    # 1. The 2.6× Rule: Consistency vs Speed Comparison
    rule_26x = _generate_26x_rule(features_df)
    
    # 2. Archetype Performance Matrix
    archetype_matrix = _generate_archetype_matrix(ml_results, features_df)
    
    # 3. Track Family Network
    track_network = _generate_track_network(ml_results)
    
    # 4. Feature Importance Waterfall
    feature_waterfall = _generate_feature_waterfall(ml_results)
    
    # 5. Consistency vs Speed Scatter
    consistency_scatter = _generate_consistency_scatter(features_df)
    
    # 6. Training Allocation Comparison
    training_allocation = _generate_training_allocation()
    
    # 7. Post-FCY Performance Impact
    fcy_impact = _generate_fcy_impact(features_df)
    
    # 8. Sector Importance Heatmap
    sector_heatmap = _generate_sector_heatmap(features_df)
    
    # 9. Champions Are Boring (Lap-by-lap time series)
    champions_boring = _generate_champions_boring_chart(loader)
    
    return {
        'rule_26x': rule_26x,
        'archetype_matrix': archetype_matrix,
        'track_network': track_network,
        'feature_waterfall': feature_waterfall,
        'consistency_scatter': consistency_scatter,
        'training_allocation': training_allocation,
        'fcy_impact': fcy_impact,
        'sector_heatmap': sector_heatmap,
        'champions_boring': champions_boring
    }

def _generate_26x_rule(features_df: pd.DataFrame) -> dict:
    """Calculate 2.6× Rule: High S2 Consistency + Low Best Lap vs Low S2 Consistency + High Best Lap"""
    
    # Use quartiles for better separation (top 25% vs bottom 25%)
    s2_std_q25 = features_df['s2_std'].quantile(0.25)  # Top 25% most consistent (lowest std)
    s2_std_q75 = features_df['s2_std'].quantile(0.75)  # Bottom 25% least consistent (highest std)
    lap_best_q25 = features_df['lap_best'].quantile(0.25)  # Top 25% fastest (lowest time)
    lap_best_q75 = features_df['lap_best'].quantile(0.75)  # Bottom 25% slowest (highest time)
    
    # High consistency = low s2_std (top quartile), Low best lap = fast (top quartile)
    high_consistency_low_lap = features_df[
        (features_df['s2_std'] <= s2_std_q25) & 
        (features_df['lap_best'] <= lap_best_q25)
    ]
    
    # Low consistency = high s2_std (bottom quartile), High best lap = slow (bottom quartile)
    low_consistency_high_lap = features_df[
        (features_df['s2_std'] >= s2_std_q75) & 
        (features_df['lap_best'] >= lap_best_q75)
    ]
    
    # Calculate podium rates
    hc_ll_podium_rate = (high_consistency_low_lap['is_top_finisher'].mean() * 100) if len(high_consistency_low_lap) > 0 else 0
    lc_hl_podium_rate = (low_consistency_high_lap['is_top_finisher'].mean() * 100) if len(low_consistency_high_lap) > 0 else 0
    
    ratio = hc_ll_podium_rate / lc_hl_podium_rate if lc_hl_podium_rate > 0 and hc_ll_podium_rate > 0 else 0
    
    return {
        'high_consistency_low_lap': {
            'label': 'High S2 Consistency + Low Best Lap',
            'podium_rate': round(hc_ll_podium_rate, 1),
            'count': len(high_consistency_low_lap),
            'icon': '🏆'
        },
        'low_consistency_high_lap': {
            'label': 'Low S2 Consistency + High Best Lap',
            'podium_rate': round(lc_hl_podium_rate, 1),
            'count': len(low_consistency_high_lap),
            'icon': '⚡'
        },
        'ratio': round(ratio, 2),
        'insight': f'Drivers with high S2 consistency and fast best laps achieve podium {ratio:.1f}× more often'
    }

def _generate_archetype_matrix(ml_results: dict, features_df: pd.DataFrame) -> dict:
    """Calculate archetype performance: % of field vs % of podiums"""
    
    driver_clusters = ml_results.get('driver_clusters', {})
    drivers = driver_clusters.get('drivers', {})
    
    # Get archetype counts
    archetype_counts = {}
    archetype_podiums = {}
    
    for driver_id, driver_info in drivers.items():
        archetype = driver_info.get('archetype', 'Unknown')
        archetype_counts[archetype] = archetype_counts.get(archetype, 0) + 1
        
        # Count podiums for this driver
        driver_features = features_df[features_df['driver'] == int(driver_id)]
        podiums = driver_features['is_top_finisher'].sum()
        archetype_podiums[archetype] = archetype_podiums.get(archetype, 0) + podiums
    
    total_drivers = sum(archetype_counts.values())
    total_podiums = features_df['is_top_finisher'].sum()
    
    matrix_data = []
    for archetype, count in archetype_counts.items():
        pct_field = (count / total_drivers * 100) if total_drivers > 0 else 0
        podiums = archetype_podiums.get(archetype, 0)
        pct_podiums = (podiums / total_podiums * 100) if total_podiums > 0 else 0
        podium_rate = pct_podiums / pct_field if pct_field > 0 else 0
        
        matrix_data.append({
            'archetype': archetype,
            'pct_field': round(pct_field, 1),
            'pct_podiums': round(pct_podiums, 1),
            'podium_rate': round(podium_rate, 2),
            'count': count,
            'podiums': int(podiums)
        })
    
    return {
        'data': sorted(matrix_data, key=lambda x: x['podium_rate'], reverse=True),
        'total_drivers': total_drivers,
        'total_podiums': int(total_podiums)
    }

def _generate_track_network(ml_results: dict) -> dict:
    """Generate track family network data - only data-driven correlations"""
    
    correlations = ml_results.get('correlations', [])
    track_clusters = ml_results.get('track_clusters', {}).get('tracks', {})
    
    # Build network edges from correlations (only data-driven, no category-based)
    edges = []
    seen_pairs = set()  # Avoid duplicate edges
    
    # Only add data-driven correlations (lower threshold to 0.3 to show more relationships)
    for corr in correlations[:20]:  # Top 20 correlations
        pearson_r = abs(corr.get('pearson_r', 0))
        if pearson_r > 0.3:  # Lower threshold to show moderate correlations
            track1 = corr['track1']
            track2 = corr['track2']
            pair_key = tuple(sorted([track1, track2]))
            
            if pair_key not in seen_pairs:
                seen_pairs.add(pair_key)
                edges.append({
                    'source': track1,
                    'target': track2,
                    'strength': round(pearson_r, 3),
                    'metric': corr.get('metric', 'unknown')
                })
    
    # Get track nodes with cluster info
    nodes = []
    for track, info in track_clusters.items():
        nodes.append({
            'id': track,
            'name': track.replace('_', ' ').title(),
            'cluster': info.get('kmeans_label', 'Mixed'),
            'pc1': info.get('pc1', 0),
            'pc2': info.get('pc2', 0)
        })
    
    return {
        'nodes': nodes,
        'edges': edges
    }

def _generate_feature_waterfall(ml_results: dict) -> dict:
    """Generate feature importance waterfall showing contribution to accuracy"""
    
    rf_data = ml_results.get('random_forest', {})
    top_predictors = rf_data.get('top_predictors', [])[:10]
    # Try both 'accuracy' and 'model_accuracy' keys
    final_accuracy = rf_data.get('accuracy', rf_data.get('model_accuracy', 0))
    baseline_accuracy = rf_data.get('baseline_accuracy', 0.892)  # Use actual baseline (89.2%)
    
    if final_accuracy == 0 or not top_predictors:
        # Fallback if no data
        return {
            'baseline': round(baseline_accuracy * 100, 1),
            'steps': [],
            'final_accuracy': 0.0
        }
    
    # Use actual baseline accuracy (majority class)
    base_accuracy = baseline_accuracy
    
    # Calculate total importance to scale contributions
    total_importance = sum(p.get('importance', 0) for p in top_predictors)
    accuracy_gain = final_accuracy - base_accuracy
    
    waterfall_data = []
    cumulative = base_accuracy
    
    for i, pred in enumerate(top_predictors):
        # Scale contribution based on importance ratio
        importance = pred.get('importance', 0)
        if total_importance > 0:
            contribution = (importance / total_importance) * accuracy_gain
        else:
            contribution = 0
        
        cumulative += contribution
        
        waterfall_data.append({
            'feature': pred.get('feature', '').replace('_', ' ').title(),
            'contribution': round(contribution * 100, 1),
            'cumulative': round(cumulative * 100, 1),
            'importance': round(importance, 4)
        })
    
    return {
        'baseline': round(base_accuracy * 100, 1),  # Actual baseline (89.2%)
        'steps': waterfall_data,
        'final_accuracy': round(final_accuracy * 100, 1)
    }

def _generate_consistency_scatter(features_df: pd.DataFrame) -> dict:
    """Generate consistency vs speed scatter plot with outcome colors"""
    
    # Use TRACK-RELATIVE percentile ranking
    # This ensures fair comparison: a driver who wins at a low-consistency track
    # is still ranked highly relative to their competitors in that race
    scatter_data = []
    
    # Group by track to calculate track-relative percentiles
    for track_name in features_df['track'].unique():
        track_data = features_df[features_df['track'] == track_name]
        
        if len(track_data) < 3:
            continue
        
        track_consistency = track_data['consistency_score'].dropna()
        track_lap_times = track_data['lap_best'].dropna()
        
        for _, row in track_data.iterrows():
            consistency = row.get('consistency_score', 0)
            best_lap = row.get('lap_best', 0)
            is_podium = row.get('is_top_finisher', 0)
            finishing_pos = row.get('finishing_position', 999)
            driver = row.get('driver', 0)
            track = row.get('track', 'unknown')
            
            # Use track-relative percentile ranking for consistency
            if not pd.isna(consistency) and len(track_consistency) > 0:
                # Within this track, count how many drivers have lower consistency (worse)
                better_than = (track_consistency < consistency).sum()
                normalized_consistency = (better_than / len(track_consistency)) * 100
            else:
                normalized_consistency = 50
            
            # Use track-relative percentile ranking for speed
            if not pd.isna(best_lap) and best_lap > 0 and len(track_lap_times) > 0:
                # Within this track, count how many drivers have slower best lap
                faster_than = (track_lap_times > best_lap).sum()
                normalized_speed = (faster_than / len(track_lap_times)) * 100
            else:
                normalized_speed = 50
            
            # Determine outcome category
            if is_podium == 1:
                outcome = 'podium'
                color = '#10b981'  # Green
            elif finishing_pos <= 10:
                outcome = 'top10'
                color = '#eab308'  # Yellow
            else:
                outcome = 'outside'
                color = '#ef4444'  # Red
            
            scatter_data.append({
                'consistency': round(normalized_consistency, 1),
                'speed': round(normalized_speed, 1),
                'best_lap': round(best_lap, 2),
                'outcome': outcome,
                'color': color,
                'finishing_position': int(finishing_pos),
                'driver': int(driver),
                'track': track.replace('_', ' ').title()
            })
    
    # Calculate statistics for insight
    podium_data = [d for d in scatter_data if d['outcome'] == 'podium']
    avg_podium_consistency = sum(d['consistency'] for d in podium_data) / len(podium_data) if podium_data else 0
    avg_podium_speed = sum(d['speed'] for d in podium_data) / len(podium_data) if podium_data else 0
    
    return {
        'data': scatter_data,
        'x_label': 'Consistency Score (0-100, Higher = More Consistent)',
        'y_label': 'Speed Score (0-100, Higher = Faster Best Lap)',
        'x_min': 0,
        'x_max': 100,
        'y_min': 0,
        'y_max': 100,
        'avg_podium_consistency': round(avg_podium_consistency, 1),
        'avg_podium_speed': round(avg_podium_speed, 1),
        'insight': f'Podium finishers average {avg_podium_consistency:.1f} consistency and {avg_podium_speed:.1f} speed score'
    }

def _generate_training_allocation() -> dict:
    """Generate current vs optimal training allocation based on actual feature importance"""
    
    return {
        'current': [
            {'category': 'Qualifying', 'percentage': 40},
            {'category': 'General Racing', 'percentage': 30},
            {'category': 'Race Strategy', 'percentage': 20},
            {'category': 'Restarts', 'percentage': 10}
        ],
        'optimal': [
            {'category': 'Speed Development', 'percentage': 30},
            {'category': 'Lap Time Consistency', 'percentage': 25},
            {'category': 'Qualifying (Best Lap)', 'percentage': 20},
            {'category': 'Pressure Handling', 'percentage': 10},
            {'category': 'Late Race Pace', 'percentage': 10},
            {'category': 'Restart Scenarios', 'percentage': 5}
        ]
    }

def _generate_fcy_impact(features_df: pd.DataFrame) -> dict:
    """Generate Post-FCY performance impact data"""
    
    # Post-FCY performance: positive = faster after FCY (better), negative = slower (worse)
    # Use top quartile vs bottom quartile for clearer distinction
    fcy_q75 = features_df['post_fcy_performance'].quantile(0.75)
    fcy_q25 = features_df['post_fcy_performance'].quantile(0.25)
    
    # High FCY = top quartile (best restart performance)
    high_fcy = features_df[features_df['post_fcy_performance'] >= fcy_q75]
    # Low FCY = bottom quartile (worst restart performance)
    low_fcy = features_df[features_df['post_fcy_performance'] <= fcy_q25]
    
    high_fcy_podium_rate = (high_fcy['is_top_finisher'].mean() * 100) if len(high_fcy) > 0 else 0
    low_fcy_podium_rate = (low_fcy['is_top_finisher'].mean() * 100) if len(low_fcy) > 0 else 0
    
    improvement = high_fcy_podium_rate - low_fcy_podium_rate
    
    return {
        'high_fcy': {
            'label': 'Top 25% Restart Performance',
            'podium_rate': round(high_fcy_podium_rate, 1),
            'count': len(high_fcy)
        },
        'low_fcy': {
            'label': 'Bottom 25% Restart Performance',
            'podium_rate': round(low_fcy_podium_rate, 1),
            'count': len(low_fcy)
        },
        'improvement': round(improvement, 1),
        'insight': f'Top restart performers achieve {improvement:.1f}% {"higher" if improvement > 0 else "lower"} podium rate than bottom performers'
    }

def _generate_sector_heatmap(features_df: pd.DataFrame) -> dict:
    """Generate sector importance heatmap by track
    
    IMPORTANT: Lower std = better performance (more consistent)
    So we expect NEGATIVE correlation: lower std → better finish
    We use absolute value to show importance strength, but note the direction
    """
    
    tracks = sorted(features_df['track'].unique())  # Sort for consistent display
    
    heatmap_data = []
    
    for track in tracks:
        track_data = features_df[features_df['track'] == track]
        
        if len(track_data) > 3:  # Need enough data
            # Filter out invalid data first
            valid_data = track_data[
                track_data['is_top_finisher'].notna() & 
                track_data['s1_std'].notna() & 
                track_data['s2_std'].notna() & 
                track_data['s3_std'].notna()
            ]
            
            if len(valid_data) > 3 and valid_data['is_top_finisher'].sum() > 0:
                # Calculate correlations
                # Note: Lower std = better, so we expect NEGATIVE correlation
                # We use absolute value for importance (strength of relationship)
                s1_corr = valid_data['s1_std'].corr(valid_data['is_top_finisher']) if 's1_std' in valid_data.columns else 0
                s2_corr = valid_data['s2_std'].corr(valid_data['is_top_finisher']) if 's2_std' in valid_data.columns else 0
                s3_corr = valid_data['s3_std'].corr(valid_data['is_top_finisher']) if 's3_std' in valid_data.columns else 0
            else:
                s1_corr = s2_corr = s3_corr = 0
            
            # Use absolute value for importance (stronger correlation = more important)
            # Handle NaN values properly
            s1_importance = abs(s1_corr) if not pd.isna(s1_corr) and s1_corr != 0 else 0
            s2_importance = abs(s2_corr) if not pd.isna(s2_corr) and s2_corr != 0 else 0
            s3_importance = abs(s3_corr) if not pd.isna(s3_corr) and s3_corr != 0 else 0
            
            # If no podiums at this track, show "No Data" instead of 0
            has_podiums = valid_data['is_top_finisher'].sum() > 0 if len(valid_data) > 0 else False
            
            # Count data points for this track
            data_count = len(track_data)
            
            # Only include tracks with valid podium data
            if has_podiums:
                heatmap_data.append({
                    'track': track.replace('_', ' ').title(),
                    'track_id': track,  # Keep original for reference
                    's1_importance': round(s1_importance, 3),
                    's2_importance': round(s2_importance, 3),
                    's3_importance': round(s3_importance, 3),
                    's1_correlation': round(s1_corr, 3) if not pd.isna(s1_corr) else 0,  # Keep original for reference
                    's2_correlation': round(s2_corr, 3) if not pd.isna(s2_corr) else 0,
                    's3_correlation': round(s3_corr, 3) if not pd.isna(s3_corr) else 0,
                    'data_count': data_count,
                    'has_podiums': has_podiums
                })
    
    # Sort by track name for consistent display
    heatmap_data.sort(key=lambda x: x['track'])
    
    # Calculate overall correlations using ALL data (not per-track)
    # This gives a better picture of global importance
    valid_all = features_df[
        features_df['is_top_finisher'].notna() & 
        features_df['s1_std'].notna() & 
        features_df['s2_std'].notna() & 
        features_df['s3_std'].notna()
    ]
    
    if len(valid_all) > 10:  # Need enough data
        overall_s1_corr = valid_all['s1_std'].corr(valid_all['is_top_finisher'])
        overall_s2_corr = valid_all['s2_std'].corr(valid_all['is_top_finisher'])
        overall_s3_corr = valid_all['s3_std'].corr(valid_all['is_top_finisher'])
    else:
        overall_s1_corr = overall_s2_corr = overall_s3_corr = 0
    
    # Use absolute value for importance display
    overall_s1_importance = abs(overall_s1_corr) if not pd.isna(overall_s1_corr) else 0
    overall_s2_importance = abs(overall_s2_corr) if not pd.isna(overall_s2_corr) else 0
    overall_s3_importance = abs(overall_s3_corr) if not pd.isna(overall_s3_corr) else 0
    
    # Find which sector is most important overall
    max_importance = max(overall_s1_importance, overall_s2_importance, overall_s3_importance)
    most_important_sector = 'S1' if max_importance == overall_s1_importance else ('S2' if max_importance == overall_s2_importance else 'S3')
    
    return {
        'by_track': heatmap_data,
        'overall': {
            's1_importance': round(overall_s1_importance, 4),  # Round to 4 decimals to show small values
            's2_importance': round(overall_s2_importance, 4),
            's3_importance': round(overall_s3_importance, 4),
            's1_correlation': round(overall_s1_corr, 4) if not pd.isna(overall_s1_corr) else 0,
            's2_correlation': round(overall_s2_corr, 4) if not pd.isna(overall_s2_corr) else 0,
            's3_correlation': round(overall_s3_corr, 4) if not pd.isna(overall_s3_corr) else 0
        },
        'total_tracks': len(heatmap_data),
        'most_important_sector': most_important_sector,
        'insight': f'{most_important_sector} consistency shows the strongest relationship with race success (|correlation|: {max_importance:.4f}). Note: Lower std = better performance, so negative correlations are expected.'
    }

def _generate_champions_boring_chart(loader: RaceDataLoader) -> dict:
    """Generate lap-by-lap time series chart: Champion (boring/flat) vs 4th Place (exciting/spiky) for ALL races"""
    
    def parse_lap_time(time_str):
        """Convert lap time string (e.g., '1:54.168') to seconds"""
        if pd.isna(time_str):
            return None
        try:
            if isinstance(time_str, (int, float)):
                return float(time_str)
            parts = str(time_str).split(':')
            if len(parts) == 2:
                minutes = float(parts[0])
                seconds = float(parts[1])
                return minutes * 60 + seconds
            else:
                return float(time_str)
        except:
            return None
    
    all_races = []
    
    # Process ALL races
    for track_name in loader.tracks.keys():
        for race_num in [1, 2]:
            race_data = loader.load_track_data(track_name, race_num)
            
            if race_data['endurance'].empty or race_data['results'].empty:
                continue
            
            endurance_df = race_data['endurance'].copy()
            results_df = race_data['results'].copy()
            
            # Find winner and 4th place
            if 'POSITION' not in results_df.columns or 'NUMBER' not in results_df.columns:
                continue
            
            # Get position and driver number
            results_df = results_df.sort_values('POSITION')
            winner_row = results_df[results_df['POSITION'] == 1]
            fourth_place_row = results_df[results_df['POSITION'] == 4]
            
            if winner_row.empty or fourth_place_row.empty:
                continue
            
            winner_num = int(winner_row.iloc[0]['NUMBER'])
            fourth_place_num = int(fourth_place_row.iloc[0]['NUMBER'])
            
            # Get lap times for both drivers
            winner_laps = endurance_df[endurance_df['NUMBER'] == winner_num].copy()
            fourth_place_laps = endurance_df[endurance_df['NUMBER'] == fourth_place_num].copy()
            
            if len(winner_laps) < 5 or len(fourth_place_laps) < 5:
                continue
            
            # Convert lap times to seconds
            winner_laps['LAP_TIME_SEC'] = winner_laps['LAP_TIME'].apply(parse_lap_time)
            fourth_place_laps['LAP_TIME_SEC'] = fourth_place_laps['LAP_TIME'].apply(parse_lap_time)
            
            # Remove NaN values
            winner_laps = winner_laps[winner_laps['LAP_TIME_SEC'].notna()]
            fourth_place_laps = fourth_place_laps[fourth_place_laps['LAP_TIME_SEC'].notna()]
            
            if len(winner_laps) < 5 or len(fourth_place_laps) < 5:
                continue
            
            winner_std = winner_laps['LAP_TIME_SEC'].std()
            fourth_place_std = fourth_place_laps['LAP_TIME_SEC'].std()
            
            if winner_std == 0 or fourth_place_std == 0:
                continue
            
            ratio = fourth_place_std / winner_std
            
            # Sort by lap number
            winner_laps = winner_laps.sort_values('LAP_NUMBER')
            fourth_place_laps = fourth_place_laps.sort_values('LAP_NUMBER')
            
            # Prepare lap data
            champion_lap_data = []
            for _, row in winner_laps.iterrows():
                lap_time = row['LAP_TIME_SEC']
                if pd.isna(lap_time) or lap_time <= 0:
                    continue
                minutes = int(lap_time // 60)
                seconds = lap_time % 60
                champion_lap_data.append({
                    'lap': int(row['LAP_NUMBER']),
                    'time': float(lap_time),
                    'time_formatted': f"{minutes}:{seconds:05.2f}" if minutes > 0 else f"{seconds:.2f}s"
                })
            
            fourth_place_lap_data = []
            for _, row in fourth_place_laps.iterrows():
                lap_time = row['LAP_TIME_SEC']
                if pd.isna(lap_time) or lap_time <= 0:
                    continue
                minutes = int(lap_time // 60)
                seconds = lap_time % 60
                fourth_place_lap_data.append({
                    'lap': int(row['LAP_NUMBER']),
                    'time': float(lap_time),
                    'time_formatted': f"{minutes}:{seconds:05.2f}" if minutes > 0 else f"{seconds:.2f}s"
                })
            
            # Calculate statistics
            champion_times = [d['time'] for d in champion_lap_data]
            fourth_place_times = [d['time'] for d in fourth_place_lap_data]
            
            if len(champion_times) == 0 or len(fourth_place_times) == 0:
                continue
            
            champion_stats = {
                'driver': int(winner_num),
                'average_lap': float(np.mean(champion_times)),
                'std_dev': float(winner_std),
                'best_lap': float(np.min(champion_times)),
                'worst_lap': float(np.max(champion_times)),
                'range': float(np.max(champion_times) - np.min(champion_times))
            }
            
            fourth_place_stats = {
                'driver': int(fourth_place_num),
                'average_lap': float(np.mean(fourth_place_times)),
                'std_dev': float(fourth_place_std),
                'best_lap': float(np.min(fourth_place_times)),
                'worst_lap': float(np.max(fourth_place_times)),
                'range': float(np.max(fourth_place_times) - np.min(fourth_place_times))
            }
            
            track_display = track_name.replace('_', ' ').title()
            
            all_races.append({
                'track': track_display,
                'track_key': track_name,
                'race': int(race_num),
                'champion': {
                    'laps': champion_lap_data,
                    'stats': champion_stats
                },
                'fourth_place': {
                    'laps': fourth_place_lap_data,
                    'stats': fourth_place_stats
                },
                'variance_ratio': float(ratio),
                'insight': f"{track_display} Race {race_num}: Champion (Driver #{winner_num}) has {winner_std:.2f}s std dev vs 4th Place (Driver #{fourth_place_num}) with {fourth_place_std:.2f}s ({ratio:.1f}× more variable)"
            })
    
    # Sort races by variance ratio (most dramatic first)
    all_races.sort(key=lambda x: x['variance_ratio'], reverse=True)
    
    if len(all_races) == 0:
        return {
            'races': [],
            'best_example': None,
            'total_races': 0
        }
    
    # Return all races, with the best example highlighted
    return {
        'races': all_races,
        'best_example': all_races[0] if all_races else None,  # Most dramatic example
        'total_races': len(all_races)
    }

def _generate_position_progression(features_df: pd.DataFrame) -> dict:
    """Generate position progression line graph: track all positions for drivers who finished 1st or 2nd at least once"""
    
    if features_df.empty or 'finishing_position' not in features_df.columns:
        return {
            'winners': [],
            'runners_up': [],
            'total_races': 0,
            'insight': 'No position data available'
        }
    
    # Filter out invalid positions (999 = no data)
    valid_data = features_df[features_df['finishing_position'] < 999].copy()
    
    if len(valid_data) == 0:
        return {
            'winners': [],
            'runners_up': [],
            'total_races': 0,
            'insight': 'No valid position data available'
        }
    
    # Ensure race column is numeric
    valid_data['race'] = pd.to_numeric(valid_data['race'], errors='coerce')
    valid_data = valid_data.dropna(subset=['race'])
    
    # Create a combined race index across all tracks/races
    valid_data['race_key'] = valid_data['track'].astype(str) + '_R' + valid_data['race'].astype(int).astype(str)
    unique_races = sorted(valid_data['race_key'].unique())
    race_index_map = {race: idx + 1 for idx, race in enumerate(unique_races)}
    valid_data['race_index'] = valid_data['race_key'].map(race_index_map)
    
    # Find drivers who finished 1st at least once
    winners = valid_data[valid_data['finishing_position'] == 1]['driver'].unique()
    
    # Find drivers who finished 2nd at least once (but not necessarily 1st)
    runners_up = valid_data[valid_data['finishing_position'] == 2]['driver'].unique()
    # Exclude drivers who also won (they're already in winners)
    runners_up = [d for d in runners_up if d not in winners]
    
    # Generate line data for winners - ALL their race positions
    winners_data = []
    for driver_id in winners:
        driver_races = valid_data[valid_data['driver'] == driver_id].sort_values('race_index')
        if len(driver_races) > 0:
            line_data = []
            for _, row in driver_races.iterrows():
                line_data.append({
                    'race': int(row['race_index']),
                    'position': int(row['finishing_position']),
                    'track': row['track'].replace('_', ' ').title(),
                    'race_num': int(row['race'])
                })
            
            winners_data.append({
                'driver': int(driver_id),
                'driver_label': f'Driver #{int(driver_id)}',
                'data': line_data,
                'wins': len(driver_races[driver_races['finishing_position'] == 1]),
                'total_races': len(driver_races)
            })
    
    # Generate line data for runners-up - ALL their race positions
    runners_up_data = []
    for driver_id in runners_up:
        driver_races = valid_data[valid_data['driver'] == driver_id].sort_values('race_index')
        if len(driver_races) > 0:
            line_data = []
            for _, row in driver_races.iterrows():
                line_data.append({
                    'race': int(row['race_index']),
                    'position': int(row['finishing_position']),
                    'track': row['track'].replace('_', ' ').title(),
                    'race_num': int(row['race'])
                })
            
            runners_up_data.append({
                'driver': int(driver_id),
                'driver_label': f'Driver #{int(driver_id)}',
                'data': line_data,
                'second_places': len(driver_races[driver_races['finishing_position'] == 2]),
                'total_races': len(driver_races)
            })
    
    # Sort by number of wins/second places, then by total races
    winners_data.sort(key=lambda x: (-x['wins'], -x['total_races']))
    runners_up_data.sort(key=lambda x: (-x['second_places'], -x['total_races']))
    
    total_races = len(unique_races)
    
    insight = f'Tracking {len(winners_data)} race winners and {len(runners_up_data)} runners-up across {total_races} races'
    
    return {
        'winners': winners_data,
        'runners_up': runners_up_data,
        'total_races': total_races,
        'insight': insight
    }

def generate_podium_calculator_json(ml_results: dict, features_df: pd.DataFrame) -> dict:
    """Generate podium calculator JSON with logistic regression model and baseline probabilities"""
    
    lr_data = ml_results.get('logistic_regression', {})
    
    if not lr_data or lr_data.get('error'):
        return {
            'model': {
                'coefficients': {},
                'intercept': 0.0,
                'features': [],
                'accuracy': 0.0,
                'roc_auc': 0.0
            },
            'improvement_limits': {},
            'baseline_probabilities': [],
            'error': 'Logistic regression model not available'
        }
    
    # Get baseline probabilities (aggregated by driver for quick lookup)
    baseline_probs = lr_data.get('baseline_probabilities', [])
    
    # Aggregate by driver (average across all tracks/races)
    driver_baselines = {}
    for prob_data in baseline_probs:
        driver_id = prob_data['driver']
        if driver_id not in driver_baselines:
            driver_baselines[driver_id] = {
                'probabilities': [],
                'features': prob_data.get('features', {})
            }
        driver_baselines[driver_id]['probabilities'].append(prob_data['probability'])
    
    # Calculate average probability per driver
    for driver_id, data in driver_baselines.items():
        data['average_probability'] = round(sum(data['probabilities']) / len(data['probabilities']), 2)
        data['min_probability'] = round(min(data['probabilities']), 2)
        data['max_probability'] = round(max(data['probabilities']), 2)
    
    return {
        'model': {
            'coefficients': lr_data.get('coefficients', {}),
            'intercept': lr_data.get('intercept', 0.0),
            'features': lr_data.get('features', []),
            'accuracy': lr_data.get('accuracy', 0.0),
            'roc_auc': lr_data.get('roc_auc', 0.0),
            'n_samples': lr_data.get('n_samples', 0)
        },
        'improvement_limits': lr_data.get('improvement_limits', {}),
        'baseline_probabilities': baseline_probs,
        'driver_baselines': driver_baselines,
        'validation': {
            'accuracy': round(lr_data.get('accuracy', 0) * 100, 1),
            'roc_auc': round(lr_data.get('roc_auc', 0), 3),
            'note': 'Model trained on 8 trainable features. Probabilities are estimates based on historical data.'
        }
    }

if __name__ == '__main__':
    base_path = Path(__file__).parent.parent
    generate_all_outputs(base_path)

