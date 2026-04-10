"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import AccessibilityToggle from '@/components/AccessibilityToggle';

// Types
interface CrowdAlert {
  location: string;
  density: number;
  status: string;
}

interface RestroomData {
  name: string;
  traffic: string;
  level: number; // 0-100
}

interface FriendLocation {
  name: string;
  sector: string;
  distance: string;
  avatar: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('routing');
  const [isConnected, setIsConnected] = useState(false);
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [anomalyAlert, setAnomalyAlert] = useState<CrowdAlert | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [arActive, setArActive] = useState(false);
  const [routeProgress, setRouteProgress] = useState(45);
  const [eta, setEta] = useState('4 mins');
  const [currentLocation, setCurrentLocation] = useState('Sector 104');
  const [alertHistory, setAlertHistory] = useState<CrowdAlert[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  // Simulated restroom data that updates with WebSocket events
  const [restroomData, setRestroomData] = useState<RestroomData[]>([
    { name: "Sector 104 Men's", traffic: 'Low Traffic', level: 20 },
    { name: "Sector 110 Women's", traffic: 'Moderate', level: 60 },
    { name: "Sector 112 Family", traffic: 'Low Traffic', level: 15 },
  ]);

  // Friend locations for AR Finder
  const friendLocations: FriendLocation[] = [
    { name: 'Rahul S.', sector: 'Sector 108, Row F', distance: '45m away', avatar: '🧑' },
    { name: 'Priya K.', sector: 'Sector 104, Row C', distance: '12m away', avatar: '👩' },
    { name: 'Amit D.', sector: 'Concourse B', distance: '120m away', avatar: '🧔' },
  ];

  // Connect to Backend WebSocket with auto-reconnect
  const connectWebSocket = useCallback(() => {
    const clientId = Math.random().toString(36).substring(7);
    const socket = new WebSocket(`ws://localhost:8000/ws/${clientId}?zone=stadium_main`);
    
    socket.onopen = () => {
      setIsConnected(true);
      console.log('✅ WebSocket connected');
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'CROWD_DENSITY_UPDATE') {
          const { location, density_percent, status } = payload.data;
          
          // Update restroom data dynamically based on location
          setRestroomData(prev => prev.map(r => {
            if (location.includes('104') && r.name.includes('104')) {
              const newLevel = Math.min(100, Math.max(5, density_percent - 10 + Math.random() * 20));
              return { ...r, level: Math.round(newLevel), traffic: newLevel > 70 ? 'High Traffic' : newLevel > 40 ? 'Moderate' : 'Low Traffic' };
            }
            if (location.includes('110') && r.name.includes('110')) {
              const newLevel = Math.min(100, Math.max(5, density_percent - 5 + Math.random() * 15));
              return { ...r, level: Math.round(newLevel), traffic: newLevel > 70 ? 'High Traffic' : newLevel > 40 ? 'Moderate' : 'Low Traffic' };
            }
            return r;
          }));

          // Update route progress based on density
          if (status === 'CRITICAL') {
            setRouteProgress(prev => Math.max(30, prev - 10));
            setEta('Rerouting...');
            setCurrentLocation(`Rerouting from ${location}`);
          } else if (status === 'WARNING') {
            setRouteProgress(prev => Math.min(80, prev + 2));
            setEta(`${Math.max(2, 6 - Math.floor(density_percent / 20))} mins`);
          } else {
            setRouteProgress(prev => Math.min(95, prev + 5));
            setEta(`${Math.max(1, 5 - Math.floor(density_percent / 25))} mins`);
            setCurrentLocation('Sector 104');
          }

          if (status === 'CRITICAL' || status === 'WARNING') {
            const alert = { location, density: density_percent, status };
            setAnomalyAlert(alert);
            setAlertHistory(prev => [alert, ...prev].slice(0, 5));
            setTimeout(() => setAnomalyAlert(null), 4000);
          }
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      console.log('❌ WebSocket disconnected, reconnecting in 3s...');
      reconnectTimeout.current = setTimeout(connectWebSocket, 3000);
    };
    
    socket.onerror = () => {
      socket.close();
    };

    ws.current = socket;
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      ws.current?.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [connectWebSocket]);

  // Simulate route progress over time
  useEffect(() => {
    const interval = setInterval(() => {
      if (!anomalyAlert) {
        setRouteProgress(prev => {
          if (prev >= 95) return 45; // Reset cycle
          return prev + 1;
        });
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [anomalyAlert]);

  const handleJITOrder = async (itemName: string, stand: string) => {
    setOrderStatus(`⏳ Triggering order for ${itemName}...`);
    try {
      const response = await fetch('http://localhost:8000/api/v1/jit-concessions/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: "u123",
          stand_id: stand,
          menu_item: itemName,
          distance_meters: Math.random() * 200
        })
      });
      const data = await response.json();
      setOrderStatus(`✅ ${data.message} ETA: ${data.eta_minutes}m`);
      setTimeout(() => setOrderStatus(null), 5000);
    } catch {
      setOrderStatus("⚠️ Backend offline — order simulated locally. Ready in ~3 mins.");
      setTimeout(() => setOrderStatus(null), 4000);
    }
  };

  const getTrafficColor = (traffic: string) => {
    if (traffic === 'High Traffic') return 'text-red-400';
    if (traffic === 'Moderate') return 'text-yellow-500';
    return 'text-emerald-400';
  };

  const getTrafficBarColor = (traffic: string) => {
    if (traffic === 'High Traffic') return 'bg-red-500';
    if (traffic === 'Moderate') return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  return (
    <main className={`min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-6 lg:p-12 font-sans relative overflow-hidden transition-all duration-500 ${accessibilityMode ? 'text-lg' : ''}`}>
      {/* Dynamic Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full animate-pulse-slow transition-colors duration-1000 ${anomalyAlert?.status === 'CRITICAL' ? 'bg-red-600/30' : 'bg-blue-600/30'}`}></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/20 blur-[120px] rounded-full animate-pulse-slow"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <header className="flex justify-between items-center mb-12 animate-fade-in">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 tracking-tight">
              StadiaFlow <span className="opacity-70 text-white">AI</span>
            </h1>
            <p className="text-slate-400 mt-2 text-lg font-medium">The Living Stadium Orchestration System</p>
          </div>
          
          <div className="glass-panel px-6 py-3 flex items-center space-x-3">
            <span className="relative flex h-3 w-3">
              {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-emerald-500' : 'bg-yellow-500 animate-pulse'}`}></span>
            </span>
            <span className="text-sm font-semibold tracking-wide text-slate-200">
              {isConnected ? 'NODE CONNECTED' : 'CONNECTING...'}
            </span>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Main Action Panel */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="md:col-span-2 glass-panel p-8"
          >
            <div className="flex space-x-6 border-b border-white/10 mb-8 overflow-x-auto pb-4 custom-scrollbar">
              {['routing', 'concessions', 'ar-finder'].map((tab) => (
                <button
                  key={tab}
                  id={`tab-${tab}`}
                  className={`text-sm tracking-wider uppercase font-bold transition-all duration-300 whitespace-nowrap ${activeTab === tab ? 'text-emerald-400 border-b-2 border-emerald-400 pb-2' : 'text-slate-400 hover:text-slate-200'}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'routing' ? '🧭 Routing' : tab === 'concessions' ? '🍔 Concessions' : '📍 AR Finder'}
                </button>
              ))}
            </div>

            <div className="min-h-[300px]">
              <AnimatePresence mode="wait">
                {activeTab === 'routing' && (
                  <motion.div 
                    key="routing"
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Crowd-Aware Routing{' '}
                      <span className={`text-sm px-2 py-1 rounded-full ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {isConnected ? '● Live' : '○ Offline'}
                      </span>
                    </h2>
                    
                    <AnimatePresence>
                      {anomalyAlert && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          className={`p-4 rounded-xl mb-4 border ${anomalyAlert.status === 'CRITICAL' ? 'bg-red-900/40 border-red-500/50 text-red-200' : 'bg-yellow-900/40 border-yellow-500/50 text-yellow-200'}`}
                        >
                          <strong>⚠️ System Alert:</strong> Anomaly detected in <strong>{anomalyAlert.location}</strong>. Density at <strong>{anomalyAlert.density}%</strong>. {anomalyAlert.status === 'CRITICAL' ? 'Initiating Dynamic Reroute.' : 'Monitoring closely.'}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!anomalyAlert && (
                      <p className="text-slate-400 leading-relaxed mb-6">
                        Navigating to Gate A. Path clear based on Vertex AI Edge sensors.
                      </p>
                    )}
                    
                    <div className="bg-black/40 rounded-xl border border-white/10 p-6 flex flex-col space-y-4">
                      <div className="flex justify-between items-center text-sm text-slate-300">
                        <span>📍 {currentLocation}</span>
                        <span className={`font-semibold ${anomalyAlert?.status === 'CRITICAL' ? 'text-red-400' : 'text-emerald-400'}`}>
                          ETA: {eta}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden relative">
                        <motion.div 
                          animate={{ width: `${routeProgress}%` }}
                          transition={{ duration: 1, ease: "easeInOut" }}
                          className={`absolute top-0 left-0 h-2.5 rounded-full ${anomalyAlert?.status === 'CRITICAL' ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-emerald-500'}`}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Your Seat</span>
                        <span>Gate A</span>
                      </div>
                      <p className="text-xs text-slate-500 italic mt-2">Powered by Vertex AI Edge Manager & Maps Indoor API</p>
                    </div>

                    {/* Alert History */}
                    {alertHistory.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-sm text-slate-400 font-semibold mb-2 uppercase tracking-wider">Recent Alerts</h3>
                        <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                          {alertHistory.map((alert, i) => (
                            <div key={i} className={`text-xs px-3 py-2 rounded-lg border ${alert.status === 'CRITICAL' ? 'border-red-500/30 bg-red-900/20 text-red-300' : 'border-yellow-500/30 bg-yellow-900/20 text-yellow-300'}`}>
                              {alert.status === 'CRITICAL' ? '🔴' : '🟡'} {alert.location} — {alert.density}% density
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'concessions' && (
                  <motion.div 
                    key="concessions"
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-2xl font-bold text-white mb-2">JIT Concessions</h2>
                    <p className="text-slate-400 leading-relaxed mb-6">Order prep triggers dynamically based on your physical proximity to the stand.</p>
                    
                    <AnimatePresence>
                      {orderStatus && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          exit={{ opacity: 0, y: -10 }}
                          className="mb-4 bg-emerald-900/40 border border-emerald-500/50 p-4 rounded-xl text-emerald-200 text-sm"
                        >
                          {orderStatus}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { name: 'Cold Beer & Hotdog', stand: 'S-112', standLabel: 'Stand 112', price: '₹450', icon: '🌭🍺' },
                        { name: 'Veggie Burger Combo', stand: 'S-115', standLabel: 'Stand 115', price: '₹380', icon: '🍔🥤' },
                        { name: 'Nachos Supreme', stand: 'S-108', standLabel: 'Stand 108', price: '₹320', icon: '🧀' },
                        { name: 'Coffee & Donut', stand: 'S-120', standLabel: 'Stand 120', price: '₹280', icon: '☕🍩' },
                      ].map((item) => (
                        <motion.div 
                          key={item.stand}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleJITOrder(item.name, item.stand)} 
                          className="glass-panel p-4 cursor-pointer hover:bg-white/5 transition-all outline-none focus:ring-2 ring-emerald-500 group"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg text-white mb-1 group-hover:text-emerald-300 transition-colors">{item.icon} {item.name}</h3>
                              <p className="text-sm text-emerald-400">{item.standLabel} • Tap to Queue</p>
                            </div>
                            <span className="text-sm font-bold text-slate-300">{item.price}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'ar-finder' && (
                  <motion.div 
                    key="ar-finder"
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-2xl font-bold text-white mb-2">AR-Friend Finder</h2>
                    <p className="text-slate-400 leading-relaxed mb-6">Locate your group in the stands visually using augmented reality.</p>
                    
                    {!arActive ? (
                      <div className="h-48 w-full bg-black/50 rounded-xl flex items-center justify-center border-2 border-dashed border-white/20 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                        <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setArActive(true)}
                          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-blue-500/20 z-10"
                        >
                          🔍 Launch AR Scanner
                        </motion.button>
                      </div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4"
                      >
                        {/* Simulated AR View */}
                        <div className="bg-gradient-to-br from-blue-950/80 to-slate-900/80 rounded-xl border border-blue-500/30 p-6 relative overflow-hidden">
                          <div className="absolute top-3 right-3">
                            <div className="flex items-center space-x-2">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                              </span>
                              <span className="text-xs text-blue-300 font-semibold">SCANNING</span>
                            </div>
                          </div>
                          
                          <h3 className="text-sm text-blue-300 font-bold uppercase tracking-wider mb-4">📡 Friends Detected</h3>
                          
                          <div className="space-y-3">
                            {friendLocations.map((friend, i) => (
                              <motion.div 
                                key={friend.name}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.15 }}
                                className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                              >
                                <div className="flex items-center space-x-3">
                                  <span className="text-2xl">{friend.avatar}</span>
                                  <div>
                                    <p className="text-white font-semibold text-sm">{friend.name}</p>
                                    <p className="text-slate-400 text-xs">{friend.sector}</p>
                                  </div>
                                </div>
                                <span className="text-xs text-blue-300 font-medium bg-blue-500/20 px-2 py-1 rounded-full">{friend.distance}</span>
                              </motion.div>
                            ))}
                          </div>
                        </div>

                        <button 
                          onClick={() => setArActive(false)}
                          className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
                        >
                          ✕ Close Scanner
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Quick Info Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Restroom Status — Live */}
            <div className="glass-panel p-6">
              <h3 className="text-sm tracking-widest text-slate-400 font-bold mb-4 uppercase flex items-center gap-2">
                🚻 Restroom Status
                {isConnected && <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-full font-normal normal-case">Live</span>}
              </h3>
              <div className="space-y-4">
                {restroomData.map((restroom) => (
                  <div key={restroom.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-200">{restroom.name}</span>
                      <span className={`font-semibold ${getTrafficColor(restroom.traffic)}`}>{restroom.traffic}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <motion.div 
                        animate={{ width: `${restroom.level}%` }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className={`h-1.5 rounded-full ${getTrafficBarColor(restroom.traffic)}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Google Wallet — Functional QR */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              onClick={() => setShowQR(!showQR)}
              className="glass-panel p-6 bg-gradient-to-br from-blue-900/40 to-black/60 relative overflow-hidden group cursor-pointer transition-transform duration-300"
            >
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-all"></div>
              <h3 className="text-sm tracking-widest text-slate-300 font-bold mb-2 uppercase">🎫 Google Wallet</h3>
              
              <AnimatePresence mode="wait">
                {!showQR ? (
                  <motion.p 
                    key="cta"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-2xl font-bold text-white"
                  >
                    Tap for Ticket QR
                  </motion.p>
                ) : (
                  <motion.div 
                    key="qr"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex flex-col items-center py-2"
                  >
                    {/* Generated QR-like pattern */}
                    <div className="bg-white p-3 rounded-xl shadow-lg">
                      <div className="grid grid-cols-7 gap-[2px] w-28 h-28">
                        {Array.from({ length: 49 }).map((_, i) => {
                          const row = Math.floor(i / 7);
                          const col = i % 7;
                          // QR finder patterns in corners + pseudo-random data
                          const isFinderCorner = (row < 2 && col < 2) || (row < 2 && col > 4) || (row > 4 && col < 2);
                          const isData = Math.random() > 0.45;
                          const isFilled = isFinderCorner || isData;
                          return (
                            <div 
                              key={i} 
                              className={`rounded-[1px] ${isFilled ? 'bg-slate-900' : 'bg-white'}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 text-center">
                      Seat: <span className="text-white font-semibold">Sector 104, Row C, Seat 15</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Tap again to close</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            
            {/* Accessibility Toggle */}
            <AccessibilityToggle 
              enabled={accessibilityMode} 
              onToggle={(state) => {
                setAccessibilityMode(state);
                // Apply high-contrast and large-text when accessibility mode is on
                if (state) {
                  document.documentElement.classList.add('accessibility-mode');
                } else {
                  document.documentElement.classList.remove('accessibility-mode');
                }
              }} 
            />

            {/* Connection Stats */}
            {isConnected && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-4"
              >
                <h3 className="text-xs tracking-widest text-slate-500 font-bold mb-3 uppercase">📊 System Stats</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className="text-xl font-bold text-emerald-400">5s</p>
                    <p className="text-[10px] text-slate-500 uppercase">Update Freq</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-400">{alertHistory.length}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Alerts</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

        </div>
      </div>
    </main>
  );
}
