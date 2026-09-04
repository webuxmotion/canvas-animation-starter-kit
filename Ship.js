export default class Ship {
  constructor(width, height) {
    this.x = width / 2;
    this.y = height / 2;
    this.angle = 0;
    this.rotationSpeed = Math.PI * 2;
    this.engineOn = false;
    this.thrust = 0;
    this.vx = 0;
    this.vy = 0;
  }

  update({ delta, width, height, keys }) {
    if (keys.ArrowRight && !keys.ArrowLeft) {
      this.angle += this.rotationSpeed * delta;
    }
    if (keys.ArrowLeft && !keys.ArrowRight) {
      this.angle -= this.rotationSpeed * delta;
    }

    this.engineOn = keys.ArrowUp;

    if (keys.ArrowUp) {
      this.thrust = 1000;
    } else {
      this.thrust = 0;
    }

    const ax = Math.cos(this.angle - Math.PI / 2) * this.thrust;
    const ay = Math.sin(this.angle - Math.PI / 2) * this.thrust;

    this.vx += ax * delta;
    this.vy += ay * delta;

    this.x += this.vx * delta;
    this.y += this.vy * delta;

    if (this.x > width) this.x = 0;
    if (this.x < 0) this.x = width;
    if (this.y > height) this.y = 0;
    if (this.y < 0) this.y = height;

  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.moveTo(8, 20);
    ctx.lineTo(0, this.engineOn ? 60 : 30);
    ctx.lineTo(-8, 20);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(25, 30);
    ctx.lineTo(0, 20);
    ctx.lineTo(-25, 30);
    ctx.lineTo(0, -30);
    ctx.fill();

    ctx.fillRect(15, -5, 6, 25);
    ctx.fillRect(-15 - 6, -5, 6, 25);

    ctx.restore();
  }
}
