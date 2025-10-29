# Spectral - Hoja de Ruta del Producto

**Versión:** 1.0
**Última Actualización:** 28 Oct 2025
**Horizonte de Planificación:** 6 meses (Nov 2025 - Abr 2026)

---

## Resumen

Esta hoja de ruta describe la evolución de Spectral desde herramienta CLI hasta plataforma SaaS enterprise en 3 fases principales:

1. **Fase 1: MVP SaaS** (8 semanas) - Producto core con modelo freemium
2. **Fase 2: Características de Crecimiento** (8 semanas) - Capacidades avanzadas para usuarios Pro
3. **Fase 3: Enterprise y Escala** (8+ semanas) - Soporte multi-CMP, API, SSO

**Métrica North Star:** Ingresos Recurrentes Mensuales (MRR)
**Objetivo de Éxito:** $10K MRR para el Mes 6

---

## Fase 1: MVP SaaS (Semanas 1-8)

**Objetivo:** Transformar Spectral en SaaS desplegable con autenticación, modelo freemium y facturación.

**Métricas Objetivo:**
- 100+ registros
- 5 usuarios Pro pagando ($500 MRR)
- 95%+ tasa de éxito de análisis
- <90s tiempo de análisis

### Semana 1: Fundamentos e Infraestructura
**Tema:** Hacerlo desplegable

| Día | Tareas | Responsable | Estado |
|-----|-------|-------|--------|
| Lun | - Configurar proyecto Supabase<br>- Configurar proyecto Vercel<br>- Configurar variables de entorno<br>- Eliminar rutas hardcodeadas | Backend | - |
| Mar | - Implementar Supabase Auth<br>- Crear páginas `/login` y `/signup`<br>- Middleware para rutas protegidas | Frontend | - |
| Mié | - Schema PostgreSQL (profiles, analyses)<br>- Políticas RLS<br>- Migrar `lib/api.js` a consultas Supabase | Backend | - |
| Jue | - Configurar Vercel Blob<br>- Crear abstracción `StorageService`<br>- Actualizar pipeline para subir artefactos | Backend | - |
| Vie | - Desplegar a staging Vercel<br>- Pruebas E2E con cuenta Free<br>- Documentar proceso de configuración | DevOps | - |

**Entregables:**
- [x] Entorno staging Vercel en vivo
- [x] Supabase Auth funcionando (login/signup)
- [x] Schema de base de datos desplegado
- [x] Abstracción de almacenamiento implementada
- [x] Variables de entorno configuradas

**Bloqueadores:**
- Ninguno esperado (semana de bajo riesgo)

---

### Semana 2: UI Freemium
**Tema:** Control de planes y experiencia de usuario

| Tareas | Descripción | Prioridad |
|-------|-------------|----------|
| Layout del dashboard | Sidebar de navegación con insignia de plan, indicador de uso | P0 |
| Límites de plan | Aplicar 1 análisis/mes para usuarios Free | P0 |
| Modal de paywall | Activar cuando usuario Free alcanza límite | P0 |
| CTA de actualización | "Actualizar a Pro" prominente en UI | P0 |
| Display de uso | "7/10 análisis usados este mes" | P0 |
| Estados vacíos | UI amigable cuando no existen análisis | P1 |
| Estados de carga | Skeletons durante obtención de datos | P1 |
| Estados de error | Mensajes de error amigables para el usuario | P1 |

**Sistema de Diseño:**
- Reemplazar todos los emojis con iconos lucide-react
- Implementar componentes shadcn/ui (Button, Card, Badge, Modal)
- Paleta de colores Tailwind (slate/blue/green/red)

**Entregables:**
- [x] Dashboard con UI freemium
- [x] Seguimiento de uso funcionando
- [x] Paywall previniendo uso excesivo
- [x] Sistema de diseño consistente

---

### Semana 3: Trabajos en Segundo Plano
**Tema:** Procesamiento de análisis confiable

