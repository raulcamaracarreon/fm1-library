# FM-1 Library — catálogo autoactualizable para Netlify

Catálogo web estático del **M-VAVE FM-1**, listo para alojarse en **Netlify** y actualizarse automáticamente con **GitHub Actions**. Incluye una instantánea de **282 paquetes** tomada del catálogo proporcionado el 21 de noviembre de 2026. **El sitio NO contiene archivos `.fwsc` binarios**: facilita el acceso a las publicaciones de los desarrolladores.

## Arquitectura

```text
The Firmware Hub /catalog.json
         │ (máximo una consulta diaria desde nuestro GitHub Actions)
         ▼
 .github/workflows/actualizar.yml
         │
         ▼
 scripts/update_catalog.py  ──validar/comparar──▶ public/catalog.json
                                                 public/changes.json
         │ (commit si hay cambios)
         ▼
    GitHub (repositorio)
         │ (conexión oficial de Git)
         ▼
    Netlify (sitio estático)
         │
         ▼
     public/index.html + app.js + styles.css
```

**Importante:** los visitantes nunca consultan el dominio del Hub para obtener el listado. El workflow solicita `catalog.json` **una sola vez por día**, con `User-Agent` identificable y valida los campos antes de actualizar; si el servidor falla, conserva el último catálogo. Si no hay cambios de firmware, no crea un commit nuevo.

## Publicar el sitio (paso a paso)

1. Descomprime este ZIP en una carpeta de tu PC, conservando la carpeta oculta `.github`.
2. En GitHub, crea un **repositorio nuevo** (por ejemplo `fm1-library`). Puedes hacerlo público.
3. Sube **todo el contenido de esta carpeta** a la raíz del repositorio, incluyendo `.github/workflows/actualizar.yml`, `public`, `scripts`, `tests` y `netlify.toml`.
4. En GitHub, entra en **Settings → Actions → General → Workflow permissions** y marca **Read and write permissions** si está disponible. El workflow declara `contents: write`, pero algunas organizaciones restringen permisos.
5. En Netlify, elige **Add new project → Import an existing project**, conecta GitHub y selecciona ese repositorio.
6. El archivo `netlify.toml` ya configura `publish = "public"`. No se necesita `npm`, dependencias ni backend. Publica el proyecto.
7. En GitHub, entra en **Actions → Actualizar catálogo FM-1 → Run workflow** para comprobar la tarea. En la siguiente ejecución programada se revisarán novedades.
8. Al detectar nuevos proyectos o versiones, el workflow modifica `public/catalog.json` y GitHub dispara el **despliegue automático** de Netlify, siempre que esté conectado mediante Git.

> **No usar Netlify Drop como método permanente de actualización.** Es útil para una vista previa, pero un ZIP subido manualmente no recibe los futuros cambios del repositorio hasta conectar GitHub.

## Frecuencia y mantenimiento

- Programación: **15:17 UTC diario**, alrededor de **09:17 de Ciudad de México** (UTC−6).
- GitHub puede retrasar las ejecuciones programadas según la carga. En repositorios públicos sin actividad puede desactivar automáticamente tareas `schedule` después de 60 días; revisa periódicamente la pestaña Actions.
- Para ejecutar manualmente: GitHub → Actions → Actualizar catálogo FM-1 → Run workflow.
- El botón *Recargar* del HTML obtiene **solo la copia alojada en Netlify**, no vuelve a consultar al Hub.
- Si GitHub Actions falla, la web sigue disponible con los datos ya publicados. No se borra información automáticamente por un error de red.

## Descargas originales de firmware

La política de reutilización de The Firmware Hub indica que los consumidores de `catalog.json` deben **descargar paquetes desde las publicaciones de los desarrolladores**, no desde el espejo del Hub. Por ello:

- El botón **Obtener .fwsc** busca en la API pública de GitHub el recurso original, usando su `assetId` incluido en el catálogo. Si GitHub permite resolverlo, abre su URL de descarga.
- Si no está disponible, abre la publicación original o la página del proyecto, donde podrás elegir manualmente el `.fwsc`.
- La API pública de GitHub puede imponer límites de consultas sin autenticación; por eso hay un enlace de respaldo.
- Las herramientas enlazadas **no instalan firmware en el dispositivo físico**; el objetivo es el uso informativo y las pruebas en FM-1 Emulator VST. Antes de instalar en hardware, comprueba siempre compatibilidad del chip flash, precauciones del autor y respaldos.

## Probar localmente

Abrir `public/index.html` mediante doble clic no es suficiente (el navegador bloquearía el acceso a `/catalog.json`). Usa un servidor local:

```powershell
cd RUTA\A\FM1_Catalogo_Netlify_Auto\public
python -m http.server 8000
```

Abre `http://localhost:8000`.

## Ejecutar actualizaciones manuales (desarrollo)

```bash
python scripts/update_catalog.py
```

Este comando **consulta el catálogo fuente**: no lo ejecutes más de una vez al día. Para probar sin red se puede usar `python scripts/update_catalog.py --from-file catalogo_fuente.json` con un JSON original descargado previamente.

## Estructura

- `public/index.html`: interfaz web en español.
- `public/styles.css`: estilos adaptables a escritorio y móvil.
- `public/app.js`: buscador, filtros, descarga desde autores y exportación CSV.
- `public/catalog.json`: instantánea de metadatos para Netlify.
- `public/changes.json`: IDs de proyectos nuevos, actualizados y retirados desde el último cambio.
- `scripts/update_catalog.py`: consulta el JSON una vez y normaliza los datos (Python estándar, sin dependencias).
- `.github/workflows/actualizar.yml`: automatización diaria y manual.
- `netlify.toml`: configuración de publicación del sitio.

## Atribución y condiciones

**Firmware list: [The Firmware Hub](https://thefirmwarehub.com) – thefirmwarehub.com.** Compilación del listado bajo **[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)**, adaptada y reorganizada para esta herramienta. No se reproducen los textos descriptivos ni imágenes de los autores. Cada proyecto identifica a su creador y enlaza al repositorio de origen. Consulta [las condiciones vigentes del catálogo](https://thefirmwarehub.com/kb/#catalog).
