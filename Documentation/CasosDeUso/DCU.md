## Diagrama de Casos de Uso de Alto Nivel

![Diagrama Alto Nivel](imgs/Alto_nivel_F2.png)


## Primera Descomposición

![Diagrama Alto Nivel](imgs/Primera_descom_F2.png)

## Casos de Uso Expandidos
#### CDU-001: Autenticación y Gestión de Usuarios


Sus expandidos son:
- CDU001.1: Registro de usuario
- CDU001.2: Inicio de sesión
- CDU001.3: Cerrar sesión
- CDU001.4: Control de intentos y bloqueo temporal
- CDU001.5: Modificación de datos personales
- CDU001.6: Cambio de contraseña
- CDU001.7: Gestión de usuarios (Administrador)
- CDU001.8: Autenticación OAuth


![Diagrama Alto Nivel](./imgs/CDU-001_F2.png)

##### Registro de Usuario

| Campo | Detalle |
|-------|---------|
| **Nombre** | Registro de usuario |
| **Código** | CDU001.1 |
| **Actores** | Usuario |
| **Descripción** | Permite que un nuevo usuario cree una cuenta en la plataforma Quetxal TV ingresando sus datos personales y credenciales para acceder al servicio de streaming. |
| **Precondiciones** | El usuario no debe tener una cuenta registrada con el mismo correo electrónico. |
| **Post Condiciones** | - Usuario creado exitosamente y redirigido al inicio de sesión. <br> - Correo de confirmación enviado al usuario. <br> - El usuario no es creado si ocurre un error en los datos ingresados. |
| **Flujo Principal** | 1. El usuario selecciona la opción "Registrarse". <br> 2. El sistema muestra el formulario de registro. <br> 3. El usuario ingresa su nombre completo. <br> 4. El usuario ingresa su correo electrónico. <br> 5. El usuario ingresa su contraseña. <br> 6. El usuario confirma su contraseña. <br> 7. El usuario presiona "Crear cuenta". <br> 8. El sistema valida que todos los campos sean correctos. <br> 9. El sistema verifica que el correo electrónico sea único. <br> 10. El sistema cifra la contraseña con bcrypt. <br> 11. El sistema guarda el usuario en la base de datos. <br> 12. El sistema dispara el envío del correo de bienvenida. <br> 13. El sistema redirige al inicio de sesión con mensaje de éxito. |
| **Flujos Alternos** | **FA1: Datos incompletos** <br> FA1.1 El sistema detecta campos vacíos. <br> FA1.2 Resalta los campos faltantes en rojo. <br> FA1.3 Notifica "Todos los campos son obligatorios". <br> FA1.4 El usuario completa los datos. <br> FA1.5 Continúa en el paso 8. <br><br> **FA2: Correo electrónico ya registrado** <br> FA2.1 El sistema detecta el correo duplicado. <br> FA2.2 Notifica "Este correo ya está en uso". <br> FA2.3 El usuario ingresa un correo diferente. <br> FA2.4 Continúa en el paso 9. <br><br> **FA3: Contraseñas no coinciden** <br> FA3.1 El sistema detecta que la confirmación no coincide. <br> FA3.2 Notifica "Las contraseñas no coinciden". <br> FA3.3 El usuario corrige la confirmación. <br> FA3.4 Continúa en el paso 8. |
| **Reglas de Negocio** | - El correo electrónico debe ser único en el sistema. <br> - La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula y un número. <br> - Las credenciales deben almacenarse de forma segura mediante bcrypt (factor ≥ 12). |
| **Flujo de Excepción** | **FE1: Error del servidor al procesar el registro** <br> FE1.1 El sistema detecta un error interno. <br> FE1.2 Notifica al usuario "No se pudo completar el registro. Inténtelo más tarde". <br> FE1.3 El sistema registra el error en los logs. <br> FE1.4 Los datos del formulario se conservan para evitar reingreso. <br><br> **FE2: Fallo en el servicio de correo** <br> FE2.1 El usuario se registra exitosamente pero el correo falla. <br> FE2.2 El sistema notifica que la cuenta fue creada pero el correo no pudo enviarse. <br> FE2.3 El sistema permite reenviar el correo desde el perfil. |
| **Reglas de Calidad** | - La contraseña debe cifrarse antes de almacenarse. <br> - El registro no debe exceder 3 segundos. <br> - El indicador de fuerza de contraseña debe mostrarse en tiempo real. |

---

##### Inicio de Sesión

| Campo | Detalle |
|-------|---------|
| **Nombre** | Inicio de sesión |
| **Código** | CDU001.2 |
| **Actores** | Usuario |
| **Descripción** | Permite que un usuario registrado acceda a la plataforma Quetxal TV mediante sus credenciales, generando un JWT y una Session Cookie segura. |
| **Precondiciones** | El usuario debe tener una cuenta registrada y activa en el sistema. |
| **Post Condiciones** | - Sesión iniciada correctamente con JWT generado y Session Cookie establecida. <br> - Redireccionamiento al selector de perfiles. <br> - Registro de auditoría del inicio de sesión. |
| **Flujo Principal** | 1. El usuario selecciona "Iniciar sesión". <br> 2. El sistema muestra el formulario de login. <br> 3. El usuario ingresa su correo electrónico. <br> 4. El usuario ingresa su contraseña. <br> 5. El usuario presiona "Entrar". <br> 6. El sistema verifica las credenciales en la base de datos. <br> 7. El sistema valida que la cuenta esté activa. <br> 8. El sistema genera un JWT con los datos del usuario. <br> 9. El sistema establece una Session Cookie segura (HttpOnly, Secure). <br> 10. El sistema redirige al selector de perfiles. |
| **Flujos Alternos** | **FA1: Credenciales incorrectas** <br> FA1.1 El sistema detecta que las credenciales no coinciden. <br> FA1.2 Incrementa el contador de intentos fallidos. <br> FA1.3 Notifica "Correo o contraseña incorrectos". <br> FA1.4 El usuario puede reintentar. <br><br> **FA2: Inicio de sesión con OAuth** <br> FA2.1 El usuario selecciona "Continuar con Google". <br> FA2.2 El sistema redirige al proveedor OAuth. <br> FA2.3 El proveedor autentica al usuario y retorna los datos. <br> FA2.4 El sistema genera JWT y Session Cookie. <br> FA2.5 Continúa en el paso 10. |
| **Reglas de Negocio** | - Máximo 5 intentos fallidos antes del bloqueo temporal. <br> - El JWT tiene vigencia de 1 hora. <br> - La Session Cookie debe ser HttpOnly y Secure. |
| **Flujo de Excepción** | **FE1: Servicio de autenticación no disponible** <br> FE1.1 El sistema detecta que el microservicio de auth no responde. <br> FE1.2 Notifica "El servicio no está disponible. Inténtelo más tarde". <br> FE1.3 Registra el error en los logs para el equipo técnico. |
| **Reglas de Calidad** | - El proceso de login debe completarse en ≤ 1 segundo. <br> - Nunca debe indicarse si el error es el correo o la contraseña (mensaje genérico por seguridad). <br> - Todos los intentos deben registrarse con timestamp e IP. |

---

##### Cerrar Sesión

| Campo | Detalle |
|-------|---------|
| **Nombre** | Cerrar sesión |
| **Código** | CDU001.3 |
| **Actores** | Usuario |
| **Descripción** | Permite al usuario terminar su sesión activa, invalidando el JWT y eliminando la Session Cookie del cliente. |
| **Precondiciones** | El usuario debe tener una sesión activa. |
| **Post Condiciones** | - Session Cookie eliminada del cliente. <br> - JWT invalidado (añadido a lista de revocación en Redis). <br> - Usuario redirigido a la pantalla de inicio. |
| **Flujo Principal** | 1. El usuario selecciona "Cerrar sesión". <br> 2. El sistema invalida el JWT actual (blacklist en Redis). <br> 3. El sistema elimina la Session Cookie del navegador. <br> 4. El sistema redirige al usuario a la página de inicio. |
| **Flujos Alternos** | N/A |
| **Reglas de Negocio** | - El token JWT debe ser añadido a la lista negra en Redis hasta su fecha de expiración original. <br> - La cookie debe eliminarse con el flag de expiración en el pasado. |
| **Flujo de Excepción** | **FE1: Error al invalidar el token** <br> FE1.1 El sistema no puede escribir en Redis. <br> FE1.2 Elimina la cookie de todas formas. <br> FE1.3 Registra el incidente para revisión técnica. |
| **Reglas de Calidad** | - El cierre de sesión debe completarse en ≤ 500 ms. <br> - No debe quedar ningún dato sensible en el almacenamiento local del cliente. |

