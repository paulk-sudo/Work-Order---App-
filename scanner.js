(() => {
  const modal = document.getElementById('scannerModal');
  const video = document.getElementById('video');
  const closeBtn = document.getElementById('closeScanner');

  let stream = null;
  let activeInput = null;
  let scanning = false;
  let detector = null;

  async function startCamera() {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    video.srcObject = stream;
    await video.play();
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    video.srcObject = null;
  }

  async function scanLoop() {
    if (!detector) return;
    scanning = true;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    while (scanning) {
      if (video.readyState >= 2) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const bitmap = await createImageBitmap(canvas);
        try {
          const barcodes = await detector.detect(bitmap);
          if (barcodes && barcodes.length) {
            const val = barcodes[0].rawValue || "";
            if (activeInput) activeInput.value = val;
            window.Scanner.close();
            return;
          }
        } catch (e) {
          // ignore detect errors
        }
      }
      await new Promise(r => setTimeout(r, 120));
    }
  }

  const Scanner = {
    async openForInput(inputEl) {
      activeInput = inputEl;

      // Must be triggered by user gesture (focus/tap) for iOS camera permissions
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');

      // BarcodeDetector support check
      if ('BarcodeDetector' in window) {
        const formats = [
          'code_128','code_39','ean_13','ean_8','upc_a','upc_e','itf','qr_code','data_matrix'
        ];
        detector = new BarcodeDetector({ formats });
      } else {
        alert("This browser doesn't support built-in barcode scanning. If you're on iPhone, update iOS and use Safari. Otherwise we can swap to a JS scanner library (ZXing) easily.");
        Scanner.close();
        return;
      }

      try {
        await startCamera();
        scanLoop();
      } catch (e) {
        alert("Camera permission blocked. Please allow camera access in your browser settings.");
        Scanner.close();
      }
    },

    close() {
      scanning = false;
      stopCamera();
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      activeInput = null;
    }
  };

  closeBtn.addEventListener('click', () => Scanner.close());

  window.Scanner = Scanner;
})();
