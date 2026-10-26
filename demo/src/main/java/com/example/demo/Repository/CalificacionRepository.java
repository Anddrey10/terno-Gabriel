package com.example.demo.Repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.demo.Model.Calificacion;

public interface CalificacionRepository extends JpaRepository<Calificacion, Long> {
    List<Calificacion> findByClienteId(Long idCliente);
}
