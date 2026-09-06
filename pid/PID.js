import PIDController from "./PIDController.js";
import Slider from "./Slider.js";
import Checkbox from "./Checkbox.js";
import PIDAutotuner from "./PIDAutotuner.js";
import PIDTwiddleTuner from "./PIDTwiddleTuner.js";

// Імпорт підмодулів архітектури
import PhysicsEngine from "./PhysicsEngine.js";
import InputHandler from "./InputHandler.js";
import TelemetryUI from "./TelemetryUI.js";

export default class PID {
  constructor({ screen }) {
    this.originX = screen.width * 0.65;
    this.originY = screen.height * 0.38;
    this.targetAngle = Math.PI / 2;

    // Підключаємо ізольовані підсистеми
    this.physics = new PhysicsEngine();
    this.pid = new PIDController(12.0, 3.5, 4.0);
    this.autotuner = new PIDAutotuner();
    this.twiddleTuner = new PIDTwiddleTuner();

    // Дві окремі інженерні кнопки на панелі інтерфейсу
    this.btnTuneZiegler = {
      x: 25,
      y: 440,
      w: 180,
      h: 32,
      label: "🤖 Тюнінг: Ziegler",
    };
    this.btnTuneTwiddle = {
      x: 25,
      y: 480,
      w: 180,
      h: 32,
      label: "🎯 Тюнінг: Twiddle",
    };

    this.history = [];
    this.maxHistoryLength = 200;
    this.triggerPush = false;

    // Створюємо елементи керування на Canvas
    this.uiElements = [
      new Checkbox({
        x: 25,
        y: 35,
        label: "Увімкнути ПІД-регулятор",
        checked: true,
      }),
      new Slider({
        x: 25,
        y: 100,
        width: 180,
        min: 0,
        max: 40,
        step: 0.5,
        value: 12.0,
        label: "Kp (Пропорційний)",
      }),
      new Slider({
        x: 25,
        y: 155,
        width: 180,
        min: 0,
        max: 15,
        step: 0.1,
        value: 3.5,
        label: "Ki (Інтегральний)",
      }),
      new Slider({
        x: 25,
        y: 210,
        width: 180,
        min: 0,
        max: 15,
        step: 0.1,
        value: 4.0,
        label: "Kd (Диференціальний)",
      }),
      new Slider({
        x: 25,
        y: 285,
        width: 180,
        min: 0.5,
        max: 8,
        step: 0.1,
        value: 2.0,
        label: "Маса вантажу (кг)",
      }),
      new Slider({
        x: 25,
        y: 340,
        width: 180,
        min: 60,
        max: 240,
        step: 5,
        value: 160,
        label: "Довжина ноги (пкс)",
      }),
      new Slider({
        x: 25,
        y: 395,
        width: 180,
        min: 0,
        max: 2000,
        step: 50,
        value: 981,
        label: "Гравітація",
      }),
    ];

    // Ініціалізуємо обробник миші/клавіатури (передаємо поточний екземпляр класу)
    const canvas = document.getElementById("canvas");
    if (canvas) new InputHandler(this, canvas);
  }

