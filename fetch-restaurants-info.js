var _ = require('underscore')
var fs = require('fs')
var utils = require('utils')

var casper = require('casper').create({
  verbose: true,
  logLevel: 'warning',

  pageSettings: {
    loadImages : true,
    loadPlugins : false,
  },

  // http://256cats.com/phantomjs-memory-leak/
  onResourceRequested : function(R, req, net) {
    var match = req.url.match(/fbexternal-a\.akamaihd\.net\/safe_image|\.pdf|\.mp4|\.png|\.gif|\.avi|\.bmp|\.jpg|\.jpeg|\.swf|\.fla|\.xsd|\.xls|\.doc|\.ppt|\.zip|\.rar|\.7zip|\.gz|\.csv/gim);
    if (match !== null) {
      net.abort();
    }
  },
})

// constants
var BASE_URL = 'https://www.tripadvisor.co.uk'
var OUTPUT_FILE_NAME = 'rest-detail-list.json'
var OUTPUT_ERROR_FILE_NAME = 'error-review-link-list.json'

// globals
var reviewLinks = _.uniq(require('./review-link-list.json'))
var allLength = reviewLinks.length
// 全てのkeyが存在するとは限らないので注意
var restaurantDetails = []
// DOMがなかったとかERRORになったリンク
var errorLinks = []
var currentLinkNumber = 0


function echoLinkIsLoaded(linkNumber) {
  casper.echo('##############################');
  casper.echo('LINK NUMBER [' + linkNumber + ' / ' + allLength + '] IS LOADED');
  casper.echo('##############################');
}


function fetch(link) {
  casper.thenOpen(BASE_URL + link, function() {
    echoLinkIsLoaded(++currentLinkNumber)
    var restaurantDetail = {}
    var basicInfo = {}
    var addressInfo = {}
    var errorMessage = ''

    // fetch information
    restaurantDetail.name = casper.fetchText('h1#HEADING').trim()
    restaurantDetail.link = link

    try {
      basicInfo = getBasicInfo()
    } catch (e) {
      errorMessage = e
    }

    try {
      addressInfo = getLocationAndContactInfo()
    } catch (e) {
      errorMessage = e
    }

    if (errorMessage !== '') {
      casper.log('ERROR: ' + errorMessage + ' link: ' + link, 'error')
      errorLinks.push(link)
    }

    // ERROR扱いでも、一部のデータはあるので、結果配列にpushする
    // merge objects
    restaurantDetail = _.extend(restaurantDetail, basicInfo, addressInfo)
    utils.dump(restaurantDetail)

    // push to global variable for writing data when fetching is end
    restaurantDetails.push(restaurantDetail)
  })
}


// Average prices, Cuisine, Meals, Restaurant features, Good for, Open Hours
function getBasicInfo() {
  var titleSelector = '.table_section .row .title'
  var contentSelector = '.table_section .row .content'

  if (! casper.exists(titleSelector) || ! casper.exists(contentSelector)) {
    throw new Error('Not found basicInfo selector')
  }

  var PICK_KEY = 'text'
  var titles = casper.getElementsInfo(titleSelector)
  var contents = casper.getElementsInfo(contentSelector)

  var titleTexts = _.map(titles, function(e) {
    var title = _.first(_.values(_.pick(e, PICK_KEY)))
    return title.trim()
  })

  var contentTexts = _.map(contents, function(e) {
    var content = _.first(_.values(_.pick(e, PICK_KEY)))
    return content.trim()
  })

  var obj = _.object(titleTexts, contentTexts)
  return obj
}


function getLocationAndContactInfo() {
  var detailSelector = '.detailsContent .detail'
  var elems = casper.getElementsInfo(detailSelector)

  if (! casper.exists(detailSelector)) {
    throw new Error('Not found locationAndContactInfo selector')
  }

  // １つのObjectにAddress, Location, Phone Numberをまとめたい
  var obj = _.reduce(elems, function(cur, e) {
    // 苦し紛れに：という文字列でパース
    var splited = e['text'].split(':')
    var key = splited[0].trim()
    var value = splited[1].trim()
    cur[key] = value
    return cur
  }, {})

  return obj
}




// ENTRY POINT
casper.start(BASE_URL)

// set currency to USD
casper.then(function() {
  casper.thenEvaluate(function() {
    ta.util.currency.setCurrencyAndReload('USD', 'JPY')
  })
})

// FETCH
casper.then(function() {
  casper.eachThen(reviewLinks, function(response) {
    fetch(response.data)
  })
})

casper.run(function() {
  fs.write(OUTPUT_FILE_NAME, JSON.stringify(restaurantDetails), 'w')
  fs.write(OUTPUT_ERROR_FILE_NAME, JSON.stringify(errorLinks), 'w')
  this.echo('FINISHED').exit()
})
