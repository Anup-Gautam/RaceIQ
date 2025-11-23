import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter,
  ComposedChart, Line, Area,
  PieChart, Pie, Cell as PieCell,
  Legend
} from 'recharts';
import { loadVisualizations } from '../utils/dataLoader';

const Visualizations = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const vizData = await loadVisualizations();
      setData(vizData);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!data) {
    return <div className="error">Error loading visualization data</div>;
  }

  // 1. The 2.6× Rule Bar Chart
  const rule26x = data.rule_26x || {};
  const rule26xData = [
    {
      name: rule26x.high_consistency_low_lap?.label || 'High Consistency + Low Lap',
      value: rule26x.high_consistency_low_lap?.podium_rate || 0,
      icon: '🏆',
      color: '#10b981'
    },
    {
      name: rule26x.low_consistency_high_lap?.label || 'Low Consistency + High Lap',
      value: rule26x.low_consistency_high_lap?.podium_rate || 0,
      icon: '⚡',
      color: '#ef4444'
    }
  ];
  
  // Calculate dynamic Y-axis domain for 2.6× Rule
  const rule26xMax = Math.max(...rule26xData.map(d => d.value), 1);
  const rule26xMin = Math.min(...rule26xData.map(d => d.value), 0);
  const rule26xRange = rule26xMax - rule26xMin;
  const rule26xPadding = Math.max(rule26xRange * 0.2, 2); // 20% padding or minimum 2%
  const rule26xYDomain = [
    Math.max(0, rule26xMin - rule26xPadding),
    rule26xMax + rule26xPadding
  ];

  // 2. Archetype Performance Matrix
  const archetypeMatrix = data.archetype_matrix || {};
  const archetypeData = archetypeMatrix.data || [];
  
  // Calculate dynamic Y-axis domain for Archetype Matrix
  const archetypeMax = Math.max(
    ...archetypeData.flatMap(d => [d.pct_field || 0, d.pct_podiums || 0]),
    1
  );
  const archetypeMin = Math.min(
    ...archetypeData.flatMap(d => [d.pct_field || 0, d.pct_podiums || 0]),
    0
  );
  const archetypeRange = archetypeMax - archetypeMin;
  const archetypePadding = Math.max(archetypeRange * 0.15, 2);
  const archetypeYDomain = [
    Math.max(0, archetypeMin - archetypePadding),
    archetypeMax + archetypePadding
  ];

  // 3. Consistency vs Speed Scatter
  const scatterData = data.consistency_scatter || {};
  const scatterPoints = scatterData.data || [];

  // 4. Feature Importance Waterfall
  const waterfall = data.feature_waterfall || {};
  const waterfallSteps = waterfall.steps || [];

  // 5. Training Allocation
  const training = data.training_allocation || {};
  const trainingCurrent = training.current || [];
  const trainingOptimal = training.optimal || [];

  // 6. Post-FCY Impact
  const fcyImpact = data.fcy_impact || {};
  const fcyData = [
    {
      name: fcyImpact.high_fcy?.label || 'High Post-FCY',
      podium_rate: fcyImpact.high_fcy?.podium_rate || 0,
      color: '#10b981'
    },
    {
      name: fcyImpact.low_fcy?.label || 'Low Post-FCY',
      podium_rate: fcyImpact.low_fcy?.podium_rate || 0,
      color: '#ef4444'
    }
  ];
  
  // Calculate dynamic Y-axis domain for FCY Impact
  const fcyMax = Math.max(...fcyData.map(d => d.podium_rate), 1);
  const fcyMin = Math.min(...fcyData.map(d => d.podium_rate), 0);
  const fcyRange = fcyMax - fcyMin;
  const fcyPadding = Math.max(fcyRange * 0.2, 2);
  const fcyYDomain = [
    Math.max(0, fcyMin - fcyPadding),
    fcyMax + fcyPadding
  ];

  // 7. Sector Importance Heatmap
  const sectorHeatmap = data.sector_heatmap || {};
  const sectorData = sectorHeatmap.by_track || [];
  
  // Calculate dynamic Y-axis domain for Sector Heatmap
  const sectorMax = Math.max(
    ...sectorData.flatMap(d => [
      d.s1_importance || 0, 
      d.s2_importance || 0, 
      d.s3_importance || 0
    ]),
    0.01
  );
  const sectorMin = 0;
  const sectorPadding = sectorMax * 0.15; // 15% padding
  const sectorYDomain = [sectorMin, sectorMax + sectorPadding];

  // 8. Track Family Network
  const trackNetwork = data.track_network || {};
  const networkNodes = trackNetwork.nodes || [];
  const networkEdges = trackNetwork.edges || [];


  return (
    <div className="page">
      <h1 className="page-title">Critical Visualizations</h1>
      <p className="page-description">
        Data-driven insights that prove what wins championships
      </p>

      {/* 1. The 2.6× Rule */}
      <div className="section">
        <h2 className="section-title">The 2.6× Rule: Consistency Beats Speed</h2>
        <p className="section-description">
          {rule26x.insight || 'High S2 consistency + fast best lap achieves podium significantly more often'}
        </p>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={rule26xData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                type="number" 
                domain={rule26xYDomain}
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={300}
                stroke="#9ca3af"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="tooltip">
                        <p><strong>{data.icon} {data.name}</strong></p>
                        <p>Podium Rate: {data.value.toFixed(1)}%</p>
                        {rule26x.ratio && (
                          <p>Ratio: {rule26x.ratio}×</p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value">
                {rule26xData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {rule26x.ratio && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#1e3a5f',
            borderRadius: '0.5rem',
            border: '1px solid #3b82f6',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#93c5fd' }}>
              {rule26x.ratio}× More Podiums
            </div>
            <div style={{ color: '#cbd5e1', marginTop: '0.5rem' }}>
              Drivers with high S2 consistency and fast best laps achieve podium {rule26x.ratio}× more often
            </div>
          </div>
        )}
      </div>

      {/* 2. Archetype Performance Matrix */}
      <div className="section">
        <h2 className="section-title">Archetype Performance Matrix</h2>
        <p className="section-description">
          % of Field vs % of Podiums - Shows which archetypes overperform or underperform
        </p>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={archetypeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="archetype" 
                stroke="#9ca3af"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis 
                domain={archetypeYDomain}
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="tooltip">
                        <p><strong>{data.archetype}</strong></p>
                        <p>% of Field: {data.pct_field}%</p>
                        <p>% of Podiums: {data.pct_podiums}%</p>
                        <p>Podium Rate: {data.podium_rate}×</p>
                        <p>Count: {data.count} drivers</p>
                        <p>Podiums: {data.podiums}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar dataKey="pct_field" fill="#3b82f6" name="% of Field" />
              <Bar dataKey="pct_podiums" fill="#10b981" name="% of Podiums" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Consistency vs Speed Scatter */}
      <div className="section">
        <h2 className="section-title">Consistency vs Speed: Visual Proof</h2>
        <p className="section-description">
          {scatterData.insight || 'Podium finishers cluster in high-consistency, high-speed quadrant'}
        </p>
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          background: '#1e3a5f',
          borderRadius: '0.5rem',
          border: '1px solid #3b82f6',
          fontSize: '0.9rem',
          color: '#cbd5e1',
          lineHeight: '1.6'
        }}>
          <strong style={{ color: '#93c5fd' }}>Note:</strong> Scores are track-relative percentiles (0-100). 
          A driver at 50th percentile means they performed better than 50% of drivers <strong>in that specific race</strong>. 
          This ensures fair comparison across different tracks and field strengths.
          <br /><br />
          <strong style={{ color: '#fca5a5' }}>Why some podiums appear in low-consistency areas:</strong> In some races, 
          factors like crashes, safety cars, or strategy can allow less consistent drivers to podium. 
          However, these drivers typically have <strong>high speed scores</strong> (fastest lap ability), 
          showing that peak speed can sometimes overcome consistency issues.
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={500}>
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                type="number" 
                dataKey="consistency" 
                name="Consistency"
                domain={[scatterData.x_min || 0, scatterData.x_max || 100]}
                label={{ 
                  value: scatterData.x_label || 'Consistency Score (0-100)', 
                  position: 'insideBottom', 
                  offset: -5,
                  style: { fill: '#d1d5db', fontSize: '14px' }
                }}
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis 
                type="number" 
                dataKey="speed" 
                name="Speed"
                domain={[scatterData.y_min || 0, scatterData.y_max || 100]}
                label={{ 
                  value: scatterData.y_label || 'Speed Score (0-100)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: '#d1d5db', fontSize: '14px' }
                }}
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="tooltip" style={{
                        background: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '0.5rem',
                        padding: '0.75rem'
                      }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Driver {data.driver}</p>
                        <p>Track: {data.track || 'N/A'}</p>
                        <p>Consistency: {data.consistency.toFixed(1)}/100</p>
                        <p>Speed Score: {data.speed.toFixed(1)}/100</p>
                        <p>Best Lap: {data.best_lap.toFixed(2)}s</p>
                        <p>Finishing Position: {data.finishing_position}</p>
                        <p>Outcome: <span style={{ textTransform: 'capitalize' }}>{data.outcome}</span></p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Render non-podium points first (behind) */}
              <Scatter 
                name="Non-Podium" 
                data={scatterPoints.filter(p => p.outcome !== 'podium')} 
                fill="#3b82f6"
              >
                {scatterPoints.filter(p => p.outcome !== 'podium').map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} opacity={0.6} />
                ))}
              </Scatter>
              {/* Render podium points on top (highlighted) */}
              <Scatter 
                name="Podium" 
                data={scatterPoints.filter(p => p.outcome === 'podium')} 
                fill="#10b981"
              >
                {scatterPoints.filter(p => p.outcome === 'podium').map((entry, index) => (
                  <Cell 
                    key={`podium-cell-${index}`} 
                    fill={entry.color}
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div style={{
          marginTop: '1rem',
          display: 'flex',
          gap: '2rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '16px', height: '16px', background: '#10b981', borderRadius: '50%' }}></div>
            <span style={{ color: '#d1d5db' }}>Podium (Top 3)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '16px', height: '16px', background: '#eab308', borderRadius: '50%' }}></div>
            <span style={{ color: '#d1d5db' }}>Top 10</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '16px', height: '16px', background: '#ef4444', borderRadius: '50%' }}></div>
            <span style={{ color: '#d1d5db' }}>Outside Top 10</span>
          </div>
        </div>
        {scatterData.avg_podium_consistency && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#1e3a5f',
            borderRadius: '0.5rem',
            border: '1px solid #3b82f6',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1rem', color: '#cbd5e1' }}>
              <strong>Podium Average:</strong> Consistency: {scatterData.avg_podium_consistency}/100, 
              Speed: {scatterData.avg_podium_speed}/100
            </div>
          </div>
        )}
      </div>

      {/* 4. Feature Importance Waterfall */}
      <div className="section">
        <h2 className="section-title">Feature Importance Waterfall</h2>
        <p className="section-description">
          How each feature contributes to model accuracy. Starting from random baseline (50%), each feature adds its contribution.
        </p>
        {waterfallSteps.length > 0 && waterfall.final_accuracy > 0 ? (
          <>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={500}>
                <ComposedChart data={[
                  { feature: 'Baseline', value: waterfall.baseline || 50, contribution: 0 },
                  ...waterfallSteps.map((step, idx) => ({
                    feature: step.feature,
                    value: step.cumulative,
                    contribution: step.contribution
                  }))
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="feature" 
                    stroke="#9ca3af"
                    angle={-45}
                    textAnchor="end"
                    height={120}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af' }}
                    label={{ 
                      value: 'Accuracy (%)', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fill: '#d1d5db', fontSize: '14px' }
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="tooltip" style={{
                            background: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '0.5rem',
                            padding: '0.75rem'
                          }}>
                            <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{data.feature}</p>
                            <p>Cumulative Accuracy: {data.value.toFixed(1)}%</p>
                            {data.contribution && data.contribution > 0 && (
                              <p>Contribution: +{data.contribution.toFixed(1)}%</p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    fill="#3b82f6" 
                    fillOpacity={0.3}
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#1e3a5f',
              borderRadius: '0.5rem',
              border: '1px solid #3b82f6',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#93c5fd' }}>
                Final Model Accuracy: {waterfall.final_accuracy.toFixed(1)}%
              </div>
              <div style={{ color: '#cbd5e1', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                Improvement from baseline: +{(waterfall.final_accuracy - waterfall.baseline).toFixed(1)}%
              </div>
            </div>
          </>
        ) : (
          <div style={{
            padding: '2rem',
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '0.5rem',
            textAlign: 'center',
            color: '#9ca3af'
          }}>
            <p>Model accuracy data not available. Please run the analysis pipeline.</p>
          </div>
        )}
      </div>

      {/* 5. Training Allocation Comparison */}
      <div className="section">
        <h2 className="section-title">Training Allocation: Current vs Optimal</h2>
        <p className="section-description">
          {training.insight || 'Shift training focus based on what actually matters'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <h3 style={{ color: '#f9fafb', marginBottom: '1rem', textAlign: 'center' }}>Current</h3>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={trainingCurrent}
                  dataKey="percentage"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label={({ category, percentage }) => `${category}: ${percentage}%`}
                  labelLine={false}
                >
                  {trainingCurrent.map((entry, index) => (
                    <PieCell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="tooltip" style={{
                          background: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '0.5rem',
                          padding: '0.75rem'
                        }}>
                          <p style={{ fontWeight: 'bold' }}>{data.category}</p>
                          <p>{data.percentage}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 style={{ color: '#f9fafb', marginBottom: '1rem', textAlign: 'center' }}>RaceIQ Optimal</h3>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={trainingOptimal}
                  dataKey="percentage"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label={({ category, percentage }) => `${category}: ${percentage}%`}
                  labelLine={false}
                >
                  {trainingOptimal.map((entry, index) => (
                    <PieCell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="tooltip" style={{
                          background: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '0.5rem',
                          padding: '0.75rem'
                        }}>
                          <p style={{ fontWeight: 'bold' }}>{data.category}</p>
                          <p>{data.percentage}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: '#1e3a5f',
          borderRadius: '0.5rem',
          border: '1px solid #3b82f6'
        }}>
          <div style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <strong style={{ color: '#93c5fd' }}>Key Changes:</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
              <li>Increase S2 Consistency training from 0% to 45% (highest priority)</li>
              <li>Maintain Qualifying at 25% (reduced from 40% but still important)</li>
              <li>Keep General Racing at 20% (reduced from 30% but still valuable)</li>
              <li>Reduce Race Strategy from 20% to 5%</li>
              <li>Reduce Restart training from 10% to 5%</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 6. Post-FCY Impact */}
      <div className="section">
        <h2 className="section-title">Post-FCY Performance Impact</h2>
        <p className="section-description">
          {fcyImpact.insight || 'Restart ability is a critical differentiator'}
        </p>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={fcyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="name" 
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis 
                domain={fcyYDomain}
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
                label={{ 
                  value: 'Podium Rate (%)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: '#d1d5db', fontSize: '14px' }
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="tooltip">
                        <p><strong>{data.name}</strong></p>
                        <p>Podium Rate: {data.podium_rate.toFixed(1)}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="podium_rate">
                {fcyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {fcyImpact.improvement !== undefined && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: fcyImpact.improvement > 0 ? '#1e3a5f' : '#3a1e1e',
            borderRadius: '0.5rem',
            border: `1px solid ${fcyImpact.improvement > 0 ? '#3b82f6' : '#ef4444'}`,
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              color: fcyImpact.improvement > 0 ? '#93c5fd' : '#fca5a5'
            }}>
              {fcyImpact.improvement > 0 ? '+' : ''}{fcyImpact.improvement.toFixed(1)}% {fcyImpact.improvement > 0 ? 'Improvement' : 'Difference'}
            </div>
            <div style={{ color: '#cbd5e1', marginTop: '0.5rem' }}>
              {fcyImpact.improvement > 0 
                ? `Top restart performers achieve ${fcyImpact.improvement.toFixed(1)}% higher podium rate`
                : `Data shows ${Math.abs(fcyImpact.improvement).toFixed(1)}% lower podium rate for top restart performers. This may indicate restart performance is not a primary differentiator.`
              }
            </div>
          </div>
        )}
      </div>

      {/* 7. Sector Importance Heatmap */}
      <div className="section">
        <h2 className="section-title">Sector Importance by Track</h2>
        <p className="section-description">
          {sectorHeatmap.insight || 'Sector 2 consistency is universally the most important'}
        </p>
        {sectorHeatmap.total_tracks && (
          <div style={{ 
            marginBottom: '1rem', 
            padding: '0.75rem', 
            background: '#1e3a5f', 
            borderRadius: '0.5rem',
            border: '1px solid #3b82f6',
            textAlign: 'center'
          }}>
            <span style={{ color: '#cbd5e1' }}>
              Showing data from <strong>{sectorHeatmap.total_tracks} tracks</strong>
            </span>
          </div>
        )}
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={450}>
            <BarChart 
              data={sectorData}
              margin={{ top: 20, right: 30, left: 60, bottom: 100 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="track" 
                stroke="#9ca3af"
                angle={-45}
                textAnchor="end"
                height={120}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
              />
              <YAxis 
                domain={sectorYDomain}
                stroke="#9ca3af"
                label={{ 
                  value: 'Importance (|Correlation|)', 
                  angle: -90, 
                  position: 'insideLeft',
                  offset: 10,
                  style: { fill: '#d1d5db', fontSize: '14px' }
                }}
                tick={{ fill: '#9ca3af' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="tooltip" style={{
                        background: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '0.5rem',
                        padding: '0.75rem'
                      }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{data.track}</p>
                        <p>S1 Importance: {data.s1_importance !== null && data.s1_importance !== undefined ? data.s1_importance : 'No Data'}</p>
                        <p>S2 Importance: {data.s2_importance !== null && data.s2_importance !== undefined ? data.s2_importance : 'No Data'}</p>
                        <p>S3 Importance: {data.s3_importance !== null && data.s3_importance !== undefined ? data.s3_importance : 'No Data'}</p>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
                          Data points: {data.data_count || 'N/A'}
                          {data.has_podiums === false && (
                            <span style={{ display: 'block', color: '#ef4444', marginTop: '0.25rem' }}>
                              ⚠️ No podiums recorded at this track
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
              />
              <Bar dataKey="s1_importance" fill="#ef4444" name="S1 Importance">
                {sectorData.map((entry, index) => (
                  <Cell 
                    key={`s1-cell-${index}`} 
                    fill={entry.s1_importance === null ? '#6b7280' : '#ef4444'}
                    opacity={entry.s1_importance === null ? 0.3 : 1}
                  />
                ))}
              </Bar>
              <Bar dataKey="s2_importance" fill="#10b981" name="S2 Importance">
                {sectorData.map((entry, index) => (
                  <Cell 
                    key={`s2-cell-${index}`} 
                    fill={entry.s2_importance === null ? '#6b7280' : '#10b981'}
                    opacity={entry.s2_importance === null ? 0.3 : 1}
                  />
                ))}
              </Bar>
              <Bar dataKey="s3_importance" fill="#3b82f6" name="S3 Importance">
                {sectorData.map((entry, index) => (
                  <Cell 
                    key={`s3-cell-${index}`} 
                    fill={entry.s3_importance === null ? '#6b7280' : '#3b82f6'}
                    opacity={entry.s3_importance === null ? 0.3 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {sectorHeatmap.overall && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#1e3a5f',
            borderRadius: '0.5rem',
            border: '1px solid #3b82f6'
          }}>
            <h4 style={{ color: '#f9fafb', marginBottom: '0.5rem' }}>Overall Importance (|Correlation|):</h4>
            <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ color: '#ef4444' }}>S1: {sectorHeatmap.overall.s1_importance}</div>
                {sectorHeatmap.overall.s1_correlation !== undefined && (
                  <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                    (r={sectorHeatmap.overall.s1_correlation})
                  </div>
                )}
              </div>
              <div>
                <div style={{ 
                  color: sectorHeatmap.most_important_sector === 'S2' ? '#10b981' : '#d1d5db', 
                  fontWeight: sectorHeatmap.most_important_sector === 'S2' ? 'bold' : 'normal'
                }}>
                  S2: {sectorHeatmap.overall.s2_importance} 
                  {sectorHeatmap.most_important_sector === 'S2' && ' ⭐'}
                </div>
                {sectorHeatmap.overall.s2_correlation !== undefined && (
                  <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                    (r={sectorHeatmap.overall.s2_correlation})
                  </div>
                )}
              </div>
              <div>
                <div style={{ color: '#3b82f6' }}>S3: {sectorHeatmap.overall.s3_importance}</div>
                {sectorHeatmap.overall.s3_correlation !== undefined && (
                  <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                    (r={sectorHeatmap.overall.s3_correlation})
                  </div>
                )}
              </div>
            </div>
            <div style={{ 
              color: '#cbd5e1', 
              fontSize: '0.875rem', 
              lineHeight: '1.6',
              padding: '0.75rem',
              background: '#111827',
              borderRadius: '0.5rem',
              marginTop: '0.5rem'
            }}>
              <strong style={{ color: '#93c5fd' }}>Note:</strong> Lower standard deviation (std) = better consistency = better finish. 
              We expect <strong>negative correlations</strong> (lower std → better finish). 
              The importance values shown are absolute correlations - higher values mean stronger relationship, regardless of direction.
              {sectorHeatmap.most_important_sector && (
                <span style={{ display: 'block', marginTop: '0.5rem' }}>
                  <strong>{sectorHeatmap.most_important_sector}</strong> shows the strongest relationship with race success.
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 8. Track Family Network */}
      <div className="section">
        <h2 className="section-title">Track Family Network</h2>
        <p className="section-description">
          Tracks connected by skill transfer correlations. Thicker lines = stronger correlation. Skills learned at one track transfer to connected tracks.
        </p>
        <div style={{
          background: '#111827',
          border: '1px solid #374151',
          borderRadius: '0.5rem',
          padding: '2rem',
          minHeight: '400px',
          position: 'relative'
        }}>
          {/* Simple network visualization using SVG */}
          <svg width="100%" height="400" style={{ border: '1px solid #374151', borderRadius: '0.25rem' }}>
            {/* Draw edges first */}
            {networkEdges.map((edge, idx) => {
              const sourceNode = networkNodes.find(n => n.id === edge.source);
              const targetNode = networkNodes.find(n => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;
              
              // Simple layout: arrange nodes in a circle
              const nodeCount = networkNodes.length;
              const angleStep = (2 * Math.PI) / nodeCount;
              const radius = 150;
              const centerX = 400;
              const centerY = 200;
              
              const sourceIdx = networkNodes.findIndex(n => n.id === edge.source);
              const targetIdx = networkNodes.findIndex(n => n.id === edge.target);
              
              const x1 = centerX + radius * Math.cos(sourceIdx * angleStep - Math.PI / 2);
              const y1 = centerY + radius * Math.sin(sourceIdx * angleStep - Math.PI / 2);
              const x2 = centerX + radius * Math.cos(targetIdx * angleStep - Math.PI / 2);
              const y2 = centerY + radius * Math.sin(targetIdx * angleStep - Math.PI / 2);
              
              const strokeWidth = Math.max(1, edge.strength * 5);
              
              return (
                <line
                  key={`edge-${idx}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#3b82f6"
                  strokeWidth={strokeWidth}
                  strokeOpacity={0.6}
                />
              );
            })}
            
            {/* Draw nodes */}
            {networkNodes.map((node, idx) => {
              const nodeCount = networkNodes.length;
              const angleStep = (2 * Math.PI) / nodeCount;
              const radius = 150;
              const centerX = 400;
              const centerY = 200;
              
              const x = centerX + radius * Math.cos(idx * angleStep - Math.PI / 2);
              const y = centerY + radius * Math.sin(idx * angleStep - Math.PI / 2);
              
              const clusterColors = {
                'Technical': '#ef4444',
                'High-Speed': '#3b82f6',
                'Mixed': '#8b5cf6'
              };
              
              return (
                <g key={`node-${idx}`}>
                  <circle
                    cx={x}
                    cy={y}
                    r={20}
                    fill={clusterColors[node.cluster] || '#6b7280'}
                    stroke="#1f2937"
                    strokeWidth={2}
                  />
                  <text
                    x={x}
                    y={y + 35}
                    textAnchor="middle"
                    fill="#d1d5db"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    {node.name.split(' ').map(w => w[0]).join('')}
                  </text>
                </g>
              );
            })}
          </svg>
          
          {/* Legend */}
          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: '#1f2937',
            borderRadius: '0.5rem',
            border: '1px solid #374151'
          }}>
            <h4 style={{ color: '#f9fafb', marginBottom: '1rem', fontSize: '1.1rem' }}>Legend</h4>
            
            {/* Node Colors */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ color: '#d1d5db', marginBottom: '0.75rem', fontWeight: 'bold' }}>Track Categories:</div>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '20px', height: '20px', background: '#ef4444', borderRadius: '50%', border: '2px solid #1f2937' }}></div>
                  <span style={{ color: '#d1d5db' }}>Technical</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '20px', height: '20px', background: '#3b82f6', borderRadius: '50%', border: '2px solid #1f2937' }}></div>
                  <span style={{ color: '#d1d5db' }}>High-Speed</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '20px', height: '20px', background: '#8b5cf6', borderRadius: '50%', border: '2px solid #1f2937' }}></div>
                  <span style={{ color: '#d1d5db' }}>Mixed</span>
                </div>
              </div>
            </div>
            
            {/* Edge Explanation */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ color: '#d1d5db', marginBottom: '0.75rem', fontWeight: 'bold' }}>Connections:</div>
              <div style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: '1.6' }}>
                Lines connect tracks with actual skill transfer correlations (r &gt; 0.3). 
                Thicker lines indicate stronger correlations. 
                Only data-driven relationships are shown - if tracks don't have a measured correlation, they are not connected.
                Skills learned at one track transfer to connected tracks.
              </div>
            </div>
            
            {/* Top Connections */}
            {networkEdges.length > 0 && (
              <div>
                <div style={{ color: '#d1d5db', marginBottom: '0.75rem', fontWeight: 'bold' }}>Top Connections:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {networkEdges.slice(0, 5).map((edge, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: `${Math.max(30, edge.strength * 60)}px`,
                        height: '4px',
                        background: '#3b82f6',
                        borderRadius: '2px'
                      }}></div>
                      <span style={{ color: '#d1d5db', fontSize: '0.9rem' }}>
                        <strong>{edge.source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong> ↔ 
                        <strong> {edge.target.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>
                        {' '}(r={edge.strength})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Visualizations;

