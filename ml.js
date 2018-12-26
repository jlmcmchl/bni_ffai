window.nn = new brain.NeuralNetwork();

var step = 0;
var maxSteps = 0;
var progress = 0;
var maxProgress = 0;


window.train = async function train(){
    years = [2016,2017,2018];
    // years = [2016];
    maxSteps = years.length + 1;
    var t0 = performance.now();

    loadData(years).then(function(trainingData){
        console.log(trainingData);
        maxProgress = 20000;
        step++;
        nn.trainAsync(trainingData, {
            log : async function(data){
                fixedData = _.split(data,',');
                thingie = _.split(fixedData[0],':')[1];
                progress = _.trim(thingie);
                //console.log(progress);
                redrawProgress();
            },
            logPeriod : 100
        }).then(res => {
            console.log(res);
            var t1 = performance.now();
            console.log("training took " + ((t1 - t0)/1000) + " seconds.");    
        })
    });
}

var MAX_DP = 154;
var MIN_DP = 4;
var MAX_ELO = 1900;
var MIN_ELO = 1346;
var MAX_ELO_RANK = 40;


loadData = async function loadData(years){
    trainingData = [];


    for(const year of years){
        step++;
        elosForYear = _.map(_.filter(window.teamStrength, function(t){
            return t.year == year;
        }),function(t){
            return t.elo;
        });

        MAX_ELO = _.max(elosForYear);
        MIN_ELO = _.min(elosForYear);


        let events = await getEventsForYear(year);
        //// for testing and not blowing up TBA
        // events = [events[0]];
        index = 1;

        maxProgress = events.length;
        progress = 0;
        redrawProgress();
        await Promise.all(events.map(async (e) => {
            var districtPoints;
            var awards;
            var teams;
            [districtPoints, awards, teams] = await Promise.all([getDistrictPointsForEvent(e.key),getAwardsForEvent(e.key),getTeamsForEvent(e.key)])

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

            teamElos.forEach(async function(te){
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
            progress++;
            redrawProgress();
        }));
        redrawProgress();
    }

    return Promise.resolve(trainingData);
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

var getDistrictPointsForEvent = async function getDistrictPointsForEvent(eventCode){
    url = "https://www.thebluealliance.com/api/v3/event/" + eventCode + "/district_points";
    let data = await $.ajax({ 'url' : url });
    return Promise.resolve(data.points);
}

var getAwardsForEvent = async function getAwardsForEvent(eventCode){
    url = "https://www.thebluealliance.com/api/v3/event/" + eventCode + "/awards";
    return $.ajax({ 'url' : url});
}


var getEventsForYear = async function getEventsForYear(year){
    url = "https://www.thebluealliance.com/api/v3/events/" + year + "/simple";
    let events = await $.ajax({ 'url' : url});
    filtered = _.filter(events, function(e){
        return e.event_type <= 1;
    });
    return Promise.resolve(filtered);
}

var getTeamsForEvent = async function getEventsForYear(eventCode){
    url = "https://www.thebluealliance.com/api/v3/event/" + eventCode + "/teams/keys";

    let data = await $.ajax({ 'url' : url });
    teams = _.map(data, function(t){
        return Number(_.replace(t,'frc',''));
    });

    teams.sort((a, b) => a - b);

    return Promise.resolve(teams);
}

var redrawProgress = async function redrawProgress(){
    $('#steps').prop('max',maxSteps);
    $('#progress').prop('max',maxProgress);
    $('#steps').prop('value',step);
    $('#progress').prop('value',progress);
}
