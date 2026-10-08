const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, '../artifacts/antigravity/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// 1. Yeni Lucide ikonlarını ekleyelim
content = content.replace(
  "Route, Search, ShieldCheck, Trash2, Triangle, X, Video, Radio, Scan, History, Waves, Calculator, Aperture, AlertOctagon,",
  "Route, Search, ShieldCheck, Trash2, Triangle, X, Video, Radio, Scan, History, Waves, Calculator, Aperture, AlertOctagon, MousePointer2, Move, ZoomIn, FolderTree, Database, Settings2, SlidersHorizontal, TerminalSquare,"
);
if (!content.includes('MousePointer2')) {
    // fallback if previous replace didn't perfectly match
    content = content.replace("import {", "import { MousePointer2, Move, ZoomIn, FolderTree, Database, Settings2, SlidersHorizontal, TerminalSquare, ");
}

// 2. Return bloğunu bulup baştan yazalım.
// `return (` kısmı dosyanın ortalarında bir yerdedir.
// Orayı bulmak için:
const returnIndex = content.indexOf('  return (\n    <div className="app-shell">');
if (returnIndex === -1) {
  console.log("Error: could not find return block");
  process.exit(1);
}

const newJSX = `  return (
    <div className="cad-layout">
      {/* 1. MENU BAR (Klasik Windows/CAD Menüsü) */}
      <div className="cad-menu-bar">
        <div className="cad-menu-logo">AntiGravity GIS Pro v2.4</div>
        <div className="cad-menu-items">
          <span>File</span>
          <span>Edit</span>
          <span>View</span>
          <span>Layer</span>
          <span>Analysis (4D, IoT)</span>
          <span>Simulation (Fluid, Cost)</span>
          <span>Geophysics</span>
          <span>Help</span>
        </div>
      </div>

      {/* 2. TOOLBAR (Küçük CAD İkonları) */}
      <div className="cad-toolbar">
        <button title="Select Tool"><MousePointer2 size={14} /></button>
        <button title="Pan Tool"><Move size={14} /></button>
        <button title="Zoom"><ZoomIn size={14} /></button>
        <div className="cad-divider"></div>
        <button title="Add Surface Marker" onClick={() => openNewMarker()}><Crosshair size={14} /></button>
        <button title="Draw Excavation Zone" onClick={startZone}><Triangle size={14} /></button>
        <button title="AR / Camera Sync"><Video size={14} /></button>
        <button title="Drone Lidar Import"><Aperture size={14} /></button>
        <div className="cad-divider"></div>
        <button title="Run Taşkın Simülasyonu"><Waves size={14} color="#1e90ff" /></button>
        <button title="Run BIM Cost Calculation"><Calculator size={14} color="#bd8537" /></button>
      </div>

      {/* 3. MAIN WORKSPACE */}
      <div className="cad-main">
        {/* LEFT SIDEBAR (Project Explorer) */}
        <div className="cad-sidebar-left">
          
          <div className="cad-panel">
            <div className="cad-panel-title"><FolderTree size={12} /> Project Explorer</div>
            <div className="cad-tree">
              <details open><summary>Base Maps</summary>
                <div className="cad-tree-item"><input type="checkbox" checked readOnly/> CARTO Dark Matter (Default)</div>
                <div className="cad-tree-item"><input type="checkbox" readOnly/> Esri Satellite Imagery</div>
                <div className="cad-tree-item"><input type="checkbox" readOnly/> OpenStreetMap Topo</div>
              </details>
              <details open><summary>Underground Utilities (Assets)</summary>
                <div className="cad-tree-item"><input type="checkbox" checked readOnly/> <span style={{color:'#1e90ff'}}>■</span> Water (İSKİ) [{dashboard.data?.assetCount ?? 0}]</div>
                <div className="cad-tree-item"><input type="checkbox" checked readOnly/> <span style={{color:'#ffcc00'}}>■</span> Gas (İGDAŞ)</div>
                <div className="cad-tree-item"><input type="checkbox" checked readOnly/> <span style={{color:'#ff3333'}}>■</span> Power (BEDAŞ)</div>
                <div className="cad-tree-item"><input type="checkbox" checked readOnly/> <span style={{color:'#ff6600'}}>■</span> Fiber Optic</div>
              </details>
              <details open><summary>Surface Markers (Points)</summary>
                <div className="cad-tree-item"><input type="checkbox" checked readOnly/> Valves & Manholes [{markers.length}]</div>
              </details>
              <details><summary>Geophysics & AI</summary>
                <div className="cad-tree-item">4D Fatigue Model</div>
                <div className="cad-tree-item">Sinkhole Anomalies</div>
              </details>
            </div>
          </div>

          <div className="cad-panel cad-properties">
            <div className="cad-panel-title"><SlidersHorizontal size={12} /> Properties</div>
            <div className="cad-prop-grid">
              <div className="cad-prop-row"><span>Coordinate System</span><span>EPSG:4326</span></div>
              <div className="cad-prop-row"><span>Center Lat</span><span>{searchCenter.lat.toFixed(5)}</span></div>
              <div className="cad-prop-row"><span>Center Lon</span><span>{searchCenter.lon.toFixed(5)}</span></div>
              <div className="cad-prop-row"><span>Avg. Confidence</span><span>{dashboard.data ? \`\${Math.round(dashboard.data.averageConfidence * 100)}%\` : 'N/A'}</span></div>
            </div>
          </div>
        </div>

        {/* MAP CANVAS */}
        <div className="cad-canvas">
          <MapContainer center={[MAP.lat, MAP.lon]} zoom={15} minZoom={3} maxZoom={20} zoomControl={false} scrollWheelZoom className="leaflet-map" style={{ height: '100%', background: '#111' }}>
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Dark Matter">
                <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Esri Satellite">
                <TileLayer attribution='&copy; Esri' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="OpenStreetMap">
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              </LayersControl.BaseLayer>
            </LayersControl>
            <MapSizeInvalidator />
            <MapViewport center={searchCenter} zoom={viewZoom} onCenterChange={(coordinate) => {
              setSearchCenter((previous) => Math.abs(previous.lat - coordinate.lat) < 0.00002 && Math.abs(previous.lon - coordinate.lon) < 0.00002 ? previous : coordinate);
              setSearchLat(coordinate.lat.toFixed(6));
              setSearchLon(coordinate.lon.toFixed(6));
            }} onZoomChange={setViewZoom} />
            <MapClickHandler onCoordinateClick={onMapCoordinateClick} />
            <ScaleControl position="bottomright" imperial={false} />
            {visibleAssets.map((asset) => <Polyline key={asset.id} positions={[[asset.start.lat, asset.start.lon] as [number, number], [asset.end.lat, asset.end.lon] as [number, number]]} pathOptions={{ color: UTILITY_COLORS[asset.utilityType] ?? '#c74739', weight: 3, opacity: 0.9, dashArray: '8 7', lineCap: 'round' }} />)}
            {zones.map((zone) => <Polygon key={zone.id} positions={zone.polygon.map((point) => [point.lat, point.lon] as [number, number])} pathOptions={{ color: zone.id === selectedZone ? '#a66a25' : '#bd8537', weight: 1, dashArray: '7 5', fillColor: '#d4a04a', fillOpacity: zone.id === selectedZone ? 0.3 : 0.15 }} />)}
            {zonePoints.length >= 3
              ? <Polygon positions={zonePoints.map((point) => [point.lat, point.lon] as [number, number])} pathOptions={{ color: '#bd8537', weight: 1, dashArray: '5 4', fillColor: '#d4a04a', fillOpacity: 0.2 }} />
              : zonePoints.length >= 2 && <Polyline positions={zonePoints.map((point) => [point.lat, point.lon] as [number, number])} pathOptions={{ color: '#bd8537', weight: 1, dashArray: '5 4' }} />}
            {zonePoints.map((point, index) => <CircleMarker key={\`draft-\${index}\`} center={[point.lat, point.lon]} radius={4} pathOptions={{ color: '#fff', weight: 1, fillColor: '#c68d3e', fillOpacity: 1 }} />)}
            {markers.map((marker) => {
              return <Marker key={marker.id} position={[marker.lat, marker.lon]} icon={markerIcon(marker.type, marker.name, selectedMarker === marker.id, marker.utilityType)} eventHandlers={{ click: () => setSelectedMarker(marker.id) }} title={\`\${marker.name} · \${enumLabel(marker.utilityType)}\`} bubblingMouseEvents={false} />;
            })}
          </MapContainer>
        </div>

        {/* RIGHT SIDEBAR (Analysis / Active Panel Content) - Sadece ihtiyaç olunca açılır (gizli tutalım ki sade olsun) */}
      </div>

      {/* 4. BOTTOM PANEL (Console & Data Table) */}
      <div className="cad-bottom-panel">
        <div className="cad-tabs">
          <span className="cad-tab active"><Database size={12} /> Data Table (Surface Markers)</span>
          <span className="cad-tab"><TerminalSquare size={12} /> Output Console</span>
          <span className="cad-tab"><AlertOctagon size={12} /> Clash & Risk Report</span>
        </div>
        <div className="cad-table-container">
          {markers.length ? (
            <table className="cad-table">
              <thead><tr><th>ID</th><th>Name</th><th>Utility Type</th><th>Marker Type</th><th>Latitude</th><th>Longitude</th><th>Confidence</th></tr></thead>
              <tbody>
                {markers.map(m => (
                  <tr key={m.id} style={{ background: selectedMarker === m.id ? '#2a4454' : 'transparent' }} onClick={() => setSelectedMarker(m.id)}>
                    <td style={{fontFamily: 'monospace'}}>{m.id.substring(0,8)}</td>
                    <td>{m.name}</td>
                    <td style={{color: UTILITY_COLORS[m.utilityType]}}>{m.utilityType}</td>
                    <td>{m.type}</td>
                    <td style={{fontFamily: 'monospace'}}>{m.lat.toFixed(6)}</td>
                    <td style={{fontFamily: 'monospace'}}>{m.lon.toFixed(6)}</td>
                    <td>{(m.confidence * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{padding: 20, color: '#888', fontStyle: 'italic'}}>No surface markers found in current workspace.</div>
          )}
        </div>
      </div>

      {/* 5. STATUS BAR */}
      <div className="cad-status-bar">
        <span>Ready.</span>
        <span>Lat: {searchLat} / Lon: {searchLon}</span>
        <span>Radius Filter: {searchRadius}m</span>
        <span>Zoom: {viewZoom}</span>
        <span>Snapping: OFF</span>
        <span>Orthomosaic: N/A</span>
      </div>

      {/* Modals from previous code */}
      {markerDialog && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setMarkerDialog(null); }}><div className="modal cad-modal">
        <div className="modal-top"><div><div className="modal-title">{markerDialog === 'new' ? 'Add Surface Marker' : 'Edit Surface Marker'}</div></div><button className="icon-btn" onClick={() => setMarkerDialog(null)}><X size={17} /></button></div>
        <div className="modal-content" style={{padding: '16px'}}>
          <div className="field-block"><label className="field-label">Name</label><input className="field" value={markerForm.name} onChange={(e) => setMarkerForm({ ...markerForm, name: e.target.value })} /></div>
          <div className="field-grid">
            <div className="field-block"><label className="field-label">Marker Type</label><select className="select" value={markerForm.type} onChange={(e) => setMarkerForm({ ...markerForm, type: e.target.value as any })}>{MARKER_OPTIONS.map((o) => <option value={o} key={o}>{o}</option>)}</select></div>
            <div className="field-block"><label className="field-label">Utility Type</label><select className="select" value={markerForm.utilityType} onChange={(e) => setMarkerForm({ ...markerForm, utilityType: e.target.value as any })}>{UTILITY_OPTIONS.map((o) => <option value={o} key={o}>{o}</option>)}</select></div>
          </div>
          <div className="field-grid">
            <div className="field-block"><label className="field-label">Latitude</label><input className="field mono" type="number" step="any" value={markerForm.lat} onChange={(e) => setMarkerForm({ ...markerForm, lat: Number(e.target.value) })} /></div>
            <div className="field-block"><label className="field-label">Longitude</label><input className="field mono" type="number" step="any" value={markerForm.lon} onChange={(e) => setMarkerForm({ ...markerForm, lon: Number(e.target.value) })} /></div>
          </div>
          <div className="field-block"><label className="field-label">Confidence: {Math.round(markerForm.confidence * 100)}%</label><input className="field" type="range" min="0" max="1" step=".05" value={markerForm.confidence} onChange={(e) => setMarkerForm({ ...markerForm, confidence: Number(e.target.value) })} /></div>
        </div>
        <div className="modal-actions" style={{padding: '12px 16px', borderTop: '1px solid #444'}}><button className="btn" onClick={() => setMarkerDialog(null)}>Cancel</button><button className="btn btn-primary" onClick={saveMarker}>Save Data</button></div>
      </div></div>}
      
      {zoneDialog && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setZoneDialog(false); }}><div className="modal cad-modal">
        <div className="modal-top"><div><div className="modal-title">Save Excavation Zone</div></div><button className="icon-btn" onClick={() => setZoneDialog(false)}><X size={17} /></button></div>
        <div className="modal-content" style={{padding: '16px'}}><div className="field-block"><label className="field-label">Zone Name</label><input className="field" value={zoneName} onChange={(e) => setZoneName(e.target.value)} /></div><div className="hint">{zonePoints.length} vertices captured.</div></div>
        <div className="modal-actions"><button className="btn" onClick={() => setZoneDialog(false)}>Cancel</button><button className="btn btn-primary" onClick={saveZone} disabled={!zoneName.trim() || zonePoints.length < 3}>Save Zone</button></div>
      </div></div>}
      {toast && <div className="toast-msg" role="status" style={{background: '#333', color: '#0f0'}}>{toast}</div>}
    </div>
  );`;

