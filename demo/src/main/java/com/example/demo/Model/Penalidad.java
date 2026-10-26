package com.example.demo.Model;

import java.time.LocalDate;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class Penalidad extends Base {

    @NotNull(message = "Debe seleccionar un cliente")
    @ManyToOne
    @JoinColumn(name = "idCliente")
    private Cliente cliente;

    @NotBlank(message = "El tipo es obligatorio")
    @Pattern(regexp = "Demora|Mal estado|Ambos", message = "El tipo debe ser Demora, Mal estado o Ambos")
    private String tipo;

    @NotNull(message = "El monto es obligatorio")
    @Positive(message = "El monto debe ser mayor a 0")
    private Double monto;

    // Desglose para que el tablero pueda sumar demora y mal estado por separado.
    private Double montoDemora = 0.0;
    private Double montoMalEstado = 0.0;

    @Pattern(regexp = "Cobrado|Pendiente", message = "El estado debe ser Cobrado o Pendiente")
    private String estado = "Pendiente";

    private LocalDate fecha = LocalDate.now();
}
