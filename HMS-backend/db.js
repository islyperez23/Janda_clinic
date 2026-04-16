const fs   = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

class Collection {
  constructor(name, seed = []) {
    this.file = path.join(DATA_DIR, `${name}.json`);
    if (fs.existsSync(this.file)) {
      try { this._data = JSON.parse(fs.readFileSync(this.file, "utf8")); }
      catch { this._data = seed; this._write(); }
    } else {
      this._data = seed; this._write();
    }
  }
  _write() { fs.writeFileSync(this.file, JSON.stringify(this._data, null, 2)); }
  all()            { return [...this._data]; }
  find(pred)       { return this._data.filter(pred); }
  findOne(pred)    { return this._data.find(pred) || null; }
  insert(record)   { this._data.push(record); this._write(); return record; }
  update(pred, fn) {
    let updated = null;
    this._data = this._data.map(r => { if (pred(r)) { updated = fn(r); return updated; } return r; });
    if (updated !== null) this._write();
    return updated;
  }
  remove(pred) {
    const before = this._data.length;
    this._data = this._data.filter(r => !pred(r));
    if (this._data.length !== before) this._write();
  }
}

module.exports = { Collection };
