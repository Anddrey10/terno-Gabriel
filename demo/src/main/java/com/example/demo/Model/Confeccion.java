package com.example.demo.Model;

import java.time.LocalDate;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

/* Orden de confección: al registrarla se emite un TICKET (T001-0001); al entregarla y pagar el saldo se emite la BOLETA */
@Entity
@Getter
@Setter
public class Confeccion extends Base {

    @Column(unique = true)
    private String ticket;

    @NotNull(message = "Debe seleccionar un cliente")
    @ManyToOne
    @JoinColumn(name = "idCliente")
    private Cliente cliente;

    @NotNull(message = "El costo total es obligatorio")
    @Positive(message = "El costo total debe ser mayor a 0")
    private Double costoTotal;

    @NotNull(message = "El adelanto es obligatorio")
    @PositiveOrZero(message = "El adelanto no puede ser negativo")
    private Double adelanto;

    private LocalDate fecha = LocalDate.now();

    private LocalDate primeraPrueba;

    @NotNull(message = "La fecha de entrega final es obligatoria")
    private LocalDate entregaFinal;

    /* Compatibilidad con el esquema MySQL existente, que también exige fechaEntrega. */
    @Column(name = "fechaEntrega")
    private LocalDate fechaEntrega;

    /* En confección | Entregada */
    private String estado = "En confección";

    private String metodoPago;

    private String empleado;

    /* Color principal de la confección (el controlador siempre guarda un valor) */
    @Column(name = "color", length = 255)
    private String color = "No especificado";

    /* Diseño, telas, colores y medidas (JSON). TEXT para que nunca se corte, aunque la ficha sea larga */
    @Column(columnDefinition = "TEXT")
    private String detalle;

    /* Número de la boleta emitida al entregar */
    private String boleta;
}
