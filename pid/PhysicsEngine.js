export default class PhysicsEngine {
  constructor() {
    this.length = 160;        
    this.mass = 2.0;          
    this.gravity = 981;       
    this.inertia = this.mass * Math.pow(this.length, 2); 

    this.angle = 0;           
    this.angularVelocity = 0; 
    this.motorTorque = 0;     
    this.maxTorque = 5000000; 
  }

  syncParams(mass, length, gravity) {
    this.mass = mass;
    this.length = length;
    this.gravity = gravity;
    this.inertia = this.mass * Math.pow(this.length, 2);
  }

  applyPush() {
    this.angularVelocity += (Math.random() - 0.5) * 25;
  }

  update(delta) {
    // Формула: М_сумарний = М_мотора + М_гравітації
    const gravityTorque = -this.mass * this.gravity * this.length * Math.sin(this.angle);
    const netTorque = this.motorTorque + gravityTorque;
    const angularAcceleration = netTorque / this.inertia;

    this.angularVelocity += angularAcceleration * delta;
    this.angle += this.angularVelocity * delta;

    // Опір редуктора (тертя)
    this.angularVelocity *= Math.pow(0.97, delta * 60);
  }
}
