import Ball from "./Ball.js";

export default class BallsComposer {
  constructor({ screen, ballsCount = 20 }) {
    this.balls = [];
    this.ballsCount = ballsCount;

    this.#init({ screen });
  }

  #init({ screen }) {
    for (let i = 0; i < this.ballsCount; i++) {
      const ball = new Ball({ screen });
      this.balls.push(ball);
    }
  }

  tick({ delta, ctx, screen }) {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      ball.update({ delta });
      ball.draw(ctx);

      if (
        ball.x - ball.radius > screen.width ||
        ball.x + ball.radius < 0 ||
        ball.y - ball.radius > screen.height ||
        ball.y + ball.radius < 0
      ) {
        this.balls.splice(i, 1);
      }
    }
  }
}
