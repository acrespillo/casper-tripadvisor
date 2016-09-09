var _ = require('underscore')
var fs = require('fs')
var utils = require('utils')
var casper = require('casper').create({
  verbose: true,
  logLevel: 'warning',
  waitTimeout: 5000,
})

// constants
var BASE_URL = 'https://www.tripadvisor.co.uk'
var OUTPUT_FILE_NAME = 'rest-detail-list.json'

// globals
var reviewLinks = require('./review-link-list.json')
var allLength = reviewLinks.length
// 全てのkeyが存在するとは限らないので注意
var restaurantDetails = []
var currentLinkNumber = 0


function echoLinkIsLoaded(linkNumber) {
  casper.echo('##############################');
  casper.echo('LINK NUMBER [' + linkNumber + ' / ' + allLength + '] IS LOADED');
  casper.echo('##############################');
}

// Average prices, Cuisine, Meals, Restaurant features, Good for, Open Hours
// TODO: Average pricesがなぜかJPYで取得されるのでどうにかしたい、できれば。
function getBasicInfo() {
  var PICK_KEY = 'text'
  var titles = casper.getElementsInfo('.table_section .row .title')
  var contents = casper.getElementsInfo('.table_section .row .content')

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
  var elems = casper.getElementsInfo('.detailsContent .detail')

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
// FIXME: reviewLinks[170] でおちる
casper.start().each(reviewLinks, function(self, link) {
  this.thenOpen(BASE_URL + link, function() {
    echoLinkIsLoaded(++currentLinkNumber)
    var restaurantDetail = {}

    // fetch information
    restaurantDetail.name = this.fetchText('h1#HEADING').trim()
    var basicInfo = getBasicInfo()
    var addressInfo = getLocationAndContactInfo()

    // merge objects
    restaurantDetail = _.extend(restaurantDetail, basicInfo, addressInfo)
    utils.dump(restaurantDetail)

    // push to global variable for writing data when fetching is end
    restaurantDetails.push(restaurantDetail)
  })
})

casper.run(function() {
  fs.write(OUTPUT_FILE_NAME, JSON.stringify(restaurantDetails), 'w')
  this.echo('FINISHED').exit()
})
