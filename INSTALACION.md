# NEXO — Guía de instalación paso a paso
## Para principiantes (sin experiencia técnica previa)

---

## ¿QUÉ NECESITAS INSTALAR PRIMERO?

Antes de empezar, instala estas herramientas en tu computador:

### 1. Node.js (motor que corre el código)
→ Descarga desde: https://nodejs.org
→ Elige la versión "LTS" (la recomendada)
→ Instala normalmente como cualquier programa

### 2. Visual Studio Code (editor de código)
→ Descarga desde: https://code.visualstudio.com
→ Es gratis y el más popular

### 3. Expo Go (para ver la app en tu celular)
→ Busca "Expo Go" en App Store (iPhone) o Play Store (Android)
→ Instálalo en tu celular

---

## PASO 1: CREAR CUENTA EN SUPABASE (base de datos gratis)

1. Ve a https://supabase.com
2. Clic en "Start your project" → regístrate con Google o email
3. Clic en "New Project"
   - Nombre: nexo
   - Contraseña: escribe una contraseña (¡guárdala!)
   - Región: South America (São Paulo) — la más cercana
4. Espera 2 minutos mientras crea el proyecto

5. Cuando esté listo, ve a:
   Settings → API
   Copia estos dos valores:
   - "Project URL" → lo usarás como SUPABASE_URL
   - "service_role" (en "Project API keys") → SUPABASE_SERVICE_KEY

6. Crea las tablas:
   - Ve a "SQL Editor" en el menú izquierdo
   - Clic en "New query"
   - Abre el archivo: backend/src/config/database.sql
   - Copia TODO el contenido y pégalo en el editor
   - Clic en "Run" (botón verde)
   - Verás "Success" si todo salió bien ✓

---

## PASO 2: CONFIGURAR EL BACKEND

Abre la Terminal (en Mac) o PowerShell (en Windows):

```bash
# 1. Entra a la carpeta del backend
cd nexo/backend

# 2. Instala todas las dependencias
npm install

# 3. Crea el archivo de configuración
# Copia el archivo .env.example y renómbralo a .env
cp .env.example .env
```

Ahora abre el archivo `.env` con VSCode y llena los valores:
```
SUPABASE_URL=https://tu-proyecto.supabase.co    ← el que copiaste
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...   ← el que copiaste
JWT_SECRET=cualquier_palabra_secreta_larga_123   ← invéntate una
```

Guarda el archivo.

---

## PASO 3: INICIAR EL BACKEND

En la terminal, dentro de la carpeta `nexo/backend`:

```bash
npm run dev
```

Deberías ver:
```
  ✦ NEXO Backend iniciado
  → http://localhost:3000
```

Para verificar que funciona, abre en tu navegador:
http://localhost:3000/health

Deberías ver: `{"status":"OK","app":"NEXO Backend"}`  ✓

---

## PASO 4: CONFIGURAR EL FRONTEND

Abre UNA NUEVA terminal (deja la del backend abierta):

```bash
# 1. Entra a la carpeta del frontend
cd nexo/frontend

# 2. Instala dependencias
npm install

# 3. Instala la herramienta Expo globalmente
npm install -g expo-cli
```

Ahora necesitas saber la IP de tu computador:
- Windows: abre cmd y escribe `ipconfig` → busca "IPv4 Address" (algo como 192.168.1.X)
- Mac: abre terminal y escribe `ifconfig | grep inet` → busca algo como 192.168.1.X

Abre el archivo `frontend/src/services/api.js` y cambia:
```javascript
const BASE_URL = 'http://192.168.1.100:3000/api';
//                        ↑ Cambia esto por tu IP real
```

Haz lo mismo en `frontend/src/services/socketService.js`:
```javascript
const SOCKET_URL = 'http://192.168.1.100:3000';
//                          ↑ Cambia esto por tu IP real
```

---

## PASO 5: INICIAR LA APP EN TU CELULAR

```bash
# En la carpeta nexo/frontend:
npx expo start
```

Verás un código QR en la terminal.