---


#### CDU-002: Gestión de Perfiles

Sus expandidos son:
- CDU002.1: Crear perfil
- CDU002.2: Editar perfil
- CDU002.4: Seleccionar perfil activo

![Diagrama Alto Nivel](imgs/CDU-002_F2.png)

##### Crear Perfil

| Campo | Detalle |
|-------|---------|
| **Nombre** | Crear perfil |
| **Código** | CDU002.1 |
| **Actores** | Usuario |
| **Descripción** | Permite al usuario crear un nuevo perfil dentro de su cuenta para personalizar la experiencia de visualización de forma independiente. |
| **Precondiciones** | El usuario debe tener sesión activa y tener menos de 5 perfiles en su cuenta. |
| **Post Condiciones** | - Perfil creado y asociado a la cuenta del usuario. <br> - Historial y preferencias inicializados de forma vacía. |
| **Flujo Principal** | 1. El usuario accede a "Gestionar perfiles" desde su cuenta. <br> 2. El sistema muestra los perfiles existentes y la opción "Agregar perfil". <br> 3. El sistema verifica que la cuenta tenga menos de 5 perfiles. <br> 4. El usuario selecciona "Agregar perfil". <br> 5. El sistema muestra el formulario de creación. <br> 6. El usuario ingresa el nombre del perfil y selecciona un avatar. <br> 7. El usuario presiona "Crear". <br> 8. El sistema guarda el nuevo perfil. <br> 9. El sistema muestra el perfil creado en la lista. |
| **Flujos Alternos** | **FA1: Límite de perfiles alcanzado** <br> FA1.1 La cuenta ya tiene 5 perfiles. <br> FA1.2 El sistema oculta/deshabilita la opción "Agregar perfil". <br> FA1.3 Muestra mensaje "Has alcanzado el límite de 5 perfiles". |
| **Reglas de Negocio** | - Máximo 5 perfiles por cuenta. <br> - El nombre del perfil debe tener entre 1 y 30 caracteres. |
| **Flujo de Excepción** | **FE1: Error al guardar** <br> FE1.1 El sistema no puede guardar el perfil. <br> FE1.2 Notifica el error y sugiere reintentar. |
| **Reglas de Calidad** | - La creación debe completarse en ≤ 1 segundo. |



Puedes documentarlos con el mismo formato que usaste para **Crear Perfil**.

---

### CDU002.2: Editar Perfil

| Campo                  | Detalle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nombre**             | Editar perfil                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Código**             | CDU002.2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Actores**            | Usuario                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Descripción**        | Permite al usuario modificar la información de un perfil existente para personalizar su experiencia dentro de la plataforma.                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Precondiciones**     | - El usuario debe tener sesión activa. <br> - Debe existir al menos un perfil asociado a la cuenta.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Post Condiciones**   | - La información del perfil queda actualizada. <br> - Los cambios se reflejan inmediatamente en la cuenta.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Flujo Principal**    | 1. El usuario accede a "Gestionar perfiles". <br> 2. El sistema muestra los perfiles disponibles. <br> 3. El usuario selecciona la opción "Editar" sobre un perfil. <br> 4. El sistema muestra el formulario con los datos actuales del perfil. <br> 5. El usuario modifica el nombre, avatar u otras preferencias permitidas. <br> 6. El usuario presiona "Guardar cambios". <br> 7. El sistema valida la información ingresada. <br> 8. El sistema actualiza los datos del perfil. <br> 9. El sistema muestra un mensaje de confirmación. |
| **Flujos Alternos**    | **FA1: Cancelación de cambios** <br> FA1.1 El usuario selecciona "Cancelar". <br> FA1.2 El sistema descarta los cambios realizados. <br> FA1.3 Se regresa a la pantalla de gestión de perfiles.                                                                                                                                                                                                                                                                                                                                             |
| **Reglas de Negocio**  | - El nombre del perfil debe tener entre 1 y 30 caracteres. <br> - Solo el propietario de la cuenta puede editar sus perfiles.                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Flujo de Excepción** | **FE1: Datos inválidos** <br> FE1.1 El nombre ingresado no cumple las reglas establecidas. <br> FE1.2 El sistema muestra el mensaje correspondiente y solicita la corrección. <br><br> **FE2: Error al actualizar** <br> FE2.1 Ocurre un error durante el almacenamiento de cambios. <br> FE2.2 El sistema notifica el error y permite reintentar.                                                                                                                                                                                          |
| **Reglas de Calidad**  | - La actualización debe completarse en ≤ 1 segundo.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

---

### CDU002.4: Seleccionar Perfil Activo

> Este caso de uso ocurre inmediatamente después del inicio de sesión cuando la cuenta posee más de un perfil.

| Campo                  | Detalle                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nombre**             | Seleccionar perfil activo                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Código**             | CDU002.4                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Actores**            | Usuario                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Descripción**        | Permite al usuario seleccionar el perfil con el que desea utilizar la plataforma después de autenticarse.                                                                                                                                                                                                                                                                                                                             |
| **Precondiciones**     | - El usuario debe haber iniciado sesión correctamente. <br> - La cuenta debe poseer al menos un perfil registrado.                                                                                                                                                                                                                                                                                                                    |
| **Post Condiciones**   | - Se establece un perfil activo para la sesión actual. <br> - La plataforma carga las preferencias, historial y recomendaciones asociadas al perfil seleccionado.                                                                                                                                                                                                                                                                     |
| **Flujo Principal**    | 1. El usuario inicia sesión correctamente. <br> 2. El sistema recupera los perfiles asociados a la cuenta. <br> 3. El sistema muestra la pantalla de selección de perfiles. <br> 4. El usuario selecciona uno de los perfiles disponibles. <br> 5. El sistema establece el perfil como perfil activo. <br> 6. El sistema carga la información personalizada del perfil. <br> 7. El sistema redirige al usuario a la página principal. |
| **Flujos Alternos**    | **FA1: Cuenta con un único perfil** <br> FA1.1 La cuenta posee solamente un perfil. <br> FA1.2 El sistema selecciona automáticamente dicho perfil. <br> FA1.3 El usuario es redirigido directamente a la página principal.                                                                                                                                                                                                            |
| **Reglas de Negocio**  | - Solo puede existir un perfil activo por sesión. <br> - El perfil activo determina recomendaciones, historial y preferencias visualizadas.                                                                                                                                                                                                                                                                                           |
| **Flujo de Excepción** | **FE1: Perfil no disponible** <br> FE1.1 El perfil seleccionado ya no existe o no puede cargarse. <br> FE1.2 El sistema muestra un mensaje de error y solicita seleccionar otro perfil.                                                                                                                                                                                                                                               |
| **Reglas de Calidad**  | - La carga del perfil activo debe completarse en ≤ 2 segundos.                                                                                                                                                                                                                                                                                                                                                                        |

#### CDU-003: Gestión de Planes y Suscripciones

Sus expandidos son:
- CDU003.1: Visualizar planes de suscripción
- CDU003.2: Seleccionar y comprar plan
- CDU003.3: Modificar plan
- CDU003.4: Cancelar suscripción

![Diagrama Alto Nivel](imgs/CDU-003_F2.png)

---

## CDU003.1: Visualizar Planes de Suscripción

