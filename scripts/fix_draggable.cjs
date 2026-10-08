const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, '../artifacts/antigravity/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// 1. Add refs to the state block
const refInjection = `
  const arRef = useRef<HTMLDivElement>(null);
  const lidarRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const sinkholeRef = useRef<HTMLDivElement>(null);
  const fluidRef = useRef<HTMLDivElement>(null);
  const costRef = useRef<HTMLDivElement>(null);
`;
if (!content.includes('const arRef = useRef')) {
    const hooksPattern = "const [activePanels, setActivePanels]";
    const hooksIndex = content.indexOf(hooksPattern);
    content = content.substring(0, hooksIndex) + refInjection + content.substring(hooksIndex);
}

// 2. Add nodeRef to Draggable and ref to its child div
// AR Camera
content = content.replace(
  /<Draggable handle="\.handle-ar">\s*<div style={{ position: 'absolute'/g,
  '<Draggable nodeRef={arRef} handle=".handle-ar">\n            <div ref={arRef} style={{ position: \'absolute\''
);

// Lidar
content = content.replace(
  /<Draggable handle="\.handle-lidar">\s*<div style={{ position: 'absolute'/g,
  '<Draggable nodeRef={lidarRef} handle=".handle-lidar">\n            <div ref={lidarRef} style={{ position: \'absolute\''
);

// Time Machine
content = content.replace(
  /<Draggable handle="\.handle-time">\s*<div style={{ position: 'absolute'/g,
  '<Draggable nodeRef={timeRef} handle=".handle-time">\n            <div ref={timeRef} style={{ position: \'absolute\''
);

// Sinkhole
content = content.replace(
  /<Draggable handle="\.handle-sinkhole">\s*<div style={{ position: 'absolute'/g,
  '<Draggable nodeRef={sinkholeRef} handle=".handle-sinkhole">\n            <div ref={sinkholeRef} style={{ position: \'absolute\''
);

// Fluid Sim
content = content.replace(
  /<Draggable handle="\.handle-fluid">\s*<div style={{ position: 'absolute'/g,
  '<Draggable nodeRef={fluidRef} handle=".handle-fluid">\n            <div ref={fluidRef} style={{ position: \'absolute\''
);

// Cost Calc
content = content.replace(
  /<Draggable handle="\.handle-cost">\s*<div style={{ position: 'absolute'/g,
  '<Draggable nodeRef={costRef} handle=".handle-cost">\n            <div ref={costRef} style={{ position: \'absolute\''
);

fs.writeFileSync(appTsxPath, content);
console.log("Fixed react-draggable strict mode error by adding nodeRef and ref to all panels.");
