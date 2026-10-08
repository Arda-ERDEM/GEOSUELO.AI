import { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDownUp, Cable, Check, ChevronDown, CircleHelp,
  Crosshair, Edit3, Gauge, Layers3, MapPin, Minus, Plus, RefreshCw,
  Route, Search, ShieldCheck, Trash2, Triangle, X,
} from 'lucide-react';
import './_group.css';

type UtilityType = 'water' | 'gas' | 'fiber' | 'electric' | 'sewer';
type MarkerType = 'manhole' | 'valve' | 'transformer' | 'hydrant';
type Marker = { id: string; name: string; lat: number; lon: number; type: MarkerType; utilityType: UtilityType; confidence: number; createdAt: string };
type Asset = { id: string; utilityType: UtilityType; depthMeters: number; confidence: number; riskLevel: number; dataSource: 'ai_prediction' | 'manual'; start: { lat: number; lon: number }; end: { lat: number; lon: number } };
type Zone = { id: string; name: string };

const UTILITY_OPTIONS: UtilityType[] = ['water', 'gas', 'fiber', 'electric', 'sewer'];
const MARKER_OPTIONS: MarkerType[] = ['manhole', 'valve', 'transformer', 'hydrant'];
const sampleMarkers: Marker[] = [
  { id: 'm-1', name: 'Moda rögar 04', lat: 40.98972, lon: 29.02861, type: 'manhole', utilityType: 'water', confidence: .91, createdAt: '2026-10-08T12:00:00.000Z' },
  { id: 'm-2', name: 'Bahariye vana', lat: 40.99134, lon: 29.0341, type: 'valve', utilityType: 'water', confidence: .84, createdAt: '2026-10-07T12:00:00.000Z' },
  { id: 'm-3', name: 'Rıhtım trafo 2', lat: 40.98796, lon: 29.02545, type: 'transformer', utilityType: 'electric', confidence: .78, createdAt: '2026-10-06T12:00:00.000Z' },
  { id: 'm-4', name: 'Caferağa yangın musluğu', lat: 40.99306, lon: 29.02902, type: 'hydrant', utilityType: 'water', confidence: .96, createdAt: '2026-10-05T12:00:00.000Z' },
];
const sampleAssets: Asset[] = [
  { id: 'a-1', utilityType: 'gas', depthMeters: 1.2, confidence: .72, riskLevel: 5, dataSource: 'ai_prediction', start: { lat: 40.99032, lon: 29.02715 }, end: { lat: 40.99118, lon: 29.03379 } },
  { id: 'a-2', utilityType: 'water', depthMeters: 1.8, confidence: .88, riskLevel: 2, dataSource: 'manual', start: { lat: 40.98692, lon: 29.02712 }, end: { lat: 40.99212, lon: 29.02782 } },
  { id: 'a-3', utilityType: 'fiber', depthMeters: .65, confidence: .67, riskLevel: 3, dataSource: 'ai_prediction', start: { lat: 40.9881, lon: 29.0332 }, end: { lat: 40.99303, lon: 29.0318 } },
];
const sampleZones: Zone[] = [{ id: 'z-1', name: 'Moda sokak yenileme · Bölüm 04' }];
const enumLabel = (value: string) => ({
  manhole: 'Rögar', valve: 'Vana', transformer: 'Trafo', hydrant: 'Yangın musluğu',
  water: 'Su', gas: 'Doğal gaz', fiber: 'Fiber', electric: 'Elektrik', sewer: 'Kanalizasyon',
  ai_prediction: 'Yapay zekâ tahmini', manual: 'Elle girildi',
  low: 'Düşük', medium: 'Orta', high: 'Yüksek', critical: 'Kritik',
}[value] ?? value);
const formatDate = (value: string) => new Date(value).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: '2-digit' });

