# 🏁 RaceIQ - Pattern Recognition Engine

**RaceIQ** is a comprehensive pattern recognition engine that analyzes racing data across seven different racetracks to discover hidden performance patterns, skill transfer correlations, and driver archetypes using unsupervised machine learning techniques.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Data Pipeline](#data-pipeline)
- [Machine Learning Algorithms](#machine-learning-algorithms)
- [Frontend Dashboard](#frontend-dashboard)
- [Key Findings](#key-findings)
- [Contributing](#contributing)

## 🎯 Overview

Unlike traditional racing analytics that focus on single-track or single-race analysis, RaceIQ performs cross-track machine learning analysis to answer questions like:

- Do skills learned at technical tracks transfer to high-speed tracks?
- What are the hidden predictors of race success that human engineers miss?
- What are the distinct driver archetypes across the entire racing series?
- How does weather, pressure, and race conditions affect different driver types?

## ✨ Features

### Data Analysis
- **Universal Data Loader**: Handles 7 different track file structures
- **57 Feature Extraction**: Comprehensive performance metrics per driver-track-race
- **7 ML Algorithms**: Cross-track correlations, track clustering, PCA, Random Forest, driver clustering, Gradient Boosting, Logistic Regression
- **Automated Pipeline**: End-to-end processing from raw data to insights

### Frontend Dashboard
- **5 Interactive Pages**: Overview, Correlations, Predictors, Drivers, Visualizations
- **Real-time Visualizations**: Correlation charts, feature importance charts, radar charts, bar charts, scatter plots, network diagrams
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Theme**: Professional UI optimized for data visualization

## 📁 Project Structure

```
racedata/
├── Data_analysis/          # Python data pipeline
│   ├── load_data.py       # Universal data loader
│   ├── engineer_features.py  # Feature extraction (57 features)
│   ├── run_analysis.py    # 7 ML algorithms
│   ├── generate_outputs.py  # JSON generator for frontend
│   ├── main.py           # Main pipeline runner
│   └── requirements.txt   # Python dependencies
│
├── frontend/              # React dashboard
│   ├── src/
│   │   ├── pages/        # 5 page components
│   │   ├── utils/        # Data loading utilities
│   │   ├── App.js        # Main app component
│   │   └── index.js      # Entry point
│   ├── public/
│   │   ├── data/         # JSON data files (generated)
│   │   └── _redirects    # Netlify SPA redirects
│   └── package.json      # Node dependencies
│
├── netlify.toml          # Netlify deployment configuration
│
├── barber/               # Track data directories
├── indianapolis/
├── COTA/
├── sebring/
├── Sonoma/
├── virginia-international-raceway/
└── road-america/
```

## 🚀 Installation

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

```bash
# Navigate to project root
cd racedata

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
cd Data_analysis
pip install -r requirements.txt
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install
```

## 💻 Usage

### Step 1: Run Data Analysis Pipeline

```bash
# From Data_analysis directory
python main.py
```

This will:
1. Load data from all 7 tracks
2. Extract 57 features per driver-track-race
3. Run all 7 ML algorithms
4. Generate JSON files for frontend

**Expected Output:**
- `features_matrix.csv` - Complete feature matrix
- `ml_results.json` - ML algorithm results
- `frontend/public/data/*.json` - 9 JSON files for dashboard

### Step 2: Start Frontend Dashboard

```bash
# From frontend directory
npm start
```

The dashboard will open at `http://localhost:3000`


## 🔄 Data Pipeline

### 1. Data Loading (`load_data.py`)
- Universal loader handles different file structures
- Supports both direct files (Barber, Indianapolis) and subdirectories (other tracks)
- Loads: Endurance analysis, Weather data, Race results

### 2. Feature Engineering (`engineer_features.py`)
Extracts **57 features** across 8 categories:

- **Sector Performance** (9): S1/S2/S3 means, stds, bests
- **Consistency** (8): Lap std, consistency score, outlier detection
- **Speed** (6): Average speed, top speed, variance
- **Race Progression** (10): Early/mid/late pace, tire degradation
- **Pressure Handling** (7): Clutch score, pressure metrics
- **Flag/Strategy** (8): FCY performance, restart metrics
- **Weather Adaptation** (5): Temperature correlation, humidity sensitivity
- **Track-Specific** (4): Sector balance, track relative performance

### 3. Machine Learning Analysis (`run_analysis.py`)

#### Algorithm 1: Cross-Track Correlations
- **Method**: Pearson & Spearman correlation
- **Purpose**: Find which skills transfer between tracks
- **Output**: Significant correlations (p<0.05, |r|>0.3)

#### Algorithm 2: Track Clustering (K-Means + Hierarchical)
- **Method**: K-Means with k=3, Hierarchical Clustering
- **Purpose**: Group tracks by characteristics
- **Output**: 3 clusters (Technical, High-Speed, Mixed)

#### Algorithm 3: PCA Dimensionality Reduction
- **Method**: Principal Component Analysis
- **Purpose**: 2D visualization of track similarities
- **Output**: PC1/PC2 coordinates, variance explained

#### Algorithm 4: Random Forest Predictor
- **Method**: Random Forest Classifier
- **Purpose**: Identify hidden performance predictors
- **Output**: Feature importance rankings, model accuracy, precision, recall, F1-score

#### Algorithm 5: Driver Clustering (K-Means + Hierarchical)
- **Method**: K-Means with k=4, Hierarchical Clustering
- **Purpose**: Identify driver archetypes
- **Output**: 4 archetypes (Smooth Operators, Qualifying Heroes, Clutch Performers, All-Rounders)

#### Algorithm 6: Gradient Boosting Predictor
- **Method**: XGBoost/LightGBM
- **Purpose**: Advanced feature importance with interaction effects
- **Output**: Feature importance, interaction effects, model accuracy

#### Algorithm 7: Logistic Regression (Podium Probability)
- **Method**: Logistic Regression with 8 trainable features
- **Purpose**: Predict podium probability for "What If" scenarios
- **Output**: Coefficients, intercept, baseline probabilities

### 4. JSON Generation (`generate_outputs.py`)
Creates 9 JSON files for frontend:
- `summary.json` - Overall statistics
- `tracks.json` - Track data with PCA coordinates
- `correlations.json` - Cross-track correlations
- `features.json` - Feature importance (Random Forest + Gradient Boosting)
- `drivers.json` - Driver profiles and scores with track-specific stats
- `archetypes.json` - Archetype descriptions
- `visualizations.json` - Data for critical presentation charts
- `podium_calculator.json` - Logistic regression model for podium probability

## 🎨 Frontend Dashboard

### Pages

1. **Overview** (`/`)
   - Hero statistics (laps, patterns, drivers, tracks)
   - About RaceIQ section explaining the project
   - Track clustering visualization

2. **Correlations** (`/correlations`)
   - List of correlation cards (ranked)
   - Filter by strength (strong/moderate/weak)
   - Interactive bar charts

3. **Predictors** (`/predictors`)
   - Feature importance horizontal bar chart
   - Model selector (Random Forest, Gradient Boosting, Combined)
   - Model accuracy display with baseline comparison
   - Feature interactions (Gradient Boosting)
   - Feature legend with explanations

4. **Drivers** (`/drivers`)
   - Single driver analysis with radar chart (8 dimensions)
   - Driver comparison tool with track-specific predictions
   - Profile panel with strengths/improvements
   - Archetype descriptions
   - Advanced fingerprint toggle

5. **Visualizations** (`/visualizations`)
   - 8 critical presentation charts:
     - 2.6× Rule visual proof
     - Archetype Performance Matrix
     - Track Family Network
     - Feature Importance Waterfall
     - Consistency vs Speed Scatter Plot
     - Training Allocation comparison
     - Post-FCY Performance Impact
     - Sector Importance Heatmap

### Visualizations

- **Correlations**: Bar Charts (Recharts BarChart)
- **Feature Importance**: Horizontal Bar Chart (Recharts BarChart)
- **Driver Fingerprint**: Radar Chart (Recharts RadarChart)
- **Consistency vs Speed**: Scatter Plot (Recharts ScatterChart)
- **Track Family Network**: SVG Network Diagram
- **Archetype Matrix**: Grouped Bar Chart (Recharts BarChart)
- **Training Allocation**: Pie Charts (Recharts PieChart)
- **Sector Importance**: Grouped Bar Chart (Recharts BarChart)

## 🔍 Key Findings

1. **S2 Consistency is #1 Predictor**: More important than fastest lap time
2. **Strong Cross-Track Correlations**: Skills transfer between similar tracks
3. **4 Driver Archetypes**: Distinct performance profiles identified (Smooth Operators, Qualifying Heroes, Clutch Performers, All-Rounders)
4. **2.6× Rule**: High S2 consistency drivers have 2.6× higher podium rate
5. **Track Family Network**: Technical tracks (Barber, VIR) show strong correlations

## 📊 Expected Results

After running the pipeline, you should see:

- **Total Laps**: ~10,000+ laps analyzed
- **Significant Correlations**: 30-50+ (p<0.05)
- **Model Accuracy**: >75% (Random Forest and Gradient Boosting)
- **Driver Archetypes**: 4 distinct types
- **Track Clusters**: 3 categories (Technical, High-Speed, Mixed)

## 🛠️ Troubleshooting

### Data Loading Issues
- Ensure all track directories exist
- Check file paths match expected structure
- Verify CSV files use semicolon separators

### Feature Engineering Issues
- Some tracks may have missing columns - handled gracefully
- Check for NaN values in output
- Verify time format conversions

### Frontend Issues
- Ensure JSON files are in `frontend/public/data/`
- Check browser console for errors
- Verify all dependencies installed

## 📝 Notes

- **Anonymized Data**: All tracks except Indianapolis have anonymized driver names
- **File Formats**: Results files use semicolons (`;`), telemetry uses commas (`,`)
- **Column Whitespace**: Some CSV files have leading spaces - automatically stripped
- **Large Files**: Telemetry files are >200MB - not loaded by default

## 🚀 Deployment

### Netlify Deployment

The project is configured for Netlify deployment:

1. **Configuration**: `netlify.toml` is set up with correct build settings
2. **SPA Routing**: `frontend/public/_redirects` handles React Router
3. **Build**: Netlify will automatically build and deploy on Git push

To deploy:
- Connect your Git repository to Netlify
- Netlify will auto-detect settings from `netlify.toml`
- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `frontend/build`

## 🤝 Contributing

This is a complete working implementation. To extend:

1. Add more features in `engineer_features.py`
2. Add new ML algorithms in `run_analysis.py`
3. Create new dashboard pages in `frontend/src/pages/`
4. Enhance visualizations with additional charts

## 📄 License

This project is provided as-is for analysis purposes.

## 🙏 Acknowledgments

- Data provided from GR Cup racing series
- Built with Python, React, and Recharts
- Inspired by Formula 1 data analytics

---

**Built with ❤️ for racing analytics**

For questions or issues, refer to the code documentation or data architecture guide.

