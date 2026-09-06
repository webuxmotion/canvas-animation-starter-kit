export default class Slider {
  constructor({ x, y, width, min, max, step, value, label }) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.min = min;
    this.max = max;
    this.step = step;
    this.value = value;
    this.label = label;
    
    this.height = 10;
    this.handleRadius = 8;
    this.isDragging = false;
  }

  draw(ctx) {
    ctx.save();
    
    // Текст-мітка над повзунком
    ctx.font = "13px Arial";
    ctx.fillStyle = "#333";
    ctx.fillText(`${this.label}: ${this.value.toFixed(1)}`, this.x, this.y - 8);

    // Доріжка повзунка
    ctx.fillStyle = "#ddd";
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 4);
    ctx.fill();

    // Розрахунок позиції ручки повзунка
    const ratio = (this.value - this.min) / (this.max - this.min);
    const handleX = this.x + ratio * this.width;
    const handleY = this.y + this.height / 2;

    // Ручка повзунка
    ctx.fillStyle = this.isDragging ? "#2980b9" : "#3498db";
    ctx.beginPath();
    ctx.arc(handleX, handleY, this.handleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  handleEvent(type, mouseX, mouseY) {
    const ratio = (this.value - this.min) / (this.max - this.min);
    const handleX = this.x + ratio * this.width;
    const handleY = this.y + this.height / 2;
    const dist = Math.hypot(mouseX - handleX, mouseY - handleY);

    if (type === "mousedown" && dist <= this.handleRadius + 4) {
      this.isDragging = true;
    }

    if (type === "mouseup") {
      this.isDragging = false;
    }

    if (type === "mousemove" && this.isDragging) {
      let relativeX = mouseX - this.x;
      relativeX = Math.max(0, Math.min(this.width, relativeX));
      
      let rawValue = this.min + (relativeX / this.width) * (this.max - this.min);
      // Округлення до кроку зміни (step)
      this.value = Math.round(rawValue / this.step) * this.step;
      this.value = Math.max(this.min, Math.min(this.max, this.value));
      return true; // Параметр змінився
    }
    return false;
  }
}
