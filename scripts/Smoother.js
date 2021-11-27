class Smoother {
    constructor(bufferSize = 10) {
        this.bufferSize = bufferSize;
        this.buffer = new Array(bufferSize);
        this.pointer = 0;
        this.total = 0;
    }
    clear() {
        this.pointer = 0;
        for (let i = 0; i < this.bufferSize; i++) {
            this.buffer[i] = 0;
        }
        this.total = 0;
    }
    getValue(value) {
        let oldest = this.buffer[this.pointer];
        this.total = this.total - oldest + value;
        this.buffer[this.pointer] = value;
        this.pointer++;
        if (this.pointer >= this.bufferSize) {
            this.pointer = 0;
        }
        return Math.floor(this.total / this.bufferSize);
    }
}
