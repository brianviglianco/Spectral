# Spectral

Spectral es una plataforma end-to-end para auditar cumplimiento GDPR/ePrivacy, centrada en flujos de consentimiento OneTrust. El proyecto automatiza la captura de evidencias con Puppeteer, clasifica cookies y tracking mediante heurísticas + aprendizaje incremental y entrega reportes accionables para equipos legales, técnicos y de marketing. Además ofrece un dashboard web (Next.js) para monitorear ejecuciones y explorar resultados forenses.

## Características clave
- Pipeline automatizado de 9 etapas: captura, normalización, validación, enriquecimiento, auditoría, reportes y empaquetado forense.
- Soporte completo para CMP OneTrust con análisis limitado automático para otros CMPs.
- Motor de inteligencia de cookies (`backend/cookieIntelligence.js`) y sistema de aprendizaje continuo (`data/cookie_learning.json`) que disminuyen falsos positivos.
- Generación de múltiples artefactos: `.json` crudo, `.norm.json`, `.p0.json`, `.report.json`, reportes en texto por perfil y paquetes forenses con hashes SHA-256.
- Dashboard Next.js que dispara ejecuciones (`/api/analyze`), lista análisis recientes y muestra violaciones/GDPR con evidencias y capturas.

## Flujo del pipeline

```mermaid
flowchart TD
    start[CLI / Dashboard<br/>runConsoleSingle.mjs] --> crawl[Captura profesional<br/>backend/scripts/professionalAnalysis.js]
    crawl --> norm[Normalización<br/>*.norm.json]
    norm --> p0[Generación P0<br/>makeP0.mjs]
    p0 --> verify[Verificación estricta<br/>verifyP0.mjs]
    verify --> enrich[Enriquecimiento de evidencia<br/>enrichNorm.mjs]
    enrich --> audit[Auditoría GDPR + scoring<br/>auditDeep.mjs]
    audit --> report[Reportes narrativos<br/>reportGenerator.mjs]
    report --> forensic[Paquete forense<br/>forensicEnhanced.js]
forensic --> dashboard[Visualización & descarga<br/>dashboard Next.js]
```

## Documentación disponible

| Documento | Descripción |
|-----------|-------------|
| [docs/documentacion_spectral_v4.8.md](docs/documentacion_spectral_v4.8.md) | Historial funcional del proyecto, métricas de validación multi-país y roadmap v4.8. |
| [docs/architecture_assessment.md](docs/architecture_assessment.md) | Evaluación de arquitectura, operaciones y seguridad con mejoras priorizadas y plan de acción. |
| [docs/business_strategy.md](docs/business_strategy.md) | Estrategia comercial y de escalabilidad: packaging, GTM, roadmap SaaS y add-on IA de remediación. |

## Estructura de carpetas

```
.
├── backend/                   # Crawler Puppeteer, inteligencia y scripts de aprendizaje
│   ├── spectralCrawler.js      # Flujo OneTrust multi-stage (baseline, reject, accept…)
│   ├── scripts/                # professionalAnalysis.js y herramientas de entrenamiento
│   ├── cookieIntelligence.js   # Heurísticas conocidas de cookies/servicios
│   └── cookieLearning.js       # Base de conocimiento persistente (JSON)
├── runConsoleSingle.mjs        # Orquestador del pipeline completo (CLI)
├── runConsoleBatch.mjs         # Variante batch para múltiples URLs
├── auditDeep.mjs               # Motor de auditoría GDPR y scoring
├── enrichNorm.mjs              # Complementa norm.json con evidencia ampliada
├── reportGenerator.mjs         # Genera reportes para legal/marketing/tech/console
├── forensicEnhanced.js         # Arma paquetes forenses con hashes y HAR-lite
├── data/
│   └── cookie_learning.json    # Conocimiento aprendido entre ejecuciones
├── docs/
│   └── documentacion_spectral_v4.8.md  # Documentación funcional histórica
├── dashboard/                  # Dashboard Next.js 15 (React 19)
│   ├── app/                    # Páginas, API routes y UI
│   └── lib/api.js              # Lectura de reportes/screenhots en file system
└── screenshots/                # Capturas de cada stage (generadas en runtime)
```

## Requisitos
- Node.js 18.17+ en la raíz (Puppeteer 24 y scripts CLI).
- Dependencias de sistema para Chromium (la instalación de Puppeteer descarga un binario por defecto).
- Para el dashboard: Node.js 20+ recomendado para Next 15/Turbopack.
- Acceso a Internet durante las ejecuciones (necesario para auditar sitios y descargar Chrome si no existe cache).

## Puesta en marcha

### 1. Instalar dependencias del pipeline
```bash
npm install
```

### 2. Ejecutar un análisis completo
```bash
node runConsoleSingle.mjs --host https://ejemplo.com --lang es --zip
```
- `--lang` propaga el locale a Puppeteer (útil para reproducir banners por país).
- `--zip` invoca herramientas opcionales de empaquetado (`src/tools/forensicZip.mjs` si existe).
- La ejecución produce artefactos en `./reports/` y capturas en `./screenshots/`.

Para ejecutar múltiples dominios en cadena puedes usar `node runConsoleBatch.mjs` (espera un archivo `urls.txt` o modificar el script).

### 3. Revisar resultados
- `.report.json` y los `.txt` asociados contienen la narrativa para diferentes audiencias.
- `forensic-*/` guarda evidencia firmada y hashes para cadena de custodia.
- `docs/documentacion_spectral_v4.8.md` documenta hallazgos y métricas históricas (v4.8).

### 4. Dashboard (opcional)
```bash
cd dashboard
npm install
npm run dev
```
El dashboard utiliza rutas API locales que acceden al file system del proyecto. Por defecto `app/api/analyze/route.js` espera encontrar `runConsoleSingle.mjs` en `~/Desktop/Spectral`. Si cambiás la ubicación del repo, ajusta `scriptPath`/`spectralDir` en ese archivo antes de lanzar producción.

## Buenas prácticas y notas
- El pipeline actualmente ofrece análisis “full” únicamente para CMP OneTrust. Otros CMPs se procesan en modo “limited” con advertencias claras en los reportes.
- Mantén el archivo `data/cookie_learning.json` bajo control de versiones para aprovechar el aprendizaje incremental entre ejecuciones.
- `auditDeep.mjs --strict` puede finalizar con código no cero cuando encuentra violaciones críticas; el orquestador ya tolera este comportamiento.
- Antes de producir entregables, ejecuta `node scripts/manifest-tools.cjs verify reports/forensic` (definido en `package.json`) para validar integridad de los paquetes forenses.

## Recursos adicionales
- Documentación ampliada, métricas y roadmap: `docs/documentacion_spectral_v4.8.md`.
- Scripts auxiliares para backups y auditoría del workspace: ver `scripts/` y `backupSpectral.sh`.
- Capturas de ejemplo del dashboard: carpeta `screenshots/`.
