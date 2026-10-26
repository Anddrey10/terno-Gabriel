package com.example.demo.Model;

import java.time.LocalDateTime;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.Setter;

/* Valores que define el administrador y usa el empleado (por ejemplo, el monto de las penalizaciones) */
@Entity
@Getter
@Setter
public class Configuracion extends Base {

    @Column(unique = true)
    private String clave;

    private Double valor;

    private String modificadoPor;

    private LocalDateTime modificado = LocalDateTime.now();
}
