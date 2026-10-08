const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, '../artifacts/antigravity/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// 1. Add new states
const stateInjection = `
  const [activeBottomTab, setActiveBottomTab] = useState<'table' | 'console' | 'clash'>('table');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [activePointerTool, setActivePointerTool] = useState<'select' | 'pan' | 'zoom'>('select');
`;
if (!content.includes('activeBottomTab')) {
    const hooksPattern = "const [activePanel, setActivePanel]";
    const hooksIndex = content.indexOf(hooksPattern);
    content = content.substring(0, hooksIndex) + stateInjection + content.substring(hooksIndex);
}

// 2. Add global click listener to close dropdown menu
// We can use an effect, but simplest is adding onClick to cad-layout to close menu if open.
content = content.replace('<div className="cad-layout">', '<div className="cad-layout" onClick={() => setOpenMenu(null)}>');

// 3. Replace Menu Bar
const menuBarPattern = `<div className="cad-menu-items">
          <span>File</span>
          <span>Edit</span>
          <span>View</span>
          <span>Layer</span>
          <span>Analysis (4D, IoT)</span>
          <span>Simulation (Fluid, Cost)</span>
          <span>Geophysics</span>
          <span>Help</span>
        </div>`;
const newMenuBar = `<div className="cad-menu-items">
          <div className="menu-wrap" style={{position:'relative'}} onClick={(e) => {e.stopPropagation(); setOpenMenu(openMenu === 'file' ? null : 'file')}}>
            <span className={openMenu === 'file' ? 'menu-active' : ''}>File</span>
            {openMenu === 'file' && <div className="cad-dropdown"><div>New Project</div><div>Open Project...</div><div>Save <span className="hotkey">Ctrl+S</span></div><div>Export to DXF</div><div className="divider"></div><div>Exit</div></div>}
          </div>
          <div className="menu-wrap" style={{position:'relative'}} onClick={(e) => {e.stopPropagation(); setOpenMenu(openMenu === 'edit' ? null : 'edit')}}>
            <span className={openMenu === 'edit' ? 'menu-active' : ''}>Edit</span>
            {openMenu === 'edit' && <div className="cad-dropdown"><div>Undo <span className="hotkey">Ctrl+Z</span></div><div>Redo <span className="hotkey">Ctrl+Y</span></div><div className="divider"></div><div>Cut</div><div>Copy</div><div>Paste</div></div>}
          </div>
          <div className="menu-wrap" style={{position:'relative'}} onClick={(e) => {e.stopPropagation(); setOpenMenu(openMenu === 'view' ? null : 'view')}}>
            <span className={openMenu === 'view' ? 'menu-active' : ''}>View</span>
            {openMenu === 'view' && <div className="cad-dropdown"><div>Toggle Project Explorer</div><div>Toggle Console</div><div>Fullscreen Map <span className="hotkey">F11</span></div></div>}
          </div>
          <div className="menu-wrap" style={{position:'relative'}} onClick={(e) => {e.stopPropagation(); setOpenMenu(openMenu === 'layer' ? null : 'layer')}}>
            <span className={openMenu === 'layer' ? 'menu-active' : ''}>Layer</span>
            {openMenu === 'layer' && <div className="cad-dropdown"><div>Add Vector Layer (.shp)</div><div>Add Raster Layer (.tif)</div><div className="divider"></div><div>Layer Properties</div></div>}
          </div>
          <div className="menu-wrap" style={{position:'relative'}} onClick={(e) => {e.stopPropagation(); setOpenMenu(openMenu === 'analysis' ? null : 'analysis')}}>
            <span className={openMenu === 'analysis' ? 'menu-active' : ''}>Analysis (4D, IoT)</span>
            {openMenu === 'analysis' && <div className="cad-dropdown"><div onClick={() => setActivePanel('time_machine')}>4D Digital Twin (Time Machine)</div><div onClick={() => setActivePanel('iot_live')}>IoT Live Tracking</div></div>}
          </div>
          <div className="menu-wrap" style={{position:'relative'}} onClick={(e) => {e.stopPropagation(); setOpenMenu(openMenu === 'sim' ? null : 'sim')}}>
            <span className={openMenu === 'sim' ? 'menu-active' : ''}>Simulation</span>
            {openMenu === 'sim' && <div className="cad-dropdown"><div onClick={() => setActivePanel('fluid_sim')}>Fluid Dynamics (Spill)</div><div onClick={() => setActivePanel('cost_calc')}>BIM Cost Estimator</div></div>}
          </div>
          <div className="menu-wrap" style={{position:'relative'}} onClick={(e) => {e.stopPropagation(); setOpenMenu(openMenu === 'geo' ? null : 'geo')}}>
            <span className={openMenu === 'geo' ? 'menu-active' : ''}>Geophysics</span>
            {openMenu === 'geo' && <div className="cad-dropdown"><div onClick={() => setActivePanel('sinkhole_ai')}>Sinkhole / Void Detection</div><div>GPR Radargram Viewer</div></div>}
          </div>
          <div className="menu-wrap" style={{position:'relative'}} onClick={(e) => {e.stopPropagation(); setOpenMenu(openMenu === 'help' ? null : 'help')}}>
            <span className={openMenu === 'help' ? 'menu-active' : ''}>Help</span>
            {openMenu === 'help' && <div className="cad-dropdown"><div>GeoSuelo.AI Documentation</div><div>Check for Updates</div><div>About</div></div>}
          </div>
        </div>`;
