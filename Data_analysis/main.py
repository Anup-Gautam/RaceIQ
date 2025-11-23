"""
RaceIQ Main Pipeline
Runs the complete data analysis pipeline
"""

from pathlib import Path
from load_data import RaceDataLoader
from engineer_features import engineer_all_features
from run_analysis import run_all_analysis
from generate_outputs import generate_all_outputs

def main():
    """Run complete RaceIQ pipeline"""
    base_path = Path(__file__).parent.parent
    
    print("="*60)
    print("RACEIQ DATA ANALYSIS PIPELINE")
    print("="*60)
    
    # Step 1: Load data
    print("\n[1/4] Loading data from all tracks...")
    loader = RaceDataLoader(base_path)
    loader.load_all_data()
    stats = loader.get_summary_stats()
    print(f"✓ Loaded {stats['total_laps']:,} laps from {stats['total_races']} races")
    
    # Step 2: Engineer features
    print("\n[2/4] Engineering features...")
    features_df = engineer_all_features(loader)
    print(f"✓ Extracted {len(features_df)} driver-track-race combinations")
    
    # Save features matrix
    features_path = base_path / 'Data_analysis' / 'features_matrix.csv'
    features_df.to_csv(features_path, index=False)
    print(f"✓ Saved features matrix to {features_path}")
    
    # Step 3: Run ML analysis
    print("\n[3/4] Running machine learning algorithms...")
    ml_results = run_all_analysis(features_path)
    print("✓ Completed all 7 ML algorithms")
    
    # Save ML results
    ml_results_path = base_path / 'Data_analysis' / 'ml_results.json'
    import json
    with open(ml_results_path, 'w') as f:
        json.dump(ml_results, f, indent=2, default=str)
    print(f"✓ Saved ML results to {ml_results_path}")
    
    # Step 4: Generate JSON outputs
    print("\n[4/4] Generating JSON outputs for frontend...")
    generate_all_outputs(base_path, ml_results)
    print("✓ All JSON files generated")
    
    print("\n" + "="*60)
    print("PIPELINE COMPLETE!")
    print("="*60)
    print(f"\nNext steps:")
    print(f"1. Check frontend/public/data/ for JSON files")
    print(f"2. Start frontend: cd frontend && npm install && npm start")
    print("="*60)

if __name__ == '__main__':
    main()

