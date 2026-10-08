import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  useHealthCheck, useGetDashboard, useGetMarkers, useCreateMarker, useUpdateMarker,
  useDeleteMarker, useGetAssets, usePredictRoute, useGetZones, useCreateZone, useAnalyzeZone,
  getGetDashboardQueryKey, getGetMarkersQueryKey, getGetAssetsQueryKey, getGetZonesQueryKey,
} from '@workspace/api-client-react';
import type { Coordinate, SurfaceMarker, SurfaceMarkerInput, UndergroundAsset } from '@workspace/api-client-react';
import {
  Activity, AlertTriangle, ArrowDownUp, ArrowRight, Cable, Check, ChevronDown, CircleHelp,
  Crosshair, Edit3, Gauge, Layers3, MapPin, Minus, Plus, RefreshCw,
  Route, Search, ShieldCheck, Trash2, Triangle, X,
} from 'lucide-react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Polygon, Polyline, ScaleControl, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
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
  const markers = markersQuery.data ?? [];
  const assets = assetsQuery.data ?? [];
  const zones = zonesQuery.data ?? [];
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
  const [apiExpanded, setApiExpanded] = useState(false);
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
    return predictedAsset && !assets.some((asset) => asset.id === predictedAsset.id)
      ? [...assets, predictedAsset] : assets;
  }, [assets, predictedAsset]);

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
  const onMapCoordinateClick = (coordinate: Coordinate) => {
    if (zoneDrawing) {
      setZonePoints((previous) => [...previous, coordinate]);
      return;
    }
    openNewMarker(coordinate);
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
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Layers3 size={19} strokeWidth={1.8} /></div>
          <div className="brand-copy"><div className="brand-name">AntiGravity</div><div className="brand-sub">Altyapı zekâsı</div></div>
        </div>
        <div className="side-label">Çalışma alanı</div>
        <nav className="side-nav" aria-label="Çalışma alanı gezinmesi">
          <button className="nav-item active" data-testid="nav-map"><MapPin size={16} /><span className="nav-copy">Risk haritası</span></button>
          <button className="nav-item" onClick={() => document.getElementById('markers-section')?.scrollIntoView({ behavior: 'smooth' })} data-testid="nav-markers"><Crosshair size={16} /><span className="nav-copy">Yüzey işaretleri</span></button>
          <button className="nav-item" onClick={() => document.getElementById('zones-panel')?.scrollIntoView({ behavior: 'smooth' })} data-testid="nav-zones"><Triangle size={16} /><span className="nav-copy">Kazı bölgeleri</span></button>
        </nav>
        <div className="side-label">Saha araçları</div>
        <nav className="side-nav">
          <button className="nav-item" onClick={() => document.getElementById('route-panel')?.scrollIntoView({ behavior: 'smooth' })} data-testid="nav-route"><Route size={16} /><span className="nav-copy">Güzergâh tahmini</span></button>
          <button className="nav-item" onClick={() => document.getElementById('nearby-panel')?.scrollIntoView({ behavior: 'smooth' })} data-testid="nav-assets"><Search size={16} /><span className="nav-copy">Yakındaki varlıklar</span></button>
        </nav>
        <div className="side-foot"><span className="health-dot" style={{ background: health.isError ? '#d58468' : undefined }} />{health.isLoading ? 'Servis denetleniyor…' : health.isError ? 'Servise ulaşılamıyor' : `API ${health.data?.status ?? 'bağlı'}`}<br /><span style={{ color: '#819794' }}>Kadıköy saha çalışma alanı</span></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="crumb"><span>Operasyonlar</span><ArrowRight size={12} /><strong>Risk haritası</strong></div>
          <div className="top-actions">
            <div className="live-tag"><span className="health-dot" style={{ width: 6, height: 6 }} />{health.isError ? 'API çevrimdışı' : 'Sistem hazır'}</div>
            <div className="top-date">İSTANBUL · 40.990° N / 29.030° E</div>
          </div>
        </header>
        <div className="page-wrap">
          <div className="page-head">
            <div><div className="eyebrow">SAHA OPERASYONLARI / İSTANBUL</div><h1 className="page-title">Yeraltı risk haritası</h1><div className="page-desc">Yüzey bulguları, tahmini hatlar ve kazı riskleri tek görünümde.</div></div>
            <button className="btn btn-primary" onClick={() => openNewMarker()} data-testid="button-add-marker"><Plus size={15} /> Yüzey işareti kaydet</button>
          </div>

          <div className="metrics">
            <Metric label="Yüzey işaretleri" value={dashboard.data?.markerCount} icon={<Crosshair size={15} />} loading={dashboard.isLoading} />
            <Metric label="Haritalı hatlar" value={dashboard.data?.assetCount} icon={<Cable size={15} />} loading={dashboard.isLoading} />
            <Metric label="Kazı bölgeleri" value={dashboard.data?.zoneCount} icon={<Triangle size={15} />} loading={dashboard.isLoading} />
            <Metric label="Yüksek riskli hatlar" value={dashboard.data?.highRiskCount} icon={<AlertTriangle size={15} />} loading={dashboard.isLoading} />
          </div>
          {dashboard.isError && <ErrorBox message={`Özet veriler yüklenemedi. ${errorMessage(dashboard.error)}`} onRetry={() => void dashboard.refetch()} />}

          <div className="workspace-grid">
            <section className="map-card" aria-label="Kadıköy altyapı haritası">
              <div className="map-head">
                <div className="map-heading"><MapPin size={15} color="#3a7468" /> Kadıköy, İstanbul <small>· Yüzey bulguları görünümü</small></div>
                <div className="map-controls">
                  <button className="map-control" aria-label="Yakınlaştır" onClick={() => setViewZoom((z) => Math.min(19, z + 1))} data-testid="button-zoom-in"><Plus size={13} /></button>
                  <button className="map-control" aria-label="Uzaklaştır" onClick={() => setViewZoom((z) => Math.max(10, z - 1))} data-testid="button-zoom-out"><Minus size={13} /></button>
                  <button className="map-control" aria-label="Harita merkezini sıfırla" onClick={() => { setSearchCenter(MAP); setSearchLat(String(MAP.lat)); setSearchLon(String(MAP.lon)); setViewZoom(15); }} data-testid="button-center-map"><Crosshair size={13} /></button>
                </div>
              </div>
              <div className="map-canvas" data-testid="map-canvas">
                <MapContainer center={[MAP.lat, MAP.lon]} zoom={15} minZoom={3} maxZoom={20} zoomControl={false} scrollWheelZoom className="leaflet-map">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapViewport center={searchCenter} zoom={viewZoom} onCenterChange={(coordinate) => {
                    setSearchCenter((previous) => Math.abs(previous.lat - coordinate.lat) < 0.00002 && Math.abs(previous.lon - coordinate.lon) < 0.00002 ? previous : coordinate);
                    setSearchLat(coordinate.lat.toFixed(6));
                    setSearchLon(coordinate.lon.toFixed(6));
                  }} onZoomChange={setViewZoom} />
                  <MapClickHandler onCoordinateClick={onMapCoordinateClick} />
                  <ScaleControl position="bottomleft" imperial={false} />
                  {visibleAssets.map((asset) => <Polyline key={asset.id} positions={[[asset.start.lat, asset.start.lon] as [number, number], [asset.end.lat, asset.end.lon] as [number, number]]} pathOptions={{ color: '#c74739', weight: 3, opacity: 0.92, dashArray: '8 7', lineCap: 'round' }} />)}
                  {zones.map((zone) => <Polygon key={zone.id} positions={zone.polygon.map((point) => [point.lat, point.lon] as [number, number])} pathOptions={{ color: zone.id === selectedZone ? '#a66a25' : '#bd8537', weight: 2, dashArray: '7 5', fillColor: '#d4a04a', fillOpacity: zone.id === selectedZone ? 0.2 : 0.12 }} />)}
                  {zonePoints.length >= 3
                    ? <Polygon positions={zonePoints.map((point) => [point.lat, point.lon] as [number, number])} pathOptions={{ color: '#bd8537', weight: 2, dashArray: '5 4', fillColor: '#d4a04a', fillOpacity: 0.16 }} />
                    : zonePoints.length >= 2 && <Polyline positions={zonePoints.map((point) => [point.lat, point.lon] as [number, number])} pathOptions={{ color: '#bd8537', weight: 2, dashArray: '5 4' }} />}
                  {zonePoints.map((point, index) => <CircleMarker key={`draft-${index}`} center={[point.lat, point.lon]} radius={5} pathOptions={{ color: '#fff', weight: 2, fillColor: '#c68d3e', fillOpacity: 1 }} />)}
                  {markers.map((marker) => {
                    return <Marker key={marker.id} position={[marker.lat, marker.lon]} icon={markerIcon(marker.type, marker.name, selectedMarker === marker.id)} eventHandlers={{ click: () => setSelectedMarker(marker.id) }} title={`${marker.name} · ${enumLabel(marker.utilityType)}`} bubblingMouseEvents={false} />;
                  })}
                </MapContainer>
                {zoneDrawing && <div className="map-callout">Haritaya tıklayarak bölge köşelerini ekleyin · {zonePoints.length} nokta</div>}
              </div>
              <div className="map-footer">
                <div className="legend"><span className="legend-item"><i className="legend-dot" /> Yüzey işareti</span><span className="legend-item"><i className="legend-line" /> Tahmini hat</span><span className="legend-item"><span style={{ width: 8, height: 8, border: '1px dashed #bd8537', background: '#ead6af', display: 'inline-block' }} /> Çalışma bölgesi</span></div>
              </div>
            </section>

            <div className="side-panel">
              <section className="panel" id="route-panel">
                <div className="panel-head"><div className="panel-title"><Route size={14} color="#34746a" /> Güzergâh tahmini</div><span className="panel-kicker">Yüzeyden yüzeye</span></div>
                <div className="panel-body">
                  <div className="route-pair">
                    <div><label className="field-label" htmlFor="route-from">Başlangıç işareti</label><select id="route-from" className="select" value={routeFrom} onChange={(e) => { setRouteFrom(e.target.value); setRouteTo(''); }} data-testid="select-route-from"><option value="">İşaret seçin</option>{markers.map((m) => <option value={m.id} key={m.id}>{m.name} · {enumLabel(m.utilityType)}</option>)}</select></div>
                    <div className="route-arrow"><ArrowDownUp size={14} /></div>
                    <div><label className="field-label" htmlFor="route-to">Bitiş işareti</label><select id="route-to" className="select" value={routeTo} onChange={(e) => setRouteTo(e.target.value)} data-testid="select-route-to"><option value="">İşaret seçin</option>{compatibleMarkers.map((m) => <option value={m.id} key={m.id}>{m.name}</option>)}</select></div>
                  </div>
                  <button className="btn btn-primary wide-btn" style={{ marginTop: 12 }} disabled={!routeFrom || !routeTo || predictRoute.isPending} onClick={runPrediction} data-testid="button-predict-route">{predictRoute.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Route size={13} />} {predictRoute.isPending ? 'Güzergâh tahmin ediliyor…' : 'Yeraltı hattını tahmin et'}</button>
                  {predictRoute.isError && <div className="error-box" style={{ marginTop: 9, marginBottom: 0 }}>Güzergâh tahmini başarısız. {errorMessage(predictRoute.error)}<button className="btn btn-sm" onClick={runPrediction} style={{ marginLeft: 5 }}>Yeniden dene</button></div>}
                  <div className="hint">Yalnızca aynı altyapı türündeki işaretler eşleştirilebilir. Tahmin edilen güzergâhlar GPR ile doğrulanmış veri değil, tahmindir.</div>
                  {predictedAsset && <div className="route-result"><strong>Tahmin oluşturuldu · {enumLabel(predictedAsset.utilityType)}</strong>Derinlik {predictedAsset.depthMeters} m · Güven {Math.round(predictedAsset.confidence * 100)}%<br />Risk düzeyi {predictedAsset.riskLevel}/5 · {enumLabel(predictedAsset.dataSource)}</div>}
                </div>
              </section>

              <section className="panel" id="zones-panel">
                <div className="panel-head"><div className="panel-title"><ShieldCheck size={14} color="#34746a" /> Kazı güvenliği</div><span className="panel-kicker">Bölge incelemesi</span></div>
                <div className="panel-body">
                  <label className="field-label" htmlFor="select-zone">Kayıtlı çalışma bölgesi</label>
                  <select className="select" id="select-zone" value={selectedZone} onChange={(e) => { setSelectedZone(e.target.value); setAnalysis(null); }} data-testid="select-zone"><option value="">İncelenecek bölgeyi seçin</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select>
                  <div className="field-row" style={{ marginTop: 9 }}>
                    <button className="btn btn-primary wide-btn" onClick={analyzeSelectedZone} disabled={!selectedZone || analyzeZone.isPending} data-testid="button-analyze-zone">{analyzeZone.isPending ? 'İnceleniyor…' : <><ShieldCheck size={13} /> Çakışmaları incele</>}</button>
                    <button className="btn wide-btn" onClick={startZone} data-testid="button-draw-zone"><Triangle size={13} /> Bölge çiz</button>
                  </div>
                  {zoneDrawing && <div className="field-row" style={{ marginTop: 8 }}><button className="btn btn-sm" onClick={() => setZonePoints((points) => points.slice(0, -1))} disabled={!zonePoints.length}>Noktayı geri al</button><button className="btn btn-sm btn-primary" onClick={() => { if (zonePoints.length >= 3) setZoneDialog(true); }} disabled={zonePoints.length < 3}>{zonePoints.length} noktayı kaydet</button><button className="btn btn-sm" onClick={() => { setZoneDrawing(false); setZonePoints([]); }}>İptal</button></div>}
                  {zonesQuery.isError && <ErrorBox message="Kayıtlı bölgeler yüklenemedi." onRetry={() => void zonesQuery.refetch()} />}
                  {analyzeZone.isError && <ErrorBox message={`Risk analizi başarısız. ${errorMessage(analyzeZone.error)}`} onRetry={analyzeSelectedZone} />}
                  {analysis && <div className="route-result" style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><strong style={{ margin: 0 }}>{analysis.zone.name}</strong><span className={`risk-badge risk-${analysis.riskLevel}`}>{enumLabel(analysis.riskLevel)}</span></div>
                    <div style={{ display: 'flex', gap: 9, alignItems: 'baseline', marginTop: 8 }}><span className="risk-score">{analysis.riskScore}</span><span>100 üzerinden risk puanı</span></div>
                    <div style={{ marginTop: 5 }}>{analysis.conflicts.length} olası çakışma · {analysis.message}</div>
                    {analysis.conflicts.map((conflict) => <div className="conflict-item" key={conflict.asset.id}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong>{enumLabel(conflict.asset.utilityType)} hattı</strong><span className={`risk-badge ${conflict.asset.riskLevel >= 4 ? 'risk-high' : conflict.asset.riskLevel >= 3 ? 'risk-medium' : 'risk-low'}`}>Risk {conflict.asset.riskLevel}/5</span></div><div className="asset-meta">{conflict.distanceMeters} m bölgeye uzaklık · {conflict.asset.depthMeters} m derinlik · tahmindir, GPR ile doğrulanmamıştır</div></div>)}
                    <div className="risk-report">
                      <div className="risk-report-method"><strong>Yöntem</strong><span>PostGIS vektör kesişimi + sentetik hat taraması</span></div>
                      <section><strong>Kanıt ve veri kaynağı</strong><ul>{analysis.evidence.map((item, index) => <li key={`evidence-${index}`}>{item}</li>)}</ul></section>
                      <section><strong>Bu veride bulunmayanlar</strong><ul>{analysis.unknowns.map((item, index) => <li key={`unknown-${index}`}>{item}</li>)}</ul></section>
                      <section><strong>Önerilen adımlar</strong><ul>{analysis.recommendedActions.map((item, index) => <li key={`action-${index}`}>{item}</li>)}</ul></section>
                      <div className="risk-report-finance"><strong>Parasal hasar tahmini</strong><span>{analysis.financialImpact.estimated && analysis.financialImpact.amount !== null ? `${analysis.financialImpact.amount.toLocaleString('tr-TR')} ${analysis.financialImpact.currency ?? ''}` : 'Hesaplanmadı'}</span><small>{analysis.financialImpact.reason}</small></div>
                      <div className="risk-report-warning" role="note"><AlertTriangle size={13} /> Bu rapor ön taramadır; saha doğrulaması, işletmeci teyidi veya kazı izninin yerine geçmez.</div>
                    </div>
                  </div>}
                </div>
              </section>

              <section className="panel" id="nearby-panel">
                <div className="panel-head"><div className="panel-title"><Search size={14} color="#34746a" /> Yakındaki varlıklar</div><span className="panel-kicker">Yarıçap araması</span></div>
                <div className="panel-body">
                  <div className="field-grid">
                    <div><label className="field-label" htmlFor="search-lat">Enlem</label><input className="field mono" id="search-lat" value={searchLat} onChange={(e) => setSearchLat(e.target.value)} data-testid="input-search-lat" /></div>
                    <div><label className="field-label" htmlFor="search-lon">Boylam</label><input className="field mono" id="search-lon" value={searchLon} onChange={(e) => setSearchLon(e.target.value)} data-testid="input-search-lon" /></div>
                  </div>
                  <div className="field-row" style={{ marginTop: 8, alignItems: 'end' }}>
                    <div><label className="field-label" htmlFor="search-radius">Yarıçap · metre</label><input className="field mono" id="search-radius" type="number" min="1" max="5000" value={radiusInput} onChange={(e) => setRadiusInput(e.target.value)} data-testid="input-search-radius" /></div>
                    <button className="btn btn-primary" onClick={searchNearby} disabled={assetsQuery.isFetching} data-testid="button-search-assets"><Search size={13} /> Ara</button>
                  </div>
                  {assetsQuery.isError && <ErrorBox message={`Varlık araması başarısız. ${errorMessage(assetsQuery.error)}`} onRetry={() => void assetsQuery.refetch()} />}
                  <div className="asset-list" style={{ marginTop: 9 }}>
                    {assetsQuery.isLoading ? <><div className="loading-row" /><div className="loading-row" /></> : assets.length ? assets.slice(0, 4).map((asset) => <AssetRow asset={asset} key={asset.id} />) : <div className="empty-state">{assetsQuery.isError ? 'Varlık araması şu anda kullanılamıyor.' : 'Bu arama yarıçapında haritalanmış varlık yok. Tahmin edilen hatlar, güzergâh tahmininden sonra görünür.'}</div>}
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="lower-grid">
            <section className="panel" id="markers-section">
              <div className="panel-head"><div className="panel-title"><Crosshair size={14} color="#34746a" /> Yüzey işaretleri <span className="panel-kicker">{markers.length} kayıtlı</span></div><button className="btn btn-sm" onClick={() => openNewMarker()} data-testid="button-add-marker-table"><Plus size={13} /> İşaret ekle</button></div>
              <div>
                {markersQuery.isError && <div style={{ padding: 12 }}><ErrorBox message={`Yüzey işaretleri yüklenemedi. ${errorMessage(markersQuery.error)}`} onRetry={() => void markersQuery.refetch()} /></div>}
                {markersQuery.isLoading ? <div style={{ padding: '4px 12px 12px' }}><div className="loading-row" /><div className="loading-row" /><div className="loading-row" /></div> : markers.length ? <div style={{ overflowX: 'auto' }}><table className="marker-table"><thead><tr><th>İşaret</th><th>Altyapı</th><th>Koordinatlar</th><th>Güven</th><th>Kayıt tarihi</th><th style={{ textAlign: 'right' }}>İşlemler</th></tr></thead><tbody>{markers.map((marker) => <tr key={marker.id} data-testid={`row-marker-${marker.id}`} onClick={() => setSelectedMarker(marker.id)}><td><strong>{marker.name}</strong><div style={{ color: '#8b9690', fontSize: 9, marginTop: 3, textTransform: 'capitalize' }}>{enumLabel(marker.type)}</div></td><td><span className="utility-pill">{enumLabel(marker.utilityType)}</span></td><td className="mono" style={{ fontSize: 9 }}>{marker.lat.toFixed(5)}, {marker.lon.toFixed(5)}</td><td><div className="confidence">{Math.round(marker.confidence * 100)}%<span className="conf-track"><i style={{ width: `${marker.confidence * 100}%` }} /></span></div></td><td className="mono" style={{ fontSize: 9, color: '#83908b' }}>{formatDate(marker.createdAt)}</td><td><div className="table-actions"><button className="icon-btn" title="İşareti düzenle" onClick={(e) => { e.stopPropagation(); openEditMarker(marker); }} data-testid={`button-edit-marker-${marker.id}`}><Edit3 size={13} /></button><button className="icon-btn" title="İşareti sil" onClick={(e) => { e.stopPropagation(); removeMarker(marker); }} data-testid={`button-delete-marker-${marker.id}`}><Trash2 size={13} /></button></div></td></tr>)}</tbody></table></div> : !markersQuery.isError && <div className="empty-state" style={{ margin: 12 }}>Henüz yüzey işareti kaydedilmedi. Sahada gözlemlediğiniz rögar, vana, trafo veya yangın musluğunu ekleyin.</div>}
              </div>
            </section>
            <section className="panel">
              <div className="panel-head"><div className="panel-title"><Activity size={14} color="#34746a" /> Güven profili</div><span className="panel-kicker">Çalışma alanı ortalaması</span></div>
              <div className="panel-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div className="metric-value" style={{ fontSize: 28 }}>{dashboard.data ? `${Math.round(dashboard.data.averageConfidence * 100)}%` : '—'}</div><div className="hint" style={{ marginTop: 3 }}>Kaydedilen yüzey bulgularının ortalaması</div></div><div className="metric-icon" style={{ width: 42, height: 42 }}><Gauge size={19} /></div></div>
                <div style={{ height: 5, borderRadius: 9, background: '#e5e5da', margin: '14px 0 8px', overflow: 'hidden' }}><div style={{ width: `${Math.min(100, (dashboard.data?.averageConfidence ?? 0) * 100)}%`, height: '100%', background: '#438275', borderRadius: 9 }} /></div>
                <div className="hint">Güven puanı, yüzey işaretinin gözlem kalitesini gösterir; yeraltı hatlarının konumunu doğrulamaz.</div>
              </div>
            </section>
          </div>

          <section className="api-panel" style={{ marginTop: 16 }}>
            <div className="api-head" onClick={() => setApiExpanded((open) => !open)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setApiExpanded((open) => !open); }} data-testid="toggle-api-example"><div className="panel-title"><CircleHelp size={14} color="#34746a" /> API hızlı başvuru <span className="panel-kicker">REST · /api</span></div>{apiExpanded ? <X size={14} /> : <ChevronDown size={15} />}</div>
            {apiExpanded && <div className="api-body">
              <div className="hint">REST API; JSON varlık listesi ve GIS/BIM araçları için GeoJSON hat geometrisi sunar. Yeraltı hatları sentetik tahmindir, GPR ölçümü değildir. GeoJSON koordinatları WGS84/EPSG:4326 biçiminde [boylam, enlem] sırasındadır; BIM projesinin koordinat sistemine dönüştürün.</div>
              <div className="api-example">{`GET  /api/v1/markers\nPOST /api/v1/predictions   { markerAId, markerBId }\nGET  /api/v1/assets?lat=40.99&lon=29.03&radius=50\nGET  /api/v1/assets.geojson?lat=40.99&lon=29.03&radius=50\nPOST /api/v1/zones/{id}/analyze`}</div>
              <div className="api-doc-label">GIS/BIM istemcisi için örnek istek</div>
              <div className="api-example">{`curl -H "Accept: application/geo+json" \\\n  "https://<API_HOST>/api/v1/assets.geojson?lat=40.99032&lon=29.02715&radius=50"`}</div>
              <div className="api-doc-label">Örnek GeoJSON yanıtı · temsili</div>
              <pre className="api-example api-json-example">{`{\n  "type": "FeatureCollection",\n  "features": [{\n    "type": "Feature",\n    "geometry": {\n      "type": "LineString",\n      "coordinates": [[29.02715, 40.99032], [29.02779, 40.99065]]\n    },\n    "properties": {\n      "id": "asset-id", "utilityType": "gas", "depthMeters": 1.2,\n      "confidence": 0.72, "dataSource": "ai_prediction", "riskLevel": 5,\n      "createdAt": "2026-10-08T12:00:00.000Z"\n    }\n  }]\n}`}</pre>
              <div className="api-note">Bu uç, eklentiye hazır veri sağlar; AutoCAD/Revit eklentisi bu MVP’nin parçası değildir. Sağlık durumu: {health.isLoading ? 'denetleniyor…' : health.isError ? 'kullanılamıyor' : health.data?.status ?? 'bilinmiyor'}.</div>
            </div>}
          </section>
        </div>
      </main>

      {markerDialog && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setMarkerDialog(null); }}>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="marker-modal-title">
          <div className="modal-top"><div><div className="modal-title" id="marker-modal-title">{markerDialog === 'new' ? 'Yüzey işareti kaydet' : 'Yüzey işaretini düzenle'}</div><div className="modal-sub">Ekibin yüzeyde doğrulayabildiği bulguları kaydedin.</div></div><button className="icon-btn" onClick={() => setMarkerDialog(null)} aria-label="İşaret formunu kapat"><X size={17} /></button></div>
          <div className="modal-content">
            <div className="field-block"><label className="field-label" htmlFor="marker-name">İşaret adı</label><input className="field" id="marker-name" value={markerForm.name} onChange={(e) => setMarkerForm({ ...markerForm, name: e.target.value })} placeholder="Örn. Moda vana odası" data-testid="input-marker-name" /></div>
            <div className="field-grid">
              <div className="field-block"><label className="field-label" htmlFor="marker-type">Yüzey işareti türü</label><select className="select" id="marker-type" value={markerForm.type} onChange={(e) => setMarkerForm({ ...markerForm, type: e.target.value as SurfaceMarkerInput['type'] })} data-testid="select-marker-type">{MARKER_OPTIONS.map((option) => <option value={option} key={option}>{enumLabel(option)}</option>)}</select></div>
              <div className="field-block"><label className="field-label" htmlFor="marker-utility">Altyapı türü</label><select className="select" id="marker-utility" value={markerForm.utilityType} onChange={(e) => setMarkerForm({ ...markerForm, utilityType: e.target.value as SurfaceMarkerInput['utilityType'] })} data-testid="select-marker-utility">{UTILITY_OPTIONS.map((option) => <option value={option} key={option}>{enumLabel(option)}</option>)}</select></div>
            </div>
            <div className="field-grid">
              <div className="field-block"><label className="field-label" htmlFor="marker-lat">Enlem</label><input className="field mono" id="marker-lat" type="number" step="any" value={markerForm.lat} onChange={(e) => setMarkerForm({ ...markerForm, lat: Number(e.target.value) })} data-testid="input-marker-lat" /></div>
              <div className="field-block"><label className="field-label" htmlFor="marker-lon">Boylam</label><input className="field mono" id="marker-lon" type="number" step="any" value={markerForm.lon} onChange={(e) => setMarkerForm({ ...markerForm, lon: Number(e.target.value) })} data-testid="input-marker-lon" /></div>
            </div>
            <div className="field-block"><label className="field-label" htmlFor="marker-confidence">Gözlem güveni · {Math.round(markerForm.confidence * 100)}%</label><input className="field" id="marker-confidence" type="range" min="0" max="1" step=".05" value={markerForm.confidence} onChange={(e) => setMarkerForm({ ...markerForm, confidence: Number(e.target.value) })} data-testid="input-marker-confidence" /></div>
            {markerError && <div className="form-error">{markerError}</div>}
            {(createMarker.isError || updateMarker.isError) && !markerError && <div className="form-error">İşaret kaydedilemedi. Bağlantıyı kontrol edip yeniden deneyin.</div>}
          </div>
          <div className="modal-actions"><button className="btn" onClick={() => setMarkerDialog(null)}>İptal</button><button className="btn btn-primary" onClick={saveMarker} disabled={createMarker.isPending || updateMarker.isPending} data-testid="button-save-marker">{createMarker.isPending || updateMarker.isPending ? 'Kaydediliyor…' : <><Check size={14} /> İşareti kaydet</>}</button></div>
        </div>
      </div>}
      {zoneDialog && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setZoneDialog(false); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="zone-modal-title">
        <div className="modal-top"><div><div className="modal-title" id="zone-modal-title">Kazı bölgesini kaydet</div><div className="modal-sub">Tahmini hatlarla olası çakışmaları incelemek için sınırı kaydedin.</div></div><button className="icon-btn" onClick={() => setZoneDialog(false)} aria-label="Bölge formunu kapat"><X size={17} /></button></div>
        <div className="modal-content"><div className="field-block"><label className="field-label" htmlFor="zone-name">Bölge adı</label><input className="field" id="zone-name" value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="Örn. Moda sokak yenileme · Bölüm 04" data-testid="input-zone-name" /></div><div className="hint">{zonePoints.length} köşe noktası eklendi. Risk analizi, bu sınırı haritalanmış tahmini hatlarla karşılaştırır.</div><div className="zone-vertex-list">{zonePoints.map((point, i) => <span className="vertex-chip" key={`${point.lat}-${point.lon}`}>N{i + 1} {point.lat.toFixed(4)}, {point.lon.toFixed(4)}</span>)}</div>{createZone.isError && <div className="form-error">Bölge kaydedilemedi. {errorMessage(createZone.error)}</div>}</div>
        <div className="modal-actions"><button className="btn" onClick={() => setZoneDialog(false)}>İptal</button><button className="btn btn-primary" onClick={saveZone} disabled={!zoneName.trim() || zonePoints.length < 3 || createZone.isPending} data-testid="button-save-zone">{createZone.isPending ? 'Kaydediliyor…' : <><Check size={14} /> Bölgeyi kaydet</>}</button></div>
      </div></div>}
      {toast && <div className="toast-msg" role="status">{toast}</div>}
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
function markerIcon(type: SurfaceMarker['type'], name: string, selected: boolean) {
  const paths: Record<SurfaceMarker['type'], string> = {
    manhole: '<circle cx="12" cy="12" r="6.5"/><path d="M8 12h8M12 8v8"/>',
    valve: '<path d="M12 4v16M5 8l7 4 7-4M5 16l7-4 7 4"/>',
    transformer: '<path d="M13.5 2 6 13h5l-.5 9L18 10h-5z"/>',
    hydrant: '<path d="M12 22s7-7.1 7-13a7 7 0 1 0-14 0c0 5.9 7 13 7 13Z"/><circle cx="12" cy="9" r="2"/>',
  };
  return L.divIcon({
    className: 'ag-pin-icon',
    iconSize: [24, 28],
    iconAnchor: [10, 26],
    html: `<div class="ag-pin ${selected ? 'selected' : ''}"><span class="pin-core"><svg viewBox="0 0 24 24" aria-hidden="true">${paths[type]}</svg></span><span class="marker-label">${escapeHtml(name)}</span></div>`,
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