content = content.replace(menuBarPattern, newMenuBar);

// 4. Replace Toolbar select/pan/zoom
const oldToolbarTools = `<button title="Select Tool"><MousePointer2 size={14} /></button>
        <button title="Pan Tool"><Move size={14} /></button>
        <button title="Zoom"><ZoomIn size={14} /></button>`;
const newToolbarTools = `<button className={activePointerTool === 'select' ? 'active-tool' : ''} title="Select Tool" onClick={() => setActivePointerTool('select')}><MousePointer2 size={14} color={activePointerTool === 'select' ? '#007acc' : '#c8c8c8'} /></button>
        <button className={activePointerTool === 'pan' ? 'active-tool' : ''} title="Pan Tool" onClick={() => setActivePointerTool('pan')}><Move size={14} color={activePointerTool === 'pan' ? '#007acc' : '#c8c8c8'}/></button>
        <button className={activePointerTool === 'zoom' ? 'active-tool' : ''} title="Zoom Tool" onClick={() => setActivePointerTool('zoom')}><ZoomIn size={14} color={activePointerTool === 'zoom' ? '#007acc' : '#c8c8c8'}/></button>`;
content = content.replace(oldToolbarTools, newToolbarTools);

// 5. Replace Bottom Panel Tabs and Content
const oldBottomPanelPattern = `<div className="cad-bottom-panel">
        <div className="cad-tabs">
          <span className="cad-tab active"><Database size={12} /> Data Table (Surface Markers)</span>
          <span className="cad-tab"><TerminalSquare size={12} /> Output Console</span>
          <span className="cad-tab"><AlertOctagon size={12} /> Clash & Risk Report</span>
        </div>
        <div className="cad-table-container">`;