| Campo                  | Detalle                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nombre**             | Visualizar planes de suscripción                                                                                                                                                                                                                                                                                                                               |
| **Código**             | CDU003.1                                                                                                                                                                                                                                                                                                                                                       |
| **Actores**            | Usuario                                                                                                                                                                                                                                                                                                                                                        |
| **Descripción**        | Permite al usuario consultar los planes de suscripción disponibles, sus características y precios antes de tomar una decisión de compra o modificación.                                                                                                                                                                                                        |
| **Precondiciones**     | El usuario debe tener sesión activa.                                                                                                                                                                                                                                                                                                                           |
| **Post Condiciones**   | - Los planes disponibles son mostrados al usuario. <br> - El usuario puede decidir comprar o modificar su plan.                                                                                                                                                                                                                                                |
| **Flujo Principal**    | 1. El usuario accede a la sección "Planes y Suscripciones". <br> 2. El sistema consulta los planes disponibles. <br> 3. El sistema obtiene los precios en la moneda local mediante FX-Service. <br> 4. El sistema muestra los planes Básico, Estándar y Premium junto con sus beneficios y precios. <br> 5. El usuario visualiza la información de los planes. |
| **Flujos Alternos**    | **FA1: Error al obtener tipo de cambio** <br> FA1.1 FX-Service no responde. <br> FA1.2 El sistema utiliza el último valor almacenado en caché.                                                                                                                                                                                                                 |
| **Reglas de Negocio**  | - Los precios deben mostrarse en la moneda local del usuario. <br> - Los planes deben mostrar sus características y limitaciones.                                                                                                                                                                                                                              |
| **Flujo de Excepción** | **FE1: No existen planes disponibles** <br> FE1.1 El sistema no encuentra planes activos. <br> FE1.2 Muestra un mensaje informativo al usuario.                                                                                                                                                                                                                |
| **Reglas de Calidad**  | - La información debe cargarse en ≤ 2 segundos.                                                                                                                                                                                                                                                                                                                |

---

## CDU003.2: Seleccionar y Comprar Plan

| Campo                  | Detalle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nombre**             | Seleccionar y comprar plan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Código**             | CDU003.2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Actores**            | Usuario, Sistema de Pago                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Descripción**        | Permite al usuario adquirir una nueva suscripción seleccionando uno de los planes disponibles y completando el proceso de pago.                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Precondiciones**     | El usuario debe tener sesión activa y no poseer una suscripción activa.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Post Condiciones**   | - Suscripción creada y asociada a la cuenta. <br> - Transacción registrada. <br> - Correo de confirmación enviado.                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Flujo Principal**    | 1. El usuario visualiza los planes disponibles. <br> 2. El usuario selecciona el plan deseado. <br> 3. El sistema muestra el resumen de compra. <br> 4. El usuario selecciona un método de pago. <br> 5. El Sistema de Pago procesa la transacción. <br> 6. El sistema registra la compra mediante el procedimiento almacenado correspondiente. <br> 7. El sistema activa la suscripción. <br> 8. El sistema envía el recibo de compra por correo electrónico. <br> 9. El sistema muestra la confirmación de suscripción activa. |
| **Flujos Alternos**    | **FA1: Pago rechazado** <br> FA1.1 El Sistema de Pago rechaza la transacción. <br> FA1.2 El sistema informa el rechazo y permite reintentar.                                                                                                                                                                                                                                                                                                                                                                                     |
| **Reglas de Negocio**  | - Solo puede existir una suscripción activa por cuenta. <br> - La compra debe registrarse mediante procedimiento almacenado.                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Flujo de Excepción** | **FE1: Sistema de Pago no disponible** <br> FE1.1 El servicio de pago no responde. <br> FE1.2 El sistema cancela la operación y notifica al usuario.                                                                                                                                                                                                                                                                                                                                                                             |
| **Reglas de Calidad**  | - El proceso debe completarse en ≤ 5 segundos. <br> - Los datos financieros nunca se almacenan en Quetxal TV.                                                                                                                                                                                                                                                                                                                                                                                                                    |

---

## CDU003.3: Modificar Plan

| Campo                  | Detalle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nombre**             | Modificar plan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Código**             | CDU003.3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Actores**            | Usuario, Sistema de Pago                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Descripción**        | Permite al usuario cambiar su suscripción actual por otro plan disponible, actualizando los beneficios asociados y realizando los cobros correspondientes cuando aplique.                                                                                                                                                                                                                                                                                                                           |
| **Precondiciones**     | - El usuario debe tener sesión activa. <br> - Debe existir una suscripción activa.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Post Condiciones**   | - La suscripción queda actualizada con el nuevo plan. <br> - Los beneficios disponibles cambian según el plan seleccionado.                                                                                                                                                                                                                                                                                                                                                                         |
| **Flujo Principal**    | 1. El usuario accede a la sección de suscripción actual. <br> 2. El sistema muestra el plan vigente y las alternativas disponibles. <br> 3. El usuario selecciona un nuevo plan. <br> 4. El sistema calcula la diferencia de precio correspondiente. <br> 5. El sistema muestra el resumen del cambio. <br> 6. Si existe un cobro adicional, el Sistema de Pago procesa la transacción. <br> 7. El sistema actualiza la suscripción. <br> 8. El sistema muestra la confirmación del cambio de plan. |
| **Flujos Alternos**    | **FA1: Cambio a un plan de menor costo** <br> FA1.1 El usuario selecciona un plan más económico. <br> FA1.2 El sistema programa el cambio para el siguiente ciclo de facturación.                                                                                                                                                                                                                                                                                                                   |
| **Reglas de Negocio**  | - El cambio de Básico a Estándar o Premium puede generar un cobro inmediato. <br> - El cambio a un plan inferior se aplica al finalizar el período vigente.                                                                                                                                                                                                                                                                                                                                         |
| **Flujo de Excepción** | **FE1: Error en el cobro adicional** <br> FE1.1 El Sistema de Pago rechaza el cobro. <br> FE1.2 La modificación no se realiza.                                                                                                                                                                                                                                                                                                                                                                      |
| **Reglas de Calidad**  | - La actualización debe reflejarse inmediatamente después de la confirmación.                                                                                                                                                                                                                                                                                                                                                                                                                       |

---

## CDU003.4: Cancelar Suscripción

| Campo                  | Detalle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nombre**             | Cancelar suscripción                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Código**             | CDU003.4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Actores**            | Usuario                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Descripción**        | Permite al usuario finalizar su suscripción activa para evitar futuras renovaciones automáticas.                                                                                                                                                                                                                                                                                                                                                                                         |
| **Precondiciones**     | - El usuario debe tener sesión activa. <br> - Debe existir una suscripción activa.                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Post Condiciones**   | - La renovación automática queda deshabilitada. <br> - La suscripción permanece activa hasta finalizar el período pagado.                                                                                                                                                                                                                                                                                                                                                                |
| **Flujo Principal**    | 1. El usuario accede a la configuración de su suscripción. <br> 2. El sistema muestra la información de la suscripción actual. <br> 3. El usuario selecciona "Cancelar suscripción". <br> 4. El sistema solicita confirmación de la acción. <br> 5. El usuario confirma la cancelación. <br> 6. El sistema deshabilita la renovación automática. <br> 7. El sistema confirma la cancelación al usuario. |
| **Flujos Alternos**    | **FA1: Usuario cancela la operación** <br> FA1.1 El usuario decide no continuar. <br> FA1.2 El sistema conserva la suscripción sin cambios.                                                                                                                                                                                                                                                                                                                                              |
| **Reglas de Negocio**  | - No se realizan reembolsos automáticos por períodos ya pagados. <br> - El acceso continúa hasta la fecha de vencimiento de la suscripción.                                                                                                                                                                                                                                                                                                                                              |
| **Flujo de Excepción** | **FE1: Error al procesar la cancelación** <br> FE1.1 El sistema no puede actualizar el estado de la suscripción. <br> FE1.2 Se notifica al usuario y se solicita reintentar.                                                                                                                                                                                                                                                                                                             |
| **Reglas de Calidad**  | - La cancelación debe confirmarse en ≤ 2 segundos.                                                                                                                                                                                                                                                                                                                                                                                                                                       |



#### CDU-004: Catálogo, Búsqueda y Detalle de Contenido

Sus expandidos son:
- CDU004.1: Buscar contenido
- CDU004.2: Filtrar contenido
- CDU004.3: Ver detalle de contenido

![Diagrama Alto Nivel](imgs/CDU-004_F2.png)

### CDU004.1: Buscar Contenido

