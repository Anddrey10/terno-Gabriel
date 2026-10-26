// Clientes (administrador): ve los clientes que registran los empleados, con su calificación y estado.
document.addEventListener("DOMContentLoaded", () => TG.listo(async () => {
  const tbody = document.querySelector(".data-table tbody");
  const searchInput = document.querySelector("[data-table-search]");
  const kpis = [...document.querySelectorAll(".kpi-copy strong")];

  const filtrar = () => {
    const q = (searchInput?.value || "").toLowerCase().trim();
    tbody.querySelectorAll("tr").forEach(row => { row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none"; });
  };
  searchInput?.addEventListener("input", filtrar);

  const pintar = async () => {
    const [clientes, boletas, penalidades] = await Promise.all([TG.clientes(), TG.boletas(), TG.penalidades()]);
    const mes = TG.hoyISO().slice(0, 7);
    const conAlquiler = new Set(boletas.filter(b => b.tipo === "Alquiler" && b.estado === "Vigente").map(b => b.cliente.id));
    const conPenal = new Set(penalidades.filter(p => p.estado === "Pendiente").map(p => p.cliente.id));
    if (kpis.length >= 4) {
      kpis[0].textContent = clientes.filter(c => !TG.clienteEliminado(c, boletas)).length;
      kpis[1].textContent = clientes.filter(c => (c.registro || "").startsWith(mes)).length;
      kpis[2].textContent = conAlquiler.size;
      kpis[3].textContent = conPenal.size;
    }
    /* Mismo registro de clientes que ve el empleado (los clientes eliminados no se muestran) */
    const lista = clientes.filter(c => !TG.clienteEliminado(c, boletas)).sort((a, b) => b.id - a.id);
    tbody.innerHTML = lista.length ? lista.map(c => {
      const estado = TG.estadoCliente(c, penalidades);
      return "<tr><td>" + TG.esc(c.dni) + "</td><td>" + TG.esc(TG.nombre(c)) + "</td><td>" + TG.esc([c.direccion, c.distrito].filter(Boolean).join(", ")) +
        "</td><td>" + TG.esc(TG.telefono(c)) + "</td><td>" + TG.esc(c.correo || "—") + "</td><td>" + TG.ultimaOperacion(c, boletas) +
        "</td><td>" + TG.estrellas(c.calificacion, c.promedio) + '</td><td><span class="status-badge ' + (estado === "Activo" ? "active" : "debt") + '"><span class="dot"></span> ' + estado + "</span></td></tr>";
    }).join("") : '<tr><td colspan="8" style="text-align:center;color:#667085;padding:20px;">Aún no hay clientes registrados.</td></tr>';
    filtrar();
  };

  /* El administrador también puede registrar clientes */
  document.querySelector('.filter-row .btn.primary')?.addEventListener("click", () => {
    TG.modal({
      titulo: "Nuevo cliente", subtitulo: "Queda registrado para todos los empleados.", textoOk: "Guardar cliente",
      campos: [
        { name: "dni", label: "DNI", placeholder: "Ej. 73482916", regla: "dni" }, { name: "nombres", label: "Nombres", placeholder: "Ej. Luis Alberto", regla: "nombre" }, { name: "apellidos", label: "Apellidos", placeholder: "Ej. Salazar Vega", regla: "nombre" },
        { name: "direccion", label: "Dirección", placeholder: "Ej. Av. Larco 123, Trujillo", regla: "direccion" }, { name: "celular", label: "Teléfono", placeholder: "Ej. 987654321", regla: "celular" }, { name: "correo", label: "Correo", placeholder: "Ej. nombre@gmail.com", regla: "correo" }
      ],
      onOk: async v => {
        await TG.post("/api/clientes/nuevo", { dni: v.dni, nombres: v.nombres, apellidos: v.apellidos, direccion: v.direccion, celular: v.celular.replace(/\s+/g, ""), correo: v.correo });
        TG.toast("Cliente guardado correctamente");
        await pintar();
      }
    });
  });

  try { await pintar(); } catch (err) { TG.toast(err.message); }
  setInterval(() => { if (!document.hidden) pintar().catch(() => {}); }, 10000);
}));
