// Antes do build, no Windows: o OneDrive transforma pastas do .next em
// marcadores "sob demanda" (reparse point 0x9000e01a), que o Node não apaga
// (EPERM no unlink), e o next build falha ao limpar a saída anterior. O
// PowerShell apaga. Mantém .next/dev (o next dev em uso) e .next/cache.
// Fora do Windows, não faz nada. Some quando o projeto sair do OneDrive.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

if (process.platform === "win32" && existsSync(".next")) {
  const script =
    "Get-ChildItem -LiteralPath .next -Force | Where-Object { $_.Name -notin @('dev','cache') } | Remove-Item -Recurse -Force";
  const result = spawnSync("powershell", ["-NoProfile", "-Command", script], {
    stdio: "inherit",
  });
  process.exit(result.status ?? 0);
}