| Campo                  | Detalle                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nombre**             | Buscar contenido                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Código**             | CDU004.1                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Actores**            | Usuario                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Descripción**        | Permite al usuario localizar películas o series específicas mediante un cuadro de búsqueda utilizando el nombre del contenido.                                                                                                                                                                                                                                                                                                      |
| **Precondiciones**     | El usuario debe tener sesión activa y un perfil seleccionado.                                                                                                                                                                                                                                                                                                                                                                       |
| **Post Condiciones**   | - Se muestran los contenidos que coinciden con la búsqueda realizada.                                                                                                                                                                                                                                                                                                                                                               |
| **Flujo Principal**    | 1. El usuario accede al catálogo de contenido. <br> 2. El sistema muestra una barra de búsqueda. <br> 3. El usuario ingresa el nombre o parte del nombre del contenido. <br> 4. El sistema envía la consulta al servicio de catálogo. <br> 5. El sistema obtiene los resultados coincidentes. <br> 6. El sistema muestra la lista de contenidos encontrados. <br> 7. El usuario puede seleccionar un contenido para ver su detalle. |
| **Flujos Alternos**    | **FA1: Sin resultados** <br> FA1.1 No existen coincidencias para la búsqueda. <br> FA1.2 El sistema muestra el mensaje "No se encontraron resultados".                                                                                                                                                                                                                                                                              |
| **Reglas de Negocio**  | - La búsqueda debe permitir coincidencias parciales. <br> - Debe incluir películas y series disponibles para el usuario.                                                                                                                                                                                                                                                                                                            |
| **Flujo de Excepción** | **FE1: Error de búsqueda** <br> FE1.1 El servicio de catálogo no responde. <br> FE1.2 El sistema muestra un mensaje de error al usuario.                                                                                                                                                                                                                                                                                            |
| **Reglas de Calidad**  | - Los resultados deben mostrarse en ≤ 2 segundos.                                                                                                                                                                                                                                                                                                                                                                                   |

---

### CDU004.2: Filtrar Contenido

| Campo                  | Detalle                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nombre**             | Filtrar contenido                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Código**             | CDU004.2                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Actores**            | Usuario                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Descripción**        | Permite al usuario refinar los contenidos mostrados en el catálogo mediante filtros visuales como género, año de lanzamiento, clasificación o tipo de contenido.                                                                                                                                                                                                                                                    |
| **Precondiciones**     | El usuario debe tener sesión activa y un perfil seleccionado.                                                                                                                                                                                                                                                                                                                                                       |
| **Post Condiciones**   | - El catálogo muestra únicamente los contenidos que cumplen con los filtros seleccionados.                                                                                                                                                                                                                                                                                                                          |
| **Flujo Principal**    | 1. El usuario accede al catálogo de contenido. <br> 2. El sistema muestra los filtros disponibles mediante botones y listas desplegables. <br> 3. El usuario selecciona uno o varios filtros (género, año, clasificación, película o serie). <br> 4. El sistema aplica los filtros seleccionados. <br> 5. El sistema actualiza el catálogo mostrando únicamente los contenidos que cumplen los criterios indicados. |
| **Flujos Alternos**    | **FA1: Sin coincidencias** <br> FA1.1 Ningún contenido cumple los filtros seleccionados. <br> FA1.2 El sistema muestra el mensaje "No existen contenidos para los filtros seleccionados".                                                                                                                                                                                                                           |
| **Reglas de Negocio**  | - Se pueden combinar múltiples filtros simultáneamente. <br> - Los filtros deben aplicarse únicamente sobre contenidos disponibles.                                                                                                                                                                                                                                                                                 |
| **Flujo de Excepción** | **FE1: Error al aplicar filtros** <br> FE1.1 El servicio de catálogo no responde. <br> FE1.2 El sistema informa el error al usuario.                                                                                                                                                                                                                                                                                |
| **Reglas de Calidad**  | - La actualización del catálogo debe realizarse en ≤ 2 segundos.                                                                                                                                                                                                                                                                                                                                                    |

---

### CDU004.3: Ver Detalle de Contenido

| Campo                  | Detalle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nombre**             | Ver detalle de contenido                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Código**             | CDU004.3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Actores**            | Usuario                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Descripción**        | Permite al usuario visualizar la información completa de una película o serie seleccionada, mostrando el póster junto a la ficha técnica y la información de calificaciones.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Precondiciones**     | El usuario debe tener sesión activa con un perfil seleccionado.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Post Condiciones**   | - Información detallada del contenido mostrada al usuario. <br> - Calificación de la comunidad calculada y mostrada dinámicamente.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Flujo Principal**    | 1. El usuario selecciona un contenido desde el catálogo o desde los resultados de búsqueda. <br> 2. El sistema consulta los datos del contenido mediante la vista de fichas técnicas. <br> 3. El sistema consulta el porcentaje de recomendación mediante la función calculadora. <br> 4. El sistema muestra el póster del contenido. <br> 5. El sistema muestra junto al póster la ficha técnica completa (sinopsis, actores, director, año, género y duración). <br> 6. El sistema muestra el porcentaje global de recomendación de la comunidad. <br> 7. El sistema verifica si el usuario ya calificó el contenido y muestra su calificación actual. <br> 8. El usuario puede calificar el contenido (include CDU005). |
| **Flujos Alternos**    | **FA1: Contenido no disponible** <br> FA1.1 El contenido fue eliminado o desactivado. <br> FA1.2 El sistema muestra el mensaje "Este contenido ya no está disponible".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Reglas de Negocio**  | - La ficha técnica debe obtenerse mediante la vista de base de datos. <br> - El porcentaje de recomendación se calcula mediante la función de base de datos. <br> - El detalle debe mostrar el póster y la información descriptiva del contenido.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Flujo de Excepción** | **FE1: Error al cargar contenido** <br> FE1.1 El microservicio de catálogo no responde. <br> FE1.2 El sistema muestra un mensaje de error genérico.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Reglas de Calidad**  | - La ficha debe cargar en ≤ 2 segundos. <br> - El porcentaje de recomendación debe ser calculado en tiempo real.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |




#### CDU-005: Sistema de Calificaciones

Sus expandidos son:
- CDU005.1: Calificar contenido (pulgar arriba/abajo)
- CDU005.2: Calcular porcentaje global de recomendación

![Diagrama Alto Nivel](imgs/CDU-005_F2.png)

##### Calificar Contenido

| Campo | Detalle |
|-------|---------|
| **Nombre** | Calificar contenido |
| **Código** | CDU005.1 |
| **Actores** | Usuario |
| **Descripción** | Permite al usuario calificar una película o serie mediante el sistema de pulgar arriba/abajo, contribuyendo al porcentaje global de recomendación de la comunidad. |
| **Precondiciones** | El usuario debe tener sesión activa con un perfil seleccionado y haber visto al menos parte del contenido. |
| **Post Condiciones** | - Calificación del usuario registrada o actualizada en la base de datos. <br> - Porcentaje global de recomendación recalculado y actualizado. |
| **Flujo Principal** | 1. El usuario accede al detalle de un contenido. <br> 2. El sistema muestra las opciones de calificación. <br> 3. El sistema indica si el usuario ya calificó este contenido. <br> 4. El usuario selecciona su calificación. <br> 5. El sistema registra/actualiza la calificación del perfil. <br> 6. El sistema recalcula el porcentaje global mediante la función de base de datos. <br> 7. El sistema muestra el nuevo porcentaje actualizado en la vista. |
| **Flujos Alternos** | **FA1: Usuario cambia su calificación** <br> FA1.1 El usuario ya tenía una calificación registrada. <br> FA1.2 El sistema actualiza (no duplica) la calificación. <br> FA1.3 Recalcula el porcentaje global. |
| **Reglas de Negocio** | - Cada perfil puede tener solo una calificación por contenido. <br> - El porcentaje global se calcula con la función de base de datos: (pulgares arriba / total de votos) × 100. |
| **Flujo de Excepción** | **FE1: Error al guardar calificación** <br> FE1.1 El sistema no puede registrar la calificación. <br> FE1.2 Notifica el error y muestra el porcentaje anterior. |
| **Reglas de Calidad** | - La calificación debe registrarse y el porcentaje actualizarse en ≤ 500 ms. <br> - El cálculo del porcentaje debe realizarse mediante la función de base de datos (no en capa de aplicación). |



#### CDU-006: FX-Service (Conversión de Divisas)

Sus expandidos son:
- CDU006.1: Consultar tipo de cambio
- CDU006.2: Cachear tipo de cambio en Redis
- CDU006.3: Mostrar precio en moneda local

![Diagrama Alto Nivel](imgs/CDU-006_F2.png)

### CDU006.2: Cachear Tipo de Cambio en Redis

