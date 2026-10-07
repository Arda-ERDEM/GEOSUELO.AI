import { pgTable, integer, real, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const undergroundAssetsTable = pgTable("underground_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  utilityType: text("utility_type").notNull(),
  startLat: real("start_lat").notNull(),
  startLon: real("start_lon").notNull(),
  endLat: real("end_lat").notNull(),
  endLon: real("end_lon").notNull(),
  depthMeters: real("depth_meters").notNull(),
  confidence: real("confidence").notNull(),
  dataSource: text("data_source").notNull().default("ai_prediction"),
  riskLevel: integer("risk_level").notNull().default(3),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
