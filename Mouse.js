export default class Mouse {
  constructor(element) {
    this.x = 0;
    this.y = 0;
    this.event = null;
    this.isOutside = false;

    this._captureMouse(element);
  }

  _captureMouse(element) {
    element.addEventListener('mousemove', (event) => {
      const rect = element.getBoundingClientRect();

      this.x = event.clientX - rect.left;
      this.y = event.clientY - rect.top;
      this.event = event;
      this.isOutside = false;
    });

    element.addEventListener('mouseleave', (event) => {
      this.isOutside = true;
    });
  }
}