| Campo                  | Detalle                                                                                                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nombre**             | Cachear tipo de cambio en Redis                                                                                                                                                                                                                                                                   |
| **Código**             | CDU006.2                                                                                                                                                                                                                                                                                          |
| **Actores**            | FX-Service                                                                                                                                                                                                                                                                                        |
| **Descripción**        | Permite almacenar temporalmente las tasas de cambio obtenidas desde la API externa para reutilizarlas en futuras consultas y reducir el tiempo de respuesta.                                                                                                                                      |
| **Precondiciones**     | Redis debe estar operativo y existir una tasa de cambio válida obtenida por el FX-Service.                                                                                                                                                                                                        |
| **Post Condiciones**   | - La tasa de cambio queda almacenada en Redis. <br> - Se configura un TTL de 30 minutos para la tasa almacenada.                                                                                                                                                                                  |
| **Flujo Principal**    | 1. El FX-Service obtiene una tasa de cambio desde la API externa. <br> 2. El sistema verifica la validez de la tasa recibida. <br> 3. El sistema almacena la tasa de cambio en Redis. <br> 4. El sistema configura un TTL de 30 minutos. <br> 5. La tasa queda disponible para futuras consultas. |
| **Flujos Alternos**    | **FA1: Actualización de tasa existente** <br> FA1.1 Ya existe una tasa almacenada para la misma divisa. <br> FA1.2 El sistema reemplaza el valor anterior y reinicia el TTL.                                                                                                                      |
| **Reglas de Negocio**  | - El TTL debe ser de 30 minutos. <br> - Las tasas almacenadas deben identificarse por código de divisa.                                                                                                                                                                                           |
| **Flujo de Excepción** | **FE1: Redis no disponible** <br> FE1.1 Redis no responde. <br> FE1.2 El sistema registra el incidente y continúa operando sin caché.                                                                                                                                                             |
| **Reglas de Calidad**  | - El almacenamiento debe completarse en ≤ 10 ms.                                                                                                                                                                                                                                                  |

---

### CDU006.3: Mostrar Precio en Moneda Local

| Campo                  | Detalle                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nombre**             | Mostrar precio en moneda local                                                                                                                                                                                                                                                                                                                                                      |
| **Código**             | CDU006.3                                                                                                                                                                                                                                                                                                                                                                            |
| **Actores**            | Usuario                                                                                                                                                                                                                                                                                                                                                                             |
| **Descripción**        | Permite mostrar el precio de los planes de suscripción en la moneda local del usuario dentro de las tarjetas de planes mostradas en la interfaz.                                                                                                                                                                                                                                    |
| **Precondiciones**     | - El usuario debe estar visualizando los planes de suscripción. <br> - Debe existir una tasa de cambio disponible.                                                                                                                                                                                                                                                                  |
| **Post Condiciones**   | - Los precios de los planes son mostrados en la moneda local del usuario.                                                                                                                                                                                                                                                                                                           |
| **Flujo Principal**    | 1. El usuario accede a la sección de planes y suscripciones. <br> 2. El sistema obtiene la tasa de cambio desde el FX-Service. <br> 3. El sistema convierte el precio base de cada plan a la moneda local correspondiente. <br> 4. El sistema actualiza la información mostrada en las tarjetas de planes. <br> 5. El usuario visualiza los precios convertidos en su moneda local. |
| **Flujos Alternos**    | **FA1: Moneda local igual a moneda base** <br> FA1.1 La moneda del usuario coincide con la moneda original del plan. <br> FA1.2 El sistema muestra el precio sin realizar conversión.                                                                                                                                                                                               |
| **Reglas de Negocio**  | - Los precios deben mostrarse utilizando la tasa de cambio más reciente disponible. <br> - Los valores monetarios deben mostrarse con dos decimales.                                                                                                                                                                                                                                |
| **Flujo de Excepción** | **FE1: No se puede obtener la tasa de cambio** <br> FE1.1 El FX-Service no retorna una tasa válida. <br> FE1.2 El sistema muestra el precio original del plan.                                                                                                                                                                                                                      |
| **Reglas de Calidad**  | - La conversión y visualización del precio debe realizarse en ≤ 500 ms.                                                                                                                                                                                                                                                                                                             |


#### CDU-007: Historial de Reproducción

Sus expandidos son:
- CDU007.1: Registrar progreso de visualización
- CDU007.2: Reanudar contenido desde donde se detuvo
- CDU007.3: Ver historial de reproducción del perfil

![Diagrama Alto Nivel](imgs/CDU-007_F2.png)

## CDU007.1: Registrar Progreso de Visualización

| Campo                  | Detalle                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nombre**             | Registrar progreso de visualización                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Código**             | CDU007.1                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Actores**            | Usuario                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Descripción**        | El sistema registra automáticamente el progreso de reproducción del perfil activo, almacenando el minuto exacto de reproducción para películas y la temporada, capítulo y minuto para series.                                                                                                                                                                                                                                                   |
| **Precondiciones**     | El usuario debe tener sesión activa con un perfil seleccionado y estar reproduciendo contenido.                                                                                                                                                                                                                                                                                                                                                 |
| **Post Condiciones**   | - Progreso de visualización actualizado en la base de datos por perfil. <br> - Para series: temporada, capítulo y minuto almacenados.                                                                                                                                                                                                                                                                                                           |
| **Flujo Principal**    | 1. El usuario inicia la reproducción de un contenido. <br> 2. El sistema inicia el registro de progreso cada 30 segundos. <br> 3. Para películas: el sistema almacena el minuto actual de reproducción. <br> 4. Para series: el sistema almacena la temporada, capítulo y minuto actual. <br> 5. Al pausar o detener, el sistema realiza un registro final del progreso. <br> 6. El historial del perfil es actualizado con el último registro. |
| **Flujos Alternos**    | **FA1: Contenido completado** <br> FA1.1 El usuario llega al final del contenido. <br> FA1.2 El sistema marca el contenido como "completado" en el historial. <br> FA1.3 Limpia el progreso de minuto (ya no hay reanudación).                                                                                                                                                                                                                  |
| **Reglas de Negocio**  | - El progreso es independiente por perfil. <br> - Para series se almacena: id_temporada, id_capitulo y minuto_exacto. <br> - El registro de progreso debe realizarse cada 30 segundos durante la reproducción.                                                                                                                                                                                                                                  |
| **Flujo de Excepción** | **FE1: Error al registrar progreso** <br> FE1.1 El sistema no puede escribir en la base de datos. <br> FE1.2 El sistema reintenta al siguiente intervalo. <br> FE1.3 La reproducción no se interrumpe.                                                                                                                                                                                                                                          |
| **Reglas de Calidad**  | - El registro de progreso no debe agregar más de 50 ms de latencia a la reproducción. <br> - Los datos de progreso deben ser consistentes y no perderse ante fallos del servidor.                                                                                                                                                                                                                                                               |

---

## CDU007.2: Reanudar Contenido Desde Donde se Detuvo

| Campo                  | Detalle                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nombre**             | Reanudar contenido desde donde se detuvo                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Código**             | CDU007.2                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Actores**            | Usuario                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Descripción**        | Permite al usuario continuar una película o serie desde el último punto registrado en su historial de reproducción.                                                                                                                                                                                                                                                                                                                                                             |
| **Precondiciones**     | - El usuario debe tener sesión activa con un perfil seleccionado. <br> - Debe existir un progreso previamente registrado para el contenido.                                                                                                                                                                                                                                                                                                                                     |
| **Post Condiciones**   | - La reproducción inicia desde el último punto guardado.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Flujo Principal**    | 1. El usuario selecciona un contenido previamente visto. <br> 2. El sistema consulta el historial del perfil. <br> 3. El sistema recupera el último progreso registrado. <br> 4. Para películas, obtiene el minuto almacenado. <br> 5. Para series, obtiene la temporada, capítulo y minuto almacenados. <br> 6. El sistema muestra la opción "Continuar viendo". <br> 7. El usuario selecciona la opción. <br> 8. El sistema inicia la reproducción desde el punto almacenado. |
| **Flujos Alternos**    | **FA1: Sin progreso registrado** <br> FA1.1 No existe historial para el contenido. <br> FA1.2 El sistema inicia la reproducción desde el principio.                                                                                                                                                                                                                                                                                                                             |
| **Reglas de Negocio**  | - La reanudación debe ser específica para cada perfil. <br> - Los contenidos marcados como completados deben iniciar desde el principio, salvo que el usuario elija reanudarlos manualmente.                                                                                                                                                                                                                                                                                    |
| **Flujo de Excepción** | **FE1: Progreso inconsistente** <br> FE1.1 El progreso almacenado es inválido o no existe. <br> FE1.2 El sistema inicia la reproducción desde el inicio del contenido.                                                                                                                                                                                                                                                                                                          |
| **Reglas de Calidad**  | - La recuperación del progreso debe completarse en ≤ 500 ms.                                                                                                                                                                                                                                                                                                                                                                                                                    |

