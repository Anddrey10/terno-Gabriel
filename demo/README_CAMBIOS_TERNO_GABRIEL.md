# Terno Gabriel — cambios aplicados

Este ZIP conserva la estructura Spring Boot + Thymeleaf + JavaScript + JPA/MySQL del proyecto recibido.

## Cambios principales

- Se ajustaron los datos de demostración para una base vacía: 2 empleados, 2 clientes y 5 prendas.
- Se añadió el panel **Boletas y tickets** en `/admin/boletas`, con las cinco pestañas solicitadas, cuatro indicadores interactivos, filtros por fecha/estado/búsqueda y motivos de anulación.
- Los catálogos de compra/alquiler muestran solo prendas disponibles. Las prendas vendidas no aparecen en las vistas de empleados.
- Las calificaciones se muestran con estrellas, sin el puntaje numérico entre paréntesis.
- El inventario administrativo separa el arrendatario en una columna y solo lo muestra cuando la prenda está alquilada.
- Se reforzó la selección activa de la navegación y se corrigieron los elementos activos de Catálogo y Estado de Prendas.
- Los informes consumen los endpoints reales del sistema, no el conjunto de datos ficticios anterior, y admiten filtros por fechas, tipo, estado, cliente/DNI y empleado. Incluyen devoluciones y confecciones.
- En confección se exige completar ficha de medidas y plazos, y el comprobante al entregar calcula el saldo después del adelanto.
- La anulación de boletas exige un motivo.

## Inicio de datos

La primera vez que arranca esta versión se BORRAN todos los datos de la base `terno_gabriel` y se cargan 2 empleados, 3 clientes y 5 productos nuevos (una sola vez; las siguientes ejecuciones no borran nada). Para repetir el borrado: `terno.reiniciar-datos=true` en `application.properties` (volver a `false` después).

Credenciales de demostración sembradas:
- Administrador: `admin` / `admin`
- Empleado: `empleado` / `1234`

Cambiar las contraseñas de demostración antes de cualquier uso real.

## Verificación

Se ejecutó `node --check` sobre todos los archivos JavaScript del proyecto: pasó sin errores de sintaxis. No se pudo ejecutar el empaquetado Maven en este entorno porque el wrapper no pudo descargar Maven desde Maven Central (fallo de conexión). Por ello, la compilación Java y la ejecución integrada deben verificarse en un entorno con Maven y acceso a las dependencias.

## Corrección adicional: error `Field 'color' doesn't have a default value`

- La entidad `Confeccion` ahora mapea explícitamente la columna `color` de la tabla existente.
- El frontend envía los colores seleccionados junto con el detalle de la ficha.
- El controlador deriva los colores desde el JSON `detalle` como compatibilidad si el campo separado no llega, y garantiza un valor no vacío antes de guardar.
- La creación del ticket continúa usando el ID generado por la base de datos y devuelve el ticket creado en la respuesta.

Nota: el código se ha revisado estáticamente y el JavaScript pasó `node --check`. Debe probarse contra la base MySQL real del usuario para confirmar que su esquema concreto y los datos de los selectores coincidan.


## Correcciones adicionales
- Compatibilidad con la columna MySQL `fechaEntrega`: el backend sincroniza este valor con `entregaFinal` al registrar una confección, evitando el error de columna obligatoria vacía.
- El catálogo de administrador muestra todos los productos no suspendidos y tiene un filtro exclusivo para ver solo vendidos. El catálogo del empleado y el flujo de compra/alquiler mantienen el filtro de disponibilidad.
- Los datos iniciales completan los cinco productos por código aunque la base ya tenga registros; no se duplican ni se sobrescriben productos existentes.


## Revisión general de errores (última versión)

- **Error al confirmar pago en Confección (ticket):** la base MySQL antigua tenía columnas viejas NOT NULL (y `detalle` demasiado corta). Al arrancar, `DatosIniciales` repara el esquema (vuelve opcionales las columnas antiguas que ya no existen y amplía `detalle`/`imagen`). Además el ticket se guarda en una transacción (ya no queda una orden sin número si algo falla) y el error del servidor ahora se muestra como aviso.
- **Calificar al cliente fallaba (error 500):** los clientes de ejemplo no tenían correo y la validación de la entidad rechazaba el guardado. Los datos nuevos incluyen correo, y los errores de validación/base de datos devuelven un mensaje legible.
- **Boleta de confección:** ahora registra el costo total (adelanto + saldo). Antes guardaba solo el saldo, que podía ser 0 y fallar la validación, y los informes no sumaban el adelanto.
- **Numeración unificada:** todas las boletas son `B001-0000` y los tickets `T001-0000`. Devolución y Anular Boleta buscan con ese mismo formato (antes buscaban BA/BC/BT).
- **Anular boleta:** ya no falla con boletas de confección (no tienen prenda), y anular una boleta ya devuelta no libera una prenda que está alquilada a otra persona.
- **Notificaciones del empleado:** los alquileres ya devueltos dejaban de aparecer como vencidos.
- **Panel admin → Tickets:** muestra el costo de la orden (antes S/ 0.00).
- **Fechas:** el servidor usa la zona horaria America/Lima, igual que el navegador.
- **Validaciones nuevas:** la entrega final no puede ser anterior a la primera prueba; un alquiler exige fecha de devolución.

## Diseño responsivo (celular, tableta, laptop, monitor y TV)
- Nuevo archivo común `static/css/responsive.css`, enlazado al final del `<head>` de todas las pantallas (no se tocó el CSS/HTML existente).
- Celular (≤580 px): formularios y grillas en 1 columna, buscadores/filtros a todo el ancho, KPIs de a dos, pasos de Comprar/Alquilar en una fila, campos de 16 px (iOS no hace zoom), tablas con scroll táctil.
- Tableta vertical (581–820 px): formularios en 2 columnas; menú tipo cajón.
- Tableta horizontal (821–1100 px): menú lateral compacto (solo iconos).
- Laptop (≥1101 px): diseño original.
- Monitor Full HD / 2K / 4K / TV (≥1920 px): escala proporcional automática (1.15× / 1.4× / 1.8× / 2.2×).
- Menú móvil: se cierra al tocar fuera, con Esc o al agrandar la pantalla (`static/js/app.js`).
- `viewport-fit=cover` + zonas seguras para celulares con notch.

## Notificaciones y Confección (pantallas pequeñas, boleta y pago)
- **Aviso emergente (toast):** en celular/tableta sale arriba, con letra legible y botón × (los errores duran más y se marcan en rojo). Va por encima de cualquier ventana. `TG.toast(mensaje, 'error' | 'info')`.
- **Panel de notificaciones (campana):** en pantallas pequeñas ocupa casi todo el ancho, con cabecera fija y × grande; se cierra con ×, tocando fuera o con Esc.
- **Confección:** al elegir un ticket se muestra la BOLETA de ese ticket (vista previa, sin número hasta emitirla).
- **Pago exacto rechazado:** el saldo se comparaba con decimales flotantes (950.10 − 400.20 = 549.9000000000001); ahora se compara en centavos y el mensaje indica cuánto falta.
- **Ticket pagado completo:** ya no pide forma de pago ni monto; usa la forma de pago del ticket y genera la boleta automáticamente (el backend también lo garantiza en `BoletaController`).
- Se corrigió el desborde horizontal en celular de la tarjeta del ticket elegido y de la tabla de la boleta.
- No se pudo compilar Java en este entorno; el cambio en `BoletaController` es de pocas líneas y debe compilarse con Maven.
