import Ball from "./Ball.js";

export default class Spring {
  constructor({ screen }) {
    this.spring = 0.03;
    this.ball = new Ball({ color: "#2f9f63" });
    this.target = {
      x: screen.width / 2,
      y: screen.height / 2 + 200,
    };
    this.ball.x = 0;
    this.ball.y = this.target.y;
    this.vx = 0;
    this.friction = 0.95;
  }

  tick({ ctx, delta }) {
    const dx = this.target.x - this.ball.x;
    const ax = dx * this.spring * (delta * 60);

    this.vx += ax;

    const currentFriction = Math.pow(this.friction, delta * 60);
    this.vx *= currentFriction;

    this.ball.x += this.vx * (delta * 60);

    if (Math.abs(this.vx) < 0.001 && Math.abs(dx) < 0.1) {
      this.vx = 0;
      this.ball.x = this.target.x;
    }

    this.ball.draw(ctx);
  }
}
