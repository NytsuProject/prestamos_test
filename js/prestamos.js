import { db } from './supabaseClient.js';
import { cargarPrestamos } from './dashboard.js';

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnCrear").addEventListener("click", crearPrestamo);
});

async function crearPrestamo() {
  const capital = parseFloat(document.getElementById("capital").value);
  const tasa = parseFloat(document.getElementById("tasa").value);
  const meses = parseInt(document.getElementById("meses").value);
  const tipo = document.getElementById("tipo_pago").value;
  const cliente = document.getElementById("cliente")?.value?.trim(); // nuevo campo

  if (!capital || !tasa || !meses || !cliente) {
    alert("Todos los campos son obligatorios, incluyendo el nombre del cliente");
    return;
  }

  if (capital <= 0 || tasa <= 0 || meses <= 0) {
    alert("Los valores numéricos deben ser positivos");
    return;
  }

  const interesTotal = capital * (tasa / 100) * meses;
  const totalPagar = capital + interesTotal;
  const cuotasTotales = tipo === "quincenal" ? meses * 2 : meses;
  const valorCuota = totalPagar / cuotasTotales;

  try {
    // 1. Insertar el préstamo con el nombre del cliente
    const { data, error } = await db.from("prestamos").insert([{
      capital,
      tasa,
      meses,
      tipo_pago: tipo,
      total_interes: interesTotal,
      total_pagar: totalPagar,
      valor_cuota: valorCuota,
      cuotas_totales: cuotasTotales,
      total_pagado: 0,
      estado: "activo",
      cliente: cliente  // ← campo nuevo
    }]).select();

    if (error) throw error;

    const prestamoId = data[0].id;

    // 2. Determinar primer día de pago
    const hoy = new Date();
    const diaActual = hoy.getDate();
    let primerDiaPago;

    if (tipo === "quincenal") {
      if (diaActual <= 15) {
        // Día 1 al 15 → 30 del mismo mes
        primerDiaPago = new Date(hoy.getFullYear(), hoy.getMonth(), 30);
      } else {
        // Día 16 en adelante → 15 del siguiente mes
        primerDiaPago = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 15);
      }
    } else { // mensual
      const DIA_CORTE_MENSUAL = 20;
      if (diaActual < DIA_CORTE_MENSUAL) {
        primerDiaPago = new Date(hoy.getFullYear(), hoy.getMonth(), 30);
      } else {
        primerDiaPago = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 30);
      }
    }

    // Corregir día si el mes no tiene 30 (ej. febrero)
    const ultimoDiaPrimerMes = new Date(
      primerDiaPago.getFullYear(),
      primerDiaPago.getMonth() + 1,
      0
    ).getDate();

    if (primerDiaPago.getDate() > ultimoDiaPrimerMes) {
      primerDiaPago.setDate(ultimoDiaPrimerMes);
    }

    // 3. Generar las cuotas
    let fechaActual = new Date(primerDiaPago);

    for (let i = 1; i <= cuotasTotales; i++) {
      const fechaPagoStr = fechaActual.toISOString().split("T")[0];

      await db.from("cuotas").insert([{
        prestamo_id: prestamoId,
        numero: i,
        fecha_pago: fechaPagoStr,
        valor: valorCuota,
        pagado: false
      }]);

      // Avanzar a la siguiente fecha
      if (tipo === "quincenal") {
        if (fechaActual.getDate() <= 20) {  // ~15 → ir a fin de mes
          const mesActual = fechaActual.getMonth();
          fechaActual.setMonth(mesActual);
          fechaActual.setDate(30);

          // Corregir si el mes no tiene 30 días
          const ultimo = new Date(fechaActual.getFullYear(), mesActual + 1, 0).getDate();
          if (fechaActual.getDate() > ultimo) {
            fechaActual.setDate(ultimo);
          }
        } else {  // ~30 → ir a 15 del siguiente mes
          fechaActual.setMonth(fechaActual.getMonth() + 1);
          fechaActual.setDate(15);
        }
      } else {
        // Mensual: +1 mes, día 30 (o último día del mes)
        fechaActual.setMonth(fechaActual.getMonth() + 1);
        fechaActual.setDate(30);

        const ultimo = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0).getDate();
        if (fechaActual.getDate() > ultimo) {
          fechaActual.setDate(ultimo);
        }
      }
    }

    alert(`✅ Préstamo creado para ${cliente}`);
    cargarPrestamos();

    // Limpiar formulario
    document.getElementById("capital").value = "";
    document.getElementById("tasa").value = "";
    document.getElementById("meses").value = "";
    document.getElementById("cliente").value = "";
    document.getElementById("tipo_pago").value = "quincenal"; // opcional: resetear a valor por defecto

  } catch (err) {
    console.error("Error al crear préstamo:", err);
    alert("❌ Error al crear el préstamo: " + (err.message || "Revisa la consola"));
  }
}