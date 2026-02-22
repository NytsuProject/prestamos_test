import { db } from './supabaseClient.js';
import { cargarPrestamos } from './dashboard.js';

window.marcarPagado = async function(cuotaId, prestamoId) {
  try {
    // Marcar cuota pagada
    await db.from("cuotas").update({ pagado: true }).eq("id", cuotaId);

    // Obtener datos del préstamo
    const { data: prestamo } = await db.from("prestamos").select("*").eq("id", prestamoId).single();
    const { data: cuota } = await db.from("cuotas").select("valor").eq("id", cuotaId).single();

    const nuevoPagado = Number(prestamo.total_pagado || 0) + Number(cuota.valor);
    const totalPagar = Number(prestamo.total_pagar);

    const nuevoEstado = (nuevoPagado >= totalPagar - 0.01) ? "cancelado" : "activo";

    // Actualizar préstamo
    await db.from("prestamos").update({
      total_pagado: nuevoPagado,
      estado: nuevoEstado
    }).eq("id", prestamoId);

    cargarPrestamos();
    alert("✅ Cuota marcada como pagada");

  } catch (err) {
    console.error(err);
    alert("❌ Error al pagar la cuota");
  }
};