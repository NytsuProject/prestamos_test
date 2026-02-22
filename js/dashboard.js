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

  for (let p of prestamos) {
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
      <div class="loan-header">
        <h3>
          ${p.cliente || 'Cliente sin nombre asignado'}
          <small style="color:#64748b; font-size:0.85rem; margin-left:0.75rem;">
            (${p.id.substring(0,8)}…)
          </small>
        </h3>
      </div>

      <div class="loan-summary">
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

      <div class="cuotas-container">
        <div class="cuota-row header">
          <div class="cuota-num">N°</div>
          <div class="cuota-date">Cuota</div>          <!-- ← cambiado de "Fecha" a "Cuota" -->
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
      console.error("Error cargando cuotas:", cuotasError);
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
        <div class="cuota-date">Cuota Número ${c.numero}</div>   <!-- ← aquí se muestra "Cuota Número X" -->
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