---

## CDU007.3: Ver Historial de Reproducción del Perfil

| Campo                  | Detalle                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nombre**             | Ver historial de reproducción del perfil                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Código**             | CDU007.3                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Actores**            | Usuario                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Descripción**        | Permite al usuario visualizar el historial de películas y series reproducidas por el perfil activo, incluyendo el estado de avance de cada contenido.                                                                                                                                                                                                                                                                                                               |
| **Precondiciones**     | El usuario debe tener sesión activa con un perfil seleccionado.                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Post Condiciones**   | - El historial de reproducción es mostrado al usuario.                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Flujo Principal**    | 1. El usuario accede a la sección "Mi historial". <br> 2. El sistema consulta el historial asociado al perfil activo. <br> 3. El sistema obtiene los contenidos reproducidos y su progreso. <br> 4. El sistema muestra la lista de contenidos visualizados. <br> 5. Para cada contenido se muestra información como título, portada, fecha de reproducción y porcentaje de avance. <br> 6. El usuario puede seleccionar un contenido para reanudar su reproducción. |
| **Flujos Alternos**    | **FA1: Historial vacío** <br> FA1.1 El perfil no posee reproducciones registradas. <br> FA1.2 El sistema muestra el mensaje "Aún no has visto ningún contenido".                                                                                                                                                                                                                                                                                                    |
| **Reglas de Negocio**  | - El historial es independiente para cada perfil. <br> - Deben mostrarse tanto contenidos en progreso como contenidos completados.                                                                                                                                                                                                                                                                                                                                  |
| **Flujo de Excepción** | **FE1: Error al consultar historial** <br> FE1.1 No es posible recuperar la información del historial. <br> FE1.2 El sistema muestra un mensaje de error y permite reintentar la consulta.                                                                                                                                                                                                                                                                          |
| **Reglas de Calidad**  | - El historial debe cargarse en ≤ 2 segundos. <br> - La información mostrada debe reflejar el estado más reciente registrado para el perfil.                                                                                                                                                                                                                                                                                                                        |

#### CDU-008: Sistema de Notificaciones por Correo

Sus expandidos son:
- CDU008.1: Enviar correo de confirmación de registro
- CDU008.2: Enviar recibo de compra
- CDU008.3: Enviar alerta de nuevo contenido

![Diagrama Alto Nivel](imgs/CDU-008_F2.png)

##### Enviar Correo de Confirmación de Registro

| Campo | Detalle |
|-------|---------|
| **Nombre** | Enviar correo de confirmación de registro |
| **Código** | CDU008.1 |
| **Actores** | Servicio de Correo |
| **Descripción** | El sistema de notificaciones envía automáticamente un correo electrónico de bienvenida y confirmación al usuario tras completar su registro exitosamente en la plataforma. |
| **Precondiciones** | El usuario debe haber completado el registro exitosamente (CDU001.1). |
| **Post Condiciones** | - Correo de bienvenida enviado al correo del usuario. <br> - Registro del envío almacenado en la base de datos. |
| **Flujo Principal** | 1. El microservicio de autenticación notifica al servicio de correo el registro exitoso de un nuevo usuario (vía gRPC). <br> 2. El servicio de correo genera el contenido del correo de bienvenida con los datos del usuario. <br> 3. El servicio de correo envía el mensaje al correo electrónico registrado. <br> |
| **Flujos Alternos** | N/A |
| **Reglas de Negocio** | - El correo debe enviarse en los primeros 60 segundos tras el registro. <br> - El correo debe incluir el nombre del usuario y un enlace de verificación. |
| **Flujo de Excepción** | **FE1: Fallo en el envío del correo** <br> FE1.1 El proveedor de correo no está disponible. <br> FE1.2 El sistema registra el fallo y programa un reintento automático. <br> FE1.3 El sistema permite al usuario reenviar el correo desde su perfil. |
| **Reglas de Calidad** | - El tiempo de envío del correo no debe superar los 60 segundos desde el registro. <br> - Los correos deben utilizar plantillas HTML responsivas. |

---

#### CDU-009: Panel de Administración y Catálogo Dinámico

Sus expandidos son:
- CDU009.1: Crear contenido multimedia
- CDU009.2: Editar metadatos de contenido
- CDU009.3: Eliminar o desactivar contenido
- CDU009.4: Programar estreno
- CDU009.5: Cargar archivos multimedia a Google Cloud Storage

![Diagrama CDU-009](imgs/CDU-009_F2.png)

### CDU009.1: Crear Contenido Multimedia

| Campo | Detalle |
|-------|---------|
| **Nombre** | Crear contenido multimedia |
| **Código** | CDU009.1 |
| **Actores** | Administrador |
| **Descripción** | Permite al administrador agregar una nueva película o serie al catálogo de Quetxal TV, registrando metadatos, clasificación, duración, recursos visuales y archivos multimedia asociados. |
| **Precondiciones** | - El administrador debe tener sesión activa. <br> - El usuario autenticado debe poseer rol de administrador. <br> - Deben existir categorías o géneros configurados para clasificar el contenido. |
| **Post Condiciones** | - El contenido queda registrado en el catálogo. <br> - El contenido puede quedar en estado borrador, programado o publicado según la fecha de estreno. <br> - Los recursos multimedia quedan asociados al contenido. |
| **Flujo Principal** | 1. El administrador ingresa al panel de administración. <br> 2. Selecciona la opción "Agregar contenido". <br> 3. El sistema muestra el formulario de registro. <br> 4. El administrador ingresa título, tipo, sinopsis, año, clasificación, duración y metadatos. <br> 5. El administrador selecciona géneros, reparto y datos técnicos. <br> 6. El sistema valida los datos obligatorios. <br> 7. El administrador adjunta póster, trailer o archivo de video. <br> 8. El sistema envía los archivos pesados a Google Cloud Storage. <br> 9. El sistema guarda las URLs o referencias de los recursos. <br> 10. El sistema registra el nuevo contenido en la base de datos del catálogo. <br> 11. El sistema confirma la creación del contenido. |
| **Flujos Alternos** | **FA1: Guardar como borrador** <br> FA1.1 El administrador decide no publicar inmediatamente. <br> FA1.2 El sistema guarda el contenido como borrador. <br><br> **FA2: Programar estreno** <br> FA2.1 El administrador define una fecha futura. <br> FA2.2 El sistema guarda el contenido como programado. |
| **Reglas de Negocio** | - Solo usuarios administradores pueden crear contenido. <br> - Todo contenido debe tener título, tipo, sinopsis y clasificación. <br> - Los archivos de video y portadas deben almacenarse en Google Cloud Storage. |
| **Flujo de Excepción** | **FE1: Error al cargar archivo en GCS** <br> FE1.1 Google Cloud Storage no responde o rechaza el archivo. <br> FE1.2 El sistema cancela la publicación y conserva los datos ingresados. <br> FE1.3 El sistema muestra un mensaje para reintentar. |
| **Reglas de Calidad** | - El formulario debe validar campos obligatorios antes de enviar. <br> - La carga de archivos debe mostrar progreso. <br> - La creación no debe dejar registros incompletos si falla la carga de recursos. |

---

### CDU009.2: Editar Metadatos de Contenido

| Campo | Detalle |
|-------|---------|
| **Nombre** | Editar metadatos de contenido |
| **Código** | CDU009.2 |
| **Actores** | Administrador |
| **Descripción** | Permite actualizar información de una película o serie existente, incluyendo datos descriptivos, estado de publicación, recursos visuales y clasificación. |
| **Precondiciones** | - El administrador debe tener sesión activa. <br> - El contenido debe existir en el catálogo. |
| **Post Condiciones** | - Los cambios quedan guardados. <br> - Se genera registro de auditoría por actualización. <br> - El catálogo refleja los metadatos actualizados. |
| **Flujo Principal** | 1. El administrador accede al panel de catálogo. <br> 2. Busca o selecciona el contenido a editar. <br> 3. El sistema muestra la información actual. <br> 4. El administrador modifica los campos necesarios. <br> 5. Si adjunta nuevos recursos, el sistema los carga a Google Cloud Storage. <br> 6. El sistema valida los datos. <br> 7. El sistema actualiza el contenido. <br> 8. El trigger de auditoría registra el estado anterior y el estado nuevo. <br> 9. El sistema muestra confirmación. |
| **Flujos Alternos** | **FA1: Cambio de estado de publicación** <br> FA1.1 El administrador cambia el contenido de borrador a publicado o viceversa. <br> FA1.2 El sistema actualiza la visibilidad del contenido. |
| **Reglas de Negocio** | - No se permite dejar vacío el título ni el tipo de contenido. <br> - Toda actualización debe ser auditada. |
| **Flujo de Excepción** | **FE1: Contenido no encontrado** <br> FE1.1 El contenido fue eliminado o desactivado. <br> FE1.2 El sistema muestra un mensaje de error. |
| **Reglas de Calidad** | - La actualización de metadatos debe completarse en ≤ 2 segundos, excluyendo carga de archivos pesados. |

