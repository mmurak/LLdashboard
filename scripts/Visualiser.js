/* Web Audioを用いたスペクトログラムの描画部分については BVE Workshop 様のページ（ https://bvews.jpn.org/articles/spectrogram-by-web-audio-api.html ）で学習させていただき、該当部分のコードを借用しています。　ありがとうございます。 */
class Visualiser {
    constructor(spectrumCanvas, stressCanvas,
            audioContext, fftSize = 4096,
            minDec = -120, maxDec = -30,
            smoothingTimeConstant = 0,
            speed = 2,
            colorMap = [{r: 0, g: 0, b: 255}, {r: 255, g: 255, b: 0}]) {
        this.spectrumCanvas = spectrumCanvas;
        this.spectrumCanvasCtx = spectrumCanvas.getContext("2d");
        this.analyser = audioContext.createAnalyser();
        this.analyser.fftSize = fftSize;
        this.analyser.maxDecibels = maxDec;
        this.analyser.minDecibels = minDec;
        this.analyser.smoothingTimeConstant = smoothingTimeConstant;
        this.colorMap = this._generateColorMap(colorMap);
        this.playingFlag = false;
        this.renderingPoint = 0;
        this.stressCanvas = stressCanvas;
        this.stressCanvasCtx = stressCanvas.getContext("2d");
        this.magFactor = this.stressCanvas.height / 256.0;
        this.smoother = new Smoother(3);
        this.tp = speed;
    }
    _generateColorMap(darkLight) {
        let dark = darkLight[0];
        let light = darkLight[1];
        const result = [];
        for (let i = 0; i < 256; i++) {
            let rate = i / (256 - 1);
            rate = rate * rate;
            let r, g, b;
            if (rate < 0.33) {
                const coef = (rate - 0) / (0.33 - 0);
                r = 0 + dark.r * coef;
                g = 0 + dark.g * coef;
                b = 0 + dark.b * coef;
            } else if (rate < 0.66) {
                const coef = (rate - 0.33) / (0.66 - 0.33);
                r = dark.r * (1 - coef) + light.r * coef;
                g = dark.g * (1 - coef) + light.g * coef;
                b = dark.b * (1 - coef) + light.b * coef;
            } else {
                const coef = (rate - 0.66) / (1 - 0.66);
                r = light.r * (1 - coef) + 255 * coef;
                g = light.g * (1 - coef) + 255 * coef;
                b = light.b * (1 - coef) + 255 * coef;
            }
            result[i] = 'rgb(' + r + ', ' + g + ', ' + b + ')';
        }
        return result;
    }
    _clearCanvas() {
        this.spectrumCanvasCtx.fillStyle = this.colorMap[0];
        this.spectrumCanvasCtx.fillRect(0, 0, this.spectrumCanvas.width, this.spectrumCanvas.height);
        this.stressCanvasCtx.fillStyle = "rgb(255, 255, 255)";;
        this.stressCanvasCtx.fillRect(0, 0, this.stressCanvas.width, this.stressCanvas.height);
        this.peakControlFactor = 1.0;
        this.smoother.clear();
    }
    
    
    _feedVisualiser() {
        if (this.renderingPoint >= this.stressCanvas.width) {
            this.spectrumCanvasCtx.drawImage(this.spectrumCanvas, -this.tp, 0);
            this.stressCanvasCtx.drawImage(this.stressCanvas, -this.tp, 0);
            this.renderingPoint = this.stressCanvas.width - this.tp;
        }
        const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(frequencyData);
        let sigma = 0;
        let bandLow;
        let bandHigh;
        switch(frequencyData.length) {
            case 8192:
                bandLow = 25; bandHigh = 61;
                break;
            case 4096:
                bandLow = 10; bandHigh = 41;
                break;
            case 2048:
                bandLow = 5; bandHigh = 21;
                break;
            default:
                bandLow = 0; bandHigh = 11;
        }
        for (let i = bandLow; i < bandHigh; i++) {          // 8 and 17 are yet another magic numbers I must adjust.
            sigma += frequencyData[i];
        }
        let averageLevel = sigma / (bandHigh - bandLow);
        let level = this.smoother.getValue(averageLevel * this.magFactor);
        this.stressCanvasCtx.fillStyle = "rgb(65,105,225)";
        this.stressCanvasCtx.fillRect(this.renderingPoint, this.stressCanvas.height - level, this.tp, level - 1);
        this.stressCanvasCtx.fillStyle = "rgb(255, 255, 255)";
        this.stressCanvasCtx.fillRect(this.renderingPoint, 0, this.tp, this.stressCanvas.height - level);
//////////
        for (let i = 0; i < this.spectrumCanvas.height; i++) {
            if (i < frequencyData.length) {
                this.spectrumCanvasCtx.fillStyle = this.colorMap[frequencyData[i]];
            } else {
                this.spectrumCanvasCtx.fillStyle = this.colorMap[0];
            }
            this.spectrumCanvasCtx.fillRect(this.renderingPoint, this.spectrumCanvas.height - 1 - i, this.tp, 1);
        }
        this.renderingPoint += this.tp;
    }
    
    _isPlaying() {
        return this.playingFlag;
    }
    _setPlayingFlag(val) {
        this.playingFlag = val;
    }
    
    startRendering() {
        if (!this._isPlaying()) {
            this._clearCanvas();
            this.renderingPoint = 0;
            this._setPlayingFlag(true);
            requestAnimationFrame(function mainLoop() {
                if (this._isPlaying()) {
                    this._feedVisualiser();
                    requestAnimationFrame(mainLoop.bind(this));
                }
            }.bind(this));
        }
    }
    stopRendering() {
        this._setPlayingFlag(false);
    }
}
