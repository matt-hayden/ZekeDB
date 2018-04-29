/**
 * @module Library
 * This is an introduction to ORM - Object Relational Model
 */

const assert = console.assert
// Override this with your favorite logging facility
const debug = log = info = warn = error = console.log

const DAY_MS = 1000*60*60*24

function LibraryError(message) {
  this.message = message;
  this.name = 'LibraryError';
}

/**
 * Interacting with a database usually involves a "driver". This is a fairly
 * old term, and nowadays you'd call it an API. But, all old databases have a
 * nearly consistent interface called a driver, which offers a `connection`.
 * That connection in turn offers a `cursor`, which allows you to `execute`
 * database queries, possibly modify objects, and `fetch` results. Databases
 * have a boring set of functions because JavaScript is not the only language
 * they support. They have to support some really boring languages like C and
 * PHP. To cover all bases, the database driver is as boring as possible.
 *
 * You've probably heard that global variables are bad. This is mostly true.
 * Global *constants* are just fine. But making a global variable is poor
 * form with an exception: database connections. You *could* form more than
 * one of these, but that's also bad form. You should form exactly one of
 * these for each database, and you can choose to global it if you want.
 *
 * So, I offer you a very, very simple database, called ZekeDB. Like expensive
 * commercial offerings, ZekeDB supports multiple tables and has a query
 * syntax. It doesn't support cursors or multiple uses because it was
 * impressively written by a cat.
 */

// ZekeDB is our database driver. See MongoDB if interested in a better one
const DB = require('./ZekeDB')


/**
 * Library Class
 * -------------
 * @class
 * @classdesc The logic needed to digitize a library catalog
 *
 * Try to picture this running on a server. That server has access to a
 * database. You, yes YOU, have these resources to run a web page that handles
 * the routines of lending books and corralling the ever-popular microfiche
 * machines. What does the server do? What does the database do?
 *
 */
var Library = function (filename) {
  this.version = '0.3'
/**
 * The server is connected to a database, via a connection object.
 *
 * Schema
 * ------
 *
 * Databases have a set of organizing principals called a schema. Within you
 * see me defining the tables I think are appropriate for a Library. Weirdly,
 * it never contains actual data. In practice, you'll start with a schema, then
 * load a database dump back into place. Database people do this *a lot*.
 * @see Library
 *
 * This schema has only `tables`. Other schemas will have things called
 * `views` and maybe complicated arrangements. Right now, as you read this,
 * you are in fact in a very privileged position. You see, you can define
 * a database from the ground up, which not everybody gets to do. I've
 * interfaced with dozens or more real, business databases, and don't often
 * get to design one the way I want. I'm *given* a schema by my manager or
 * maybe a client's database administrator, and maybe it was given to them by
 * someone else. Don't get used to dreaming up databases; expect to inherit
 * them.
 */
  this.connection = new DB(filename=filename, schema=require('./schema.json'))
  this.api_keys = this.connection.tables['API_Keys'] // special
  /**
   * `.books` is a `table`. I could alternatively refer to
   * `.connection.tables.Books`, but that's annoying and I might need to
   * change the backend storage in the future.
   */
  this.books		= this.connection.tables['Books']
  this.checkouts	= this.connection.tables['Checkouts']
  this.fines		= this.connection.tables['Fines']
  this.holds		= this.connection.tables['Holds']
  this.patrons		= this.connection.tables['Patrons']
  this.staff		= this.connection.tables['Staff']
}


/**
 * @class
 * @classdesc We let each book be described by their own class
 */
var Book = function({title, author, authors, numPages, pubDate, language}) {
  if (!(this.title = title)) {
    throw new LibraryError("Cannot book without title!")
  }
  if (authors) {
    this.authors = authors
    this.author = author || authors[0]
  } else {
    this.author = author || "Anonymous"
  }
  this.numPages = numPages
  this.pubDate = new Date(pubDate)
  this.aDate = new Date()
  this.language = language || "EN"
}


/**
 * Library is a user-defined class (UDC) and might benefit from some pretty-
 * printing. There's no harm defining functions for ergonomic reasons.
 * @returns {string}
 */
Library.prototype.toString = function() {
  var label = this.name || "Library"
  return `${label} lending books from ${this.books}`
}

