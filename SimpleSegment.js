export default class SimpleSegment {
  constructor({ height = 100 }) {
    this.height = height;
    this.x = 0;
    this.y = 0;
    this.rotation = 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(this.height, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.height, 0, 5, 0, Math.PI * 2, 0);
    ctx.stroke();

    ctx.restore();
  }

  getPin() {
    return {
      x: this.x + Math.cos(this.rotation) * this.height,
      y: this.y + Math.sin(this.rotation) * this.height,
    };
  }
}