---

### CDU009.3: Eliminar o Desactivar Contenido

| Campo | Detalle |
|-------|---------|
| **Nombre** | Eliminar o desactivar contenido |
| **Código** | CDU009.3 |
| **Actores** | Administrador |
| **Descripción** | Permite retirar contenido del catálogo visible para usuarios, aplicando eliminación lógica para conservar trazabilidad y evitar pérdida accidental de información. |
| **Precondiciones** | - El administrador debe tener sesión activa. <br> - El contenido debe existir en el catálogo. |
| **Post Condiciones** | - El contenido deja de mostrarse en la cartelera. <br> - El cambio queda registrado en auditoría. |
| **Flujo Principal** | 1. El administrador selecciona un contenido desde el panel. <br> 2. Selecciona la opción "Eliminar" o "Desactivar". <br> 3. El sistema solicita confirmación. <br> 4. El administrador confirma. <br> 5. El sistema cambia el estado del contenido a inactivo. <br> 6. El trigger de auditoría registra la modificación. <br> 7. El sistema confirma la operación. |
| **Flujos Alternos** | **FA1: Cancelación** <br> FA1.1 El administrador cancela la operación. <br> FA1.2 El contenido permanece sin cambios. |
| **Reglas de Negocio** | - Se recomienda eliminación lógica en lugar de eliminación física. <br> - El contenido inactivo no debe aparecer al usuario final. |
| **Flujo de Excepción** | **FE1: Error al actualizar estado** <br> FE1.1 La base de datos no responde. <br> FE1.2 El sistema notifica el fallo y no modifica el estado. |
| **Reglas de Calidad** | - La operación debe ser trazable mediante auditoría. |

---

### CDU009.4: Programar Estreno

| Campo | Detalle |
|-------|---------|
| **Nombre** | Programar estreno |
| **Código** | CDU009.4 |
| **Actores** | Administrador |
| **Descripción** | Permite calendarizar la fecha y hora exacta en que una película o serie será visible para los usuarios en la cartelera. |
| **Precondiciones** | - El contenido debe existir. <br> - El administrador debe tener permisos de gestión de catálogo. |
| **Post Condiciones** | - El contenido queda programado. <br> - La publicación se activa cuando se alcanza la fecha configurada. |
| **Flujo Principal** | 1. El administrador abre el detalle administrativo del contenido. <br> 2. Selecciona "Programar estreno". <br> 3. El sistema muestra selector de fecha y hora. <br> 4. El administrador define el momento de publicación. <br> 5. El sistema valida que la fecha sea válida. <br> 6. El sistema guarda la programación. <br> 7. El contenido queda oculto hasta la fecha de estreno. |
| **Flujos Alternos** | **FA1: Publicación inmediata** <br> FA1.1 El administrador selecciona publicar ahora. <br> FA1.2 El sistema cambia el estado a publicado. |
| **Reglas de Negocio** | - No se debe mostrar contenido programado antes de la fecha de estreno. <br> - La fecha programada debe registrarse con zona horaria consistente. |
| **Flujo de Excepción** | **FE1: Fecha inválida** <br> FE1.1 La fecha ingresada es anterior a la actual. <br> FE1.2 El sistema solicita una fecha válida. |
| **Reglas de Calidad** | - El cambio de visibilidad debe ser consistente con la hora configurada. |

---

### CDU009.5: Cargar Archivos Multimedia a Google Cloud Storage

| Campo | Detalle |
|-------|---------|
| **Nombre** | Cargar archivos multimedia a Google Cloud Storage |
| **Código** | CDU009.5 |
| **Actores** | Administrador, Google Cloud Storage |
| **Descripción** | Permite cargar archivos pesados como videos, capítulos, trailers e imágenes de portada a buckets de Google Cloud Storage. |
| **Precondiciones** | - El administrador debe estar autenticado. <br> - Debe existir configuración válida de acceso a GCS mediante variables seguras. |
| **Post Condiciones** | - El archivo queda almacenado en GCS. <br> - El sistema guarda la referencia o URL del recurso. |
| **Flujo Principal** | 1. El administrador selecciona un archivo multimedia. <br> 2. El sistema valida tipo y tamaño del archivo. <br> 3. El sistema envía el archivo al bucket configurado. <br> 4. Google Cloud Storage almacena el objeto. <br> 5. El sistema recibe la URL o referencia del objeto. <br> 6. El sistema asocia la referencia al contenido. |
| **Flujos Alternos** | **FA1: Reemplazo de archivo** <br> FA1.1 El administrador sustituye un recurso existente. <br> FA1.2 El sistema actualiza la referencia del objeto. |
| **Reglas de Negocio** | - Los archivos pesados no deben almacenarse en el sistema de archivos local. <br> - Las credenciales de GCS no deben estar quemadas en código. |
| **Flujo de Excepción** | **FE1: Archivo inválido** <br> FE1.1 El archivo supera el tamaño permitido o tiene formato no soportado. <br> FE1.2 El sistema rechaza la carga y muestra la causa. |
| **Reglas de Calidad** | - La carga debe manejarse de forma asíncrona o con indicador visual. <br> - El sistema debe evitar duplicados innecesarios. |

---

#### CDU-010: Auditoría y Reportes Administrativos

Sus expandidos son:
- CDU010.1: Registrar auditoría transaccional
- CDU010.2: Consultar log transaccional
- CDU010.3: Descargar reporte CSV
- CDU010.4: Descargar reporte PDF

![Diagrama CDU-010](imgs/CDU-010_F2.png)

### CDU010.1: Registrar Auditoría Transaccional

| Campo | Detalle |
|-------|---------|
| **Nombre** | Registrar auditoría transaccional |
| **Código** | CDU010.1 |
| **Actores** | Sistema, Motor de Base de Datos |
| **Descripción** | Registra automáticamente operaciones INSERT y UPDATE realizadas sobre tablas relacionales críticas mediante triggers de base de datos. |
| **Precondiciones** | - Deben existir triggers configurados en las tablas auditables. <br> - La operación transaccional debe ser INSERT o UPDATE. |
| **Post Condiciones** | - Se crea un registro en la tabla de auditoría. <br> - Se almacena tabla afectada, timestamp, responsable, estado anterior y estado nuevo. |
| **Flujo Principal** | 1. Un usuario o administrador ejecuta una operación sobre una tabla auditable. <br> 2. La base de datos completa la operación. <br> 3. El trigger se ejecuta automáticamente. <br> 4. El trigger obtiene el estado anterior y el estado nuevo. <br> 5. El trigger registra la operación en la tabla de auditoría. |
| **Flujos Alternos** | **FA1: Inserción nueva** <br> FA1.1 No existe estado anterior. <br> FA1.2 El sistema registra únicamente el estado nuevo. |
| **Reglas de Negocio** | - La auditoría debe generarse automáticamente sin depender de la capa de aplicación. <br> - INSERT y UPDATE deben quedar registrados. |
| **Flujo de Excepción** | **FE1: Error en trigger** <br> FE1.1 La operación principal se cancela si la transacción no puede completarse de forma consistente. |
| **Reglas de Calidad** | - La auditoría no debe agregar latencia significativa a la operación principal. |

---

### CDU010.2: Consultar Log Transaccional

