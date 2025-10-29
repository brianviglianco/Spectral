# Spectral - Documento de Requerimientos de Producto (PRD)

**Versión:** 1.0
**Última Actualización:** 28 Oct 2025
**Estado:** Borrador - Fase MVP
**Responsable:** Equipo de Producto

---

## 1. Visión del Producto

### 1.1 Declaración de Misión
Spectral es la plataforma líder en la industria para el cumplimiento de GDPR/ePrivacy que valida el comportamiento real del consentimiento de cookies mediante análisis forense automatizado, entregando informes accionables para equipos legales, técnicos y de marketing.

### 1.2 Propuesta de Valor
A diferencia de los competidores que solo verifican la configuración del CMP, Spectral **verifica el comportamiento real** mediante:
- Captura de actividad real de cookies/rastreo pre y post consentimiento
- Generación de evidencia forense con capturas de pantalla con marca de tiempo y archivos HAR
- Provisión de informes multi-perfil (legal, técnico, marketing)
- Mantenimiento de cadena de custodia para auditorías regulatorias

### 1.3 Mercado Objetivo

| Segmento | Perfil | Puntos de Dolor |
|---------|---------|-------------|
| **Empresas** | Retail, viajes, fintech con OneTrust a escala | Necesitan verificación independiente, cumplimiento multi-país, evidencia lista para auditoría |
| **Agencias de Marketing** | Agencias gestionando 10+ clientes | Monitoreo periódico, soporte de migración, reportes a clientes |
| **Scale-ups** | Negocios digitales expandiéndose a la UE | Validación pre-auditoría, evitar multas regulatorias, cumplimiento rápido |

### 1.4 Métricas de Éxito (North Star)

- **Primaria:** Ingresos (ARR)
- **Secundaria:** Conversión Free→Pro (objetivo 5%)
- **Compromiso:** Análisis por usuario/semana (Free: 1+, Pro: 3+)
- **Retención:** Retención día 30 (Free: 30%, Pro: 60%)
- **Calidad:** Tasa de éxito de análisis >95%

---

## 2. Vista General del Producto

### 2.1 Estado Actual (v4.8)
- Pipeline de análisis basado en CLI (9 etapas)
- Soporte completo para OneTrust (5 etapas: baseline, reject_pre, reject, accept_pre, accept)
- Otros CMPs en modo LIMITED (solo baseline)
- Dashboard Next.js para ver resultados
- Sin autenticación, mono-inquilino
- Almacenamiento en sistema de archivos local

### 2.2 Estado Objetivo (MVP SaaS)
- SaaS multi-inquilino con autenticación
- Modelo freemium (Free/Pro/Enterprise)
- Almacenamiento en la nube (Vercel Blob + Supabase)
- Procesamiento de trabajos en segundo plano
- Análisis programados (Pro+)
- Integración de facturación (Stripe)
- Límites de uso y paywalls

---

## 3. Perfiles de Usuario

### 3.1 Perfiles Primarios

#### Perfil 1: Gerente Legal/Cumplimiento
**Nombre:** Laura (Líder Legal)
**Empresa:** Empresa e-commerce (5K+ empleados)
**Objetivos:**
- Asegurar cumplimiento GDPR en todos los dominios
- Generar evidencia lista para auditoría
- Rastrear violaciones a lo largo del tiempo
- Reportar al DPO/CISO

**Puntos de Dolor:**
- No puede confiar en las afirmaciones del proveedor de CMP
- Las auditorías manuales son costosas y lentas
- Necesita evidencia forense con marca de tiempo
- Difícil explicar violaciones técnicas al equipo legal

**Cómo Ayuda Spectral:**
- Análisis forense automatizado
- Informes amigables para legal
- Seguimiento de violaciones con severidad
- Paquetes de evidencia firmados con SHA-256

