var allTeams = null;
var remainingTeams = null;
var teamElos = [];


var eventCode = null;
var year = null;
var numEntrants = null;
var realData;

$(document).ready(function(){
    $.ajaxSetup({
        headers: { 'X-TBA-Auth-Key': window.TBA_KEY }
    });
    window.nn.fromJSON(JSON.parse("{\"sizes\":[3,3,1],\"layers\":[{\"eloR\":{},\"elo\":{},\"awardPoints\":{}},{\"0\":{\"bias\":7.715017795562744,\"weights\":{\"eloR\":-6.021084308624268,\"elo\":-2.994114637374878,\"awardPoints\":0.0805177316069603}},\"1\":{\"bias\":16.989913940429688,\"weights\":{\"eloR\":-1.2828679084777832,\"elo\":-62.11130905151367,\"awardPoints\":0.06135927513241768}},\"2\":{\"bias\":0.6715385913848877,\"weights\":{\"eloR\":-3.992039203643799,\"elo\":1.430396318435669,\"awardPoints\":0.17906738817691803}}},{\"dp\":{\"bias\":0.19351708889007568,\"weights\":{\"0\":-1.8810129165649414,\"1\":-0.17982758581638336,\"2\":-1.183253526687622}}}],\"outputLookup\":true,\"inputLookup\":true,\"activation\":\"sigmoid\",\"trainOpts\":{\"iterations\":100000,\"errorThresh\":0.005,\"log\":true,\"logPeriod\":100,\"learningRate\":0.3,\"momentum\":0.1,\"callbackPeriod\":10,\"beta1\":0.9,\"beta2\":0.999,\"epsilon\":1e-8}}"));
    window.nn2.fromJSON(JSON.parse("{\"sizes\":[4,3,1],\"layers\":[{\"elo\":{},\"culture\":{},\"robot\":{},\"misc\":{}},{\"0\":{\"bias\":2.3207645416259766,\"weights\":{\"elo\":-5.516711711883545,\"culture\":-1.4694764614105225,\"robot\":-7.287108421325684,\"misc\":-2.1913089752197266}},\"1\":{\"bias\":48.7455940246582,\"weights\":{\"elo\":-21.85824203491211,\"culture\":-27.108734130859375,\"robot\":-43.906795501708984,\"misc\":-12.615828514099121}},\"2\":{\"bias\":-1.313089370727539,\"weights\":{\"elo\":22.935991287231445,\"culture\":-28.459653854370117,\"robot\":-24.29568862915039,\"misc\":-19.242151260375977}}},{\"ap\":{\"bias\":0.7769431471824646,\"weights\":{\"0\":-3.839442253112793,\"1\":-1.483941674232483,\"2\":-0.39237841963768005}}}],\"outputLookup\":true,\"inputLookup\":true,\"activation\":\"sigmoid\",\"trainOpts\":{\"iterations\":100000,\"errorThresh\":0.005,\"log\":true,\"logPeriod\":100,\"learningRate\":0.3,\"momentum\":0.1,\"callbackPeriod\":10,\"beta1\":0.9,\"beta2\":0.999,\"epsilon\":1e-8}}"));
    updatePicks();

    $('#pick_field').keypress(function(e) {
        if(e.which == 13) {
            if(eventCode != null){
                runDraft($('#pick_field').val());
            } else if(numEntrants != null){
                eventCode = $('#pick_field').val();
                pollDataForEvent(eventCode);
                updateRemainingTeams();

                startDraft();
            } else {
                numEntrants = $('#pick_field').val();
                entrants = [];
                for(i = 0; i < numEntrants; i++){
                    entrant = {
                        name : _.sample(window.entrantNames),
                        position : 0,
                        picks : [],
                        score : null,
                        predicted : 0
                    }

                    entrants.push(entrant);
                }
                updatePicks();
                $('.message_balloon p').text("Please input event code!");
            }
            $('#pick_field').val(null);
        }
    });

    $('#train_btn').click(function(){
        window.train();
    });

    $('#train2_btn').click(function(){
        window.train2();
    });

    $('#nn_pick_btn').click(async function(){
        window.scoreYear(2020);
    });

    $.ajax({url : 'real_data.json', async : false}).done(function(data){
        realData = data;
    });

});


