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
  res.json(
    GetDashboardResponse.parse({
      markerCount: 15,
      assetCount: 42,
      zoneCount: 3,
      highRiskCount: 5,
      averageConfidence: 0.85,
      recentAssets: [
        {
          id: "mock-asset-1",
          utilityType: "gas",
          start: { lat: 40.99, lon: 29.03 },
          end: { lat: 40.991, lon: 29.031 },
          depthMeters: 1.2,
          confidence: 0.9,
          dataSource: "ai_prediction",
          riskLevel: 4,
          createdAt: new Date().toISOString(),
        }
      ],
    }),
  );
});

export default router;