export function Current() {
  const [markers, setMarkers] = useState(sampleMarkers);
  const [selectedMarker, setSelectedMarker] = useState('');
  const [routeFrom, setRouteFrom] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [predicted, setPredicted] = useState(false);
  const [selectedZone, setSelectedZone] = useState('');
  const [zoneDrawing, setZoneDrawing] = useState(false);
  const [searchLat, setSearchLat] = useState('40.990000');
  const [searchLon, setSearchLon] = useState('29.030000');
  const [radiusInput, setRadiusInput] = useState('1200');
  const [apiExpanded, setApiExpanded] = useState(false);
  const [dialog, setDialog] = useState<'new' | Marker | null>(null);
  const [markerName, setMarkerName] = useState('');
  const [markerType, setMarkerType] = useState<MarkerType>('manhole');
  const [markerUtility, setMarkerUtility] = useState<UtilityType>('water');
  const [toast, setToast] = useState('');
  const [viewZoom, setViewZoom] = useState(15);
  const [searchUpdated, setSearchUpdated] = useState(false);
  const compatibleMarkers = useMemo(() => {
    const origin = markers.find((marker) => marker.id === routeFrom);
    return origin ? markers.filter((marker) => marker.id !== origin.id && marker.utilityType === origin.utilityType) : markers;
  }, [markers, routeFrom]);
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };
  const openNewMarker = () => {
    setMarkerName('');
    setMarkerType('manhole');
    setMarkerUtility('water');
    setDialog('new');
  };
  const saveMarker = () => {
    if (!markerName.trim()) return;
    const marker: Marker = {
      id: `m-${Date.now()}`, name: markerName, lat: 40.99, lon: 29.03, type: markerType,
      utilityType: markerUtility, confidence: .75, createdAt: new Date().toISOString(),
    };
    setMarkers((previous) => dialog && dialog !== 'new' ? previous.map((item) => item.id === dialog.id ? { ...marker, id: item.id } : item) : [marker, ...previous]);
    setDialog(null);
    notify('Yüzey işareti kaydedildi');
  };
  const selectedAsset: Asset | null = predicted ? { ...sampleAssets[0], id: 'a-prediction', utilityType: markers.find((marker) => marker.id === routeFrom)?.utilityType ?? 'gas' } : null;
  const allAssets = selectedAsset ? [...sampleAssets, selectedAsset] : sampleAssets;

  return <div className="antigravity-simplify">
    <div className="app-shell">
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-brand">
            <div className="topbar-brand-mark"><Layers3 size={17} strokeWidth={1.8} /></div>
            <div className="topbar-brand-copy"><strong>AntiGravity</strong><span>Risk haritası</span></div>
          </div>
          <div className="top-actions">
            <div className="live-tag"><span className="health-dot" style={{ width: 6, height: 6 }} />Sistem hazır</div>
            <div className="top-date">İSTANBUL · 40.990° N / 29.030° E</div>
          </div>
        </header>
        <div className="page-wrap">
          <div className="page-head">
            <div><div className="eyebrow">SAHA OPERASYONLARI / İSTANBUL</div><h1 className="page-title">Yeraltı risk haritası</h1><div className="page-desc">Yüzey bulguları, tahmini hatlar ve kazı riskleri tek görünümde.</div></div>
            <button className="btn btn-primary" onClick={openNewMarker} data-testid="button-add-marker"><Plus size={15} /> Yüzey işareti kaydet</button>
          </div>

          <div className="metrics">
            <Metric label="Yüzey işaretleri" value={markers.length} icon={<Crosshair size={15} />} />
            <Metric label="Haritalı hatlar" value={sampleAssets.length + (predicted ? 1 : 0)} icon={<Cable size={15} />} />
            <Metric label="Kazı bölgeleri" value={sampleZones.length} icon={<Triangle size={15} />} />
            <Metric label="Yüksek riskli hatlar" value={allAssets.filter((asset) => asset.riskLevel >= 4).length} icon={<AlertTriangle size={15} />} />
          </div>

          <div className="workspace-grid">
            <section className="map-card" aria-label="Kadıköy altyapı haritası">
              <div className="map-head">
                <div className="map-heading"><MapPin size={15} color="#3a7468" /> Kadıköy, İstanbul <small>· Yüzey bulguları görünümü</small></div>
                <div className="map-controls">
                  <button className="map-control" aria-label="Yakınlaştır" onClick={() => setViewZoom((z) => Math.min(19, z + 1))}><Plus size={13} /></button>
                  <button className="map-control" aria-label="Uzaklaştır" onClick={() => setViewZoom((z) => Math.max(10, z - 1))}><Minus size={13} /></button>
                  <button className="map-control" aria-label="Harita merkezini sıfırla" onClick={() => { setSearchLat('40.99'); setSearchLon('29.03'); setViewZoom(15); }}><Crosshair size={13} /></button>
                </div>
              </div>
              <div className="map-canvas" data-testid="map-canvas">
                <StaticMap markers={markers} assets={allAssets} selectedMarker={selectedMarker} onMarkerSelect={setSelectedMarker} />
                {zoneDrawing && <div className="map-callout">Haritaya tıklayarak bölge köşelerini ekleyin · 0 nokta</div>}
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
                    <div><label className="field-label" htmlFor="route-from">Başlangıç işareti</label><select id="route-from" className="select" value={routeFrom} onChange={(e) => { setRouteFrom(e.target.value); setRouteTo(''); }}><option value="">İşaret seçin</option>{markers.map((marker) => <option value={marker.id} key={marker.id}>{marker.name} · {enumLabel(marker.utilityType)}</option>)}</select></div>
                    <div className="route-arrow"><ArrowDownUp size={14} /></div>
                    <div><label className="field-label" htmlFor="route-to">Bitiş işareti</label><select id="route-to" className="select" value={routeTo} onChange={(e) => setRouteTo(e.target.value)}><option value="">İşaret seçin</option>{compatibleMarkers.map((marker) => <option value={marker.id} key={marker.id}>{marker.name}</option>)}</select></div>
                  </div>
                  <button className="btn btn-primary wide-btn" style={{ marginTop: 12 }} disabled={!routeFrom || !routeTo} onClick={() => { setPredicted(true); notify('Güzergâh tahmini oluşturuldu'); }}><Route size={13} /> Yeraltı hattını tahmin et</button>
                  <div className="hint">Yalnızca aynı altyapı türündeki işaretler eşleştirilebilir. Tahmin edilen güzergâhlar GPR ile doğrulanmış veri değil, tahmindir.</div>
                  {selectedAsset && <div className="route-result"><strong>Tahmin oluşturuldu · {enumLabel(selectedAsset.utilityType)}</strong>Derinlik {selectedAsset.depthMeters} m · Güven {Math.round(selectedAsset.confidence * 100)}%<br />Risk düzeyi {selectedAsset.riskLevel}/5 · {enumLabel(selectedAsset.dataSource)}</div>}
                </div>
              </section>

              <section className="panel" id="zones-panel">
                <div className="panel-head"><div className="panel-title"><ShieldCheck size={14} color="#34746a" /> Kazı güvenliği</div><span className="panel-kicker">Bölge incelemesi</span></div>
                <div className="panel-body">
                  <label className="field-label" htmlFor="select-zone">Kayıtlı çalışma bölgesi</label>
                  <select className="select" id="select-zone" value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)}><option value="">İncelenecek bölgeyi seçin</option>{sampleZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select>
                  <div className="field-row" style={{ marginTop: 9 }}>
                    <button className="btn btn-primary wide-btn" onClick={() => notify('Örnek bölge analizi tamamlandı')} disabled={!selectedZone}><ShieldCheck size={13} /> Çakışmaları incele</button>
                    <button className="btn wide-btn" onClick={() => setZoneDrawing((drawing) => !drawing)}><Triangle size={13} /> Bölge çiz</button>
                  </div>
                  {selectedZone && <div className="route-result" style={{ marginTop: 10 }}><strong>Orta risk · 62/100</strong>2 olası çakışma · Sentetik hat taraması</div>}
                </div>
              </section>

              <section className="panel" id="nearby-panel">
                <div className="panel-head"><div className="panel-title"><Search size={14} color="#34746a" /> Yakındaki varlıklar</div><span className="panel-kicker">Yarıçap araması</span></div>
                <div className="panel-body">
                  <div className="field-grid">
                    <div><label className="field-label" htmlFor="search-lat">Enlem</label><input className="field mono" id="search-lat" value={searchLat} onChange={(e) => setSearchLat(e.target.value)} /></div>
                    <div><label className="field-label" htmlFor="search-lon">Boylam</label><input className="field mono" id="search-lon" value={searchLon} onChange={(e) => setSearchLon(e.target.value)} /></div>
                  </div>
                  <div className="field-row" style={{ marginTop: 8, alignItems: 'end' }}>
                    <div><label className="field-label" htmlFor="search-radius">Yarıçap · metre</label><input className="field mono" id="search-radius" type="number" min="1" max="5000" value={radiusInput} onChange={(e) => setRadiusInput(e.target.value)} /></div>
                    <button className="btn btn-primary" onClick={() => setSearchUpdated(true)}><Search size={13} /> Ara</button>
                  </div>
                  <div className="asset-list" style={{ marginTop: 9 }}>
                    {(searchUpdated ? sampleAssets.slice(0, 2) : sampleAssets).map((asset) => <AssetRow asset={asset} key={asset.id} />)}
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="lower-grid">
            <section className="panel" id="markers-section">
              <div className="panel-head"><div className="panel-title"><Crosshair size={14} color="#34746a" /> Yüzey işaretleri <span className="panel-kicker">{markers.length} kayıtlı</span></div><button className="btn btn-sm" onClick={openNewMarker}><Plus size={13} /> İşaret ekle</button></div>
              <div style={{ overflowX: 'auto' }}><table className="marker-table"><thead><tr><th>İşaret</th><th>Altyapı</th><th>Koordinatlar</th><th>Güven</th><th>Kayıt tarihi</th><th style={{ textAlign: 'right' }}>İşlemler</th></tr></thead><tbody>{markers.map((marker) => <tr key={marker.id} onClick={() => setSelectedMarker(marker.id)}><td><strong>{marker.name}</strong><div style={{ color: '#8b9690', fontSize: 9, marginTop: 3, textTransform: 'capitalize' }}>{enumLabel(marker.type)}</div></td><td><span className="utility-pill">{enumLabel(marker.utilityType)}</span></td><td className="mono" style={{ fontSize: 9 }}>{marker.lat.toFixed(5)}, {marker.lon.toFixed(5)}</td><td><div className="confidence">{Math.round(marker.confidence * 100)}%<span className="conf-track"><i style={{ width: `${marker.confidence * 100}%` }} /></span></div></td><td className="mono" style={{ fontSize: 9, color: '#83908b' }}>{formatDate(marker.createdAt)}</td><td><div className="table-actions"><button className="icon-btn" title="İşareti düzenle" onClick={(event) => { event.stopPropagation(); setMarkerName(marker.name); setMarkerType(marker.type); setMarkerUtility(marker.utilityType); setDialog(marker); }}><Edit3 size={13} /></button><button className="icon-btn" title="İşareti sil" onClick={(event) => { event.stopPropagation(); setMarkers((items) => items.filter((item) => item.id !== marker.id)); }}><Trash2 size={13} /></button></div></td></tr>)}</tbody></table></div>
            </section>
            <section className="panel">
              <div className="panel-head"><div className="panel-title"><Activity size={14} color="#34746a" /> Güven profili</div><span className="panel-kicker">Çalışma alanı ortalaması</span></div>
              <div className="panel-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div className="metric-value" style={{ fontSize: 28 }}>87%</div><div className="hint" style={{ marginTop: 3 }}>Kaydedilen yüzey bulgularının ortalaması</div></div><div className="metric-icon" style={{ width: 42, height: 42 }}><Gauge size={19} /></div></div>
                <div style={{ height: 5, borderRadius: 9, background: '#e5e5da', margin: '14px 0 8px', overflow: 'hidden' }}><div style={{ width: '87%', height: '100%', background: '#438275', borderRadius: 9 }} /></div>
                <div className="hint">Güven puanı, yüzey işaretinin gözlem kalitesini gösterir; yeraltı hatlarının konumunu doğrulamaz.</div>
              </div>
            </section>
          </div>

          <section className="api-panel" style={{ marginTop: 16 }}>
            <div className="api-head" onClick={() => setApiExpanded((open) => !open)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setApiExpanded((open) => !open); }} data-testid="toggle-api-example"><div className="panel-title"><CircleHelp size={14} color="#34746a" /> API hızlı başvuru <span className="panel-kicker">REST · /api</span></div>{apiExpanded ? <X size={14} /> : <ChevronDown size={15} />}</div>
            {apiExpanded && <div className="api-body">
              <div className="hint">REST API; JSON varlık listesi ve GIS/BIM araçları için GeoJSON hat geometrisi sunar. Yeraltı hatları sentetik tahmindir, GPR ölçümü değildir. GeoJSON koordinatları WGS84/EPSG:4326 biçiminde [boylam, enlem] sırasındadır; BIM projesinin koordinat sistemine dönüştürün.</div>
              <div className="api-example">{`GET  /api/v1/markers\nPOST /api/v1/predictions   { markerAId, markerBId }\nGET  /api/v1/assets?lat=40.99&lon=29.03&radius=50\nGET  /api/v1/assets.geojson?lat=40.99&lon=29.03&radius=50\nPOST /api/v1/zones/{id}/analyze`}</div>
              <div className="api-doc-label">GIS/BIM istemcisi için örnek istek</div>
              <div className="api-example">{`curl -H "Accept: application/geo+json" \\\n  "https://<API_HOST>/api/v1/assets.geojson?lat=40.99032&lon=29.02715&radius=50"`}</div>
              <div className="api-doc-label">Örnek GeoJSON yanıtı · temsili</div>
              <pre className="api-example api-json-example">{`{\n  "type": "FeatureCollection",\n  "features": [{\n    "type": "Feature",\n    "geometry": { "type": "LineString", "coordinates": [[29.02715, 40.99032], [29.02779, 40.99065]] },\n    "properties": { "id": "asset-id", "utilityType": "gas", "depthMeters": 1.2, "confidence": 0.72, "dataSource": "ai_prediction", "riskLevel": 5 }\n  }]\n}`}</pre>
              <div className="api-note">Bu uç, eklentiye hazır veri sağlar; AutoCAD/Revit eklentisi bu MVP’nin parçası değildir. Sağlık durumu: hazır.</div>
            </div>}
          </section>
        </div>
      </main>

      {dialog && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="marker-modal-title">
          <div className="modal-top"><div><div className="modal-title" id="marker-modal-title">{dialog === 'new' ? 'Yüzey işareti kaydet' : 'Yüzey işaretini düzenle'}</div><div className="modal-sub">Ekibin yüzeyde doğrulayabildiği bulguları kaydedin.</div></div><button className="icon-btn" onClick={() => setDialog(null)} aria-label="İşaret formunu kapat"><X size={17} /></button></div>
          <div className="modal-content">
            <div className="field-block"><label className="field-label" htmlFor="marker-name">İşaret adı</label><input className="field" id="marker-name" value={markerName} onChange={(event) => setMarkerName(event.target.value)} placeholder="Örn. Moda vana odası" /></div>
            <div className="field-grid">
              <div className="field-block"><label className="field-label" htmlFor="marker-type">Yüzey işareti türü</label><select className="select" id="marker-type" value={markerType} onChange={(event) => setMarkerType(event.target.value as MarkerType)}>{MARKER_OPTIONS.map((option) => <option value={option} key={option}>{enumLabel(option)}</option>)}</select></div>
              <div className="field-block"><label className="field-label" htmlFor="marker-utility">Altyapı türü</label><select className="select" id="marker-utility" value={markerUtility} onChange={(event) => setMarkerUtility(event.target.value as UtilityType)}>{UTILITY_OPTIONS.map((option) => <option value={option} key={option}>{enumLabel(option)}</option>)}</select></div>
            </div>
            <div className="hint">Yerel örnek düzenleme · Gerçek API'ye kayıt yapılmaz.</div>
          </div>
          <div className="modal-actions"><button className="btn" onClick={() => setDialog(null)}>İptal</button><button className="btn btn-primary" onClick={saveMarker}><Check size={14} /> İşareti kaydet</button></div>
        </div>
      </div>}
      {toast && <div className="toast-msg" role="status">{toast}</div>}
    </div>
  </div>;
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="metric"><div><div className="metric-label">{label}</div><div className="metric-value" data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</div></div><div className="metric-icon">{icon}</div></div>;
}

