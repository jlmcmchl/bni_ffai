window.nn = new brain.NeuralNetwork();

window.train = function train(){
    trainingData = loadData([2016,2017,2018]);
    console.log(trainingData);
    var t0 = performance.now();
    nn.train(trainingData, {
        log : true
    });
    var t1 = performance.now();
    console.log("training took " + ((t1 - t0)/1000) + " seconds.")
}

var MAX_DP = 154;
var MIN_DP = 4;
var MAX_ELO = 1900;
var MIN_ELO = 1346;
var MAX_ELO_RANK = 40;


var loadData = function loadData(years){
    trainingData = [];

    years.forEach(function(year){
        elosForYear = _.map(_.filter(window.teamStrength, function(t){
            return t.year == year;
        }),function(t){
            return t.elo;
        });

        MAX_ELO = _.max(elosForYear);
        MIN_ELO = _.min(elosForYear);


        events = getEventsForYear(year);
        index = 1;
        events.forEach(function(e){
            teams = getTeamsForEvent(e.key);
            districtPoints = getDistrictPointsForEvent(e.key);
            awards = getAwardsForEvent(e.key);

            teamElos = []

            teams.forEach(function(t){
                realTeam = getRealTeam(t,year);
                teamElos.push(realTeam);
            });

            teamElos = _.sortBy(teamElos, [function(te){
                return te.elo;
            }]);

            i = teamElos.length;
            teamElos.forEach(function(te){
                te.eloRank = i--;
            });

            teamElos.forEach(function(te){
                var trainData = { 
                    input : { 
                            eloR : 0, 
                            elo : 0, 
                            awardPoints : 0 
                        }, 
                    output : {
                        dp : 0
                    }
                }

                points = computePointsForTeam(te.team, districtPoints, awards);
                points = (points-MIN_DP)/MAX_DP;

                trainData.input.eloR = Math.max(((MAX_ELO_RANK + 1) - te.eloRank) / MAX_ELO_RANK,0);
                trainData.input.elo = (te.elo - MIN_ELO) / (MAX_ELO - MIN_ELO);
                trainData.output.dp = points;

                trainingData.push(trainData);
            });
            console.log("finished event " + e.key + " - left: " + (events.length - index++))
        });
    });

    return trainingData;
}


var computePointsForTeam = function computePointsForTeam(t, districtPoints, awards){
    var score = 0;
    tbaData = districtPoints["frc" + t];

    if(!tbaData){
        return;
    }

    robotPoints = tbaData.alliance_points;
    robotPoints += tbaData.elim_points;
    robotPoints += tbaData.qual_points;

    score += robotPoints;

    awardsForTeam = _.filter(awards,function(a){
        return !!_.find(a.recipient_list,function(at){
            return Number(_.replace(at.team_key,'frc','')) == t;
        });
    });

    var awardPoints = 0;

    awardsForTeam.forEach(function(a){
        points = _.find(window.awardPoints, function(ap){
            return ap.awardType == a.award_type;
        });

        awardPoints += points.points;
    });

    score += awardPoints;

    return score;
}

var getDistrictPointsForEvent = function getDistrictPointsForEvent(eventCode){
    url = "https://www.thebluealliance.com/api/v3/event/" + eventCode + "/district_points";
    var robotPointsMap;
    $.ajax({ 'url' : url, async: false }).done(function(data){
        robotPointsMap = data.points;
    });

    return robotPointsMap;
}

var getAwardsForEvent = function getAwardsForEvent(eventCode){
    url = "https://www.thebluealliance.com/api/v3/event/" + eventCode + "/awards";
    var awards;
    $.ajax({ 'url' : url, async: false }).done(function(data){
        awards = data;
    });
    return awards;
}


var getEventsForYear = function getEventsForYear(year){
    url = "https://www.thebluealliance.com/api/v3/events/" + year + "/simple";
    var events;

    $.ajax({ 'url' : url, async: false }).done(function(data){
        events = data;
    });

    events = _.filter(events, function(e){
        return e.event_type <= 1;
    });
    return events;
}

var getTeamsForEvent = function getEventsForYear(eventCode){
    url = "https://www.thebluealliance.com/api/v3/event/" + eventCode + "/teams/keys";

    var teams;

    $.ajax({ 'url' : url, async: false }).done(function(data){
        
        teams = _.map(data, function(t){
            return Number(_.replace(t,'frc',''));
        });
        teams.sort((a, b) => a - b);
    });

    return teams;
}

