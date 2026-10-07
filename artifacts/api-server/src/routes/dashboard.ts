import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { GetDashboardResponse } from "@workspace/api-zod";
import {
  db,
  surfaceMarkersTable,
  undergroundAssetsTable,
  zonesTable,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/v1/dashboard", async (_req, res): Promise<void> => {
  const [markers, assets, zones] = await Promise.all([
    db.select().from(surfaceMarkersTable),
    db
      .select()
      .from(undergroundAssetsTable)
      .orderBy(desc(undergroundAssetsTable.createdAt)),
    db.select().from(zonesTable),
  ]);
  const recentAssets = assets.slice(0, 5).map((asset) => ({
    id: asset.id,
    utilityType: asset.utilityType,
    start: { lat: asset.startLat, lon: asset.startLon },
    end: { lat: asset.endLat, lon: asset.endLon },
    depthMeters: asset.depthMeters,
    confidence: asset.confidence,
    dataSource: asset.dataSource,
    riskLevel: asset.riskLevel,
    createdAt: asset.createdAt.toISOString(),
  }));
  res.json(
    GetDashboardResponse.parse({
      markerCount: markers.length,
      assetCount: assets.length,
      zoneCount: zones.length,
      highRiskCount: assets.filter((asset) => asset.riskLevel >= 4).length,
      averageConfidence: assets.length
        ? assets.reduce((sum, asset) => sum + asset.confidence, 0) / assets.length
        : 0,
      recentAssets,
    }),
  );
});

export default router;
