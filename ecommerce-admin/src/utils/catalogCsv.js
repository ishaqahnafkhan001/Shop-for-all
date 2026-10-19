export const MAX_CATALOG_IMPORT_ROWS = 200;

export const csvToProducts = (text) => {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        if (char === '"') {
            if (quoted && text[index + 1] === '"') {
                cell += '"';
                index += 1;
            } else if (quoted || cell === '') {
                quoted = !quoted;
            } else {
                throw new Error('The CSV file has invalid quotation marks.');
            }
        } else if (char === ',' && !quoted) {
            row.push(cell);
            cell = '';
        } else if ((char === '\r' || char === '\n') && !quoted) {
            row.push(cell);
            if (row.some(value => value.trim())) rows.push(row);
            row = [];
            cell = '';
            if (char === '\r' && text[index + 1] === '\n') index += 1;
        } else {
            cell += char;
        }
    }

    if (quoted) throw new Error('The CSV file has an unfinished quoted value.');
    row.push(cell);
    if (row.some(value => value.trim())) rows.push(row);
    if (rows.length < 2) return [];

    const headers = rows[0].map(value => value.replace(/^\uFEFF/, '').trim());
    if (headers.some(header => !header)) throw new Error('The CSV file has an empty column name.');
    return rows.slice(1).map((values, index) => {
        if (values.length !== headers.length) throw new Error(`CSV row ${index + 2} has the wrong number of columns.`);
        return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
    });
};
