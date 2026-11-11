
const video = document.getElementById("video");

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const scanBtn = document.getElementById("scanBtn");

const placeholder = document.getElementById("placeholder");

const statusText = document.getElementById("status");
const objectText = document.getElementById("object");
const confidenceText = document.getElementById("confidence");
const scanCountText = document.getElementById("scanCount");

let cameraStream = null;
let model = null;
let scanCount = 0;
let canvas = null;
let context = null;

let autoScanning = false;
let scanningBusy = false;
let cameraSession = 0;
let scanTimer = null;

// CREATE DETECTION CANVAS
function createCanvas() {
    if (canvas) return;

    canvas = document.createElement("canvas");

    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "4";

    video.parentElement.appendChild(canvas);

    context = canvas.getContext("2d");
}

// LOAD AI MODEL
async function loadAIModel() {
    statusText.textContent = "Loading AI model...";

    try {
        model = await cocoSsd.load();

        statusText.textContent = cameraStream
            ? "AI Ready - Live Scanning"
            : "AI System Ready";

        console.log("SEEDY AI loaded successfully!");

        if (cameraStream) {
            startAutomaticScanning();
        }

    } catch (error) {
        statusText.textContent = "AI Loading Failed";
        console.error(error);
    }
}

// START AUTOMATIC SCANNING
function startAutomaticScanning() {
    if (!cameraStream || !model || autoScanning) return;

    autoScanning = true;

    statusText.textContent = "Live AI Scanning";

    runAutomaticDetection();
}

// AUTOMATIC DETECTION LOOP
async function runAutomaticDetection() {

    if (!autoScanning || !cameraStream) return;

    const session = cameraSession;

    if (!scanningBusy && video.readyState >= 2) {

        await detectObjects(session, false);
    }

    if (autoScanning && session === cameraSession) {
        scanTimer = setTimeout(runAutomaticDetection, 300);
    }
}

// DETECT OBJECTS
async function detectObjects(session, manual) {

    if (!model || !cameraStream || scanningBusy) return;

    scanningBusy = true;

    try {

        const predictions = await model.detect(video);

        if (session !== cameraSession || !cameraStream) return;

        scanCount++;

        scanCountText.textContent = scanCount;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        context.clearRect(0, 0, canvas.width, canvas.height);

        if (predictions.length === 0) {

            objectText.textContent = "Nothing detected";
            confidenceText.textContent = "0%";

            if (manual) {
                statusText.textContent = "Scan Complete";
            } else {
                statusText.textContent = "Searching for objects...";
            }

            return;
        }

        // GET DETECTED OBJECT NAMES
        const detectedNames = [
            ...new Set(predictions.map(item => item.class))
        ];

        objectText.textContent = detectedNames.join(", ");

        // HIGHEST CONFIDENCE
        const highest = predictions.reduce((a, b) =>
            a.score > b.score ? a : b
        );

        confidenceText.textContent =
            Math.round(highest.score * 100) + "%";

        statusText.textContent =
            predictions.length + " Object(s) Detected";

        // DRAW DETECTION BOXES
        predictions.forEach(item => {

            const [x, y, width, height] = item.bbox;

            context.strokeStyle = "#00ffcc";
            context.lineWidth = 4;

            context.strokeRect(x, y, width, height);

            const label =
                item.class + " " +
                Math.round(item.score * 100) + "%";

            context.font = "bold 17px Arial";

            const textWidth = context.measureText(label).width;

            context.fillStyle = "#00bfff";

            context.fillRect(
                x,
                Math.max(0, y - 27),
                textWidth + 12,
                27
            );

            context.fillStyle = "#ffffff";

            context.fillText(
                label,
                x + 6,
                Math.max(18, y - 8)
            );

        });

        console.log("SEEDY AI:", predictions);

    } catch (error) {

        console.error("Detection error:", error);

        statusText.textContent = "Detection Error";

    } finally {

        scanningBusy = false;
    }
}

// START CAMERA
startBtn.addEventListener("click", async () => {

    if (cameraStream) return;

    try {

        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
                audio: false
            });

        } catch (error) {

            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });
        }

        cameraSession++;

        video.srcObject = cameraStream;

        await video.play();

        video.style.display = "block";
        placeholder.style.display = "none";

        createCanvas();

        statusText.textContent = "Camera Active";

        objectText.textContent = "Searching...";
        confidenceText.textContent = "0%";

        if (model) {
            startAutomaticScanning();
        } else {
            statusText.textContent = "Waiting for AI model...";
        }

    } catch (error) {

        statusText.textContent = "Camera Error";

        alert("Unable to access camera. Check camera permissions.");

        console.error(error);
    }
});

// MANUAL SCAN BUTTON
scanBtn.addEventListener("click", async () => {

    if (!cameraStream) {
        alert("Please start the camera first.");
        return;
    }

    if (!model) {
        alert("Please wait for the AI model to load.");
        return;
    }

    if (scanningBusy) return;

    await detectObjects(cameraSession, true);

});

// STOP CAMERA
stopBtn.addEventListener("click", () => {

    autoScanning = false;

    cameraSession++;

    clearTimeout(scanTimer);

    if (cameraStream) {

        cameraStream.getTracks().forEach(track => {
            track.stop();
        });

        cameraStream = null;
    }

    video.srcObject = null;
    video.style.display = "none";

    placeholder.style.display = "block";

    if (context && canvas) {
        context.clearRect(0, 0, canvas.width, canvas.height);
    }

    statusText.textContent = "Camera Stopped";
    objectText.textContent = "None";
    confidenceText.textContent = "0%";

});

// INITIALIZE
statusText.textContent = "Loading AI model...";

loadAIModel();