var scoreSLFF = function scoreSLFF(){

    let teams = _.map(_.uniq(_.map(window.slffPicks, slffPick =>{
        return slffPick.team;
    })), t=>{
        return { team : t, score : 0};
    });

    let districtPicks = _.filter(window.slffPicks,pick=>{
        return !pick.event_key.startsWith('2019');
    });
    let eventPicks = _.difference(window.slffPicks, districtPicks);

    let districts = _.uniq(_.map(districtPicks, slffPick =>{
        return "2019" + slffPick.event_key.toLowerCase();
    }));

    let events = _.uniq(_.map(eventPicks, slffPick =>{
        return slffPick.event_key;
    }));

    events.forEach(event =>{
        pollDataForEvent(event);
        actualTeams = _.map(remainingTeams, function(t){
            retVal = getRealTeam(t,year);
            return retVal;
        });

        let slffPicksForEvent = _.filter(eventPicks, slffPick =>{
            return slffPick.event_key == event;
        });

        let coiTeam = null;

        let eventScore = 0;

        slffPicksForEvent.forEach(slffPick =>{
            if(slffPick.picks.includes('COI')){
                coiTeam = slffPick;
                return;
            }
            let pickedTeams = _.filter(actualTeams, at =>{
                return slffPick.picks.includes(at.team);
            })
                let ts = _.filter(teams, team =>{
                return team.team == slffPick.team;
            })[0];
    
            let teamEventScore = 0;

            pickedTeams.forEach(pickedTeam =>{
                eventScore += pickedTeam.predicted;
                ts.score += pickedTeam.predicted;
                teamEventScore += pickedTeam.predicted;
            });
            slffPick.score = teamEventScore;
        });
        let avgScore = (eventScore / slffPicksForEvent.length);

        if(!!coiTeam){
            let t = _.filter(teams, team =>{
                return team.team == coiTeam.team;
            })[0];
            coiTeam.score = avgScore;
            t.score += avgScore;
        }
    });

    districts.forEach(district =>{

        pollDataForDistrict(district);
        actualTeams = _.map(remainingTeams, function(t){
            retVal = getRealTeam(t,year);
            return retVal;
        });

        let slffPicksForDistrict = _.filter(districtPicks, slffPick =>{
            return ("2019" + slffPick.event_key.toLowerCase()) == district;
        });

        let coiTeam = null;

        let eventScore = 0;

        slffPicksForDistrict.forEach(slffPick =>{
            if(slffPick.picks.includes('COI')){
                coiTeam = slffPick;
                return;
            }
            let pickedTeams = _.filter(actualTeams, at =>{
                return slffPick.picks.includes(at.team);
            })
            let ts = _.filter(teams, team =>{
                return team.team == slffPick.team;
            })[0];
    
            let teamEventScore = 0;

            pickedTeams.forEach(pickedTeam =>{
                eventScore += (pickedTeam.predicted * 2);
                ts.score += (pickedTeam.predicted * 2);
                teamEventScore += (pickedTeam.predicted * 2);
            });
            slffPick.score = teamEventScore;
        });
        let avgScore = (eventScore / slffPicksForDistrict.length);

        if(!!coiTeam){
            let t = _.filter(teams, team =>{
                return team.team == coiTeam.team;
            })[0];

            coiTeam.score = avgScore;
            t.score += avgScore;
        }
    });

    download(toCSV(teams),"slff_scores.csv","text/csv");

    // download(toCSV(window.slffPicks), "slff_picks", "text/csv");
    
}

var scoreYear = function scoreYear(year){
    let elosForYear = _.map(_.filter(window.teamStrength, function(t){
        return t.year == year;
    }),function(t){
        return t.elo;
    });

    let MAX_ELO = _.max(elosForYear);
    let MIN_ELO = _.min(elosForYear);
    getEventsForYear(year).then(events =>{
        let blahs = [];
        events.forEach(e =>{
            if(!window.ffaiEvents.includes(e.key)){
                return;
            }
            pollDataForEvent(e.key);
            actualTeams = _.map(remainingTeams, function(t){
                retVal = getRealTeam(t,year);
                return retVal;
            });
        
            actualTeams = _.reverse(_.sortBy(actualTeams,[function(t){
                return t.predicted;
            }]));

            let blah = {
                eventCode : e.key,
                teams : _.map(actualTeams, at =>{
                    return at.team;
                })
            }

            blahs.push(blah);
        });
        $.ajax({
            url : 'https://www.thebluealliance.com/api/v3/districts/' + year,
            async : false
        }).done(districts =>{
            districts.forEach(d =>{
                if(!window.ffaiEvents.includes(d.key)){
                    return;
                }
                pollDataForDistrict(d.key);
                actualTeams = _.map(remainingTeams, function(t){
                    retVal = getRealTeam(t,year);
                    return retVal;
                });
            
                actualTeams = _.reverse(_.sortBy(actualTeams,[function(t){
                    return t.predicted;
                }]));
    
                let blah = {
                    eventCode : d.key,
                    teams : _.map(actualTeams, at =>{
                        return at.team;
                    })
                }
                blahs.push(blah);    
            })
        });

        download(toCSV(blahs), "bni_ffai_entry.csv", "text/csv");
    });
}

