package com.example.demo.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.demo.Model.Confeccion;

public interface ConfeccionRepository extends JpaRepository<Confeccion, Long> {
}
