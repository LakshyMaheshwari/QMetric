const fs    = require('fs');
const path  = require('path');
const pdf   = require('pdf-parse');
const mammoth = require('mammoth');
const csv   = require('csv-parser');
const xlsx  = require('xlsx');
const Tesseract = require('tesseract.js');

// ─── PDF ──────────────────────────────────────────────────────────────────────
async function convertPDFToText(inputFilePath, outputTextFilePath) {
    const dataBuffer = fs.readFileSync(inputFilePath);
    const data = await pdf(dataBuffer);
    const text = data.text;
    fs.writeFileSync(outputTextFilePath, text);
    return text;
}

// ─── Word (DOCX) ──────────────────────────────────────────────────────────────
async function convertWordToText(inputFilePath, outputTextFilePath) {
    try {
        const dataBuffer = fs.readFileSync(inputFilePath);
        const result = await mammoth.extractRawText({ buffer: dataBuffer });
        const text = result.value;
        fs.writeFileSync(outputTextFilePath, text);
        return text;
    } catch (error) {
        console.error('Error converting Word document to text:', error);
        throw error;
    }
}

// ─── CSV — FIXED: stream wrapped in a Promise so async callers get the result ─
async function convertCSVToText(inputFilePath, outputTextFilePath) {
    return new Promise((resolve, reject) => {
        const rows = [];

        fs.createReadStream(inputFilePath)
            .on('error', (err) => reject(new Error(`Cannot read file: ${err.message}`)))
            .pipe(csv())
            .on('data', (row) => rows.push(row))
            .on('end', () => {
                try {
                    const text = JSON.stringify(rows, null, 2);
                    fs.writeFileSync(outputTextFilePath, text);
                    resolve(text);
                } catch (writeErr) {
                    reject(new Error(`Cannot write output file: ${writeErr.message}`));
                }
            })
            .on('error', (err) => reject(new Error(`CSV parse error: ${err.message}`)));
    });
}

// ─── XLSX ─────────────────────────────────────────────────────────────────────
async function convertXLSXToText(inputFilePath, outputTextFilePath) {
    const workbook  = xlsx.readFile(inputFilePath);
    const sheetName = workbook.SheetNames[0];
    const sheet     = workbook.Sheets[sheetName];
    const rows      = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    const text      = JSON.stringify(rows, null, 2);
    fs.writeFileSync(outputTextFilePath, text);
    return text;
}

// ─── Image (Tesseract OCR) ────────────────────────────────────────────────────
async function convertImageToText(inputImagePath, outputTextFilePath) {
    const { data: { text } } = await Tesseract.recognize(inputImagePath, 'eng');
    fs.writeFileSync(outputTextFilePath, text);
    return text;
}

module.exports = {
    convertPDFToText,
    convertWordToText,
    convertCSVToText,
    convertXLSXToText,
    convertImageToText,
};
