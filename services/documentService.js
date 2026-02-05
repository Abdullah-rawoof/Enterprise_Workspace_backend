const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const csv = require('csv-parser');
const xml2js = require('xml2js');

const parsePdf = async (filePath) => {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
};

const parseDocx = async (filePath) => {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
};

const parseTxt = async (filePath) => {
    return fs.readFileSync(filePath, 'utf-8');
};

const parseCsv = (filePath) => {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(JSON.stringify(data)))
            .on('end', () => resolve(results.join('\n')))
            .on('error', (err) => reject(err));
    });
};

const parseXml = async (filePath) => {
    const parser = new xml2js.Parser();
    const data = fs.readFileSync(filePath, 'utf-8');
    const result = await parser.parseStringPromise(data);
    return JSON.stringify(result);
};

exports.processFile = async (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    console.log(`Processing file: ${filePath} (${ext})`);

    try {
        let content = '';
        if (ext === '.pdf') content = await parsePdf(filePath);
        else if (ext === '.docx') content = await parseDocx(filePath);
        else if (ext === '.txt') content = await parseTxt(filePath);
        else if (ext === '.csv') content = await parseCsv(filePath);
        else if (ext === '.xml') content = await parseXml(filePath);
        else throw new Error('Unsupported file type');

        return content;
    } catch (error) {
        console.error('Error parsing file:', error);
        throw error;
    }
};
