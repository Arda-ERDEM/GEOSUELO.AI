import { pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const surfaceMarkersTable = pgTable("surface_markers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  lat: real("lat").notNull(),
  lon: real("lon").notNull(),
  type: text("type").notNull(),
  utilityType: text("utility_type").notNull(),
  confidence: real("confidence").notNull().default(0.8),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