function AssetRow({ asset }: { asset: Asset }) {
  return <div className="asset-row" data-testid={`asset-result-${asset.id}`}><div><div className="asset-name">{enumLabel(asset.utilityType)} hattı</div><div className="asset-meta">{asset.depthMeters} m · {Math.round(asset.confidence * 100)}% güven</div></div><span className={`risk-badge ${asset.riskLevel >= 4 ? 'risk-high' : asset.riskLevel >= 3 ? 'risk-medium' : 'risk-low'}`}>Risk {asset.riskLevel}/5</span></div>;
}

function StaticMap({ markers, assets, selectedMarker, onMarkerSelect }: { markers: Marker[]; assets: Asset[]; selectedMarker: string; onMarkerSelect: (id: string) => void }) {
  const point = (lat: number, lon: number) => ({ x: 470 + (lon - 29.03) * 30000, y: 270 - (lat - 40.99) * 30000 });
  const zone = [[300, 120], [530, 105], [570, 255], [415, 325], [275, 245]];
  return <svg className="vector-map" viewBox="0 0 900 540" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Kadıköy sokak haritası, yüzey işaretleri ve tahmini altyapı hatları">
    <defs><pattern id="map-grid" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0H0V12" fill="none" stroke="#d5d9ca" strokeWidth=".5" opacity=".35" /></pattern></defs>
    <rect width="900" height="540" fill="#e7e8db" />
    <path d="M0 438 C130 410 226 466 339 437S575 410 900 444V540H0Z" fill="#d7e2db" />
    <path d="M0 438 C130 410 226 466 339 437S575 410 900 444" fill="none" stroke="#b5c9bf" strokeWidth="2" />
    <rect width="900" height="540" fill="url(#map-grid)" />
    <g fill="#dce2d4" stroke="#c9d1c5" strokeWidth="1">
      <path d="M52 28h188v95H52zM268 25h190v90H268zM495 30h148v100H495zM686 20h172v105H686z" />
      <path d="M28 176h152v112H28zM220 165h185v115H220zM449 166h196v114H449zM686 157h186v122H686z" />
      <path d="M64 321h164v91H64zM267 315h184v102H267zM488 311h173v102H488zM696 316h168v103H696z" />
    </g>
    <g fill="none" stroke="#faf9f1" strokeWidth="18" strokeLinecap="round">
      <path d="M-15 147L915 126M-20 300L920 283M-20 420L920 395M175 -20L212 455M425 -20L446 455M665 -20L678 455M820 -20L800 455" />
      <path d="M18 359L336 65M266 452L745 20M454 455L873 180" />
    </g>
    <g fill="none" stroke="#c9cdbf" strokeWidth="1.2">
      <path d="M-15 147L915 126M-20 300L920 283M-20 420L920 395M175 -20L212 455M425 -20L446 455M665 -20L678 455M820 -20L800 455" />
      <path d="M18 359L336 65M266 452L745 20M454 455L873 180" />
    </g>
    <g fontFamily="DM Sans, sans-serif" fontSize="12" fill="#8b9389">
      <text x="355" y="136" transform="rotate(-1 355 136)">BAHARİYE CADDESİ</text>
      <text x="360" y="291" transform="rotate(-1 360 291)">MODA CADDESİ</text>
      <text x="354" y="411" transform="rotate(-1 354 411)">RIHTIM CADDESİ</text>
      <text x="670" y="235" transform="rotate(-88 670 235)">GENERAL ASIM GÜNDÜZ CD.</text>
      <text x="802" y="345" fontSize="17" fontWeight="700" fill="#789387">KADIKÖY</text>
      <text x="76" y="400" fontSize="11">MARMARA DENİZİ</text>
    </g>
    <polygon points={zone.map(([x, y]) => `${x},${y}`).join(' ')} fill="#d4a04a" fillOpacity=".17" stroke="#bd8537" strokeWidth="2" strokeDasharray="7 5" />
    {assets.map((asset) => {
      const start = point(asset.start.lat, asset.start.lon);
      const end = point(asset.end.lat, asset.end.lon);
      return <g key={asset.id}><line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#c74739" strokeWidth="4" strokeDasharray="8 7" strokeLinecap="round" opacity=".92" /><circle cx={(start.x + end.x) / 2} cy={(start.y + end.y) / 2} r="9" fill="#fff8f4" stroke="#c74739" strokeWidth="2" /><text x={(start.x + end.x) / 2 + 13} y={(start.y + end.y) / 2 - 9} className="map-label">{enumLabel(asset.utilityType)} hattı</text></g>;
    })}
    {markers.map((marker) => {
      const { x, y } = point(marker.lat, marker.lon);
      const selected = selectedMarker === marker.id;
      return <g key={marker.id} className="map-pin" onClick={() => onMarkerSelect(marker.id)} style={{ cursor: 'pointer' }}>
        {selected && <circle cx={x} cy={y - 4} r="18" fill="#d4a14c" fillOpacity=".22" />}
        <path d={`M${x} ${y + 9}c-5-7-11-12-11-19a11 11 0 1 1 22 0c0 7-6 12-11 19Z`} fill={selected ? '#d4a14c' : '#fbf9ef'} stroke={selected ? '#fff' : '#2a7169'} strokeWidth="2" />
        <circle cx={x} cy={y - 10} r="3.4" fill="#28645e" />
        <rect x={x + 15} y={y - 24} width={Math.max(60, marker.name.length * 6)} height="17" rx="3" fill="#f8f6ec" stroke="#d6d8ca" />
        <text x={x + 20} y={y - 12} className="map-label">{marker.name}</text>
      </g>;
    })}
    <g transform="translate(25 492)"><path d="M0 15h75" stroke="#71857d" strokeWidth="2" /><path d="M0 11v8M75 11v8" stroke="#71857d" /><text x="0" y="9" fontFamily="DM Mono, monospace" fontSize="9" fill="#52645e">250 m</text></g>
    <g transform="translate(818 490)"><rect width="58" height="23" rx="4" fill="#f9f8f1" opacity=".9" /><text x="7" y="15" fontFamily="DM Sans, sans-serif" fontSize="8" fill="#697976">Kadıköy</text></g>
  </svg>;
}
