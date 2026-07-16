const fs = require('fs');
let code = fs.readFileSync('components/procurement/ProcurementSpreadsheet.tsx', 'utf-8');

// Replace all <input> and <select> with disabled property, but only if they don't already have one
// We'll just replace `<input` and `<select` with a disabled check
// Since this is JSX, we can just inject `disabled={row.currentStage === 'CANCELLED' || !!row.sourceCancellationDate}`
// But we need to make sure we don't disable the sourceCancellationDate and currentStage fields.

// Let's do a more precise replacement using regex for each cell.
// For inputs:
code = code.replace(/<input\s+type="([^"]+)"\s+value=\{row\.([a-zA-Z0-9_]+)\}/g, (match, type, field) => {
  if (field === 'sourceCancellationDate') return match;
  return `<input type="${type}" value={row.${field}} disabled={row.currentStage === "CANCELLED" || !!row.sourceCancellationDate}`;
});

code = code.replace(/<input\s+value=\{row\.([a-zA-Z0-9_]+)\}/g, (match, field) => {
  if (field === 'sourceCancellationDate') return match;
  return `<input value={row.${field}} disabled={row.currentStage === "CANCELLED" || !!row.sourceCancellationDate}`;
});

// For selects:
code = code.replace(/<select\s+value=\{row\.([a-zA-Z0-9_]+)\}/g, (match, field) => {
  if (field === 'currentStage') return match;
  return `<select value={row.${field}} disabled={row.currentStage === "CANCELLED" || !!row.sourceCancellationDate}`;
});

fs.writeFileSync('components/procurement/ProcurementSpreadsheet.tsx', code);
console.log("Refactored ProcurementSpreadsheet.tsx");
