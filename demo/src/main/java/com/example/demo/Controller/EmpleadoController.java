package com.example.demo.Controller;

import java.security.SecureRandom;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import com.example.demo.Model.Empleado;
import com.example.demo.Repository.EmpleadoRepository;

@RestController
@RequestMapping("/api/empleados")
public class EmpleadoController {

    private static final String CLAVES = "abcdefghijkmnpqrstuvwxyz23456789";

    @Autowired
    private EmpleadoRepository repo;

    @GetMapping
    public List<Empleado> traerEmpleados() {
        return repo.findAll();
    }

    /* El código (E001, E002...) lo genera el sistema, no se escribe a mano */
    public String siguienteCodigo() {
        int max = repo.findAll().stream()
            .map(Empleado::getCodigo)
            .filter(c -> c != null && c.matches("E\\d{3}"))
            .mapToInt(c -> Integer.parseInt(c.substring(1)))
            .max().orElse(0);
        String codigo;
        do { codigo = String.format("E%03d", ++max); } while (repo.existsByCodigo(codigo));
        return codigo;
    }

    @PostMapping("nuevo")
    public Empleado guardarEmpleado(@Valid @RequestBody Empleado nuevo) {
        if (repo.findAll().stream().anyMatch(e -> e.getUsuario().equalsIgnoreCase(nuevo.getUsuario())))
            throw new IllegalArgumentException("Ya existe un empleado con ese usuario");
        nuevo.setCodigo(siguienteCodigo());
        nuevo.setEstado("Activo");
        return repo.save(nuevo);
    }

    /* La edición directa ya no se usa en pantalla; conserva el código y la contraseña si no se envían */
    @PutMapping("actualizar/{id}")
    public Empleado editarEmpleado(@PathVariable Long id, @Valid @RequestBody Empleado datos) {
        Empleado actual = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("El empleado no existe"));
        datos.setId(id);
        datos.setCodigo(actual.getCodigo());
        return repo.save(datos);
    }

    @PutMapping("suspender/{id}")
    public Empleado suspender(@PathVariable Long id) {
        Empleado e = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("El empleado no existe"));
        e.setEstado("Suspendido");
        return repo.save(e);
    }

    /* Devuelve al empleado suspendido a la lista principal */
    @PutMapping("reactivar/{id}")
    public Empleado reactivar(@PathVariable Long id) {
        Empleado e = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("El empleado no existe"));
        e.setEstado("Activo");
        return repo.save(e);
    }

    /* Genera una contraseña temporal y se la muestra al administrador para que se la entregue al empleado */
    @PutMapping("restablecer/{id}")
    public Map<String, String> restablecerContrasena(@PathVariable Long id) {
        Empleado e = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("El empleado no existe"));
        SecureRandom azar = new SecureRandom();
        StringBuilder temporal = new StringBuilder();
        for (int i = 0; i < 8; i++) temporal.append(CLAVES.charAt(azar.nextInt(CLAVES.length())));
        e.setContrasena(temporal.toString());
        repo.save(e);
        return Map.of("mensaje", "Contraseña restablecida", "contrasena", temporal.toString());
    }

    @DeleteMapping("eliminar/{id}")
    public Map<String, String> eliminarEmpleado(@PathVariable Long id) {
        repo.deleteById(id);
        return Map.of("mensaje", "EMPLEADO ELIMINADO");
    }
}
