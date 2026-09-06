import Checkbox from "./Checkbox.js";
import Slider from "./Slider.js";

export default class TelemetryUI {
  static drawDesktop(ctx, screen, pid) {
    ctx.fillStyle = "#2e7d32"; 
    ctx.fillRect(250, 0, screen.width - 250, screen.height);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 250, screen.height);
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(250, 0); ctx.lineTo(250, screen.height); ctx.stroke();

    for (const element of pid.uiElements) {
      element.draw(ctx);
    }

    ctx.save();
    ctx.fillStyle = pid.autotuner.isActive ? "#e67e22" : "#34495e";
    ctx.beginPath();
    ctx.roundRect(pid.btnTuneZiegler.x, pid.btnTuneZiegler.y, pid.btnTuneZiegler.w, pid.btnTuneZiegler.h, 4);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      pid.autotuner.isActive ? "Сканування..." : pid.btnTuneZiegler.label, 
      pid.btnTuneZiegler.x + pid.btnTuneZiegler.w / 2, 
      pid.btnTuneZiegler.y + 20
    );
    ctx.restore();

    ctx.save();
    ctx.fillStyle = pid.twiddleTuner.isActive ? "#d35400" : "#34495e";
    ctx.beginPath();
    ctx.roundRect(pid.btnTuneTwiddle.x, pid.btnTuneTwiddle.y, pid.btnTuneTwiddle.w, pid.btnTuneTwiddle.h, 4);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      pid.twiddleTuner.isActive ? "Оптимізація..." : pid.btnTuneTwiddle.label, 
      pid.btnTuneTwiddle.x + pid.btnTuneTwiddle.w / 2, 
      pid.btnTuneTwiddle.y + 20
    );
    ctx.restore();
  }

  static drawMechanism(ctx, physics, originX, originY, targetAngle) {
    const endX = originX + Math.sin(physics.angle) * physics.length;
    const endY = originY + Math.cos(physics.angle) * physics.length;
    const targetEndX = originX + Math.sin(targetAngle) * physics.length;
    const targetEndY = originY + Math.cos(targetAngle) * physics.length;

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(originX, originY, physics.length, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = "#00e676";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(originX, originY); ctx.lineTo(targetEndX, targetEndY); ctx.stroke();

    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(originX, originY); ctx.lineTo(endX, endY); ctx.stroke();

    ctx.fillStyle = "#e74c3c";
    ctx.beginPath(); ctx.arc(endX, endY, 12 + physics.mass * 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = "#34495e";
    ctx.beginPath(); ctx.arc(originX, originY, 22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  static drawOscilloscope(ctx, screen, pid) {
    ctx.save();
    const isPidActive = pid.uiElements[0].checked;

    const graph = { x: 270, y: screen.height - 235, width: screen.width - 310, height: 200 };

    ctx.font = "bold 16px Arial";
    ctx.fillStyle = pid.autotuner.isActive ? "#e67e22" : (isPidActive ? "#00e676" : "#ff5252");
    ctx.fillText(pid.autotuner.isActive ? `РЕЖИМ: АВТОНАЛАШТУВАННЯ ЗІГЛЕРА-НІКОЛСА` : `РЕЖИМ: ${isPidActive ? "ПІД-СТАБІЛІЗАЦІЯ" : "НАЇВНИЙ МОТОР"}`, graph.x, graph.y - 65);

    ctx.fillStyle = "#ffffff";
    ctx.font = "13px Arial";
    ctx.fillText(`Натисніть ПРОБІЛ, щоб симулювати удар по нозі вантажу`, graph.x, graph.y - 45);

    ctx.font = "bold 12px Arial";
    ctx.fillStyle = "#3498db"; ctx.fillText("■ P (Пропорційна)", graph.x, graph.y - 20);
    ctx.fillStyle = "#9b59b6"; ctx.fillText("■ I (Інтегральна)", graph.x + 130, graph.y - 20);
    ctx.fillStyle = "#e74c3c"; ctx.fillText("■ D (Диференціальна)", graph.x + 250, graph.y - 20);

    ctx.fillStyle = "#0c0c10";
    ctx.fillRect(graph.x, graph.y, graph.width, graph.height);
    ctx.strokeStyle = "#444df2";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(graph.x, graph.y, graph.width, graph.height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.beginPath(); ctx.moveTo(graph.x, graph.y + graph.height / 2); ctx.lineTo(graph.x + graph.width, graph.y + graph.height / 2); ctx.stroke();

    if (pid.history.length > 1) {
      const drawLine = (key, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < pid.history.length; i++) {
          const pX = graph.x + (i / pid.maxHistoryLength) * graph.width;
          const pY = graph.y + graph.height / 2 - (pid.history[i][key] * (graph.height / 55));
          const clampY = Math.max(graph.y + 4, Math.min(graph.y + graph.height - 4, pY));
          if (i === 0) ctx.moveTo(pX, clampY); else ctx.lineTo(pX, clampY);
        }
        ctx.stroke();
      };

      drawLine("p", "#3498db");
      if (isPidActive && !pid.autotuner.isActive) {
        drawLine("i", "#9b59b6");
        drawLine("d", "#e74c3c");
      }
    }
    ctx.restore();
  }
}
