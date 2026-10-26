/* Utilidades compartidas: conexión con la API (MySQL), sesión, formato y componentes reutilizables.
   Todas las pantallas leen y guardan aquí, así lo que hace el admin lo ve el empleado y viceversa. */
(() => {
  const SESION = 'tgUsuario';
  const TG = (window.TG = {});

  /* ---------- API ---------- */
  TG.api = async (ruta, opciones = {}) => {
    const init = { method: opciones.method || 'GET', headers: {} };
    if (opciones.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opciones.body);
    }
    let resp;
    try { resp = await fetch(ruta, init); }
    catch { throw new Error('No se pudo conectar con el servidor.'); }
    let datos = null;
    try { datos = await resp.json(); } catch { datos = null; }
    if (!resp.ok) {
      const msg = datos && (datos.mensaje || Object.values(datos).join('. '));
      throw new Error(msg || 'Ocurrió un error (' + resp.status + ').');
    }
    return datos;
  };
  TG.get = ruta => TG.api(ruta);
  TG.post = (ruta, body) => TG.api(ruta, { method: 'POST', body });
  TG.put = (ruta, body) => TG.api(ruta, { method: 'PUT', body: body === undefined ? undefined : body });

  TG.prendas = () => TG.get('/api/prendas');
  TG.clientes = () => TG.get('/api/clientes');
  TG.boletas = () => TG.get('/api/boletas');
  TG.penalidades = () => TG.get('/api/penalidades');
  TG.configuracion = async () => {
    const lista = await TG.get('/api/configuracion');
    const mapa = {};
    lista.forEach(c => { mapa[c.clave] = c; });
    return mapa;
  };

  /* ---------- Sesión ---------- */
  TG.usuario = () => { try { return JSON.parse(sessionStorage.getItem(SESION) || 'null'); } catch { return null; } };
  TG.iniciarSesion = u => sessionStorage.setItem(SESION, JSON.stringify(u));
  TG.cerrarSesion = () => { sessionStorage.removeItem(SESION); sessionStorage.removeItem('ternoCompraAlquiler'); };

  /* ---------- Formato ---------- */
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  TG.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  TG.money = n => 'S/ ' + (Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  /* Monto en letras para el pie de la boleta: SON: CIENTO OCHENTA CON 00/100 SOLES */
  TG.montoLetras = n => {
    n = Math.round((Number(n) || 0) * 100) / 100;
    const ent = Math.floor(n), cts = Math.round((n - ent) * 100);
    const U = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
    const D = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const C = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
    const menosMil = x => {
      if (x === 100) return 'cien';
      const c = Math.floor(x / 100), r = x % 100; let s = c ? C[c] + (r ? ' ' : '') : '';
      if (r < 30) { if (r || !c) s += U[r]; } else s += D[Math.floor(r / 10)] + (r % 10 ? ' y ' + U[r % 10] : '');
      return s;
    };
    let t = 'cero';
    if (ent > 0 && ent < 1000) t = menosMil(ent);
    else if (ent >= 1000 && ent < 1000000) {
      const m = Math.floor(ent / 1000), r = ent % 1000;
      t = (m === 1 ? 'mil' : menosMil(m).replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un') + ' mil') + (r ? ' ' + menosMil(r) : '');
    }
    return 'SON: ' + t.toUpperCase() + ' CON ' + String(cts).padStart(2, '0') + '/100 SOLES';
  };
  TG.hoyISO = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  TG.fecha = iso => { if (!iso) return '—'; const [a, m, d] = String(iso).slice(0, 10).split('-'); return d + '/' + m + '/' + a; };
  TG.fechaCabecera = () => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear(); };
  TG.fechaHora = () => {
    const d = new Date(); let h = d.getHours(); const ampm = h >= 12 ? 'p. m.' : 'a. m.'; h = h % 12 || 12;
    return TG.fecha(TG.hoyISO()) + ' · ' + h + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + ampm;
  };
  TG.diasEntre = (desdeISO, hastaISO) => Math.round((new Date(hastaISO + 'T00:00:00') - new Date(desdeISO + 'T00:00:00')) / 86400000);
  TG.nombre = c => c ? (c.nombres + ' ' + c.apellidos).trim() : '';
  TG.iniciales = t => String(t || '').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
  TG.telefono = c => { const s = String(c?.celular || ''); return s.length === 9 ? s.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') : s; };
  /* En las vistas de calificaciones se muestran únicamente las estrellas, sin contadores adicionales. */
  TG.estrellas = (n, promedio) => {
    n = Math.max(0, Math.min(5, Math.round(Number(promedio || n) || 0)));
    if (!n) return '<span class="stars-empty">Sin calificar</span>';
    return '<span class="stars" aria-label="' + n + ' de 5 estrellas">' + '★'.repeat(n) + '</span>' + (n < 5 ? '<span class="stars-empty">' + '☆'.repeat(5 - n) + '</span>' : '');
  };
  TG.descripcionPrenda = p => p ? p.diseno + ' · Talla ' + p.talla : '';
  TG.claseEstado = e => ({ 'Disponible': 'success', 'Alquilado': 'warning', 'Reservado': 'purple', 'En lavandería': 'info', 'En confección': 'info', 'En restauración': 'danger', 'Vendido': 'info', 'Suspendido': 'danger' }[e] || 'info');
  /* Texto que se muestra al usuario (en la base se guardan "En lavandería" y "En restauración") */
  TG.etiquetaEstado = e => ({ 'En lavandería': 'Lavandería', 'En restauración': 'Restauración' }[e] || e);
  TG.claveEstado = e => ({ 'Disponible': 'disponible', 'Alquilado': 'alquilado', 'Reservado': 'reservado', 'Vendido': 'vendido', 'En lavandería': 'lavanderia', 'En restauración': 'restauracion', 'En confección': 'confeccion', 'Suspendido': 'suspendido' }[e] || 'otro');
  /* Insignia con punto: fondo suave, texto contrastado y punto del mismo color */
  TG.insigniaEstado = e => '<span class="badge-estado est-' + TG.claveEstado(e) + '"><i></i>' + TG.esc(TG.etiquetaEstado(e)) + '</span>';
  TG.etiquetaPenalidad = t => ({ 'Demora': 'Por demora', 'Mal estado': 'Por mal estado', 'Ambos': 'Por ambos' }[t] || t);
  /* Las prendas suspendidas no salen en catálogos, cobros ni inventarios de empleados */
  TG.prendasVisibles = lista => lista.filter(p => !p.suspendida);

  /* Un cliente está "Con deuda" si tiene penalidades pendientes, "Bloqueado" si el admin bloqueó el alquiler */
  TG.estadoCliente = (c, penalidades) => {
    if ((penalidades || []).some(p => p.cliente && p.cliente.id === c.id && p.estado === 'Pendiente')) return 'Con deuda';
    return c.alquilerBloqueado ? 'Bloqueado' : 'Activo';
  };
  /* Último servicio realmente tomado por el cliente, no solo la fecha de registro.
     Se determina por la boleta vigente/no anulada más reciente. */
  TG.ultimaOperacion = (c, boletas) => {
    const operaciones = (boletas || [])
      .filter(b => b.cliente && b.cliente.id === c.id && b.estado !== 'Anulada')
      .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')) || Number(b.id || 0) - Number(a.id || 0));
    if (!operaciones.length) return 'Sin operaciones';
    const ultima = operaciones[0];
    const tipo = ({ Venta: 'Compra', Alquiler: 'Alquiler', Reserva: 'Reserva', 'Confección': 'Confección' })[ultima.tipo] || ultima.tipo || 'Servicio';
    return TG.esc(tipo) + (ultima.fecha ? ' · ' + TG.fecha(ultima.fecha) : '');
  };

  /* Aviso emergente. tipo: 'ok' (por defecto), 'info' o 'error'. Lleva un botón × para cerrarlo y los errores
     duran más para que se alcancen a leer (en celular aparece arriba, ver responsive.css) */
  const AVISOS = { ok: ['✓', 'Operación exitosa', 4000], info: ['i', 'Aviso', 5500], error: ['!', 'No se pudo completar', 8000] };
  TG.cerrarToast = () => { const c = document.getElementById('toast'); if (c) c.hidden = true; clearTimeout(TG._t); };
  TG.toast = (mensaje, tipo = 'ok') => {
    const caja = document.getElementById('toast'), txt = document.getElementById('toastMessage');
    if (!caja) { alert(mensaje); return; }
    const [icono, titulo, ms] = AVISOS[tipo] || AVISOS.ok;
    if (txt) txt.textContent = mensaje;
    caja.classList.toggle('is-error', tipo === 'error'); caja.classList.toggle('is-info', tipo === 'info');
    caja.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    const i = caja.querySelector(':scope > i'), t = caja.querySelector('strong');
    if (i) i.textContent = icono; if (t) t.textContent = titulo;
    let x = caja.querySelector('.toast-close');
    if (!x) { x = document.createElement('button'); x.type = 'button'; x.className = 'toast-close'; x.setAttribute('aria-label', 'Cerrar aviso'); x.textContent = '×'; caja.appendChild(x); }
    if (!x._cierra) { x._cierra = true; x.addEventListener('click', TG.cerrarToast); }
    caja.hidden = false;
    clearTimeout(TG._t);
    TG._t = setTimeout(TG.cerrarToast, ms);
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') TG.cerrarToast(); });

  /* ---------- Ventana de formulario reutilizable ---------- */
  const estiloInput = 'border:1px solid #d0d5dd;border-radius:8px;padding:10px 14px;font-size:14px;width:100%;box-sizing:border-box;font-family:inherit;';
  TG.modal = ({ titulo, subtitulo, campos, textoOk = 'Guardar', onOk }) => {
    const fondo = document.createElement('div');
    fondo.setAttribute('data-tg-modal', '');
    fondo.style.cssText = 'position:fixed;inset:0;background:rgba(16,24,40,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;';
    const filas = campos.map(c => {
      let ctl;
      if (c.options) {
        ctl = '<select name="' + c.name + '" style="' + estiloInput + '">' + c.options.map(o =>
          '<option value="' + TG.esc(o) + '"' + (o === c.value ? ' selected' : '') + '>' + TG.esc(o) + '</option>').join('') + '</select>';
      } else if (c.type === 'imagen') {
        ctl = '<input name="' + c.name + '" type="file" accept="image/*" style="' + estiloInput + 'padding:8px;">' +
          '<img data-prev="' + c.name + '" alt="" style="' + (c.value ? '' : 'display:none;') + 'max-height:120px;border-radius:8px;object-fit:cover;align-self:flex-start;" ' + (c.value ? 'src="' + TG.esc(c.value) + '"' : '') + '>';
      } else if (c.type === 'textarea') {
        ctl = '<textarea name="' + c.name + '" rows="3" style="' + estiloInput + '">' + TG.esc(c.value ?? '') + '</textarea>';
      } else {
        ctl = '<input name="' + c.name + '" type="' + (c.type || 'text') + '" value="' + TG.esc(c.value ?? '') + '" placeholder="' + TG.esc(c.placeholder || '') +
          '"' + (c.step ? ' step="' + c.step + '"' : '') + (c.maxlength ? ' maxlength="' + c.maxlength + '"' : '') + (c.autocomplete === false ? ' autocomplete="off"' : '') + (c.readonly ? ' readonly' : '') + ' style="' + estiloInput + (c.readonly ? 'background:#f2f4f7;' : '') + '">';
      }
      return '<label style="display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:500;color:#374151;">' + TG.esc(c.label) + ctl + '</label>';
    }).join('');
    fondo.innerHTML =
      '<form style="background:#fff;border-radius:14px;padding:24px;width:100%;max-width:480px;max-height:90vh;overflow:auto;display:flex;flex-direction:column;gap:14px;box-shadow:0 20px 50px rgba(0,0,0,.25);">' +
      '<div><h2 style="margin:0;font-size:18px;color:#101828;">' + TG.esc(titulo) + '</h2>' +
      (subtitulo ? '<p style="margin:4px 0 0;font-size:13px;color:#667085;">' + TG.esc(subtitulo) + '</p>' : '') + '</div>' + filas +
      '<div data-error style="display:none;background:#fef3f2;color:#b42318;border-radius:8px;padding:10px 12px;font-size:13px;"></div>' +
      '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:6px;">' +
      '<button type="button" data-cancelar style="padding:10px 20px;border-radius:8px;border:1px solid #d0d5dd;background:#fff;color:#344054;font-weight:600;cursor:pointer;">Cancelar</button>' +
      '<button type="submit" style="padding:10px 20px;border-radius:8px;border:none;background:#b3820a;color:#fff;font-weight:600;cursor:pointer;">' + TG.esc(textoOk) + '</button></div></form>';
    document.body.appendChild(fondo);
    const form = fondo.querySelector('form'), caja = fondo.querySelector('[data-error]');
    const cerrar = () => fondo.remove();
    const imagenes = {};
    campos.filter(c => c.type === 'imagen').forEach(c => {
      form.elements[c.name].addEventListener('change', async e => {
        const f = e.target.files[0]; if (!f) return;
        try {
          imagenes[c.name] = await TG.reducirImagen(f);
          const prev = form.querySelector('[data-prev="' + c.name + '"]'); prev.src = imagenes[c.name]; prev.style.display = 'block';
        } catch (err) { TG.toast(err.message); e.target.value = ''; }
      });
    });
    fondo.querySelector('[data-cancelar]').addEventListener('click', cerrar);
    fondo.addEventListener('mousedown', e => { if (e.target === fondo) cerrar(); });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!TG.validarTodo(campos.filter(c => c.regla).map(c => form.elements[c.name]))) return;
      const valores = {};
      campos.forEach(c => { valores[c.name] = c.type === 'imagen' ? (imagenes[c.name] || '') : form.elements[c.name].value.trim(); });
      caja.style.display = 'none';
      try { await onOk(valores); cerrar(); }
      catch (err) { caja.textContent = err.message; caja.style.display = 'block'; }
    });
    campos.filter(c => c.regla).forEach(c => TG.vincular(form.elements[c.name], c.regla, { requerido: c.requerido !== false }));
    const primero = form.querySelector('input:not([readonly]),select,textarea'); primero && primero.focus();
    return { cerrar };
  };

  /* Lee una foto y la reduce (máx. 700 px, JPEG) para que se guarde liviana en la base de datos */
  TG.reducirImagen = archivo => new Promise((resolve, reject) => {
    if (!/^image\//.test(archivo.type)) { reject(new Error('El archivo debe ser una imagen.')); return; }
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo abrir la imagen.'));
      img.onload = () => {
        const k = Math.min(1, 700 / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });

  /* Un cliente queda "eliminado" cuando tuvo boletas y todas fueron anuladas */
  TG.clienteEliminado = (c, boletas) => {
    const mias = (boletas || []).filter(b => b.cliente && b.cliente.id === c.id);
    return mias.length > 0 && mias.every(b => b.estado === 'Anulada');
  };

  /* ---------- Calificación obligatoria del cliente (modal que se abre al terminar una boleta) ---------- */
  const MOTIVOS = { bajo: ['Se comporta mal', 'Insulta o maltrata al personal'], medio: ['Se portó normal', 'Buen cliente'], alto: ['Recontra buen cliente', 'Cliente excelente'] };
  /* Comentario que corresponde a las estrellas (misma lógica del modal): si el último comentario ya es de ese grupo se respeta, si no se asigna el primero del grupo */
  TG.comentarioAuto = (estrellas, comentario) => {
    const n = Number(estrellas) || 0; if (!n) return '—';
    const grupo = n <= 2 ? MOTIVOS.bajo : n === 3 ? MOTIVOS.medio : MOTIVOS.alto;
    const base = String(comentario || '').split(' — ')[0].trim();
    return grupo.includes(base) ? String(comentario) : grupo[0];
  };
  TG.calificarObligatorio = cliente => new Promise(resolve => {
    let estrellas = 0, motivo = '';
    const fondo = document.createElement('div');
    fondo.setAttribute('data-tg-modal', '');
    fondo.style.cssText = 'position:fixed;inset:0;background:rgba(16,24,40,.6);display:flex;align-items:center;justify-content:center;z-index:10000;padding:16px;';
    fondo.innerHTML =
      '<div data-tg-calificador style="background:#fff;border-radius:14px;padding:26px;width:100%;max-width:480px;max-height:92vh;overflow:auto;box-shadow:0 20px 50px rgba(0,0,0,.3);">' +
      '<h2 style="margin:0;font-size:19px;color:#101828;">Califica al cliente</h2>' +
      '<p style="margin:4px 0 16px;font-size:13px;color:#667085;">' + TG.esc(TG.nombre(cliente)) + ' · DNI ' + TG.esc(cliente.dni) + '. Es obligatorio para terminar.</p>' +
      '<div data-estrellas style="display:flex;gap:6px;justify-content:center;margin-bottom:6px;"></div>' +
      '<p data-etq style="text-align:center;margin:0 0 14px;font-size:13px;color:#667085;min-height:18px;">Elige de 1 a 5 estrellas</p>' +
      '<div data-motivos style="display:none;flex-direction:column;gap:8px;margin-bottom:14px;"></div>' +
      '<label style="display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:500;color:#374151;">Comentario (opcional)' +
      '<textarea data-comentario rows="3" maxlength="150" placeholder="Cuéntanos cómo fue el cliente..." style="' + estiloInput + '"></textarea></label>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:18px;"><button type="button" data-ok disabled style="padding:11px 22px;border-radius:8px;border:none;background:#b3820a;color:#fff;font-weight:600;cursor:not-allowed;opacity:.5;">Confirmar calificación</button></div></div>';
    document.body.appendChild(fondo);
    const caja = fondo.querySelector('[data-estrellas]'), motivos = fondo.querySelector('[data-motivos]'), etq = fondo.querySelector('[data-etq]'), ok = fondo.querySelector('[data-ok]');
    const grupo = n => n <= 2 ? 'bajo' : n === 3 ? 'medio' : 'alto';
    const pintarEstrellas = () => {
      caja.innerHTML = [1, 2, 3, 4, 5].map(n => '<button type="button" data-n="' + n + '" aria-label="' + n + ' estrellas" style="background:none;border:none;font-size:38px;line-height:1;cursor:pointer;padding:0 3px;color:' + (n <= estrellas ? '#f5a623' : '#d0d5dd') + ';">★</button>').join('');
    };
    const pintarMotivos = () => {
      if (!estrellas) { motivos.style.display = 'none'; return; }
      motivos.style.display = 'flex';
      motivos.innerHTML = '<span style="font-size:13px;font-weight:500;color:#374151;">¿Cómo fue el cliente? (obligatorio)</span>' + MOTIVOS[grupo(estrellas)].map(m =>
        '<button type="button" data-motivo="' + TG.esc(m) + '" style="text-align:left;padding:10px 14px;border-radius:8px;cursor:pointer;font-size:14px;border:1px solid ' + (m === motivo ? '#b3820a' : '#d0d5dd') +
        ';background:' + (m === motivo ? '#fffaf0' : '#fff') + ';color:#344054;font-weight:' + (m === motivo ? '600' : '500') + ';">' + (m === motivo ? '● ' : '○ ') + TG.esc(m) + '</button>').join('');
    };
    const refrescar = () => {
      pintarEstrellas(); pintarMotivos();
      etq.textContent = estrellas ? estrellas + ' de 5 estrellas' : 'Elige de 1 a 5 estrellas';
      const listo = estrellas > 0 && motivo !== '';
      ok.disabled = !listo; ok.style.opacity = listo ? '1' : '.5'; ok.style.cursor = listo ? 'pointer' : 'not-allowed';
    };
    caja.addEventListener('click', e => {
      const b = e.target.closest('[data-n]'); if (!b) return;
      const n = Number(b.dataset.n);
      estrellas = n; if (!MOTIVOS[grupo(n)].includes(motivo)) motivo = '';
      refrescar();
    });
    motivos.addEventListener('click', e => { const b = e.target.closest('[data-motivo]'); if (b) { motivo = b.dataset.motivo; refrescar(); } });
    ok.addEventListener('click', async () => {
      if (!estrellas || !motivo) return;
      ok.disabled = true; ok.textContent = 'Guardando...';
      const extra = fondo.querySelector('[data-comentario]').value.trim();
      try {
        const actualizado = await TG.put('/api/clientes/calificar/' + cliente.id, { calificacion: estrellas, comentario: motivo + (extra ? ' — ' + extra : '') });
        fondo.remove(); TG.toast('Calificación guardada'); resolve(actualizado);
      } catch (err) { ok.disabled = false; ok.textContent = 'Confirmar calificación'; TG.toast(err.message); }
    });
    refrescar();
  });

  /* ---------- Validación de formularios (borde rojo + mensaje; al corregir vuelve a lo normal) ---------- */
  const css = document.createElement('style');
  css.textContent = '.tg-invalid{border-color:#d92d20!important;box-shadow:0 0 0 1px #d92d20!important;outline:none!important}' +
    '.tg-msg{display:block;color:#d92d20;font-size:12px;font-weight:500;margin-top:4px;line-height:1.3}';
  document.head.appendChild(css);

  TG.reglas = {
    dni: { filtro: v => v.replace(/\D/g, '').slice(0, 8), ok: v => /^\d{8}$/.test(v), msg: 'DNI inválido: debe tener exactamente 8 números' },
    celular: { filtro: v => v.replace(/\D/g, '').slice(0, 9), ok: v => /^9\d{8}$/.test(v), msg: 'Teléfono inválido: 9 números y debe empezar con 9' },
    correo: { ok: v => /^[A-Za-z0-9._%+-]+@gmail\.com$/i.test(v), msg: 'Correo inválido: debe terminar en @gmail.com' },
    nombre: { filtro: v => v.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]/g, '').replace(/\s{2,}/g, ' '), ok: v => v.trim().length >= 2, msg: 'Inválido: solo letras (mínimo 2)' },
    direccion: { ok: v => v.trim().length >= 5, msg: 'Dirección inválida (mínimo 5 caracteres)' },
    texto: { ok: v => v.trim().length >= 1, msg: 'Dato inválido' },
    codigo: { ok: v => /^[A-Za-z0-9-]{3,}$/.test(v.trim()), msg: 'Código inválido (letras, números y guion, mínimo 3)' },
    monto: { ok: v => Number(v) > 0, msg: 'Monto inválido: debe ser mayor a 0' },
    /* Prenda: 3 letras en mayúscula, guion automático y solo números después (TRN-001) */
    codigoPrenda: {
      filtro: (v, e) => {
        v = v.toUpperCase(); let l = '', d = '';
        for (const ch of v) { if (l.length < 3) { if (/[A-Z]/.test(ch)) l += ch; } else if (/\d/.test(ch) && d.length < 3) d += ch; }
        const borrando = e && e.inputType && e.inputType.startsWith('delete');
        return l.length === 3 && (d || !borrando) ? l + '-' + d : l;
      },
      ok: v => /^[A-Z]{3}-\d{3}$/.test(v), msg: 'Código inválido: 3 letras, guion y 3 números (ej. TRN-005)'
    },
    /* Precio: solo números y un punto; al salir del campo se completa a dos decimales (80 → 80.00, 80.5 → 80.50) */
    precio: {
      filtro: v => { let s = v.replace(/[^\d.]/g, ''); const i = s.indexOf('.'); if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '').slice(0, 2); return s.slice(0, 9); },
      formato: v => { const n = Number(v); return v && !isNaN(n) ? n.toFixed(2) : v; },
      ok: v => Number(v) > 0, msg: 'Precio inválido: debe ser mayor a 0'
    },
    /* Código de empleado: 4 caracteres, mayúsculas, sin espacios, letras y números */
    codigoEmpleado: {
      filtro: v => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4),
      ok: v => /^[A-Z0-9]{4}$/.test(v), msg: 'Código inválido: 4 caracteres entre letras y números (ej. E001)'
    },
    usuario: { filtro: v => v.replace(/\s/g, ''), ok: v => /^[A-Za-z0-9._-]{4,}$/.test(v), msg: 'Usuario inválido: mínimo 4 caracteres, sin espacios' },
    contrasena: { ok: v => v.length >= 4, msg: 'La contraseña debe tener al menos 4 caracteres' },
    area: { ok: v => v.trim().length >= 3, msg: 'Indica el área o puesto (mínimo 3 caracteres)' },
    fechaHoy: { ok: v => !!v && v >= TG.hoyISO(), msg: 'Fecha inválida: no puede ser anterior a hoy' }
  };

  /* Pone o quita el borde rojo y el mensaje de un campo */
  TG.marcar = (input, mensaje) => {
    const cont = input._tgCont || input.parentElement;
    let msg = cont.querySelector(':scope > .tg-msg[data-de="' + (input.name || input.id) + '"]');
    if (mensaje) {
      input.classList.add('tg-invalid');
      if (!msg) { msg = document.createElement('span'); msg.className = 'tg-msg'; msg.setAttribute('data-de', input.name || input.id); cont.appendChild(msg); }
      msg.textContent = mensaje;
    } else {
      input.classList.remove('tg-invalid');
      if (msg) msg.remove();
    }
  };
  TG.validarCampo = input => {
    const cfg = input._tg; if (!cfg) return true;
    const v = String(input.value ?? '').trim();
    let mensaje = null;
    if (v === '') mensaje = cfg.requerido ? 'Este campo es obligatorio' : null;
    else if (cfg.regla.ok && !cfg.regla.ok(v)) mensaje = cfg.regla.msg;
    TG.marcar(input, mensaje);
    return !mensaje;
  };
  /* Valida varios campos a la vez; el primero que falle recibe el foco */
  TG.validarTodo = inputs => {
    let todoOk = true, primero = null;
    inputs.filter(i => i && i._tg && !i.readOnly && !i.disabled).forEach(i => {
      i._tocado = true;
      if (!TG.validarCampo(i)) { todoOk = false; primero = primero || i; }
    });
    primero && primero.focus();
    return todoOk;
  };
  TG.limpiarValidacion = contenedor => {
    contenedor.querySelectorAll('.tg-invalid').forEach(i => i.classList.remove('tg-invalid'));
    contenedor.querySelectorAll('.tg-msg').forEach(m => m.remove());
    contenedor.querySelectorAll('input').forEach(i => { i._tocado = false; });
  };
  /* Enlaza un campo con una regla (nombre de TG.reglas o un objeto {ok, msg, filtro}) */
  TG.vincular = (input, regla, opciones = {}) => {
    const r = typeof regla === 'string' ? TG.reglas[regla] : regla;
    input._tg = { regla: r, requerido: opciones.requerido !== false };
    if (opciones.contenedor) input._tgCont = opciones.contenedor;
    if (r.filtro) input.addEventListener('input', e => { const n = r.filtro(input.value, e); if (n !== input.value) input.value = n; });
    if (r.formato) input.addEventListener('blur', () => { if (input.value) input.value = r.formato(input.value); });
    input.addEventListener('input', () => { if (input._tocado) TG.validarCampo(input); });
    input.addEventListener('change', () => { input._tocado = true; TG.validarCampo(input); });
    input.addEventListener('blur', () => { input._tocado = true; TG.validarCampo(input); });
    if (input.tagName === 'INPUT' && input.placeholder) {
      /* El ejemplo desaparece al hacer clic para poder escribir */
      const ejemplo = input.placeholder;
      input.addEventListener('focus', () => { input.placeholder = ''; });
      input.addEventListener('blur', () => { input.placeholder = ejemplo; });
    }
    return input;
  };

  /* ---------- Catálogo (tarjetas de producto) con los precios vigentes ---------- */
  const IMG = {
    Ternos: 'https://images.unsplash.com/photo-1618886614638-80e3c103d31a?auto=format&fit=crop&w=700&q=85',
    Smoking: 'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?auto=format&fit=crop&w=700&q=85'
  };
  /* Opciones que define el administrador y usan los filtros del catálogo (empleado y paso 1) */
  TG.OPCIONES = {
    color: ['Azul Marino', 'Negro', 'Gris Perla', 'Plomo / Oxford', 'Rojo / Burgundy', 'Beige / Cream', 'Blanco'],
    categoria: ['Niños', 'Jóvenes', 'Adultos'],
    estilo: ['Ejecutivo', 'Smoking', 'Clásico', 'Moderno Slim', 'Premium'],
    talla: ['S', 'M', 'L', 'XL'],
    componente: ['Terno completo', 'Saco', 'Pantalón', 'Chaleco', 'Corbata / Michi', 'Camisa']
  };
  TG.llenarSelect = (select, lista, textoTodos) => {
    if (!select) return;
    select.innerHTML = '<option value="">' + TG.esc(textoTodos) + '</option>' + lista.map(o => '<option value="' + TG.esc(o) + '">' + TG.esc(o) + '</option>').join('');
  };
  const igual = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  /* Filtros: vacío = sin filtrar. Si hay componentes marcados solo salen esos (un terno completo incluye saco y pantalón) */
  TG.pasaFiltros = (p, f) => {
    if (f.color && !igual(p.color, f.color)) return false;
    if (f.categoria && !igual(p.categoria, f.categoria)) return false;
    if (f.estilo && !igual(p.estilo, f.estilo)) return false;
    if (f.talla && !igual(p.talla, f.talla)) return false;
    if (f.componentes && f.componentes.length) {
      const ok = f.componentes.some(c => igual(p.componente, c)) ||
        (igual(p.componente, 'Terno completo') && f.componentes.some(c => igual(c, 'Saco') || igual(c, 'Pantalón')));
      if (!ok) return false;
    }
    return true;
  };
  TG.categoriaPrenda = p => {
    if (/corbata|camisa/i.test(p.componente || '')) return 'Accesorios';
    if (igual(p.estilo, 'Smoking') || /smoking/i.test(p.diseno)) return 'Smoking';
    return 'Ternos';
  };
  /* Tarjetas del catálogo (empleado y administrador): la etiqueta de estado sale de la columna "estado" de la prenda
     y "Ver detalle" estira la tarjeta para mostrar los datos que registró el administrador */
  TG.tarjetasCatalogo = prendas => prendas.map(p => {
    const cat = TG.categoriaPrenda(p), a = x => TG.esc(String(x || '').toLowerCase());
    const fila = (k, v) => '<div><dt>' + k + '</dt><dd>' + TG.esc(v || '—') + '</dd></div>';
    return '<article class="product-card" data-product-category="' + cat + '" data-color="' + a(p.color) + '" data-categoria="' + a(p.categoria) + '" data-estilo="' + a(p.estilo) +
      '" data-talla="' + a(p.talla) + '" data-componente="' + a(p.componente) + '" data-tipo="' + a(p.tipo) + '"><div class="product-image"><img src="' + TG.esc(p.imagen || IMG[cat] || IMG.Ternos) + '" alt="' + TG.esc(p.diseno) +
      '"><span class="status est-' + TG.claveEstado(p.estado) + '"><i></i>' + TG.esc(TG.etiquetaEstado(p.estado)) +
      '</span></div><div class="product-body"><span>' + cat.toUpperCase() + '</span><h3>' + TG.esc(p.diseno) + '</h3><div><span>' + TG.esc(p.codigo) + ' · Talla ' + TG.esc(p.talla) +
      '</span><b>' + TG.money(p.precioAlquiler) + '</b></div><footer><p><small>Precio de alquiler · Venta ' + TG.money(p.precioVenta) + '</small><strong>' + TG.money(p.precioAlquiler) +
      '</strong></p><button class="btn secondary" type="button" data-detalle="' + p.id + '" aria-expanded="false">Ver detalle</button></footer>' +
      '<div class="product-extra"><div class="product-extra-inner"><dl>' + fila('Código', p.codigo) + fila('Tipo', p.tipo) + fila('Talla', p.talla) + fila('Color', p.color) + fila('Categoría', p.categoria) +
      fila('Estilo', p.estilo) + fila('Componente', p.componente) + fila('Estado', TG.etiquetaEstado(p.estado)) + fila('Precio de venta', TG.money(p.precioVenta)) + fila('Precio de alquiler', TG.money(p.precioAlquiler)) +
      '</dl></div></div></div></article>';
  }).join('');
  /* Expande o contrae la tarjeta del botón "Ver detalle" con transición suave */
  TG.alternarDetalle = boton => {
    const tarjeta = boton.closest('.product-card'); if (!tarjeta) return;
    const abierta = tarjeta.classList.toggle('is-open');
    boton.setAttribute('aria-expanded', abierta ? 'true' : 'false');
    boton.textContent = abierta ? 'Ocultar detalle' : 'Ver detalle';
  };

  /* ---------- Arranque común ---------- */
  TG.protegerPagina = () => {
    const ruta = location.pathname;
    const rol = ruta.startsWith('/admin') ? 'Administrador' : ruta.startsWith('/empleado') ? 'Empleado' : null;
    if (!rol) return true;
    const u = TG.usuario();
    if (!u || u.rol !== rol) { location.replace('/login'); return false; }
    return true;
  };
  TG.iniciarPagina = () => {
    const u = TG.usuario();
    if (u) {
      const caja = document.querySelector('.side-user');
      if (caja) {
        const av = caja.querySelector('.avatar'), nom = caja.querySelector('strong'), rol = caja.querySelector('span');
        av && (av.textContent = TG.iniciales(u.nombre)); nom && (nom.textContent = u.nombre); rol && (rol.textContent = u.rol);
      }
    }
    document.querySelectorAll('.date-block strong').forEach(el => { el.textContent = TG.fechaCabecera(); });
    document.querySelectorAll('.logout-link').forEach(a => a.addEventListener('click', TG.cerrarSesion));
  };

  /* Ejecuta fn cuando el DOM esté listo y la persona haya iniciado sesión */
  TG.listo = fn => {
    const correr = () => { if (!TG.protegerPagina()) return; TG.iniciarPagina(); fn && fn(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', correr); else correr();
  };
})();

/* Pone el valor (y opcionalmente el texto pequeño) de una tarjeta KPI según su título */
TG.kpi = (titulo, valor, pie) => {
  document.querySelectorAll('.kpi-copy').forEach(c => {
    if (c.querySelector('span')?.textContent.trim() !== titulo) return;
    c.querySelector('strong').textContent = valor;
    if (pie !== undefined && c.querySelector('small')) c.querySelector('small').textContent = pie;
  });
};
