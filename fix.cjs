const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const lines = code.split('\n');
lines.splice(405, 14, 
"          <NavItem ",
"            icon={<Target size={24} />} ",
"            label=\"Planejamento\" ",
"            isActive={currentTab === 'planning'} ",
"            onClick={() => setCurrentTab('planning')} ",
"          />",
"          <NavItem ",
"            icon={<BarChart2 size={24} />}",
"            label=\"Análise\"",
"            isActive={currentTab === 'comparison'}",
"            onClick={() => setCurrentTab('comparison')}",
"          />"
);
fs.writeFileSync('src/App.tsx', lines.join('\n'));