const newBottomPanel = `<div className="cad-bottom-panel">
        <div className="cad-tabs">
          <span className={\`cad-tab \${activeBottomTab === 'table' ? 'active' : ''}\`} onClick={() => setActiveBottomTab('table')}><Database size={12} /> Data Table (Surface Markers)</span>
          <span className={\`cad-tab \${activeBottomTab === 'console' ? 'active' : ''}\`} onClick={() => setActiveBottomTab('console')}><TerminalSquare size={12} /> Output Console</span>
          <span className={\`cad-tab \${activeBottomTab === 'clash' ? 'active' : ''}\`} onClick={() => setActiveBottomTab('clash')}><AlertOctagon size={12} /> Clash & Risk Report</span>
        </div>
        <div className="cad-table-container">
          {activeBottomTab === 'console' && (
            <div style={{ padding: '10px', fontFamily: 'monospace', fontSize: '11px', color: '#0f0', background: '#111', height: '100%', overflowY: 'auto' }}>
              <div>[14:52:10] GeoSuelo.AI Backend Connected.</div>
              <div>[14:52:11] Syncing GPR radar datasets... OK (42 ms)</div>
              <div>[14:55:04] Workspace coordinate loaded: EPSG:4326.</div>
              <div style={{ color: '#0ff' }}>[14:59:12] Map layer changed to Apple Maps (Carto Voyager).</div>
              <div style={{ color: '#ffcc00' }}>[15:10:33] WARNING: Missing calibration for Drone Lidar node #814.</div>
              <div>[15:21:40] Ready for commands.</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}><span style={{color: '#aaa'}}>&gt;</span><input type="text" style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', width: '100%', fontFamily: 'monospace' }} placeholder="Type command..." /></div>
            </div>
          )}
          {activeBottomTab === 'clash' && (
            <div style={{ padding: '16px', background: '#1e1e1e', height: '100%' }}>
              <div style={{ borderLeft: '4px solid #ff3333', padding: '12px', background: '#2d2d30', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#ff3333', fontWeight: 'bold', fontSize: '13px' }}>CRITICAL CLASH: Water Pipe intersects Gas Main</div>
                  <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>Zone 04 (Kadikoy) - Lat: 40.985, Lon: 29.023. Depth delta &lt; 0.2m!</div>
                </div>
                <button className="btn btn-primary" style={{ height: '30px', background: '#ff3333', borderColor: '#ff3333' }}>Isolate Area</button>
              </div>
              <div style={{ borderLeft: '4px solid #ffcc00', padding: '12px', background: '#2d2d30', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#ffcc00', fontWeight: 'bold', fontSize: '13px' }}>WARNING: Excavation near Fiber Optic Line</div>
                  <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>Excavator EX-04 is within 2.5m of TTNET Fiber backbone.</div>
                </div>
                <button className="btn" style={{ height: '30px' }}>Send Alert</button>
              </div>
            </div>
          )}
          {activeBottomTab === 'table' && (
            /* Previous table content below */`;

content = content.replace(oldBottomPanelPattern, newBottomPanel);

// Close the bottom panel conditionally
// Note: We injected a conditional block. We need to make sure the original table is closed correctly.
// Let's replace the end of the table.
const tableEndPattern = `              </tbody>
            </table>
          ) : (
            <div style={{padding: 20, color: '#888', fontStyle: 'italic'}}>No surface markers found in current workspace.</div>
          )}
        </div>`;
const newTableEndPattern = `              </tbody>
            </table>
          ) : (
            <div style={{padding: 20, color: '#888', fontStyle: 'italic'}}>No surface markers found in current workspace.</div>
          )}
          )}
        </div>`;
content = content.replace(tableEndPattern, newTableEndPattern);


fs.writeFileSync(appTsxPath, content);

// Add CSS for dropdown menus
const cssPath = path.join(__dirname, '../artifacts/antigravity/src/index.css');
const dropdownCSS = `
/* Menu Dropdowns */
.menu-active { color: #fff; background: #555; padding: 2px 6px; border-radius: 2px; }
.cad-dropdown { position: absolute; top: 100%; left: 0; background: #252526; border: 1px solid #444; min-width: 180px; box-shadow: 2px 5px 15px rgba(0,0,0,0.5); z-index: 9999; display: flex; flex-direction: column; padding: 4px 0; }
.cad-dropdown div { padding: 6px 14px; color: #ccc; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
.cad-dropdown div:hover { background: #007acc; color: #fff; }
.cad-dropdown .divider { height: 1px; background: #444; margin: 4px 0; padding: 0; }
.cad-dropdown .hotkey { color: #888; font-size: 10px; }
.cad-dropdown div:hover .hotkey { color: #ddd; }
`;
fs.appendFileSync(cssPath, dropdownCSS);

console.log("Made all CAD buttons, menus and tabs interactive!");
