# CabinOS

**Your truck. Your experience.**  
*Personalized Truck Infotainment System for Euro Truck Simulator 2.*

CabinOS es un proyecto independiente para Windows orientado exclusivamente a **Euro Truck Simulator 2 (ETS2)**. Su objetivo es ofrecer una experiencia de infoentretenimiento personalizable dentro de la cabina: pantalla integrada, mapas construidos a partir de los archivos locales del juego, navegación, telemetría, multimedia y perfiles configurables por camión.

> **Estado del proyecto:** desarrollo inicial. Esta rama parte de la base técnica de WestPlay 2.4.0. Todavía no constituye una versión instalable ni una distribución lista para usuarios.

## Objetivos

- Aplicación de escritorio propia, con identidad y diseño CabinOS.
- Integración nativa con ETS2 mediante el plugin y el puente de telemetría.
- Perfiles independientes por camión, con configuración, aplicaciones, accesos directos y apariencia.
- Administrador de aplicaciones y accesos directos, con asignación global o por perfil.
- Mapas locales compatibles con los archivos del juego y, cuando la base técnica lo permita, mapas modificados como ProMods.
- Personalización de la pantalla de cabina, iconos, fondos y distribución.
- Actualizaciones manuales que preserven perfiles y preferencias.
- Instalador de Windows y código fuente completo.

## Plataforma y alcance

- Sistema operativo objetivo: Windows 10/11 de 64 bits.
- Juego soportado: Euro Truck Simulator 2 únicamente.
- American Truck Simulator queda fuera del alcance de CabinOS.
- La compatibilidad final depende de la versión de ETS2, los camiones, los mods y las pruebas reales de integración.

## Arquitectura heredada y componentes

CabinOS conserva como punto de partida los componentes técnicos necesarios para la integración: aplicación Tauri, interfaz React, host WebView2 fuera de pantalla, plugin nativo basado en el SDK de SCS, captura gráfica, entrada y telemetría, además del procesamiento local de mapas. Estos componentes se auditarán y adaptarán de forma gradual; no se reemplazarán a ciegas.

## Desarrollo

El trabajo se organiza en etapas:

1. Auditoría técnica y separación de la base heredada.
2. Identidad CabinOS y exclusividad ETS2.
3. Persistencia independiente y gestor de perfiles por camión.
4. Catálogo de aplicaciones y accesos directos.
5. Rediseño de la aplicación de escritorio y de la interfaz de cabina.
6. Actualizador propio con preservación de datos.
7. Pruebas de integración con ETS2 y creación del instalador.

No se publicarán instaladores hasta contar con pruebas de compilación, firma/configuración de actualizaciones y validación en el juego.

## Compilar en Windows

Requisitos de desarrollo:

- Windows 10/11 de 64 bits.
- Node.js 24 y npm.
- Rust stable con el target MSVC x64 y las herramientas de compilación de Visual Studio.
- WebView2 Runtime.

Desde la raíz del repositorio:

```powershell
npm ci
npm ci --prefix ui
npm test --prefix ui
cargo test --workspace --locked
npm run build
```

El comando de compilación prepara primero la interfaz y los componentes nativos propios de CabinOS (plugin ETS2, detector DirectX y constructor de mapas). El instalador se habilitará cuando la compilación y el empaquetado de Windows estén validados.

## Licencia y atribución

CabinOS se desarrolla a partir de [WestPlay](https://github.com/enes-less/WestPlay), proyecto publicado bajo **GNU General Public License v3.0 o posterior (GPL-3.0-or-later)**. Se conservan la licencia original y los avisos de terceros aplicables. Los cambios y la nueva identidad de CabinOS no implican afiliación, patrocinio ni aprobación por parte del autor de WestPlay ni de SCS Software.

Consulta `LICENSE`, `THIRD_PARTY_LICENSES.md` y `THIRD_PARTY_NOTICES.md` antes de redistribuir compilaciones.

---

**CabinOS — El Abuelo Streaming**
