import Ball from "./Ball.js";

export default class BallsComposer {
  constructor({ width, height, ballsCount = 20 }) {
    this.balls = [];
    this.ballsCount = ballsCount;

    this.#init({ width, height });
  }

  #init({ width, height }) {
    for (let i = 0; i < this.ballsCount; i++) {
      const ball = new Ball({ width, height });
      this.balls.push(ball);
    }
  }

  tick({ delta, ctx, width, height}) {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      ball.update({ delta });
      ball.draw(ctx);

      if (
        ball.x - ball.radius > width ||
        ball.x + ball.radius < 0 ||
        ball.y - ball.radius > height ||
        ball.y + ball.radius < 0
      ) {
        this.balls.splice(i, 1);
      }
    }
  }
}
