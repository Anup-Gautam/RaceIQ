"""
RaceIQ Data Loading Pipeline
Universal loader for all 7 tracks with different file structures
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
from typing import Dict, List
import warnings
warnings.filterwarnings('ignore')

class RaceDataLoader:
    """Universal data loader for all tracks"""
    
    def __init__(self, base_path: Path):
        self.base_path = base_path
        self.tracks = {
            'barber': {'path': 'barber', 'structure': 'direct'},
            'indianapolis': {'path': 'indianapolis', 'structure': 'direct'},
            'cota': {'path': 'COTA', 'structure': 'subdir'},
            'sebring': {'path': 'sebring/Sebring', 'structure': 'subdir'},
            'sonoma': {'path': 'Sonoma', 'structure': 'subdir'},
            'vir': {'path': 'virginia-international-raceway/VIR', 'structure': 'subdir'},
            'road_america': {'path': 'road-america/Road America', 'structure': 'subdir'}
        }
        self.data = {}
        
    def load_track_data(self, track_name: str, race_num: int) -> Dict:
        """Load data for a specific track and race"""
        track_info = self.tracks[track_name]
        track_path = self.base_path / track_info['path']
        
        if track_info['structure'] == 'direct':
            race_prefix = f'R{race_num}'
            if track_name == 'barber':
                endurance_file = track_path / f'23_AnalysisEnduranceWithSections_Race {race_num}_Anonymized.CSV'
                weather_file = track_path / f'26_Weather_Race {race_num}_Anonymized.CSV'
                results_file = track_path / f'03_Provisional Results_Race {race_num}_Anonymized.CSV'
            else:  # indianapolis
                endurance_file = track_path / f'23_AnalysisEnduranceWithSections_Race {race_num}.CSV'
                weather_file = track_path / f'26_Weather_Race {race_num}.CSV'
                results_file = track_path / f'03_Provisional Results_Race {race_num}.CSV'
        else:
            race_dir = track_path / f'Race {race_num}'
            endurance_file = race_dir / f'23_AnalysisEnduranceWithSections_Race {race_num}_Anonymized.CSV'
            weather_file = race_dir / f'26_Weather_Race {race_num}_Anonymized.CSV'
            results_file = race_dir / f'03_Provisional Results_Race {race_num}_Anonymized.CSV'
        
        data = {}
        
        # Load endurance analysis
        if endurance_file.exists():
            try:
                df = pd.read_csv(endurance_file, sep=';')
                df.columns = df.columns.str.strip()
                data['endurance'] = df
            except Exception as e:
                print(f"Error loading endurance for {track_name} R{race_num}: {e}")
                data['endurance'] = pd.DataFrame()
        else:
            data['endurance'] = pd.DataFrame()
        
        # Load weather
        if weather_file.exists():
            try:
                df = pd.read_csv(weather_file, sep=';')
                data['weather'] = df
            except Exception as e:
                print(f"Error loading weather for {track_name} R{race_num}: {e}")
                data['weather'] = pd.DataFrame()
        else:
            data['weather'] = pd.DataFrame()
        
        # Load results
        if results_file.exists():
            try:
                df = pd.read_csv(results_file, sep=';')
                data['results'] = df
            except Exception as e:
                print(f"Error loading results for {track_name} R{race_num}: {e}")
                data['results'] = pd.DataFrame()
        else:
            data['results'] = pd.DataFrame()
        
        return data
    
    def load_all_data(self) -> Dict:
        """Load data for all tracks and races"""
        all_data = {}
        
        for track_name in self.tracks.keys():
            all_data[track_name] = {}
            for race_num in [1, 2]:
                print(f"Loading {track_name} Race {race_num}...")
                all_data[track_name][f'race_{race_num}'] = self.load_track_data(track_name, race_num)
        
        self.data = all_data
        return all_data
    
    def get_summary_stats(self) -> Dict:
        """Get summary statistics"""
        total_laps = 0
        total_drivers = set()
        tracks_loaded = 0
        
        for track_name, races in self.data.items():
            for race_key, race_data in races.items():
                if not race_data['endurance'].empty:
                    df = race_data['endurance']
                    total_laps += len(df)
                    total_drivers.update(df['NUMBER'].unique() if 'NUMBER' in df.columns else [])
                    tracks_loaded += 1
        
        return {
            'total_laps': total_laps,
            'total_drivers': len(total_drivers),
            'tracks_loaded': tracks_loaded,
            'total_races': tracks_loaded
        }

if __name__ == '__main__':
    base_path = Path(__file__).parent.parent
    loader = RaceDataLoader(base_path)
    data = loader.load_all_data()
    stats = loader.get_summary_stats()
    
    print("\n" + "="*60)
    print("DATA LOADING SUMMARY")
    print("="*60)
    print(f"Total Laps: {stats['total_laps']:,}")
    print(f"Total Drivers: {stats['total_drivers']}")
    print(f"Races Loaded: {stats['total_races']}")
    print("="*60)
    
    # Save summary
    with open(base_path / 'Data_analysis' / 'data_summary.json', 'w') as f:
        json.dump(stats, f, indent=2)

