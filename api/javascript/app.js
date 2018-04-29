
// Before I get started, I like to do this:
const assert = console.assert
const print = console.log


/**
 * Exercises and Tutorials
 * =======================
 */
const Library = require('./Library')

/*
 * session is just a global object, like you might encounter on a web server
 */
var session = { Catalog: new Library(
    { title: "It", author: "Stephen King", numPages: 390, pubDate: "03/12/1987" },           // bookID == 1
    { title: "What is a Butphor? Also, I am a cat", authors: ["Zeke", "Stephen Jay Gould"]}, // bookID == 2
    { title: "It", author: "Stephen King", numPages: 390, pubDate: "03/12/1987" }            // bookID == 3
  ),
  uptime: new Date()
}


if (session.Catalog.removeBook(3)) print("\n...one copy was lost during the Punk Rock flea market...")

// bookID == 4
print("Should truthy: ", session.Catalog.addBook({title: "The Green Mile", author: "Stephen King", numPages: 850}) )

// bookID == 5
print("Should truthy: ", session.Catalog.addBook({title: "Eso", author: "Stephen King", numPages: 415, language: "ES"}) )

/**
 * Some example of embedding some query syntax. Note that the logic here is in
 * JavaScript, but it must be encapsulated as a string argument to the
 * {@link Library#queryBooks} method!
 */
var pretendInput = `Stephen King`
print(`\nAll books by ${pretendInput}: `,		session.Catalog.queryBooks(`author == "${pretendInput}"`) )

var x = 500
print(`\nAll books with fewer than ${x} pages: `,	session.Catalog.queryBooks(`numPages < ${x}`))

pretendInput = `es|ca`
print(`\nAll books en espanol o catalan: `,		session.Catalog.queryBooks(`language.match(/${pretendInput}/i)`) )

for (let b of session.Catalog.queryBooks()) {
  print(`Is book #${b.bookID} "${b.title}" available?`, session.Catalog.isCheckedOut(b.bookID) ? "No" : "Yes")
}

var myID = session.Catalog.addPatron({name: 'Bookworm'})
print("\n", session.Catalog.getPatronInfo(myID))
print("\nCheckout: ", session.Catalog.checkoutBook(1, myID))
print("\n", session.Catalog.getPatronInfo(myID))

for (let b of session.Catalog.queryBooks()) {
  print(`Is book #${b.bookID} "${b.title}" available?`, session.Catalog.isCheckedOut(b.bookID) ? "No" : "Yes")
}

