package com.example.demo.Controller;

import java.time.LocalDate;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import com.example.demo.Model.Cliente;
import com.example.demo.Model.Confeccion;
import com.example.demo.Repository.ClienteRepository;
import com.example.demo.Repository.ConfeccionRepository;

@RestController
@RequestMapping("/api/confecciones")
public class ConfeccionController {

    @Autowired
    private ConfeccionRepository repo;

    @Autowired
    private ClienteRepository clientes;

    @GetMapping
    public List<Confeccion> traerConfecciones() {
        return repo.findAll();
    }

    /* Registrar la orden emite el TICKET (T001-0001) */
    @PostMapping("nuevo")
    @Transactional
    public Confeccion guardarConfeccion(@Valid @RequestBody Confeccion nueva) {
        if (nueva.getCliente() == null || nueva.getCliente().getId() == null)
            throw new IllegalArgumentException("Debe seleccionar un cliente");
        nueva.setId(null);
        Cliente cliente = clientes.findById(nueva.getCliente().getId())
            .orElseThrow(() -> new IllegalArgumentException("El cliente no existe"));
        // Fechas predeterminadas desde la creación del ticket si el formulario no las envía.
        LocalDate fechaCreacion = nueva.getFecha() != null ? nueva.getFecha() : LocalDate.now();
        nueva.setFecha(fechaCreacion);
        if (nueva.getPrimeraPrueba() == null)
            nueva.setPrimeraPrueba(fechaCreacion.plusDays(5));
        if (nueva.getEntregaFinal() == null)
            nueva.setEntregaFinal(fechaCreacion.plusDays(10));
        if (nueva.getDetalle() == null || nueva.getDetalle().isBlank() || !nueva.getDetalle().contains("\"medidas\""))
            throw new IllegalArgumentException("La ficha de medidas es obligatoria");
        if (nueva.getEntregaFinal().isBefore(LocalDate.now()))
            throw new IllegalArgumentException("La fecha de entrega no puede ser anterior a hoy");
        if (nueva.getPrimeraPrueba() != null && nueva.getPrimeraPrueba().isBefore(LocalDate.now()))
            throw new IllegalArgumentException("La fecha de la primera prueba no puede ser anterior a hoy");
        if (nueva.getPrimeraPrueba() != null && nueva.getEntregaFinal().isBefore(nueva.getPrimeraPrueba()))
            throw new IllegalArgumentException("La entrega final no puede ser anterior a la primera prueba");
        if (nueva.getAdelanto() > nueva.getCostoTotal())
            throw new IllegalArgumentException("El adelanto no puede superar el costo total");
        // Compatibilidad con la tabla existente: color es NOT NULL. Si el frontend no
        // manda el campo separado, se deriva del detalle JSON enviado por la ficha.
        if (nueva.getColor() == null || nueva.getColor().isBlank() || "No especificado".equals(nueva.getColor())) {
            String colorDerivado = extraerColor(nueva.getDetalle());
            nueva.setColor(colorDerivado.isBlank() ? "No especificado" : colorDerivado);
        }
        nueva.setCliente(cliente);
        // La BD existente exige ambas columnas: entregaFinal y fechaEntrega.
        nueva.setFechaEntrega(nueva.getEntregaFinal());
        nueva.setEstado("En confección");
        nueva.setBoleta(null);
        Confeccion guardada = repo.save(nueva);
        guardada.setTicket(String.format("T001-%04d", guardada.getId()));
        return repo.save(guardada);
    }
    private String extraerColor(String detalle) {
        if (detalle == null || detalle.isBlank()) return "";
        // Los selectores de colores están guardados como saco/pantalon/chaleco/camisa/corbata.
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("\"(?:saco|pantalon|chaleco|camisa|corbata)\"\\s*:\\s*\"([^\"]+)\"");
        java.util.regex.Matcher m = p.matcher(detalle);
        java.util.LinkedHashSet<String> colores = new java.util.LinkedHashSet<>();
        while (m.find()) {
            String valor = m.group(1).trim();
            if (!valor.isEmpty() && !"Seleccione".equalsIgnoreCase(valor) && !"--Seleccione--".equalsIgnoreCase(valor)) colores.add(valor);
        }
        return String.join(" / ", colores);
    }
}
