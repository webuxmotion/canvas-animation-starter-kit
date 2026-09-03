const RIGHT = "RIGHT";
const BOTTOM = "BOTTOM";
const LEFT = "LEFT";
const TOP = "TOP";

export class SquareAnimation {
  constructor(speed = 1000, initialSize = 20) {
    this.speed = speed;
    this.size = initialSize;
    this.x = 0;
    this.y = 0;
    this.dirState = RIGHT;
  }

  update(delta, width, height) {
    const step = this.speed * delta;

    switch (this.dirState) {
      case RIGHT:
        this.x += step;
        if (this.x + this.size >= width) {
          this.x = width - this.size;
          this.dirState = BOTTOM;
        }
        break;

      case BOTTOM:
        this.y += step;
        if (this.y + this.size >= height) {
          this.y = height - this.size;
          this.dirState = LEFT;
        }
        break;

      case LEFT:
        this.x -= step;
        if (this.x <= 0) {
          this.x = 0;
          this.dirState = TOP;
        }
        break;

      case TOP:
        this.y -= step;
        if (this.y <= 0) {
          this.y = 0;
          this.size += 10;
          this.dirState = RIGHT;
        }
        break;
    }
  }

  draw(ctx) {
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}
