package com.example.demo.Controller;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import com.example.demo.Model.Penalidad;
import com.example.demo.Repository.PenalidadRepository;

@RestController
@RequestMapping("/api/penalidades")
public class PenalidadController {

    @Autowired
    private PenalidadRepository repo;

    @GetMapping
    public List<Penalidad> traerPenalidads() {
        return repo.findAll();
    }

    @PostMapping("nuevo")
    public Penalidad guardarPenalidad(@Valid @RequestBody Penalidad nuevo) {
        return repo.save(nuevo);
    }

    @PutMapping("actualizar/{id}")
    public Penalidad editarPenalidad(@PathVariable Long id, @Valid @RequestBody Penalidad datos) {
        repo.findById(id).orElseThrow();
        datos.setId(id);
        return repo.save(datos);
    }

    @DeleteMapping("eliminar/{id}")
    public Map<String, String> eliminarPenalidad(@PathVariable Long id) {
        repo.deleteById(id);
        return Map.of("mensaje", "PENALIDAD ELIMINADO");
    }
}
