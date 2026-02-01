import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Paths
const indexHtmlPath = path.join(rootDir, "index.html");
const constantsPath = path.join(rootDir, "src", "constants", "configConstants.ts");

console.log("🚀 Preparando archivos para despliegue en GitHub...");

// 1. Modify index.html: Remove Tailwind CDN
try {
  let htmlContent = fs.readFileSync(indexHtmlPath, "utf-8");

  if (htmlContent.includes("cdn.tailwindcss.com")) {
    htmlContent = htmlContent.replace(
      /<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>/g,
      "<!-- Tailwind CDN removed for production build -->"
    );
    fs.writeFileSync(indexHtmlPath, htmlContent);
    console.log("✅ index.html: CDN de Tailwind eliminado.");
  } else {
    console.log("ℹ️ index.html: CDN no encontrado o ya eliminado.");
  }
} catch (err) {
  console.error("❌ Error modificando index.html:", err);
}

// 2. Modify src/constants/configConstants.ts: (Removed - now handled by Vite define in vite.config.ts)
console.log(
  "ℹ️ src/constants/configConstants.ts: Las variables de entorno ahora las maneja Vite directamente."
);

console.log("🏁 Preparación completada.");