| Campo | Detalle |
|-------|---------|
| **Nombre** | Consultar log transaccional |
| **Código** | CDU010.2 |
| **Actores** | Administrador |
| **Descripción** | Permite visualizar desde el panel administrativo los registros generados en las tablas de auditoría. |
| **Precondiciones** | - El administrador debe estar autenticado. <br> - Deben existir registros de auditoría. |
| **Post Condiciones** | - El administrador visualiza el log transaccional filtrado u ordenado. |
| **Flujo Principal** | 1. El administrador ingresa al módulo de auditoría. <br> 2. El sistema consulta los registros de auditoría. <br> 3. El sistema muestra tabla afectada, acción, responsable, fecha, estado anterior y estado nuevo. <br> 4. El administrador puede aplicar filtros por tabla, acción o fecha. |
| **Flujos Alternos** | **FA1: Sin registros** <br> FA1.1 No existen registros para los filtros seleccionados. <br> FA1.2 El sistema muestra un mensaje informativo. |
| **Reglas de Negocio** | - Solo administradores pueden consultar auditoría. <br> - El log debe poder filtrarse y ordenarse. |
| **Flujo de Excepción** | **FE1: Servicio de auditoría no disponible** <br> FE1.1 El sistema no puede obtener los logs. <br> FE1.2 Se muestra mensaje de error técnico. |
| **Reglas de Calidad** | - La consulta inicial debe cargar en ≤ 3 segundos. |

---

### CDU010.3: Descargar Reporte CSV

| Campo | Detalle |
|-------|---------|
| **Nombre** | Descargar reporte CSV |
| **Código** | CDU010.3 |
| **Actores** | Administrador |
| **Descripción** | Permite exportar los registros de auditoría en formato CSV para análisis tabular. |
| **Precondiciones** | El administrador debe haber consultado el log transaccional. |
| **Post Condiciones** | Se descarga un archivo CSV con los registros filtrados. |
| **Flujo Principal** | 1. El administrador aplica filtros al log. <br> 2. Selecciona "Descargar CSV". <br> 3. El sistema genera el archivo con encabezados y filas ordenadas. <br> 4. El navegador descarga el archivo. |
| **Flujos Alternos** | **FA1: Exportar sin filtros** <br> FA1.1 El sistema exporta los registros recientes por defecto. |
| **Reglas de Negocio** | - El reporte debe respetar los filtros aplicados. <br> - El CSV debe incluir encabezados descriptivos. |
| **Flujo de Excepción** | **FE1: Error de generación** <br> FE1.1 El sistema no puede construir el archivo. <br> FE1.2 Se notifica al administrador. |
| **Reglas de Calidad** | - El archivo debe generarse en ≤ 5 segundos para volúmenes moderados. |

---

### CDU010.4: Descargar Reporte PDF

| Campo | Detalle |
|-------|---------|
| **Nombre** | Descargar reporte PDF |
| **Código** | CDU010.4 |
| **Actores** | Administrador |
| **Descripción** | Permite exportar el log de auditoría en un reporte PDF ordenado y formateado para revisión administrativa. |
| **Precondiciones** | El administrador debe haber consultado el log transaccional. |
| **Post Condiciones** | Se descarga un PDF con los registros filtrados y metadatos del reporte. |
| **Flujo Principal** | 1. El administrador aplica filtros al log. <br> 2. Selecciona "Descargar PDF". <br> 3. El sistema genera un documento formateado. <br> 4. El sistema incluye fecha, servicio, filtros aplicados y registros. <br> 5. El navegador descarga el archivo. |
| **Flujos Alternos** | **FA1: Reporte sin filtros** <br> FA1.1 El sistema genera un reporte general reciente. |
| **Reglas de Negocio** | - El PDF debe estar ordenado y ser legible. <br> - Debe incluir fecha de generación y filtros aplicados. |
| **Flujo de Excepción** | **FE1: Error al generar PDF** <br> FE1.1 El sistema no logra renderizar el documento. <br> FE1.2 Notifica al administrador. |
| **Reglas de Calidad** | - El reporte debe conservar formato visual consistente. |

---

#### CDU-011: Monitoreo de Salud y Disponibilidad

Sus expandidos son:
- CDU011.1: Consultar liveness probe
- CDU011.2: Consultar readiness probe
- CDU011.3: Retirar tráfico o reiniciar pod ante fallo

![Diagrama CDU-011](imgs/CDU-011_F2.png)

### CDU011.1: Consultar Liveness Probe

| Campo | Detalle |
|-------|---------|
| **Nombre** | Consultar liveness probe |
| **Código** | CDU011.1 |
| **Actores** | Kubernetes |
| **Descripción** | Permite a Kubernetes verificar que el proceso del contenedor continúa vivo y no se encuentra congelado. |
| **Precondiciones** | El Pod debe estar desplegado y el endpoint de liveness configurado. |
| **Post Condiciones** | Kubernetes obtiene una respuesta de vitalidad del servicio. |
| **Flujo Principal** | 1. Kubernetes ejecuta la sonda liveness. <br> 2. El endpoint `/health/live` responde. <br> 3. Kubernetes interpreta el resultado. <br> 4. Si el resultado es correcto, mantiene el contenedor activo. |
| **Flujos Alternos** | **FA1: Respuesta tardía** <br> FA1.1 La sonda excede el timeout. <br> FA1.2 Kubernetes registra fallo de liveness. |
| **Reglas de Negocio** | - Liveness no debe validar dependencias externas complejas. <br> - Debe validar únicamente que el proceso está vivo. |
| **Flujo de Excepción** | **FE1: Fallo persistente** <br> FE1.1 Kubernetes detecta fallos repetidos. <br> FE1.2 Reinicia el contenedor. |
| **Reglas de Calidad** | - La respuesta debe ser liviana y rápida. |

---

### CDU011.2: Consultar Readiness Probe

| Campo | Detalle |
|-------|---------|
| **Nombre** | Consultar readiness probe |
| **Código** | CDU011.2 |
| **Actores** | Kubernetes, API Gateway |
| **Descripción** | Permite verificar que el servicio terminó de cargar sus conexiones internas y está listo para recibir tráfico real. |
| **Precondiciones** | El servicio debe estar desplegado y contar con endpoint de readiness configurado. |
| **Post Condiciones** | Kubernetes determina si el Pod puede recibir tráfico. |
| **Flujo Principal** | 1. Kubernetes consulta `/health/ready`. <br> 2. El API Gateway valida el estado del microservicio relacionado. <br> 3. El microservicio verifica sus dependencias internas, como base de datos o gRPC. <br> 4. El sistema responde `READY` si todo está disponible. |
| **Flujos Alternos** | **FA1: Dependencia no disponible** <br> FA1.1 La base de datos, Redis o conexión gRPC falla. <br> FA1.2 El endpoint responde `NOT_READY`. <br> FA1.3 Kubernetes no envía tráfico al Pod. |
| **Reglas de Negocio** | - Readiness debe validar dependencias necesarias para operar. <br> - Un servicio no listo no debe recibir tráfico. |
| **Flujo de Excepción** | **FE1: Error interno en validación** <br> FE1.1 El health check produce error inesperado. <br> FE1.2 El sistema responde estado no disponible. |
| **Reglas de Calidad** | - La validación debe ejecutarse con timeout controlado. |

---

### CDU011.3: Retirar Tráfico o Reiniciar Pod ante Fallo

| Campo | Detalle |
|-------|---------|
| **Nombre** | Retirar tráfico o reiniciar pod ante fallo |
| **Código** | CDU011.3 |
| **Actores** | Kubernetes |
| **Descripción** | Permite que Kubernetes actúe automáticamente cuando un Pod no está listo o cuando su proceso deja de estar vivo. |
| **Precondiciones** | Deben estar configuradas las sondas liveness y readiness en el manifiesto del Deployment. |
| **Post Condiciones** | - El Pod no listo deja de recibir tráfico. <br> - El Pod con liveness fallido puede ser reiniciado. |
| **Flujo Principal** | 1. Kubernetes ejecuta las sondas periódicamente. <br> 2. Si readiness falla, retira el Pod de los endpoints disponibles. <br> 3. Si liveness falla de forma persistente, reinicia el contenedor. <br> 4. El servicio vuelve a estar disponible cuando las sondas responden correctamente. |
| **Flujos Alternos** | **FA1: Recuperación automática** <br> FA1.1 La dependencia vuelve a estar disponible. <br> FA1.2 Readiness responde `READY`. <br> FA1.3 Kubernetes vuelve a enviar tráfico al Pod. |
| **Reglas de Negocio** | - Readiness controla recepción de tráfico. <br> - Liveness controla reinicio del contenedor. |
| **Flujo de Excepción** | **FE1: Fallo de despliegue persistente** <br> FE1.1 El Pod entra en ciclo de error. <br> FE1.2 El pipeline debe activar rollback automático según la estrategia de despliegue. |
| **Reglas de Calidad** | - La recuperación no debe requerir intervención manual en condiciones esperadas. |

