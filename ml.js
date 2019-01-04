window.nn = new brain.NeuralNetwork();
window.nn2 = new brain.NeuralNetwork();

var step = 0;
var maxSteps = 0;
var progress = 0;
var maxProgress = 0;

const MAX_ITERATIONS = 20000;

window.train2 = async function train2(){
    let allData = [];

    maxSteps = 3;
    step++;
    $.ajax("awards_data.json").then(async data => {
        let maxProgress = data.input.length;
        await Promise.all(data.input.map(async function(input, i){
            progress++;
            let foo = { 
                input : { 
                    elo : ((input[0] - -2.43433633)/7.611593469), 
                    culture : ((input[1] - -0.581497665)/7.85479998), 
                    robot : ((input[2] - -0.379056123)/9.487511238), 
                    misc : ((input[3] - -0.457193077)/8.882426167) 
                }, 
                output : { 
                    ap : ((data.output[i][0] - -0.547436623) / 7.130510732)
                }
            };
            allData.push(foo);
        })); 

        let trainData = _.sampleSize(allData, allData.length * .8);
        let validateData = _.difference(allData,trainData);


        maxProgress = MAX_ITERATIONS;
        step++;
        nn2.trainAsync(trainData, {
            log : async function(data){
                fixedData = _.split(data,',');
                thingie = _.split(fixedData[0],':')[1];
                progress = _.trim(thingie);
                console.log(data);
                redrawProgress();
            },
            logPeriod : MAX_ITERATIONS/20,
            iterations : MAX_ITERATIONS
        }).then(async res => {
            console.log(res);
            await validateNN2(validateData);
            finalTrainData = _.union(trainData,validateData)
            nn2.trainAsync(finalTrainData, {
                log : async function(data){
                    fixedData = _.split(data,',');
                    thingie = _.split(fixedData[0],':')[1];
                    progress = _.trim(thingie);
                    console.log(data);
                    redrawProgress();
                },
                logPeriod : MAX_ITERATIONS/20,
                iterations : MAX_ITERATIONS
            }).then(async res2 =>{
                console.log(res2);
            });
        })
    });
}


window.train = async function train(){
    // years = [2016,2017];
    years = [2016, 2017];
    validateYears = [2018];
    maxSteps = years.length + validateYears.length + 3;
    var t0 = performance.now();

    loadData(years).then(function(trainingData){
        console.log(trainingData);
        maxProgress = MAX_ITERATIONS;
        step++;
        nn.trainAsync(trainingData, {
            log : async function(data){
                fixedData = _.split(data,',');
                thingie = _.split(fixedData[0],':')[1];
                progress = _.trim(thingie);
                //console.log(progress);
                redrawProgress();
            },
            logPeriod : MAX_ITERATIONS/20,
            iterations : MAX_ITERATIONS
        }).then(res => {
            loadData(validateYears).then(async validationTrainingData => {
                await validateNN(validationTrainingData);
                finalTrainingData = _.union(trainingData,validationTrainingData)
                maxProgress = MAX_ITERATIONS;
                progress = 0;
                nn.trainAsync(finalTrainingData, {
                    log : async function(data){
                        fixedData = _.split(data,',');
                        thingie = _.split(fixedData[0],':')[1];
                        progress = _.trim(thingie);
                        //console.log(progress);
                        redrawProgress();
                    },
                    logPeriod : MAX_ITERATIONS/20,
                    iterations : MAX_ITERATIONS
                }).then(res2 =>{
                    console.log(res2);
                    var t2 = performance.now();
                    console.log("final training took " + ((t2 - t1)/1000) + " seconds.");  
                });
            });

            console.log(res);
            var t1 = performance.now();
            console.log("training took " + ((t1 - t0)/1000) + " seconds.");  
        });
    });
}

var MAX_DP = 154;
var MIN_DP = 4;
var MAX_ELO = 1900;
var MIN_ELO = 1346;
var MAX_ELO_RANK = 40;
var MAX_AP = 85;
var MIN_AP = 0;


validateNN2 = async function validateNN2(trainingData){

    var totalError = 0;
    progress = 0;
    maxProgress = trainingData.length;
    step++;
    await Promise.all(trainingData.map(async (td) => {
        predicted = window.nn2.run(td.input).ap
        actual = td.output.ap;
        error = 1- Math.abs(predicted - actual);        
        totalError += error;
    }));

    accuracy = (totalError) / trainingData.length;
    alert("Accuracy : " + accuracy + "%");
}


validateNN = async function validateNN(trainingData){

    var totalError = 0;
    progress = 0;
    maxProgress = trainingData.length;
    step++;
    await Promise.all(trainingData.map(async (td) => {
        predicted = window.nn.run(td.input).dp
        actual = td.output.dp;
        error = 1- Math.abs(predicted - actual);        
        totalError += error;
    }));

    accuracy = (totalError) / trainingData.length;
    alert("Accuracy : " + accuracy + "%");
}
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
                            elo : 0//, 
                            //awardPoints : 0 
                        }, 
                    output : {
                        dp : 0
                    }
                }

                points = computePointsForTeam(te.team, districtPoints, awards);                
                scaledPoints = (points-MIN_DP)/(MAX_DP-MIN_DP);
                if(isNaN(scaledPoints)){
                    console.log("WTFBBQ :" + points + " " + scaledPoints + " " + te.team + " - " + e.key);
                    return;
                }

                trainData.input.eloR = Math.max(((MAX_ELO_RANK + 1) - te.eloRank) / MAX_ELO_RANK,0);
                trainData.input.elo = (te.elo - MIN_ELO) / (MAX_ELO - MIN_ELO);
                trainData.output.dp = scaledPoints;

                trainingData.push(trainData);
            });
            progress++;
            redrawProgress();
        }));
        redrawProgress();
    }

    return Promise.resolve(trainingData);
}

