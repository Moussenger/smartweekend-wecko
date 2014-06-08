/*
    user = {
        type  : "user" | "client",
        marks : {
            "123": {
                "20131204" : [
                    {
                        "tranquilidad": {mark, quality},
                    }
                ]   
            }
        }
    }

    //Calc data

    user = {
        type  : "user" | "client",
        marks : {
            "123" : number,
            }
        }
    }
*/

"use strict";

var util = require("util");
var fs   = require("fs");

var ASPECTS_CLIENT = ["Recepción de la factura", "Información de la reserva", "Comunicaciones realizadas", "Actividades ofertadas"];
var ASPECTS_USER   = ["Adecuación de la descripción", "Limpieza", "Habitación", "Desayuno"];

var GENERATION_CLIENT = 1;
var GENERATION_USER   = 2;

var DATE_CLIENT_VARIATION = 7;
var DATE_USER_VARIATION   = 5;

var QUALITY_DEGRADATION           = [1];
var DATE_QUALITY_CORRECTION_RANGE = 10;
var DATE_QUALITY_FUZZY_RANGE      = 5;
var DATE_QUALITY_CORRECTION       = 1; 

var USERS       = 10;
var SERVICES    = 4;
var TYPES       = ["client", "user"];
var RANGE_DATE  = [ [2013, 12, 31], [2013, 12, 31] ];
var RANGE_NOTE  = [0, 5];

var data = {};


function getRandomDate () {
    var YEAR  = [ RANGE_DATE[0][0], RANGE_DATE[1][0] ];
    var MONTH = [ RANGE_DATE[0][1], RANGE_DATE[1][1] ];
    var DAY   = [ RANGE_DATE[0][2], RANGE_DATE[1][2] ];

    var year  = ((Math.random() * (YEAR[1] - YEAR[0])) + YEAR[0] ).toFixed(0);
    var month = ((Math.random() * (MONTH[1] - MONTH[0])) + MONTH[0] ).toFixed(0);
    var day   = ((Math.random() * (DAY[1] - DAY[0])) + DAY[0] ).toFixed(0);

    year  = year < 10 ? "0" + year :  year;
    month = month < 10 ? "0" + month :  month;
    day   = day < 10 ? "0" + day :  day;

    return year + "" + month + "" + day;
}


function getMinDateSeparation (dates, date) {
    function getDateDistance (date1, date2) {
        var year1  = parseInt(date1.substring(0, 4));
        var month1 = parseInt(date1.substring(4, 6));
        var day1   = parseInt(date1.substring(6, 8));

        var year2  = parseInt(date2.substring(0, 4));
        var month2 = parseInt(date2.substring(4, 6));
        var day2   = parseInt(date2.substring(6, 8));

        var t1 = new Date(year1, month1, day1);
        var t2 = new Date(year2, month2, day2);

        return Math.abs(parseInt((t2-t1)/(24*3600*1000)));
    }

    var minSeparation = DATE_QUALITY_CORRECTION_RANGE + 1; 

    for (var i=0; i<dates.length; i++) {
        var distance = getDateDistance(date, dates[i]);

        if(minSeparation > distance) minSeparation = distance;
    }

    return minSeparation;
}


function getDateQualityCorrectionFactor (dates, date) {
    var qualityCorrectionComplete    = DATE_QUALITY_CORRECTION_RANGE - DATE_QUALITY_FUZZY_RANGE;
    var qualityCorrectionFuzzyFactor = ((1 - DATE_QUALITY_CORRECTION) / DATE_QUALITY_FUZZY_RANGE).toFixed(2);  
    var qualityFactor = 1;
    var dateSeparation = getMinDateSeparation(dates, date);

    if (dateSeparation == 0) return 1;


    if (dateSeparation <= qualityCorrectionComplete) {
        qualityFactor = qualityFactor * DATE_QUALITY_CORRECTION;
    } else if(dateSeparation <= DATE_QUALITY_CORRECTION_RANGE) {
        qualityFactor = qualityFactor * (DATE_QUALITY_CORRECTION + ( ( DATE_QUALITY_FUZZY_RANGE - (
            Math.abs(dateSeparation - DATE_QUALITY_CORRECTION_RANGE))) * qualityCorrectionFuzzyFactor ) );
    }

    return qualityFactor.toFixed(2);
}


function shuffle(o){ 
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}


for (var user=1; user <= USERS; user++) {
    var type = 0;
    var count = 0;

    data[user] = {};
    data[user].type = Math.random() < 0.2 ? "client" : "user";

    type = data[user].type == "client" ?  Math.random() / GENERATION_CLIENT : Math.random() / GENERATION_USER; 
    data[user].marks = {};

    var dates = [];

    var services = [];

    for (var service = 1; service <= SERVICES; service++) {
        if(Math.random() < type) {
            var aspectTypes = data[user].type === "client" ? ASPECTS_CLIENT : ASPECTS_USER;
            var dateVariation = data[user].type === "client" ? DATE_CLIENT_VARIATION : DATE_USER_VARIATION;
            var dateFrequency = (Math.random() * dateVariation).toFixed(0) || 1;

            for(var v=0; v<dateFrequency; v++){
                services.push(service);
                count++;
            }
        }
    }


    for(var d = 0; d < services.length; d++) {
        dates.push(getRandomDate());
    }

    dates.sort();

    services = shuffle(services);

    for(var date=0; date < dates.length ; date++) {
        var serviceDate = dates[date];
        var service = services[date];
        var quality = 1;

        if(data[user].marks[service] === undefined)
            data[user].marks[service] = {};


        if(data[user].marks[service][serviceDate] === undefined) {
            data[user].marks[service][serviceDate] = [];
        } else {
            var length = data[user].marks[service][serviceDate].length
            quality = length < QUALITY_DEGRADATION.length ? QUALITY_DEGRADATION[length] : 0;
        }

        quality *= getDateQualityCorrectionFactor(dates.slice(0, date), serviceDate);

        var aspectsObject = {}

        var range_length = RANGE_NOTE[1] - RANGE_NOTE[0];
        var range_min    = RANGE_NOTE[0];  

        for(var aspect = 0; aspect < aspectTypes.length; aspect++) {
            var mark = ((Math.random() * range_length) + range_min).toFixed(0);
            var variation = (((Math.random() * range_length) / 4));

            variation = Math.random() < 0.5 ? variation: variation*-1;
            if(Math.random() < 0.3) mark -= Math.random() * range_length / 2;
            mark += variation;

            mark = mark > RANGE_NOTE[1] ? RANGE_NOTE[1] : mark;
            mark = mark < RANGE_NOTE[0] ? RANGE_NOTE[0] : mark;
            
            aspectsObject[aspectTypes[aspect]] = {
                mark: mark,
                quality: quality
            }
        }

        data[user].marks[service][serviceDate].push(aspectsObject);
    }

    //console.log(count);

}

//console.log(util.inspect(data[1], false, null));
//console.log(data);

fs.writeFileSync("newdata.js", "var NEW_DATA="+JSON.stringify(data));