/**
 * Fetch books matching a criterion.
 * @param syntax - text of criterion
 * @returns {Array} results matching
 */
Library.prototype.queryBooks = function (...args) {
  // Try .queryBooks() for all books, or see examples below...
  return Array.from(this.books.query(...args))
}

/**
 * Add a new book.
 * @param arg - A book or object with book features
 * @returns success {Boolean}
 */
Library.prototype.addBook = function(arg) {
  return this.addBooks([arg])
}

/**
 * Add a new Array of books.
 * @param arg - A book or object with book features
 * @returns successes - falsy if none succeeded
 */
Library.prototype.addBooks = function(iterable) {
  if (iterable && iterable.length) {
    let successes = 0
      , bookID
    for (let book of iterable) {
      if ( bookID = this.books.insertRow(new Book(book)) ) successes++
      else error(`Bad book ${book} ignored`)
    }
    return successes
  }
}

/**
 * Add a new patron.
 * @param attribs - name (required), languages {Array} (optional), activeSince {date} (optional)
 * @returns {number} bookID - A unique identifier, which you could use to delete it. Note that `bookID` is never reused, even if the book is deleted.
 */
Library.prototype.addPatron = function(attribs) {
  assert(attribs.name)
  return this.patrons.insertRow( { name: attribs.name
                                 , languages: attribs.languages || [ 'EN' ]
                                 , activeSince: attribs.activeSince ? new Date(attribs.activeSince) : new Date()
                                 , allowedSimultaneousCheckouts: 20
                                 } )
}

/**
 * Retrieve relevant patron info
 * @param {number} patronID
 * @returns patronObject - Many useful individual data about this patron, or undefined for unknown patronIDs
 */
Library.prototype.getPatronInfo = function(patronID) {
  var q = Array.from(this.patrons.query(`patronID == ${patronID}`))
  if (q.length == 0) return
  else if (1 < q.length) {
    throw new LibraryError(`Multiple patronIDs exist for ${patronID}`)
  }
  attribs = q.pop()
  attribs.currentCheckouts = Array.from(this.checkouts.query(`patronID == ${patronID}`)).length
  attribs.currentFines = this.getOutstandingFines(`patronID == ${patronID}`)
  attribs.currentHolds = Array.from(this.holds.query(`patronID == ${patronID}`)).length
  //attribs.paymentInfo = {}
  return attribs
}

/**
 * Calculate the total outstanding fines
 * This is an example of extending functionality by letting the database
 * do the selection for us.
 *
 * For example:
 *
 * .getOutstandingFines('patronID == 1') // would give you the total fines for that patron
 *
 * .getOutstandingFines('dateAdded < new Date(2016,0,0)') // might give you all fines before Jan 1, 2016
 *
 * @param syntax - Query syntax
 * @returns {number} Dollar amount
 */
Library.prototype.getOutstandingFines = function(...args) {
  return Array.from(this.fines.query(...args)).reduce((s, fineRow) => (s+fineRow.amount), 0) // Not reducing fines here, using the function reduce()
}

/**
 * Remove a book.
 * This is not checking out, this is CENSORSHIP!
 * @param {number} bookID - Each book is given a unique identifier, accessible as `somebook.bookID`.
 * @returns {date} deletedOn - This is a timestamp for when the book was deleted, now or possibly earlier.
 */ 
Library.prototype.removeBook = function (bookID) {
  return this.books.deleteRow(bookID)
}

/**
 * Test if a book is checked out.
 * @param {number} bookID
 * @returns checkout object or falsy
 */
Library.prototype.isCheckedOut = function (bookID) {
  let checkouts = Array.from(this.checkouts.query(`bookID == ${bookID}`))
  if (1 < checkouts.length) {
    error(`Program error: Book #${bookID} has been checked out more than once!`)
  }
  let c
  if ( c = checkouts.pop() ) {
    let h = Array.from(this.holds.query(`bookID == ${bookID}`))
    if (h.length) c.holds = h
  }
  return c
}

/**
 * Check out a book.
 * @param {number} bookID - required
 * @param {number} patronID - required
 * @param {number} numberOfDays - optional
 * @returns due date or falsy
 */
