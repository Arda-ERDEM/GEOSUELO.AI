const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, '../artifacts/antigravity/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// Replace the main page-wrap structure
const startPattern = '<div className="page-wrap">';
const endPattern = '</main>';

const startIndex = content.indexOf(startPattern);
const endIndex = content.indexOf(endPattern);

if (startIndex === -1 || endIndex === -1) {
  console.error("Patterns not found.");
  process.exit(1);
}

const newStructure = `
        {/* HARİTA ALANI - TAM EKRAN */}
        <div className="full-map-card">
          <div className="map-head" style={{ zIndex: 1100, position: 'absolute', top: 0, right: 0, background: 'rgba(255,255,255,0.8)', padding: '4px 8px', borderRadius: '0 0 0 8px' }}>
            <div className="map-controls">
              <button className="map-control" aria-label="Yakınlaştır" onClick={() => setViewZoom((z) => Math.min(19, z + 1))}><Plus size={13} /></button>
              <button className="map-control" aria-label="Uzaklaştır" onClick={() => setViewZoom((z) => Math.max(10, z - 1))}><Minus size={13} /></button>
              <button className="map-control" aria-label="Harita merkezini sıfırla" onClick={() => { setSearchCenter(MAP); setSearchLat(String(MAP.lat)); setSearchLon(String(MAP.lon)); setViewZoom(15); }}><Crosshair size={13} /></button>
            </div>
          </div>
          <MapContainer center={[MAP.lat, MAP.lon]} zoom={15} minZoom={3} maxZoom={20} zoomControl={false} scrollWheelZoom className="leaflet-map" style={{ height: '100%' }}>
            <LayersControl position="bottomright">
              <LayersControl.BaseLayer checked name="Standart Harita">
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Karanlık Mod">
                <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Uydu">
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
            <ScaleControl position="bottomleft" imperial={false} />
            {visibleAssets.map((asset) => <Polyline key={asset.id} positions={[[asset.start.lat, asset.start.lon] as [number, number], [asset.end.lat, asset.end.lon] as [number, number]]} pathOptions={{ color: UTILITY_COLORS[asset.utilityType] ?? '#c74739', weight: 4, opacity: 0.9, dashArray: '8 7', lineCap: 'round' }} />)}
            {zones.map((zone) => <Polygon key={zone.id} positions={zone.polygon.map((point) => [point.lat, point.lon] as [number, number])} pathOptions={{ color: zone.id === selectedZone ? '#a66a25' : '#bd8537', weight: 2, dashArray: '7 5', fillColor: '#d4a04a', fillOpacity: zone.id === selectedZone ? 0.2 : 0.12 }} />)}
            {zonePoints.length >= 3
              ? <Polygon positions={zonePoints.map((point) => [point.lat, point.lon] as [number, number])} pathOptions={{ color: '#bd8537', weight: 2, dashArray: '5 4', fillColor: '#d4a04a', fillOpacity: 0.16 }} />
              : zonePoints.length >= 2 && <Polyline positions={zonePoints.map((point) => [point.lat, point.lon] as [number, number])} pathOptions={{ color: '#bd8537', weight: 2, dashArray: '5 4' }} />}
            {zonePoints.map((point, index) => <CircleMarker key={\`draft-\${index}\`} center={[point.lat, point.lon]} radius={5} pathOptions={{ color: '#fff', weight: 2, fillColor: '#c68d3e', fillOpacity: 1 }} />)}
            {markers.map((marker) => {
              return <Marker key={marker.id} position={[marker.lat, marker.lon]} icon={markerIcon(marker.type, marker.name, selectedMarker === marker.id, marker.utilityType)} eventHandlers={{ click: () => setSelectedMarker(marker.id) }} title={\`\${marker.name} · \${enumLabel(marker.utilityType)}\`} bubblingMouseEvents={false} />;
            })}
          </MapContainer>
          {zoneDrawing && <div className="map-callout" style={{ zIndex: 2000, position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)' }}>Haritaya tıklayarak bölge köşelerini ekleyin · {zonePoints.length} nokta</div>}
        </div>

        {/* TOOLBAR */}
        <div className="map-toolbar">
          <button className={\`tool-btn \${activePanel === 'metrics' ? 'active' : ''}\`} onClick={() => setActivePanel(p => p === 'metrics' ? 'none' : 'metrics')}><Activity size={18} /> Özet Metrikler & Lejant</button>
          <button className={\`tool-btn \${activePanel === 'markers' ? 'active' : ''}\`} onClick={() => setActivePanel(p => p === 'markers' ? 'none' : 'markers')}><Crosshair size={18} /> Yüzey İşaretleri</button>
          <button className={\`tool-btn \${activePanel === 'assets' ? 'active' : ''}\`} onClick={() => setActivePanel(p => p === 'assets' ? 'none' : 'assets')}><Search size={18} /> Yakındaki Varlıklar & Kazı</button>
          <button className={\`tool-btn \${activePanel === 'competitor' ? 'active' : ''}\`} onClick={() => setActivePanel(p => p === 'competitor' ? 'none' : 'competitor')}><CircleHelp size={18} /> Rakip Analizi</button>
        </div>

        {/* PANELS */}
        {activePanel === 'metrics' && (
          <div className="floating-panel">
            <div className="panel-head"><div className="panel-title"><Activity size={14} color="#34746a" /> Saha Özet Metrikleri</div><button className="icon-btn" onClick={() => setActivePanel('none')}><X size={16} /></button></div>
            <div className="panel-body">
              <div className="metrics" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Metric label="Yüzey işaretleri" value={dashboard.data?.markerCount} icon={<Crosshair size={15} />} loading={dashboard.isLoading} />
                <Metric label="Haritalı hatlar" value={dashboard.data?.assetCount} icon={<Cable size={15} />} loading={dashboard.isLoading} />
                <Metric label="Kazı bölgeleri" value={dashboard.data?.zoneCount} icon={<Triangle size={15} />} loading={dashboard.isLoading} />
                <Metric label="Yüksek riskli hatlar" value={dashboard.data?.highRiskCount} icon={<AlertTriangle size={15} />} loading={dashboard.isLoading} />
              </div>
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e1e7e4' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#34746a', marginBottom: 12 }}>Altyapı Renkleri (Lejant)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px' }}>
                  {UTILITY_OPTIONS.map(opt => (
                    <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#455' }}>
                      <div style={{ width: 14, height: 4, background: UTILITY_COLORS[opt], borderRadius: 2 }} />
                      <span style={{ textTransform: 'capitalize' }}>{enumLabel(opt)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e1e7e4' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#34746a', marginBottom: 8 }}>Güven profili</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div className="metric-value" style={{ fontSize: 24 }}>{dashboard.data ? \`\${Math.round(dashboard.data.averageConfidence * 100)}%\` : '—'}</div></div></div>
                <div style={{ height: 5, borderRadius: 9, background: '#e5e5da', margin: '8px 0', overflow: 'hidden' }}><div style={{ width: \`\${Math.min(100, (dashboard.data?.averageConfidence ?? 0) * 100)}%\`, height: '100%', background: '#438275', borderRadius: 9 }} /></div>
                <div className="hint" style={{ fontSize: 11 }}>Güven puanı, yüzey işaretinin gözlem kalitesini gösterir.</div>
              </div>
            </div>
          </div>
        )}

        {activePanel === 'markers' && (
          <div className="floating-panel">
            <div className="panel-head"><div className="panel-title"><Crosshair size={14} color="#34746a" /> Yüzey işaretleri <span className="panel-kicker">{markers.length} kayıtlı</span></div><div><button className="icon-btn" onClick={() => setActivePanel('none')}><X size={16} /></button></div></div>
            <div className="panel-body">
              <button className="btn btn-primary" onClick={() => openNewMarker()} style={{ width: '100%', marginBottom: 16 }}><Plus size={13} /> Yeni Yüzey İşareti Ekle</button>
              {markersQuery.isLoading ? <div style={{ padding: '4px 12px' }}><div className="loading-row" /><div className="loading-row" /></div> : markers.length ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {markers.map(marker => (
                  <div key={marker.id} className="asset-row" onClick={() => setSelectedMarker(marker.id)} style={{ cursor: 'pointer', border: selectedMarker === marker.id ? '1px solid #34746a' : undefined }}>
                    <div>
                      <div className="asset-name" style={{ color: UTILITY_COLORS[marker.utilityType] ?? '#000' }}>{marker.name}</div>
                      <div className="asset-meta">{enumLabel(marker.type)} · {enumLabel(marker.utilityType)}</div>
                    </div>
                    <div className="table-actions">
                      <button className="icon-btn" onClick={(e) => { e.stopPropagation(); openEditMarker(marker); }}><Edit3 size={13} /></button>
                      <button className="icon-btn" onClick={(e) => { e.stopPropagation(); removeMarker(marker); }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div> : <div className="empty-state">Kayıtlı yüzey işareti yok.</div>}
            </div>
          </div>
        )}

        {activePanel === 'assets' && (
          <div className="floating-panel">
            <div className="panel-head"><div className="panel-title"><Search size={14} color="#34746a" /> Yakındaki Varlıklar</div><button className="icon-btn" onClick={() => setActivePanel('none')}><X size={16} /></button></div>
            <div className="panel-body">
              <div className="field-grid">
                <div><label className="field-label">Enlem</label><input className="field mono" value={searchLat} onChange={(e) => setSearchLat(e.target.value)} /></div>
                <div><label className="field-label">Boylam</label><input className="field mono" value={searchLon} onChange={(e) => setSearchLon(e.target.value)} /></div>
              </div>
              <div className="field-row" style={{ marginTop: 8, alignItems: 'end' }}>
                <div><label className="field-label">Yarıçap · m</label><input className="field mono" type="number" min="1" max="5000" value={radiusInput} onChange={(e) => setRadiusInput(e.target.value)} /></div>
                <button className="btn btn-primary" onClick={searchNearby} disabled={assetsQuery.isFetching}><Search size={13} /> Ara</button>
              </div>
              <div className="asset-list" style={{ marginTop: 16 }}>
                {assetsQuery.isLoading ? <><div className="loading-row" /><div className="loading-row" /></> : assets.length ? assets.slice(0, 5).map((asset) => <AssetRow asset={asset} key={asset.id} />) : <div className="empty-state">Varlık bulunamadı.</div>}
              </div>

              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e1e7e4' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#34746a', marginBottom: 12 }}>Tahmini Güzergâh (AI)</div>
                <div className="field-block"><label className="field-label">Başlangıç İşareti</label><select className="select" value={routeFrom} onChange={(e) => setRouteFrom(e.target.value)}><option value="">Seçiniz...</option>{markers.map((m) => <option value={m.id} key={m.id}>{m.name} ({enumLabel(m.utilityType)})</option>)}</select></div>
                <div className="field-block"><label className="field-label">Bitiş İşareti</label><select className="select" value={routeTo} onChange={(e) => setRouteTo(e.target.value)} disabled={!routeFrom}><option value="">Seçiniz...</option>{compatibleMarkers.map((m) => <option value={m.id} key={m.id}>{m.name} ({enumLabel(m.utilityType)})</option>)}</select></div>
                <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={runPrediction} disabled={!routeFrom || !routeTo || routeFrom === routeTo || predictRoute.isPending}>{predictRoute.isPending ? 'Bağlanıyor…' : <><Route size={13} /> Hat güzergâhını tahmin et</>}</button>
              </div>

              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e1e7e4' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#34746a', marginBottom: 12 }}>Kazı ve Çakışma Analizi</div>
                <button className="btn btn-danger" style={{ width: '100%' }} onClick={startZone} disabled={zoneDrawing}><Triangle size={13} /> Yeni Kazı Sınırı Çiz</button>
              </div>
            </div>
          </div>
        )}

        {activePanel === 'competitor' && (
          <div className="floating-panel">
            <div className="panel-head"><div className="panel-title"><CircleHelp size={14} color="#34746a" /> AntiGravity vs Mevcut Sistemler</div><button className="icon-btn" onClick={() => setActivePanel('none')}><X size={16} /></button></div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="hint" style={{ fontSize: 12, lineHeight: 1.5, color: '#438275' }}>
                <strong style={{ color: '#254e47' }}>1. Yüksek Donanım Maliyeti</strong><br />
                <em>Eksi:</em> Otonom rover filolarına (donanıma) bağımlıdırlar.<br />
                <em>Etkisi:</em> Küresel ölçeklenmeyi yavaşlatır; her şehre donanım gönderilemez.
              </div>
              <div className="hint" style={{ fontSize: 12, lineHeight: 1.5, color: '#438275' }}>
                <strong style={{ color: '#254e47' }}>2. Zorlu Coğrafya Kısıtları</strong><br />
                <em>Eksi:</em> GPR roverların çalışabilmesi için düz ve açık zemin gerekir.<br />
                <em>Etkisi:</em> Engebeli veya yoğun trafiğe sahip sokaklarda haritalama yapması neredeyse imkansızdır.
              </div>
              <div className="hint" style={{ fontSize: 12, lineHeight: 1.5, color: '#438275' }}>
                <strong style={{ color: '#254e47' }}>3. Radara Güvenmenin Limitleri</strong><br />
                <em>Eksi:</em> Yere nüfuz eden radarlar ıslak zeminlerde derinlere inemez.<br />
                <em>Etkisi:</em> Boru türlerini ayırt etmekte veri kaybı yaşarlar.
              </div>
              <div className="hint" style={{ fontSize: 12, lineHeight: 1.5, color: '#438275' }}>
                <strong style={{ color: '#254e47' }}>4. Aktif Güvenlik Olmaması</strong><br />
                <em>Eksi:</em> Sadece statik harita sunarlar, gerçek zamanlı alarm içermezler.<br />
                <em>Etkisi:</em> Operatör haritaya bakmayı unutursa kazı anında boru yine de patlatılabilir.
              </div>
              <div className="hint" style={{ fontSize: 12, lineHeight: 1.5, color: '#438275' }}>
                <strong style={{ color: '#254e47' }}>5. Bürokratik Entegrasyon Eksikliği</strong><br />
                <em>Eksi:</em> Genellikle sadece ABD 811 sistemlerine göre tasarlanmışlardır.<br />
                <em>Etkisi:</em> Yerel yönetimlerin geçmiş kazı arşivlerini dahil edecek altyapıları eksiktir.
              </div>
            </div>
          </div>
        )}
      </main>
`;

content = content.substring(0, startIndex) + newStructure + content.substring(endIndex + 7);

fs.writeFileSync(appTsxPath, content);
console.log("Success");
