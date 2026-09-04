export default class Ball {
  constructor({
    screen,
    radius = 30,
    maxSpeed = 200,
    color = "#E06D53",
  }) {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.color = color;
    this.maxSpeed = maxSpeed;
  }

  update({ delta }) {
    this.x += this.vx * delta;
    this.y += this.vy * delta;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2, 0);
    ctx.fill();
    ctx.restore();
  }
}