  update({ delta, screen, keys }) {
    this.originX = screen.width * 0.65;
    this.originY = screen.height * 0.38;

    // Поштовх пробілом через фізичний двигун
    if (this.triggerPush || keys?.Space || keys?.[" "]) {
      this.physics.applyPush();
      this.triggerPush = false;
      if (keys) {
        keys.Space = false;
        keys[" "] = false;
      }
    }

    // Розрахунок поточної помилки енкодера
    this.targetAngle = Math.atan2(
      Math.sin(this.targetAngle),
      Math.cos(this.targetAngle),
    );
    let error = this.targetAngle - this.physics.angle;
    error = Math.atan2(Math.sin(error), Math.cos(error));

    // Слідкуємо за повзунками маси/довжини/гравітації та передаємо дані у фізичний рушій
    this.physics.syncParams(
      this.uiElements[4].value,
      this.uiElements[5].value,
      this.uiElements[6].value,
    );

    const isPidActive = this.uiElements[0].checked;
    let currentSignals = { p: 0, i: 0, d: 0 };

    // --- КЕРУВАННЯ СЕРВОПРИВОДОМ ТА РОЗПОДІЛ МІЗКІВ МОТОРА ---
    // --- КЕРУВАННЯ СЕРВОПРИВОДОМ ТА РОЗПОДІЛ МІЗКІВ МОТОРА ---
    if (this.autotuner.isActive) {
      // 1. РЕЖИМ АВТОНАЛАШТУВАННЯ ZIEGLER-NICHOLS (Аналітичний)
      const tuneResults = this.autotuner.analyze(error, delta);
      if (tuneResults) {
        if (tuneResults.isFinished) {
          // Використовуємо Math.min(..., slider.max), щоб ручка не вилітала за рамки
          this.uiElements[1].value = this.pid.kp = Math.min(
            40.0,
            tuneResults.kp,
          );
          this.uiElements[2].value = this.pid.ki = Math.min(
            15.0,
            tuneResults.ki,
          );
          this.uiElements[3].value = this.pid.kd = Math.min(
            15.0,
            tuneResults.kd,
          );
        } else {
          this.pid.kp = tuneResults.kp;
          this.pid.ki = tuneResults.ki;
          this.pid.kd = tuneResults.kd;
        }
      }
      currentSignals = { p: error * this.pid.kp, i: 0, d: 0 };
      this.physics.motorTorque = Math.max(
        -this.physics.maxTorque,
        Math.min(
          this.physics.maxTorque,
          currentSignals.p * this.physics.inertia,
        ),
      );
    } else if (this.twiddleTuner.isActive) {
      // 2. РЕЖИМ АВТОНАЛАШТУВАННЯ TWIDDLE (ВИПРАВЛЕНО ІНДЕКСИ)
      const tuneResults = this.twiddleTuner.analyze(error, this.physics, delta);
      if (tuneResults) {
        if (tuneResults.isFinished) {
          // Чітко пишемо в повзунки за індексами, щоб не затерти масив UI елементів
          this.uiElements[1].value = this.pid.kp = tuneResults.kp;
          this.uiElements[2].value = this.pid.ki = tuneResults.ki;
          this.uiElements[3].value = this.pid.kd = tuneResults.kd;
        } else {
          this.pid.kp = tuneResults.kp;
          this.pid.ki = tuneResults.ki;
          this.pid.kd = tuneResults.kd;
        }
      }
      // Прораховуємо ПІД-сигнали під час тесту для рендерингу осцилографа
      const pidData = this.pid.calculate(error, delta);
      currentSignals = { p: pidData.p, i: pidData.i, d: pidData.d };
      this.physics.motorTorque = Math.max(
        -this.physics.maxTorque,
        Math.min(this.physics.maxTorque, pidData.output * this.physics.inertia),
      );
    } else if (isPidActive) {
      // 3. ЗВИЧАЙНИЙ СТАБІЛЬНИЙ РЕЖИМ ПІД
      const pidData = this.pid.calculate(error, delta);
      currentSignals = { p: pidData.p, i: pidData.i, d: pidData.d };
      this.physics.motorTorque = Math.max(
        -this.physics.maxTorque,
        Math.min(this.physics.maxTorque, pidData.output * this.physics.inertia),
      );
    } else {
      // 4. НАЇВНИЙ РЕЖИМ МОТОРА (Тільки Пропорційне зусилля)
      const naiveGain = 12.0;
      currentSignals = { p: error * naiveGain, i: 0, d: 0 };
      this.physics.motorTorque = Math.max(
        -this.physics.maxTorque,
        Math.min(
          this.physics.maxTorque,
          currentSignals.p * this.physics.inertia,
        ),
      );
      this.pid.reset();
    }

    // Розраховуємо фізику руху кадру на основі отриманого motorTorque
    this.physics.update(delta);

    // Запис логів для багатоканального осцилографа
    this.history.push(currentSignals);
    if (this.history.length > this.maxHistoryLength) this.history.shift();
  }

  draw(ctx, screen) {
    const currentScreen = screen || {
      width: ctx.canvas.width,
      height: ctx.canvas.height,
    };

    // Малюємо загальне робоче оточення та ліву білу панель зі змінними
    TelemetryUI.drawDesktop(ctx, currentScreen, this);

    // Рендеримо механічні елементи (вісь, орбіту цілі, ногу з червоною масою)
    TelemetryUI.drawMechanism(
      ctx,
      this.physics,
      this.originX,
      this.originY,
      this.targetAngle,
    );

    // Малюємо осцилограф крутних моментів у реальному часі та інформаційні тексти
    TelemetryUI.drawOscilloscope(ctx, currentScreen, this);
  }
}
