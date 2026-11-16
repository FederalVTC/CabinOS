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
CabinOS_Data/
├── settings/
│   └── general.json
├── profiles/
│   ├── default.json
│   └── <profile-uuid>.json
├── applications/
│   └── catalog.json
├── themes/
├── wallpapers/
└── backups/
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

## Estado

Este documento define criterios de diseño; no implica que todas las funciones descritas estén implementadas. Cada etapa debe vincularse a cambios concretos y pruebas reproducibles.
