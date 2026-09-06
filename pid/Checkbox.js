export default class Checkbox {
  constructor({ x, y, size = 18, label, checked = true }) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.label = label;
    this.checked = checked;
  }

  draw(ctx) {
    ctx.save();

    // Квадрат рамки
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.size, this.size, 3);
    ctx.stroke();

    // Якщо активний — малюємо галочку всередині
    if (this.checked) {
      ctx.fillStyle = "#2ecc71";
      ctx.beginPath();
      ctx.roundRect(this.x + 3, this.y + 3, this.size - 6, this.size - 6, 2);
      ctx.fill();
    }

    // Текст поруч
    ctx.font = "bold 14px Arial";
    ctx.fillStyle = "#333";
    ctx.fillText(this.label, this.x + this.size + 10, this.y + this.size / 2 + 5);

    ctx.restore();
  }

  handleEvent(type, mouseX, mouseY) {
    if (type === "mousedown") {
      if (
        mouseX >= this.x &&
        mouseX <= this.x + this.size &&
        mouseY >= this.y &&
        mouseY <= this.y + this.size
      ) {
        this.checked = !this.checked;
        return true; // Стан змінився
      }
    }
    return false;
  }
}