#### Perfil 2: Gerente de Operaciones de Marketing
**Nombre:** Mike (MarOps)
**Empresa:** Scale-up SaaS (50-200 empleados)
**Objetivos:**
- Implementar rastreo compatible
- Balancear cumplimiento con atribución de marketing
- Entender el impacto de cookies en campañas
- Iteraciones rápidas en configuración de CMP

**Puntos de Dolor:**
- Las etiquetas de marketing rompen el flujo de consentimiento
- GA4/Meta Pixel se disparan antes del consentimiento
- No entienden violaciones técnicas
- Necesitan explicaciones no técnicas

**Cómo Ayuda Spectral:**
- Informes enfocados en marketing
- Detección de servicios (GA, Meta, etc.)
- Comparación antes/después del consentimiento
- Recomendaciones de remediación

#### Perfil 3: Desarrollador Web/Ingeniero
**Nombre:** David (Dev Frontend)
**Empresa:** Agencia gestionando 10+ clientes
**Objetivos:**
- Implementar OneTrust correctamente
- Depurar problemas de consentimiento
- Validar implementación de CMP
- Automatizar reportes a clientes

**Puntos de Dolor:**
- Los SDKs de CMP son complejos
- Difícil probar todos los estados de consentimiento
- Los clientes preguntan "¿estamos en cumplimiento?"
- Las pruebas manuales son tediosas

**Cómo Ayuda Spectral:**
- Informes técnicos con fragmentos de código
- Análisis etapa por etapa
- Inspección de cookies/solicitudes
- API para integración CI/CD

### 3.2 Perfiles Secundarios

#### Perfil 4: DPO (Data Protection Officer)
- Necesita resumen ejecutivo
- Quiere tendencias de puntuación de cumplimiento
- Requiere registros de auditoría

#### Perfil 5: Propietario de Agencia
- Gestiona múltiples cuentas de clientes
- Necesita informes con marca blanca
- Quiere gestión de espacios de trabajo

---

## 4. Requerimientos de Características

### 4.1 MVP SaaS (Lanzamiento - 8 semanas)

#### 4.1.1 Autenticación y Gestión de Usuarios
**Prioridad:** P0 (Bloqueante)

| Característica | Descripción | Historia de Usuario |
|---------|-------------|------------|
| Registro | Registro con email + contraseña | Como nuevo usuario, quiero crear una cuenta para poder guardar mis análisis |
| Login | Autenticación con email + contraseña | Como usuario recurrente, quiero iniciar sesión para ver mi historial |
| Restablecimiento de contraseña | Flujo de contraseña olvidada | Como usuario, quiero restablecer mi contraseña si la olvido |
| Verificación de email | Confirmar email al registrarse | Como usuario, quiero verificar mi email por seguridad |
| Gestión de perfil | Editar nombre, email, contraseña | Como usuario, quiero actualizar mi información de perfil |

**Especificación Técnica:**
- Supabase Auth con JWT
- Rutas protegidas vía middleware
- Persistencia de sesión (7 días)

**Criterios de Aceptación:**
- El usuario puede registrarse en <30s
- Verificación de email en 5 min
- La contraseña debe cumplir requisitos de seguridad (8+ caracteres, mayúscula, número)
- El login persiste entre sesiones del navegador

---

#### 4.1.2 Modelo Freemium
**Prioridad:** P0 (Bloqueante)

| Plan | Precio | Dominios | Frecuencia | Características |
|------|-------|---------|-----------|----------|
| **Free Overview** | $0 | 1/mes | Manual | Solo baseline, puntuación general, sin descargas forenses |
| **Pro** | $99/mes | 10/mes | Semanal/Mensual | Análisis completo 5 etapas, todos los informes, forense, alertas |
| **Enterprise** | Personalizado | Ilimitado | Continuo | Acceso API, SSO, multi-workspace, remediación IA |

