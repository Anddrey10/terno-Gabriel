// Proceso de Comprar / Alquilar (5 pantallas). Los precios salen de la prenda (los define el admin),
// el cliente sale de la base de datos y al final se guarda la boleta.
(() => {
  const KEY = 'ternoCompraAlquiler';
  const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const save = data => sessionStorage.setItem(KEY, JSON.stringify({ ...read(), ...data }));
  const ruta = location.pathname;
  const esPaso1 = !/paso-\d/.test(ruta);
  const paso = esPaso1 ? 1 : Number(ruta.match(/paso-(\d)/)[1]);

  TG.listo(async () => {
    /* Al volver al paso 1 después de emitir una boleta, se empieza una operación nueva */
    if (esPaso1 && read().boletaId) sessionStorage.removeItem(KEY);
    /* Los pasos 2 a 5 necesitan haber elegido una prenda */
    if (paso > 1 && !read().prendaId) { location.replace('/empleado/comprar-alquilar'); return; }

    /* Cada pantalla restablece lo que pertenece a las pantallas siguientes (así, al dar Atrás y volver a continuar,
       todo vuelve a estar como al principio: términos sin marcar, pago en blanco, etc.) */
    const CLAVES = { 2: ['nombres', 'apellidos', 'telefono', 'direccion', 'correo', 'fechaRecojo', 'fechaDevolucion'], 3: ['aceptaTerminos'], 4: ['metodo', 'entregado', 'vuelto', 'total'], 5: ['boletaId'] };
    const limpiarDesde = n => { const s = read(); for (let p = n; p <= 5; p++) CLAVES[p].forEach(k => delete s[k]); sessionStorage.setItem(KEY, JSON.stringify(s)); };
    if (paso < 5) limpiarDesde(paso + 1);
    if (esPaso1) limpiarDesde(2);

    const state = read();
    const money = TG.money;
    const moneyCorto = n => 'S/ ' + Number(n).toLocaleString('es-PE', { maximumFractionDigits: 2 });

    /* ---- Campos del formulario que se conservan entre pasos ---- */
    const fields = [...document.querySelectorAll('[data-flow-field]')];
    fields.forEach(el => {
      if (el.type === 'checkbox') el.checked = Boolean(state[el.name]);
      else if (state[el.name] !== undefined) el.value = state[el.name];
      const persist = () => save({ [el.name]: el.type === 'checkbox' ? el.checked : el.value });
      el.addEventListener('change', persist); el.addEventListener('input', persist);
    });

    /* ---- Operación (Comprar / Alquilar) ---- */
    const opButtons = [...document.querySelectorAll('[data-operation]')];
    const pintarPestanas = op => opButtons.forEach(btn => {
      const activo = btn.dataset.operation === op;
      btn.classList.toggle('active', activo);
      btn.style.fontWeight = activo ? '600' : '500';
      btn.style.color = activo ? '#b3820a' : '#344054';
      btn.style.borderBottom = activo ? '3px solid #b3820a' : '3px solid transparent';
    });
    const operacion = () => read().operacion || 'Alquilar';
    let alCambiarOperacion = () => {};
    opButtons.forEach(b => b.addEventListener('click', () => {
      if (paso >= 3 || b.dataset.operation === operacion()) return;
      save({ operacion: b.dataset.operation }); pintarPestanas(b.dataset.operation);
      limpiarDesde(3);                      // lo que dependía de la operación anterior se restablece
      ajustarPasos(); alCambiarOperacion();
    }));
    pintarPestanas(operacion());
    if (!state.operacion) save({ operacion: 'Alquilar' });
    /* Desde el paso 3 ya no se puede cambiar entre Comprar y Alquilar */
    if (paso >= 3) opButtons.forEach(b => {
      b.disabled = true; b.style.pointerEvents = 'none'; b.style.cursor = 'not-allowed';
      if (b.dataset.operation !== operacion()) b.style.opacity = '.4';
    });

    /* Comprar no lleva términos: son 4 pasos (Terno, Datos, Pago, Boleta) */
    function ajustarPasos() {
      const compra = operacion() === 'Comprar';
      const items = [...document.querySelectorAll('.flow-stepper .step-item')], lineas = [...document.querySelectorAll('.flow-stepper .step-line')];
      if (items.length < 5) return;
      items[2].style.display = compra ? 'none' : ''; if (lineas[2]) lineas[2].style.display = compra ? 'none' : '';
      const visibles = items.filter(i => i.style.display !== 'none');
      visibles.forEach((it, i) => { const c = it.querySelector('.step-circle'); if (c && !c.classList.contains('step-completed')) c.textContent = String(i + 1); });
      const total = visibles.length, actual = compra && paso >= 4 ? paso - 1 : paso;
      [...document.querySelectorAll('main span, main p, main div')].filter(x => !x.children.length && /^\s*PASO \d DE \d\s*$/.test(x.textContent)).forEach(x => { x.textContent = 'PASO ' + actual + ' DE ' + total; });
      const st = document.querySelector('.flow-stepper'); if (st) st.setAttribute('aria-label', 'Paso ' + actual + ' de ' + total);
    }
    if (paso === 3 && operacion() === 'Comprar') { location.replace('/empleado/comprar-alquilar/paso-4'); return; }
    ajustarPasos();
    if (paso === 4 && operacion() === 'Comprar') { const atras = document.querySelector('a[href$="paso-3"]'); if (atras) atras.href = '/empleado/comprar-alquilar/paso-2'; }

    /* El precio sale de la prenda: venta si compra, alquiler si alquila */
    const precioFinal = () => { const s = read(); return operacion() === 'Comprar' ? Number(s.precioVenta) : Number(s.precioAlquiler); };

    /* =========================== PASO 1 =========================== */
    if (esPaso1) {
      const inputDni = document.querySelector('input[name="dni"]');
      const btnBuscar = document.querySelector('.search-input-group button');
      const fichaCliente = document.querySelector('.client-result-card');
      const grid = document.querySelector('.catalog-grid-cards');
      let condicion = 'all', prendas = [];
      const TEXTOS = { color: 'Todos los colores', categoria: 'Todas las edades', estilo: 'Todos los estilos', talla: 'Todas las tallas' };
      const selects = [...document.querySelectorAll('.advanced-filters-bar [data-filter]')];
      const checks = [...document.querySelectorAll('input[name="prendas_ind"]')];
      const NOMBRE_COMP = { saco: 'Saco', pantalon: 'Pantalón', chaleco: 'Chaleco', corbata: 'Corbata / Michi', camisa: 'Camisa' };
      selects.forEach(s => TG.llenarSelect(s, TG.OPCIONES[s.dataset.filter], TEXTOS[s.dataset.filter]));
      checks.forEach(c => { c.checked = false; });

      const pintarCliente = c => {
        if (!c) {
          fichaCliente.innerHTML = '<div class="client-detail-col"><span>Cliente</span><strong>Escribe el DNI y pulsa «Buscar Cliente».</strong></div>';
          return;
        }
        const puntuacion = Math.max(0, Math.min(5, Math.round(Number(c.calificacion) || 0)));
        const estrellas = '<span class="stars-filled">' + '★'.repeat(puntuacion) + '</span><span class="stars-empty">' + '☆'.repeat(5 - puntuacion) + '</span>';
        fichaCliente.innerHTML =
          '<div class="client-avatar-info"><div class="avatar-circle">' + TG.esc(TG.iniciales(TG.nombre(c))) + '</div><div><strong>' + TG.esc(TG.nombre(c)) + '</strong></div></div>' +
          '<div class="client-detail-col"><span>DNI</span><strong>' + TG.esc(c.dni) + '</strong></div>' +
          '<div class="client-detail-col"><span>Calificación</span><strong class="client-stars">' + (puntuacion ? estrellas : '<span class="stars-empty">☆☆☆☆☆</span>') + '</strong></div>' +
          '<div class="client-detail-col"><span>Dirección</span><strong>' + TG.esc([c.direccion, c.distrito].filter(Boolean).join(', ')) + '</strong></div>' +
          '<div class="client-detail-col"><span>Teléfono</span><strong>' + TG.esc(TG.telefono(c)) + '</strong></div>';
      };
      const noEncontrado = dni => {
        fichaCliente.innerHTML = '<div class="client-detail-col"><span>Cliente</span><strong>No hay un cliente con DNI ' + TG.esc(dni) +
          '. Podrás registrarlo en el siguiente paso.</strong></div>';
      };
      const buscarCliente = async () => {
        const dni = (inputDni.value || '').replace(/\D/g, '');
        if (dni.length !== 8) { TG.toast('El DNI debe tener 8 dígitos'); return; }
        try {
          const c = (await TG.clientes()).find(x => x.dni === dni);
          if (!c) { save({ clienteId: null, dni, nombres: '', apellidos: '', telefono: '', direccion: '', correo: '' }); noEncontrado(dni); return; }
          save({ clienteId: c.id, dni: c.dni, nombres: c.nombres, apellidos: c.apellidos, telefono: c.celular, direccion: c.direccion, correo: c.correo || '' });
          pintarCliente(c);
          if (c.alquilerBloqueado && operacion() === 'Alquilar') TG.toast('Este cliente tiene el alquiler bloqueado');
        } catch (err) { TG.toast(err.message); }
      };
      btnBuscar?.addEventListener('click', buscarCliente);
      inputDni?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); buscarCliente(); } });
      pintarCliente(null);
      if (state.clienteId) { try { pintarCliente((await TG.clientes()).find(x => x.id === state.clienteId) || null); } catch { /* sin conexión */ } }

      /* Catálogo: solo prendas Disponibles, con los precios vigentes del admin */
      const pintarCatalogo = () => {
        const sel = read().prendaId;
        const f = { componentes: checks.filter(c => c.checked).map(c => NOMBRE_COMP[c.value]) };
        selects.forEach(s => { f[s.dataset.filter] = s.value; });
        const lista = prendas.filter(p => (condicion === 'all' || p.tipo.toLowerCase() === condicion) && TG.pasaFiltros(p, f));
        grid.innerHTML = lista.length ? lista.map(p =>
          '<article class="catalog-item-card' + (p.id === sel ? ' selected' : '') + '" data-id="' + p.id + '">' +
          '<div class="catalog-thumb"><img src="' + TG.esc(p.imagen || (/smoking/i.test((p.diseno || '') + ' ' + (p.estilo || '')) ? 'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?auto=format&fit=crop&w=700&q=85' : 'https://images.unsplash.com/photo-1618886614638-80e3c103d31a?auto=format&fit=crop&w=700&q=85')) + '" alt="' + TG.esc(p.diseno) + '" loading="lazy"></div><div class="catalog-info"><strong>' + TG.esc(p.diseno) + '</strong>' +
          '<span>' + TG.esc(p.codigo) + ' · ' + TG.esc(p.tipo) + ' · Talla ' + TG.esc(p.talla) + '</span>' +
          '<span class="catalog-price">' + moneyCorto(p.precioVenta) + ' <small>· Alq. ' + moneyCorto(p.precioAlquiler) + '</small></span></div>' +
          (p.id === sel ? '<div class="check-badge">✓</div>' : '') + '</article>').join('')
          : '<p style="padding:16px;color:#667085;">No hay prendas disponibles con ese filtro.</p>';
      };
      try {
        prendas = (await TG.prendas()).filter(p => p.estado === 'Disponible' && !p.suspendida);
        if (state.prendaId && !prendas.some(p => p.id === state.prendaId)) save({ prendaId: null, prenda: '' });
        pintarCatalogo();
      } catch (err) { grid.innerHTML = '<p style="padding:16px;color:#b42318;">' + TG.esc(err.message) + '</p>'; }

      grid.addEventListener('click', e => {
        const card = e.target.closest('.catalog-item-card'); if (!card) return;
        const p = prendas.find(x => x.id === Number(card.dataset.id)); if (!p) return;
        save({ prendaId: p.id, prenda: TG.descripcionPrenda(p), prendaDiseno: p.diseno, codigoPrenda: p.codigo, precioVenta: p.precioVenta, precioAlquiler: p.precioAlquiler });
        pintarCatalogo();
      });
      document.querySelectorAll('.condition-btn').forEach(b => b.addEventListener('click', () => { condicion = b.dataset.condition; pintarCatalogo(); }));
      selects.forEach(s => s.addEventListener('change', pintarCatalogo));
      checks.forEach(c => c.addEventListener('change', pintarCatalogo));

      document.querySelector('a[href$="paso-2"]')?.addEventListener('click', e => {
        const s = read();
        if (!s.prendaId) { e.preventDefault(); alert('Selecciona una prenda del catálogo para continuar.'); }
      });
    }

    /* =========================== PASO 2 =========================== */
    if (paso === 2) {
      const f = n => document.querySelector('[name="' + n + '"]');
      const dni = f('dni'), nombres = f('nombres'), apellidos = f('apellidos'), tel = f('telefono'), dir = f('direccion'), correo = f('correo');
      const recojo = f('fechaRecojo'), devol = f('fechaDevolucion');
      const datos = [nombres, apellidos, tel, dir, correo];
      const hoy = TG.hoyISO();
      let existente = false;

      TG.vincular(dni, 'dni'); TG.vincular(nombres, 'nombre'); TG.vincular(apellidos, 'nombre');
      TG.vincular(tel, 'celular'); TG.vincular(dir, 'direccion'); TG.vincular(correo, 'correo');
      TG.vincular(recojo, 'fechaHoy');
      TG.vincular(devol, { ok: v => v >= hoy && v >= recojo.value, msg: 'Fecha inválida: no puede ser anterior a hoy ni a la fecha de recojo' }, { requerido: operacion() === 'Alquilar' });

      /* Fecha de recojo: hoy por defecto, editable, nunca anterior a hoy */
      if (!recojo.value || recojo.value < hoy) { recojo.value = hoy; save({ fechaRecojo: hoy }); }
      recojo.min = hoy; devol.min = recojo.value;
      alCambiarOperacion = () => {
        const alq = operacion() === 'Alquilar';
        devol.closest('label').style.display = alq ? '' : 'none';
        devol._tg.requerido = alq;
        if (!alq) { devol.value = ''; devol._tocado = false; TG.marcar(devol, null); save({ fechaDevolucion: '' }); }
      };
      alCambiarOperacion();
      recojo.addEventListener('change', () => { devol.min = recojo.value > hoy ? recojo.value : hoy; if (devol.value) { devol._tocado = true; TG.validarCampo(devol); } });

      const bloquear = b => datos.forEach(el => { el.readOnly = b; el.style.background = b ? '#f2f4f7' : ''; });
      const guardarDatos = () => save({ nombres: nombres.value, apellidos: apellidos.value, telefono: tel.value, direccion: dir.value, correo: correo.value });
      const vaciar = () => { datos.forEach(el => { el.value = ''; el._tocado = false; TG.marcar(el, null); }); guardarDatos(); };

      /* Búsqueda automática: apenas hay 8 dígitos se busca; sin botón */
      const buscarAuto = async avisar => {
        const d = dni.value;
        if (d.length !== 8) { save({ clienteId: null }); if (existente) { existente = false; bloquear(false); vaciar(); } return; }
        const c = (await TG.clientes()).find(x => x.dni === d);
        if (c) {
          existente = true;
          nombres.value = c.nombres; apellidos.value = c.apellidos; tel.value = c.celular; dir.value = c.direccion; correo.value = c.correo || '';
          datos.forEach(el => TG.marcar(el, null)); bloquear(true);
          save({ clienteId: c.id, dni: c.dni }); guardarDatos();
          if (c.alquilerBloqueado && operacion() === 'Alquilar') TG.toast('Este cliente tiene el alquiler bloqueado');
        } else {
          if (existente) vaciar();
          existente = false; bloquear(false); save({ clienteId: null, dni: d });
          if (avisar) TG.toast('Cliente nuevo: completa sus datos');
        }
      };
      dni.addEventListener('input', () => buscarAuto(true).catch(err => TG.toast(err.message)));
      datos.forEach(el => el.addEventListener('input', () => { if (!existente) guardarDatos(); }));
      if (dni.value.length === 8) buscarAuto(false).catch(() => {});

      document.querySelector('a[href$="paso-3"]')?.addEventListener('click', e => {
        e.preventDefault();
        const alquiler = operacion() === 'Alquilar';
        const campos = [dni, ...datos, recojo].concat(alquiler ? [devol] : []);
        if (!TG.validarTodo(campos)) return;
        /* El cliente nuevo NO se registra todavía: se registra cuando se completa la boleta */
        guardarDatos(); save({ dni: dni.value });
        location.href = alquiler ? '/empleado/comprar-alquilar/paso-3' : '/empleado/comprar-alquilar/paso-4';
      });
    }

    /* =========================== PASO 3 =========================== */
    const terms = document.getElementById('aceptaTerminos');
    const continueTerms = document.getElementById('continueTerms');
    const updateTerms = () => { if (!terms || !continueTerms) return; continueTerms.setAttribute('aria-disabled', String(!terms.checked)); continueTerms.classList.toggle('is-disabled', !terms.checked); };
    if (terms) {
      terms.addEventListener('change', () => { save({ aceptaTerminos: terms.checked }); updateTerms(); });
      updateTerms();
      continueTerms?.addEventListener('click', e => { if (!terms.checked) { e.preventDefault(); alert('Debes aceptar los términos para continuar.'); } });
    }

    /* =========================== PASO 4 =========================== */
    const metodosBtns = document.querySelectorAll('.metodo-btn');
    const campoTercero = document.getElementById('campoDinamicoTercero');
    const pagoGrid = document.getElementById('pagoGridContainer');
    const yapeBox = document.getElementById('yapeAdminContainer');
    const inputEntregado = document.getElementById('pagoEntregado');
    const totalInput = document.getElementById('pagoTotalCobrar');
    const inputTercero = document.getElementById('inputTercerCampo');
    const labelTercero = document.getElementById('labelTercerCampo');

    if (paso === 4 && totalInput) {
      const total = precioFinal();
      save({ total });
      totalInput.value = money(total);
      const titulo = document.querySelector('.section-title h2');
      if (titulo && operacion() === 'Comprar') titulo.textContent = 'Pago de la compra';
      const subtitulo = document.querySelector('.finanzas-header h3');
      if (subtitulo && operacion() === 'Comprar') subtitulo.textContent = 'Método y pago de compra';
      const entregadoPrevio = read().entregado;
      inputEntregado.value = entregadoPrevio !== undefined && entregadoPrevio !== '' ? Number(entregadoPrevio).toFixed(2) : '0.00';

      const recalcular = () => {
        const entregado = Number(inputEntregado.value) || 0;
        const vuelto = Math.max(0, entregado - total);
        if (inputTercero) inputTercero.value = money(vuelto);
        save({ total, entregado: inputEntregado.value, vuelto });
      };
      inputEntregado.addEventListener('focus', function () { this.select(); });
      inputEntregado.addEventListener('input', recalcular);
      inputEntregado.addEventListener('blur', function () { const v = Number(this.value); this.value = isNaN(v) ? '0.00' : v.toFixed(2); recalcular(); });

      const elegirMetodo = m => {
        metodosBtns.forEach(b => b.classList.toggle('active', b.dataset.metodo === m));
        if (m === 'Efectivo') {
          pagoGrid?.classList.remove('transferencia-layout');
          if (campoTercero) campoTercero.style.display = 'block';
          if (labelTercero) labelTercero.textContent = 'Vuelto automático';
          if (yapeBox) yapeBox.style.display = 'none';
        } else {
          pagoGrid?.classList.add('transferencia-layout');
          if (campoTercero) campoTercero.style.display = 'none';
          if (yapeBox) yapeBox.style.display = m === 'Yape' ? 'block' : 'none';
          inputEntregado.value = total.toFixed(2);
        }
        save({ metodo: m }); recalcular();
      };
      metodosBtns.forEach(b => b.addEventListener('click', () => elegirMetodo(b.dataset.metodo)));
      elegirMetodo(read().metodo || 'Efectivo');

      TG.vincular(inputEntregado, { ok: v => Number(v) >= total, msg: 'Monto inválido: no cubre el total a cobrar (' + money(total) + ')' });
      document.querySelector('a[href$="paso-5"]')?.addEventListener('click', e => {
        if (!TG.validarTodo([inputEntregado])) e.preventDefault();
      });
    }

    /* =========================== PASO 5: BOLETA =========================== */
    if (paso === 5) {
      const esAlquiler = operacion() === 'Alquilar';
      const u = TG.usuario();
      let boleta = null, config = {};
      try {
        config = await TG.configuracion();
        let s = read();
        if (s.boletaId) boleta = (await TG.boletas()).find(b => b.id === s.boletaId) || null;
        if (!boleta) {
          if (!s.clienteId) {
            /* Cliente nuevo: se registra ahora que la boleta se completa */
            const nuevo = await TG.post('/api/clientes/nuevo', { dni: s.dni, nombres: (s.nombres || '').trim(), apellidos: (s.apellidos || '').trim(), celular: s.telefono, direccion: (s.direccion || '').trim(), correo: (s.correo || '').trim() });
            save({ clienteId: nuevo.id }); s = read();
          }
          boleta = await TG.post('/api/boletas/nuevo', {
            tipo: esAlquiler ? 'Alquiler' : 'Venta',
            cliente: { id: s.clienteId },
            prenda: { id: s.prendaId },
            fechaDevolucion: esAlquiler ? s.fechaDevolucion : null,
            monto: precioFinal(),
            empleado: u ? u.nombre : '',
            metodoPago: s.metodo || 'Efectivo'
          });
          save({ boletaId: boleta.id });
          TG.toast('Boleta ' + boleta.numero + ' registrada');
        }
      } catch (err) {
        const tarjeta = document.querySelector('.flow-card');
        tarjeta.innerHTML = '<div style="padding:24px;"><h2 style="margin:0 0 8px;">No se pudo emitir la boleta</h2><p style="color:#b42318;">' + TG.esc(err.message) +
          '</p><a class="btn secondary" href="/empleado/comprar-alquilar" style="display:inline-block;margin-top:12px;">Volver al inicio del proceso</a></div>';
        return;
      }

      const s = read();
      const total = Number(boleta.monto);
      const entregado = Number(s.entregado || total);
      const vuelto = Math.max(0, entregado - total);
      const metodo = boleta.metodoPago || s.metodo || 'Efectivo';
      const fechaPactada = boleta.fechaDevolucion ? TG.fecha(boleta.fechaDevolucion) + ' · 6:00 p. m.' : '—';
      const valores = {
        fechaHora: TG.fechaHora(), fechaCabecera: TG.fechaCabecera(),
        tipoBoleta: esAlquiler ? 'BOLETA DE ALQUILER' : 'BOLETA DE COMPRA', operacion: esAlquiler ? 'Alquiler' : 'Compra', metodo,
        prenda: TG.descripcionPrenda(boleta.prenda), codigoPrenda: boleta.prenda.codigo,
        clienteNombre: TG.nombre(boleta.cliente), clienteDni: boleta.cliente.dni,
        empleado: boleta.empleado || (u ? u.nombre : ''), devolucion: fechaPactada,
        total: money(total), entregado: money(entregado), vuelto: money(vuelto), letras: TG.montoLetras(total)
      };
      document.querySelectorAll('[data-receipt]').forEach(el => { if (valores[el.dataset.receipt] !== undefined) el.textContent = valores[el.dataset.receipt]; });
      const num = document.querySelector('[data-receipt-numero]'); if (num) num.textContent = 'N.° ' + boleta.numero;

      if (!esAlquiler) {
        const a = document.getElementById('rowDevolucion'), b = document.getElementById('cajaPenalizaciones');
        if (a) a.style.display = 'none'; if (b) b.style.display = 'none';
      }
      const efectivo = metodo === 'Efectivo';
      const cv = document.getElementById('containerVuelto'); if (cv) cv.style.display = efectivo ? '' : 'none';
      const lr = document.querySelector('[data-label-recibido]'); if (lr) lr.textContent = efectivo ? 'Efectivo recibido' : 'Monto pagado';

      /* Penalizaciones: los montos que definió el admin */
      const pen = document.querySelector('#cajaPenalizaciones p');
      if (pen && config.penalidadDemora && config.penalidadMalEstado)
        pen.textContent = 'Demora: ' + money(config.penalidadDemora.valor) + ' por día de retraso · Mal estado: ' + money(config.penalidadMalEstado.valor) + ' por manchas, roturas o daños.';

      document.querySelectorAll('[data-print-receipt]').forEach(btn => btn.addEventListener('click', () => window.print()));

      /* Al terminar la boleta el empleado debe calificar al cliente (modal obligatorio) */
      if (read().calificadoBoleta !== boleta.id) {
        await TG.calificarObligatorio(boleta.cliente);
        save({ calificadoBoleta: boleta.id });
      }
    }
  });
})();
