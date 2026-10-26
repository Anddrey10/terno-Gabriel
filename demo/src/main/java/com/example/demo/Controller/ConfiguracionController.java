package com.example.demo.Controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.example.demo.Model.Configuracion;
import com.example.demo.Repository.ConfiguracionRepository;

@RestController
@RequestMapping("/api/configuracion")
public class ConfiguracionController {

    @Autowired
    private ConfiguracionRepository repo;

    @GetMapping
    public List<Configuracion> traerConfiguracion() {
        return repo.findAll();
    }

    /* El administrador cambia un valor (penalidadDemora, penalidadMalEstado) y el empleado lo usa al registrar devoluciones */
    @PutMapping("{clave}")
    public Configuracion cambiar(@PathVariable String clave, @RequestBody Map<String, Object> datos) {
        Configuracion c = repo.findByClave(clave)
            .orElseThrow(() -> new IllegalArgumentException("No existe la configuración " + clave));
        double valor;
        try {
            valor = Double.parseDouble(String.valueOf(datos.get("valor")));
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("El monto debe ser un número");
        }
        if (valor <= 0) throw new IllegalArgumentException("El monto debe ser mayor a 0");
        c.setValor(valor);
        c.setModificadoPor(String.valueOf(datos.getOrDefault("modificadoPor", "Administrador")));
        c.setModificado(LocalDateTime.now());
        return repo.save(c);
    }
}
