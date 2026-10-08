import Draggable from 'react-draggable';
import { type ReactNode, useEffect, useMemo, useState, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  useHealthCheck, useGetDashboard, useGetMarkers, useCreateMarker, useUpdateMarker,
  useDeleteMarker, useGetAssets, usePredictRoute, useGetZones, useCreateZone, useAnalyzeZone,
  getGetDashboardQueryKey, getGetMarkersQueryKey, getGetAssetsQueryKey, getGetZonesQueryKey,
} from '@workspace/api-client-react';
import type { Coordinate, SurfaceMarker, SurfaceMarkerInput, UndergroundAsset } from '@workspace/api-client-react';
import {
  Activity, AlertTriangle, ArrowDownUp, Cable, Check, ChevronDown, CircleHelp,
  Crosshair, Edit3, Gauge, Layers3, MapPin, Minus, Plus, RefreshCw,
  Route, Search, ShieldCheck, Trash2, Triangle, X, Video, Radio, Scan, History, Waves, Calculator, Aperture, AlertOctagon, MousePointer2, Move, ZoomIn, FolderTree, Database, Settings2, SlidersHorizontal, TerminalSquare, Eye,
} from 'lucide-react';
import L from 'leaflet';
import { CircleMarker, LayersControl, MapContainer, Marker, Polygon, Polyline, Popup, ScaleControl, TileLayer, useMap, useMapEvents, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { StreetView360 } from '@/components/StreetView360';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route as WouterRoute, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const MAP = { lat: 40.99, lon: 29.03 };
const UTILITY_OPTIONS = ['water', 'gas', 'fiber', 'electric', 'sewer'] as const;
const MARKER_OPTIONS = ['manhole', 'valve', 'transformer', 'hydrant'] as const;
type UtilityType = typeof UTILITY_OPTIONS[number];

const UTILITY_COLORS: Record<UtilityType, string> = {
  water: '#1e90ff',
  gas: '#ffcc00',
  electric: '#ff3333',
  fiber: '#ff6600',
  sewer: '#33cc33'
};
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <RoutedErrorBoundary>
            <Switch>
              <WouterRoute path="/" component={Workspace} />
              <WouterRoute component={NotFound} />
            </Switch>
          </RoutedErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Workspace() {
  const client = useQueryClient();
  const health = useHealthCheck();
  const dashboard = useGetDashboard();
  const markersQuery = useGetMarkers();
  const zonesQuery = useGetZones();
  const [searchCenter, setSearchCenter] = useState<Coordinate>(MAP);
  const [searchRadius, setSearchRadius] = useState(1200);
  const assetsQuery = useGetAssets({ lat: searchCenter.lat, lon: searchCenter.lon, radius: searchRadius });
  const createMarker = useCreateMarker();
  const updateMarker = useUpdateMarker();
  const deleteMarker = useDeleteMarker();
  const predictRoute = usePredictRoute();
  const createZone = useCreateZone();
  const analyzeZone = useAnalyzeZone();
  const markers = Array.isArray(markersQuery.data) ? markersQuery.data : [];
  const assets = Array.isArray(assetsQuery.data) ? assetsQuery.data : [];
  const zones = Array.isArray(zonesQuery.data) ? zonesQuery.data : [];
  const [selectedMarker, setSelectedMarker] = useState<string>('');
  const [routeFrom, setRouteFrom] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [predictedAsset, setPredictedAsset] = useState<UndergroundAsset | null>(null);
  const [searchLat, setSearchLat] = useState(String(MAP.lat));
  const [searchLon, setSearchLon] = useState(String(MAP.lon));
  const [radiusInput, setRadiusInput] = useState('1200');
  const [markerDialog, setMarkerDialog] = useState<'new' | SurfaceMarker | null>(null);
  const [markerForm, setMarkerForm] = useState<SurfaceMarkerInput>(emptyMarker(MAP));
  const [markerError, setMarkerError] = useState('');
  const [zoneDrawing, setZoneDrawing] = useState(false);
  const [zonePoints, setZonePoints] = useState<Coordinate[]>([]);
  const [zoneDialog, setZoneDialog] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [analysis, setAnalysis] = useState<NonNullable<typeof analyzeZone.data> | null>(null);
  const [competitorExpanded, setCompetitorExpanded] = useState(false);
  
  const [activeBottomTab, setActiveBottomTab] = useState<'table' | 'console' | 'clash'>('table');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [activePointerTool, setActivePointerTool] = useState<'select' | 'pan' | 'zoom' | 'start-wp' | 'end-wp'>('select');
  const [streetViewMode, setStreetViewMode] = useState<'split' | 'fullscreen' | 'map'>('split');

  const arRef = useRef<HTMLDivElement>(null);
  const lidarRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const sinkholeRef = useRef<HTMLDivElement>(null);
  const fluidRef = useRef<HTMLDivElement>(null);
  const costRef = useRef<HTMLDivElement>(null);

  const [waypointUtility, setWaypointUtility] = useState<UtilityType>('water');
  const [deletedAssetIds, setDeletedAssetIds] = useState<string[]>([]);
const [activePanels, setActivePanels] = useState<string[]>([]);
  const togglePanel = (id: string) => setActivePanels(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (activePanels.includes('ar_camera')) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
        .catch(err => console.error("Kamera açılamadı:", err));
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    }
  }, [activePanels]);

  const [toast, setToast] = useState('');
  const [viewZoom, setViewZoom] = useState(15);

  
  const invalidate = (includeAssets = false) => {
    void client.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
    void client.invalidateQueries({ queryKey: getGetMarkersQueryKey() });
    void client.invalidateQueries({ queryKey: getGetZonesQueryKey() });
    if (includeAssets) void client.invalidateQueries({ queryKey: getGetAssetsQueryKey() });
  };
  const announce = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };
  const compatibleMarkers = useMemo(() => {
    const origin = markers.find((m) => m.id === routeFrom);
    return origin ? markers.filter((m) => m.id !== origin.id && m.utilityType === origin.utilityType) : markers;
  }, [markers, routeFrom]);
  const visibleAssets = useMemo(() => {
    const merged = predictedAsset && !assets.some((asset) => asset.id === predictedAsset.id) ? [...assets, predictedAsset] : assets; return merged.filter(a => !deletedAssetIds.includes(a.id));
  }, [assets, predictedAsset, deletedAssetIds]);

  
