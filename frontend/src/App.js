import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Overview from './pages/Overview';
import Correlations from './pages/Correlations';
import Predictors from './pages/Predictors';
import Drivers from './pages/Drivers';
import Visualizations from './pages/Visualizations';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              🏁 RaceIQ
            </Link>
            <div className="nav-links">
              <Link to="/" className="nav-link">Overview</Link>
              <Link to="/correlations" className="nav-link">Correlations</Link>
              <Link to="/predictors" className="nav-link">Predictors</Link>
              <Link to="/drivers" className="nav-link">Drivers</Link>
              <Link to="/visualizations" className="nav-link">Visualizations</Link>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/correlations" element={<Correlations />} />
            <Route path="/predictors" element={<Predictors />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/visualizations" element={<Visualizations />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

