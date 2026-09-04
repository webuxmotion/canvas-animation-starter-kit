import Ball from "./Ball.js";

export default class Fountain {
  constructor({ screen, ballsCount = 20, color = "white" }) {
    this.balls = [];
    this.ballsCount = ballsCount;
    this.color = color;
    this.radius = 3;
    this.gravity = 300;

    this.#init({ screen });
  }

  #init({ screen }) {
    for (let i = 0; i < this.ballsCount; i++) {
      const ball = new Ball({ screen, color: this.color, radius: this.radius });
      this.setBallRandomParams({ ball, screen });
      this.balls.push(ball);
    }
  }

  tick({ delta, ctx, screen }) {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      ball.vy += this.gravity * delta;
      ball.update({ delta });
      ball.draw(ctx);

      if (ball.y - ball.radius > screen.height) {
        this.setBallRandomParams({ ball, screen });
      }
    }
  }

  setBallRandomParams({ ball, screen }) {
    ball.x = screen.width / 2;
    ball.y = screen.height + Math.random() * 200;

    this.setRandomVelocity({ ball });
  }

  setRandomVelocity({ ball }) {
    ball.vx = Math.random() * -70 + 35;
    ball.vy = Math.random() * -500;
  }
}
