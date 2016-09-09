var _ = require('lodash')
var fs = require('fs')
var casper = require('casper').create({
  verbose: true,
  logLevel: 'warning',
  waitTimeout: 15000,
})

// constants
var BASE_URL = 'https://www.tripadvisor.jp'
var START_PAGE_URL = BASE_URL + '/Restaurants-g293940-Phnom_Penh.html'
var OUTPUT_FILE_NAME = 'review-link-list.json'

// globals
var globalReviewLinks = []


function echoPageIsLoaded(pageNumber) {
  casper.echo('##############################');
  casper.echo('PAGE NUMBER [' + pageNumber + '] IS LOADED');
  casper.echo('##############################');
}

function fetchLinks() {
  var links = document.querySelectorAll('a.property_title');
  return Array.prototype.map.call(links, function(e) {
    return e.getAttribute('href');
  });
}

function fetchReviewLinksOnCurrentPage() {
  var links = []

  // get links and push them in globals
  casper.then(function() {
    globalReviewLinks = globalReviewLinks.concat(this.evaluate(fetchLinks))
    console.log('LENGTH OF globalReviewLinks :', globalReviewLinks.length)
  })
}

function fetchReviewLinksRecursively(currentPageNumber) {
  casper.then(function() {
    var pageNumSelector = '.pageNumbers .pageNum'
    // current page
    // var currentPageNumber = this.getElementAttribute(pageNumSelector + '.current', 'data-page-number')
    var nextPageNumber = Number(currentPageNumber) + 1
    var nextPageAttribute = '[data-page-number="' + nextPageNumber + '"]'
    var nextPageSelector = pageNumSelector + nextPageAttribute

    // check next page is exists
    if (this.exists(nextPageSelector)) {
      this.thenClick(nextPageSelector, function() {
        // wait for the next page is loaded with page number selector
        this.waitForSelector(pageNumSelector + '.current' + nextPageAttribute, function() {
          echoPageIsLoaded(nextPageNumber)
          fetchReviewLinksOnCurrentPage()
          fetchReviewLinksRecursively(nextPageNumber)
        })
      })
    } else {
      this.log('Next Page is NOT FOUND, so Finish Fetching !', 'warning');
    }
  })
}




// ENTRY POINT
casper.start(START_PAGE_URL, function() {
  fetchReviewLinksRecursively(0)
})

casper.run(function() {
  console.log('Writing to file...')
  fs.write(OUTPUT_FILE_NAME, JSON.stringify(globalReviewLinks), 'w')
  this.echo('FINISHED').exit()
});
