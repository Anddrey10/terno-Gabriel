package com.example.demo.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.demo.Model.Prenda;

public interface PrendaRepository extends JpaRepository<Prenda, Long> {
}
