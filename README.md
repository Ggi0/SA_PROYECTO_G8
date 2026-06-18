# SA_PROYECTO_G8

## Integrantes

| Grupo | Carné     | Nombre                           |
| ----- | --------- | -------------------------------- |
| 8     | 202100229 | Giovanni Saul Concohá Cax        |
| 8     | 202200214 | Pablo Alejandro Marroquín Cutz   |
| 8     | 201602619 | María de los Ángeles Paz de León |
| 8     | 202180003 | Ángel Isaías Mendoza Martínez    |
| 8     | 202001814 | Naomi Rashel Yos Cujcuj          |

---

# Introducción

Quetxal TV es una plataforma web de streaming de video bajo demanda inspirada en servicios como Netflix, Disney+ y Prime Video. El proyecto fue desarrollado con el objetivo de implementar una arquitectura moderna basada en microservicios, utilizando comunicación mediante gRPC, bases de datos independientes, Redis como mecanismo de caché y despliegue mediante contenedores Docker.

La solución fue diseñada siguiendo el patrón **Database per Service**, garantizando que cada dominio del negocio sea propietario exclusivo de sus datos y que toda la comunicación entre servicios se realice mediante contratos Protocol Buffers.

---

# Documentación del Proyecto

Toda la documentación del proyecto se encuentra organizada dentro del directorio `Documentation`, donde se describen los distintos artefactos de análisis, diseño y arquitectura requeridos para la implementación de la solución.

## Requerimientos

La especificación de requerimientos funcionales y no funcionales se encuentra en la carpeta:

```text
Documentation/Requerimientos
```

En esta sección se documentan las funcionalidades principales de la plataforma, así como las restricciones y atributos de calidad considerados durante el diseño de la solución.

---

## Casos de Uso

La documentación relacionada con los casos de uso se encuentra en:

```text
Documentation/CasosDeUso
```

Aquí se incluyen los diagramas de casos de uso y los casos de uso expandidos que describen detalladamente la interacción de los usuarios con el sistema, incluyendo flujos principales, alternos, excepciones y reglas de negocio.

---

## Arquitectura 4+1

La descripción arquitectónica del sistema se encuentra en:

```text
Documentation/4+1
```

Esta documentación presenta la arquitectura utilizando el modelo 4+1, incluyendo las vistas lógica, de desarrollo, de procesos y física, además de los escenarios que permiten comprender el comportamiento integral de la solución.

---

## Diagramas del Sistema

Los diagramas utilizados para representar la estructura y comportamiento del sistema se encuentran en:

```text
Documentation/Diagramas
```

Entre los diagramas documentados se incluyen:

* Arquitectura general.
* Diagramas de componentes.
* Diagramas de secuencia.
* Diagramas de actividades.
* Diagramas entidad-relación.
* Diagramas de despliegue.

---

## Justificación Arquitectónica

Las decisiones técnicas y arquitectónicas adoptadas durante el desarrollo del proyecto se documentan en:

```text
Documentation/JustificacionGeneral.md
```

Esta sección explica las razones detrás de la selección de tecnologías, la adopción de una arquitectura de microservicios, el uso de gRPC, Redis, PostgreSQL y el patrón Database per Service.

---

# Arquitectura General

La solución está compuesta por un Frontend desarrollado en React que se comunica exclusivamente con un API Gateway. El API Gateway actúa como punto único de entrada y coordina la comunicación con los diferentes microservicios mediante gRPC.

Los dominios funcionales fueron separados en los siguientes servicios:

* Auth Service
* Catalog Service
* Subscription Service
* Playback Service
* FX Service
* Notification Service

Cada microservicio posee su propia base de datos, sus contratos gRPC y su configuración independiente, garantizando un bajo acoplamiento entre componentes.

---

# Tecnologías Utilizadas

La implementación utiliza un enfoque políglota para aprovechar las fortalezas de distintos lenguajes según las responsabilidades de cada servicio.

### Frontend

* React
* TypeScript
* Vite
* Axios

### API Gateway

* NestJS
* TypeScript
* JWT
* gRPC

### Microservicios

#### TypeScript

* Auth Service

#### Go

* Catalog Service
* Subscription Service

#### Python

* Playback Service
* FX Service
* Notification Service

### Persistencia e Infraestructura

* PostgreSQL
* Redis
* Docker
* Docker Compose
* Google Cloud Platform

### Comunicación

* gRPC
* Protocol Buffers

---

# Conclusiones

La implementación de Quetxal TV permitió aplicar conceptos avanzados de arquitectura de software mediante una solución basada en microservicios desacoplados y comunicación gRPC. La utilización de Redis, PostgreSQL y Docker contribuye a una plataforma mantenible, escalable y preparada para futuras extensiones.

La documentación contenida en este repositorio describe detalladamente los requerimientos, decisiones arquitectónicas, diagramas y modelos utilizados durante el desarrollo del proyecto.
