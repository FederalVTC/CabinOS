# CabinOS — Arquitectura y criterios de implementación

## Principios

- ETS2 es el único juego objetivo. ATS no debe aparecer en el onboarding, detección, instalación, configuración ni interfaz de usuario.
- La integración con el juego debe conservar el ciclo de vida del plugin SCS, la telemetría, la captura Direct3D, los hooks de entrada y el puente entre plugin y host.
- Los datos de CabinOS deben vivir separados de la carpeta de instalación y de los perfiles/partidas de ETS2.
- Las configuraciones deben sobrevivir a reinstalaciones y actualizaciones.
- No se debe importar ni sobrescribir automáticamente la configuración de WestPlay.
- Las funciones que dependan de servicios externos se mostrarán como disponibles solo cuando su integración real lo permita.

## Perfiles de camión

Cada perfil tendrá un identificador UUID estable y una identidad de vehículo. La asociación automática debe priorizar un identificador único proporcionado por ETS2; en su defecto, marca/modelo/variante y, finalmente, una asociación manual. No se debe cambiar de perfil cuando la identidad detectada sea ambigua. Los camiones desconocidos usarán un perfil predeterminado.

Datos previstos por perfil:

- Identidad y nombre personalizado del camión.
- Aplicaciones, favoritos y accesos directos.
- Tema, fondo, color de acento e iconos.
- Distribución de pantalla y preferencias de navegación.
- Fechas de creación y modificación y versión del esquema.

## Persistencia propuesta

```text
%LOCALAPPDATA%/CabinOS/profiles/
├── default.json
└── <profile-id>.json

La ubicación exacta se obtiene mediante el directorio de datos locales de Tauri para el identificador
com.elabuelostreaming.cabinos. Los ajustes heredados y los datos de WestPlay no se importan automáticamente.
```

Las escrituras deben ser atómicas, con validación de esquema y copias de seguridad antes de migraciones. La ubicación definitiva se resolverá mediante el directorio de datos de aplicación de Windows, nunca dentro de `Program Files` ni de la carpeta de ETS2.

## Aplicaciones y accesos directos

El catálogo distinguirá aplicaciones Windows, servicios web y accesos directos a archivos o carpetas. Cada elemento podrá ser global o asignarse a uno o varios perfiles. Los accesos externos deben validar rutas y esquemas de URL permitidos y requerir una acción explícita del usuario para ejecutarse.

## Actualizaciones

El actualizador heredado de WestPlay no puede distribuir versiones de CabinOS. Se mantendrá deshabilitado hasta disponer de un endpoint propio y una nueva clave de firma. Las futuras actualizaciones deberán respaldar datos, migrar esquemas y ofrecer recuperación ante fallos.

## Seguridad y privacidad

- Sin telemetría oculta ni cuentas obligatorias de CabinOS.
- Tokens de servicios, si fueran necesarios, almacenados mediante mecanismos seguros del sistema operativo.
- No ejecutar comandos arbitrarios desde entradas de perfiles.
- No modificar partidas guardadas ni archivos del usuario salvo que una función lo requiera y exista consentimiento claro.
- Preservar GPL-3.0-or-later y avisos de terceros.


## Identidad del camión y asociación de perfiles

El host recibe la identidad del camión desde el SDK de SCS. CabinOS expone a la interfaz el identificador de modelo, marca y nombre; nunca envía la matrícula en claro. Cuando existe una matrícula, el host calcula una huella local determinista a partir del modelo y la matrícula. La asociación prioriza esa huella; si no existe, solo puede usar el identificador del modelo cuando hay una única coincidencia. Si hay varias coincidencias, no se cambia automáticamente de perfil.

El almacén de perfiles crea un perfil predeterminado que no se puede borrar. Los perfiles personalizados se guardan como archivos JSON independientes. Cada perfil admite apariencia, aplicaciones, accesos directos y distribución; las escrituras pasan por un archivo temporal. No se permite asignar la misma huella de camión a dos perfiles.

La pantalla de administración está integrada en Configuración. La activación automática en la cabina ya está conectada al host: al detectar un camión con una huella inequívoca, se selecciona su perfil y se notifica a la interfaz. Los cambios de perfiles desde Configuración provocan una nueva evaluación del camión activo. La apariencia del perfil (modo, fondo e iconos) se aplica como una preferencia temporal de ese camión, sin sobrescribir la configuración global. Si falta la huella o la coincidencia es ambigua, CabinOS conserva los valores globales y no cambia de perfil. La aplicación efectiva de aplicaciones, accesos directos y diseños por perfil sigue pendiente de implementación y pruebas.

## Estado

Estado verificado en código: persistencia y administración de perfiles, selección automática segura por huella, notificación al host y aplicación temporal de apariencia están implementadas; la UI y sus pruebas pasan. La validación integral de Rust y el empaquetado Windows siguen sujetos a CI. Aplicaciones, accesos directos y diseños por perfil aún no están integrados en ejecución. Este documento no declara terminada ninguna función que no haya superado sus pruebas reproducibles.
