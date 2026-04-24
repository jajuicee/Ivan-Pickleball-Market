import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import TabletLayout from './components/TabletLayout';

import { useState, useEffect } from 'react';

function App() {
  const [isTablet, setIsTablet] = useState(window.innerWidth <= 1024);

  useEffect(() => {
    const handleResize = () => setIsTablet(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <BrowserRouter>
      <div className="App overflow-hidden">
        <Routes>
          {/* Support both the explicit path and the automatic detection */}
          <Route path="/tablet/*" element={<TabletLayout />} />
          <Route path="/*" element={isTablet ? <TabletLayout /> : <Dashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;