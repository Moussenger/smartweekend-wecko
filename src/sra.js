"use strict";

var SRA = (function () {
    var SRAMath;

    var WEIGHTS = {
        "client" : {
            weight: 0.3,
            aspects: {
                "Recepción de la factura"   : 0.3, 
                "Información de la reserva" : 0.3, 
                "Comunicaciones realizadas" : 0.2, 
                "Actividades ofertadas"     : 0.2
            }
        },

        "user" : {
            weight: 0.7,
            aspects : {
                "Adecuación de la descripción" : 0.6, 
                "Limpieza"                     : 0.3, 
                "Habitación"                   : 0.2, 
                "Desayuno"                     : 0.2
            }
        }
    };

    var DATE_DISTANCE            = 600;
    var DATE_DISTANCE_CORRECTION = 0.5;  


    SRAMath = (function () {
        function SRAMath () {};

        SRAMath.prototype.pearson = function (user1, user2) {
            
            function pearsonMean (u1, u2, commons) {
                var i, size, mean, service;

                mean = [0, 0]

                for (i=0, size=commons.length; i<size; i++) {
                    service = commons[i];
                    mean[0] += u1[service];
                    mean[1] += u2[service];
                }

                mean[0] /= commons.length;
                mean[1] /= commons.length;

                return mean;
            }

            var i, commons, commonsSize, service, pearsonMeans, 
                meanUser1, meanUser2, num, den, den1, den2;

            commons = [];

            for (service in user1) {
                if (service in user2) 
                    commons.push(service);
            }

            commonsSize = commons.length;

            if (commonsSize === 0) return 0;

            pearsonMeans = pearsonMean(user1, user2, commons);

            meanUser1 = pearsonMeans[0];
            meanUser2 = pearsonMeans[1];

            num  = 0;
            den1 = 0;
            den2 = 0;

            for (i=0; i<commonsSize; i++) {
                service = commons[i];
                num  += ( (user1[service]-meanUser1) * (user2[service] - meanUser2) );
                den1 += Math.pow(user1[service] - meanUser1, 2);
                den2 += Math.pow(user2[service] - meanUser2, 2);
            }

            den1 = Math.sqrt(den1);
            den2 = Math.sqrt(den2);

            den = den1*den2;

            if (den == 0) return 0;

            return num / den;

        }


        SRAMath.prototype.serviceGlobalMean = function (data, service, weights) {
            var sum, count, user, mark;

            sum = 0;
            count = 0;

            for (user in data) {
                mark = data[user].marks[service];

                if (mark !== undefined) {
                    if (weights && weights[user] !== undefined)
                        mark *= ( (1+weights[user]) );

                    

                    sum += mark;
                    count++;
                }
            }

            return sum / count;
        }

        SRAMath.prototype.pearsonMatrix = function (data) {
            var matrix, userFocus, user;

            matrix = {};

            for (userFocus in data) {
                matrix[userFocus] = {};

                for(user in data) {
                    matrix[userFocus][user] = this.pearson(data[userFocus].marks, data[user].marks);
                }
            }   

            return matrix;
        }


        SRAMath.prototype.globalMean = function (data, weights) {
            var mean, count, user, type, u, s, mark;

            mean = {
                client : {},
                user   : {}
            };

            count = {
                client : {},
                user   : {}
            };

            for (u in data) {
                user = data[u];
                type = user.type;

                for(s in user.marks) {
                    mark = user.marks[s];

                    if (weights && weights[u] !== undefined)
                        mark *= ( (1+weights[u]) );

                    if (mark > 5) mark = 5;
                    if (mark < 0) mark = 0;

                    if(mean[type][s] == undefined) {
                        mean[type][s] = mark;
                        count[type][s] = 1;
                    } else {
                        mean[type][s] += mark;
                        count[type][s]++;
                    }
                }
            }


            for(s in mean.client) {
                mean.client[s] /= count.client[s];
            }   

            for(s in mean.user) {
                mean.user[s] /= count.user[s];
            }

            return mean;
        }


        return SRAMath;
    })();

    function calcUserServiceMarksData (data) {
        var u, s, d, i, a, user, type, services, dates, aspect, mark, size, 
            newData, count, countPonderation, distance;

        newData = {};

        for (u in data) {
            user = data[u];
            type = user.type;

            newData[u] = {};
            newData[u].type = type;
            newData[u].marks = {};

            for (s in user.marks) {
                services = user.marks[s];
                mark = 0;
                count = 0;

                for (d in services) {
                    dates = services[d];
                    distance = 20121231 - parseInt(d) > 600 ? DATE_DISTANCE_CORRECTION : 1;
                    
                    for(i=0, size = dates.length; i < size; i++) {
                        countPonderation = 0;

                        for (a in dates[i]) {
                            aspect = dates[i][a];
                            mark += (parseInt(aspect.mark) * 
                                     parseInt(aspect.quality) * 
                                     WEIGHTS[type].aspects[a] *
                                     distance);

                            countPonderation += (parseInt(aspect.quality) * WEIGHTS[type].aspects[a] * distance);
                        }

                        count += countPonderation; 
                    } 

                }

                mark = mark / count;
                    if(mark > 10) {
                        console.log(mark + "--" + size);
                        return;
                    }

                newData[u].marks[s] = mark;
            }
        }

        return newData;

    }

    SRA.prototype.getNormalizedMean = function (meanData) {
        var i, clientMean, userMean, normalizedMean;
        normalizedMean = {};

        for (i=1; i<=40; i++) {
            clientMean = meanData.client[i];
            userMean   = meanData.user[i];

            if (clientMean !== undefined && userMean !== undefined) {
                normalizedMean[i] = ((clientMean * WEIGHTS.client.weight) + (userMean * WEIGHTS.user.weight)).toFixed(1);
            } else if(clientMean !== undefined) {
                normalizedMean[i] = clientMean.toFixed(1);
            } else if (userMean !== undefined) {
                normalizedMean[i] = userMean.toFixed(1);
            } else {
                normalizedMean[i] = "-";
            }
        }

        return normalizedMean;
    }

    SRA.prototype.getNormalizedMeanType = function (meanData, type) {
        var i, mean, normalizedMean;
        normalizedMean = {};

        for (i=1; i<=40; i++) {
            mean = meanData[type][i];

            if (mean !== undefined) {
                normalizedMean[i] = mean.toFixed(1);
            } else {
                normalizedMean[i] = "-";
            }
        }

        return normalizedMean;
    }

    SRA.prototype.updateUser = function (user) {
        this.user = user;
        this.userPearsonMean = this.SRAMath.globalMean(this.data, this.pearsonMatrix[user]);
        this.normalizedPearson = this.getNormalizedMean(this.userPearsonMean);
    }

    SRA.prototype.includeNewData = function (newData) {
        var u, user, s, date;
        for (u in newData) {
            user = newData[u];

            for (s in user.marks) {
                date = user.marks[s][20131231]; 

                if (date && date.length > 1) {
                    this.badUsers.push(u);
                    break;
                } else if (date) {
                    if (this.rawData[u] && this.rawData[u].marks[s]) {
                        if(this.rawData[u].marks[s][20131231] !== undefined) {
                            this.rawData[u].marks[s][20131231].push.apply(this.rawData[u].marks[s][20131231], date);   
                        } else {
                            this.rawData[u].marks[s][20131231] = date;
                        }
                    }
                }
            }
        }
        this.update(this.rawData);
    }

    SRA.prototype.update = function (data) {
        this.rawData         = data;
        this.data            = calcUserServiceMarksData(data);
        this.pearsonMatrix   = this.SRAMath.pearsonMatrix(this.data);
        this.globalMean      = this.SRAMath.globalMean(this.data);

        this.normalizedMean = this.getNormalizedMean(this.globalMean);
        this.normalizedPearson = {};

        this.normalizedClient = this.getNormalizedMeanType(this.globalMean, "client");
        this.normalizedUser   = this.getNormalizedMeanType(this.globalMean, "user");

    }

    function SRA (data) {
        this.SRAMath = new SRAMath();

        this.services = [];
        this.badUsers = [];

        for(var i=1; i<=40; i++) {
            this.services.push(i);
        }

        this.update(data);
    };

    return SRA;
})();