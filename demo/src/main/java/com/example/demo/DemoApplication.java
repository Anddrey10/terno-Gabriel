package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {

	public static void main(String[] args) {
		// Misma zona horaria que el navegador del usuario: evita que "hoy" cambie de día en el servidor
		java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("America/Lima"));
		SpringApplication.run(DemoApplication.class, args);
	}

}
