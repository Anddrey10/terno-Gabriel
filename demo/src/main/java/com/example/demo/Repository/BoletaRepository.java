package com.example.demo.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.demo.Model.Boleta;

public interface BoletaRepository extends JpaRepository<Boleta, Long> {
}