**Historias de Usuario:**
- Como usuario Free, quiero analizar 1 dominio/mes para evaluar el producto
- Como usuario Free alcanzando límites, quiero un CTA claro para actualizar a Pro
- Como usuario Pro, quiero ver mi uso (7/10 análisis usados)
- Como prospecto Enterprise, quiero contactar a ventas para necesidades personalizadas

**Especificación Técnica:**
- Columna `profiles.plan` en base de datos
- `profiles.analyses_used` y `analyses_limit` para seguimiento
- Modal de paywall cuando se alcanza el límite
- Integración de Stripe para facturación

**Criterios de Aceptación:**
- Los usuarios Free ven CTA de actualización después de 1 análisis
- Los usuarios Pro pueden ejecutar 10 análisis/mes
- El contador de uso se actualiza en tiempo real
- La facturación se sincroniza con webhooks de Stripe

---

#### 4.1.3 Gestión de Análisis
**Prioridad:** P0 (Bloqueante)

**Características:**
- **Iniciar análisis:** Ingresar dominio + idioma, iniciar trabajo en segundo plano
- **Ver progreso:** Rastreador de progreso en tiempo real (0% → 100%)
- **Listar análisis:** Tabla/cuadrícula de todos los análisis del usuario con filtros
- **Ver detalles:** 5 pestañas (Resumen, Violaciones, Etapas, Informes, Descargar)
- **Eliminar análisis:** Remover análisis antiguos

**Historias de Usuario:**
- Como usuario, quiero analizar un dominio en <3 minutos
- Como usuario, quiero ver progreso en tiempo real durante el análisis
- Como usuario, quiero filtrar mis análisis por dominio, fecha o puntuación
- Como usuario, quiero descargar paquetes forenses

**Especificación Técnica:**
- Inngest para trabajos en segundo plano
- WebSocket o polling para actualizaciones de progreso
- Tabla Supabase `analyses` con RLS
- Vercel Blob para almacenamiento de artefactos

**Criterios de Aceptación:**
- El análisis se completa en <90s (OneTrust)
- Actualizaciones de progreso cada 5s
- El usuario solo puede ver sus propios análisis (RLS aplicado)
- La descarga genera ZIP válido con SHA-256

---

#### 4.1.4 Dashboard UI
**Prioridad:** P0 (Bloqueante)

**Páginas:**
1. **`/dashboard`** - Página de inicio post-login
   - Análisis recientes (5 más recientes)
   - Indicador de uso (7/10 análisis)
   - Acción rápida: botón "Nuevo Análisis"
   - Insignia de plan (Free/Pro/Enterprise)

2. **`/dashboard/analyses`** - Todos los análisis
   - Tabla filtrable (dominio, fecha, puntuación, estado)
   - Ordenar por fecha/puntuación
   - Acciones masivas (eliminar múltiples)

3. **`/dashboard/analysis/[id]`** - Detalle de análisis
   - 5 pestañas: Resumen, Violaciones, Etapas, Informes, Descargar
   - Visualización de puntuación (medidor circular)
   - Tarjetas de violaciones (expandibles)
   - Tabla de comparación de etapas
   - Visor de informes (legal/técnico/marketing)
   - Descarga de paquete forense

4. **`/pricing`** - Página pública de precios
   - 3 planes (Free/Pro/Enterprise)
   - Tabla de comparación de características
   - CTA para registro o actualización

5. **`/login`, `/signup`** - Páginas de autenticación

**Sistema de Diseño:**
- Componentes: shadcn/ui
- Iconos: lucide-react (SIN emojis)
- Colores: Paleta por defecto de Tailwind
- Tipografía: Fuente Inter
- Espaciado: Unidad base de 4px

**Criterios de Aceptación:**
- El dashboard carga en <2s
- Responsive móvil (320px+)
- Accesible (WCAG 2.1 AA)
- Sin emojis en UI de producción

---

#### 4.1.5 Facturación y Pagos
**Prioridad:** P0 (Bloqueante)

