
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

// CREATE DETECTION CANVAS
function createCanvas() {
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

        statusText.textContent = "AI System Ready";

        console.log("SEEDY AI model loaded successfully!");

    } catch (error) {

        statusText.textContent = "AI Loading Failed";

        console.error("AI model error:", error);
    }
}

// START CAMERA
startBtn.addEventListener("click", async () => {

    try {

        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Camera requires HTTPS or localhost.");
        }

        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
                audio: false
            });

        } catch (firstError) {

            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });
        }

        video.srcObject = cameraStream;

        await video.play();

        video.style.display = "block";
        placeholder.style.display = "none";

        if (!canvas) {
            createCanvas();
        }

        statusText.textContent = model
            ? "Camera Active"
            : "Camera Active - Loading AI";

        objectText.textContent = "Ready to scan";
        confidenceText.textContent = "0%";

    } catch (error) {

        statusText.textContent = "Camera Error";

        alert("Unable to access camera. Check your camera permission.");

        console.error(error);
    }
});

// STOP CAMERA
stopBtn.addEventListener("click", () => {

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

// SCAN OBJECTS
scanBtn.addEventListener("click", async () => {

    if (!cameraStream) {
        alert("Please start your camera first.");
        return;
    }

    if (!model) {
        alert("AI model is still loading. Please wait.");
        return;
    }

    if (video.readyState < 2) {
        alert("Camera is not ready yet.");
        return;
    }

    statusText.textContent = "Scanning...";

    try {

        const predictions = await model.detect(video);

        scanCount++;

        scanCountText.textContent = scanCount;

        context.clearRect(0, 0, canvas.width, canvas.height);

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        if (predictions.length === 0) {

            objectText.textContent = "Nothing detected";
            confidenceText.textContent = "0%";
            statusText.textContent = "Scan Complete";

            return;
        }

        // DISPLAY ALL DETECTED OBJECTS
        const detectedNames = predictions.map(item => {
            return item.class;
        });

        objectText.textContent = [...new Set(detectedNames)].join(", ");

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

        console.log("AI Detection Results:", predictions);

    } catch (error) {

        statusText.textContent = "Detection Error";

        console.error(error);
    }

});

// LOAD MODEL WHEN PAGE OPENS
loadAIModel();