| Tareas | Descripción | Prioridad |
|-------|-------------|----------|
| Configurar Inngest | Crear cuenta, configurar SDK | P0 |
| Trabajo de análisis | Refactorizar spawn a función Inngest | P0 |
| Seguimiento de progreso | Actualizar DB mientras progresa trabajo | P0 |
| Lógica de reintento | 3 intentos en caso de fallo | P0 |
| Manejo de errores | Registrar errores, notificar usuario | P0 |
| Manejo de timeout | Matar trabajo después de 5 minutos | P1 |
| Monitoreo de trabajos | Dashboard en UI de Inngest | P1 |

**Arquitectura:**
```typescript
// inngest/functions/analyze.ts
export const analyzeWebsite = inngest.createFunction(
  { name: 'Analyze Website' },
  { event: 'analysis/requested' },
  async ({ event, step }) => {
    // Paso 1: Crawl (60s)
    // Paso 2: Subir artefactos (5s)
    // Paso 3: Actualizar base de datos (1s)
    // Paso 4: Notificar usuario (opcional)
  }
);
```

**Entregables:**
- [x] Integración Inngest funcionando
- [x] Sin más procesos spawn separados
- [x] Ejecución de trabajos confiable
- [x] Dashboard de monitoreo

---

### Semana 4: Integración de Facturación
**Tema:** Monetización

| Tareas | Descripción | Prioridad |
|-------|-------------|----------|
| Cuenta Stripe | Crear cuenta de producción | P0 |
| Configuración de producto | Crear producto plan Pro ($99/mes) | P0 |
| Flujo de checkout | Implementar Stripe Checkout | P0 |
| Manejador webhook | Sincronizar suscripciones a DB | P0 |
| Customer Portal | Autoservicio cancelar/reactivar | P0 |
| Emails de factura | Automático desde Stripe | P1 |
| Fallos de pago | Lógica de reintento + notificaciones | P1 |

**Estructura de Precios:**
```
Free Overview: $0/mes
- 1 análisis/mes
- Solo baseline (modo limitado)
- Sin descargas forenses

Pro: $99/mes
- 10 análisis/mes
- Análisis completo 5 etapas
- Todos los informes + forense
- Alertas por email

Enterprise: Precio personalizado
- Contactar ventas
- Análisis ilimitados
- Acceso API
- SSO
```

**Entregables:**
- [x] Integración Stripe en vivo
- [x] Los usuarios pueden actualizar a Pro
- [x] Webhooks sincronizando correctamente
- [x] Customer Portal funcionando
- [x] Transacciones de prueba verificadas

---

### Semanas 5-6: Pulido y Pruebas
**Tema:** Listo para producción

| Categoría | Tareas |
|----------|-------|
| **Pruebas** | - Pruebas E2E para flujo registro→analizar→actualizar<br>- Pruebas de carga (100 análisis concurrentes)<br>- Pruebas cross-browser (Chrome, Safari, Firefox) |
| **Rendimiento** | - Optimizar consultas del dashboard<br>- Agregar índices de base de datos<br>- Habilitar caché donde sea apropiado |
| **Seguridad** | - Limitación de tasa en rutas API<br>- CAPTCHA en registro<br>- Sanitización de entrada<br>- Auditoría de seguridad |
| **Documentación** | - Guía de usuario (cómo usar Spectral)<br>- Página de FAQ<br>- Política de privacidad<br>- Términos de servicio |
| **Soporte** | - Configurar email de soporte (support@spectral.com)<br>- Base de conocimiento (primeros 10 artículos)<br>- Tooltips de ayuda en la app |

**Entregables:**
- [x] 95%+ cobertura de pruebas para rutas críticas
- [x] Objetivos de rendimiento alcanzados (dashboard <2s, análisis <90s)
- [x] Vulnerabilidades de seguridad abordadas
- [x] Páginas legales publicadas
- [x] Sistema de soporte listo

