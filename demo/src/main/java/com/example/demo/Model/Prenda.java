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
public class Prenda extends Base {

    /* Tres letras mayúsculas, guion y números: TRN-001 */
    @NotBlank(message = "El código es obligatorio")
    @Pattern(regexp = "[A-Z]{3}-\\d{3,}", message = "El código debe tener 3 letras, un guion y números (ej. TRN-001)")
    @Column(unique = true)
    private String codigo;

    @NotBlank(message = "El diseño es obligatorio")
    private String diseno;

    @NotBlank(message = "El tipo es obligatorio")
    @Pattern(regexp = "Nuevo|Seminuevo", message = "El tipo debe ser Nuevo o Seminuevo")
    private String tipo;

    @NotBlank(message = "La talla es obligatoria")
    private String talla;

    @NotBlank(message = "El estado es obligatorio")
    @Pattern(regexp = "Disponible|Alquilado|Reservado|Vendido|En confección|En lavandería|En restauración",
             message = "Estado de prenda no válido")
    private String estado = "Disponible";

    @NotNull(message = "El precio de venta es obligatorio")
    @Positive(message = "El precio de venta debe ser mayor a 0")
    private Double precioVenta;

    @NotNull(message = "El precio de alquiler es obligatorio")
    @Positive(message = "El precio de alquiler debe ser mayor a 0")
    private Double precioAlquiler;

    /* Atributos que usan los filtros del catálogo (los define el administrador) */
    private String color;

    /* Niños | Jóvenes | Adultos */
    private String categoria;

    private String estilo;

    private String componente;

    /* El administrador puede dar de baja una prenda sin borrarla: deja de verse en los catálogos */
    private boolean suspendida = false;

    /* Foto de la prenda (data URL reducida desde el navegador) */
    @Column(columnDefinition = "LONGTEXT")
    private String imagen;

    @OneToMany(mappedBy = "prenda")
    @JsonIgnore
    private List<Boleta> boletas;
}
