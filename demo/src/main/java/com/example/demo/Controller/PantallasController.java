package com.example.demo.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PantallasController {
    @GetMapping({"/", "/login"}) public String login() { return "login"; }

    @GetMapping("/admin/inicio") public String adminInicio() { return "admin/inicio"; }
    @GetMapping("/admin/empleados") public String adminEmpleados() { return "admin/empleados"; }
    @GetMapping("/admin/costos") public String adminCostos() { return "admin/costos"; }
    @GetMapping("/admin/penalizaciones") public String adminPenalizaciones() { return "admin/penalizaciones"; }
    @GetMapping("/admin/clientes") public String adminClientes() { return "admin/clientes"; }
    @GetMapping("/admin/calificaciones") public String adminCalificaciones() { return "admin/calificaciones"; }
    @GetMapping("/admin/reportes") public String adminReportes() { return "admin/reportes"; }
    @GetMapping("/admin/prendas") public String adminPrendas() { return "admin/prendas"; }
    @GetMapping("/admin/catalogo") public String adminCatalogo() { return "admin/catalogo"; }
    @GetMapping("/admin/boletas") public String adminBoletas() { return "admin/boletas"; }

    @GetMapping("/empleado/inicio") public String empleadoInicio() { return "empleado/inicio"; }
    @GetMapping("/empleado/comprar-alquilar") public String comprarAlquilar() { return "empleado/comprar-alquilar"; }
    @GetMapping("/empleado/comprar-alquilar/paso-2") public String comprarAlquilarPaso2() { return "empleado/comprar-alquilar-paso-2"; }
    @GetMapping("/empleado/comprar-alquilar/paso-3") public String comprarAlquilarPaso3() { return "empleado/comprar-alquilar-paso-3"; }
    @GetMapping("/empleado/comprar-alquilar/paso-4") public String comprarAlquilarPaso4() { return "empleado/comprar-alquilar-paso-4"; }
    @GetMapping("/empleado/comprar-alquilar/paso-5") public String comprarAlquilarPaso5() { return "empleado/comprar-alquilar-paso-5"; }
    @GetMapping("/empleado/clientes") public String empleadoClientes() { return "empleado/clientes"; }
    @GetMapping("/empleado/confeccion") public String empleadoConfeccion() { return "empleado/confeccion"; }
    @GetMapping("/empleado/devolucion") public String empleadoDevolucion() { return "empleado/devolucion"; }
    @GetMapping("/empleado/anular-boleta") public String empleadoAnularBoleta() { return "empleado/anular-boleta"; }
    @GetMapping("/empleado/prendas") public String empleadoPrendas() { return "empleado/prendas"; }
    @GetMapping("/empleado/catalogo") public String empleadoCatalogo() { return "empleado/catalogo"; }
}
