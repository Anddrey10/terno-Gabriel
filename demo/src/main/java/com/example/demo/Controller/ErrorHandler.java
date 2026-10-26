package com.example.demo.Controller;

import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;
import org.springframework.dao.DataAccessException;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import jakarta.validation.ConstraintViolationException;

/* Devuelve siempre un mensaje legible ({"mensaje": ...}) en lugar de un 500 con todo el stack */
@RestControllerAdvice
public class ErrorHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> validacion(MethodArgumentNotValidException ex) {
        return ResponseEntity.badRequest().body(ex.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(f -> f.getField(), f -> f.getDefaultMessage(), (a, b) -> a)));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> regla(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("mensaje", ex.getMessage() == null ? "Solicitud no válida" : ex.getMessage()));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> noExiste(NoSuchElementException ex) {
        return ResponseEntity.status(404).body(Map.of("mensaje", "El registro solicitado no existe"));
    }

    /* Validaciones de las entidades al guardar (por ejemplo, un cliente antiguo sin correo) */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, String>> entidad(ConstraintViolationException ex) {
        String detalle = ex.getConstraintViolations().stream().map(v -> v.getMessage()).distinct().collect(Collectors.joining(". "));
        return ResponseEntity.badRequest().body(Map.of("mensaje", detalle));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> ilegible(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body(Map.of("mensaje", "Hay un dato con formato no válido (revisa fechas y montos)"));
    }

    /* La validación de la entidad puede fallar al confirmar la transacción */
    @ExceptionHandler(TransactionSystemException.class)
    public ResponseEntity<Map<String, String>> transaccion(TransactionSystemException ex) {
        Throwable t = ex.getMostSpecificCause();
        if (t instanceof ConstraintViolationException cv) return entidad(cv);
        return ResponseEntity.badRequest().body(Map.of("mensaje", "No se pudo guardar: " + (t == null ? "error de transacción" : t.getMessage())));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, String>> integridad(DataAccessException ex) {
        Throwable causa = ex.getMostSpecificCause();
        String texto = causa == null || causa.getMessage() == null ? "" : causa.getMessage();
        String mensaje = texto.contains("Duplicate entry") ? "Ya existe un registro con ese dato (código, DNI o usuario repetido)"
            : texto.contains("foreign key") ? "No se puede completar: el registro está relacionado con otros datos"
            : "No se pudo guardar: " + texto;
        return ResponseEntity.badRequest().body(Map.of("mensaje", mensaje));
    }
}
