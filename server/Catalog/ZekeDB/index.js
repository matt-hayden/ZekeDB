const path = require('path')

const assert = console.assert
// Override this with your favorite logging facility
const debug = log = info = warn = error = console.log

function ZekeDbError(message) {
  this.message = message;
  this.name = 'ZekeDbError';
}


/**
 * Unsophisticated syntax parser.
 * Does not respect quotes, parenthesis or even order of operations
 */
function convertSyntax(queryStyle, prefix='value') {
  let t = queryStyle.replace(/\WNOT\W/gi, ' ! ')
  t = t.replace(/\WAND\W/gi, ' && ')
  t = t.replace(/\WOR\W/gi, ' || ')
  t = t.replace(/([a-zA-Z_][a-zA-Z0-9_]*)(\W)/g, prefix+'.$1$2')
  return t
}


/**
 * DB
 * @module ZekeDB
 *
 * @class
 * @classdesc A mock database that imparts a whiff of what to expect in the wild
 *
 * A database object has only a `.tables` member.
 */
var ZekeDB = function (filename, schema) {
  this.version = '0.3'
  this.tables = {}
  if (filename) this.restore(filename)
  if (schema) this.newSchema(schema)
}

ZekeDB.prototype.newSchema = function(schema) {
  // Warning: destructive
  assert(schema)
  if (schema instanceof Array) {
    for (let name of schema.tables) this.tables[name] = new ZekeTable(name)
  } else if (schema instanceof Object) {
    for (let name in schema.tables) this.tables[name] = new ZekeTable(name, schema.tables[name])
  } else throw new ZekeDbError(`Invalid argument: ${schema}`)
  this.schema = schema
}

ZekeDB.prototype.restore = function(filename) {
  // Warning: destructive
  filename = filename || this.filename
  assert(filename)
  let p = path.parse(filename)
  if (!p.dir) p.dir = '.'
  try {
    this.tables = require(path.format(p))
    return (this.filename = filename)
  } catch (e) {
    debug(`Not loading ${filename}`)
  }
}

ZekeDB.prototype.dump = function(filename) {
  // Warning: destructive
  filename = filename || this.filename
  assert(filename)
  fs.writeFileSync(filename, JSON.stringify(this.tables))
  return (this.filename = filename)
}

/**
 * Table
 * 
 * @class
 * @classdesc This functionality applies to any `table`
 */
var ZekeTable = function (name, attribs) {
  /** Access the table name with `.name`. */
  this.name = name
  /** Primary key */
  this.primaryKeyName = attribs.primaryKey || 'rowID'

  /** Internally, I allow access to the `.rows` object. Real databases won't do this! */
  this.rows = [ {deleted: true} ] // 0th element intentionally contrived
}

/**
 * Insert a row into table.
 * @param values - List of values to insert into table
 * @return {number} rowID - ID of inserted row - or falsy if not
 */
ZekeTable.prototype.insertRow = function (values) {
  var rowID = this.rows.length
  values[this.primaryKeyName] = rowID
  debug(`Inserting into ${this.name} values`, values)
  this.rows.push(values)
  return rowID
}
 
/**
 * Delete a row from table.
 * @param rowID - Delete only supports rowID
 * @return date - Date of deletion - likely now but possibly earlier
 */
ZekeTable.prototype.deleteRow = function (rowID) {
  if (rowID < this.rows.length) {
    if (!this.rows[rowID].deleted) this.rows[rowID].deleted = new Date()
    return this.rows[rowID].deleted
  }
}

/**
 * Access table rows in a consistent way.
 * This is a generator.
 * @param {number} begin - Start iterating rows from...
 * @param {number} end - ...to here (inclusive)
 */
ZekeTable.prototype.fetchRows = function * (begin=1, end) {
  var row
  for (var i=begin, n=(end || this.rows.length)-1; i<=n; i++) {
    row = this.rows[i]
    if (!row.deleted) yield row
  }
}
 
/**
 * Fetch rows matching a condition.
 * This is a generator.
 * @param syntax - syntax to test against table rows
 */
ZekeTable.prototype.query = function * (queryStyle) {
  if (queryStyle) {
    for (let row of this.fetchRows()) {
      if ( eval(convertSyntax(queryStyle, prefix='row')) ) yield row
    }
  } else yield * this.fetchRows()
}
 
/**
 * @return label for pretty-printing
 */
ZekeTable.prototype.toString = function() {
  return `Table with ${this.rows.length} rows`
}


module.exports = ZekeDB