**Características:**
- Stripe Checkout para plan Pro
- Gestión de suscripción (cancelar, reactivar)
- Descarga de facturas
- Aplicación de límites basados en uso

**Historias de Usuario:**
- Como usuario Free, quiero actualizar a Pro vía tarjeta de crédito
- Como usuario Pro, quiero ver mis facturas
- Como usuario Pro, quiero cancelar mi suscripción
- Como usuario cancelado, quiero reactivar fácilmente

**Especificación Técnica:**
- Stripe Checkout Sessions
- Stripe Customer Portal para autoservicio
- Manejo de webhook para eventos de suscripción
- Sincronizar `profiles.plan` con estado de Stripe

**Criterios de Aceptación:**
- La actualización se completa en <2 min
- El usuario es redirigido al dashboard después del pago
- El plan se actualiza en 30s (webhook)
- La cancelación toma efecto al final del período

---

### 4.2 Características Post-MVP (Semanas 9-16)

#### 4.2.1 Análisis Programados (Pro+)
**Prioridad:** P1

- Escaneos automatizados semanales/mensuales
- Notificación por email al completar
- Comparación histórica (actual vs anterior)

#### 4.2.2 Sistema de Alertas (Pro+)
**Prioridad:** P1

- Alertas por email cuando la puntuación cae por debajo del umbral
- Integración webhook de Slack
- Centro de notificaciones en la app

#### 4.2.3 Gestión Multi-Dominio (Pro+)
**Prioridad:** P1

- Organización por proyectos/carpetas
- Analizar múltiples dominios en masa
- Comparar dominios lado a lado

#### 4.2.4 Colaboración en Equipo (Pro+)
**Prioridad:** P2

- Invitar miembros del equipo al workspace
- Permisos basados en roles (visor/editor/admin)
- Comentarios en análisis

#### 4.2.5 Acceso API (Enterprise)
**Prioridad:** P2

- REST API con claves API
- Iniciar análisis programáticamente
- Notificaciones webhook
- Limitación de tasa

#### 4.2.6 Multi-Workspace (Enterprise)
**Prioridad:** P2

- Múltiples workspaces por cuenta
- UI de cambio de workspace
- Facturación separada por workspace

#### 4.2.7 Integración SSO (Enterprise)
**Prioridad:** P3

- Soporte SAML 2.0
- SSO de Google Workspace
- Integración Azure AD

#### 4.2.8 Asistente de Remediación IA (Enterprise)
**Prioridad:** P2

- Recomendaciones potenciadas por GPT-4
- Runbooks paso a paso
- Fragmentos de código para correcciones
- Estimación de impacto

---

### 4.3 Características Futuras (Post-Lanzamiento)

#### 4.3.1 Soporte CMP Adicional
**Prioridad:** P1 (Roadmap)

- Quantcast Choice (TCF v2)
- Cookiebot
- Usercentrics
- TrustArc
- Didomi

**Enfoque por Fases:**
1. **Q1 2026:** Quantcast (mayor demanda después de OneTrust)
2. **Q2 2026:** Cookiebot + Usercentrics
3. **Q3 2026:** TrustArc + Didomi
4. **Q4 2026:** CMPs restantes (CookieYes, Osano, etc.)

#### 4.3.2 Informes con Marca Blanca
**Prioridad:** P2

- Logo de agencia en informes
- Colores de marca personalizados
- Subdominio (agencia.spectral.com)

#### 4.3.3 Dashboard de Cumplimiento
**Prioridad:** P2

- Puntuación agregada en todos los dominios
- Gráficos de tendencias (puntuación a lo largo del tiempo)
- Mapa de calor de violaciones

#### 4.3.4 Extensión de Navegador
**Prioridad:** P3

- Análisis rápido desde cualquier página
- Prueba de consentimiento con un clic
- Panel de herramientas de desarrollador

---

## 5. Requerimientos Técnicos

