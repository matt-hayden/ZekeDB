var express = require('express');
var Catalog = require('../Catalog');

function ZekeUnprivilegedError(message) {
  this.name = 'ZekeUnprivilegedError';
  this.message = message;
}

var catalog = new Catalog('express-v0-catalog-dump.json');
var backend = { catalog, version: catalog.version };
var version = '0.0';

var app = module.exports = express();

app.use(function(req, res, next) {
  req.catalog = backend.catalog;
  next();
})


app.param('bookID', function(req, res, next, bookID) {
  var books = Array.from(req.catalog.books.query(`bookID == ${bookID}`));
  if (books.length != 1) {
    return next(new ZekeUnprivilegedError(`${books.length} returned for bookID=${bookID}`));
  }
  req.bookID = bookID;
  return next();
} )
app.param('patronID', function(req, res, next, patronID) {
  var patrons = Array.from(req.catalog.patrons.query(`patronID == ${patronID}`));
  if (patrons.length != 1) {
    return next(new ZekeUnprivilegedError(`${patrons.length} returned for patronID=${patronID}`));
  }
  req.patronID = patronID;
  return next();
} )
app.param('staffID', function(req, res, next, staffID) {
  var staffs = Array.from(req.catalog.staff.query(`staffID == ${staffID}`));
  if (staffs.length != 1) {
    return next(new ZekeUnprivilegedError(`${staffs.length} returned for staffID=${staffID}`));
  }
  req.staffID = staffID;
  return next();
} )
app.param('amount', function(req, res, next, dollars) {
  var a = parseFloat(dollars);
  if ((a < 0) || isNaN(a) || !isFinite(a))  {
    return next(new ZekeUnprivilegedError(`Invalid amount: $${dollars}`));
  }
  req.amount = a;
  return next();
} )
app.param('query', function(req, res, next, syntax) {
  if (!syntax) return next(new ZekeUnprivilegedError(`syntax required to search`));
  req.syntax = syntax;
  return next();
} )
  

app.all('/[Vv]ersion', function (req, res) {
  res.json({ server: version, backend: backend.version, runtime: process.versions })
} )

app.get([ '/[Bb]ooks?/search'
        , '/[Bb]ooks?/search/:query'
        ], function (req, res) {
  var r = []
  for (var b of req.catalog.books.query(req.syntax)) {
    b.available = !req.catalog.isCheckedOut(b.bookID);
    r.push(b);
  }
  if (r) res.json(r);
} )


app.get('/book/borrow/:bookID', function (req, res) {
  var patronID = parseInt(req.body.patronID);
  if (d = req.catalog.checkoutBook(req.bookID, patronID)) res.json({dueDate: d});
  else res.status(500).send(`checkoutBook() failed`);
} )

app.put('/book/hold/:bookID', function(req, res) {
  if (h = req.catalog.addHold(req.bookID, req.patronID)) res.json(h);
  else res.status(500).send(`addHold() failed`);
} )
app.delete('/book/hold/:bookID', function(req, res) {
  if (d = req.catalog.cancelHold(req.body)) res.send("Success");
  else res.status(500).send(`cancelHold() failed`);
} )
/*
app.put('/book/borrow/:bookID',		library.checkoutBook)
app.get('/fines',		library.getOutstandingFines)
app.post('/fines',		library.payFine)

//app.get('/report/books',	library.getBookStats)
//app.get('/report/summary',	library.getStats)
*/
app.use('/admin', require('./admin'));

/**
 *
 */

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  //res.render('error');
  res.json(err);
});

