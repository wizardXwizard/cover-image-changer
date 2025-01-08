pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let pdfFile = null;
let coverImage = null;

document.getElementById("pdfInput").addEventListener("change", (e) => {
  pdfFile = e.target.files[0];
  updateFileNames();
  checkEnableProcess();
});

document.getElementById("coverInput").addEventListener("change", (e) => {
  coverImage = e.target.files[0];
  updateFileNames();
  checkEnableProcess();
});

function updateFileNames() {
  const fileNames = document.getElementById("fileNames");
  fileNames.innerHTML = `
    PDF: ${pdfFile ? pdfFile.name : "Not selected"}<br>
    Cover: ${coverImage ? coverImage.name : "Not selected"}
  `;
}

function checkEnableProcess() {
  document.getElementById("processButton").disabled = !(pdfFile && coverImage);
}

function updateProgress(percent) {
  document.getElementById("progressBar").style.width = `${percent}%`;
}

function addLog(message) {
  const logs = document.getElementById("logs");
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
  logs.appendChild(entry);
  logs.scrollTop = logs.scrollHeight;
}

async function processPDF() {
  try {
    addLog("Starting PDF processing...");
    updateProgress(10);

    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    addLog(`PDF loaded. Total pages: ${pdfDoc.getPageCount()}`);
    updateProgress(30);

    // Remove the first page
    pdfDoc.removePage(0);
    addLog("Removed the first page.");
    
    // Add the cover image as the new first page
    if (coverImage) {
      const coverImageBytes = await coverImage.arrayBuffer();
      const coverImageBitmap = await pdfDoc.embedJpg(coverImageBytes); // Assume JPG format

      // Create a new page for the cover image
      const coverPage = pdfDoc.addPage([pdfDoc.getPages()[0].getSize().width, pdfDoc.getPages()[0].getSize().height]);
      coverPage.drawImage(coverImageBitmap, {
        x: 0,
        y: 0,
        width: coverPage.getWidth(),
        height: coverPage.getHeight(),
      });
      addLog("Added cover image as the new first page.");
    }

    updateProgress(90);

    // Save the modified PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "modified_" + pdfFile.name;
    downloadLink.click();

    URL.revokeObjectURL(url);

    updateProgress(100);
    addLog("Processing complete! Modified PDF downloaded.");
  } catch (error) {
    addLog(`Error: ${error.message}`);
    console.error(error);
  }
}

// Assuming you have a button with id "processButton" to trigger PDF processing:
// document.getElementById("processButton").addEventListener("click", processPDF);
