# Spectral – Arquitectura & Mejora Continua

Última actualización: 28 Oct 2025  
Autor: Codex (análisis plataforma web)

## 1. Hallazgos principales

### 1.1 Arquitectura & Código
- Pipeline lineal (`runConsoleSingle.mjs`) ejecuta todo en un solo proceso sin reintentos por etapa, lo que complica recuperarse de fallos parciales.
- Lógica de lectura de artefactos duplicada entre CLI y dashboard (`dashboard/lib/api.js` accede directo al filesystem). Falta una capa de servicio común.
- El dashboard depende de rutas absolutas (`~/Desktop/Spectral`) para ejecutar el crawler (`app/api/analyze/route.js`), reduciendo portabilidad.

### 1.2 Infraestructura & Operaciones
- No existen contenedores ni scripts de provisión. Difícil replicar entornos consistentes (crawlers requieren Chrome+deps).
- Jobs Puppeteer se lanzan vía `spawn(..., {detached:true})`, sin colas ni control de concurrencia; riesgo de procesos huérfanos y contención de recursos.
- Almacenamiento de reportes/forensics crece indefinidamente en disco local (`reports/`, `screenshots/`), sin políticas de rotación o archivado.

### 1.3 Seguridad & Cumplimiento
- APIs del dashboard carecen de autenticación / rate limiting; cualquiera puede lanzar escaneos o descargar evidencias.
- El crawler corre en la misma máquina del dashboard, sin sandbox específico. Sitios maliciosos podrían explotar Chromium.
- Artefactos (`.json`, `.txt`) se exponen sin sanitización previa. Riesgo de inyección de contenido en UI o reuso de datos sensibles.

## 2. Mejoras recomendadas

1. **Modularizar pipeline**  
   - Dividir etapas (crawl, normalize, audit, report) en jobs idempotentes.  
   - Introducir almacenamiento intermedio (ex. base de datos o colas) para trackear estado y permitir reintentos selectivos.

2. **Contenerización & despliegue reproducible**  
   - Crear imágenes Docker separadas para crawler y dashboard (incluyendo Chromium).  
   - Publicar `docker-compose` o manifiestos K8s para ambientes QA/producción.

3. **Abstraer almacenamiento y rutas**  
   - Reemplazar accesos directos a FS por una capa (S3/GCS, base de datos documental).  
   - Parametrizar rutas via variables de entorno en las rutas API del dashboard.

4. **Orquestación de trabajos**  
   - Sustituir `spawn` directo por cola (BullMQ, SQS, etc.) con workers dedicados.  
   - Implementar métricas de ejecución, timeouts y cancelación.

5. **Seguridad**  
   - Añadir autenticación (JWT/API keys) y rate limiting a APIs.  
   - Aislar Puppeteer en contenedores efímeros o servicios especializados (`browserless`).  
   - Sanitizar artefactos antes de exponerlos (whitelist de campos, escape en UI).

6. **Gobernanza de datos**  
   - Definir políticas de retención (TTL por artefacto) y limpieza automática.  
   - Cargar metadatos en base de datos para búsquedas y auditorías, manteniendo los binarios en storage frío.

## 3. Plan de acción

| Prioridad | Iniciativa | Entregables | Responsable sugerido | Tiempo estimado |
|-----------|------------|-------------|----------------------|-----------------|
| Alta | Contenerización inicial | Dockerfiles + compose para crawler/dashboard | DevOps | 1-2 semanas |
| Alta | Protección API | Middleware auth + rate limiting, secrets vía env | Backend | 1 semana |
| Alta | Cola de trabajos | Worker Node, integración con Redis/SQS, monitor básico | Backend | 2 semanas |
| Media | Refactor rutas FS | Config env + módulo de storage abstracto | Backend | 1-2 semanas |
| Media | Políticas de retención | Script de housekeeping + documentación | Ops | 1 semana |
| Media | Sanitización / validación | Filtros de salida y pruebas de seguridad | Backend/QA | 1 semana |
| Baja | Modularización pipeline | Reestructurar etapas + metadatos de ejecución | Backend | 3-4 semanas |
| Baja | Base de datos de metadatos | Diseño de esquema + ETL desde reportes | Data/Backend | 2 semanas |

Notas:
- Las iniciativas “Alta” mitigan riesgos inmediatos (exposición pública, procesos huérfanos).
- “Media” mejora mantenibilidad y coste operativo.
- “Baja” prepara la plataforma para escalar y soportar múltiples CMPs / clientes.

