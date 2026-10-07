import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import {
  GetAssetsQueryParams,
  GetAssetsResponse,
  PredictRouteBody,
  PredictRouteResponse,
} from "@workspace/api-zod";
import {
  db,
  surfaceMarkersTable,
  undergroundAssetsTable,
} from "@workspace/db";
import { distanceMeters } from "../lib/geo";

const router: IRouter = Router();

function assetDto(asset: typeof undergroundAssetsTable.$inferSelect) {
  return {
    id: asset.id,
    utilityType: asset.utilityType,
    start: { lat: asset.startLat, lon: asset.startLon },
    end: { lat: asset.endLat, lon: asset.endLon },
    depthMeters: asset.depthMeters,
    confidence: asset.confidence,
    dataSource: asset.dataSource,
    riskLevel: asset.riskLevel,
    createdAt: asset.createdAt.toISOString(),
  };
}

router.get("/v1/assets", async (req, res): Promise<void> => {
  const query = GetAssetsQueryParams.safeParse({
    lat: Number(req.query.lat),
    lon: Number(req.query.lon),
    radius: req.query.radius === undefined ? undefined : Number(req.query.radius),
  });
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const center = { lat: query.data.lat, lon: query.data.lon };
  const spatialMatches = await db.execute(sql`
    SELECT id
    FROM underground_assets
    WHERE ST_DWithin(
      ST_SetSRID(ST_MakePoint(${center.lon}, ${center.lat}), 4326)::geography,
      ST_SetSRID(
        ST_MakeLine(
          ST_MakePoint(start_lon, start_lat),
          ST_MakePoint(end_lon, end_lat)
        ),
        4326
      )::geography,
      ${query.data.radius ?? 500}
    )
  `);
  const nearbyIds = new Set(spatialMatches.rows.map((row) => String(row.id)));
  const assets = await db.select().from(undergroundAssetsTable);
  const nearby = assets.filter((asset) => nearbyIds.has(asset.id)).map(assetDto);
  res.json(GetAssetsResponse.parse(nearby));
});

router.post("/v1/predictions", async (req, res): Promise<void> => {
  const input = PredictRouteBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }
  if (input.data.markerAId === input.data.markerBId) {
    res.status(400).json({ error: "Select two different surface markers." });
    return;
  }
  const [markerA, markerB] = await Promise.all([
    db
      .select()
      .from(surfaceMarkersTable)
      .where(eq(surfaceMarkersTable.id, input.data.markerAId))
      .then((rows) => rows[0]),
    db
      .select()
      .from(surfaceMarkersTable)
      .where(eq(surfaceMarkersTable.id, input.data.markerBId))
      .then((rows) => rows[0]),
  ]);
  if (!markerA || !markerB) {
    res.status(400).json({ error: "Both surface markers must exist." });
    return;
  }
  if (markerA.utilityType !== markerB.utilityType) {
    res.status(400).json({ error: "Markers must represent the same utility type." });
    return;
  }
  const start = { lat: markerA.lat, lon: markerA.lon };
  const end = { lat: markerB.lat, lon: markerB.lon };
  const distance = distanceMeters(start, end);
  if (distance > 100) {
    res.status(400).json({ error: "Selected markers are more than 100 m apart." });
    return;
  }

  const existing = await db
    .select()
    .from(undergroundAssetsTable)
    .where(
      and(
        eq(undergroundAssetsTable.utilityType, markerA.utilityType),
        eq(undergroundAssetsTable.startLat, markerA.lat),
        eq(undergroundAssetsTable.startLon, markerA.lon),
        eq(undergroundAssetsTable.endLat, markerB.lat),
        eq(undergroundAssetsTable.endLon, markerB.lon),
      ),
    )
    .then((rows) => rows[0]);
  if (existing) {
    res.status(201).json(PredictRouteResponse.parse(assetDto(existing)));
    return;
  }

  const depthByUtility: Record<string, number> = {
    gas: 1.2,
    water: 1.4,
    sewer: 1.5,
    electric: 0.8,
    fiber: 0.6,
  };
  const riskByUtility: Record<string, number> = {
    gas: 5,
    electric: 4,
    water: 3,
    sewer: 2,
    fiber: 3,
  };
  const confidence = Math.max(
    0.45,
    Math.min(markerA.confidence, markerB.confidence) * (0.88 - distance / 1000),
  );
  const [created] = await db
    .insert(undergroundAssetsTable)
    .values({
      utilityType: markerA.utilityType,
      startLat: markerA.lat,
      startLon: markerA.lon,
      endLat: markerB.lat,
      endLon: markerB.lon,
      depthMeters: depthByUtility[markerA.utilityType] ?? 1,
      confidence,
      dataSource: "ai_prediction",
      riskLevel: riskByUtility[markerA.utilityType] ?? 3,
    })
    .returning();
  res.status(201).json(PredictRouteResponse.parse(assetDto(created)));
});

export default router;
