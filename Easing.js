import Ball from "./Ball.js";

export default class Easing {
  constructor({ screen }) {
    this.easing = 0.1;
    this.targetX = screen.width / 2;
    this.targetY = screen.height / 2;
    this.ball = new Ball({ color: "#2f9f63" });
    this.ball.x = 200;
    this.ball.y = 200;
  }

  tick({ ctx, delta, ship }) {
    const dx = ship.x - this.ball.x;
    const dy = ship.y - this.ball.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 1) {
      const currentEasing = 1 - Math.pow(1 - this.easing, delta * 60);

      this.ball.x += (ship.x - this.ball.x) * currentEasing;
      this.ball.y += (ship.y - this.ball.y) * currentEasing;
    }

    this.ball.draw(ctx);
  }
}
