import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { loadCorrelations } from '../utils/dataLoader';

const Correlations = () => {
  const [data, setData] = useState(null);
  const [filtered, setFiltered] = useState([]);
  const [strengthFilter, setStrengthFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const correlations = await loadCorrelations();
      setData(correlations);
      setFiltered(correlations?.correlations || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (data) {
      let filtered = data.correlations || [];
      if (strengthFilter !== 'all') {
        filtered = filtered.filter(c => c.strength === strengthFilter);
      }
      setFiltered(filtered.slice(0, 20)); // Top 20
    }
  }, [strengthFilter, data]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!data) {
    return <div className="error">Error loading data</div>;
  }

  const chartData = filtered.map(corr => ({
    name: `${corr.track1} ↔ ${corr.track2}`,
    correlation: Math.abs(corr.correlation),
    value: corr.correlation,
    metric: corr.metric
  }));

  return (
    <div className="page">
      <h1 className="page-title">Cross-Track Correlations</h1>
      <p className="page-description">
        Discover which skills transfer between tracks. Strong correlations indicate that performance 
        at one track predicts performance at another.
      </p>

      <div className="filters">
        <label>
          Filter by Strength:
          <select value={strengthFilter} onChange={(e) => setStrengthFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="strong">Strong (r &gt; 0.7)</option>
            <option value="moderate">Moderate (0.3 to 0.7)</option>
          </select>
        </label>
        <div className="stats-inline">
          <span>Total: {data.total}</span>
          <span>Strong: {data.strong}</span>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">Top Correlations</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={600}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" domain={[-1, 1]} stroke="#ffffff" tick={{ fill: '#ffffff' }} />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={200}
                stroke="#ffffff"
                tick={{ fill: '#ffffff' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="tooltip">
                        <p><strong>Correlation: {data.value.toFixed(3)}</strong></p>
                        <p>Metric: {data.metric}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">Correlation Details</h2>
        <div className="correlations-list">
          {filtered.map((corr, idx) => (
            <div key={idx} className="correlation-card">
              <div className="correlation-header">
                <h3>{corr.track1} ↔ {corr.track2}</h3>
                <span className={`badge ${corr.strength}`}>{corr.strength}</span>
              </div>
              <div className="correlation-body">
                <div className="correlation-metric">
                  <strong>Metric:</strong> {corr.metric}
                </div>
                <div className="correlation-value">
                  <strong>Correlation:</strong> {corr.correlation.toFixed(3)}
                </div>
                <div className="correlation-bar">
                  <div 
                    className="correlation-fill" 
                    style={{ 
                      width: `${Math.abs(corr.correlation) * 100}%`,
                      backgroundColor: corr.correlation > 0 ? '#3b82f6' : '#ef4444'
                    }}
                  ></div>
                </div>
                <div className="correlation-meta">
                  <span>p-value: {corr.p_value}</span>
                  <span>Drivers: {corr.drivers_compared}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Correlations;

