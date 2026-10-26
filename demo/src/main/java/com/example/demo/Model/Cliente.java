package com.example.demo.Model;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class Cliente extends Base {

    @NotBlank(message = "Los nombres son obligatorios")
    @Size(max = 60, message = "Los nombres no deben superar 60 caracteres")
    private String nombres;

    @NotBlank(message = "Los apellidos son obligatorios")
    @Size(max = 80, message = "Los apellidos no deben superar 80 caracteres")
    private String apellidos;

    @NotBlank(message = "El DNI es obligatorio")
    @Pattern(regexp = "\\d{8}", message = "El DNI debe tener 8 dígitos")
    @Column(unique = true)
    private String dni;

    @NotBlank(message = "El celular es obligatorio")
    @Pattern(regexp = "9\\d{8}", message = "El celular debe tener 9 dígitos y empezar con 9")
    private String celular;

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "El correo no tiene un formato válido")
    private String correo;

    @NotBlank(message = "La dirección es obligatoria")
    private String direccion;

    private String distrito;

    private String departamento;

    private String referencia;

    private java.time.LocalDate registro = java.time.LocalDate.now();

    @Min(value = 1, message = "La calificación mínima es 1")
    @Max(value = 5, message = "La calificación máxima es 5")
    private Integer calificacion;

    private String comentario;

    /* Promedio exacto de todas las calificaciones recibidas (la columna "calificacion" guarda el redondeo) */
    private Double promedio;

    private Integer cantidadCalificaciones;

    /* Fecha en que el empleado registró la última calificación */
    private java.time.LocalDate fechaCalificacion;

    /* El administrador puede bloquear el alquiler a clientes con mala calificación */
    private boolean alquilerBloqueado = false;

    @OneToMany(mappedBy = "cliente")
    @JsonIgnore
    private List<Boleta> boletas;

    @OneToMany(mappedBy = "cliente")
    @JsonIgnore
    private List<Penalidad> penalidades;
}