---

### Semanas 7-8: Lanzamiento Beta
**Tema:** Validar con usuarios reales

**Programa Beta:**
- Invitar 20 usuarios objetivo (mezcla de perfiles legal, marketing, dev)
- Acceso Pro gratuito por 30 días
- Sesiones de feedback semanales
- Bug bounty ($50-500 por bug crítico)

**Checklist de Lanzamiento:**
- [x] Entorno de producción estable
- [x] Stripe modo live configurado
- [x] Todas las características P0 funcionando
- [x] Seguimiento de analytics (PostHog o Mixpanel)
- [x] Monitoreo de errores (Sentry)
- [x] Configuración de email transaccional (Resend o SendGrid)
- [x] Sitio de marketing en vivo (spectral.com)
- [x] Cuentas de redes sociales creadas
- [x] Post de blog de lanzamiento escrito

**Criterios de Éxito para Fase 1:**
- 10+ usuarios beta usando activamente el producto
- 5+ conversiones Pro ($500 MRR)
- <5 bugs críticos reportados
- Tasa de éxito de análisis >95%
- Feedback de usuario NPS >40

---

## Fase 2: Características de Crecimiento (Semanas 9-16)

**Objetivo:** Agregar características que aumenten el compromiso y retención para usuarios Pro.

**Métricas Objetivo:**
- 50+ usuarios Pro ($5K MRR)
- 30% retención día-30
- 3+ análisis por usuario Pro por semana

### Semana 9-10: Análisis Programados
**Característica:** Escaneos recurrentes automatizados

**Historia de Usuario:** Como usuario Pro, quiero programar escaneos semanales de mis dominios para ser alertado de problemas de cumplimiento automáticamente.

**Implementación:**
- Vercel Cron Jobs disparan función Inngest diariamente
- Verificar dominios con calendarios activos
- Encolar análisis automáticamente
- Enviar email al completar

**UI:**
- Configurador de calendario (diario/semanal/mensual)
- Selector de zona horaria
- Toggle activar/desactivar
- Timestamp de próxima ejecución

**Entregables:**
- [x] Análisis programados funcionando
- [x] Notificaciones por email enviadas
- [x] UI para gestionar calendarios

---

### Semana 11-12: Sistema de Alertas
**Característica:** Notificaciones proactivas

**Tipos de Alerta:**
1. **Caída de puntuación:** Puntuación cae por debajo del 50% (o umbral personalizado)
2. **Nueva violación:** Violación crítica detectada
3. **Análisis fallido:** 3 reintentos agotados
4. **Advertencia de límite:** 9/10 análisis usados

**Canales:**
- Email (siempre)
- Webhook Slack (opcional)
- Centro de notificaciones en la app (nice-to-have)

**UI:**
- Página de preferencias de alertas
- Historial de notificaciones
- Botón de prueba de notificación

**Entregables:**
- [x] Alertas por email funcionando
- [x] Integración Slack opcional
- [x] UI de preferencias de alertas

---

### Semana 13-14: Gestión Multi-Dominio
**Característica:** Organizar y comparar dominios

**Capacidades:**
- Crear proyectos/carpetas
- Etiquetar dominios (producción, staging, nombre-cliente)
- Analizar en masa (5 dominios a la vez)
- Vista de comparación (puntuaciones lado a lado)
- Exportar a CSV

**UI:**
- Sidebar de proyectos
- Lista de dominios con etiquetas
- Multi-selección + acciones masivas
- Vista de tabla de comparación

**Entregables:**
- [x] Proyectos/carpetas implementados
- [x] Analizar en masa funcionando
- [x] Vista de comparación funcional

---

### Semana 15-16: Seguimiento Histórico y Tendencias
**Característica:** Rastrear cumplimiento a lo largo del tiempo

**Visualizaciones:**
- Gráfico de tendencia de puntuación (gráfico de líneas)
- Línea de tiempo de violaciones
- Conteo de cookies a lo largo del tiempo
- Historial de detección de servicios