Library.prototype.checkoutBook = function (bookID, patronID, numberOfDays=14) {
  assert(bookID)
  if (this.isCheckedOut(bookID)) throw new LibraryError(`Book #${bookID} is apparently checked out!`)
  assert(patronID)
  var pinfo = this.getPatronInfo(patronID)
  if (pinfo.allowedSimultaneousCheckouts <= pinfo.currentCheckouts) {
    info(`Too many checkouts. Sorry, Mr./Mrs. ${pinfo.name}`)
    return
  }
  var dueDate = new Date(Date.now()+DAY_MS*numberOfDays) // note that JavaScript counts in milliseconds
  this.checkouts.insertRow({bookID, patronID, dueDate})
  debug(`Book #${bookID} checked out to patron #${patronID} until ${dueDate}`)
  return dueDate
}

Library.prototype.addHold = function (bookID, patronID) {
  assert(bookID)
  assert(patronID)
  return this.holds.insertRow({ bookID, patronID, holdDate: new Date() })
}

Library.prototype.cancelHold = function({rowID, patronID, bookID}) {
  assert(patronID)
  // When building a query string, you'll sometimes see unusual indentation like so:
  			syntax  = `   (patronID	== ${patronID})`
  if (rowID)		syntax += `&& (rowID	== ${rowID})`
  else if (bookID)	syntax += `&& (bookID	== ${bookID})`
  else {
    error("cancelHold() Bad arguments, cancelHold() ignored")
    return
  }
  for (let h of this.holds.query(syntax)) this.holds.deleteRow(h.rowID)
  return true
}

/*
 * Here are some ideas after you've implemented the following:
 * addFine({patronID, amount}) -> a unique fineID
 * removeFine(fineID) -> truthy or falsy
 *
 * this.Payment could be it's own class, handling charges via Stripe or whatever.
 * It might have a function Payment.charge(patronInfo, amount), which returns success or failure


Library.prototype.checkinBook = function (bookID, when) {
  when = when ? new Date(when) : new Date() // Homework: why couldn't I have set the argument as when = new Date() above?
  var checkout = this.isCheckedOut(bookID)
  if (checkout) {
    var overdue = when - checkout.dueDate // number of milliseconds since it was due. If negative, then it was returned early
    if (0 < overdue) {
      this.addFine(checkout.patronID, overdue) // TODO: could error
    } else {
      log(`Book #${bookID} is back on the shelf`)
    }
    this.checkouts.deleteRow(checkout.checkoutID) // TODO: could error
  } else {
    // Here's where you might think about what logic led to this error.
    //
    // Why would a book be checked in having not been checked out? Human
    // error is a possibility, but so is a failure in the checkout system.
    // Your priority might be to reduce confusion and fuss for all humans, so
    // you might just let it slide, like I do by simply muttering an error:
    error(`Book #${bookID} was never checked out!`)
  }
}

Library.prototype.payFine = function (patronID, amount=0) {
  var pinfo = this.getPatronInfo(patronID)
  var total = amount
  var finesToAdd = []
  var finesToRemove = []
  for (let row of pinfo.fines) {
    if (total <= 0) {
      break
    } else if (row.amount <= total) {
      finesToRemove.push(row)
      total -= row.amount
    } else if (total < row.amount) {
      finesToRemove.push(row)
      finesToAdd.push({ patronID, amount: row.amount-total, fineType='balance' })
      total = 0
    }
    // Note: at this point, we've handled (total <= 0), (0 < total < row.amount), and (row.amount <= total)
    // It's sometimes helpful to think of all the different cases. Functional languages will force you into this.
  }
  if (0 < total) {
    info(`Thanks for the $${total} donation, Mr./Mrs. ${pinfo.name} Mmm-wah!`)
  }
  // Handle processing the fees with, say, Stripe:
  if (this.Payment.charge(patronID, amount) {
    info(`Charged $${amount} to patron #${patronID}`)
    finesToAdd.map( (row) => this.addFine(row) ) // TODO: could error
    finesToRemove.map( (row) => this.removeFine(row.fineID) ) // TODO: could error
    return true
  } else {
    error(`Charging $${amount} to patron #${patronID} failed`)
    return false
  }
}
*/


module.exports = Library
