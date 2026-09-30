export class Joystick {
  constructor(el) {
    this.el = el;
    this.knob = el.querySelector('.knob');
    this.x = 0;
    this.y = 0;
    let id = null;
    const move = (e) => {
      const r = el.getBoundingClientRect(), radius = r.width / 2;
      let dx = e.clientX - (r.left + radius), dy = e.clientY - (r.top + radius);
      const len = Math.hypot(dx, dy);
      if (len > radius) { dx *= radius / len; dy *= radius / len; }
      this.x = dx / radius;
      this.y = dy / radius;
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const release = () => {
      id = null;
      this.x = this.y = 0;
      this.knob.style.transform = '';
    };
    el.addEventListener('pointerdown', (e) => { id = e.pointerId; el.setPointerCapture(id); move(e); });
    el.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
  }
}
