class AudioSplitter {
    constructor(audioBuffer, channel, trailSec) {
        this.bufferFl32 = new Float32Array(audioBuffer.length);
        this.bufferFl32.set(audioBuffer.getChannelData(channel));
        this.channel = channel;
        this.trailSec = trailSec;
        this.sampleRate = audioBuffer.sampleRate;
    }
    _blank(p, threshold) {
        return (Math.abs(this.bufferFl32[p]) < threshold);
    }
    _findTail(p, threshold) {
        let t = this._blank(p, threshold);
        let start = p;
        do {
            p++;
        } while((p <= this.bufferFl32.length) && (this._blank(p, threshold) == t));
        return p - 1;
    }

    splitWith(threshold, minBlankSec, minSoundSec) {
        let result = [[0, -10 * this.sampleRate]];        // Sentinel with 10 sec.
        let minBlank = Math.floor(minBlankSec * this.sampleRate);
        let minSound = Math.floor(minSoundSec * this.sampleRate);
        let ptr = 0;
        while (ptr < this.bufferFl32.length) {
            while (this._blank(ptr, threshold)) {   // Find the head of the sound
                ptr++;
            }
            let q = this._findTail(ptr, threshold); // Find the tail of the sound
            // If the preamble gap is too small, the combine the last two sounds.
            if ((ptr - result[result.length-1][1]) < minBlank) {
                result[result.length-1][1] = q;
            } else {
                result.push([ptr, q]);
            }
            ptr = q + 1;
        }
        // eliminate blip sounds
        return result.filter((val) => { return (val[1] - val[0]) >= minSound; }).map(item => [item[0], item[1] + minBlank]);
    }
    getBufferPortion(audioContext, numOfChannels, startPos, stopPos) {
        let arrayBuffer = audioContext.createBuffer(numOfChannels, stopPos - startPos + 1 + this.trailSec * this.sampleRate, this.sampleRate);
        for (let ch = 0; ch < numOfChannels; ch++) {
            let newBuffer = arrayBuffer.getChannelData(ch);
            for (let i = 0; i < newBuffer.length; i++) {
                newBuffer[i] = 0.0;
            }
            let d = 0;
            for (let s = startPos; s <= stopPos; s++) {
                newBuffer[d] = this.bufferFl32[s];
                d++;
            }
        }
        return arrayBuffer;
    }
}
