/**
 * Heap binária mínima de pares (chave numérica, vértice) sobre arrays
 * tipados. Usada com "remoção preguiçosa": um vértice pode entrar várias
 * vezes e entradas obsoletas são descartadas ao sair (comparando com dist).
 */
export class MinHeap {
  private keys: Float64Array;
  private vals: Int32Array;
  size = 0;

  constructor(capacity = 16) {
    this.keys = new Float64Array(Math.max(4, capacity));
    this.vals = new Int32Array(Math.max(4, capacity));
  }

  push(key: number, val: number): void {
    if (this.size === this.keys.length) this.grow();
    let i = this.size++;
    const keys = this.keys;
    const vals = this.vals;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p] <= key) break;
      keys[i] = keys[p];
      vals[i] = vals[p];
      i = p;
    }
    keys[i] = key;
    vals[i] = val;
  }

  /** Chave do topo (Infinity se vazia). */
  peekKey(): number {
    return this.size > 0 ? this.keys[0] : Infinity;
  }

  /** Remove o topo; ler `poppedKey` para a chave. Pré-condição: size > 0. */
  pop(): number {
    const keys = this.keys;
    const vals = this.vals;
    const topVal = vals[0];
    this.poppedKey = keys[0];
    const n = --this.size;
    if (n > 0) {
      const key = keys[n];
      const val = vals[n];
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && keys[c + 1] < keys[c]) c++;
        if (keys[c] >= key) break;
        keys[i] = keys[c];
        vals[i] = vals[c];
        i = c;
      }
      keys[i] = key;
      vals[i] = val;
    }
    return topVal;
  }

  poppedKey = 0;

  private grow(): void {
    const keys = new Float64Array(this.keys.length * 2);
    const vals = new Int32Array(this.vals.length * 2);
    keys.set(this.keys);
    vals.set(this.vals);
    this.keys = keys;
    this.vals = vals;
  }
}
