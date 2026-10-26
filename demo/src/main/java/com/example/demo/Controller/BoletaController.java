package com.example.demo.Controller;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import com.example.demo.Model.Boleta;
import java.time.LocalDate;
import com.example.demo.Model.Cliente;
import com.example.demo.Model.Confeccion;
import com.example.demo.Model.Prenda;
import com.example.demo.Repository.BoletaRepository;
import com.example.demo.Repository.ClienteRepository;
import com.example.demo.Repository.ConfeccionRepository;
import com.example.demo.Repository.PrendaRepository;

@RestController
@RequestMapping("/api/boletas")
public class BoletaController {

    @Autowired
    private BoletaRepository repo;

    @Autowired
    private PrendaRepository prendas;

    @Autowired
    private ClienteRepository clientes;

    @Autowired
    private ConfeccionRepository confecciones;

    @GetMapping
    public List<Boleta> traerBoletas() {
        return repo.findAll();
    }

    /* Al generar la boleta: el monto sale del precio que definió el administrador en la prenda,
       se genera el número y cambia el estado de la prenda */
    @PostMapping("nuevo")
    @Transactional
    public Boleta guardarBoleta(@Valid @RequestBody Boleta nueva) {
        nueva.setId(null);
        nueva.setMotivoAnulacion(null);
        nueva.setEstado("Vigente");
        if (nueva.getFechaDevolucion() != null && nueva.getFechaDevolucion().isBefore(LocalDate.now()))
            throw new IllegalArgumentException("La fecha de devolución no puede ser pasada");

        /* Boleta de confección: se entrega la orden y se cobra el saldo; el cliente viene del ticket */
        if ("Confección".equals(nueva.getTipo())) {
            if (nueva.getConfeccion() == null || nueva.getConfeccion().getId() == null)
                throw new IllegalArgumentException("Debe indicar la orden de confección");
            Confeccion orden = confecciones.findById(nueva.getConfeccion().getId())
                .orElseThrow(() -> new IllegalArgumentException("La orden de confección no existe"));
            if (!"En confección".equals(orden.getEstado()))
                throw new IllegalArgumentException("La orden ya fue entregada");
            nueva.setCliente(orden.getCliente());
            nueva.setConfeccion(orden);
            nueva.setPrenda(null);
            /* Si el ticket ya se pagó completo no hay nada que cobrar: la boleta conserva la forma de pago elegida al
               generar el ticket. Si no llega forma de pago, se usa la del ticket (o Efectivo si es un ticket antiguo). */
            boolean pagadoCompleto = orden.getAdelanto() != null && orden.getAdelanto() + 0.005 >= orden.getCostoTotal();
            if (pagadoCompleto || nueva.getMetodoPago() == null || nueva.getMetodoPago().isBlank())
                nueva.setMetodoPago(orden.getMetodoPago() == null || orden.getMetodoPago().isBlank() ? "Efectivo" : orden.getMetodoPago());
            /* La boleta registra el costo total de la confección (adelanto + saldo), así los informes
               suman el ingreso real una sola vez; el ticket no cuenta como ingreso */
            nueva.setMonto(orden.getCostoTotal());
            Boleta emitida = repo.save(nueva);
            emitida.setNumero(String.format("B001-%04d", emitida.getId()));
            emitida = repo.save(emitida);
            orden.setEstado("Entregada");
            orden.setBoleta(emitida.getNumero());
            confecciones.save(orden);
            return emitida;
        }

        if (nueva.getPrenda() == null || nueva.getPrenda().getId() == null)
            throw new IllegalArgumentException("Debe seleccionar una prenda");
        Prenda prenda = prendas.findById(nueva.getPrenda().getId())
            .orElseThrow(() -> new IllegalArgumentException("La prenda no existe"));
        Cliente cliente = clientes.findById(nueva.getCliente().getId())
            .orElseThrow(() -> new IllegalArgumentException("El cliente no existe"));
        if ("Alquiler".equals(nueva.getTipo()) && nueva.getFechaDevolucion() == null)
            throw new IllegalArgumentException("Debe indicar la fecha de devolución del alquiler");
        if (!"Alquiler".equals(nueva.getTipo())) nueva.setFechaDevolucion(null);
        if (prenda.isSuspendida())
            throw new IllegalArgumentException("La prenda está suspendida");
        if (!"Disponible".equals(prenda.getEstado()))
            throw new IllegalArgumentException("La prenda no está disponible");
        if ("Alquiler".equals(nueva.getTipo()) && cliente.isAlquilerBloqueado())
            throw new IllegalArgumentException("El cliente tiene el alquiler bloqueado");

        nueva.setCliente(cliente);
        nueva.setPrenda(prenda);
        nueva.setMonto("Venta".equals(nueva.getTipo()) ? prenda.getPrecioVenta() : prenda.getPrecioAlquiler());

        if ("Alquiler".equals(nueva.getTipo())) prenda.setEstado("Alquilado");
        if ("Reserva".equals(nueva.getTipo())) prenda.setEstado("Reservado");
        if ("Venta".equals(nueva.getTipo())) prenda.setEstado("Vendido");
        prendas.save(prenda);

        Boleta guardada = repo.save(nueva);
        guardada.setNumero(String.format("B001-%04d", guardada.getId()));
        return repo.save(guardada);
    }

