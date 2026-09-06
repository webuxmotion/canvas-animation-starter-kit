import Ball from "./Ball.js";

export default class Spring {
  constructor({ screen }) {
    this.spring = 0.1;
    this.kd = 0.30;
    this.ki = 0.00;
    this.ball = new Ball({ color: "#2f9f63" });
    this.target = {
      x: screen.width / 2,
      y: screen.height / 2 + 200,
    };
    this.ball.x = 0;
    this.ball.y = this.target.y;
    this.vx = 0;
    
    this.lastDx = this.target.x - this.ball.x;
    this.intDx = 0;
  }

  tick({ ctx, delta }) {
    const dx = this.target.x - this.ball.x;
    
    const dDx = (dx - this.lastDx) / (delta * 60);
    this.lastDx = dx;

    this.intDx += dx * (delta * 60);
    this.intDx = Math.max(-100, Math.min(100, this.intDx));

    const ax = (dx * this.spring + dDx * this.kd + this.intDx * this.ki) * (delta * 60);

    this.vx += ax;
    this.ball.x += this.vx * (delta * 60);

    if (Math.abs(this.vx) < 0.001 && Math.abs(dx) < 0.1) {
      this.vx = 0;
      this.ball.x = this.target.x;
    }

    this.ball.draw(ctx);
  }
}
