package com.example.demo;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.example.demo.Model.*;
import com.example.demo.Repository.*;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.metamodel.Attribute;
import jakarta.persistence.metamodel.EntityType;

/*
 * Arranque de la base de datos:
 *  1) Repara el esquema de una base MySQL antigua (columnas viejas NOT NULL que ya no existen en las entidades
 *     y columnas demasiado cortas). Esto evita errores como "Field 'x' doesn't have a default value" o
 *     "Data too long for column" al guardar tickets, boletas o prendas con foto.
 *  2) La primera vez que arranca con esta versión BORRA todos los datos y carga datos nuevos:
 *     2 empleados, 3 clientes y 5 productos. Después no vuelve a borrar nada.
 *     Para repetir el borrado: terno.reiniciar-datos=true en application.properties (y volver a false después).
 */
@Configuration
public class DatosIniciales {

    private static final Logger LOG = LoggerFactory.getLogger(DatosIniciales.class);
    private static final String MARCA_REINICIO = "datosReiniciados";

    @Value("${terno.reiniciar-datos:false}")
    private boolean forzarReinicio;

    @Bean
    CommandLineRunner cargar(DataSource ds, EntityManagerFactory emf, EmpleadoRepository emp, PrendaRepository pre,
                             ClienteRepository cli, ConfiguracionRepository cfg) {
        return args -> {
            repararEsquema(ds, emf);

            if (forzarReinicio || cfg.findByClave(MARCA_REINICIO).isEmpty()) {
                LOG.warn("Reiniciando datos: se borran todos los registros y se cargan los datos nuevos.");
                borrarTodo(ds);
                cfg.save(configuracion(MARCA_REINICIO, 1.0));
            }

            if (emp.count() == 0) {
                emp.save(empleado("E001", "Carlos Alberto Ríos Mendoza", "empleado", "1234", "Empleado", "Ventas", "carlos.rios@gmail.com", "954336021"));
                emp.save(empleado("E002", "Ana Lucía Flores Paredes", "admin", "admin", "Administrador", "Administración", "ana.flores@gmail.com", "961775308"));
            }
            if (cli.count() == 0) {
                cli.save(cliente("46281573", "Luis Fernando", "Quispe Huamán", "987215634", "luis.quispe@gmail.com", "Av. Larco 1125"));
                cli.save(cliente("71839246", "María Fernanda", "Torres Castillo", "963502187", "maria.torres@gmail.com", "Jr. Pizarro 480"));
                cli.save(cliente("43917528", "Jorge Luis", "Paredes Salazar", "945118362", "jorge.paredes@gmail.com", "Av. España 1240"));
            }
            if (pre.count() == 0) {
                pre.save(prenda("TRN-001", "Terno Slim Fit Azul Marino", "Nuevo", "M", 420.0, 95.0, "Azul Marino", "Adultos", "Moderno Slim"));
                pre.save(prenda("TRN-002", "Terno Clásico Negro de Lana", "Nuevo", "L", 480.0, 110.0, "Negro", "Adultos", "Clásico"));
                pre.save(prenda("TRN-003", "Terno Príncipe de Gales Gris", "Seminuevo", "M", 360.0, 80.0, "Gris Perla", "Adultos", "Ejecutivo"));
                pre.save(prenda("TRN-004", "Terno Juvenil Gris Oxford", "Nuevo", "S", 320.0, 70.0, "Plomo / Oxford", "Jóvenes", "Moderno Slim"));
                pre.save(prenda("SMK-001", "Smoking Negro Solapa de Raso", "Nuevo", "L", 650.0, 150.0, "Negro", "Adultos", "Smoking"));
            }
            if (cfg.findByClave("penalidadDemora").isEmpty()) cfg.save(configuracion("penalidadDemora", 10.0));
            if (cfg.findByClave("penalidadMalEstado").isEmpty()) cfg.save(configuracion("penalidadMalEstado", 50.0));
        };
    }

    /* ---------- Esquema ---------- */

