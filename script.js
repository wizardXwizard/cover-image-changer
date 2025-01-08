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
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

    addLog(`PDF loaded. Total pages: ${pdf.numPages}`);
    updateProgress(30);

    const pagesToRemove = [];
    const pagePromises = [];

    // Scan pages for matching words, starting from the second page
    for (let i = 2; i <= pdf.numPages; i++) {
      pagePromises.push(
        pdf.getPage(i).then((page) => {
          return page.getTextContent().then((textContent) => {
            const pageText = textContent.items
              .map((item) => item.str)
              .join(" ")
              .toLowerCase();

            const wordsToCheck = [
              "ikjEifjd",
              "eaxynks",
              "lk<s",
              ";ksfxuh",
              "tSfeuh",
              "pjn'kk",
              "yky",
              "'kksM",
              "'kksMkoxZ",
              "rkfydk",
              "dq.Mfy;k",
              "dq.Mfy;k",
              "dsih",
              "foa'kksÙkjh",
              "eS=h",
            ];

            if (
              wordsToCheck.some((word) => pageText.includes(word.toLowerCase()))
            ) {
              pagesToRemove.push(i);
            }
          });
        })
      );
    }

    await Promise.all(pagePromises);
    addLog(`Found ${pagesToRemove.length} pages to remove`);

    updateProgress(80);

    // Create a new PDF excluding the first page and marked pages
    const pdfDoc = await PDFLib.PDFDocument.create();
    const existingPdf = await PDFLib.PDFDocument.load(
      await pdfFile.arrayBuffer()
    );

    // Exclude first page and pages to remove
    const pagesToKeep = existingPdf.getPages().reduce((acc, page, index) => {
      if (index !== 0 && !pagesToRemove.includes(index + 1)) {
        // +1 because PDF.js pages are 1-indexed
        acc.push(index);
      }
      return acc;
    }, []);

    const copiedPages = await pdfDoc.copyPages(existingPdf, pagesToKeep);
    copiedPages.forEach((page) => pdfDoc.addPage(page));

    // Replace with new image only if there are pages left after removal
    if (coverImage && pdfDoc.getPages().length > 0) {
      const coverImageBytes = await coverImage.arrayBuffer();
      const coverImageBitmap = await pdfDoc.embedJpg(coverImageBytes); // Assume JPG format

      // Add the new cover image as the first page
      const coverPage = pdfDoc.insertPage(0, [
        pdfDoc.getPages()[0].getSize().width,
        pdfDoc.getPages()[0].getSize().height,
      ]);
      coverPage.drawImage(coverImageBitmap, {
        x: 0,
        y: 0,
        width: coverPage.getWidth(),
        height: coverPage.getHeight(),
      });
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
document.getElementById("processButton").addEventListener("click", processPDF);
