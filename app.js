var _ = require('lodash'),
    express = require('express'),
    bodyParser = require('body-parser'),
    moment = require('moment-timezone');

var app = express();
var data = require('./db.json').data;
var fs = require("fs")

// Parse application/json
app.use(bodyParser.json())

// Stub data
var locale = "Asia/Dubai";

// Probably not the safest way to handle CORS
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT');
    res.header("Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Wrapper to send data with max latency of 1 second
function send(response, data) {
    setTimeout(function () {
        response.send(JSON.stringify(data))
    }, Math.floor(Math.random() * 1000));
}


// End-point to get booked nights
// * start and end are integers (seconds since Unix epoch)
app.get('/reserve/:start/:end', function (request, response) {
    var start = parseInt(request.params.start);
    var end = parseInt(request.params.end);

    if (isNaN(start) || isNaN(end)) {
        response.status(400);
        response.send('Bad Request');
        return;
    }

    var reserved = _.filter(data, function (d) {
        return d.fromDate >= start || d.toDate <= end;
    });

    console.log(reserved)

    send(response, reserved);
});

// End-point to change
app.post('/reserve', function (request, response) {
    var body = request.body;

    if (isNaN(body.fromDate)) {
        response.status(400);
        response.send('fromDate is NaN');
        return;
    } else if (isNaN(body.toDate)) {
        response.status(400);
        response.send('toDate is NaN');
        return;
    } else if (!body.tenantName) {
        response.status(400);
        response.send("Tenant Name is missing.");
        return;
    } else {
        var reserved = body.reserved;
        var name = body.tenantName;

        var tenantData = {
            "tenantName": name,
            "fromDate": body.fromDate,
            "toDate": body.toDate
        };
        console.log(reserved)
        var isReserved = () => {
            if (reserved) {
                return _.filter(data, function (d) {
                    return body.fromDate >= d.fromDate && body.fromDate <= d.toDate;
                }).length;
            } else {
                return _.filter(data, function (d) {
                    return body.fromDate == d.fromDate && body.toDate == d.toDate && name == d.tenantName;
                }).length;
            }
        }

        console.log("isReserved ", isReserved());

        if (reserved && isReserved()) {
            response.status(400);
            response.send('Slot already reserved');
            return;
        }

        if (!reserved && !isReserved()) {
            response.status(400);
            response.send('Slot not found or Tenant name mismatch');
            return;
        }

        if (reserved) {
            data.push(tenantData);
        } else {
            _.remove(data, (d) => {
                return body.fromDate == d.fromDate && body.toDate == d.toDate && d.tenantName == name;
            });
        }

        console.log(data);

        fs.writeFile("./db.json", JSON.stringify({ data: data }), (err, res) => {
            if (!err) {
                send(response, {
                    success: true
                });
            } else {
                response.status(400)
                response.send(err)
            }
        })
    }
});

// Get server time
app.get('/now', function (request, response) {
    send(response, new Date());
});

var port = 3000;
console.info("API server listening at http://localhost:" + port)
app.listen(port);