### 5.1 Arquitectura

**Stack:**
- **Frontend:** Next.js 15, React 19, shadcn/ui, Tailwind CSS
- **Backend:** Next.js API Routes (serverless)
- **Base de Datos:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (JWT)
- **Almacenamiento:** Vercel Blob (artefactos), Supabase Storage (backups)
- **Trabajos:** Inngest (procesamiento en segundo plano)
- **Hosting:** Vercel
- **Facturación:** Stripe

### 5.2 Requerimientos de Rendimiento

| Métrica | Objetivo | Medición |
|--------|--------|-------------|
| Tiempo de análisis (OneTrust) | <90s | P95 |
| Tiempo de carga del dashboard | <2s | LCP |
| Tiempo de respuesta API | <500ms | P95 |
| Uptime | >99.5% | Mensual |
| Tasa de éxito de análisis | >95% | Por intento |

### 5.3 Requerimientos de Seguridad

- Solo HTTPS (forzado)
- Los tokens JWT expiran en 7 días
- Limitación de tasa: 10 análisis/hora por usuario
- Prevención de inyección SQL (consultas parametrizadas)
- Prevención XSS (salidas sanitizadas)
- Protección CSRF (cookies SameSite)
- Secretos en variables de entorno (nunca commiteados)

### 5.4 Requerimientos de Escalabilidad

| Fase | Usuarios | Análisis/Mes | Infraestructura |
|-------|-------|----------------|----------------|
| MVP | 100 | 1,000 | Vercel Free + Supabase Free |
| Crecimiento | 500 | 5,000 | Vercel Pro + Supabase Pro |
| Escala | 2,000 | 20,000 | Vercel Pro + Supabase Team |

### 5.5 Requerimientos de Datos

**Retención:**
- Free: 7 días
- Pro: 90 días
- Enterprise: 365 días

**Backup:**
- Snapshots diarios (Supabase)
- Replicación Vercel Blob (automática)

**Cumplimiento GDPR:**
- Exportación de datos bajo solicitud
- Eliminación de cuenta en 30 días
- Consentimiento de cookies para cookies de marketing

---

## 6. Requerimientos No Funcionales

### 6.1 Usabilidad
- Tiempo hasta el primer análisis: <3 minutos (desde registro)
- Responsive móvil (320px - 1920px)
- Soporte de navegación por teclado
- Compatible con lectores de pantalla

### 6.2 Confiabilidad
- Degradación elegante (análisis falla → usuario notificado)
- Reintentos automáticos (3 intentos)
- Seguimiento de errores (Sentry o similar)

### 6.3 Mantenibilidad
- TypeScript modo estricto
- Pruebas unitarias para rutas críticas (>70% cobertura)
- Pruebas E2E para flujos de usuario
- Documentación para todas las APIs

### 6.4 Cumplimiento
- Compatible con GDPR (acuerdo de procesamiento de datos)
- SOC 2 Type II (futuro, post-escala)
- Política de privacidad publicada
- Términos de servicio publicados

---

## 7. Fuera del Alcance (MVP)

Estas características NO se incluirán en el MVP:

- App móvil (iOS/Android)
- Informes con marca blanca
- Extensión de navegador
- Generación de informes PDF
- Puntuación de cumplimiento más allá de GDPR (CCPA, LGPD)
- Integración con herramientas GRC (plataformas OneTrust, TrustArc)
- Adaptadores CMP personalizados (proporcionados por el usuario)
- Monitoreo en tiempo real (escaneo continuo)

---

## 8. Criterios de Éxito

### 8.1 Criterios de Lanzamiento (MVP Listo)

- [ ] 100% de características P0 implementadas
- [ ] Pruebas E2E pasando para flujos críticos
- [ ] Objetivos de rendimiento alcanzados (análisis <90s, dashboard <2s)
- [ ] Auditoría de seguridad completada
- [ ] 10 usuarios beta probados exitosamente
- [ ] Integración Stripe verificada (test + producción)
- [ ] Política de privacidad + ToS publicados
- [ ] Email de soporte configurado

