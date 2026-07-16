const fs = require('fs');
let code = fs.readFileSync('components/procurement/ProcurementSpreadsheet.tsx', 'utf-8');

code = code.replace(
  /<input type="text" value=\{row\.currentStage\} disabled=\{row\.currentStage === "CANCELLED" \|\| !!row\.sourceCancellationDate\}/g,
  '<input type="text" value={row.currentStage}'
);

fs.writeFileSync('components/procurement/ProcurementSpreadsheet.tsx', code);
console.log("Reverted currentStage in Spreadsheet");