**UI:**
- Pestaña de tendencias en página de detalle de dominio
- Selector de rango de fechas (7d/30d/90d/todo)
- Gráficos descargables (PNG/CSV)

**Entregables:**
- [x] Librería de gráficos integrada (Recharts o Chart.js)
- [x] Datos históricos agregados
- [x] Visualizaciones de tendencias funcionando

**Criterios de Éxito para Fase 2:**
- 50+ usuarios Pro pagando
- 60% de usuarios Pro usando análisis programados
- 40% de usuarios Pro tienen alertas configuradas
- Churn <5% MoM

---

## Fase 3: Enterprise y Multi-CMP (Semanas 17-24)

**Objetivo:** Soportar clientes enterprise y expandir cobertura de CMP.

**Métricas Objetivo:**
- 100+ usuarios Pro + 5 Enterprise ($15K MRR)
- Soporte Quantcast en vivo
- API usada por 10+ clientes

### Semana 17-18: Acceso API
**Característica:** Análisis programático

**Endpoints:**
```
POST /api/v1/analyses
GET /api/v1/analyses
GET /api/v1/analyses/:id
DELETE /api/v1/analyses/:id
GET /api/v1/domains (listar todos analizados)
POST /api/v1/webhooks (configurar webhook)
```

**Auth:** Claves API (no JWT)

**Límites de Tasa:**
- Pro: 100 req/hora
- Enterprise: 1000 req/hora

**Entregables:**
- [x] REST API implementada
- [x] UI de gestión de claves API
- [x] Documentación OpenAPI publicada
- [x] Limitación de tasa aplicada

---

### Semana 19-20: Multi-Workspace (Enterprise)
**Característica:** Workspaces separados para agencias/empresas

**Schema:**
```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY,
  name TEXT,
  plan TEXT, -- pro, enterprise
  created_at TIMESTAMPTZ
);

CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT, -- owner, admin, editor, viewer
  PRIMARY KEY (workspace_id, user_id)
);
```

**UI:**
- Dropdown de cambio de workspace
- Invitar miembros vía email
- Matriz de permisos (ver/editar/eliminar)

**Entregables:**
- [x] Workspaces funcionales
- [x] Flujo de invitación funcionando
- [x] Permisos basados en roles aplicados

---

### Semana 21-22: Integración SSO (Enterprise)
**Característica:** Single Sign-On para enterprise

**Proveedores:**
- Google Workspace
- Microsoft Azure AD
- Okta
- SAML 2.0 genérico

**Implementación:**
- Usar WorkOS o Auth0 para SSO
- Aprovisionamiento just-in-time
- SCIM para sincronización de usuarios (opcional)

**Entregables:**
- [x] SSO de Google funcionando
- [x] Azure AD funcionando
- [x] SAML genérico funcionando

---

### Semana 23-24: Soporte CMP Quantcast
**Característica:** Expandir más allá de OneTrust

**Por Qué Quantcast Primero:**
- 2do CMP más grande (después de OneTrust)
- Estándar TCF v2 (reutilizable para otros CMPs)
- Solicitado por usuarios beta

**Implementación:**
```javascript
// backend/cmps/quantcast.js
export async function detectQuantcast(page) {
  return await page.evaluate(() => {
    return window.__tcfapi !== undefined;
  });
}

export async function analyzeQuantcast(page) {
  // 1. Detectar banner
  // 2. Extraer cadena de consentimiento TCF
  // 3. Hacer clic en rechazar/aceptar
  // 4. Validar que la cadena de consentimiento cambia
  // 5. Comparar cookies antes/después
}
```

**Pruebas:**
- 10 sitios de producción usando Quantcast
- Validar contra sitio demo de Quantcast
- Documentar diferencias vs OneTrust

