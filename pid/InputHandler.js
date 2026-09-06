export default class InputHandler {
  constructor(pidInstance, canvas) {
    this.pid = pidInstance;
    this.#initEvents(canvas);
  }

  #initEvents(canvas) {
    window.addEventListener("keydown", (e) => {
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        this.pid.triggerPush = true;
      }
    });

    const handleAllEvents = (type, e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let uiCaptured = false;
      
      // Повзунки працюють, лише якщо не запущено жодного автотюнера
      if (!this.pid.autotuner.isActive && !this.pid.twiddleTuner.isActive) {
        for (const element of this.pid.uiElements) {
          if (element.handleEvent(type, mouseX, mouseY)) {
            uiCaptured = true;
          }
        }
      }

      // Перевірка кліку на кнопку Ziegler-Nichols
      if (type === "mousedown" && !this.pid.autotuner.isActive && !this.pid.twiddleTuner.isActive) {
        const btn = this.pid.btnTuneZiegler;
        if (mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h) {
          this.pid.uiElements[0].checked = true; // Увімкнути ПІД чекбокс
          this.pid.autotuner.start();
          this.pid.targetAngle = Math.PI / 2; // Перевести в горизонталь
          uiCaptured = true;
        }
      }

      // Перевірка кліку на кнопку Twiddle
      if (type === "mousedown" && !this.pid.autotuner.isActive && !this.pid.twiddleTuner.isActive) {
        const btn = this.pid.btnTuneTwiddle;
        if (mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h) {
          this.pid.uiElements[0].checked = true; // Увімкнути ПІД чекбокс
          this.pid.twiddleTuner.start(this.pid.pid.kp, this.pid.pid.ki, this.pid.pid.kd);
          this.pid.targetAngle = 0; // Для тесту Twiddle фіксуємо ціль внизу
          uiCaptured = true;
        }
      }

      // Клік миші по робочій зоні змінює цільовий кут ноги
      if (!uiCaptured && !this.pid.autotuner.isActive && !this.pid.twiddleTuner.isActive && (type === "mousedown" || (type === "mousemove" && e.buttons === 1))) {
        if (mouseX > 250) { 
          const dx = mouseX - this.pid.originX;
          const dy = mouseY - this.pid.originY;
          this.pid.targetAngle = Math.atan2(dx, dy);
        }
      }
    };

    canvas.addEventListener("mousedown", (e) => handleAllEvents("mousedown", e));
    canvas.addEventListener("mousemove", (e) => handleAllEvents("mousemove", e));
    window.addEventListener("mouseup", (e) => handleAllEvents("mouseup", e));
  }
}
