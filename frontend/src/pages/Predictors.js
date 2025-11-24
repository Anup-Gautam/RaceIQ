import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { loadFeatures } from '../utils/dataLoader';

const Predictors = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('random_forest'); // 'random_forest', 'gradient_boosting', 'combined'
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const features = await loadFeatures();
      setData(features);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!data) {
    return <div className="error">Error loading data</div>;
  }

  // Handle backward compatibility: check if old structure (flat) or new structure (nested)
  const isOldStructure = !data.random_forest && (data.top_predictors || data.feature_importance);
  
  // Normalize data structure
  const normalizedData = isOldStructure ? {
    random_forest: {
      top_predictors: data.top_predictors || (data.feature_importance ? data.feature_importance.slice(0, 15) : []),
      feature_importance: data.feature_importance || [],
      model_accuracy: data.model_accuracy || 0,
      model_type: data.model_type || 'RandomForest'
    },
    gradient_boosting: {
      top_predictors: [],
      feature_importance: [],
      model_accuracy: 0,
      model_type: 'None',
      interaction_effects: [],
      error: 'Gradient Boosting not available. Please run the analysis pipeline.'
    },
    comparison: {
      rf_accuracy: data.model_accuracy || 0,
      gb_accuracy: 0,
      best_model: 'Random Forest',
      accuracy_improvement: 0
    }
  } : data;

  // Get model data based on selection
  const getModelData = () => {
    if (selectedModel === 'random_forest') {
      const rf = normalizedData.random_forest || {};
      return {
        ...rf,
        accuracy: rf.model_accuracy || rf.accuracy || 0
      };
    } else if (selectedModel === 'gradient_boosting') {
      const gb = normalizedData.gradient_boosting || {};
      // If gradient boosting has error or no data, fall back to showing error message
      if (gb.error || (!gb.top_predictors || gb.top_predictors.length === 0)) {
        return {
          ...gb,
          top_predictors: [],
          accuracy: 0,
          error: gb.error || 'Gradient Boosting data not available. Please run the analysis pipeline.'
        };
      }
      return {
        ...gb,
        accuracy: gb.model_accuracy || gb.accuracy || 0
      };
    } else {
      // Combined: merge top predictors from both models
      const rf = normalizedData.random_forest || {};
      const gb = normalizedData.gradient_boosting || {};
      const rfPredictors = rf.top_predictors || [];
      const gbPredictors = (gb.error || !gb.top_predictors) ? [] : gb.top_predictors;
      
      // If gradient boosting is not available, just return random forest data
      if (gb.error || gbPredictors.length === 0) {
      return {
        ...rf, // Include all RF properties (precision, recall, f1_score, etc.)
        top_predictors: rfPredictors,
        model_type: 'Random Forest (GB not available)',
        accuracy: rf.model_accuracy || rf.accuracy || 0,
        error: 'Gradient Boosting not available. Showing Random Forest only.'
      };
      }
      
      // Create a map to combine importances
      const combinedMap = new Map();
      rfPredictors.forEach(p => {
        combinedMap.set(p.feature, { rf: p.importance, gb: 0 });
      });
      gbPredictors.forEach(p => {
        if (combinedMap.has(p.feature)) {
          combinedMap.get(p.feature).gb = p.importance;
        } else {
          combinedMap.set(p.feature, { rf: 0, gb: p.importance });
        }
      });
      
      // Calculate average importance
      const combined = Array.from(combinedMap.entries()).map(([feature, importances]) => ({
        feature,
        importance: (importances.rf + importances.gb) / 2,
        rf_importance: importances.rf,
        gb_importance: importances.gb
      })).sort((a, b) => b.importance - a.importance).slice(0, 15);
      
      const rfAccuracy = rf.model_accuracy || rf.accuracy || 0;
      const gbAccuracy = gb.model_accuracy || gb.accuracy || 0;
      
      // For combined model, use RF metrics as primary (or average if both available)
      return {
        top_predictors: combined,
        model_type: 'Combined (RF + GB)',
        accuracy: (rfAccuracy + gbAccuracy) / 2,
        // Use RF metrics as primary, or average if both available
        precision: rf.precision !== undefined && gb.precision !== undefined ? (rf.precision + gb.precision) / 2 : (rf.precision || gb.precision),
        recall: rf.recall !== undefined && gb.recall !== undefined ? (rf.recall + gb.recall) / 2 : (rf.recall || gb.recall),
        f1_score: rf.f1_score !== undefined && gb.f1_score !== undefined ? (rf.f1_score + gb.f1_score) / 2 : (rf.f1_score || gb.f1_score),
        roc_auc: rf.roc_auc !== undefined && gb.roc_auc !== undefined ? (rf.roc_auc + gb.roc_auc) / 2 : (rf.roc_auc || gb.roc_auc),
        baseline_accuracy: rf.baseline_accuracy !== undefined && gb.baseline_accuracy !== undefined ? (rf.baseline_accuracy + gb.baseline_accuracy) / 2 : (rf.baseline_accuracy || gb.baseline_accuracy),
        confusion_matrix: rf.confusion_matrix || gb.confusion_matrix,
        class_distribution: rf.class_distribution || gb.class_distribution
      };
    }
  };

  const modelData = getModelData();
  const topPredictors = modelData.top_predictors || [];
  
  const chartData = topPredictors
    .filter(item => item && item.feature && typeof item.importance === 'number')
    .map((item, idx) => ({
      name: item.feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      importance: item.importance,
      rank: idx + 1,
      rf_importance: item.rf_importance,
      gb_importance: item.gb_importance
    }));

  // Get gradient boosting data for interactions display
  const gbData = normalizedData.gradient_boosting || {};

  return (
    <div className="page">
      <h1 className="page-title">Hidden Performance Predictors</h1>
      <p className="page-description">
        Machine learning models reveal which features best predict race success. 
        Switch between models to compare their insights.
      </p>

      {/* Model Selector */}
      <div className="section">
        <div className="model-selector">
          <label htmlFor="model-select" className="selector-label">Select Model:</label>
          <select 
            id="model-select"
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
            className="model-select"
          >
            <option value="random_forest">Random Forest</option>
            <option value="gradient_boosting">Gradient Boosting (XGBoost)</option>
            <option value="combined">Combined (RF + GB Average)</option>
          </select>
        </div>
      </div>

      {/* Current Model Info - Simplified */}
      <div className="model-info">
        <div className="info-card">
          <div className="info-label">Model Accuracy</div>
          <div className="info-value">
            {modelData.accuracy && modelData.accuracy > 0 
              ? (modelData.accuracy * 100).toFixed(1) + '%'
              : 'N/A'}
          </div>
          {modelData.baseline_accuracy && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#9ca3af', 
              marginTop: '0.25rem',
              fontStyle: 'italic'
            }}>
              Baseline: {(modelData.baseline_accuracy * 100).toFixed(1)}%
            </div>
          )}
          {modelData.accuracy && modelData.baseline_accuracy && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#10b981', 
              marginTop: '0.25rem',
              fontWeight: 'bold'
            }}>
              +{((modelData.accuracy - modelData.baseline_accuracy) * 100).toFixed(1)}% vs baseline
            </div>
          )}
        </div>
        <div className="info-card">
          <div className="info-label">Model Used</div>
          <div className="info-value">{modelData.model_type || 'Random Forest'}</div>
        </div>
        <div className="info-card highlight">
          <div className="info-label">Top Predictor</div>
          <div className="info-value-small">{chartData[0]?.name || 'N/A'}</div>
        </div>
      </div>

      {/* Show error message if model has error */}
      {modelData.error && (
        <div className="section">
          <div className="error" style={{ padding: '1.5rem', textAlign: 'center', background: '#1f2937', border: '1px solid #ef4444', borderRadius: '0.5rem' }}>
            <strong style={{ color: '#ef4444' }}>⚠️ {modelData.error}</strong>
            <br />
            <code style={{ marginTop: '1rem', display: 'block', color: '#9ca3af', fontSize: '0.9rem' }}>
              cd Data_analysis && python main.py
            </code>
          </div>
        </div>
      )}

      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="section-title">Top 15 Feature Importance</h2>
          <button 
            onClick={() => setShowLegend(!showLegend)}
            className="legend-toggle"
            style={{
              background: '#1f2937',
              border: '1px solid #374151',
              color: '#d1d5db',
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            {showLegend ? '▼ Hide Legend' : '▶ Show Legend'}
          </button>
        </div>
        
        {showLegend && (
          <div className="metric-legend" style={{
            background: '#111827',
            border: '1px solid #374151',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h4 style={{ color: '#f9fafb', marginBottom: '1rem', fontSize: '1.1rem' }}>Feature Explanations</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              <div className="legend-item">
                <strong style={{ color: '#3b82f6' }}>avg_speed_kph</strong>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                  Average speed in kilometers per hour throughout the race.
                </p>
              </div>
              <div className="legend-item">
                <strong style={{ color: '#3b82f6' }}>speed_std</strong>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                  Standard deviation of speed. Lower = more consistent speed.
                </p>
              </div>
              <div className="legend-item">
                <strong style={{ color: '#3b82f6' }}>s1_mean, s2_mean, s3_mean</strong>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                  Average time for Sector 1, 2, or 3. Lower = faster through that sector.
                </p>
              </div>
              <div className="legend-item">
                <strong style={{ color: '#3b82f6' }}>s1_std, s2_std, s3_std</strong>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                  Consistency in Sector 1, 2, or 3. Lower = more consistent sector times.
                </p>
              </div>
              <div className="legend-item">
                <strong style={{ color: '#3b82f6' }}>lap_best</strong>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                  Fastest lap time. Lower = better single-lap pace.
                </p>
              </div>
              <div className="legend-item">
                <strong style={{ color: '#3b82f6' }}>lap_std</strong>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                  Lap time consistency. Lower = more consistent lap times.
                </p>
              </div>
              <div className="legend-item">
                <strong style={{ color: '#3b82f6' }}>consistency_score</strong>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                  Overall consistency metric (1/(1+lap_std)). Higher = more consistent.
                </p>
              </div>
              <div className="legend-item">
                <strong style={{ color: '#3b82f6' }}>tire_degradation</strong>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                  Change in pace over race. Negative = getting faster (good tire management).
                </p>
              </div>
              <div className="legend-item">
                <strong style={{ color: '#3b82f6' }}>clutch_score</strong>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                  Performance in final 10% of race. Positive = faster at end (clutch performer).
                </p>
              </div>
              <div className="legend-item">
                <strong style={{ color: '#3b82f6' }}>post_fcy_performance</strong>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                  Performance after Full Course Yellow restarts. Higher = better at restarts.
                </p>
              </div>
              <div className="legend-item">
                <strong style={{ color: '#3b82f6' }}>sector_balance</strong>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                  Balance across all three sectors. Lower = more balanced performance.
                </p>
              </div>
              <div className="legend-item">
                <strong style={{ color: '#3b82f6' }}>s1_ratio, s2_ratio, s3_ratio</strong>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                  Sector time as ratio of total lap time. Shows sector importance.
                </p>
              </div>
            </div>
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#1e3a5f', borderRadius: '0.25rem', border: '1px solid #3b82f6' }}>
              <p style={{ color: '#d1d5db', fontSize: '0.875rem', margin: 0 }}>
                <strong style={{ color: '#93c5fd' }}>Note:</strong> Importance scores show how much each feature contributes to predicting race success. Higher importance = stronger predictor.
              </p>
            </div>
          </div>
        )}
        
        {chartData.length === 0 ? (
          <div className="error" style={{ padding: '2rem', textAlign: 'center' }}>
            No predictor data available. Please run the analysis pipeline to generate data.
            <br />
            <code style={{ marginTop: '1rem', display: 'block', color: '#9ca3af' }}>
              cd Data_analysis && python main.py
            </code>
          </div>
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={600}>
              <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#ffffff" tick={{ fill: '#ffffff' }} />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={250}
                stroke="#ffffff"
                tick={{ fill: '#ffffff' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const importance = typeof data.importance === 'number' ? data.importance : parseFloat(data.importance) || 0;
                    return (
                      <div className="tooltip">
                        <p><strong>Rank: #{data.rank}</strong></p>
                        <p>Importance: {importance.toFixed(4)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="importance">
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={index === 0 ? '#ef4444' : index < 3 ? '#f59e0b' : index < 5 ? '#3b82f6' : '#6b7280'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        )}
      </div>


      {/* Feature Interactions (Gradient Boosting only) */}
      {selectedModel === 'gradient_boosting' && gbData.interaction_effects && gbData.interaction_effects.length > 0 && (
        <div className="section">
          <h2 className="section-title">Feature Interactions</h2>
          <p className="section-description">
            Gradient Boosting reveals which feature pairs work together. Higher combined importance means stronger interaction.
          </p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={gbData.interaction_effects.slice(0, 10).map((item, idx) => {
                const importance = typeof item.combined_importance === 'number' 
                  ? item.combined_importance 
                  : parseFloat(item.combined_importance) || 0;
                return {
                  name: `${item.feature1.replace(/_/g, ' ')} × ${item.feature2.replace(/_/g, ' ')}`,
                  importance: importance,
                  rank: idx + 1
                };
              })} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#ffffff" tick={{ fill: '#ffffff' }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={300}
                  stroke="#ffffff"
                tick={{ fill: '#ffffff' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const importance = typeof data.importance === 'number' ? data.importance : parseFloat(data.importance) || 0;
                      return (
                        <div className="tooltip">
                          <p><strong>Combined Importance: {importance.toFixed(4)}</strong></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="importance" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="section">
        <h2 className="section-title">Key Insights</h2>
        <div className="insights-grid">
          <div className="insight-box">
            <div className="insight-number">#1</div>
            <div className="insight-text">
              <strong>{chartData[0]?.name}</strong> is the top predictor with importance of {
                chartData[0]?.importance 
                  ? (typeof chartData[0].importance === 'number' ? chartData[0].importance : parseFloat(chartData[0].importance) || 0).toFixed(4)
                  : 'N/A'
              }
            </div>
          </div>
          <div className="insight-box">
            <div className="insight-number">#2</div>
            <div className="insight-text">
              <strong>{chartData[1]?.name}</strong> ranks second (importance: {
                chartData[1]?.importance 
                  ? (typeof chartData[1].importance === 'number' ? chartData[1].importance : parseFloat(chartData[1].importance) || 0).toFixed(4)
                  : 'N/A'
              })
            </div>
          </div>
          {selectedModel === 'combined' && (
            <div className="insight-box">
              <div className="insight-icon">🔄</div>
              <div className="insight-text">
                Combined model averages Random Forest and Gradient Boosting predictions for more robust insights
              </div>
            </div>
          )}
          {selectedModel === 'gradient_boosting' && gbData.interaction_effects && gbData.interaction_effects.length > 0 && (
            <div className="insight-box highlight">
              <div className="insight-icon">🔗</div>
              <div className="insight-text">
                Top interaction: <strong>{gbData.interaction_effects[0].feature1.replace(/_/g, ' ')}</strong> × <strong>{gbData.interaction_effects[0].feature2.replace(/_/g, ' ')}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Predictors;