    private void repararEsquema(DataSource ds, EntityManagerFactory emf) {
        /* Columnas que sí usa cada entidad (nombre del atributo y nombre de la clave foránea idXxx) */
        Map<String, Set<String>> conocidas = new HashMap<>();
        for (EntityType<?> et : emf.getMetamodel().getEntities()) {
            Set<String> cols = new HashSet<>();
            cols.add("id");
            for (Attribute<?, ?> a : et.getAttributes()) {
                String n = a.getName().toLowerCase();
                cols.add(n);
                cols.add("id" + n);
            }
            conocidas.put(et.getName().toLowerCase(), cols);
        }
        try (Connection con = ds.getConnection()) {
            /* Columnas antiguas NOT NULL sin valor por defecto que la entidad actual no conoce: se vuelven opcionales */
            List<String[]> viejas = new ArrayList<>();
            try (Statement st = con.createStatement();
                 ResultSet rs = st.executeQuery("SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS "
                     + "WHERE TABLE_SCHEMA = DATABASE() AND IS_NULLABLE = 'NO' AND COLUMN_DEFAULT IS NULL "
                     + "AND EXTRA NOT LIKE '%auto_increment%' AND EXTRA NOT LIKE '%GENERATED%' AND COLUMN_KEY <> 'PRI'")) {
                while (rs.next()) viejas.add(new String[] { rs.getString(1), rs.getString(2), rs.getString(3) });
            }
            for (String[] c : viejas) {
                Set<String> cols = conocidas.get(c[0].toLowerCase());
                if (cols == null || cols.contains(c[1].toLowerCase())) continue;
                ejecutar(con, "ALTER TABLE `" + c[0] + "` MODIFY `" + c[1] + "` " + c[2] + " NULL");
                LOG.warn("Columna antigua {}.{} ahora acepta valores vacíos.", c[0], c[1]);
            }
            /* Columnas de texto que en bases antiguas quedaron cortas (la ficha de confección y las fotos) */
            asegurarTexto(con, "Confeccion", "detalle", "TEXT", Set.of("text", "mediumtext", "longtext"));
            asegurarTexto(con, "Prenda", "imagen", "LONGTEXT", Set.of("longtext"));
        } catch (SQLException e) {
            LOG.error("No se pudo revisar el esquema de la base de datos: {}", e.getMessage());
        }
    }

    private void asegurarTexto(Connection con, String tabla, String columna, String tipoNuevo, Set<String> aceptados) throws SQLException {
        String tipoActual = null, tablaReal = null, columnaReal = null;
        try (Statement st = con.createStatement();
             ResultSet rs = st.executeQuery("SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() "
                 + "AND LOWER(TABLE_NAME) = '" + tabla.toLowerCase() + "' AND LOWER(COLUMN_NAME) = '" + columna.toLowerCase() + "'")) {
            if (rs.next()) { tablaReal = rs.getString(1); columnaReal = rs.getString(2); tipoActual = rs.getString(3); }
        }
        if (tipoActual != null && !aceptados.contains(tipoActual.toLowerCase())) {
            ejecutar(con, "ALTER TABLE `" + tablaReal + "` MODIFY `" + columnaReal + "` " + tipoNuevo + " NULL");
            LOG.warn("Columna {}.{} ampliada a {}.", tablaReal, columnaReal, tipoNuevo);
        }
    }

    private void ejecutar(Connection con, String sql) {
        try (Statement st = con.createStatement()) {
            st.execute(sql);
        } catch (SQLException e) {
            LOG.error("No se pudo ejecutar [{}]: {}", sql, e.getMessage());
        }
    }

    /* Vacía todas las tablas de la base (reinicia también los contadores de id) */
    private void borrarTodo(DataSource ds) throws SQLException {
        try (Connection con = ds.getConnection()) {
            List<String> tablas = new ArrayList<>();
            try (Statement st = con.createStatement();
                 ResultSet rs = st.executeQuery("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'")) {
                while (rs.next()) tablas.add(rs.getString(1));
            }
            try (Statement st = con.createStatement()) {
                st.execute("SET FOREIGN_KEY_CHECKS = 0");
                try {
                    for (String t : tablas) st.execute("TRUNCATE TABLE `" + t + "`");
                } finally {
                    st.execute("SET FOREIGN_KEY_CHECKS = 1");
                }
            }
        }
    }

    /* ---------- Datos de ejemplo ---------- */

    private Configuracion configuracion(String clave, double valor) {
        Configuracion c = new Configuracion();
        c.setClave(clave); c.setValor(valor); c.setModificadoPor("Administrador");
        return c;
    }

    private Empleado empleado(String codigo, String nombre, String usuario, String clave, String rol, String area, String correo, String telefono) {
        Empleado e = new Empleado();
        e.setCodigo(codigo); e.setNombre(nombre); e.setUsuario(usuario); e.setContrasena(clave); e.setRol(rol);
        e.setArea(area); e.setCorreo(correo); e.setTelefono(telefono); e.setEstado("Activo"); e.setDesde(LocalDate.now());
        return e;
    }

    private Cliente cliente(String dni, String nombres, String apellidos, String celular, String correo, String direccion) {
        Cliente c = new Cliente();
        c.setDni(dni); c.setNombres(nombres); c.setApellidos(apellidos); c.setCelular(celular); c.setCorreo(correo);
        c.setDireccion(direccion); c.setDistrito("Trujillo"); c.setDepartamento("La Libertad");
        return c;
    }

    private Prenda prenda(String codigo, String diseno, String tipo, String talla, double venta, double alquiler,
                          String color, String categoria, String estilo) {
        Prenda p = new Prenda();
        p.setCodigo(codigo); p.setDiseno(diseno); p.setTipo(tipo); p.setTalla(talla);
        p.setPrecioVenta(venta); p.setPrecioAlquiler(alquiler);
        p.setColor(color); p.setCategoria(categoria); p.setEstilo(estilo); p.setComponente("Terno completo");
        return p;
    }
}
