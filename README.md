# FM-1 Library 🎛️

**Catálogo comunitario de firmwares para el sintetizador M-VAVE FM-1.** Explora proyectos, compara sus versiones y encuentra los paquetes `.fwsc` en las publicaciones de sus creadores. El directorio se actualiza automáticamente a partir de los metadatos de The Firmware Hub.

**🌐 [Abrir FM-1 Library (Netlify)](https://fm1-library.netlify.app/)** · **💻 [Ver código fuente (GitHub)](https://github.com/raulcamaracarreon/fm1-library)** · **📚 [Catálogo de origen: The Firmware Hub](https://thefirmwarehub.com/)**

> **Proyecto independiente, no oficial.** No está afiliado a M-VAVE, The Firmware Hub ni a los autores de los firmwares. La biblioteca **no aloja paquetes `.fwsc`** ni instala firmware en dispositivos: proporciona metadatos y accesos a los proyectos originales.

## Qué puedes hacer

- **Buscar** por firmware, creador, versión o nombre de paquete.
- **Filtrar** por categoría, proyectos con versión web, novedades y versiones beta.
- **Ordenar** por nombre, fecha o autor.
- **Consultar** versión publicada, fecha, autor, tipo de memoria flash y repositorio de origen.
- **Abrir** simuladores o editores web cuando el desarrollador los proporciona.
- **Obtener un `.fwsc`** desde GitHub Releases del autor, cuando el archivo está disponible; si no se puede resolver directamente, abrir la publicación o página de origen.
- **Exportar CSV** con los resultados de la búsqueda y los filtros seleccionados.

El catálogo arrancó con una instantánea de **282 registros (21 de noviembre de 2026)**. La cantidad en la web puede variar cuando se incorporan proyectos, cambian las versiones o se retiran entradas.

## Uso

1. Entra en **[fm1-library.netlify.app](https://fm1-library.netlify.app/)**.
2. Busca, por ejemplo, **LOOM-8, JIANT, SLOOP, Felucca, Skiff, OberVave o Ravel**.
3. Usa **Probar** o **Editor** si el proyecto dispone de una versión para navegador.
4. Selecciona **Obtener .fwsc** para ir al archivo original de GitHub o a la página de lanzamiento del desarrollador.
5. Si deseas experimentar con **FM-1 Emulator (VST)** en Reason o Reaper, abre el plugin y selecciona **Load firmware / save...** para cargar el `.fwsc` compatible.

**Advertencia:** usar un paquete en un emulador no demuestra que sea seguro instalarlo en el hardware físico. Comprueba las indicaciones del autor, la compatibilidad con tu revisión de memoria flash y realiza una copia de seguridad antes de actualizar el FM-1.

## Rankings de popularidad (instalaciones y estrellas)

La biblioteca aprovecha dos **contadores públicos del catálogo de The Firmware Hub**:
- **Instalaciones registradas en The Firmware Hub** (`installs`): recuento disponible en la fuente, no cantidad verificada de usuarios únicos ni evaluación de calidad.
- **Estrellas del repositorio GitHub** (`stars`): señal de interés en el código del proyecto; tampoco es una reseña de calidad.

**Ordenar** permite colocar primero los más instalados o los más destacados con estrellas. El filtro **Ranking** ofrece Top 10/25/50 por cada indicador y umbrales mínimos (1,000 instalaciones o 50 estrellas). **Excluir sin métricas** oculta proyectos sin ninguno de los dos datos. Los valores no disponibles se representan como **—**, nunca como cero.

Los Top se calculan **globalmente sobre el catálogo completo**, antes de combinar la búsqueda, la categoría o la exclusión de betas. El CSV incluye ambas métricas y respeta la búsqueda, los filtros y el orden vigente. Los conteos se actualizan desde el **mismo JSON diario**, sin nuevas consultas a The Firmware Hub.

No se incluyen puntuaciones o calificaciones subjetivas porque los datos de valoraciones de usuarios no están presentes en el catálogo reutilizado. Las clasificaciones son informativas.

## Cómo se mantiene actualizado

El navegador de cada visitante **solo lee archivos alojados en este mismo sitio**. No realiza consultas al catálogo de origen.

~~~text
The Firmware Hub /catalog.json
         │
         │ 1 consulta programada al día
         ▼
GitHub Actions (.github/workflows/actualizar.yml)
         │
         ▼
scripts/update_catalog.py
         │ normaliza, valida y compara
         ▼
public/catalog.json  +  public/changes.json
         │ commit únicamente si hay cambios
         ▼
GitHub (rama main)
         │ despliegue conectado por Git
         ▼
Netlify → https://fm1-library.netlify.app/
~~~

- **Frecuencia:** una ejecución programada a las **15:17 UTC** (09:17 en Ciudad de México, UTC−6). GitHub Actions puede retrasar la ejecución.
- **Actualización manual:** en GitHub, **Actions → Actualizar catálogo FM-1 → Run workflow**. Respeta el límite de **una lectura diaria** establecido por la fuente; no ejecutes actualizaciones adicionales si ya se realizó la consulta ese día.
- **Detección de cambios:** se comparan identificadores, versiones y huellas SHA-256. El sitio identifica los proyectos nuevos o actualizados.
- **Disponibilidad:** si la consulta falla, se conserva el último catálogo publicado; la tarea informa del error sin borrar registros.
- **Despliegue:** Netlify publica automáticamente los cambios si el proyecto está conectado a la rama `main`.
- El botón **Recargar** de la web vuelve a leer la **copia de Netlify**, no consulta The Firmware Hub.

**Nota operativa:** GitHub puede deshabilitar tareas programadas tras periodos prolongados de inactividad en algunos repositorios públicos. Revisa ocasionalmente la pestaña [Actions](https://github.com/raulcamaracarreon/fm1-library/actions).

## Estructura del repositorio

~~~text
fm1-library/
├── .github/workflows/actualizar.yml  # Consulta diaria y ejecución manual
├── public/
│   ├── index.html                     # Interfaz en español
│   ├── styles.css                     # Estilos adaptables
│   ├── app.js                         # Búsqueda, filtros y enlaces
│   ├── catalog.json                   # Última copia normalizada
│   └── changes.json                   # Novedades del último cambio
├── scripts/update_catalog.py          # Descarga, validación y comparación
├── tests/test_catalog.py              # Pruebas del procesador
├── netlify.toml                        # Publicación de /public
└── README.md
~~~

El frontend utiliza **HTML, CSS y JavaScript sin framework**. La actualización se realiza con **Python 3 (biblioteca estándar)**. El sitio no requiere una base de datos ni un backend en ejecución permanente.

## Desarrollo local

Se necesita Python 3 para servir la web. Desde la raíz del repositorio:

~~~powershell
git clone https://github.com/raulcamaracarreon/fm1-library.git
cd fm1-library
python -m http.server 8000 --directory public
~~~

Abre **http://localhost:8000/**. No abras `public/index.html` con doble clic: el navegador puede bloquear la lectura local del JSON.

Para ejecutar las pruebas, desde la raíz:

~~~powershell
python -m unittest discover -s tests -v
~~~

Para procesar una copia **ya descargada** del catálogo fuente, sin hacer otra consulta a la red:

~~~powershell
python scripts/update_catalog.py --from-file fuente.json
~~~

La ejecución sin `--from-file` consulta la fuente remota: **no la ejecutes más de una vez al día**, en conjunto con cualquier actualización programada.

## Publicación en Netlify

1. Importa el repositorio de GitHub como un sitio nuevo o utiliza el proyecto ya conectado.
2. Configura la rama de producción `main`.
3. Usa la carpeta de publicación **`public`**. `netlify.toml` ya la define; no hay comando de compilación ni dependencias de Node.
4. Comprueba que la URL publicada sea **https://fm1-library.netlify.app/** y que `/catalog.json` se pueda leer.
5. Para las actualizaciones automáticas, revisa que **GitHub Actions** esté habilitado y tenga permisos de escritura del contenido.

Si el sitio muestra un **404**, comprueba que la configuración publica `public/` y que `public/index.html` existe en la raíz de la rama desplegada. Evita subir un ZIP manual como mecanismo definitivo de actualización: conecta Netlify a GitHub.

## Fuente de datos y descargas

- **Fuente:** [The Firmware Hub](https://thefirmwarehub.com/) — [condiciones del catálogo](https://thefirmwarehub.com/kb/#catalog).
- **Licencia del listado original:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Atribución requerida: **Firmware list: The Firmware Hub – https://thefirmwarehub.com**.
- La biblioteca reorganiza **metadatos técnicos**: no reproduce fichas descriptivas ni imágenes de los creadores.
- Los nombres de los desarrolladores y sus repositorios se conservan como atribución y referencia.
- Para archivos `.fwsc`, se prioriza la **publicación original del autor**. La API pública de GitHub puede limitar peticiones y algunos autores usan páginas externas, por lo que ciertos enlaces llevan a la página de publicación en vez de descargar directamente.
- El código de los firmwares pertenece a sus respectivos autores y puede tener licencias distintas. La licencia CC BY 4.0 del **catálogo** no concede derechos sobre esos proyectos.

## Colaboración y mantenimiento

Se agradecen reportes de errores, problemas con enlaces o propuestas de mejoras mediante [GitHub Issues](https://github.com/raulcamaracarreon/fm1-library/issues). Para revisar qué se ha publicado, consulta el [historial de commits](https://github.com/raulcamaracarreon/fm1-library/commits/main) y la sección [Actions](https://github.com/raulcamaracarreon/fm1-library/actions).

**Autor del directorio:** [Raúl Cámara Carreón](https://github.com/raulcamaracarreon).  
**Sitio público:** [FM-1 Library en Netlify](https://fm1-library.netlify.app/).  
**Repositorio:** [raulcamaracarreon/fm1-library](https://github.com/raulcamaracarreon/fm1-library).
