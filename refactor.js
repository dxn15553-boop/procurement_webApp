const fs = require('fs');
let code = fs.readFileSync('components/procurement/ProcurementForm.tsx', 'utf-8');

// Insert isCancelled
code = code.replace(
  /const currentStage = watch\("currentStage"\);/,
  'const currentStage = watch("currentStage");\n  const isCancelled = currentStage === "CANCELLED" || !!sourceCancellationDate;'
);

// Replace all disabled={readOnly}
code = code.replace(/disabled=\{readOnly\}/g, 'disabled={readOnly || isCancelled}');

// Revert sourceCancellationDate
code = code.replace(
  /\{\.\.\.register\("sourceCancellationDate"\)\} disabled=\{readOnly \|\| isCancelled\}/,
  '{...register("sourceCancellationDate")} disabled={readOnly}'
);

// Revert currentStage
code = code.replace(
  /\{\.\.\.register\("currentStage"\)\} disabled=\{readOnly \|\| isCancelled\}/,
  '{...register("currentStage")} disabled={readOnly}'
);

fs.writeFileSync('components/procurement/ProcurementForm.tsx', code);
console.log("Refactored ProcurementForm.tsx");
