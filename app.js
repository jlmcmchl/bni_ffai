var allTeams = null;
var remainingTeams = null;
var teamElos = [];


var eventCode = null;
var year = null;

$(document).ready(function(){
    $.ajaxSetup({
        headers: { 'X-TBA-Auth-Key': window.TBA_KEY }
    });
    window.nn.fromJSON(JSON.parse('{"sizes":[3,3,1],"layers":[{"eloR":{},"elo":{},"awardPoints":{}},{"0":{"bias":11.41662311553955,"weights":{"eloR":-10.559003829956055,"elo":-2.512901782989502,"awardPoints":0.0805177316069603}},"1":{"bias":8.165984153747559,"weights":{"eloR":-8.727800369262695,"elo":-9.971680641174316,"awardPoints":0.06135927513241768}},"2":{"bias":-1.869127631187439,"weights":{"eloR":-3.4141685962677,"elo":-1.1734071969985962,"awardPoints":0.17906738817691803}}},{"dp":{"bias":0.2531827390193939,"weights":{"0":-1.7212153673171997,"1":-0.6378582715988159,"2":-3.7515320777893066}}}],"outputLookup":true,"inputLookup":true,"activation":"sigmoid","trainOpts":{"iterations":20000,"errorThresh":0.005,"log":true,"logPeriod":10,"learningRate":0.3,"momentum":0.1,"callbackPeriod":10,"beta1":0.9,"beta2":0.999,"epsilon":1e-8}}'));

    updatePicks();

    $('#pick_field').keypress(function(e) {
        if(e.which == 13) {
            if(eventCode != null){
                runDraft($('#pick_field').val());
            } else {
                eventCode = $('#pick_field').val();
                pollDataForEvent(eventCode);
                updateRemainingTeams();

                startDraft();
            }
            $('#pick_field').val(null);
        }
    });

    $('#train_btn').click(function(){
        window.train();
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
            elo : 0, 
            awardPoints : 0 
        };

        input.eloR = Math.max(((MAX_ELO_RANK + 1) - teamElo.eloRank) / MAX_ELO_RANK,0);
        input.elo = (teamElo.elo - MIN_ELO) / (MAX_ELO - MIN_ELO);

        console.log(teamElo);
        console.log(MIN_ELO + " - " + MAX_ELO);
        console.log(input);

        ret.predicted = Math.floor(window.nn.run(input).dp*154);
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
                points = _.find(window.awardPoints, function(ap){
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