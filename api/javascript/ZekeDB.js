
// Override this with your favorite logging facility
const debug = log = info = warn = error = console.log

/**
 * DB
 * @module ZekeDB
 *
 * @class
 * @classdesc A mock database that imparts a whiff of what to expect in the wild
 *
 * A database object has only a `.tables` member.
 */
const ZekeDB = function (schema) {
  this.tables = {}
  if (schema) {
    log("ZekeDB began with this schema: ", schema)
    if (schema instanceof Array) {
      for (let name of schema.tables) this.tables[name] = new ZekeTable(name)
    } else if (schema instanceof Object) {
      for (let name in schema.tables) this.tables[name] = new ZekeTable(name, schema.tables[name])
    } // else throw new ZekeError(`Invalid argument: ${schema}`)
  } else {
    debug("ZekeDB began with empty schema")
  }
}

/**
 * Table
 * 
 * @class
 * @classdesc This functionality applies to any `table`
 */
const ZekeTable = function (name, attribs) {
  /** Access the table name with `.name`. */
  this.name = name
  /** Primary key */
  this.primaryKeyName = attribs.primaryKey || 'rowID'

  /** Internally, I allow access to the `.rows` object. Real databases won't do this! */
  this.rows = [ {deleted: true} ] // 0th element intentionally contrived
  /**
   * Insert a row into table.
   * @param values - List of values to insert into table
   * @return {number} rowID - ID of inserted row - or falsy if not
   */
  this.insertRow = function (values) {
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
  this.deleteRow = function (rowID) {
    if (rowID < this.rows.length) {
      if (!this.rows[rowID].deleted) this.rows[rowID].deleted = new Date()
      return this.rows[rowID].deleted)
      }
  }
  /**
   * Access table rows in a consistent way.
   * This is a generator.
   * @param {number} begin - Start iterating rows from...
   * @param {number} end - ...to here (inclusive)
   */
  this.fetchRows = function * (begin=1, end) {
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
  this.query = function * (syntax) {
    for (let row of this.fetchRows()) {
      if (syntax) {
        if (eval('row.'+syntax)) yield row
      } else { yield row }
    }
  }
  /**
   * @return label for pretty-printing
   */
  this.toString = function() {
    return `Table with ${this.rows.length} rows`
  }
}

module.exports = ZekeDB
