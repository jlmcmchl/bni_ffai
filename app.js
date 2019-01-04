var allTeams = null;
var remainingTeams = null;
var teamElos = [];


var eventCode = null;
var year = null;
var numEntrants = null;

$(document).ready(function(){
    $.ajaxSetup({
        headers: { 'X-TBA-Auth-Key': window.TBA_KEY }
    });
    window.nn.fromJSON(JSON.parse("{\"sizes\":[3,3,1],\"layers\":[{\"eloR\":{},\"elo\":{},\"awardPoints\":{}},{\"0\":{\"bias\":8.584001541137695,\"weights\":{\"eloR\":-6.723426818847656,\"elo\":-2.9776036739349365,\"awardPoints\":0.0805177316069603}},\"1\":{\"bias\":9.532647132873535,\"weights\":{\"eloR\":-2.2686245441436768,\"elo\":-31.13099479675293,\"awardPoints\":0.06135927513241768}},\"2\":{\"bias\":0.7185449004173279,\"weights\":{\"eloR\":-3.760312080383301,\"elo\":1.5069828033447266,\"awardPoints\":0.17906738817691803}}},{\"dp\":{\"bias\":0.26333221793174744,\"weights\":{\"0\":-1.9049509763717651,\"1\":-0.22975324094295502,\"2\":-1.2220942974090576}}}],\"outputLookup\":true,\"inputLookup\":true,\"activation\":\"sigmoid\",\"trainOpts\":{\"iterations\":20000,\"errorThresh\":0.005,\"log\":true,\"logPeriod\":100,\"learningRate\":0.3,\"momentum\":0.1,\"callbackPeriod\":10,\"beta1\":0.9,\"beta2\":0.999,\"epsilon\":1e-8}}"));
    window.nn2.fromJSON(JSON.parse("{\"sizes\":[4,3,1],\"layers\":[{\"elo\":{},\"culture\":{},\"robot\":{},\"misc\":{}},{\"0\":{\"bias\":2.4048945903778076,\"weights\":{\"elo\":-9.246403694152832,\"culture\":2.2722883224487305,\"robot\":-4.908572196960449,\"misc\":0.35180971026420593}},\"1\":{\"bias\":16.054197311401367,\"weights\":{\"elo\":-5.12716007232666,\"culture\":-10.127013206481934,\"robot\":-12.306000709533691,\"misc\":-1.7555046081542969}},\"2\":{\"bias\":0.8384664058685303,\"weights\":{\"elo\":2.776984930038452,\"culture\":-7.914799213409424,\"robot\":-10.552964210510254,\"misc\":-6.463048934936523}}},{\"ap\":{\"bias\":2.836301565170288,\"weights\":{\"0\":-3.0123291015625,\"1\":-3.3640496730804443,\"2\":-2.146695137023926}}}],\"outputLookup\":true,\"inputLookup\":true,\"activation\":\"sigmoid\",\"trainOpts\":{\"iterations\":20000,\"errorThresh\":0.005,\"log\":true,\"logPeriod\":100,\"learningRate\":0.3,\"momentum\":0.1,\"callbackPeriod\":10,\"beta1\":0.9,\"beta2\":0.999,\"epsilon\":1e-8}}"));
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

});


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

        $.ajax({url : 'real_data.json', async : false}).done(function(data){
            let foo = data.input["frc" + team];
            if(!foo){
                console.log(team);
                console.log(input);
                foo = [input.elo,0,0,0];
            }
            let awardsInput = { 
                elo : ((foo[0] - -2.43433633)/7.611593469), 
                culture : ((foo[1] - -0.581497665)/7.85479998), 
                robot : ((foo[2] - -0.379056123)/9.487511238), 
                misc : ((foo[3] - -0.457193077)/8.882426167) 
            };
            awardPoints =  Math.round(nn2.run(awardsInput).ap*85);
        });

        competitionPoints = Math.round(window.nn.run(input).dp*154) + 4;

        console.log(awardPoints);
        console.log(competitionPoints);


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
    console.log(ordering);
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