**Entregables:**
- [x] Detección Quantcast funcionando
- [x] Análisis 5 etapas funcional
- [x] Documentado en informes
- [x] Modo LIMITED removido para Quantcast

**Criterios de Éxito para Fase 3:**
- 5+ clientes Enterprise ($1K-5K/mes cada uno)
- API usada por 20+ integraciones
- Tasa de éxito de análisis Quantcast >90%
- Multi-workspace usado por agencias

---

## Post-Fase 3: Mejora Continua (En curso)

### Soporte CMP Adicional (Q1-Q4 2026)

| Trimestre | CMPs | Prioridad |
|---------|------|----------|
| Q1 2026 | Cookiebot, Usercentrics | Alta |
| Q2 2026 | TrustArc, Didomi | Media |
| Q3 2026 | CookieYes, Osano | Media |
| Q4 2026 | Civic, Termly, iubenda | Baja |

**Enfoque:**
- Dedicar 1 semana por CMP para investigación + implementación
- Contribuciones de la comunidad (adaptadores open-source)
- Priorizar basado en solicitudes de usuarios

---

### Asistente de Remediación IA (Q2 2026)

**Característica:** Recomendaciones de corrección potenciadas por GPT-4

**Historia de Usuario:** Como gerente de marketing, quiero instrucciones paso a paso para corregir violaciones para no necesitar contratar un desarrollador.

**Capacidades:**
- Analizar contexto de violación
- Generar cambios de configuración de OneTrust
- Proporcionar fragmentos de código para GTM/scripts personalizados
- Estimar impacto ("corregir esto mejorará la puntuación en 15%")
- Rastrear estado de implementación

**Stack Técnico:**
- OpenAI GPT-4 API
- Prompts personalizados entrenados en base de conocimiento de Spectral
- Ciclo de feedback (usuario marca "útil" o "no útil")

**Precios:**
- Incluido en Enterprise
- Add-on para Pro ($29/mes extra)

**Timeline:** 8 semanas (investigación + MVP + pruebas)

---

### Informes con Marca Blanca (Q3 2026)

**Característica:** Branding de agencia

**Capacidades:**
- Logo personalizado en informes
- Colores de marca
- Subdominio (agencia.spectral.com)
- Remover footer "Powered by Spectral"

**Precios:**
- Solo Enterprise
- O add-on Marca Blanca ($99/mes)

**Timeline:** 4 semanas

---

### Extensión de Navegador (Q4 2026)

**Característica:** Análisis con un clic desde el navegador

**Capacidades:**
- Clic derecho en página → "Analizar con Spectral"
- Panel DevTools mostrando actividad de cookies en vivo
- Prueba rápida de flujo de consentimiento sin análisis completo

**Plataformas:**
- Chrome
- Firefox
- Edge
- Safari (si es factible)

**Timeline:** 6 semanas

---

## Planificación de Recursos

### Composición del Equipo (Fase MVP)

| Rol | Asignación | Responsabilidades |
|------|------------|------------------|
| **Líder de Producto** | 100% | PRD, hoja de ruta, pruebas de usuario, priorización |
| **Ingeniero Frontend** | 100% | Dashboard UI, componentes, gestión de estado |
| **Ingeniero Backend** | 100% | Rutas API, trabajos Inngest, schema Supabase |
| **Diseñador** | 50% | UI/UX, sistema de diseño, sitio de marketing |
| **QA/Testing** | 50% | Pruebas E2E, QA manual, seguimiento de bugs |

**Total:** 4 FTE

### Composición del Equipo (Fase Crecimiento)

Agregar:
- Ingeniero DevOps (50%) - Infraestructura, monitoreo, escalado
- Customer Success (50%) - Onboarding, soporte, retención
- Marketing (50%) - Contenido, SEO, generación de demanda

**Total:** 5.5 FTE

### Composición del Equipo (Fase Enterprise)

