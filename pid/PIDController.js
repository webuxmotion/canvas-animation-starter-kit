export default class PIDController {
  constructor(kp = 0, ki = 0, kd = 0) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
    
    this.integral = 0;
    this.previousError = 0;
    this.maxIntegral = 50; // Обмеження для запобігання інтегрального насичення
  }

  // Обчислює вихідне значення на основі поточної помилки та пройденого часу delta
  calculate(error, delta) {
    if (delta <= 0) return { output: 0, p: 0, i: 0, d: 0 };

    // P - Пропорційна
    const pSignal = this.kp * error;

    // I - Інтегральна (з обмеженням)
    this.integral += error * delta;
    this.integral = Math.max(-this.maxIntegral, Math.min(this.maxIntegral, this.integral));
    const iSignal = this.ki * this.integral;

    // D - Диференціальна
    const derivative = (error - this.previousError) / delta;
    const dSignal = this.kd * derivative;

    this.previousError = error;

    const totalOutput = pSignal + iSignal + dSignal;

    // Повертаємо загальний результат + кожну силу окремо
    return {
      output: totalOutput,
      p: pSignal,
      i: iSignal,
      d: dSignal
    };
  }

  reset() {
    this.integral = 0;
    this.previousError = 0;
  }
}
