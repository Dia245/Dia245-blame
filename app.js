/**
 * GLOBAL GO — Catálogo de Motocicletas
 * app.js — Lógica principal del catálogo interactivo
 */

(function () {
  'use strict';

  /* ── Estado ──────────────────────────────────────────────── */
  let motos = [];
  let motoActiva = null;
  let terminoBusqueda = '';

  /* ── Referencias DOM ─────────────────────────────────────── */
  const $ = (id) => document.getElementById(id);
  const lista       = $('modelosLista');
  const buscador    = $('buscador');
  const searchClear = $('searchClear');
  const modelCount  = $('modelCount');
  const previewEmpty   = $('previewEmpty');
  const previewContent = $('previewContent');

  /* ── Carga de datos ──────────────────────────────────────── */
  async function cargarMotos() {
    try {
      const res = await fetch('motos.json');
      if (!res.ok) throw new Error('No se pudo cargar motos.json');
      motos = await res.json();
      renderLista(motos);
    } catch (err) {
      lista.innerHTML = `
        <div class="lista-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>Error al cargar el catálogo.<br/>Verifica el archivo motos.json.</p>
        </div>`;
      console.error(err);
    }
  }

  /* ── Renderizar lista de modelos ─────────────────────────── */
  function renderLista(datos) {
    modelCount.textContent = datos.length;

    if (datos.length === 0) {
      lista.innerHTML = `
        <div class="lista-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <p>Sin resultados para<br/><strong>"${escapeHtml(terminoBusqueda)}"</strong></p>
        </div>`;
      return;
    }

    /* Agrupar por inicial */
    const grupos = {};
    datos.forEach((m) => {
      const inicial = m.modelo[0].toUpperCase();
      (grupos[inicial] = grupos[inicial] || []).push(m);
    });

    const letras = Object.keys(grupos).sort();
    const frag   = document.createDocumentFragment();

    letras.forEach((letra) => {
      /* Heading de letra */
      const grupoEl = document.createElement('div');
      grupoEl.className = 'letra-grupo';

      const h = document.createElement('p');
      h.className = 'letra-titulo';
      h.textContent = letra;
      grupoEl.appendChild(h);
      frag.appendChild(grupoEl);

      /* Items */
      grupos[letra].forEach((moto) => {
        frag.appendChild(crearItemMoto(moto));
      });
    });

    lista.innerHTML = '';
    lista.appendChild(frag);

    /* Restaurar activo si corresponde */
    if (motoActiva) {
      const el = lista.querySelector(`[data-id="${motoActiva.id}"]`);
      if (el) el.classList.add('active');
    }
  }

  /* ── Crear elemento de moto en la lista ──────────────────── */
  function crearItemMoto(moto) {
    const item = document.createElement('div');
    item.className = 'modelo-item';
    item.setAttribute('data-id', moto.id);
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `Ver ${moto.modelo}`);

    /* Miniatura — lazy load con placeholder */
    const thumb = document.createElement('img');
    thumb.className = 'modelo-item__thumb';
    thumb.alt = moto.modelo;
    thumb.loading = 'lazy';
    thumb.decoding = 'async';
    thumb.src = moto.imagen;
    thumb.onerror = function () {
      /* Si la imagen no existe, muestra emoji placeholder */
      const ph = document.createElement('div');
      ph.className = 'modelo-item__thumb-placeholder';
      ph.textContent = '🏍️';
      item.replaceChild(ph, thumb);
    };

    const info = document.createElement('div');
    info.className = 'modelo-item__info';

    const nombre = document.createElement('p');
    nombre.className = 'modelo-item__name';
    nombre.innerHTML = destacarTexto(moto.modelo, terminoBusqueda);

    const cc = document.createElement('p');
    cc.className = 'modelo-item__cc';
    cc.textContent = moto.cilindrada || '';

    const arrow = document.createElement('span');
    arrow.className = 'modelo-item__arrow';
    arrow.textContent = '›';
    arrow.setAttribute('aria-hidden', 'true');

    info.appendChild(nombre);
    info.appendChild(cc);
    item.appendChild(thumb);
    item.appendChild(info);
    item.appendChild(arrow);

    /* Eventos */
    item.addEventListener('click', () => seleccionarMoto(moto));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        seleccionarMoto(moto);
      }
    });

    return item;
  }

  /* ── Seleccionar y mostrar moto ──────────────────────────── */
  function seleccionarMoto(moto) {
    motoActiva = moto;

    /* Marcar activo en lista */
    lista.querySelectorAll('.modelo-item').forEach((el) => el.classList.remove('active'));
    const activeEl = lista.querySelector(`[data-id="${moto.id}"]`);
    if (activeEl) {
      activeEl.classList.add('active');
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    /* Mostrar panel */
    previewEmpty.style.display = 'none';
    previewContent.removeAttribute('hidden');

    /* Animación de salida */
    previewContent.classList.remove('is-visible');
    previewContent.classList.add('is-loading');

    /* Rellenar datos (con pequeño delay para que se vea la animación) */
    requestAnimationFrame(() => {
      poblarPreview(moto);

      requestAnimationFrame(() => {
        previewContent.classList.remove('is-loading');
        previewContent.classList.add('is-visible');
      });
    });

    /* En mobile, hacer scroll al preview */
    if (window.innerWidth <= 768) {
      document.getElementById('panelPreview').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* ── Llenar el panel derecho ─────────────────────────────── */
  function poblarPreview(moto) {
    const img = $('previewImg');
    img.src = moto.imagen;
    img.alt = moto.modelo;
    img.onerror = function () {
      /* Si la imagen falla, muestra un SVG inline de placeholder */
      img.style.display = 'none';
      let ph = document.querySelector('.img-placeholder');
      if (!ph) {
        ph = document.createElement('div');
        ph.className = 'img-placeholder';
        img.parentNode.insertBefore(ph, img);
      }
      ph.textContent = '🏍️';
    };
    img.style.display = '';
    const ph = document.querySelector('.img-placeholder');
    if (ph) ph.remove();

    $('previewModelo').textContent    = moto.modelo;
    $('previewPrecio').textContent    = moto.precio;
    $('previewDescripcion').textContent = moto.descripcion;

    /* Specs dinámicas */
    const specDefs = [
      { key: 'cilindrada',   label: 'Cilindrada'   },
      { key: 'motor',        label: 'Motor'        },
      { key: 'potencia',     label: 'Potencia'     },
      { key: 'torque',       label: 'Torque'       },
      { key: 'transmision',  label: 'Transmisión'  },
      { key: 'arranque',     label: 'Arranque'     },
      { key: 'frenos',       label: 'Frenos'       },
      { key: 'peso',         label: 'Peso'         },
      { key: 'combustible',  label: 'Combustible'  },
    ];

    const grid = $('specsGrid');
    grid.innerHTML = '';
    specDefs.forEach(({ key, label }) => {
      if (!moto[key]) return;
      const item = document.createElement('div');
      item.className = 'spec-item';
      item.innerHTML = `
        <p class="spec-label">${escapeHtml(label)}</p>
        <p class="spec-value">${escapeHtml(moto[key])}</p>`;
      grid.appendChild(item);
    });

    /* WhatsApp */
    const mensaje = encodeURIComponent(
      `Hola, estoy interesado en la *${moto.modelo}* (${moto.precio}). ¿Podrían darme más información?`
    );
    $('btnWhatsapp').href = `https://wa.me/${moto.whatsapp}?text=${mensaje}`;

    /* PDF */
    $('btnPdf').href = moto.pdf || '#';
    if (!moto.pdf) {
      $('btnPdf').style.opacity = '.5';
      $('btnPdf').style.pointerEvents = 'none';
    } else {
      $('btnPdf').style.opacity = '';
      $('btnPdf').style.pointerEvents = '';
    }
  }

  /* ── Buscador en tiempo real ─────────────────────────────── */
  function filtrar(termino) {
    terminoBusqueda = termino.trim().toLowerCase();
    searchClear.hidden = !terminoBusqueda;

    const filtrados = termino
      ? motos.filter((m) => m.modelo.toLowerCase().includes(terminoBusqueda))
      : motos;

    renderLista(filtrados);
  }

  buscador.addEventListener('input', (e) => filtrar(e.target.value));
  buscador.addEventListener('search', () => filtrar(''));

  searchClear.addEventListener('click', () => {
    buscador.value = '';
    filtrar('');
    buscador.focus();
  });

  /* ── Utilidades ──────────────────────────────────────────── */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function destacarTexto(texto, termino) {
    if (!termino) return escapeHtml(texto);
    const re = new RegExp(`(${escapeHtml(termino).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escapeHtml(texto).replace(re, '<mark class="highlight">$1</mark>');
  }

  /* ── Footer año ──────────────────────────────────────────── */
  const footerYear = document.getElementById('footerYear');
  if (footerYear) footerYear.textContent = new Date().getFullYear();

  /* ── Init ────────────────────────────────────────────────── */
  cargarMotos();
})();