var verifiy2 = async function verifiy2(allTrainingData){
    await allTrainingData;

    allTrainingData.then(async trainingData =>{

        var totalError = 0;
        progress = 0;
        maxProgress = trainingData.length;
        step++;
        await Promise.all(trainingData.map(async (td) => {
            predicted = window.nn2.run(td.input.aInput).ap
            actual = td.output.ap;
            error = 1- Math.abs(predicted - actual);        
            totalError += error;
        }));

        accuracy = (totalError) / trainingData.length;
        alert("nn2 Accuracy : " + accuracy + "%");

        var totalError = 0;
        progress = 0;
        maxProgress = trainingData.length;
        step++;
        await Promise.all(trainingData.map(async (td) => {
            predicted = window.nn.run(td.input.rInput).dp
            actual = td.output.dp;
            error = 1- Math.abs(predicted - actual);        
            totalError += error;
        }));

        accuracy = (totalError) / trainingData.length;
        alert("nn1 Accuracy : " + accuracy + "%");

        var totalError = 0;
        progress = 0;
        maxProgress = trainingData.length;
        step++;
        await Promise.all(trainingData.map(async (td) => {
            predicted = window.nn.run(td.input.rInput).dp
            predictedA = window.nn2.run(td.input.aInput).ap
            actual = td.output.dp;
            actualA = td.output.ap;
            error = 1- Math.abs((predicted + predicted) - (actual + actualA));
            totalError += error;
        }));

        accuracy = (totalError) / trainingData.length;
        alert("overall Accuracy : " + accuracy + "%");
    });
}

loadData2 = async function loadData2(years){
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
            let districtPoints;
            let awards;
            let teams;
            [districtPoints, awards, teams] = await Promise.all([getDistrictPointsForEvent(e.key),getAwardsForEvent(e.key),getTeamsForEvent(e.key)])

            let teamElos = []

            teams.forEach(function(t){
                realTeam = getRealTeam(t,year);
                teamElos.push(realTeam);
            });

            teamElos = _.sortBy(teamElos, [function(te){
                return te.elo;
            }]);

            let i = teamElos.length;
            teamElos.forEach(function(te){
                te.eloRank = i--;
            });


            
            var awardsData = {};
            await $.ajax({url : 'real_data.json', async : false}).done(function(data){
                awardsData=data;
            });

            await Promise.all(teamElos.map(async function(te){
                let foo = awardsData.input["frc" + te.team];
                if(!foo){
                    foo = [(te.elo - MIN_ELO) / (MAX_ELO - MIN_ELO),0,0,0];
                }
                awardsInput = { 
                    elo : ((foo[0] - -2.43433633)/7.611593469), 
                    culture : ((foo[1] - -0.581497665)/7.85479998), 
                    robot : ((foo[2] - -0.379056123)/9.487511238), 
                    misc : ((foo[3] - -0.457193077)/8.882426167) 
                };

                var trainData = { 
                    input : {
                        rInput : {
                            eloR : 0, 
                            elo : 0
                        },
                        aInput : {
                            elo : 0,
                            culture : 0,
                            robot : 0,
                            misc : 0
                        }
                    }, 
                    output : {
                        dp : 0,
                        ap : 0
                    }
                }

                let points = computePointsForTeam(te.team, districtPoints, awards);                
                let awardPoints = computeAwardPointsForTeam(te.team, districtPoints, awards);
                let scaledAwardPoints = (awardPoints-MIN_AP)/(MAX_AP-MIN_AP);
                let scaledPoints = (points-MIN_DP)/(MAX_DP-MIN_DP);
                if(isNaN(scaledPoints)){
                    console.log("WTFBBQ :" + points + " " + scaledPoints + " " + te.team + " - " + e.key);
                    return;
                }

                trainData.input.rInput.eloR = Math.max(((MAX_ELO_RANK + 1) - te.eloRank) / MAX_ELO_RANK,0);
                trainData.input.rInput.elo = (te.elo - MIN_ELO) / (MAX_ELO - MIN_ELO);
                trainData.input.aInput = awardsInput;
                trainData.output.ap = scaledAwardPoints;
                trainData.output.dp = scaledPoints;

                trainingData.push(trainData);
            }));
            progress++;
            redrawProgress();
        }));
        redrawProgress();
    }

    return Promise.resolve(trainingData);
}



var computePointsForTeam = function computePointsForTeam(t, districtPoints, awards){

    var score = 0;
    let tbaData = districtPoints["frc" + t];

    if(!tbaData){
        console.log("sad " + t);
        console.log(districtPoints);
        return;
    }

    robotPoints = tbaData.alliance_points;
    robotPoints += tbaData.elim_points;
    robotPoints += tbaData.qual_points;

    score += robotPoints;

    return score;
}

var computeAwardPointsForTeam = function computePointsForTeam(t, districtPoints, awards){

    var score = 0;
    tbaData = districtPoints["frc" + t];

    if(!tbaData){
        return;
    }
    awardsForTeam = _.filter(awards,function(a){
        return !!_.find(a.recipient_list,function(at){
            return Number(_.replace(at.team_key,'frc','')) == t;
        });
    });

    var awardPoints = 0;

    awardsForTeam.forEach(function(a){
        points = _.find(window.awardPointMappings, function(ap){
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
