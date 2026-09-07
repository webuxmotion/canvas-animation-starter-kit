export class PidChart {
  constructor(ctx, x, y, width, height) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.history = [];
    this.recordDuration = 5000;
    this.colors = {
      error: 'rgba(255, 82, 82, 0.65)',
      pTerm: 'rgba(76, 175, 80, 0.65)',
      iTerm: 'rgba(33, 150, 243, 0.65)',
      dTerm: 'rgba(224, 64, 251, 0.65)'
    };
  }

  predictTrajectory(Kp, Ki, Kd, wind, startX, targetX) {
    this.history = [];
    
    let simX = startX;
    let simVx = 0;
    let simIntegral = 0;
    let simPrevError = targetX - simX;

    const fps = 60;
    const dt = 1000 / fps;
    const totalFrames = (this.recordDuration / 1000) * fps;

    for (let frame = 0; frame < totalFrames; frame++) {
      const elapsed = frame * dt;
      const diff = targetX - simX;
      
      simIntegral += diff;
      simIntegral = Math.max(-200, Math.min(200, simIntegral));
      
      const pTerm = diff * Kp;
      const iTerm = simIntegral * Ki;
      const dTerm = (diff - simPrevError) * Kd;
      
      const ax = pTerm + iTerm + dTerm;
      simPrevError = diff;
      
      simVx += ax + wind;
      simX += simVx;

      this.history.push({
        time: elapsed,
        error: diff,
        pTerm: pTerm,
        iTerm: iTerm,
        dTerm: dTerm
      });
    }
  }

  draw() {
    const ctx = this.ctx;
    const centerY = this.y + this.height / 2;
    
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(85, 81, 106, 0.3)';
    ctx.moveTo(this.x, centerY);
    ctx.lineTo(this.x + this.width, centerY);
    ctx.stroke();

    this.drawLegend();

    if (this.history.length < 2) return;

    this.drawMetricLine('error');
    this.drawMetricLine('pTerm');
    this.drawMetricLine('iTerm');
    this.drawMetricLine('dTerm');
  }

  drawMetricLine(key) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.strokeStyle = this.colors[key];
    ctx.lineWidth = 2.5;

    const maxVal = 800;
    const centerY = this.y + this.height / 2;

    this.history.forEach((point, index) => {
      const graphX = this.x + (point.time / this.recordDuration) * this.width;
      let val = point[key];
      
      if (key === 'pTerm' || key === 'iTerm') {
        val *= 10;
      } else if (key === 'dTerm') {
        val *= 0.5;
      }

      const graphY = centerY - (val / maxVal) * (this.height / 2);

      if (index === 0) {
        ctx.moveTo(graphX, graphY);
      } else {
        ctx.lineTo(graphX, graphY);
      }
    });

    ctx.stroke();
  }

  drawLegend() {
    const ctx = this.ctx;
    ctx.font = '12px sans-serif';
    const labels = [
      { text: 'Помилка (Error)', color: this.colors.error },
      { text: 'P-term (x10)', color: this.colors.pTerm },
      { text: 'I-term (x10)', color: this.colors.iTerm },
      { text: 'D-term (x0.5)', color: this.colors.dTerm }
    ];

    labels.forEach((label, i) => {
      ctx.fillStyle = label.color;
      ctx.fillRect(this.x + 20 + i * 140, this.y + this.height - 30, 12, 12);
      ctx.fillStyle = 'rgba(166, 162, 188, 0.8)';
      ctx.fillText(label.text, this.x + 37 + i * 140, this.y + this.height - 20);
    });
    
    ctx.fillStyle = '#ffd54f';
    ctx.fillText('🔮 ПРОГНОЗ ГРАФІКА (5 секунд)', this.x + this.width - 240, this.y + 30);
  }
}