### 8.2 Métricas Post-Lanzamiento (Primeros 3 Meses)

| Métrica | Objetivo |
|--------|--------|
| Registros | 500+ |
| Conversión Free→Pro | 5% |
| Análisis mensuales | 2,000+ |
| Tasa de éxito de análisis | >95% |
| Retención día 30 | 30% (Free), 60% (Pro) |
| Churn | <10% MoM |
| NPS | >40 |

### 8.3 Objetivos de Ingresos

| Marco Temporal | MRR Objetivo | Suposiciones |
|-----------|------------|-------------|
| Mes 1 | $1,000 | 10 usuarios Pro |
| Mes 3 | $5,000 | 50 usuarios Pro |
| Mes 6 | $10,000 | 100 usuarios Pro + 2 Enterprise |
| Mes 12 | $30,000 | 250 usuarios Pro + 10 Enterprise |

---

## 9. Riesgos y Mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigación |
|------|--------|-------------|------------|
| Problemas de confiabilidad de Puppeteer | Alto | Medio | Lógica de reintento, seguimiento de errores, estrategias de respaldo |
| Bugs de integración Stripe | Alto | Bajo | Pruebas exhaustivas, validación webhook, revisión manual |
| Cambios en CMP rompen selectores | Medio | Alto | Detección de versión, selectores de respaldo, monitoreo comunitario |
| Abuso de tier Free | Medio | Medio | Limitación de tasa, CAPTCHA en registro, monitoreo de uso |
| Competidor lanza producto similar | Medio | Medio | Velocidad al mercado, diferenciación (forense, multi-perfil) |
| Costos de servidor exceden proyecciones | Medio | Bajo | Precios basados en uso, optimizar eficiencia de Puppeteer |

---

## 10. Dependencias y Suposiciones

### 10.1 Dependencias
- Estabilidad de plataforma Vercel
- Uptime de Supabase
- Procesamiento de trabajos de Inngest
- Procesamiento de pagos de Stripe
- Estabilidad de OneTrust CMP (selectores, API)

### 10.2 Suposiciones
- OneTrust mantiene 70%+ de cuota de mercado
- Los usuarios están dispuestos a pagar $99/mes por herramienta de cumplimiento
- Marketing puede generar 500+ registros en 3 meses
- El tiempo de análisis se mantiene bajo 90s con pipeline actual
- Sin cambios importantes en regulaciones GDPR en próximos 12 meses

---

## 11. Glosario

- **Análisis:** Ejecución única del pipeline de Spectral para un dominio
- **Etapa:** Fase del flujo de consentimiento (baseline, reject_pre, reject, accept_pre, accept)
- **CMP:** Plataforma de Gestión de Consentimiento (ej. OneTrust, Quantcast)
- **Paquete Forense:** ZIP con archivos HAR, capturas de pantalla, informes, manifiesto SHA-256
- **Violación:** Incumplimiento de regla GDPR/ePrivacy detectado por análisis
- **Puntuación:** Calificación de cumplimiento 0-100% (100% = sin violaciones)
- **Modo Limitado:** Análisis solo baseline para CMPs no soportados
- **Modo Completo:** Análisis de 5 etapas para OneTrust

---

**Aprobación de Firma:**

| Rol | Nombre | Fecha | Firma |
|------|------|------|-----------|
| Líder de Producto | - | - | - |
| Líder de Ingeniería | - | - | - |
| Líder de Diseño | - | - | - |
| Propietario del Negocio | - | - | - |

---

**Registro de Cambios:**

| Versión | Fecha | Autor | Cambios |
|---------|------|--------|---------|
| 1.0 | 28 Oct 2025 | Equipo de Producto | PRD inicial para MVP SaaS |
