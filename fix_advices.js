const fs = require('fs');

const data = fs.readFileSync('src/components/Planning.tsx', 'utf8');

// I need to find `const advices = useMemo(() => {` inside the component
// wait, since I deleted lines 54,66 what is there now?
