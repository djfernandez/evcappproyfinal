# 🏢 Nexus SAC - Sistema B2B de Cotizaciones y Tarifas (MVP)

> **MVP de aplicación web empresarial** desarrollada para centralizar el proceso de cotización comercial, automatizar el cálculo de tarifas e IGV, validar stock en tiempo real, aplicar flujos de aprobación para solicitudes de descuento especiales y emitir cotizaciones oficiales en PDF.

---

## 🚀 Arquitectura y Tecnologías

El proyecto está organizado en un solo repositorio con dos carpetas independientes:

- **`backend/` (Node.js + Supabase)**
  - Servidor API REST con Express y CORS.
  - Conexión oficial a base de datos PostgreSQL mediante `@supabase/supabase-js`.
  - Scripts SQL modulares en `database/`:
    - `01_schema.sql`: Definición de tablas (`profiles`, `products`, `clients`, `rates`, `quotations`, `quotation_items`, `quotation_sequences`).
    - `02_triggers.sql`: Generación atómica del correlativo anual (`YYYY-0001`) y timestamps automáticos.
    - `03_rls_security.sql`: Row Level Security y políticas de acceso para roles (`vendedor`, `supervisor`, `administrador`).
    - `04_seed_data.sql`: Datos maestros iniciales de libros, revistas, pruebas, clientes, tarifas y usuarios demo.
    - `setup_all.sql`: Script consolidado para ejecutar en 1 solo paso en el SQL Editor de Supabase.
  - Adaptador híbrido con motor local embebido de prueba: permite ejecutar y probar el sistema al 100% de inmediato incluso antes de conectar credenciales remotas de Supabase.

- **`frontend/` (HTML5, CSS3 y Vanilla JavaScript)**
  - Single Page Application (SPA) con diseño corporativo moderno (paleta Slate & Sapphire, tarjetas glassmorphism, badges dinámicos y diseño responsivo).
  - Formulario dinámico de cotizaciones: selección de cliente, adición de líneas de producto, auto-carga de tarifas, validación de stock y cálculo reactivo de Subtotal, Descuento, IGV (18%) y Total.
  - Flujo de aprobaciones: detección reactiva de descuentos fuera de rango (> 15%) y bandeja exclusiva para supervisores con aprobación/rechazo de cotizaciones pendientes.
  - Generador y exportador de cotizaciones en PDF profesional listo para entrega a clientes.
  - Selector rápido de roles en la barra superior para demostraciones interactivas (`Vendedor`, `Supervisor`, `Admin`).

---

## 📁 Estructura del Repositorio

```
proyfinal/
├── .gitignore                      # Exclusión de dependencias, .env y temporales
├── LICENSE                         # Licencia MIT (2026 Nexus SAC)
├── README.md                       # Documentación del proyecto
├── backend/
│   ├── database/
│   │   ├── 01_schema.sql           # Tablas y restricciones DDL
│   │   ├── 02_triggers.sql         # Trigger correlativo anual (YYYY-0001)
│   │   ├── 03_rls_security.sql     # Políticas RLS por rol
│   │   ├── 04_seed_data.sql        # Datos semilla para pruebas
│   │   └── setup_all.sql           # Script todo-en-uno para Supabase SQL Editor
│   ├── src/
│   │   ├── config/supabase.js      # Conector Supabase + almacenamiento local
│   │   ├── controllers/            # Controladores de productos, clientes, tarifas, cotizaciones y auth
│   │   ├── middleware/auth.js      # Validación de roles y tokens
│   │   ├── routes/api.js           # Endpoints de la API REST
│   │   └── server.js               # Servidor Express principal
│   ├── test/api.test.js            # Suite de pruebas automatizadas
│   ├── .env.example                # Variables de entorno de ejemplo
│   └── package.json
│
└── frontend/
    ├── public/
    │   ├── css/
    │   │   ├── styles.css          # Design system Nexus SAC
    │   │   └── components.css      # Componentes de cotizador, KPI cards y PDF preview
    │   ├── js/
    │   │   ├── api.js              # Cliente fetch al backend
    │   │   ├── auth.js             # Gestión de roles (RBAC) y sesión
    │   │   ├── pdf-generator.js    # Generación y descarga directa en PDF
    │   │   └── app.js              # Controlador principal SPA
    │   ├── index.html              # Dashboard y módulos de la aplicación
    │   └── login.html              # Pantalla de login corporativo
    └── package.json
```