Agregar:
- Ingeniero de Ventas (100%) - Acuerdos enterprise, demos, integraciones
- Ingeniero Backend Adicional (100%) - Adaptadores CMP, API
- Ingeniero de Seguridad (25%) - Auditorías, cumplimiento, pentesting

**Total:** 7.75 FTE

---

## Estimaciones de Presupuesto

### Costos de Infraestructura (Mensual)

| Fase | Servicios | Costo |
|-------|----------|------|
| **MVP** (100 usuarios, 1K análisis) | Vercel Pro + Supabase Free + Inngest Free | $20 |
| **Crecimiento** (500 usuarios, 5K análisis) | Vercel Pro + Supabase Pro + Inngest Pro | $74 |
| **Escala** (2K usuarios, 20K análisis) | Vercel Pro + Supabase Team + Inngest Business | $927 |

### Herramientas SaaS (Mensual)

| Herramienta | Propósito | Costo |
|------|---------|------|
| Stripe | Pagos | 2.9% + 30¢ por transacción |
| Resend/SendGrid | Email transaccional | $10-20 |
| PostHog/Mixpanel | Analytics | $0-50 (Tier gratuito) |
| Sentry | Monitoreo de errores | $0-26 (Tier gratuito) |
| Linear | Gestión de proyectos | $8/usuario |
| Figma | Diseño | $15/editor |
| **Total** | | $50-100 |

### Presupuesto de Marketing (Mensual)

| Canal | Actividad | Costo |
|---------|----------|------|
| Marketing de Contenido | Posts de blog, SEO | $2,000 |
| Anuncios Pagos | Google Ads, LinkedIn | $3,000 |
| Partnerships | Comunidad OneTrust, conferencias | $1,000 |
| **Total** | | $6,000 |

**Quema Mensual Total (Fase Crecimiento):** ~$7,000 (infraestructura + herramientas + marketing)

---

## Hitos Clave y Fechas

| Hito | Fecha Objetivo | Definición de Éxito |
|-----------|-------------|----------------------|
| **Lanzamiento MVP** | Semana 8 (Dic 2025) | 100 registros, 5 usuarios Pro, <5 bugs críticos |
| **Product-Market Fit** | Mes 3 (Feb 2026) | 50 usuarios Pro, 5% conversión, NPS >40 |
| **$10K MRR** | Mes 6 (May 2026) | 100 usuarios Pro + 5 Enterprise |
| **Lanzamiento Multi-CMP** | Mes 8 (Jul 2026) | Quantcast + Cookiebot en vivo |
| **$30K MRR** | Mes 12 (Nov 2026) | 250 Pro + 10 Enterprise |

---

## Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|------|--------|------------|
| **Selectores de CMP se rompen** | Alto | Detección de versión, selectores de respaldo, monitoreo comunitario |
| **Fraude en Stripe** | Medio | Stripe Radar (detección ML de fraude), revisión manual para alto valor |
| **Puppeteer poco confiable** | Alto | Lógica de reintento, respaldo modo headful, monitoreo |
| **Crecimiento de usuarios más lento de lo esperado** | Alto | Pivotar precios ($49 Pro?), mejorar onboarding, marketing de contenido |
| **Ventas enterprise toman más tiempo** | Medio | Enfoque en autoservicio Pro, contratar ingeniero de ventas después |
| **Competidor lanza** | Medio | Diferenciar (forense, informes multi-perfil), velocidad al mercado |

---

## Revisión e Iteración

Esta hoja de ruta se revisará:
- **Semanalmente:** Durante planificación de sprint (ajustar semana actual)
- **Mensualmente:** Con interesados (ajustar próximas 4 semanas)
- **Trimestralmente:** Revisión estratégica (ajustar fases)

**Próxima Revisión:** Fin de Semana 8 (retrospectiva lanzamiento MVP)

---

**Responsable del Documento:** Equipo de Producto
**Interesados:** Ingeniería, Diseño, Negocio, Marketing
**Estado:** Aprobado para ejecución (Pendiente firma)
