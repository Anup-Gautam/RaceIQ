import React, { useState, useEffect } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { loadDrivers, loadArchetypes, loadTracks } from '../utils/dataLoader';

const Drivers = () => {
  const [drivers, setDrivers] = useState(null);
  const [archetypes, setArchetypes] = useState(null);
  const [tracks, setTracks] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [compareDriver1, setCompareDriver1] = useState(null);
  const [compareDriver2, setCompareDriver2] = useState(null);
  const [selectedTrackSingle, setSelectedTrackSingle] = useState(null); // Track for single driver view
  const [selectedTrackCompare, setSelectedTrackCompare] = useState(null); // Track for comparison view
  const [loading, setLoading] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [useFingerprint, setUseFingerprint] = useState(true); // Use new fingerprint or legacy

  useEffect(() => {
    const fetchData = async () => {
      const [driversData, archetypesData, tracksData] = await Promise.all([
        loadDrivers(),
        loadArchetypes(),
        loadTracks()
      ]);
      setDrivers(driversData);
      setArchetypes(archetypesData);
      setTracks(tracksData);
      if (driversData?.drivers && Object.keys(driversData.drivers).length > 0) {
        const driverIds = Object.keys(driversData.drivers);
        setSelectedDriver(driverIds[0]);
        // Set default comparison drivers: Driver #50 and Driver #14
        if (driverIds.includes('50')) {
          setCompareDriver1('50');
        } else if (driverIds.length > 0) {
          setCompareDriver1(driverIds[0]);
        }
        if (driverIds.includes('14')) {
          setCompareDriver2('14');
        } else if (driverIds.length > 1) {
          setCompareDriver2(driverIds[1]);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Initialize selected tracks when tracks data is loaded
  useEffect(() => {
    if (tracks?.tracks) {
      const availableTracks = Object.entries(tracks.tracks)
        .filter(([key]) => key !== 'sonoma')
        .map(([key, track]) => ({ id: key, name: track.name }));
      if (availableTracks.length > 0) {
        if (!selectedTrackSingle) {
          setSelectedTrackSingle(availableTracks[0].id);
        }
        if (!selectedTrackCompare) {
          // Set default comparison track to Road America
          const roadAmericaTrack = availableTracks.find(t => t.id === 'road_america');
          setSelectedTrackCompare(roadAmericaTrack ? roadAmericaTrack.id : availableTracks[0].id);
        }
      }
    }
  }, [tracks, selectedTrackSingle, selectedTrackCompare]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!drivers || !archetypes) {
    return <div className="error">Error loading data</div>;
  }

  const driverList = Object.values(drivers.drivers || {});
  const currentDriver = drivers.drivers?.[selectedDriver];
  const compareDriver1Data = compareDriver1 ? drivers.drivers?.[compareDriver1] : null;
  const compareDriver2Data = compareDriver2 ? drivers.drivers?.[compareDriver2] : null;

  if (!currentDriver) {
    return <div className="error">Driver not found</div>;
  }

  // Get available tracks (exclude Sonoma)
  const availableTracks = tracks?.tracks ? Object.entries(tracks.tracks)
    .filter(([key]) => key !== 'sonoma')
    .map(([key, track]) => ({ id: key, name: track.name })) : [];

  // Use new fingerprint data if available, otherwise fallback to legacy
  const fingerprintFeatures = drivers.fingerprint_features || {};
  const hasFingerprint = currentDriver.fingerprint && Object.keys(currentDriver.fingerprint).length > 0;
  
  const radarData = useFingerprint && hasFingerprint ? (
    // New fingerprint (8 high-variance features)
    Object.entries(currentDriver.fingerprint).map(([key, value]) => {
      const featInfo = fingerprintFeatures[key] || {};
      return {
        dimension: featInfo.display_name || key.replace(/_/g, ' '),
        value: value,
        description: featInfo.description || ''
      };
    })
  ) : (
    // Legacy scores (8 features)
    [
      { dimension: 'Speed', value: currentDriver.scores.speed || 50 },
      { dimension: 'Consistency', value: currentDriver.scores.consistency || 50 },
      { dimension: 'Tire Mgmt', value: currentDriver.scores.tire_management || 50 },
      { dimension: 'Pressure', value: currentDriver.scores.pressure || 50 },
      { dimension: 'S1 Skill', value: currentDriver.scores.s1_skill || 50 },
      { dimension: 'S2 Skill', value: currentDriver.scores.s2_skill || 50 },
      { dimension: 'S3 Skill', value: currentDriver.scores.s3_skill || 50 },
      { dimension: 'Race Craft', value: currentDriver.scores.race_craft || 50 }
    ]
  );
  
  // Get signature strength
  const signature = currentDriver.signature_strength || {};

  const archetypeInfo = archetypes.archetypes?.[currentDriver.archetype];

  return (
    <div className="page">
      <h1 className="page-title">Driver Fingerprints</h1>
      <p className="page-description">
        Explore individual driver performance profiles and compare drivers side-by-side
      </p>

      {/* Single Driver Analysis Selector */}
      <div className="section" style={{ border: '2px solid #3b82f6', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 className="section-title" style={{ marginBottom: '1rem' }}>Single Driver Analysis</h2>
        
        {/* Driver Selector for Single View - Overall Data Only */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#d1d5db', fontWeight: 'bold' }}>
            Select Driver (Overall Performance):
          </label>
          <select 
            value={selectedDriver || ''} 
            onChange={(e) => setSelectedDriver(e.target.value)}
            className="driver-select"
            style={{ width: '100%', maxWidth: '400px' }}
          >
            {driverList.map(driver => (
              <option key={driver.id} value={driver.id}>
                Driver #{driver.id} - {driver.archetype}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Two Main Content Sections: Single Driver and Comparison - Vertical Layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2rem' }}>
        {/* Single Driver Analysis Content */}
        <div className="section" style={{ border: '2px solid #3b82f6', borderRadius: '0.75rem', padding: '1.5rem' }}>
          {/* Signature Strength Banner */}
          {signature.name && (
            <div style={{
              background: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)',
              border: '2px solid #3b82f6',
              borderRadius: '0.5rem',
              padding: '1rem 1.5rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{ fontSize: '2rem' }}>⭐</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#93c5fd', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Signature Strength</div>
                <div style={{ color: '#f9fafb', fontSize: '1.25rem', fontWeight: 'bold' }}>
                  {signature.name} - {signature.percentile}th Percentile
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  Better than {signature.percentile}% of all drivers
                </div>
              </div>
            </div>
          )}

          <div className="driver-profile">
            <div className="profile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Driver #{currentDriver.id}</h2>
                <span className="archetype-badge">{currentDriver.archetype}</span>
              </div>
              {hasFingerprint && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d1d5db', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={useFingerprint}
                    onChange={(e) => setUseFingerprint(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  Use Advanced Fingerprint
                </label>
              )}
            </div>

            <div className="profile-content">
              <div className="radar-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3>Performance Radar</h3>
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
                    <h4 style={{ color: '#f9fafb', marginBottom: '1rem', fontSize: '1.1rem' }}>
                      {useFingerprint && hasFingerprint ? 'Advanced Fingerprint Metrics' : 'Legacy Metrics'}
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                      {useFingerprint && hasFingerprint ? (
                        // New fingerprint metrics
                        radarData.map((item, idx) => (
                          <div key={idx} className="legend-item">
                            <strong style={{ color: '#3b82f6' }}>{item.dimension}</strong>
                            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                              {item.description || 'Performance metric shown as percentile rank (0-100).'}
                            </p>
                          </div>
                        ))
                      ) : (
                        // Legacy metrics
                        <>
                          <div className="legend-item">
                            <strong style={{ color: '#3b82f6' }}>Speed</strong>
                            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                              Average speed in km/h. Higher = faster average pace throughout the race.
                            </p>
                          </div>
                          <div className="legend-item">
                            <strong style={{ color: '#3b82f6' }}>Consistency</strong>
                            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                              How consistent lap times are. Higher = lower variance, more predictable pace.
                            </p>
                          </div>
                          <div className="legend-item">
                            <strong style={{ color: '#3b82f6' }}>Tire Mgmt</strong>
                            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                              Tire degradation management. Higher = gets faster as race progresses (better tire conservation).
                            </p>
                          </div>
                          <div className="legend-item">
                            <strong style={{ color: '#3b82f6' }}>Pressure</strong>
                            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                              Performance under pressure. Higher = performs better in final stages and critical moments.
                            </p>
                          </div>
                          <div className="legend-item">
                            <strong style={{ color: '#3b82f6' }}>S1 Skill</strong>
                            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                              Sector 1 average time. Higher = faster through first sector (covers same distance in less time).
                            </p>
                          </div>
                          <div className="legend-item">
                            <strong style={{ color: '#3b82f6' }}>S2 Skill</strong>
                            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                              Sector 2 average time. Higher = faster through middle sector (technical section performance).
                            </p>
                          </div>
                          <div className="legend-item">
                            <strong style={{ color: '#3b82f6' }}>S3 Skill</strong>
                            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                              Sector 3 average time. Higher = faster through final sector (covers same distance in less time).
                            </p>
                          </div>
                          <div className="legend-item">
                            <strong style={{ color: '#3b82f6' }}>Race Craft</strong>
                            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                              Performance after Full Course Yellow restarts. Higher = better at restarts and race situations.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#1e3a5f', borderRadius: '0.25rem', border: '1px solid #3b82f6' }}>
                      <p style={{ color: '#d1d5db', fontSize: '0.875rem', margin: 0 }}>
                        <strong style={{ color: '#93c5fd' }}>Note:</strong> {useFingerprint && hasFingerprint 
                          ? 'Scores show percentile rank (0-100) where 100 = best among all drivers. This creates more distinctive fingerprints than raw scores.'
                          : 'All scores are normalized from 0-100, where 100 represents the best performance among all drivers for that metric.'}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="chart-container" style={{ position: 'relative' }}>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                      {/* Color zones as background */}
                      <defs>
                        <radialGradient id="eliteZone" cx="50%" cy="50%">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                        </radialGradient>
                        <radialGradient id="goodZone" cx="50%" cy="50%">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </radialGradient>
                      </defs>
                      
                      <PolarGrid 
                        stroke="#374151"
                        strokeDasharray="3 3"
                      />
                      
                      {/* Zone indicators */}
                      <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, 100]}
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        tickCount={6}
                        tickFormatter={(value) => {
                          if (value === 90) return 'Elite';
                          if (value === 75) return 'Good';
                          if (value === 50) return 'Avg';
                          return '';
                        }}
                      />
                      
                      <PolarAngleAxis 
                        dataKey="dimension" 
                        tick={{ fill: '#d1d5db', fontSize: 12 }}
                      />
                      
                      <Radar
                        name="Performance"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="#3b82f6"
                        fillOpacity={0.6}
                        dot={{ fill: '#3b82f6', r: 4 }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                  
                  {/* Color zone legend */}
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '0.25rem',
                    padding: '0.5rem',
                    fontSize: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '2px' }}></div>
                      <span style={{ color: '#9ca3af' }}>90-100: Elite</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '2px' }}></div>
                      <span style={{ color: '#9ca3af' }}>75-89: Good</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <div style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '2px' }}></div>
                      <span style={{ color: '#9ca3af' }}>50-74: Average</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '2px' }}></div>
                      <span style={{ color: '#9ca3af' }}>0-49: Below Avg</span>
                    </div>
                  </div>
                </div>
                
                {/* Percentile info */}
                {useFingerprint && hasFingerprint && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: '#1e3a5f',
                    borderRadius: '0.25rem',
                    border: '1px solid #3b82f6',
                    fontSize: '0.875rem',
                    color: '#d1d5db'
                  }}>
                    <strong style={{ color: '#93c5fd' }}>📊 Percentile Ranking:</strong> Scores show percentile rank (0-100) where 100 = best among all drivers. 
                    This creates more distinctive fingerprints than raw scores.
                  </div>
                )}
              </div>

              <div className="profile-details">
                <div className="details-section">
                  <h3>Archetype: {currentDriver.archetype}</h3>
                  {archetypeInfo && (
                    <p className="archetype-description">{archetypeInfo.description}</p>
                  )}
                </div>

                <div className="details-section">
                  <h3>Strengths</h3>
                  <div className="tags">
                    {currentDriver.strengths.map((strength, idx) => (
                      <span key={idx} className="tag strength">{strength}</span>
                    ))}
                  </div>
                </div>

                <div className="details-section">
                  <h3>Areas for Improvement</h3>
                  <div className="tags">
                    {currentDriver.improvements.map((improvement, idx) => (
                      <span key={idx} className="tag improvement">{improvement}</span>
                    ))}
                  </div>
                </div>

                <div className="details-section">
                  <h3>Score Breakdown</h3>
                  <div className="score-list">
                    {Object.entries(currentDriver.scores).map(([key, value]) => (
                      <div key={key} className="score-item">
                        <span className="score-label">{key.replace(/_/g, ' ')}</span>
                        <div className="score-bar-container">
                          <div 
                            className="score-bar" 
                            style={{ width: `${value}%` }}
                          ></div>
                          <span className="score-value">{value.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Driver Comparison Content */}
        <div className="section" style={{ border: '2px solid #ef4444', borderRadius: '0.75rem', padding: '1.5rem' }}>
          <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>Driver Comparison</h2>
          
          {/* Driver Selectors for Comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#d1d5db', fontWeight: 'bold' }}>
                Driver 1:
              </label>
              <select 
                value={compareDriver1 || ''} 
                onChange={(e) => setCompareDriver1(e.target.value)}
                className="driver-select"
                style={{ width: '100%' }}
              >
                {driverList.map(driver => (
                  <option key={driver.id} value={driver.id}>
                    Driver #{driver.id} - {driver.archetype}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#d1d5db', fontWeight: 'bold' }}>
                Driver 2:
              </label>
              <select 
                value={compareDriver2 || ''} 
                onChange={(e) => setCompareDriver2(e.target.value)}
                className="driver-select"
                style={{ width: '100%' }}
              >
                {driverList.map(driver => (
                  <option key={driver.id} value={driver.id}>
                    Driver #{driver.id} - {driver.archetype}
                  </option>
                ))}
              </select>
            </div>
            {/* Track Selector for Comparison */}
            {availableTracks.length > 0 && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#d1d5db', fontWeight: 'bold' }}>
                  Select Track:
                </label>
                <select 
                  value={selectedTrackCompare || ''} 
                  onChange={(e) => setSelectedTrackCompare(e.target.value)}
                  className="driver-select"
                  style={{ width: '100%' }}
                >
                  {availableTracks.map(track => (
                    <option key={track.id} value={track.id}>
                      {track.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {compareDriver1 && compareDriver2 && compareDriver1Data && compareDriver2Data ? (
            (() => {
              // Get track-specific adjusted fingerprint for comparison
              const getTrackAdjustedFingerprint = (driver, trackId) => {
                const trackInfo = tracks?.tracks?.[trackId];
                const trackType = trackInfo?.kmeans?.cluster || 'Mixed';
                const fingerprint = driver.fingerprint || {};
                const scores = driver.scores || {};
                const fingerprintFeatures = drivers.fingerprint_features || {};
                
                // Base fingerprint (already in 0-100 percentile format)
                const baseFingerprint = {
                  peak_speed: fingerprint.peak_speed || scores.speed || 50,
                  consistency: fingerprint.consistency || scores.consistency || 50,
                  tire_management: fingerprint.tire_management || scores.tire_management || 50,
                  pressure_handling: fingerprint.pressure_handling || scores.pressure || 50,
                  technical_skill: fingerprint.technical_skill || (100 - (scores.s2_skill || 50)),
                  high_speed_skill: fingerprint.high_speed_skill || (100 - (scores.s3_skill || 50)),
                  restart_ability: fingerprint.restart_ability || scores.race_craft || 50,
                  race_pace: fingerprint.race_pace || (100 - (scores.race_craft || 50))
                };
                
                // Track-specific adjustments based on track type
                // Technical tracks favor: technical_skill, consistency, tire_management, pressure_handling
                // High-Speed tracks favor: peak_speed, high_speed_skill, race_pace
                // Mixed tracks: balanced
                
                let adjustedFingerprint = { ...baseFingerprint };
                
                if (trackType === 'Technical') {
                  // Boost technical skills, reduce speed emphasis
                  adjustedFingerprint.technical_skill = Math.min(100, baseFingerprint.technical_skill * 1.15);
                  adjustedFingerprint.consistency = Math.min(100, baseFingerprint.consistency * 1.1);
                  adjustedFingerprint.tire_management = Math.min(100, baseFingerprint.tire_management * 1.1);
                  adjustedFingerprint.pressure_handling = Math.min(100, baseFingerprint.pressure_handling * 1.05);
                  adjustedFingerprint.peak_speed = Math.max(0, baseFingerprint.peak_speed * 0.9);
                  adjustedFingerprint.high_speed_skill = Math.max(0, baseFingerprint.high_speed_skill * 0.95);
                } else if (trackType === 'High-Speed') {
                  // Boost speed skills, reduce technical emphasis
                  adjustedFingerprint.peak_speed = Math.min(100, baseFingerprint.peak_speed * 1.15);
                  adjustedFingerprint.high_speed_skill = Math.min(100, baseFingerprint.high_speed_skill * 1.1);
                  adjustedFingerprint.race_pace = Math.min(100, baseFingerprint.race_pace * 1.05);
                  adjustedFingerprint.technical_skill = Math.max(0, baseFingerprint.technical_skill * 0.9);
                  adjustedFingerprint.consistency = Math.max(0, baseFingerprint.consistency * 0.95);
                }
                // Mixed tracks: no adjustment, use base fingerprint
                
                // Convert to radar chart format
                return Object.entries(adjustedFingerprint).map(([key, value]) => {
                  const featInfo = fingerprintFeatures[key] || {};
                  return {
                    dimension: featInfo.display_name || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    value: Math.min(100, Math.max(0, value)), // Ensure 0-100 range
                    description: featInfo.description || ''
                  };
                });
              };
              
              // Get radar data for both drivers
              const driver1RadarData = selectedTrackCompare 
                ? getTrackAdjustedFingerprint(compareDriver1Data, selectedTrackCompare)
                : (() => {
                    const fingerprint = compareDriver1Data.fingerprint || {};
                    const fingerprintFeatures = drivers.fingerprint_features || {};
                    return Object.entries(fingerprint).map(([key, value]) => {
                      const featInfo = fingerprintFeatures[key] || {};
                      return {
                        dimension: featInfo.display_name || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        value: value || 0,
                        description: featInfo.description || ''
                      };
                    });
                  })();
              
              const driver2RadarData = selectedTrackCompare
                ? getTrackAdjustedFingerprint(compareDriver2Data, selectedTrackCompare)
                : (() => {
                    const fingerprint = compareDriver2Data.fingerprint || {};
                    const fingerprintFeatures = drivers.fingerprint_features || {};
                    return Object.entries(fingerprint).map(([key, value]) => {
                      const featInfo = fingerprintFeatures[key] || {};
                      return {
                        dimension: featInfo.display_name || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        value: value || 0,
                        description: featInfo.description || ''
                      };
                    });
                  })();
              
              // Check if we have actual track data
              const driver1HasTrackData = selectedTrackCompare && compareDriver1Data.track_stats?.[selectedTrackCompare];
              const driver2HasTrackData = selectedTrackCompare && compareDriver2Data.track_stats?.[selectedTrackCompare];
              
              return (
                <>
                  <h3 style={{ color: '#f9fafb', marginBottom: '1.5rem', textAlign: 'center' }}>
                    {selectedTrackCompare 
                      ? `Comparison at ${tracks?.tracks?.[selectedTrackCompare]?.name || selectedTrackCompare}`
                      : 'Overall Comparison'}
                  </h3>
                  
                  {/* Side-by-side Radar Charts - Horizontal Layout */}
                  <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    {/* Driver 1 */}
                    <div style={{
                      background: '#111827',
                      padding: '1.5rem',
                      borderRadius: '0.5rem',
                      border: '2px solid #3b82f6',
                      flex: '1',
                      minWidth: '400px'
                    }}>
                      <div style={{ marginBottom: '1rem' }}>
                        <h4 style={{ color: '#f9fafb', marginBottom: '0.5rem', textAlign: 'center', fontSize: '1.25rem' }}>
                          Driver #{compareDriver1} - {compareDriver1Data.archetype}
                        </h4>
                        {selectedTrackCompare && (
                          <div style={{ 
                            textAlign: 'center', 
                            fontSize: '0.875rem', 
                            color: driver1HasTrackData ? '#10b981' : '#f59e0b',
                            fontStyle: driver1HasTrackData ? 'normal' : 'italic'
                          }}>
                            {driver1HasTrackData ? '✓ Actual track data' : '🔮 Predicted based on track type'}
                          </div>
                        )}
                      </div>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={350}>
                          <RadarChart data={driver1RadarData}>
                            <PolarGrid stroke="#374151" strokeDasharray="3 3" />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} tickCount={6} />
                            <PolarAngleAxis dataKey="dimension" tick={{ fill: '#d1d5db', fontSize: 11 }} />
                            <Radar name="Driver 1" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} fill="#3b82f6" fillOpacity={0.5} dot={{ fill: '#3b82f6', r: 4 }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    {/* Driver 2 */}
                    <div style={{
                      background: '#111827',
                      padding: '1.5rem',
                      borderRadius: '0.5rem',
                      border: '2px solid #ef4444',
                      flex: '1',
                      minWidth: '400px'
                    }}>
                      <div style={{ marginBottom: '1rem' }}>
                        <h4 style={{ color: '#f9fafb', marginBottom: '0.5rem', textAlign: 'center', fontSize: '1.25rem' }}>
                          Driver #{compareDriver2} - {compareDriver2Data.archetype}
                        </h4>
                        {selectedTrackCompare && (
                          <div style={{ 
                            textAlign: 'center', 
                            fontSize: '0.875rem', 
                            color: driver2HasTrackData ? '#10b981' : '#f59e0b',
                            fontStyle: driver2HasTrackData ? 'normal' : 'italic'
                          }}>
                            {driver2HasTrackData ? '✓ Actual track data' : '🔮 Predicted based on track type'}
                          </div>
                        )}
                      </div>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={350}>
                          <RadarChart data={driver2RadarData}>
                            <PolarGrid stroke="#374151" strokeDasharray="3 3" />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} tickCount={6} />
                            <PolarAngleAxis dataKey="dimension" tick={{ fill: '#d1d5db', fontSize: 11 }} />
                            <Radar name="Driver 2" dataKey="value" stroke="#ef4444" strokeWidth={2.5} fill="#ef4444" fillOpacity={0.5} dot={{ fill: '#ef4444', r: 4 }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  
                  {/* Track-Specific Prediction */}
                  {selectedTrackCompare && (() => {
                    const trackInfo = tracks?.tracks?.[selectedTrackCompare];
                    const trackName = trackInfo?.name || selectedTrackCompare.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                    const trackType = trackInfo?.kmeans?.cluster || 'Mixed';
                    
                    // Calculate track-specific scores using weighted fingerprint
                    const getTrackScore = (driver, trackType) => {
                      const fingerprint = driver.fingerprint || {};
                      const scores = driver.scores || {};
                      
                      // Get base values (use fingerprint if available, otherwise scores)
                      const peak_speed = fingerprint.peak_speed || scores.speed || 50;
                      const consistency = fingerprint.consistency || scores.consistency || 50;
                      const tire_management = fingerprint.tire_management || scores.tire_management || 50;
                      const pressure_handling = fingerprint.pressure_handling || scores.pressure || 50;
                      const technical_skill = fingerprint.technical_skill || (100 - (scores.s2_skill || 50));
                      const high_speed_skill = fingerprint.high_speed_skill || (100 - (scores.s3_skill || 50));
                      const restart_ability = fingerprint.restart_ability || scores.race_craft || 50;
                      const race_pace = fingerprint.race_pace || (100 - (scores.race_craft || 50));
                      
                      let score = 0;
                      
                      if (trackType === 'Technical') {
                        // Technical tracks: 40% technical skill, 25% consistency, 20% tire management, 15% pressure
                        score = (technical_skill * 0.40) + (consistency * 0.25) + (tire_management * 0.20) + (pressure_handling * 0.15);
                      } else if (trackType === 'High-Speed') {
                        // High-Speed tracks: 35% peak speed, 25% high-speed skill, 25% race pace, 15% restart ability
                        score = (peak_speed * 0.35) + (high_speed_skill * 0.25) + (race_pace * 0.25) + (restart_ability * 0.15);
                      } else {
                        // Mixed tracks: balanced weighting
                        score = (consistency * 0.20) + (peak_speed * 0.20) + (technical_skill * 0.15) + 
                                (high_speed_skill * 0.15) + (tire_management * 0.15) + (pressure_handling * 0.15);
                      }
                      
                      return Math.min(100, Math.max(0, score));
                    };
                    
                    const driver1Score = getTrackScore(compareDriver1Data, trackType);
                    const driver2Score = getTrackScore(compareDriver2Data, trackType);
                    const winner = driver1Score > driver2Score ? compareDriver1 : compareDriver2;
                    const margin = Math.abs(driver1Score - driver2Score);
                    
                    // Get normalized values helper
                    const getValue = (fp, sc, key, invert = false) => {
                      const fpVal = fp[key];
                      const scVal = sc[key] || (invert ? 100 - (sc[key.replace('_skill', '_skill')] || 50) : 50);
                      const val = fpVal !== undefined ? fpVal : scVal;
                      return invert ? (100 - val) : val;
                    };
                    
                    const d1Fingerprint = compareDriver1Data.fingerprint || {};
                    const d1Scores = compareDriver1Data.scores || {};
                    const d2Fingerprint = compareDriver2Data.fingerprint || {};
                    const d2Scores = compareDriver2Data.scores || {};
                    
                    const d1 = {
                      peak_speed: getValue(d1Fingerprint, d1Scores, 'peak_speed') || d1Scores.speed || 50,
                      consistency: getValue(d1Fingerprint, d1Scores, 'consistency') || d1Scores.consistency || 50,
                      tire_management: getValue(d1Fingerprint, d1Scores, 'tire_management') || d1Scores.tire_management || 50,
                      pressure_handling: getValue(d1Fingerprint, d1Scores, 'pressure_handling') || d1Scores.pressure || 50,
                      technical_skill: getValue(d1Fingerprint, d1Scores, 'technical_skill', true) || (100 - (d1Scores.s2_skill || 50)),
                      high_speed_skill: getValue(d1Fingerprint, d1Scores, 'high_speed_skill', true) || (100 - (d1Scores.s3_skill || 50)),
                      restart_ability: getValue(d1Fingerprint, d1Scores, 'restart_ability') || d1Scores.race_craft || 50,
                      race_pace: getValue(d1Fingerprint, d1Scores, 'race_pace', true) || (100 - (d1Scores.race_craft || 50))
                    };
                    
                    const d2 = {
                      peak_speed: getValue(d2Fingerprint, d2Scores, 'peak_speed') || d2Scores.speed || 50,
                      consistency: getValue(d2Fingerprint, d2Scores, 'consistency') || d2Scores.consistency || 50,
                      tire_management: getValue(d2Fingerprint, d2Scores, 'tire_management') || d2Scores.tire_management || 50,
                      pressure_handling: getValue(d2Fingerprint, d2Scores, 'pressure_handling') || d2Scores.pressure || 50,
                      technical_skill: getValue(d2Fingerprint, d2Scores, 'technical_skill', true) || (100 - (d2Scores.s2_skill || 50)),
                      high_speed_skill: getValue(d2Fingerprint, d2Scores, 'high_speed_skill', true) || (100 - (d2Scores.s3_skill || 50)),
                      restart_ability: getValue(d2Fingerprint, d2Scores, 'restart_ability') || d2Scores.race_craft || 50,
                      race_pace: getValue(d2Fingerprint, d2Scores, 'race_pace', true) || (100 - (d2Scores.race_craft || 50))
                    };
                    
                    // Generate comprehensive comparison analysis
                    const generateDetailedAnalysis = (winnerDriver, loserDriver, winnerStats, loserStats, trackType, trackName) => {
                      const analysis = {
                        advantages: [],
                        weaknesses: [],
                        strategy: [],
                        keyDifferentiators: [],
                        raceOutcome: ''
                      };
                      
                      // Calculate differences
                      const diff = {
                        peak_speed: winnerStats.peak_speed - loserStats.peak_speed,
                        consistency: winnerStats.consistency - loserStats.consistency,
                        tire_management: winnerStats.tire_management - loserStats.tire_management,
                        pressure_handling: winnerStats.pressure_handling - loserStats.pressure_handling,
                        technical_skill: winnerStats.technical_skill - loserStats.technical_skill,
                        high_speed_skill: winnerStats.high_speed_skill - loserStats.high_speed_skill,
                        restart_ability: winnerStats.restart_ability - loserStats.restart_ability,
                        race_pace: winnerStats.race_pace - loserStats.race_pace
                      };
                      
                      // Track-specific advantages
                      if (trackType === 'Technical') {
                        if (diff.technical_skill > 5) {
                          analysis.advantages.push({
                            metric: 'Technical Skill',
                            value: diff.technical_skill.toFixed(1),
                            description: `Superior mid-corner precision and Sector 2 consistency. This driver maintains better control through technical sections, reducing mistakes and maintaining optimal racing lines.`
                          });
                        }
                        if (diff.consistency > 5) {
                          analysis.advantages.push({
                            metric: 'Consistency',
                            value: diff.consistency.toFixed(1),
                            description: `More predictable lap times reduce strategic uncertainty. This driver's consistency allows for better tire management and race strategy execution.`
                          });
                        }
                        if (diff.tire_management > 5) {
                          analysis.advantages.push({
                            metric: 'Tire Management',
                            value: diff.tire_management.toFixed(1),
                            description: `Better tire preservation means this driver can maintain pace longer and potentially run longer stints, providing strategic flexibility.`
                          });
                        }
                        if (diff.pressure_handling > 5) {
                          analysis.advantages.push({
                            metric: 'Pressure Handling',
                            value: diff.pressure_handling.toFixed(1),
                            description: `Stronger performance in critical moments, especially in the final stages when technical precision becomes even more important.`
                          });
                        }
                        
                        // Strategy recommendations
                        if (diff.tire_management > 8) {
                          analysis.strategy.push('Consider a longer first stint to maximize tire advantage');
                        }
                        if (diff.consistency > 8) {
                          analysis.strategy.push('Use consistency advantage to undercut opponents in pit strategy');
                        }
                      } else if (trackType === 'High-Speed') {
                        if (diff.peak_speed > 5) {
                          analysis.advantages.push({
                            metric: 'Peak Speed',
                            value: diff.peak_speed.toFixed(1),
                            description: `Higher top speed provides significant advantage on long straights. This driver can gain time on straight sections and defend positions more effectively.`
                          });
                        }
                        if (diff.high_speed_skill > 5) {
                          analysis.advantages.push({
                            metric: 'High-Speed Skill',
                            value: diff.high_speed_skill.toFixed(1),
                            description: `Better Sector 3 performance indicates superior confidence and car control at high speeds, crucial for maintaining momentum.`
                          });
                        }
                        if (diff.race_pace > 5) {
                          analysis.advantages.push({
                            metric: 'Race Pace',
                            value: diff.race_pace.toFixed(1),
                            description: `Superior race pace means this driver can maintain faster average speeds throughout the race, not just in qualifying.`
                          });
                        }
                        if (diff.restart_ability > 5) {
                          analysis.advantages.push({
                            metric: 'Restart Ability',
                            value: diff.restart_ability.toFixed(1),
                            description: `Better performance after Full Course Yellow restarts. This driver can capitalize on restart opportunities to gain positions.`
                          });
                        }
                        
                        // Strategy recommendations
                        if (diff.peak_speed > 8) {
                          analysis.strategy.push('Use speed advantage to create overtaking opportunities on straights');
                        }
                        if (diff.restart_ability > 8) {
                          analysis.strategy.push('Position strategically before restarts to maximize restart advantage');
                        }
                      } else {
                        // Mixed tracks
                        if (diff.consistency > 5) {
                          analysis.advantages.push({
                            metric: 'Consistency',
                            value: diff.consistency.toFixed(1),
                            description: `More consistent performance reduces mistakes and provides better strategic predictability.`
                          });
                        }
                        if (diff.peak_speed > 5) {
                          analysis.advantages.push({
                            metric: 'Peak Speed',
                            value: diff.peak_speed.toFixed(1),
                            description: `Higher top speed provides advantage on straight sections of the track.`
                          });
                        }
                        if (diff.technical_skill > 5) {
                          analysis.advantages.push({
                            metric: 'Technical Skill',
                            value: diff.technical_skill.toFixed(1),
                            description: `Better technical precision helps in complex corner combinations.`
                          });
                        }
                        if (diff.tire_management > 5) {
                          analysis.advantages.push({
                            metric: 'Tire Management',
                            value: diff.tire_management.toFixed(1),
                            description: `Superior tire preservation allows for more strategic flexibility.`
                          });
                        }
                      }
                      
                      // Identify key differentiators (biggest gaps)
                      const sortedDiffs = Object.entries(diff)
                        .map(([key, value]) => ({ key, value: Math.abs(value) }))
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 3);
                      
                      analysis.keyDifferentiators = sortedDiffs.map(({ key, value }) => {
                        const metricNames = {
                          peak_speed: 'Peak Speed',
                          consistency: 'Consistency',
                          tire_management: 'Tire Management',
                          pressure_handling: 'Pressure Handling',
                          technical_skill: 'Technical Skill',
                          high_speed_skill: 'High-Speed Skill',
                          restart_ability: 'Restart Ability',
                          race_pace: 'Race Pace'
                        };
                        return {
                          metric: metricNames[key] || key,
                          gap: value.toFixed(1),
                          winner: diff[key] > 0 ? winnerDriver : loserDriver
                        };
                      });
                      
                      // Identify weaknesses (where loser is better)
                      if (diff.peak_speed < -5) {
                        analysis.weaknesses.push(`Lower peak speed (-${Math.abs(diff.peak_speed).toFixed(1)} points) may limit overtaking opportunities`);
                      }
                      if (diff.consistency < -5) {
                        analysis.weaknesses.push(`Less consistent (-${Math.abs(diff.consistency).toFixed(1)} points) could lead to mistakes under pressure`);
                      }
                      if (diff.restart_ability < -5) {
                        analysis.weaknesses.push(`Weaker restart ability (-${Math.abs(diff.restart_ability).toFixed(1)} points) may lose positions after FCY`);
                      }
                      
                      // Race outcome prediction
                      const scoreDiff = Math.abs(driver1Score - driver2Score);
                      if (scoreDiff > 15) {
                        analysis.raceOutcome = `Strong favorite with ${scoreDiff.toFixed(1)}-point advantage. Expected to lead comfortably if race goes clean.`;
                      } else if (scoreDiff > 8) {
                        analysis.raceOutcome = `Moderate favorite with ${scoreDiff.toFixed(1)}-point advantage. Likely winner but race circumstances could change outcome.`;
                      } else {
                        analysis.raceOutcome = `Narrow ${scoreDiff.toFixed(1)}-point advantage. Very close race expected - strategy and race incidents will be decisive.`;
                      }
                      
                      return analysis;
                    };
                    
                    const winnerData = winner === compareDriver1 ? { driver: compareDriver1, stats: d1, archetype: compareDriver1Data.archetype } : { driver: compareDriver2, stats: d2, archetype: compareDriver2Data.archetype };
                    const loserData = winner === compareDriver1 ? { driver: compareDriver2, stats: d2, archetype: compareDriver2Data.archetype } : { driver: compareDriver1, stats: d1, archetype: compareDriver1Data.archetype };
                    
                    const detailedAnalysis = generateDetailedAnalysis(
                      winnerData.driver,
                      loserData.driver,
                      winnerData.stats,
                      loserData.stats,
                      trackType,
                      trackName
                    );
                    
                    return (
                      <div style={{
                        background: '#111827',
                        border: '1px solid #374151',
                        borderRadius: '0.5rem',
                        padding: '1.5rem',
                        marginTop: '1rem'
                      }}>
                        <h4 style={{ color: '#f9fafb', marginBottom: '1.5rem', fontSize: '1.5rem' }}>
                          📊 Detailed Analysis: {trackName}
                        </h4>
                        
                        {/* Winner Prediction */}
                        <div style={{
                          background: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)',
                          padding: '1.25rem',
                          borderRadius: '0.5rem',
                          marginBottom: '1.5rem',
                          border: `2px solid ${winner === compareDriver1 ? '#3b82f6' : '#ef4444'}`
                        }}>
                          <div style={{ 
                            fontSize: '1.5rem', 
                            fontWeight: 'bold',
                            color: '#f9fafb',
                            marginBottom: '0.5rem'
                          }}>
                            🏆 Predicted Winner: Driver #{winner} ({winnerData.archetype})
                          </div>
                          <div style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                            Track Type: <strong>{trackType}</strong> | Score Difference: <strong>{margin.toFixed(1)} points</strong>
                          </div>
                          <div style={{ color: '#e0e7ff', fontSize: '0.95rem', lineHeight: '1.6', fontStyle: 'italic' }}>
                            {detailedAnalysis.raceOutcome}
                          </div>
                        </div>
                        
                        {/* Key Advantages */}
                        {detailedAnalysis.advantages.length > 0 && (
                          <div style={{
                            background: '#1f2937',
                            padding: '1.25rem',
                            borderRadius: '0.5rem',
                            marginBottom: '1.5rem'
                          }}>
                            <h5 style={{ color: '#93c5fd', fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                              ✅ Key Advantages for Driver #{winner}
                            </h5>
                            {detailedAnalysis.advantages.map((adv, idx) => (
                              <div key={idx} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: idx < detailedAnalysis.advantages.length - 1 ? '1px solid #374151' : 'none' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                  <strong style={{ color: '#3b82f6', fontSize: '1rem' }}>{adv.metric}</strong>
                                  <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 'bold' }}>+{adv.value} pts</span>
                                </div>
                                <p style={{ color: '#d1d5db', fontSize: '0.875rem', lineHeight: '1.6', margin: 0 }}>
                                  {adv.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Key Differentiators */}
                        {detailedAnalysis.keyDifferentiators.length > 0 && (
                          <div style={{
                            background: '#1f2937',
                            padding: '1.25rem',
                            borderRadius: '0.5rem',
                            marginBottom: '1.5rem'
                          }}>
                            <h5 style={{ color: '#f59e0b', fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                              🎯 Biggest Performance Gaps
                            </h5>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                              {detailedAnalysis.keyDifferentiators.map((diff, idx) => (
                                <div key={idx} style={{
                                  background: '#111827',
                                  padding: '0.75rem',
                                  borderRadius: '0.5rem',
                                  border: '1px solid #374151'
                                }}>
                                  <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginBottom: '0.25rem' }}>{diff.metric}</div>
                                  <div style={{ color: '#f9fafb', fontSize: '1rem', fontWeight: 'bold' }}>
                                    {diff.gap} pts
                                  </div>
                                  <div style={{ color: diff.winner === compareDriver1 ? '#3b82f6' : '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                    Driver #{diff.winner}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Strategy Recommendations */}
                        {detailedAnalysis.strategy.length > 0 && (
                          <div style={{
                            background: '#1f2937',
                            padding: '1.25rem',
                            borderRadius: '0.5rem',
                            marginBottom: '1.5rem'
                          }}>
                            <h5 style={{ color: '#a78bfa', fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                              💡 Strategic Recommendations
                            </h5>
                            <ul style={{ color: '#d1d5db', fontSize: '0.875rem', lineHeight: '1.8', paddingLeft: '1.5rem', margin: 0 }}>
                              {detailedAnalysis.strategy.map((strategy, idx) => (
                                <li key={idx} style={{ marginBottom: '0.5rem' }}>{strategy}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Potential Weaknesses */}
                        {detailedAnalysis.weaknesses.length > 0 && (
                          <div style={{
                            background: '#1f2937',
                            padding: '1.25rem',
                            borderRadius: '0.5rem',
                            marginBottom: '1.5rem',
                            border: '1px solid #ef4444'
                          }}>
                            <h5 style={{ color: '#f87171', fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                              ⚠️ Areas of Concern for Driver #{winner}
                            </h5>
                            <ul style={{ color: '#d1d5db', fontSize: '0.875rem', lineHeight: '1.8', paddingLeft: '1.5rem', margin: 0 }}>
                              {detailedAnalysis.weaknesses.map((weakness, idx) => (
                                <li key={idx} style={{ marginBottom: '0.5rem' }}>{weakness}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Score Breakdown */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div style={{
                            background: '#1f2937',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            textAlign: 'center',
                            border: winner === compareDriver1 ? '2px solid #3b82f6' : '1px solid #374151'
                          }}>
                            <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Driver #{compareDriver1}</div>
                            <div style={{ color: '#d1d5db', fontSize: '1.1rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
                              {driver1Score.toFixed(1)}
                            </div>
                          </div>
                          <div style={{
                            background: '#1f2937',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            textAlign: 'center',
                            border: winner === compareDriver2 ? '2px solid #ef4444' : '1px solid #374151'
                          }}>
                            <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Driver #{compareDriver2}</div>
                            <div style={{ color: '#d1d5db', fontSize: '1.1rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
                              {driver2Score.toFixed(1)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              );
            })()
          ) : (
            <div style={{ 
              textAlign: 'center', 
              color: '#9ca3af', 
              padding: '2rem',
              background: '#111827',
              borderRadius: '0.5rem',
              border: '1px solid #374151'
            }}>
              <p>Select two drivers above to compare their performance</p>
            </div>
          )}
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">Archetype Descriptions</h2>
        <div className="archetypes-grid">
          {Object.entries(archetypes.archetypes || {}).map(([name, info]) => (
            <div key={name} className="archetype-card">
              <h3>{name}</h3>
              <p>{info.description}</p>
              <div className="archetype-details">
                <div>
                  <strong>Strengths:</strong>
                  <ul>
                    {info.strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>Recommendations:</strong>
                  <ul>
                    {info.recommendations.slice(0, 2).map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Drivers;

