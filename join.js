var fs = require('fs')
var _ = require('lodash')
// var noerror = require('./rest-detail-list-noerror.json')
var concated = require('./concated')

var names = _.pluck(concated, 'name')

// fs.writeFileSync('./concated.json', JSON.stringify(concated), 'utf8')
