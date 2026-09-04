export default class InputHandler {
  #keys = {
    ArrowUp: false,
    ArrowLeft: false,
    ArrowDown: false,
    ArrowRight: false,
  };

  constructor() {
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);

    this._init();
  }

  get keys() {
    return this.#keys;
  }

  _init() {
    window.addEventListener("keydown", this._handleKeyDown);
    window.addEventListener("keyup", this._handleKeyUp);
  }

  _handleKeyDown(event) {
    if (event.code in this.#keys) {
      this.#keys[event.code] = true;
    }
  }

  _handleKeyUp(event) {
    if (event.code in this.#keys) {
      this.#keys[event.code] = false;
    }
  }

  destroy() {
    window.removeEventListener("keydown", this._handleKeyDown);
    window.removeEventListener("keyup", this._handleKeyUp);
  }
}
