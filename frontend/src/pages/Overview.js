import React, { useState, useEffect } from 'react';
import { loadSummary } from '../utils/dataLoader';

const Overview = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const summaryData = await loadSummary();
      setSummary(summaryData);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!summary) {
    return <div className="error">Error loading data</div>;
  }

  return (
    <div className="page">
      <h1 className="page-title">Tortoise Overview</h1>
      
      {/* About Tortoise Section */}
      <div className="section" style={{ marginBottom: '2rem' }}>
        <h2 className="section-title">What is Tortoise?</h2>
        <div style={{
          background: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '0.5rem',
          padding: '2rem',
          lineHeight: '1.8',
          color: '#d1d5db'
        }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
            <strong style={{ color: '#93c5fd', fontSize: '1.2rem' }}>Tortoise</strong> is a pattern recognition engine that uses machine learning to discover hidden insights in racing data across multiple tracks and drivers.
          </p>
          
          <h3 style={{ color: '#f9fafb', marginTop: '1.5rem', marginBottom: '1rem' }}>🎯 What We Do</h3>
          <p style={{ marginBottom: '1rem' }}>
            Traditional racing analysis looks at single races or tracks in isolation. <strong>Tortoise goes deeper</strong> by analyzing patterns across <strong>7 different racetracks</strong> and <strong>hundreds of drivers</strong> to answer questions like:
          </p>
          <ul style={{ marginLeft: '2rem', marginBottom: '1.5rem' }}>
            <li>Do skills learned at technical tracks transfer to high-speed tracks?</li>
            <li>What are the hidden predictors of race success that human engineers miss?</li>
            <li>What are the distinct driver archetypes across the entire racing series?</li>
            <li>How does consistency compare to peak speed in determining race outcomes?</li>
            <li>Which training strategies actually lead to podium finishes?</li>
          </ul>
          
          <h3 style={{ color: '#f9fafb', marginTop: '1.5rem', marginBottom: '1rem' }}>🔬 How It Works</h3>
          <p style={{ marginBottom: '1rem' }}>
            Tortoise processes <strong>{summary.total_laps?.toLocaleString() || 0} laps</strong> of racing data, extracting <strong>57 performance features</strong> per driver-track-race combination. Using advanced machine learning algorithms including:
          </p>
          <ul style={{ marginLeft: '2rem', marginBottom: '1.5rem' }}>
            <li><strong>Random Forest & Gradient Boosting:</strong> Identify which features predict race success</li>
            <li><strong>Cross-Track Correlation Analysis:</strong> Discover skill transfer patterns between tracks</li>
            <li><strong>Driver Clustering:</strong> Identify distinct driver archetypes (Smooth Operators, Qualifying Heroes, Clutch Performers, All-Rounders)</li>
            <li><strong>Track Clustering:</strong> Group tracks by similar skill requirements</li>
          </ul>
          
          <h3 style={{ color: '#f9fafb', marginTop: '1.5rem', marginBottom: '1rem' }}>🏆 Key Discoveries</h3>
          <p style={{ marginBottom: '1rem' }}>
            Tortoise has uncovered counterintuitive insights that challenge conventional racing wisdom:
          </p>
          <ul style={{ marginLeft: '2rem' }}>
            <li><strong>Consistency beats speed:</strong> Drivers with high S2 consistency achieve podium 2.6× more often than those with fast best laps but low consistency</li>
            <li><strong>Sector 2 is king:</strong> Middle sector consistency is the #1 predictor of race success, more important than fastest lap time</li>
            <li><strong>Specialists win:</strong> Smooth Operators and Clutch Performers overperform, while All-Rounders underperform relative to their field representation</li>
            <li><strong>Track families exist:</strong> Skills transfer strongly between similar tracks (e.g., Barber ↔ VIR, Indianapolis ↔ Road America)</li>
          </ul>
        </div>
      </div>
      
      {/* Hero Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{summary.total_laps?.toLocaleString() || 0}</div>
          <div className="stat-label">Total Laps</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.significant_correlations || 0}</div>
          <div className="stat-label">Patterns Found</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.total_drivers || 0}</div>
          <div className="stat-label">Drivers Analyzed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.total_tracks || 0}</div>
          <div className="stat-label">Tracks</div>
        </div>
      </div>

      {/* Quick Insights Preview */}
      <div className="section">
        <h2 className="section-title">Key Findings</h2>
        <div className="insights-preview">
          <div className="insight-card">
            <div className="insight-icon">🎯</div>
            <div className="insight-content">
              <h3>S2 Consistency is #1 Predictor</h3>
              <p>More important than fastest lap time</p>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon">🔄</div>
            <div className="insight-content">
              <h3>Strong Cross-Track Correlations</h3>
              <p>{summary.significant_correlations} significant patterns found</p>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon">👥</div>
            <div className="insight-content">
              <h3>{summary.driver_archetypes || 4} Driver Archetypes</h3>
              <p>Distinct performance profiles identified</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;