    /* Devolución: la boleta de alquiler se cierra y la prenda vuelve al inventario */
    @PutMapping("devolver/{id}")
    @Transactional
    public Boleta devolverBoleta(@PathVariable Long id,
                                 @RequestParam(defaultValue = "En lavandería") String estadoPrenda) {
        Boleta boleta = repo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("La boleta no existe"));
        if (!"Alquiler".equals(boleta.getTipo()) || !"Vigente".equals(boleta.getEstado()))
            throw new IllegalArgumentException("Esta boleta no tiene una devolución pendiente");
        /* Devolución normal → Lavandería; devolución con daños → Restauración */
        if (!List.of("En lavandería", "En restauración").contains(estadoPrenda))
            throw new IllegalArgumentException("Estado de prenda no válido para una devolución");
        boleta.setEstado("Devuelta");
        boleta.getPrenda().setEstado(estadoPrenda);
        prendas.save(boleta.getPrenda());
        return repo.save(boleta);
    }

    @PutMapping("anular/{id}")
    @Transactional
    public Boleta anularBoleta(@PathVariable Long id, @RequestParam String motivo) {
        if (motivo == null || motivo.isBlank()) throw new IllegalArgumentException("El motivo de anulación es obligatorio");
        Boleta boleta = repo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("La boleta no existe"));
        if ("Anulada".equals(boleta.getEstado()))
            throw new IllegalArgumentException("La boleta ya fue anulada");
        if (!List.of("Alquiler", "Venta").contains(boleta.getTipo()) || !"Vigente".equals(boleta.getEstado()))
            throw new IllegalArgumentException("Solo se pueden anular boletas vigentes de alquiler o compra/venta. Las reservas, confecciones y operaciones cerradas no se pueden anular desde esta pantalla.");
        /* La prenda solo se libera si esta boleta todavía la tiene (una boleta ya devuelta no debe liberar
           una prenda que ahora está alquilada a otro cliente) */
        boolean tieneLaPrenda = "Vigente".equals(boleta.getEstado());
        boleta.setEstado("Anulada");
        boleta.setMotivoAnulacion(motivo.trim());
        if (boleta.getPrenda() != null && tieneLaPrenda) {
            boleta.getPrenda().setEstado("Disponible");
            prendas.save(boleta.getPrenda());
        }
        /* Si era la entrega de una confección, la orden vuelve a estar en confección */
        if (boleta.getConfeccion() != null) {
            boleta.getConfeccion().setEstado("En confección");
            boleta.getConfeccion().setBoleta(null);
            confecciones.save(boleta.getConfeccion());
        }
        return repo.save(boleta);
    }

    @PutMapping("actualizar/{id}")
    public Boleta editarBoleta(@PathVariable Long id, @Valid @RequestBody Boleta datos) {
        repo.findById(id).orElseThrow();
        datos.setId(id);
        return repo.save(datos);
    }

    @DeleteMapping("eliminar/{id}")
    public Map<String, String> eliminarBoleta(@PathVariable Long id) {
        repo.deleteById(id);
        return Map.of("mensaje", "BOLETA ELIMINADO");
    }
}
