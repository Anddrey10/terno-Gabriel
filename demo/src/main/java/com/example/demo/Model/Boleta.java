package com.example.demo.Model;

import java.time.LocalDate;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class Boleta extends Base {

    @Column(unique = true)
    private String numero;

    @NotBlank(message = "El tipo de operación es obligatorio")
    @Pattern(regexp = "Venta|Alquiler|Reserva|Confección", message = "El tipo debe ser Venta, Alquiler, Reserva o Confección")
    private String tipo;

    /* Muchas boletas pertenecen a un cliente */
    @NotNull(message = "Debe seleccionar un cliente")
    @ManyToOne
    @JoinColumn(name = "idCliente")
    private Cliente cliente;

    /* Muchas boletas pueden referirse a una misma prenda (en distintas fechas); la boleta de confección no tiene prenda */
    @ManyToOne
    @JoinColumn(name = "idPrenda")
    private Prenda prenda;

    private LocalDate fecha = LocalDate.now();

    /* La fecha no puede ser pasada al crear la boleta (se valida en el controlador, no aquí, para poder devolver con retraso) */
    private LocalDate fechaDevolucion;

    @NotNull(message = "El monto es obligatorio")
    @Positive(message = "El monto debe ser mayor a 0")
    private Double monto;

    private String estado = "Vigente";

    /* Empleado que emitió la boleta */
    private String empleado;

    private String metodoPago;

    /* Solo para boletas de confección: la orden (ticket) que se está entregando */
    @ManyToOne
    @JoinColumn(name = "idConfeccion")
    private Confeccion confeccion;

    private String motivoAnulacion;
}
