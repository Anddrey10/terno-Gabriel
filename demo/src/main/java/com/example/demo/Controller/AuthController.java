package com.example.demo.Controller;

import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.demo.Model.Empleado;
import com.example.demo.Repository.EmpleadoRepository;

@RestController
@RequestMapping("/api")
public class AuthController {

    @Autowired
    private EmpleadoRepository empleados;

    /* Inicio de sesión contra la tabla empleado (contraseña en texto plano: solo para el prototipo) */
    @PostMapping("login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> datos) {
        return empleados.findAll().stream()
            .filter(e -> e.getUsuario().equals(datos.get("usuario"))
                      && e.getContrasena().equals(datos.get("contrasena"))
                      && "Activo".equals(e.getEstado()))
            .findFirst()
            .<ResponseEntity<?>>map(e -> ResponseEntity.ok(Map.of("nombre", e.getNombre(), "rol", e.getRol())))
            .orElse(ResponseEntity.status(401).body(Map.of("mensaje", "Usuario o contraseña incorrectos. Por favor, verifique sus datos.")));
    }
}
