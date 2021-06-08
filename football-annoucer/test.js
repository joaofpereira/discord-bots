const request = require('request');

// authentication tokens and settings
var auth = require('./auth.json');
var settings = require('./settings.json');

settings.football_data_competitions.forEach(element => {
    console.log(element)
});

var todayDate = new Date()
todayDate = GetSimplifiedDate(todayDate)
todayDate = "2020-09-19"
var finalUrl = settings.football_data_api + `matches?dateFrom=${todayDate}&dateTo=${todayDate}&competitions=${settings.football_data_competitions}`

console.log(finalUrl)

// formats a Date into the format "year-month-day"
function GetSimplifiedDate(date) {
    const dateTimeFormat = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' }) 
    const [{ value: month },,{ value: day },,{ value: year }] = dateTimeFormat.formatToParts(date)
    return `${year}-${month}-${day}`
}