**En Android:** Abre Expo Go → "Scan QR Code" → apunta al código
**En iPhone:** Abre la cámara → apunta al código QR → toca la notificación

¡La app NEXO debería abrirse en tu celular! 🎉

---

## PASO 6: CREAR TU PRIMERA CUENTA

1. En la app, toca "Crear cuenta"
2. Llena el formulario de 3 pasos
3. Inicia sesión
4. ¡Ya puedes usar la app!

---

## PROBLEMAS COMUNES

**"Error de conexión" en la app:**
- Verifica que el backend esté corriendo (paso 3)
- Verifica que la IP en api.js sea correcta
- Asegúrate de que el celular esté en la misma red WiFi que el computador

**"npm no se reconoce como comando":**
- Node.js no se instaló correctamente
- Cierra y abre la terminal, vuelve a intentar
- Reinstala Node.js

**El backend muestra error de Supabase:**
- Verifica que las credenciales en .env sean correctas
- No debe haber espacios antes o después del signo =

**La pantalla del mapa no aparece:**
- Necesitas una clave de Google Maps API
- Ve a console.cloud.google.com → crea un proyecto → activa Maps SDK
- Agrégala al .env como GOOGLE_MAPS_API_KEY=tu_clave

---

## ESTRUCTURA DEL PROYECTO

```
nexo/
├── backend/                    ← Servidor (Node.js)
│   ├── src/
│   │   ├── index.js            ← Punto de entrada
│   │   ├── routes/             ← Rutas de la API
│   │   │   ├── auth.js         ← Login, registro
│   │   │   ├── matches.js      ← Likes, matches, feed
│   │   │   ├── chat.js         ← Mensajes
│   │   │   ├── entorno.js      ← Personas cercanas
│   │   │   └── monetization.js ← Monedas, premium
│   │   ├── controllers/        ← Lógica de negocio
│   │   ├── services/
│   │   │   └── matchingService.js ← Algoritmo IA
│   │   ├── middleware/
│   │   │   └── auth.js         ← Verificación JWT
│   │   ├── socket/
│   │   │   └── socketHandler.js ← Chat tiempo real
│   │   └── config/
│   │       ├── supabase.js     ← Conexión BD
│   │       └── database.sql    ← Esquema completo
│   ├── .env.example            ← Plantilla de variables
│   └── package.json
│
└── frontend/                   ← App móvil (React Native)
    ├── App.js                  ← Punto de entrada
    └── src/
        ├── screens/            ← Pantallas
        │   ├── LoginScreen.js
        │   ├── RegisterScreen.js
        │   ├── HomeScreen.js   ← Swipe principal
        │   ├── EntornoScreen.js ← Mapa cercanos
        │   ├── MatchesScreen.js ← Matches y chat
        │   ├── ChatScreen.js   ← Conversaciones
        │   └── ProfileScreen.js
        ├── components/
        │   └── MatchModal.js   ← Popup nuevo match
        ├── navigation/
        │   └── AppNavigator.js ← Rutas de la app
        ├── services/
        │   ├── api.js          ← Todas las llamadas HTTP
        │   └── socketService.js ← Chat tiempo real
        └── store/
            └── useStore.js     ← Estado global
```

---

## PRÓXIMOS PASOS PARA LANZAR

1. **Dominio y servidor:** Contrata un VPS en DigitalOcean (~$6/mes)
   o usa Railway.app (gratis hasta cierto límite)

2. **Pagos reales:** Crea cuenta en Stripe.com o PayU Colombia
   y reemplaza el código de pagos simulados

3. **Notificaciones push:** Usa Expo Push Notifications (gratis)

4. **Publicar en tiendas:**
   - Google Play: $25 (pago único) → play.google.com/console
   - Apple App Store: $99/año → developer.apple.com

5. **Analytics:** Instala Firebase Analytics para ver cómo usan la app

---

¿Tienes preguntas? El asistente puede ayudarte con cualquier
parte del proceso. Solo describe el problema exactamente como
aparece en la pantalla.
