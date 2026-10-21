# 🏢 Nexus SAC - Sistema B2B de Cotizaciones y Tarifas (MVP)

> **MVP de aplicación web empresarial** desarrollada para centralizar el proceso de cotización comercial, automatizar el cálculo de tarifas e IGV, validar stock en tiempo real, aplicar flujos de aprobación para solicitudes de descuento especiales y emitir cotizaciones oficiales en PDF.

🌐 **Demo en vivo en GitHub Pages**: [https://djfernandez.github.io/evcappproyfinal/](https://djfernandez.github.io/evcappproyfinal/)

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
├── .github/
│   └── workflows/
│       └── deploy-pages.yml        # Despliegue del frontend en GitHub Pages
├── LICENSE                         # Licencia MIT (2026 Nexus SAC)
├── README.md                       # Documentación del proyecto
├── Especificacion_Tecnica_Nexus.md # Requerimientos funcionales del MVP
├── Promp_Nexus.md                  # Prompt y alcance original del proyecto
├── Proyecto final.txt              # Enunciado del proyecto
├── Product Brief.png               # Brief visual del producto
├── backend/
│   ├── database/
│   │   ├── 01_schema.sql           # Tablas y restricciones DDL
│   │   ├── 02_triggers.sql         # Trigger correlativo anual (YYYY-0001)
│   │   ├── 03_rls_security.sql     # Políticas RLS por rol
│   │   ├── 04_seed_data.sql        # Datos semilla para pruebas
│   │   ├── 05_github_pages_security.sql # Políticas para el frontend publicado
│   │   └── setup_all.sql           # Script todo-en-uno para Supabase SQL Editor
│   ├── src/
│   │   ├── config/supabase.js      # Conector Supabase + almacenamiento local
│   │   ├── controllers/            # Controladores de auth, productos, clientes, tarifas y cotizaciones
│   │   ├── middleware/auth.js      # Validación de roles y tokens
│   │   ├── routes/api.js           # Endpoints de la API REST
│   │   └── server.js               # Servidor Express principal
│   ├── test/api.test.js            # Suite de pruebas automatizadas
│   ├── package.json
│   └── package-lock.json
│
└── frontend/
    ├── public/
    │   ├── css/
    │   │   ├── styles.css          # Design system Nexus SAC
    │   │   └── components.css      # Componentes de cotizador, KPI cards y PDF preview
    │   ├── js/
    │   │   ├── api.js              # Cliente fetch al backend
    │   │   ├── auth.js             # Gestión de roles (RBAC) y sesión
    │   │   ├── supabase-config.js  # Configuración pública generada en Actions
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

La suite automatizada está en `backend/test/api.test.js` y utiliza el almacenamiento local si no hay credenciales de Supabase configuradas.

---

## 🗄️ GitHub Pages y conexión con Supabase

GitHub Pages sirve el frontend estático. La conexión de producción se hace desde el navegador con Supabase Auth y la clave pública `anon`; no se requiere alojar el backend Node para esta modalidad.

1. En Supabase, abre **SQL Editor** y ejecuta [`backend/database/05_github_pages_security.sql`](./backend/database/05_github_pages_security.sql). Es obligatorio, especialmente si se ejecutó `setup_all.sql`: esa configuración inicial habilita políticas de demostración públicas y esta migración las reemplaza por políticas RLS para usuarios autenticados.
2. En **Authentication → Users**, crea una cuenta por cada usuario. Copia el UUID de cada usuario y, desde SQL Editor, inserta el perfil asociado:
   ```sql
   INSERT INTO public.profiles (id, email, full_name, role)
   VALUES ('UUID-DE-AUTH', 'usuario@empresa.com', 'Nombre Apellido', 'administrador');
   ```
   Usa el UUID exacto de Auth y asigna un rol válido: `vendedor`, `supervisor` o `administrador`. Los perfiles de demostración sembrados no son cuentas de Supabase Auth.
3. En GitHub, abre **Settings → Secrets and variables → Actions** y configura:
   - Variable `SUPABASE_URL`: URL del proyecto, por ejemplo `https://xxxx.supabase.co`.
   - Secret `SUPABASE_ANON_KEY`: clave publicable/anon del proyecto. **Nunca** uses `service_role` en GitHub Pages ni en ningún frontend.
4. En **Settings → Pages**, selecciona **GitHub Actions** como fuente de publicación.
5. El workflow [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) publica `frontend/public` al hacer push a `main` o al ejecutarlo manualmente desde **Actions**. Falla explícitamente si faltan las dos variables de Supabase.

La URL prevista de Pages es [https://djfernandez.github.io/evcappproyfinal/](https://djfernandez.github.io/evcappproyfinal/). En desarrollo local, sin `supabase-config.js` configurado, la app conserva el modo demo; para el despliegue, Actions genera ese archivo a partir de la configuración de GitHub y lo incluye en el artefacto.

El backend Express continúa disponible para desarrollo local y se configura con `SUPABASE_URL` y `SUPABASE_KEY` en `backend/.env`.

Si al crear una cotización aparece `duplicate key value violates unique constraint "quotations_quotation_number_key"`, el contador anual puede estar atrasado respecto a cotizaciones ya guardadas. Ejecuta nuevamente `backend/database/02_triggers.sql` en el SQL Editor de Supabase para actualizar el generador; el siguiente intento elegirá un correlativo posterior a los números existentes.

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
   - **Solo el Administrador** puede crear o modificar Productos, Clientes y Tarifas. En cada catálogo, el botón **Editar** abre un formulario para actualizar sus datos; la tarifa se edita desde su propio catálogo.
   - Los roles **Vendedor** y **Supervisor** solo tienen permisos de consulta (modo solo lectura).
   - La API bloquea intentos no autorizados devolviendo `HTTP 403 Forbidden`, y las políticas RLS aplican la misma regla en Supabase.
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

Este proyecto está bajo la Licencia **MIT** - consulta el archivo [`LICENSE`](./LICENSE) para más detalles.
