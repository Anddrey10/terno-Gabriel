package com.example.demo.Controller;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import com.example.demo.Model.Prenda;
import com.example.demo.Repository.PrendaRepository;

@RestController
@RequestMapping("/api/prendas")
public class PrendaController {

    @Autowired
    private PrendaRepository repo;

    @GetMapping
    public List<Prenda> traerPrendas() {
        return repo.findAll();
    }

    /* Siguiente correlativo para un prefijo de 3 letras (TRN-005) */
    @GetMapping("siguiente-codigo")
    public Map<String, String> siguienteCodigo(@RequestParam String prefijo) {
        String pre = prefijo.toUpperCase();
        if (!pre.matches("[A-Z]{3}"))
            throw new IllegalArgumentException("El prefijo debe tener 3 letras");
        int max = repo.findAll().stream()
            .map(Prenda::getCodigo)
            .filter(c -> c != null && c.matches(pre + "-\\d+"))
            .mapToInt(c -> Integer.parseInt(c.substring(4)))
            .max().orElse(0);
        return Map.of("codigo", String.format("%s-%03d", pre, max + 1));
    }

    /* Una prenda nueva siempre entra como Disponible: después solo cambia con las boletas */
    @PostMapping("nuevo")
    public Prenda guardarPrenda(@Valid @RequestBody Prenda nuevo) {
        if (repo.findAll().stream().anyMatch(p -> p.getCodigo().equals(nuevo.getCodigo())))
            throw new IllegalArgumentException("Ya existe una prenda con ese código");
        validarCategoria(nuevo.getCategoria());
        nuevo.setEstado("Disponible");
        nuevo.setSuspendida(false);
        return repo.save(nuevo);
    }

    /* El administrador solo puede cambiar tipo, precios e imagen; categoría, estado y código quedan fijos */
    @PutMapping("actualizar/{id}")
    public Prenda editarPrenda(@PathVariable Long id, @Valid @RequestBody Prenda datos) {
        Prenda actual = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("La prenda no existe"));
        if ("Vendido".equals(actual.getEstado()))
            throw new IllegalArgumentException("Una prenda vendida es de solo consulta y no se puede editar");
        actual.setTipo(datos.getTipo());
        actual.setPrecioVenta(datos.getPrecioVenta());
        actual.setPrecioAlquiler(datos.getPrecioAlquiler());
        if (datos.getImagen() != null && !datos.getImagen().isBlank()) actual.setImagen(datos.getImagen());
        return repo.save(actual);
    }

    /* Cambio manual de estado: solo Restauración → Lavandería/Disponible y Lavandería → Disponible */
    @PutMapping("estado/{id}")
    public Prenda cambiarEstado(@PathVariable Long id, @RequestParam String estado) {
        Prenda p = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("La prenda no existe"));
        boolean permitido =
            ("En restauración".equals(p.getEstado()) && List.of("En lavandería", "Disponible").contains(estado)) ||
            ("En lavandería".equals(p.getEstado()) && "Disponible".equals(estado));
        if (!permitido)
            throw new IllegalArgumentException("El estado de esta prenda solo cambia con las boletas de alquiler y devolución");
        p.setEstado(estado);
        return repo.save(p);
    }

    @PutMapping("suspender/{id}")
    public Prenda suspender(@PathVariable Long id) {
        Prenda p = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("La prenda no existe"));
        if ("Vendido".equals(p.getEstado()))
            throw new IllegalArgumentException("Una prenda vendida no se puede suspender");
        if ("Alquilado".equals(p.getEstado()))
            throw new IllegalArgumentException("No se puede suspender una prenda que está alquilada");
        p.setSuspendida(true);
        return repo.save(p);
    }

    @PutMapping("reactivar/{id}")
    public Prenda reactivar(@PathVariable Long id) {
        Prenda p = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("La prenda no existe"));
        if ("Vendido".equals(p.getEstado()))
            throw new IllegalArgumentException("Una prenda vendida no se puede reactivar");
        p.setSuspendida(false);
        return repo.save(p);
    }

    @DeleteMapping("eliminar/{id}")
    public Map<String, String> eliminarPrenda(@PathVariable Long id) {
        repo.deleteById(id);
        return Map.of("mensaje", "PRENDA ELIMINADO");
    }

    private void validarCategoria(String categoria) {
        if (!List.of("Niños", "Jóvenes", "Adultos").contains(categoria))
            throw new IllegalArgumentException("Debe elegir una categoría: Niños, Jóvenes o Adultos");
    }
}