var download = function download(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

var toCSV = function toCSV(dataToTransform){
    console.log(dataToTransform);
    const header = Object.keys(dataToTransform[0]);
    const replacer = (key, value) => value === null ? '' : value
    let csv = dataToTransform.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
    csv.unshift(header.join(','));
    csv = csv.join('\r\n');
    return csv;
}


var pollDataForDistrict = function pollDataForDistrict(districtCode){
    url = "https://www.thebluealliance.com/api/v3/district/" + districtCode + "/teams/keys";

    year = Number(districtCode.substring(0,4));

    $.ajax({ 'url' : url, async: false }).done(function(data){
        allTeams = data;
        allTeams = _.map(allTeams, function(t){
            return Number(_.replace(t,'frc',''));
        });
        allTeams.sort((a, b) => a - b);
        
        teamElos = [];

        allTeams.forEach(function(t){
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
    
        remainingTeams = allTeams.slice();
    });
}



var pollDataForEvent = function pollDataForEvent(eventCode){
    url = "https://www.thebluealliance.com/api/v3/event/" + eventCode + "/teams/keys";

    year = Number(eventCode.substring(0,4));

    $.ajax({ 'url' : url, async: false }).done(function(data){
        allTeams = data;
        allTeams = _.map(allTeams, function(t){
            return Number(_.replace(t,'frc',''));
        });
        allTeams.sort((a, b) => a - b);
        
        teamElos = [];

        allTeams.forEach(function(t){
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
    
        remainingTeams = allTeams.slice();
    });
}

var updateRemainingTeams = function updateRemainingTeams(){
    var template = $('#remaining_teams_template').text();

    compiled = _.template(template);

    actualTeams = _.map(remainingTeams, function(t){
        retVal = getRealTeam(t,year);
        return retVal;
    });

    actualTeams = _.reverse(_.sortBy(actualTeams,[function(t){
        return t.predicted;
    }]));

    $('.remaining_teams_list').html(compiled({teams : actualTeams}));
}

var updatePicks = function updatePicks(){
    var template = $('#picks_template').text();
    compiled = _.template(template);

    window.entrants = _.sortBy(window.entrants,[function(e){
        return e.score;
    },function(e){
        return e.position;
    }]);

    $('.picks_table tbody').html(compiled({'entrants' : window.entrants}));
}

var updateBalloon = function(e){
    var template = $('#balloon_template').text();
    compiled = _.template(template);
    $('.message_balloon').html(compiled({entrant : window.entrants[OTC]}));
}

var getRealTeam = function(team, year){
    ret = _.find(window.teamStrength, function(t){ 
        return (t.team == team) && (t.year == year)
    });
    if(!ret){
        ret = { 'team' : team, elo : 1450 }
    }
    
    if(!!allTeams && teamElos.length == allTeams.length && !!window.nn.sizes){
        teamElo = _.find(teamElos, function(t){
            return t.team == team;
        });

        elosForYear = _.map(_.filter(window.teamStrength, function(t){
            return t.year == year;
        }),function(t){
            return t.elo;
        });

        MAX_ELO = _.max(elosForYear);
        MIN_ELO = _.min(elosForYear);

        var input = { 
            eloR : 0, 
            elo : 0//, 
            //awardPoints : 0 
        };

        input.eloR = Math.max(((MAX_ELO_RANK + 1) - teamElo.eloRank) / MAX_ELO_RANK,0);
        input.elo = (teamElo.elo - MIN_ELO) / (MAX_ELO - MIN_ELO);

        var awardPoints = 0;

        let foo = realData.input["frc" + team];
        if(!foo){
            foo = [input.elo,0,0,0];
        }
        let awardsInput = { 
            elo : ((foo[0] - -2.43433633)/7.611593469), 
            culture : ((foo[1] - -0.581497665)/7.85479998), 
            robot : ((foo[2] - -0.379056123)/9.487511238), 
            misc : ((foo[3] - -0.457193077)/8.882426167) 
        };
        awardPoints =  Math.round(nn2.run(awardsInput).ap*85);


        competitionPoints = Math.round(window.nn.run(input).dp*154) + 4;

        ret.predicted = competitionPoints + awardPoints;
    }
    

    return ret;
}

var startDraft = function startDraft(){
    ordering = [];
    for(i = 1; i <= window.entrants.length; i++){
        ordering.push(i);
    }
    ordering = shuffle(ordering);
    for(i = 0; i < window.entrants.length; i++){
        window.entrants[i].position = ordering[i];
    }
    updatePicks();
    OTC = 0;
    updateBalloon();
}

function shuffle(o) {
    for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

var OTC = 0;
var round = 1;

var runDraft = function runDraft(t){
    if(round == 4){
        alert("draft complete!");
        computeScores();
        return;
    }

    if(!_.includes(remainingTeams, Number(t))){
        alert("team not available!");
        return;
    }
    teamPicked = getRealTeam(t,year);
    window.entrants[OTC].picks.push(teamPicked);
    if(!!teamPicked.predicted){
        window.entrants[OTC].predicted += teamPicked.predicted;
    }

    _.pull(remainingTeams, Number(t));
    if((OTC == window.entrants.length - 1 && round != 2) || (OTC == 0 && round == 2)){
        round++;
    } else if(round == 2){
        OTC--;
    } else {
        OTC++;
    }
    updateRemainingTeams();
    updatePicks();
    updateBalloon();
}

var computeScores = function computeScores(){
    url = "https://www.thebluealliance.com/api/v3/event/" + eventCode + "/district_points";
    var robotPointsMap;
    $.ajax({ 'url' : url, async: false }).done(function(data){
        robotPointsMap = data.points;
    });

    url = "https://www.thebluealliance.com/api/v3/event/" + eventCode + "/awards";
    var awards;
    $.ajax({ 'url' : url, async: false }).done(function(data){
        awards = data;
    });

    window.entrants.forEach(function(entrant){
        var score = 0;

        entrant.picks.forEach(function(team){
            //// just use TBA points dawg
            // var innerTerm = ((numberOfTeams - (2 * rank.rank) + 2) / (alpha * numberOfTeams));
            // console.log(innerTerm);
            // var firstTerm = erfinv(innerTerm);
            // console.log(firstTerm);
            // var secondTerm = (10/erfinv(1/alpha));
            // console.log(secondTerm);
            // var result = (firstTerm * secondTerm) + 12;
            // console.log(result);

            tbaData = robotPointsMap["frc" + team.team];

            robotPoints = tbaData.alliance_points;
            robotPoints += tbaData.elim_points;
            robotPoints += tbaData.qual_points;

            score += robotPoints;

            awardsForTeam = _.filter(awards,function(a){
                return !!_.find(a.recipient_list,function(t){
                    return Number(_.replace(t.team_key,'frc','')) == team.team;
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

        });
        entrant.score = score;
    });
    updatePicks();
}



//https://stackoverflow.com/a/12556710
function erfinv(x){
    var z;
    var a  = 0.147;                                                   
    var the_sign_of_x;
    if(0==x) {
        the_sign_of_x = 0;
    } else if(x>0){
        the_sign_of_x = 1;
    } else {
        the_sign_of_x = -1;
    }

    if(0 != x) {
        var ln_1minus_x_sqrd = Math.log(1-x*x);
        var ln_1minusxx_by_a = ln_1minus_x_sqrd / a;
        var ln_1minusxx_by_2 = ln_1minus_x_sqrd / 2;
        var ln_etc_by2_plus2 = ln_1minusxx_by_2 + (2/(Math.PI * a));
        var first_sqrt = Math.sqrt((ln_etc_by2_plus2*ln_etc_by2_plus2)-ln_1minusxx_by_a);
        var second_sqrt = Math.sqrt(first_sqrt - ln_etc_by2_plus2);
        z = second_sqrt * the_sign_of_x;
    } else { // x is zero
        z = 0;
    }

    return z;
}