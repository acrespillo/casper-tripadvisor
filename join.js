var fs = require('fs')
var _ = require('lodash')
var noerror = require('./rest-detail-list-noerror.json')
var fewinfo = require('./rest-detail-list-fewinfo.json')
var links = require('./review-link-list.json')

var concated = noerror.concat(fewinfo)
var linksaa = _.uniq(links)
console.log(linksaa.length)

// fs.writeFileSync('./concated.json', JSON.stringify(concated), 'utf8')