---

## ⚡ Guía de Puesta en Marcha Rápida

### 1. Clonar e Instalar Dependencias

```bash
cd backend
npm install
```

### 2. Ejecutar Servidor

```bash
npm start
```

El servidor iniciará en: **`http://localhost:3000`**  
- Abre tu navegador en: [http://localhost:3000/login.html](http://localhost:3000/login.html) o [http://localhost:3000/](http://localhost:3000/)

### 3. Ejecutar Pruebas Automatizadas

Para validar las reglas de negocio, validaciones de RUC y flujos de aprobación:

```bash
npm test
```

---

## 🗄️ Configuración de Supabase (Opcional para producción)

1. Ingresa a tu proyecto en [Supabase Console](https://supabase.com).
2. Ve al **SQL Editor** y copia el contenido completo del archivo [`backend/database/setup_all.sql`](file:///c:/Personal/Estudio/Dmc/Esp-Vibe-Coding-App/Antigravity/proyfinal/backend/database/setup_all.sql).
3. Haz clic en **Run** para crear las tablas, triggers correlativos, políticas RLS y datos iniciales.
4. En el archivo `backend/.env`, coloca tus credenciales:
   ```env
   PORT=3000
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_KEY=tu-anon-key-de-supabase
   ```
5. Reinicia el servidor backend (`npm start`). El servidor detectará automáticamente la conexión a Supabase Cloud.

---

## ⚖️ Reglas de Negocio Implementadas

1. **Generación Automática del Número de Cotización**:
   - Formato: `YYYY-0001` (ej. `2026-0001`, `2026-0002`).
   - Se reinicia anualmente mediante trigger en base de datos.
2. **Validación Estricta de RUC / DNI**:
   - DNI: 8 dígitos numéricos.
   - RUC: 11 dígitos numéricos, **obligatoriamente debe iniciar con `10` (persona natural) o `20` (persona jurídica)**.
   - Máximo 15 caracteres permitidos.
3. **Flujo de Aprobaciones de Descuentos**:
   - Descuento &le; 15%: Cotización emitida en estado **`aprobado`**.
   - Descuento &gt; 15%: Genera automáticamente una solicitud en estado **`pendiente`**.
   - Rol **Supervisor** accede a la bandeja de aprobaciones para autorizar o rechazar con observaciones.
4. **Control de Acceso a Catálogos Maestros (RBAC)**:
   - **Solo el Administrador** puede crear o modificar Productos, Clientes y Tarifas.
   - Los roles **Vendedor** y **Supervisor** solo tienen permisos de consulta (modo solo lectura).
   - El backend bloquea intentos no autorizados devolviendo `HTTP 403 Forbidden`.
5. **Cierre de Sesión y Elección de Rol (Logout)**:
   - Botón de cierre de sesión en la barra lateral y header superior para limpiar la sesión activa y permitir elegir rol desde la pantalla de login.
6. **Cálculo Automático**:
   - Subtotal = Cantidad &times; Tarifa
   - Base Imponible = Subtotal &minus; Descuento
   - IGV = Base Imponible &times; 18%
   - Total = Base Imponible + IGV
7. **Exportación a PDF**:
   - Botón directo para descargar la cotización oficial en formato PDF vectorial con membrete de Nexus SAC, desglose tributario y datos del cliente.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT** - consulta el archivo [`LICENSE`](file:///c:/Personal/Estudio/Dmc/Esp-Vibe-Coding-App/Antigravity/proyfinal/LICENSE) para más detalles.
