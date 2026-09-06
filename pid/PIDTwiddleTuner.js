export default class PIDTwiddleTuner {
  constructor() {
    this.isActive = false;
    this.state = "IDLE"; 
    
    this.p = [12.0, 3.5, 4.0]; 
    this.dp = [3.0, 0.8, 0.8]; 
    
    this.limits = [
      [0.0, 40.0],  
      [0.0, 15.0],  
      [0.0, 15.0]   
    ];

    this.paramIndex = 0; 
    this.subState = 0;   
    
    this.bestError = Infinity;
    this.currentErrorSum = 0;
    
    this.timer = 0;
    this.testDuration = 1.5; 
    this.tolerance = 0.05;   
    
    this.iterationCount = 0;
  }

  start(currentKp, currentKi, currentKd) {
    this.isActive = true;
    this.state = "RESET_POS";
    
    this.p = [
      Math.max(this.limits[0][0], Math.min(this.limits[0][1], currentKp)),
      Math.max(this.limits[1][0], Math.min(this.limits[1][1], currentKi)),
      Math.max(this.limits[2][0], Math.min(this.limits[2][1], currentKd))
    ];
    
    this.dp = [4.0, 1.0, 1.0]; 
    this.paramIndex = 0;
    this.subState = 0;
    this.bestError = Infinity;
    this.iterationCount = 0;
    this.timer = 0;

    console.log("%c🚀 СТАРТ АВТОНАЛАШТУВАННЯ TWIDDLE (БЕЗПЕЧНІ МЕЖІ)", "background: #222; color: #00e676; font-size: 14px; padding: 4px;");
  }

  getCoefficients() {
    return { kp: this.p[0], ki: this.p[1], kd: this.p[2] };
  }

  clampParameters() {
    for (let i = 0; i < 3; i++) {
      this.p[i] = Math.max(this.limits[i][0], Math.min(this.limits[i][1], this.p[i]));
    }
  }

  analyze(error, physics, delta) {
    if (!this.isActive) return null;

    if (this.state === "RESET_POS") {
      physics.motorTorque = (0 - physics.angle) * 35 * physics.inertia;
      
      if (Math.abs(physics.angle) < 0.05 && Math.abs(physics.angularVelocity) < 0.1) {
        this.state = "TESTING";
        this.currentErrorSum = 0;
        this.timer = 0;
        physics.angularVelocity = 8.5; 
      }
      return this.getCoefficients();
    }

    if (this.state === "TESTING") {
      this.timer += delta;
      this.currentErrorSum += Math.abs(error) * delta;

      if (this.timer >= this.testDuration) {
        this.state = "EVALUATING";
      }
      return this.getCoefficients();
    }

    if (this.state === "EVALUATING") {
      this.iterationCount++;
      const idx = this.paramIndex;
      const paramNames = ["Kp", "Ki", "Kd"];

      console.log(`%c[Ітерація #${this.iterationCount}] Тест для ${paramNames[idx]} (${this.subState === 0 ? 'Плюс-крок' : 'Мінус-крок'})`, "color: #3498db; font-weight: bold;");
      console.log(`> Поточні параметри: Kp=${this.p[0].toFixed(2)}, Ki=${this.p[1].toFixed(2)}, Kd=${this.p[2].toFixed(2)}`);
      console.log(`> Похибка тесту (IAE): ${this.currentErrorSum.toFixed(4)} (Поточний рекорд: ${this.bestError === Infinity ? 'немає' : this.bestError.toFixed(4)})`);

      if (this.bestError === Infinity) {
        this.bestError = this.currentErrorSum;
        this.p[idx] += this.dp[idx];
        this.clampParameters(); 
        this.subState = 0; 
        this.state = "RESET_POS";
        return this.getCoefficients();
      }

      if (this.subState === 0) {
        if (this.currentErrorSum < this.bestError) {
          this.bestError = this.currentErrorSum;
          this.dp[idx] *= 1.1; 
          this.nextParameter();
        } else {
          this.p[idx] -= 2 * this.dp[idx];
          this.clampParameters(); 
          this.subState = 1; 
        }
      } else if (this.subState === 1) {
        if (this.currentErrorSum < this.bestError) {
          this.bestError = this.currentErrorSum;
          this.dp[idx] *= 1.1;
        } else {
          this.p[idx] += this.dp[idx];
          this.dp[idx] *= 0.8;
          this.clampParameters(); 
        }
        this.nextParameter();
      }

      const sumDp = this.dp[0] + this.dp[1] + this.dp[2];
      
      if (sumDp < this.tolerance || this.iterationCount > 45) {
        this.state = "DONE";
        this.isActive = false;
        
        console.log("%c🏁 АВТОНАЛАШТУВАННЯ TWIDDLE УСПІШНО ЗАВЕРШЕНО!", "background: #222; color: #ffb703; font-size: 14px; padding: 4px;");
        console.log(`%cОптимальні інженерні коефіцієнти: Kp=${this.p[0].toFixed(2)}, Ki=${this.p[1].toFixed(2)}, Kd=${this.p[2].toFixed(2)}`, "color: #00e676; font-size: 12px; font-weight: bold;");
        
        return { ...this.getCoefficients(), isFinished: true };
      }

      this.state = "RESET_POS";
      return this.getCoefficients();
    }

    return null;
  }

  nextParameter() {
    this.paramIndex = (this.paramIndex + 1) % 3;
    this.p[this.paramIndex] += this.dp[this.paramIndex];
    this.clampParameters(); 
    this.subState = 0;
  }
}
