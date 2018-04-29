var express = require('express');

function ZekePrivilegedError(message) {
  this.name = 'ZekeUnprivilegedError';
  this.message = message;
}

var admin = module.exports = express.Router();


admin.param('bookID', function(req, res, next, bookID) {
  var books = Array.from(req.catalog.books.query(`bookID == ${bookID}`));
  if (books.length != 1) {
    return next(new ZekePrivilegedError(`${books.length} returned for bookID=${bookID}`));
  }
  req.bookID = bookID;
  return next();
  } )
admin.param('patronID', function(req, res, next, patronID) {
  var patrons = Array.from(req.catalog.patrons.query(`patronID == ${patronID}`));
  if (patrons.length != 1) {
    return next(new ZekePrivilegedError(`${patrons.length} returned for patronID=${patronID}`));
  }
  req.patronID = patronID;
  return next();
} )
admin.param('query', function(req, res, next, syntax) {
  req.syntax = syntax;
  return next();
} )

admin.param('staffID', function(req, res, next, staffID) {
  var staffs = Array.from(req.catalog.staff.query(`staffID == ${staffID}`));
   if (staffs.length != 1) {
    return next(new ZekePrivilegedError(`${staffs.length} returned for staffID=${staffID}`));
  }
  req.staffID = staffID;
  return next();
} )
  

admin.post('/book', function (req, res) {
  let success;
  if (success = req.catalog.addBook(req.body)) res.json({success});
  else res.status(500).send(`addBook() failed`);
} )

admin.delete('/book/:bookID', function(req, res) {
  let success;
  if (success = req.catalog.removeBook(req.bookID)) res.json({success});
  else res.status(500).send(`removeBook() failed`);
} )
  

admin.get('/patron/:patronID', function(req, res) {
  let pinfo;
  if (pinfo = req.catalog.getPatronInfo(req.patronID)) res.json(pinfo);
  else res.status(500).send(`getPatronInfo() failed`);
} )

admin.put('/patron', function(req, res) {
  let patronID;
  if (patronID = req.catalog.addPatron(req.body)) res.json({patronID});
  else res.status(500).send(`addPatron() failed`);
} )

admin.get('/database', function(req, res) {
  res.json(req.catalog.connection.tables);
} )

/*
admin.delete('/book/borrow/:bookID', function (req, res) {
  res.send(`replacing ${req.bookID}`);
} )
//admin.del('/fines/:patronID',	library.clearFine)
admin.put('/staff',	library.addStaff)
admin.del('/staff/:staffID',	library.removeStaff)
*/

// catch 404 and forward to error handler
admin.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
admin.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  //res.render('error');
  res.json(err);
});

