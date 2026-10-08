const fs = require('fs');
const path = require('path');

const assetsPath = path.join(__dirname, '../artifacts/api-server/src/routes/assets.ts');
let content = fs.readFileSync(assetsPath, 'utf8');

const newMockAssets = `let mockAssets: any[] = [
  // WATER PIPES
  { id: "w1", utilityType: "water", startLat: 40.988, startLon: 29.025, endLat: 40.993, endLon: 29.035, depthMeters: 1.4, confidence: 0.9, dataSource: "manual", riskLevel: 3, createdAt: new Date() },
  { id: "w2", utilityType: "water", startLat: 40.989, startLon: 29.027, endLat: 40.985, endLon: 29.030, depthMeters: 1.2, confidence: 0.8, dataSource: "manual", riskLevel: 2, createdAt: new Date() },
  
  // GAS PIPES
  { id: "g1", utilityType: "gas", startLat: 40.987, startLon: 29.022, endLat: 40.992, endLon: 29.030, depthMeters: 1.0, confidence: 0.95, dataSource: "manual", riskLevel: 4, createdAt: new Date() },
  { id: "g2", utilityType: "gas", startLat: 40.992, startLon: 29.030, endLat: 40.995, endLon: 29.038, depthMeters: 1.1, confidence: 0.85, dataSource: "manual", riskLevel: 4, createdAt: new Date() },
  
  // FIBER / ELECTRIC
  { id: "f1", utilityType: "fiber", startLat: 40.990, startLon: 29.020, endLat: 40.990, endLon: 29.035, depthMeters: 0.6, confidence: 0.99, dataSource: "manual", riskLevel: 2, createdAt: new Date() },
  { id: "e1", utilityType: "electric", startLat: 40.986, startLon: 29.032, endLat: 40.995, endLon: 29.035, depthMeters: 0.8, confidence: 0.9, dataSource: "manual", riskLevel: 3, createdAt: new Date() },
];`;

content = content.replace(/let mockAssets: any\[\] = \[[\s\S]*?\];/, newMockAssets);
fs.writeFileSync(assetsPath, content);
console.log("Mock assets updated.");
