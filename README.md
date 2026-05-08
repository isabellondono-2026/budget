# Presupuestos Alegra — Deploy en Netlify

## Cómo funciona

```
Usuario escribe email + token en pantalla
→ navegador envía token al proxy de Netlify (HTTPS, mismo dominio)
→ Netlify Function llama a api.alegra.com con ese token
→ datos reales de vuelta al prototipo
```

El token **nunca va directo a Alegra desde el navegador** (evita el bloqueo de CORS).
Pasa por el servidor de Netlify que actúa de intermediario.
No se almacena en ningún lado — desaparece al cerrar la pestaña.

---

## Paso a paso para publicar en Netlify desde GitHub

### 1. Subir el proyecto a GitHub

1. Ve a [github.com](https://github.com) → **New repository**
2. Nombre: `alegra-presupuestos` · Visibilidad: **Private**
3. Clic en **"uploading an existing file"**
4. Descomprime el zip y arrastra **todo el contenido** de la carpeta `alegra-presupuestos/`
5. **Commit changes**

### 2. Conectar con Netlify

1. Ve a [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
2. Elige **GitHub** y selecciona el repo `alegra-presupuestos`
3. Configuración:
   - **Build command**: (vacío)
   - **Publish directory**: `public`
4. Clic en **Deploy site**

> ⚠️ No necesitas configurar variables de entorno — el token lo ingresa cada usuario en pantalla.

### 3. Compartir el enlace

Netlify te da una URL tipo `https://alegra-presupuestos.netlify.app`.
Cualquier persona con el enlace puede ingresar su propio email y token de Alegra
para conectar su cuenta.

---

## Estructura de archivos

```
alegra-presupuestos/
├── netlify.toml                  ← configura el proxy /api/alegra
├── netlify/functions/alegra.js   ← proxy que reenvía calls a api.alegra.com
└── public/
    ├── index.html
    ├── alegra-data.js            ← funciones testAlegraConnection y loadAlegraData
    ├── BudgetWizard.jsx          ← Step 0: formulario de credenciales
    └── ...
```