const [clashWarning, setClashWarning] = useState<string | null>(null);

  // Ray-casting algorithm for point in polygon
  const isPointInPolygon = (point: Coordinate, vs: Coordinate[]) => {
    let x = point.lon, y = point.lat;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].lon, yi = vs[i].lat;
        let xj = vs[j].lon, yj = vs[j].lat;
        let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
  };

  const checkClash = () => {
    if (zonePoints.length < 3) return;
    for (const asset of visibleAssets) {
      // Check start point, end point, and midpoint
      const mid = { lat: (asset.start.lat + asset.end.lat)/2, lon: (asset.start.lon + asset.end.lon)/2 };
      if (isPointInPolygon(asset.start, zonePoints) || isPointInPolygon(asset.end, zonePoints) || isPointInPolygon(mid, zonePoints)) {
        let name = asset.utilityType === 'water' ? 'Su Borusu' : asset.utilityType === 'gas' ? 'Doğalgaz Borusu' : asset.utilityType === 'fiber' ? 'Fiber Kablo' : 'Altyapı Hattı';
        setClashWarning(`DİKKAT! Çizdiğiniz kazı alanı içerisinde ${name} tespit edildi! Olası Çarpışma Riski!`);
        setActiveBottomTab('clash'); // Also switch tab
        return;
      }
    }
    setClashWarning("Kazı alanı temiz. Tespit edilen hat yok.");
  };

  useEffect(() => {
    if (zonePoints.length >= 3) {
      checkClash();
    } else {
      setClashWarning(null);
    }
  }, [zonePoints, visibleAssets]);


