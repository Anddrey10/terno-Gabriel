package com.example.demo.Model;

import java.time.LocalDate;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/* Cada vez que el empleado califica a un cliente al terminar una boleta se guarda un registro;
   la calificación del cliente es el promedio de todos sus registros */
@Entity
@Getter
@Setter
public class Calificacion extends Base {

    @ManyToOne
    @JoinColumn(name = "idCliente")
    private Cliente cliente;

    private int estrellas;

    private String comentario;

    private LocalDate fecha = LocalDate.now();
}
