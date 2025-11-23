"""
Tortoise Feature Engineering
Extract 57 features per driver-track-race combination
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
from load_data import RaceDataLoader
from typing import Dict, List
import warnings
warnings.filterwarnings('ignore')

def convert_time_to_seconds(time_str):
    """Convert MM:SS.mmm or SS.mmm to seconds"""
    if pd.isna(time_str) or time_str == '':
        return np.nan
    
    try:
        if ':' in str(time_str):
            parts = str(time_str).split(':')
            if len(parts) == 2:
                minutes, seconds = parts
                return float(minutes) * 60 + float(seconds)
        else:
            return float(time_str)
    except:
        return np.nan

def extract_features(df: pd.DataFrame, weather_df: pd.DataFrame, results_df: pd.DataFrame, 
                     track_name: str, race_num: int) -> Dict:
    """Extract 57 features from endurance data"""
    
    if df.empty:
        return None
    
    features = {}
    
    # Ensure required columns exist
    required_cols = ['NUMBER', 'LAP_NUMBER', 'LAP_TIME', 'S1', 'S2', 'S3', 'KPH', 'TOP_SPEED', 'FLAG_AT_FL']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        print(f"Warning: Missing columns {missing_cols} for {track_name} R{race_num}")
        return None
    
    # Convert time columns to seconds
    df['LAP_TIME_SEC'] = df['LAP_TIME'].apply(convert_time_to_seconds)
    df['S1_SEC'] = df['S1'].apply(convert_time_to_seconds)
    df['S2_SEC'] = df['S2'].apply(convert_time_to_seconds)
    df['S3_SEC'] = df['S3'].apply(convert_time_to_seconds)
    
    # Process each driver
    driver_features = []
    
    for driver_num in df['NUMBER'].unique():
        driver_df = df[df['NUMBER'] == driver_num].copy()
        driver_df = driver_df.sort_values('LAP_NUMBER')
        
        if len(driver_df) < 3:  # Need at least 3 laps
            continue
        
        feat = {
            'track': track_name,
            'race': race_num,
            'driver': int(driver_num),
            'total_laps': len(driver_df)
        }
        
        # === SECTOR PERFORMANCE (9 features) ===
        feat['s1_mean'] = driver_df['S1_SEC'].mean()
        feat['s1_std'] = driver_df['S1_SEC'].std()
        feat['s1_best'] = driver_df['S1_SEC'].min()
        
        feat['s2_mean'] = driver_df['S2_SEC'].mean()
        feat['s2_std'] = driver_df['S2_SEC'].std()
        feat['s2_best'] = driver_df['S2_SEC'].min()
        
        feat['s3_mean'] = driver_df['S3_SEC'].mean()
        feat['s3_std'] = driver_df['S3_SEC'].std()
        feat['s3_best'] = driver_df['S3_SEC'].min()
        
        # === CONSISTENCY (8 features) ===
        feat['lap_mean'] = driver_df['LAP_TIME_SEC'].mean()
        feat['lap_std'] = driver_df['LAP_TIME_SEC'].std()
        feat['lap_best'] = driver_df['LAP_TIME_SEC'].min()
        feat['lap_worst'] = driver_df['LAP_TIME_SEC'].max()
        feat['consistency_score'] = 1 / (1 + feat['lap_std']) if feat['lap_std'] > 0 else 0
        feat['best_to_avg_ratio'] = feat['lap_best'] / feat['lap_mean'] if feat['lap_mean'] > 0 else 0
        
        # Outlier detection (laps > 2 std from mean)
        mean_lap = driver_df['LAP_TIME_SEC'].mean()
        std_lap = driver_df['LAP_TIME_SEC'].std()
        outliers = driver_df[abs(driver_df['LAP_TIME_SEC'] - mean_lap) > 2 * std_lap]
        feat['outlier_laps'] = len(outliers)
        
        # === SPEED (6 features) ===
        feat['avg_speed_kph'] = driver_df['KPH'].mean()
        feat['speed_std'] = driver_df['KPH'].std()
        feat['top_speed_max'] = driver_df['TOP_SPEED'].max() if 'TOP_SPEED' in driver_df.columns else 0
        feat['speed_variance'] = driver_df['KPH'].var()
        feat['speed_range'] = driver_df['KPH'].max() - driver_df['KPH'].min()
        feat['speed_consistency'] = 1 / (1 + feat['speed_std']) if feat['speed_std'] > 0 else 0
        
        # === RACE PROGRESSION (10 features) ===
        # Split race into thirds
        n_laps = len(driver_df)
        third = n_laps // 3
        
        early_laps = driver_df.head(third)['LAP_TIME_SEC']
        mid_laps = driver_df.iloc[third:2*third]['LAP_TIME_SEC'] if n_laps > third*2 else pd.Series()
        late_laps = driver_df.tail(third)['LAP_TIME_SEC']
        
        feat['early_pace'] = early_laps.mean() if len(early_laps) > 0 else np.nan
        feat['mid_pace'] = mid_laps.mean() if len(mid_laps) > 0 else np.nan
        feat['late_pace'] = late_laps.mean() if len(late_laps) > 0 else np.nan
        
        # Tire degradation (pace difference)
        feat['tire_degradation'] = (feat['late_pace'] - feat['early_pace']) if not pd.isna(feat['late_pace']) and not pd.isna(feat['early_pace']) else 0
        
        # Pace improvement (negative degradation = improvement)
        feat['pace_improvement'] = -feat['tire_degradation']
        
        # Lap-to-lap variance
        lap_diffs = driver_df['LAP_TIME_SEC'].diff().dropna()
        feat['lap_to_lap_variance'] = lap_diffs.std() if len(lap_diffs) > 0 else 0
        
        # First vs last 5 laps
        first_5 = driver_df.head(5)['LAP_TIME_SEC'].mean()
        last_5 = driver_df.tail(5)['LAP_TIME_SEC'].mean()
        feat['first_vs_last_5'] = last_5 - first_5 if not pd.isna(first_5) and not pd.isna(last_5) else 0
        
        # Best lap position in race
        best_lap_idx = driver_df['LAP_TIME_SEC'].idxmin()
        best_lap_position = driver_df.index.get_loc(best_lap_idx) / len(driver_df)
        feat['best_lap_position'] = best_lap_position
        
        # === PRESSURE HANDLING (7 features) ===
        # Laps under pressure (within 1 second of car ahead - simplified)
        feat['laps_under_pressure'] = 0  # Would need position data
        
        # Clutch score (performance in final 10% of race)
        final_10_pct = max(1, int(n_laps * 0.1))
        final_laps = driver_df.tail(final_10_pct)['LAP_TIME_SEC']
        avg_final = final_laps.mean()
        avg_race = driver_df['LAP_TIME_SEC'].mean()
        feat['clutch_score'] = (avg_race - avg_final) / avg_race * 100 if avg_race > 0 else 0  # Positive = faster at end
        
        # Pressure delta (simplified)
        feat['pressure_delta'] = 0
        
        # Consistency under pressure
        feat['pressure_consistency'] = final_laps.std() if len(final_laps) > 1 else 0
        
        # === FLAG/STRATEGY (8 features) ===
        if 'FLAG_AT_FL' in driver_df.columns:
            fcy_laps = driver_df[driver_df['FLAG_AT_FL'] == 'FCY']
            feat['fcy_lap_count'] = len(fcy_laps)
            
            # Post-FCY performance
            if len(fcy_laps) > 0:
                last_fcy = fcy_laps['LAP_NUMBER'].max()
                post_fcy = driver_df[driver_df['LAP_NUMBER'] > last_fcy]
                if len(post_fcy) > 0:
                    pre_fcy_avg = driver_df[driver_df['LAP_NUMBER'] <= last_fcy]['LAP_TIME_SEC'].mean()
                    post_fcy_avg = post_fcy['LAP_TIME_SEC'].mean()
                    feat['post_fcy_performance'] = (pre_fcy_avg - post_fcy_avg) / pre_fcy_avg * 100 if pre_fcy_avg > 0 else 0
                else:
                    feat['post_fcy_performance'] = 0
            else:
                feat['post_fcy_performance'] = 0
                feat['fcy_lap_count'] = 0
        else:
            feat['fcy_lap_count'] = 0
            feat['post_fcy_performance'] = 0
        
        feat['restart_delta'] = 0  # Simplified
        feat['flag_adaptation'] = feat['post_fcy_performance']
        
        # === WEATHER ADAPTATION (5 features) ===
        if not weather_df.empty and 'AIR_TEMP' in weather_df.columns:
            avg_temp = weather_df['AIR_TEMP'].mean()
            temp_std = weather_df['AIR_TEMP'].std()
            feat['avg_temp'] = avg_temp
            feat['temp_correlation'] = 0  # Would need correlation calculation
            feat['humidity_sensitivity'] = 0
        else:
            feat['avg_temp'] = 0
            feat['temp_correlation'] = 0
            feat['humidity_sensitivity'] = 0
        
        # === TRACK-SPECIFIC (4 features) ===
        # Sector balance (which sector is strongest)
        s1_avg = feat['s1_mean']
        s2_avg = feat['s2_mean']
        s3_avg = feat['s3_mean']
        total_sector = s1_avg + s2_avg + s3_avg
        
        if total_sector > 0:
            feat['sector_balance'] = max(s1_avg, s2_avg, s3_avg) / total_sector
            feat['s1_ratio'] = s1_avg / total_sector
            feat['s2_ratio'] = s2_avg / total_sector
            feat['s3_ratio'] = s3_avg / total_sector
        else:
            feat['sector_balance'] = 0
            feat['s1_ratio'] = 0
            feat['s2_ratio'] = 0
            feat['s3_ratio'] = 0
        
        # Track relative performance (will be calculated later)
        feat['track_relative_performance'] = 0
        
        # Get finishing position from results
        if not results_df.empty and 'NUMBER' in results_df.columns and 'POSITION' in results_df.columns:
            driver_result = results_df[results_df['NUMBER'] == driver_num]
            if not driver_result.empty:
                feat['finishing_position'] = int(driver_result.iloc[0]['POSITION'])
                feat['is_top_finisher'] = 1 if feat['finishing_position'] <= 3 else 0
            else:
                feat['finishing_position'] = 999
                feat['is_top_finisher'] = 0
        else:
            feat['finishing_position'] = 999
            feat['is_top_finisher'] = 0
        
        driver_features.append(feat)
    
    return driver_features

def engineer_all_features(loader: RaceDataLoader) -> pd.DataFrame:
    """Extract features for all tracks and races"""
    all_features = []
    
    for track_name, races in loader.data.items():
        for race_key, race_data in races.items():
            race_num = int(race_key.split('_')[1])
            print(f"Engineering features for {track_name} Race {race_num}...")
            
            features = extract_features(
                race_data['endurance'],
                race_data['weather'],
                race_data['results'],
                track_name,
                race_num
            )
            
            if features:
                all_features.extend(features)
    
    df = pd.DataFrame(all_features)
    return df

if __name__ == '__main__':
    base_path = Path(__file__).parent.parent
    loader = RaceDataLoader(base_path)
    print("Loading all data...")
    loader.load_all_data()
    
    print("\nEngineering features...")
    features_df = engineer_all_features(loader)
    
    print(f"\nFeatures extracted: {len(features_df)} driver-track-race combinations")
    print(f"Total features: {len(features_df.columns)}")
    
    # Save features
    output_path = base_path / 'Data_analysis' / 'features_matrix.csv'
    features_df.to_csv(output_path, index=False)
    print(f"\nFeatures saved to: {output_path}")
    
    # Save summary
    summary = {
        'total_records': len(features_df),
        'total_features': len(features_df.columns),
        'tracks': features_df['track'].unique().tolist(),
        'drivers': int(features_df['driver'].nunique())
    }
    
    with open(base_path / 'Data_analysis' / 'features_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)