const openNewMarker = (center: Coordinate = searchCenter) => {
    setMarkerForm(emptyMarker(center));
    setMarkerError('');
    setMarkerDialog('new');
  };
  const openEditMarker = (marker: SurfaceMarker) => {
    setMarkerForm({
      name: marker.name, lat: marker.lat, lon: marker.lon, type: marker.type,
      utilityType: marker.utilityType, confidence: marker.confidence,
    });
    setMarkerError('');
    setMarkerDialog(marker);
  };
  const saveMarker = () => {
    if (!markerForm.name.trim()) { setMarkerError('Bu yüzey işareti için bir ad girin.'); return; }
    const editing = markerDialog && markerDialog !== 'new' ? markerDialog : null;
    const finish = () => {
      invalidate(true);
      setMarkerDialog(null);
      announce(editing ? 'Yüzey işareti güncellendi' : 'Yüzey işareti kaydedildi');
    };
    if (editing) {
      updateMarker.mutate({ id: editing.id, data: markerForm }, { onSuccess: finish, onError: (e) => setMarkerError(errorMessage(e)) });
    } else {
      createMarker.mutate({ data: markerForm }, { onSuccess: finish, onError: (e) => setMarkerError(errorMessage(e)) });
    }
  };
  const deleteWaypoint = (marker: SurfaceMarker) => {
    const touches = (p: Coordinate) => Math.abs(p.lat - marker.lat) < 1e-7 && Math.abs(p.lon - marker.lon) < 1e-7;
    deleteMarker.mutate({ id: marker.id }, {
      onSuccess: () => {
        const attached = visibleAssets.filter((a) => a.dataSource === 'ai_prediction' && (touches(a.start) || touches(a.end))).map((a) => a.id);
        if (attached.length) setDeletedAssetIds((prev) => [...prev, ...attached]);
        if (predictedAsset && attached.includes(predictedAsset.id)) setPredictedAsset(null);
        if (routeFrom === marker.id) { setRouteFrom(''); setRouteTo(''); }
        if (routeTo === marker.id) setRouteTo('');
        if (selectedMarker === marker.id) setSelectedMarker('');
        invalidate(true);
        announce(`"${marker.name}" silindi`);
      },
      onError: (e) => announce(`Waypoint silinemedi: ${errorMessage(e)}`),
    });
  };
  const removeMarker = (marker: SurfaceMarker) => {
    if (!window.confirm(`“${marker.name}” silinsin mi? Bu işlem geri alınamaz.`)) return;
    deleteMarker.mutate({ id: marker.id }, {
      onSuccess: () => { invalidate(true); if (selectedMarker === marker.id) setSelectedMarker(''); announce('Yüzey işareti silindi'); },
      onError: (e) => announce(`İşaret silinemedi: ${errorMessage(e)}`),
    });
  };
  const runPrediction = () => {
    if (!routeFrom || !routeTo || routeFrom === routeTo) return;
    predictRoute.mutate({ data: { markerAId: routeFrom, markerBId: routeTo } }, {
      onSuccess: (asset) => {
        setPredictedAsset(asset);
        invalidate(true);
        announce('Güzergâh tahmini oluşturuldu');
      },
    });
  };
  const startZone = () => { setZonePoints([]); setZoneDrawing(true); setAnalysis(null); };
  const clearPredictions = async () => {
    const aiIds = visibleAssets.filter((a) => a.dataSource === 'ai_prediction').map((a) => a.id);
    if (!aiIds.length) { announce('Silinecek tahmini çizim yok'); return; }
    setDeletedAssetIds((prev) => [...prev, ...aiIds]);
    setPredictedAsset(null);
    setRouteFrom('');
    setRouteTo('');
    try {
      const res = await fetch('/api/v1/predictions', { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error(String(res.status));
      invalidate(true);
      announce(`${aiIds.length} tahmini çizim silindi`);
    } catch {
      announce('Çizimler ekrandan kaldırıldı, sunucudan silinemedi');
    }
  };
  const onMapCoordinateClick = (coordinate: Coordinate) => {
    if (activePointerTool === 'start-wp' || activePointerTool === 'end-wp') {
      const isStart = activePointerTool === 'start-wp';
      const name = isStart ? `Başlangıç Vana ${Math.floor(Math.random() * 100)}` : `Bitiş Vana ${Math.floor(Math.random() * 100)}`;
      createMarker.mutate({
        data: { name, lat: coordinate.lat, lon: coordinate.lon, type: 'valve', utilityType: waypointUtility, confidence: 0.9 }
      }, {
        onSuccess: (res) => {
           invalidate(true);
           if (isStart) setRouteFrom(res.id);
           if (!isStart) setRouteTo(res.id);
           setActivePointerTool('select');
           announce(name + ' eklendi');
        }
      });
      return;
    }
    if (zoneDrawing) {
      setZonePoints((previous) => [...previous, coordinate]);
      return;
    }
    openNewMarker(coordinate);
  };

  const handleStreetWaypoint = (coordinate: Coordinate, isStart: boolean, utilityType: string) => {
    const name = isStart ? `Sokak Başlangıç Vana ${Math.floor(Math.random() * 100)}` : `Sokak Bitiş Vana ${Math.floor(Math.random() * 100)}`;
    createMarker.mutate({
      data: {
        name,
        lat: coordinate.lat,
        lon: coordinate.lon,
        type: 'valve',
        utilityType: (utilityType as UtilityType) || waypointUtility,
        confidence: 0.95
      }
    }, {
      onSuccess: (res) => {
        invalidate(true);
        if (isStart) setRouteFrom(res.id);
        if (!isStart) setRouteTo(res.id);
        announce(`${name} sokak zeminine başarıyla eklendi!`);
      }
    });
  };
  const saveZone = () => {
    if (!zoneName.trim() || zonePoints.length < 3) return;
    createZone.mutate({ data: { name: zoneName.trim(), polygon: zonePoints } }, {
      onSuccess: (zone) => {
        void client.invalidateQueries({ queryKey: getGetZonesQueryKey() });
        void client.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        setSelectedZone(zone.id);
        setZoneDialog(false);
        setZoneDrawing(false);
        setZonePoints([]);
        setZoneName('');
        announce('Kazı bölgesi kaydedildi');
      },
    });
  };
  const searchNearby = () => {
    const lat = Number(searchLat); const lon = Number(searchLon); const radius = Number(radiusInput);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(radius) || radius < 1 || radius > 5000) return;
    setSearchCenter({ lat, lon }); setSearchRadius(radius);
  };
  const analyzeSelectedZone = () => {
    if (!selectedZone) return;
    analyzeZone.mutate({ id: selectedZone }, { onSuccess: setAnalysis });
  };

  return (
    <div className="cad-layout" onClick={() => setOpenMenu(null)}>
      {/* 1. MENU BAR (Klasik Windows/CAD Menüsü) */}
      <div className="cad-menu-bar">
        <div className="cad-menu-logo">GeoSuelo.AI</div>
        <div className="cad-menu-items">
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
            {openMenu === 'analysis' && <div className="cad-dropdown"><div onClick={() => togglePanel('time_machine')}>4D Digital Twin (Time Machine)</div><div onClick={() => togglePanel('iot_live')}>IoT Live Tracking</div></div>}
          </div>
          <div className="menu-wrap" style={{position:'relative'}} onClick={(e) => {e.stopPropagation(); setOpenMenu(openMenu === 'sim' ? null : 'sim')}}>
            <span className={openMenu === 'sim' ? 'menu-active' : ''}>Simulation</span>
            {openMenu === 'sim' && <div className="cad-dropdown"><div onClick={() => togglePanel('fluid_sim')}>Fluid Dynamics (Spill)</div><div onClick={() => togglePanel('cost_calc')}>BIM Cost Estimator</div></div>}
          </div>
          <div className="menu-wrap" style={{position:'relative'}} onClick={(e) => {e.stopPropagation(); setOpenMenu(openMenu === 'geo' ? null : 'geo')}}>
            <span className={openMenu === 'geo' ? 'menu-active' : ''}>Geophysics</span>
            {openMenu === 'geo' && <div className="cad-dropdown"><div onClick={() => togglePanel('sinkhole_ai')}>Sinkhole / Void Detection</div><div>GPR Radargram Viewer</div></div>}
          </div>
          <div className="menu-wrap" style={{position:'relative'}} onClick={(e) => {e.stopPropagation(); setOpenMenu(openMenu === 'help' ? null : 'help')}}>
            <span className={openMenu === 'help' ? 'menu-active' : ''}>Help</span>
            {openMenu === 'help' && <div className="cad-dropdown"><div>GeoSuelo.AI Documentation</div><div>Check for Updates</div><div>About</div></div>}
          </div>
        </div>
      </div>

      {/* 2. TOOLBAR (Küçük CAD İkonları) */}
      <div className="cad-toolbar">
        <button className={activePointerTool === 'select' ? 'active-tool' : ''} title="Select Tool" onClick={() => setActivePointerTool('select')}><MousePointer2 size={14} color={activePointerTool === 'select' ? '#007acc' : '#c8c8c8'} /></button>
        <button className={activePointerTool === 'pan' ? 'active-tool' : ''} title="Pan Tool" onClick={() => setActivePointerTool('pan')}><Move size={14} color={activePointerTool === 'pan' ? '#007acc' : '#c8c8c8'}/></button>
        <button className={activePointerTool === 'zoom' ? 'active-tool' : ''} title="Zoom Tool" onClick={() => setActivePointerTool('zoom')}><ZoomIn size={14} color={activePointerTool === 'zoom' ? '#007acc' : '#c8c8c8'}/></button>
        <div className="cad-divider"></div>
        <button title="Add Surface Marker" onClick={() => openNewMarker()}><Crosshair size={14} /></button>
        <button title="Kazı Alanı Çiz (Serbest Çokgen)" onClick={startZone}><Scan size={14} /></button>
        <button title="Kazı Alanını Temizle" onClick={() => setZonePoints([])}><Trash2 size={14} color="#ff3333" /></button>
        <button className={activePanels.includes('ar_camera') ? 'active-tool' : ''} title="AR / Camera Sync" onClick={() => togglePanel('ar_camera')}><Video size={14} color={activePanels.includes('ar_camera') ? '#0f0' : undefined} /></button>
        <button className={activePanels.includes('drone_lidar') ? 'active-tool' : ''} title="Drone Lidar Import" onClick={() => togglePanel('drone_lidar')}><Aperture size={14} color={activePanels.includes('drone_lidar') ? '#0ff' : undefined} /></button>
        <div className="cad-divider"></div>
        <button className={activePanels.includes('time_machine') ? 'active-tool' : ''} title="4D Digital Twin" onClick={() => togglePanel('time_machine')}><History size={14} color="#fff" /></button>
        <button className={activePanels.includes('sinkhole_ai') ? 'active-tool' : ''} title="Sinkhole AI (Geophysics)" onClick={() => togglePanel('sinkhole_ai')}><AlertOctagon size={14} color="#ff3333" /></button>
        <button className={activePanels.includes('fluid_sim') ? 'active-tool' : ''} title="Run Taşkın Simülasyonu" onClick={() => togglePanel('fluid_sim')}><Waves size={14} color="#1e90ff" /></button>
        <button className={activePanels.includes('cost_calc') ? 'active-tool' : ''} title="Run BIM Cost Calculation" onClick={() => togglePanel('cost_calc')}><Calculator size={14} color="#bd8537" /></button>
        <div className="cad-divider"></div>
        <button
          className={streetViewMode !== 'map' ? 'active-tool' : ''}
          style={{
            background: streetViewMode !== 'map' ? '#007acc' : '#222',
            borderColor: streetViewMode !== 'map' ? '#0098ff' : '#444',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            padding: '2px 8px'
          }}
          title="360° Sokak Görünümü (Zeminden Waypoint At)"
          onClick={() => setStreetViewMode(streetViewMode === 'map' ? 'split' : 'map')}
        >
          <Eye size={13} color="#00e5ff" /> <strong>360° Sokak</strong>
        </button>
        <button
          style={{
            background: streetViewMode === 'split' ? '#0284c7' : '#1e1e1e',
            color: '#fff',
            fontSize: 10,
            padding: '2px 6px',
            border: '1px solid #444'
          }}
          title="Bölünmüş Ekran (360 + Harita)"
          onClick={() => setStreetViewMode('split')}
        >
          Bölünmüş
        </button>
        <button
          style={{
            background: streetViewMode === 'fullscreen' ? '#0284c7' : '#1e1e1e',
            color: '#fff',
            fontSize: 10,
            padding: '2px 6px',
            border: '1px solid #444'
          }}
          title="Tam Ekran 360° Sokak"
          onClick={() => setStreetViewMode('fullscreen')}
        >
          Tam 360°
        </button>
        <button
          style={{
            background: streetViewMode === 'map' ? '#0284c7' : '#1e1e1e',
            color: '#fff',
            fontSize: 10,
            padding: '2px 6px',
            border: '1px solid #444'
          }}
          title="Sadece Kuşbakışı Harita"
          onClick={() => setStreetViewMode('map')}
        >
          Harita
        </button>
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
              <div className="cad-prop-row"><span>Avg. Confidence</span><span>{dashboard.data ? `${Math.round(dashboard.data.averageConfidence * 100)}%` : 'N/A'}</span></div>
            </div>
          </div>

          <div className="cad-panel cad-properties" style={{ marginTop: '8px' }}>
            <div className="cad-panel-title"><Route size={12} /> Waypoint Ekle & Tahmin Et</div>
            <div style={{ padding: '8px' }}>
              <div style={{ marginBottom: '10px' }}>
                 <label style={{ fontSize: '10px', color: '#ccc', marginRight: '8px' }}>Hattın Türü:</label>
                 <select value={waypointUtility} onChange={(e) => setWaypointUtility(e.target.value as UtilityType)} style={{ background: '#111', color: '#fff', border: '1px solid #444', padding: '4px', fontSize: '11px', borderRadius: '4px', width: '100px' }}>
                    <option value="water">💧 Su</option>
                    <option value="gas">🔥 Doğalgaz</option>
                    <option value="electric">⚡ Elektrik</option>
                    <option value="fiber">🌐 Fiber</option>
                 </select>
              </div>
              <button
                className="btn"
                style={{
                  width: '100%',
                  height: '24px',
                  fontSize: '10px',
                  marginBottom: '8px',
                  background: streetViewMode !== 'map' ? '#0891b2' : '#1e293b',
                  color: '#fff',
                  borderColor: '#06b6d4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5
                }}
                onClick={() => setStreetViewMode(streetViewMode === 'split' ? 'map' : 'split')}
              >
                <Eye size={12} color="#00e5ff" />
                {streetViewMode !== 'map' ? 'Harita Moduna Dön' : '360° Sokak Görünümünden Ekle'}
              </button>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                <button 
                  className={`btn ${activePointerTool === 'start-wp' ? 'btn-primary' : ''}`}
                  style={{ flex: 1, height: '24px', fontSize: '10px', background: activePointerTool === 'start-wp' ? '#007acc' : '#333' }}
                  onClick={() => setActivePointerTool('start-wp')}
                  title="Haritaya tıklayarak başlangıç atın"
                >
                  📍 Başlangıç At
                </button>
                <button 
                  className={`btn ${activePointerTool === 'end-wp' ? 'btn-primary' : ''}`}
                  style={{ flex: 1, height: '24px', fontSize: '10px', background: activePointerTool === 'end-wp' ? '#007acc' : '#333' }}
                  onClick={() => setActivePointerTool('end-wp')}
                  title="Haritaya tıklayarak bitiş atın"
                >
                  🏁 Bitiş At
                </button>
              </div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', alignItems: 'center' }}>
                <select className="select cad-select" value={routeFrom} onChange={(e) => { setRouteFrom(e.target.value); setRouteTo(''); }} style={{ width: '50%', fontSize: '10px', height: '22px', background: '#252526', color: '#c8c8c8', border: '1px solid #444' }}>
                  <option value="">Başlangıç...</option>
                  {markers.map(m => <option value={m.id} key={m.id}>{m.name}</option>)}
                </select>
                <select className="select cad-select" value={routeTo} onChange={(e) => setRouteTo(e.target.value)} style={{ width: '50%', fontSize: '10px', height: '22px', background: '#252526', color: '#c8c8c8', border: '1px solid #444' }}>
                  <option value="">Bitiş...</option>
                  {compatibleMarkers.map(m => <option value={m.id} key={m.id}>{m.name}</option>)}
                </select>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', height: '24px', fontSize: '10px' }} onClick={runPrediction} disabled={!routeFrom || !routeTo || routeFrom === routeTo}>
                ⚡ Yeraltı Hattını Tahmin Et
              </button>
              <button className="btn" style={{ width: '100%', height: '24px', fontSize: '10px', marginTop: '6px', color: '#ff3333', borderColor: '#ff3333' }} onClick={clearPredictions}>
                <Trash2 size={10} style={{marginRight: 4}}/> Eklenen (AI) Çizimleri Sil
              </button>
</div>
          </div>

          <div className="cad-panel cad-properties" style={{ marginTop: '8px' }}>
            <div className="cad-panel-title"><Triangle size={12} /> Kazı Alanı</div>
            <div style={{ padding: '8px' }}>
              {!zoneDrawing ? (
                <button className="btn btn-primary" style={{ width: '100%', height: '24px', fontSize: '10px', background: '#bd8537', borderColor: '#bd8537' }}
                  onClick={() => { setActivePointerTool('select'); startZone(); }}>
                  ⛏ Kazı Alanı Ekle
                </button>
              ) : (
                <>
                  <div style={{ fontSize: '10px', color: '#ffcc00', marginBottom: '6px' }}>
                    Haritaya tıklayarak köşe ekleyin · {zonePoints.length} nokta{zonePoints.length < 3 ? ' (en az 3)' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-primary" style={{ flex: 1, height: '24px', fontSize: '10px' }} disabled={zonePoints.length < 3}
                      onClick={() => { setZoneName(`Kazı Alanı ${zones.length + 1}`); setZoneDialog(true); }}>
                      ✔ Bitir & Kaydet
                    </button>
                    <button className="btn" style={{ height: '24px', fontSize: '10px', background: '#333' }} disabled={!zonePoints.length}
                      onClick={() => setZonePoints((prev) => prev.slice(0, -1))} title="Son noktayı geri al">
                      ↶
                    </button>
                    <button className="btn" style={{ height: '24px', fontSize: '10px', background: '#333', color: '#ff6666' }}
                      onClick={() => { setZoneDrawing(false); setZonePoints([]); }}>
                      İptal
                    </button>
                  </div>
                </>
              )}
              {zones.length > 0 && (
                <select className="select cad-select" value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)}
                  style={{ width: '100%', marginTop: '8px', fontSize: '10px', height: '22px', background: '#252526', color: '#c8c8c8', border: '1px solid #444' }}>
                  <option value="">Kayıtlı alanlar ({zones.length})</option>
                  {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* WORKSPACE VIEW (360 STREET VIEW & CAD MAP) */}
        <div className="cad-canvas" style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
          {/* 360 STREET VIEW PANE */}
          {(streetViewMode === 'split' || streetViewMode === 'fullscreen') && (
            <div style={{
              flex: streetViewMode === 'split' ? '1 1 50%' : '1 1 100%',
              height: '100%',
              position: 'relative',
              borderRight: streetViewMode === 'split' ? '2px solid #007acc' : 'none',
              overflow: 'hidden'
            }}>
              <StreetView360
                center={searchCenter}
                onCenterChange={(coord) => {
                  setSearchCenter(coord);
                  setSearchLat(coord.lat.toFixed(6));
                  setSearchLon(coord.lon.toFixed(6));
                }}
                markers={markers}
                assets={visibleAssets}
                onAddWaypoint={handleStreetWaypoint}
                activeTool={activePointerTool === 'start-wp' || activePointerTool === 'end-wp' ? activePointerTool : 'select'}
                setActiveTool={setActivePointerTool}
                selectedUtility={waypointUtility}
                isSplit={streetViewMode === 'split'}
                onToggleSplit={() => setStreetViewMode(streetViewMode === 'split' ? 'fullscreen' : 'split')}
                onClose={() => setStreetViewMode('map')}
              />
            </div>
          )}

          {/* 2D MAP PANE */}
          {(streetViewMode === 'split' || streetViewMode === 'map') && (
            <div style={{
              flex: streetViewMode === 'split' ? '1 1 50%' : '1 1 100%',
              height: '100%',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <MapContainer center={[MAP.lat, MAP.lon]} zoom={15} minZoom={3} maxZoom={20} zoomControl={false} scrollWheelZoom className="leaflet-map" style={{ height: '100%', background: '#111' }}>
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="Standart OSM">
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Apple Tarzı (Carto Voyager)">
                    <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png" />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Topoğrafik (Esri Topo)">
                    <TileLayer attribution='&copy; Esri' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}" />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Karanlık Mod (Dark)">
                    <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Uydu (Esri Satellite)">
                    <TileLayer attribution='&copy; Esri' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
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
                {visibleAssets.map((asset) => (
                  <Polyline key={asset.id} positions={[[asset.start.lat, asset.start.lon] as [number, number], [asset.end.lat, asset.end.lon] as [number, number]]} pathOptions={{ color: UTILITY_COLORS[asset.utilityType] ?? '#c74739', weight: 4, opacity: 0.9, dashArray: '8 7', lineCap: 'round' }}>
                    <Tooltip sticky direction="top" opacity={0.9}>
                      <div style={{ background: '#252526', padding: '6px', border: '1px solid #444', borderRadius: '4px', minWidth: '180px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: UTILITY_COLORS[asset.utilityType] ?? '#fff', borderBottom: '1px solid #444', paddingBottom: '4px', marginBottom: '4px' }}>
                          {asset.utilityType === 'water' ? '💧 Ana Su Hattı (İSKİ)' : asset.utilityType === 'gas' ? '🔥 Doğalgaz (İGDAŞ)' : asset.utilityType === 'electric' ? '⚡ Yüksek Gerilim (BEDAŞ)' : asset.utilityType === 'fiber' ? '🌐 Fiber Optik (Telekom)' : asset.utilityType === 'sewer' ? '💩 Kanalizasyon' : 'Yer Altı Hattı'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#ccc', lineHeight: '1.4' }}>
                          <div><strong>Derinlik:</strong> -{(asset.depthMeters ?? 1.4).toFixed(1)}m</div>
                          <div><strong>Malzeme:</strong> {asset.utilityType === 'gas' ? 'Çelik (PE)' : 'HDPE-100'}</div>
                          <div><strong>Risk:</strong> <span style={{color: asset.utilityType === 'gas' ? '#ff3333' : '#ffcc00'}}>Kritik (Kazı Yasak)</span></div>
                        </div>
                      </div>
                    </Tooltip>
                  </Polyline>
                ))}
                {zones.map((zone) => <Polygon key={zone.id} positions={zone.polygon.map((point) => [point.lat, point.lon] as [number, number])} pathOptions={{ color: zone.id === selectedZone ? '#a66a25' : '#bd8537', weight: 1, dashArray: '7 5', fillColor: '#d4a04a', fillOpacity: zone.id === selectedZone ? 0.3 : 0.15 }} />)}
                {zonePoints.length >= 3
                  ? <Polygon positions={zonePoints.map((point) => [point.lat, point.lon] as [number, number])} pathOptions={{ color: '#bd8537', weight: 1, dashArray: '5 4', fillColor: '#d4a04a', fillOpacity: 0.2 }} />
                  : zonePoints.length >= 2 && <Polyline positions={zonePoints.map((point) => [point.lat, point.lon] as [number, number])} pathOptions={{ color: '#bd8537', weight: 1, dashArray: '5 4' }} />}
                {zonePoints.map((point, index) => <CircleMarker key={`draft-${index}`} center={[point.lat, point.lon]} radius={4} pathOptions={{ color: '#fff', weight: 1, fillColor: '#c68d3e', fillOpacity: 1 }} />)}
                {markers.map((marker) => {
                  return (
                    <Marker key={marker.id} position={[marker.lat, marker.lon]} icon={markerIcon(marker.type, marker.name, selectedMarker === marker.id, marker.utilityType)} eventHandlers={{ click: () => setSelectedMarker(marker.id) }} title={`${marker.name} · ${enumLabel(marker.utilityType)}`} bubblingMouseEvents={false}>
                      <Popup closeButton={false} offset={[2, -22]}>
                        <div style={{ minWidth: 150, fontSize: 11 }}>
                          <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{marker.name}</div>
                          <div style={{ color: '#666', marginBottom: 8 }}>{enumLabel(marker.type)} · {enumLabel(marker.utilityType)}</div>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteWaypoint(marker); }}
                            disabled={deleteMarker.isPending}
                            style={{ width: '100%', padding: '4px 8px', background: '#ff3333', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 11, fontWeight: 'bold' }}
                          >
                            🗑 Sil
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR (Analysis / Active Panel Content) - Sadece ihtiyaç olunca açılır (gizli tutalım ki sade olsun) */}
      </div>

      
      
      {clashWarning && (
        <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', background: clashWarning.includes('DİKKAT') ? '#ff3333' : '#28a745', color: '#fff', padding: '12px 24px', borderRadius: '4px', zIndex: 4000, boxShadow: '0 5px 15px rgba(0,0,0,0.5)', fontWeight: 'bold', border: '2px solid #fff' }}>
          {clashWarning.includes('DİKKAT') ? <AlertOctagon size={18} style={{verticalAlign:'middle', marginRight: 8}}/> : <ShieldCheck size={18} style={{verticalAlign:'middle', marginRight: 8}}/>}
          {clashWarning}
          <button style={{ marginLeft: '16px', background: 'transparent', border: '1px solid #fff', color: '#fff', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => setZonePoints([])}>Alanı Sil</button>
        </div>
      )}

      {/* ANALYSIS DIALOGS (CAD Floating Windows) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 3000, pointerEvents: 'none', overflow: 'hidden' }}>
        
        {activePanels.includes('ar_camera') && (
          <Draggable nodeRef={arRef} handle=".handle-ar">
            <div ref={arRef} style={{ position: 'absolute', top: '80px', right: '50px', width: '380px', background: '#252526', border: '1px solid #444', boxShadow: '0 10px 30px rgba(0,0,0,0.7)', pointerEvents: 'auto' }}>
              <div className="handle-ar" style={{ cursor: 'move', background: '#333', padding: '6px 10px', fontSize: '11px', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #111' }}>
                <span><Video size={12} color="#0f0" style={{verticalAlign:'middle', marginRight: 6}}/> AR Camera Sync</span>
                <X size={14} style={{ cursor: 'pointer', color: '#aaa' }} onClick={(e) => { e.stopPropagation(); togglePanel('ar_camera'); }} />
              </div>
              <div style={{ padding: '12px', fontSize: '11px', color: '#ccc' }}>
                <div style={{ marginBottom: '8px', opacity: 0.8 }}>Camera feed connected. GPR overlay calibration ready.</div>
                <div style={{ width: '100%', height: '180px', background: '#000', border: '1px solid #222', position: 'relative', overflow: 'hidden' }}>
                   <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(0,255,100,0.2)', background: 'linear-gradient(180deg, rgba(0,255,100,0.1) 0%, transparent 100%)' }}>
                     <div style={{ position: 'absolute', top: '40%', left: '-20%', width: '150%', height: 4, background: '#1e90ff', transform: 'rotate(15deg)', boxShadow: '0 0 10px #1e90ff' }}></div>
                     <div style={{ position: 'absolute', top: '36%', left: '30%', background: 'rgba(0,0,0,0.8)', color: '#1e90ff', padding: '2px 4px', fontSize: 10 }}>İSKİ SU (-1.4m)</div>
                     <div style={{ position: 'absolute', top: '65%', left: '-20%', width: '150%', height: 3, background: '#ffcc00', transform: 'rotate(-5deg)', boxShadow: '0 0 10px #ffcc00' }}></div>
                     <div style={{ position: 'absolute', top: '62%', left: '40%', background: 'rgba(0,0,0,0.8)', color: '#ffcc00', padding: '2px 4px', fontSize: 10 }}>İGDAŞ GAZ (-1.2m)</div>
                     <div className="ar-scanline"></div>
                   </div>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>Capture Point Cloud</button>
              </div>
            </div>
          </Draggable>
        )}

        {activePanels.includes('drone_lidar') && (
          <Draggable nodeRef={lidarRef} handle=".handle-lidar">
            <div ref={lidarRef} style={{ position: 'absolute', top: '120px', right: '400px', width: '380px', background: '#252526', border: '1px solid #444', boxShadow: '0 10px 30px rgba(0,0,0,0.7)', pointerEvents: 'auto' }}>
              <div className="handle-lidar" style={{ cursor: 'move', background: '#333', padding: '6px 10px', fontSize: '11px', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #111' }}>
                <span><Aperture size={12} color="#0ff" style={{verticalAlign:'middle', marginRight: 6}}/> Lidar / Point Cloud</span>
                <X size={14} style={{ cursor: 'pointer', color: '#aaa' }} onClick={(e) => { e.stopPropagation(); togglePanel('drone_lidar'); }} />
              </div>
              <div style={{ padding: '12px', fontSize: '11px', color: '#ccc' }}>
                <div style={{ border: '1px dashed #555', padding: '16px', textAlign: 'center', background: '#1e1e1e', cursor: 'pointer', marginBottom: '8px' }}>
                  <Aperture size={20} color="#555" style={{margin:'0 auto 6px'}}/>
                  <div>Select .LAS or .OBJ File</div>
                </div>
                <div style={{ background: '#2d2d30', padding: '8px', border: '1px solid #333' }}>
                  <div style={{ color: '#0f0', marginBottom: 4 }}>✔ SANTIYE_A_DRONE.las (450MB)</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>DEM extraction complete. Ground levels calibrated ±2mm.</div>
                </div>
              </div>
            </div>
          </Draggable>
        )}

        {activePanels.includes('time_machine') && (
          <Draggable nodeRef={timeRef} handle=".handle-time">
            <div ref={timeRef} style={{ position: 'absolute', top: '160px', left: '320px', width: '380px', background: '#252526', border: '1px solid #444', boxShadow: '0 10px 30px rgba(0,0,0,0.7)', pointerEvents: 'auto' }}>
              <div className="handle-time" style={{ cursor: 'move', background: '#333', padding: '6px 10px', fontSize: '11px', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #111' }}>
                <span><History size={12} color="#fff" style={{verticalAlign:'middle', marginRight: 6}}/> 4D BIM (Time Machine)</span>
                <X size={14} style={{ cursor: 'pointer', color: '#aaa' }} onClick={(e) => { e.stopPropagation(); togglePanel('time_machine'); }} />
              </div>
              <div style={{ padding: '12px', fontSize: '11px', color: '#ccc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: 10 }}><span>1980</span><span>2000</span><span style={{color: '#ffcc00'}}>2026 (Now)</span><span>2035</span></div>
                <input type="range" min="1980" max="2035" defaultValue="2026" style={{ width: '100%', accentColor: '#007acc' }} />
                <div style={{ marginTop: '12px', borderLeft: '3px solid #ffcc00', padding: '8px 10px', background: '#1e1e1e' }}>
                   <div style={{ color: '#ffcc00', fontWeight: 'bold', marginBottom: 4 }}>Year: 2026</div>
                   <div style={{ lineHeight: 1.4 }}>42% of Asbestos Cement (AC) pipes in this zone reached fatigue limit. 15% burst risk projected within 9 years.</div>
                </div>
              </div>
            </div>
          </Draggable>
        )}

        {activePanels.includes('sinkhole_ai') && (
          <Draggable nodeRef={sinkholeRef} handle=".handle-sinkhole">
            <div ref={sinkholeRef} style={{ position: 'absolute', top: '220px', left: '360px', width: '380px', background: '#252526', border: '1px solid #444', boxShadow: '0 10px 30px rgba(0,0,0,0.7)', pointerEvents: 'auto' }}>
              <div className="handle-sinkhole" style={{ cursor: 'move', background: '#333', padding: '6px 10px', fontSize: '11px', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #111' }}>
                <span><AlertOctagon size={12} color="#ff3333" style={{verticalAlign:'middle', marginRight: 6}}/> Sinkhole Detection</span>
                <X size={14} style={{ cursor: 'pointer', color: '#aaa' }} onClick={(e) => { e.stopPropagation(); togglePanel('sinkhole_ai'); }} />
              </div>
              <div style={{ padding: '12px', fontSize: '11px', color: '#ccc' }}>
                <div style={{ background: '#000', height: '100px', position: 'relative', border: '1px solid #222', overflow: 'hidden', padding: 10, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                   <div className="blink-anim" style={{ position: 'absolute', top: '10px', left: '20px', width: '50px', height: '25px', background: 'radial-gradient(ellipse, rgba(255,51,51,0.6) 0%, transparent 70%)', borderRadius: '50%' }}></div>
                   <div style={{ position: 'absolute', top: '15px', left: '30px', color: '#fff', fontSize: 10, fontWeight: 'bold' }}>74% RISK</div>
                   <div style={{ position: 'absolute', top: '40px', left: '20px', right: '20px', borderTop: '1px dashed #0f0' }}></div>
                   <div style={{ position: 'relative', zIndex: 10 }}>
                     <div style={{ color: '#ff3333', fontWeight: 'bold', marginBottom: 2 }}>Critical Void Detected</div>
                     <div style={{ fontSize: 9, lineHeight: 1.3 }}>1.5m depth, ~20m³ soil loss anomaly. Immediate GPR sweep recommended.</div>
                   </div>
                </div>
              </div>
            </div>
          </Draggable>
        )}

        {activePanels.includes('fluid_sim') && (
          <Draggable nodeRef={fluidRef} handle=".handle-fluid">
            <div ref={fluidRef} style={{ position: 'absolute', top: '300px', right: '200px', width: '380px', background: '#252526', border: '1px solid #444', boxShadow: '0 10px 30px rgba(0,0,0,0.7)', pointerEvents: 'auto' }}>
              <div className="handle-fluid" style={{ cursor: 'move', background: '#333', padding: '6px 10px', fontSize: '11px', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #111' }}>
                <span><Waves size={12} color="#1e90ff" style={{verticalAlign:'middle', marginRight: 6}}/> Fluid Dynamics (Spill)</span>
                <X size={14} style={{ cursor: 'pointer', color: '#aaa' }} onClick={(e) => { e.stopPropagation(); togglePanel('fluid_sim'); }} />
              </div>
              <div style={{ padding: '12px', fontSize: '11px', color: '#ccc' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: '12px' }}>
                  <button className="btn btn-primary" style={{ flex: 1, height: '24px', fontSize: '10px' }}>Water Flow (Topography)</button>
                  <button className="btn" style={{ flex: 1, height: '24px', fontSize: '10px' }}>Gas Plume (Wind)</button>
                </div>
                <div style={{ textAlign: 'center', background: '#1e1e1e', padding: '12px', border: '1px solid #333' }}>
                  <AlertOctagon size={20} color="#ff3333" style={{ margin: '0 auto 6px' }}/>
                  <div style={{ color: '#ff3333', fontWeight: 'bold', fontSize: 13 }}>Impact Radius: 240m</div>
                  <div style={{ fontSize: 10, marginTop: 6, opacity: 0.8 }}>Scenario: 3-bar gas pipeline failure. SW wind prevailing. Evacuate corridor immediately.</div>
                </div>
              </div>
            </div>
          </Draggable>
        )}

        {activePanels.includes('cost_calc') && (
          <Draggable nodeRef={costRef} handle=".handle-cost">
            <div ref={costRef} style={{ position: 'absolute', top: '350px', left: '500px', width: '380px', background: '#252526', border: '1px solid #444', boxShadow: '0 10px 30px rgba(0,0,0,0.7)', pointerEvents: 'auto' }}>
              <div className="handle-cost" style={{ cursor: 'move', background: '#333', padding: '6px 10px', fontSize: '11px', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #111' }}>
                <span><Calculator size={12} color="#bd8537" style={{verticalAlign:'middle', marginRight: 6}}/> BIM Cost Estimator</span>
                <X size={14} style={{ cursor: 'pointer', color: '#aaa' }} onClick={(e) => { e.stopPropagation(); togglePanel('cost_calc'); }} />
              </div>
              <div style={{ padding: '12px', fontSize: '11px', color: '#ccc' }}>
                <table className="cad-table" style={{ marginBottom: '10px' }}>
                  <thead><tr><th>BoQ Item</th><th>Qty</th><th>Cost</th></tr></thead>
                  <tbody>
                    <tr><td>15.120/K (Excavation)</td><td>450 m³</td><td>₺64.5K</td></tr>
                    <tr><td>17.144/A (Asphalt Cut)</td><td>120 m²</td><td>₺18.2K</td></tr>
                    <tr><td style={{color:'#ff3333'}}>Gas Relocation (Risk)</td><td style={{color:'#ff3333'}}>45 m</td><td style={{color:'#ff3333'}}>₺185K</td></tr>
                  </tbody>
                </table>
                <div style={{ background: '#bd8537', padding: '6px 10px', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Est. Budget:</span><span>₺267,700</span>
                </div>
                <button className="btn" style={{ width: '100%', marginTop: '10px', height: '24px', fontSize: '10px' }}>Export to Excel</button>
              </div>
            </div>
          </Draggable>
        )}
      </div>
      
      {/* 4. BOTTOM PANEL (Console & Data Table) */}
      <div className="cad-bottom-panel">
        <div className="cad-tabs">
          <span className={`cad-tab ${activeBottomTab === 'table' ? 'active' : ''}`} onClick={() => setActiveBottomTab('table')}><Database size={12} /> Data Table (Surface Markers)</span>
          <span className={`cad-tab ${activeBottomTab === 'console' ? 'active' : ''}`} onClick={() => setActiveBottomTab('console')}><TerminalSquare size={12} /> Output Console</span>
          <span className={`cad-tab ${activeBottomTab === 'clash' ? 'active' : ''}`} onClick={() => setActiveBottomTab('clash')}><AlertOctagon size={12} /> Clash & Risk Report</span>
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
            markers.length ? (
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
          )
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
  );
}
function emptyMarker(center: Coordinate): SurfaceMarkerInput {
  return { name: '', lat: center.lat, lon: center.lon, type: 'manhole', utilityType: 'water', confidence: 0.75 };
}
function Metric({ label, value, icon, loading }: { label: string; value?: number; icon: ReactNode; loading: boolean }) {
  return <div className="metric"><div><div className="metric-label">{label}</div>{loading ? <div className="loading-row" style={{ height: 20, width: 44, margin: '6px 0 0' }} /> : <div className="metric-value" data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>{value ?? '—'}</div>}</div><div className="metric-icon">{icon}</div></div>;
}
function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="error-box" role="alert">{message} <button className="btn btn-sm" onClick={onRetry} data-testid="button-retry">Yeniden dene</button></div>;
}
function AssetRow({ asset }: { asset: UndergroundAsset }) {
  return <div className="asset-row" data-testid={`asset-result-${asset.id}`}><div><div className="asset-name">{enumLabel(asset.utilityType)} hattı</div><div className="asset-meta">{asset.depthMeters} m · {Math.round(asset.confidence * 100)}% güven</div></div><span className={`risk-badge ${asset.riskLevel >= 4 ? 'risk-high' : asset.riskLevel >= 3 ? 'risk-medium' : 'risk-low'}`}>Risk {asset.riskLevel}/5</span></div>;
}
function MapSizeInvalidator() {
  const map = useMap();
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const container = map.getContainer();
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        map.invalidateSize({ pan: false, debounceMoveend: true });
      });
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [map]);
  return null;
}
function MapViewport({ center, zoom, onCenterChange, onZoomChange }: { center: Coordinate; zoom: number; onCenterChange: (coordinate: Coordinate) => void; onZoomChange: (zoom: number) => void }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lon], zoom, { animate: true, duration: 0.25 });
  }, [center.lat, center.lon, map, zoom]);
  useMapEvents({
    moveend: () => {
      const location = map.getCenter();
      onCenterChange({ lat: Number(location.lat.toFixed(6)), lon: Number(location.lng.toFixed(6)) });
    },
    zoomend: () => {
      const currentZoom = map.getZoom();
      if (currentZoom !== zoom) onZoomChange(currentZoom);
    },
  });
  return null;
}
function MapClickHandler({ onCoordinateClick }: { onCoordinateClick: (coordinate: Coordinate) => void }) {
  useMapEvents({
    click: (event) => onCoordinateClick({ lat: event.latlng.lat, lon: event.latlng.lng }),
  });
  return null;
}
function markerIcon(type: SurfaceMarker['type'], name: string, selected: boolean, utilityType?: UtilityType) {
  const paths: Record<SurfaceMarker['type'], string> = {
    manhole: '<circle cx="12" cy="12" r="6.5"/><path d="M8 12h8M12 8v8"/>',
    valve: '<path d="M12 4v16M5 8l7 4 7-4M5 16l7-4 7 4"/>',
    transformer: '<path d="M13.5 2 6 13h5l-.5 9L18 10h-5z"/>',
    hydrant: '<path d="M12 22s7-7.1 7-13a7 7 0 1 0-14 0c0 5.9 7 13 7 13Z"/><circle cx="12" cy="9" r="2"/>',
  };
  const colorAttr = utilityType ? `style="stroke: ${UTILITY_COLORS[utilityType]};"` : '';
  return L.divIcon({
    className: 'ag-pin-icon',
    iconSize: [24, 28],
    iconAnchor: [10, 26],
    html: `<div class="ag-pin ${selected ? 'selected' : ''}"><span class="pin-core"><svg viewBox="0 0 24 24" aria-hidden="true" ${colorAttr}>${paths[type]}</svg></span><span class="marker-label">${escapeHtml(name)}</span></div>`,
  });
}
function escapeHtml(value: string) {
  const replacements: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, (character) => replacements[character] ?? character);
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Lütfen yeniden deneyin.';
}
function enumLabel(value: string) {
  const labels: Record<string, string> = {
    manhole: 'Rögar', valve: 'Vana', transformer: 'Trafo', hydrant: 'Yangın musluğu',
    water: 'Su', gas: 'Doğal gaz', fiber: 'Fiber', electric: 'Elektrik', sewer: 'Kanalizasyon',
    ai_prediction: 'Yapay zekâ tahmini', manual: 'Elle girildi',
    low: 'Düşük', medium: 'Orta', high: 'Yüksek', critical: 'Kritik',
  };
  return labels[value] ?? value;
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default App;
