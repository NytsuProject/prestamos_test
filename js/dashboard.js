import { db } from './supabaseClient.js';

const format = (num) => Number(num).toLocaleString('es-CO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const formatPorcentaje = (tasa) => Number(tasa).toFixed(2) + ' %';

document.addEventListener("DOMContentLoaded", cargarPrestamos);

export async function cargarPrestamos() {
  const totalPrestadoEl = document.getElementById("totalPrestado");
  const gananciaEl = document.getElementById("ganancia");
  const saldoPendienteEl = document.getElementById("saldoPendiente");
  const lista = document.getElementById("listaPrestamos");

  const { data: prestamos, error } = await db
    .from("prestamos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al cargar préstamos:", error);
    return;
  }

  let totalPrestado = 0;
  let ganancia = 0;
  let saldoPendiente = 0;

  lista.innerHTML = "";

  for (const p of prestamos) {
    const capital = Number(p.capital);
    const totalPagar = Number(p.total_pagar);
    const pagado = Number(p.total_pagado || 0);
    const saldo = totalPagar - pagado;

    totalPrestado += capital;
    ganancia += Number(p.total_interes);
    saldoPendiente += saldo;

    const div = document.createElement("div");
    div.className = "loan-card";

    const estadoClass = p.estado === 'cancelado' ? 'status-paid' : 'status-active';

    div.innerHTML = `
      <div class="loan-header" onclick="toggleCuotas(this)" style="cursor: pointer; user-select: none;">
        <h3 style="margin: 0; display: flex; justify-content: space-between; align-items: center;">
          ${p.cliente || 'Cliente sin nombre asignado'}
          <small style="color:#64748b; font-size:0.85rem; margin-left:0.75rem;">
            (${p.id.substring(0,8)}…)
          </small>
          <span class="toggle-icon" style="font-size:1.2rem; transition: transform 0.3s;">▼</span>
        </h3>

        <div class="loan-summary" style="margin-top: 1rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem;">
          <div class="summary-item">
            <div class="label">Capital</div>
            <div class="value">$${format(capital)}</div>
          </div>
          <div class="summary-item">
            <div class="label">Total a pagar</div>
            <div class="value">$${format(totalPagar)}</div>
          </div>
          <div class="summary-item">
            <div class="label">Saldo pendiente</div>
            <div class="value">$${format(saldo)}</div>
          </div>
          <div class="summary-item">
            <div class="label">Tasa mensual</div>
            <div class="value">${formatPorcentaje(p.tasa)}</div>
          </div>
          <div class="summary-item">
            <div class="label">Estado</div>
            <div class="value ${estadoClass}">${(p.estado || 'activo').toUpperCase()}</div>
          </div>
        </div>
      </div>

      <div class="cuotas-container" style="display: none; max-height: 0; overflow: hidden; transition: max-height 0.4s ease-out, padding 0.4s ease;">
        <div class="cuota-row header">
          <div class="cuota-num">N°</div>
          <div class="cuota-date">Cuota</div>
          <div class="cuota-value">Valor</div>
          <div class="cuota-status">Estado</div>
          <div></div>
        </div>

        <div id="cuotas-${p.id}"></div>
      </div>
    `;

    lista.appendChild(div);

    // Cargar cuotas
    const { data: cuotas, error: cuotasError } = await db
      .from("cuotas")
      .select("*")
      .eq("prestamo_id", p.id)
      .order("numero", { ascending: true });

    if (cuotasError) {
      console.error("Error cargando cuotas del préstamo " + p.id + ":", cuotasError);
      continue;
    }

    const cont = document.getElementById(`cuotas-${p.id}`);

    cuotas.forEach(c => {
      const row = document.createElement("div");
      row.className = "cuota-row";

      const estadoHTML = c.pagado
        ? `<span class="status-paid">Pagado</span>`
        : `<button class="btn-pay" onclick="marcarPagado('${c.id}', '${p.id}')">Pagar ahora</button>`;

      row.innerHTML = `
        <div class="cuota-num">${c.numero}</div>
        <div class="cuota-date">Cuota Número ${c.numero}</div>
        <div class="cuota-value">$${format(c.valor)}</div>
        <div class="cuota-status">${estadoHTML}</div>
        <div></div>
      `;

      cont.appendChild(row);
    });
  }

  totalPrestadoEl.textContent = "$" + format(totalPrestado);
  gananciaEl.textContent = "$" + format(ganancia);
  saldoPendienteEl.textContent = "$" + format(saldoPendiente);
}

// Función global para expandir/colapsar
window.toggleCuotas = function(headerElement) {
  const container = headerElement.nextElementSibling; // .cuotas-container
  const icon = headerElement.querySelector('.toggle-icon');

  if (container.style.display === 'none' || container.style.maxHeight === '0px') {
    // Expandir
    container.style.display = 'block';
    container.style.maxHeight = container.scrollHeight + 'px';
    icon.textContent = '▲';
    icon.style.transform = 'rotate(180deg)';
  } else {
    // Colapsar
    container.style.maxHeight = '0px';
    setTimeout(() => {
      container.style.display = 'none';
    }, 400); // tiempo igual a la transición
    icon.textContent = '▼';
    icon.style.transform = 'rotate(0deg)';
  }
};