const newContent = content.substring(0, returnIndex) + newJSX + "\n}\n" + content.substring(content.indexOf("function emptyMarker"));

fs.writeFileSync(appTsxPath, newContent);

// 3. CSS dosyasını CAD (Dark/Industrial) moduna dönüştürelim
const cssPath = path.join(__dirname, '../artifacts/antigravity/src/index.css');
const engineeringCSS = `
/* HARDCORE ENGINEERING CAD UI */
body { margin: 0; padding: 0; overflow: hidden; background: #1e1e1e !important; color: #d4d4d4 !important; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important; }
.cad-layout { display: flex; flex-direction: column; height: 100vh; width: 100vw; background: #252526; }

/* Menu Bar */
.cad-menu-bar { display: flex; align-items: center; height: 26px; background: #3c3c3c; font-size: 12px; padding: 0 10px; border-bottom: 1px solid #111; user-select: none; }
.cad-menu-logo { font-weight: bold; color: #fff; margin-right: 20px; letter-spacing: 0.5px; }
.cad-menu-items { display: flex; gap: 14px; color: #ccc; }
.cad-menu-items span:hover { color: #fff; cursor: pointer; }

/* Toolbar */
.cad-toolbar { display: flex; align-items: center; height: 32px; background: #2d2d30; padding: 0 10px; gap: 4px; border-bottom: 1px solid #111; }
.cad-toolbar button { background: transparent; border: 1px solid transparent; color: #c8c8c8; padding: 4px 6px; border-radius: 3px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.cad-toolbar button:hover { background: #3e3e42; border-color: #555; }
.cad-divider { width: 1px; height: 18px; background: #555; margin: 0 4px; }

/* Main Workspace */
.cad-main { display: flex; flex: 1; min-height: 0; }
.cad-sidebar-left { width: 280px; background: #252526; display: flex; flex-direction: column; border-right: 1px solid #111; }
.cad-canvas { flex: 1; background: #000; position: relative; }

/* Sidebar Panels */
.cad-panel { display: flex; flex-direction: column; border-bottom: 1px solid #1e1e1e; }
.cad-panel-title { background: #2d2d30; padding: 6px 10px; font-size: 11px; font-weight: bold; color: #e0e0e0; display: flex; align-items: center; gap: 6px; text-transform: uppercase; border-bottom: 1px solid #111; }
.cad-tree { padding: 10px; font-size: 12px; color: #ccc; overflow-y: auto; }
.cad-tree details { margin-bottom: 6px; }
.cad-tree summary { cursor: pointer; font-weight: bold; margin-bottom: 4px; outline: none; }
.cad-tree-item { padding: 3px 0 3px 12px; display: flex; align-items: center; gap: 6px; }

.cad-properties { flex: 1; overflow-y: auto; }
.cad-prop-grid { font-size: 11px; }
.cad-prop-row { display: flex; border-bottom: 1px solid #333; }
.cad-prop-row span { padding: 4px 8px; }
.cad-prop-row span:first-child { width: 120px; background: #1e1e1e; color: #aaa; border-right: 1px solid #333; }
.cad-prop-row span:last-child { flex: 1; color: #fff; font-family: monospace; }

/* Bottom Panel (Console/Table) */
.cad-bottom-panel { height: 200px; background: #1e1e1e; border-top: 1px solid #111; display: flex; flex-direction: column; }
.cad-tabs { display: flex; background: #2d2d30; border-bottom: 1px solid #111; }
.cad-tab { padding: 6px 16px; font-size: 11px; color: #aaa; cursor: pointer; display: flex; align-items: center; gap: 6px; border-right: 1px solid #111; }
.cad-tab:hover { background: #3e3e42; }
.cad-tab.active { background: #1e1e1e; color: #fff; font-weight: bold; border-top: 2px solid #007acc; }
.cad-table-container { flex: 1; overflow: auto; background: #1e1e1e; }
.cad-table { width: 100%; border-collapse: collapse; font-size: 11px; color: #ccc; text-align: left; }
.cad-table th { background: #2d2d30; padding: 4px 8px; border: 1px solid #333; position: sticky; top: 0; font-weight: normal; }
.cad-table td { padding: 4px 8px; border: 1px solid #333; }
.cad-table tr:hover { background: #2a2d2e !important; }

/* Status Bar */
.cad-status-bar { height: 22px; background: #007acc; color: #fff; display: flex; align-items: center; font-size: 11px; padding: 0 10px; gap: 20px; }

/* Modals Override for Dark CAD theme */
.cad-modal { background: #252526 !important; border: 1px solid #444 !important; color: #ccc !important; box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important; border-radius: 0 !important; }
.cad-modal .modal-top { background: #2d2d30 !important; border-bottom: 1px solid #111 !important; }
.cad-modal .modal-title { color: #fff !important; font-size: 13px !important; }
.cad-modal .field-label { color: #aaa !important; font-size: 11px !important; text-transform: uppercase; }
.cad-modal .field, .cad-modal .select { background: #1e1e1e !important; border: 1px solid #333 !important; color: #fff !important; border-radius: 0 !important; padding: 4px 8px !important; font-size: 12px !important; }
.cad-modal .btn { background: #333 !important; color: #ccc !important; border: 1px solid #555 !important; border-radius: 0 !important; }
.cad-modal .btn:hover { background: #444 !important; }
.cad-modal .btn-primary { background: #007acc !important; color: #fff !important; border-color: #007acc !important; }
.cad-modal .btn-primary:hover { background: #0098ff !important; }

/* Leaflet override */
.leaflet-container { background: #111 !important; }
.leaflet-control-attribution { background: rgba(0,0,0,0.7) !important; color: #888 !important; }
`;
fs.appendFileSync(cssPath, engineeringCSS);

console.log("Hardcore Engineering CAD UI applied successfully.");
