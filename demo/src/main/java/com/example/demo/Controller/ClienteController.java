package com.example.demo.Controller;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import com.example.demo.Model.Calificacion;
import com.example.demo.Model.Cliente;
import com.example.demo.Repository.CalificacionRepository;
import com.example.demo.Repository.ClienteRepository;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

    @Autowired
    private ClienteRepository repo;

    @Autowired
    private CalificacionRepository calificaciones;

    @GetMapping
    public List<Cliente> traerClientes() {
        return repo.findAll();
    }

    @PostMapping("nuevo")
    public Cliente guardarCliente(@Valid @RequestBody Cliente nuevo) {
        if (repo.findByDni(nuevo.getDni()).isPresent())
            throw new IllegalArgumentException("Ya existe un cliente registrado con ese DNI");
        return repo.save(nuevo);
    }

    @PutMapping("actualizar/{id}")
    public Cliente editarCliente(@PathVariable Long id, @Valid @RequestBody Cliente datos) {
        Cliente actual = repo.findById(id).orElseThrow();
        datos.setId(id);
        /* La calificación no se edita a mano: se conserva lo calculado */
        datos.setCalificacion(actual.getCalificacion());
        datos.setComentario(actual.getComentario());
        datos.setFechaCalificacion(actual.getFechaCalificacion());
        datos.setPromedio(actual.getPromedio());
        datos.setCantidadCalificaciones(actual.getCantidadCalificaciones());
        return repo.save(datos);
    }

    /* El empleado califica al cliente al terminar la boleta o la devolución; el administrador lo ve en Calificaciones */
    @PutMapping("calificar/{id}")
    public Cliente calificar(@PathVariable Long id, @RequestBody Map<String, Object> datos) {
        Cliente cliente = repo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("El cliente no existe"));
        int estrellas;
        try {
            estrellas = Integer.parseInt(String.valueOf(datos.get("calificacion")));
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("La calificación debe ser un número del 1 al 5");
        }
        if (estrellas < 1 || estrellas > 5)
            throw new IllegalArgumentException("La calificación debe ser un número del 1 al 5");
        Object c = datos.get("comentario");
        String comentario = c == null ? "" : String.valueOf(c).trim();

        /* Se guarda cada calificación y el cliente queda con el promedio aritmético de todas */
        Calificacion nueva = new Calificacion();
        nueva.setCliente(cliente);
        nueva.setEstrellas(estrellas);
        nueva.setComentario(comentario);
        nueva.setFecha(LocalDate.now());
        calificaciones.save(nueva);

        List<Calificacion> todas = calificaciones.findByClienteId(cliente.getId());
        double promedio = todas.stream().mapToInt(Calificacion::getEstrellas).average().orElse(estrellas);
        cliente.setPromedio(Math.round(promedio * 100.0) / 100.0);
        cliente.setCantidadCalificaciones(todas.size());
        /* Redondeo al entero más cercano para dibujar las estrellas (3.67 → 4); siempre entre 1 y 5 */
        cliente.setCalificacion((int) Math.min(5, Math.max(1, Math.round(promedio))));
        cliente.setComentario(comentario);
        cliente.setFechaCalificacion(LocalDate.now());
        return repo.save(cliente);
    }

    @DeleteMapping("eliminar/{id}")
    public Map<String, String> eliminarCliente(@PathVariable Long id) {
        repo.deleteById(id);
        return Map.of("mensaje", "CLIENTE ELIMINADO");
    }
}
