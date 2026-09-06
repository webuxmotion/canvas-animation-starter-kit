export default class PIDAutotuner {
  constructor() {
    this.isActive = false;
    this.state = "IDLE"; // Стани: IDLE, TUNING_KP, CALCULATING, DONE
    this.testKp = 1.0;
    this.peaks = [];
    this.lastError = 0;
    this.lastSign = 0;
    this.timer = 0;
    this.peakTimer = 0;
    
    // Результати автотюнінгу
    this.recommendedKp = 0;
    this.recommendedKi = 0;
    this.recommendedKd = 0;
  }

  start() {
    this.isActive = true;
    this.state = "TUNING_KP";
    this.testKp = 2.0; // Починаємо з невеликого зусилля
    this.peaks = [];
    this.timer = 0;
    this.peakTimer = 0;
  }

  // Функція аналізує поведінку системи на кожному кадрі
  analyze(error, delta) {
    if (!this.isActive) return null;
    
    this.timer += delta;
    this.peakTimer += delta;

    if (this.state === "TUNING_KP") {
      // Визначаємо перетин нуля (коли нога проходить крізь ціль)
      const currentSign = Math.sign(error);
      if (this.lastSign !== 0 && currentSign !== this.lastSign) {
        // Записуємо час між коливаннями для визначення періоду (Pu)
        if (this.peaks.length > 0) {
          this.peaks.push({ time: this.peakTimer, amplitude: Math.abs(this.lastError) });
        } else {
          this.peaks.push({ time: this.peakTimer, amplitude: Math.abs(this.lastError) });
        }
        this.peakTimer = 0;
      }
      this.lastSign = currentSign;
      this.lastError = error;

      // Якщо коливання загасають, плавно збільшуємо Kp
      if (this.timer > 2.0) { // кожні 2 секунди перевіряємо стабільність
        if (this.peaks.length < 4) {
          this.testKp += 1.5; // Нога занадто швидко зупиняється -> додаємо сили
          this.peaks = [];
        } else {
          // Перевіряємо, чи амплітуда коливань стала постійною (автоколивання)
          const amp1 = this.peaks[this.peaks.length - 1].amplitude;
          const amp2 = this.peaks[this.peaks.length - 2].amplitude;
          
          if (Math.abs(amp1 - amp2) < 0.1 && amp1 > 0.05) {
            this.state = "CALCULATING";
          } else {
            this.testKp += 0.5;
            this.peaks = [];
          }
        }
        this.timer = 0;
      }

      // Повертаємо проміжне значення мотора (працює лише Kp)
      return { kp: this.testKp, ki: 0, kd: 0 };
    }

    if (this.state === "CALCULATING") {
      // Класичні формули Зіглера-Ніколса:
      const Ku = this.testKp; // Критичний коефіцієнт
      
      // Рахуємо середній період критичних коливань (Pu)
      let totalPeriod = 0;
      for (let i = 1; i < this.peaks.length; i++) {
        totalPeriod += this.peaks[i].time;
      }
      const Pu = (totalPeriod / (this.peaks.length - 1)) * 2; // Повний цикл коливання

      // Розрахунок фінальних параметрів ПІД за класичною матрицею
      this.recommendedKp = 0.6 * Ku;
      this.recommendedKi = 1.2 * Ku / (Pu || 1);
      this.recommendedKd = 0.075 * Ku * (Pu || 1);

      this.state = "DONE";
      this.isActive = false;

      return {
        kp: this.recommendedKp,
        ki: this.recommendedKi,
        kd: this.recommendedKd,
        isFinished: true
      };
    }

    return null;
  }
}
